import json
import base64
import io
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.utils.dataframe import dataframe_to_rows

# Style constants
HEADER_FILL = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
HEADER_FONT = Font(color='FFFFFF', bold=True)
DUPLICATE_FILL = PatternFill(start_color='FFEB9C', end_color='FFEB9C', fill_type='solid')


def detect_duplicates(df):
    """
    Detect duplicate charges: same patient + same CPT + same DOS.
    Returns a boolean Series indicating which rows are duplicates.
    """
    group_cols = ['PATIENTNAME', 'PROCEDURECODE', 'SERVICEDATE']

    # Check if required columns exist
    missing_cols = [col for col in group_cols if col not in df.columns]
    if missing_cols:
        # If columns missing, no duplicates can be detected
        return pd.Series([False] * len(df)), 0

    # Find rows where group size > 1 (duplicates)
    group_sizes = df.groupby(group_cols)[group_cols[0]].transform('size')
    duplicate_mask = group_sizes > 1

    duplicate_count = duplicate_mask.sum()

    return duplicate_mask, duplicate_count


def create_excel_with_duplicates(df, duplicate_mask, duplicate_count):
    """
    Create Excel workbook with duplicate highlighting and summary sheet.
    """
    wb = Workbook()

    # === Sheet 1: Billing Data ===
    ws_data = wb.active
    ws_data.title = "Billing Data"

    # Write data
    for r_idx, row in enumerate(dataframe_to_rows(df, index=False, header=True), 1):
        for c_idx, value in enumerate(row, 1):
            cell = ws_data.cell(row=r_idx, column=c_idx, value=value)

            # Header styling
            if r_idx == 1:
                cell.fill = HEADER_FILL
                cell.font = HEADER_FONT
            # Duplicate row highlighting (r_idx-2 because row 1 is header, pandas is 0-indexed)
            elif r_idx > 1 and duplicate_mask.iloc[r_idx - 2]:
                cell.fill = DUPLICATE_FILL

    # Autofit columns
    for col_idx, column in enumerate(df.columns, 1):
        max_length = len(str(column))
        for cell_value in df[column].astype(str):
            max_length = max(max_length, len(str(cell_value)))
        adjusted_width = min(max_length + 2, 50)
        ws_data.column_dimensions[get_column_letter(col_idx)].width = adjusted_width

    # Freeze header row
    ws_data.freeze_panes = 'A2'

    # === Sheet 2: Summary ===
    ws_summary = wb.create_sheet("Summary")
    create_summary_sheet(ws_summary, len(df), duplicate_count)

    return wb


def create_summary_sheet(ws, total_count, duplicate_count):
    """
    Create summary sheet with duplicate statistics.
    """
    ws.append(['DUPLICATE DETECTION SUMMARY'])
    ws['A1'].font = Font(bold=True, size=14)
    ws.append([])

    ws.append(['Metric', 'Count'])
    ws['A3'].font = Font(bold=True)
    ws['B3'].font = Font(bold=True)

    ws.append(['Total Records', total_count])
    ws.append(['Duplicate Records', duplicate_count])

    # Autofit columns
    ws.column_dimensions['A'].width = 20
    ws.column_dimensions['B'].width = 15


def lambda_handler(event, context):
    """
    AWS Lambda function to convert CSV/TXT files to Excel format.
    Expects a multipart/form-data POST request with a file.
    Returns the converted Excel file as base64-encoded binary.
    """
    try:
        # Parse the incoming request body
        content_type = event.get('headers', {}).get('content-type', '') or event.get('headers', {}).get('Content-Type', '')
        body = event.get('body', '')
        is_base64 = event.get('isBase64Encoded', False)

        # Decode base64 body if needed
        if is_base64:
            body = base64.b64decode(body)
        else:
            body = body.encode('utf-8') if isinstance(body, str) else body

        # Parse multipart form data
        file_content, filename = parse_multipart(body, content_type)

        if not file_content:
            return error_response(400, "No file provided")

        # Detect delimiter
        delimiter = detect_delimiter(file_content)

        # If delimiter is ^, remove trailing ^ from each line to prevent empty column
        if delimiter == '^':
            lines = file_content.split('\n')
            cleaned_lines = [line.rstrip('^') for line in lines]
            file_content = '\n'.join(cleaned_lines)

        # Read CSV into pandas DataFrame
        df = pd.read_csv(io.StringIO(file_content), delimiter=delimiter, dtype=str)

        if df.empty:
            return error_response(400, "File is empty")

        # Remove trailer rows (Epic exports often have a "T" row at the end with record count)
        # These rows have mostly empty values - filter out rows where first column is "T"
        if 'GUARANTORACCOUNT' in df.columns:
            df = df[df['GUARANTORACCOUNT'] != 'T']

        # Detect duplicates
        duplicate_mask, duplicate_count = detect_duplicates(df)

        # Create Excel with duplicate highlighting
        workbook = create_excel_with_duplicates(df, duplicate_mask, duplicate_count)

        # Save to buffer
        excel_buffer = io.BytesIO()
        workbook.save(excel_buffer)
        excel_buffer.seek(0)

        # Generate output filename
        output_filename = filename.rsplit('.', 1)[0] + '.xlsx' if '.' in filename else filename + '.xlsx'

        # Return the Excel file
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': f'attachment; filename="{output_filename}"',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Expose-Headers': 'Content-Disposition'
            },
            'body': base64.b64encode(excel_buffer.read()).decode('utf-8'),
            'isBase64Encoded': True
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return error_response(500, f"Conversion failed: {str(e)}")


def parse_multipart(body, content_type):
    """
    Parse multipart/form-data to extract file content and filename.
    """
    # Extract boundary from content-type
    boundary = None
    for part in content_type.split(';'):
        part = part.strip()
        if part.startswith('boundary='):
            boundary = part.split('=', 1)[1].strip('"')
            break

    if not boundary:
        # Try parsing as raw file content
        return body.decode('utf-8', errors='ignore'), 'file.csv'

    # Split body by boundary
    boundary_bytes = f'--{boundary}'.encode()
    parts = body.split(boundary_bytes)

    for part in parts:
        if b'filename=' in part:
            # Extract filename
            header_end = part.find(b'\r\n\r\n')
            if header_end == -1:
                continue

            headers = part[:header_end].decode('utf-8', errors='ignore')
            content = part[header_end + 4:]

            # Remove trailing boundary markers
            if content.endswith(b'--\r\n'):
                content = content[:-4]
            elif content.endswith(b'\r\n'):
                content = content[:-2]

            # Extract filename from headers
            filename = 'file.csv'
            for line in headers.split('\r\n'):
                if 'filename=' in line:
                    start = line.find('filename=') + 9
                    end = line.find('"', start + 1) if line[start] == '"' else line.find(';', start)
                    if end == -1:
                        end = len(line)
                    filename = line[start:end].strip('"')
                    break

            return content.decode('utf-8', errors='ignore'), filename

    return None, None


def detect_delimiter(content):
    """
    Detect the file delimiter: ^ (EPIC billing), tab, or comma.
    """
    first_line = content.split('\n')[0] if '\n' in content else content

    caret_count = first_line.count('^')
    comma_count = first_line.count(',')
    tab_count = first_line.count('\t')

    # Return the most common delimiter
    counts = {'^': caret_count, '\t': tab_count, ',': comma_count}
    return max(counts, key=counts.get)


def error_response(status_code, message):
    """
    Return a formatted error response.
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': json.dumps({'error': message})
    }

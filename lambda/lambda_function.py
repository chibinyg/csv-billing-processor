import json
import base64
import io
import pandas as pd

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

        # Read CSV into pandas DataFrame
        df = pd.read_csv(io.StringIO(file_content), delimiter=delimiter, dtype=str)

        if df.empty:
            return error_response(400, "File is empty")

        # Convert DataFrame to Excel
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False, sheet_name="Sheet1")
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

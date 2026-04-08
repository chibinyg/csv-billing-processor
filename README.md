# CSV Convert

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Python](https://img.shields.io/badge/Python-Lambda-3776AB?logo=python&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Lambda%20%7C%20API%20Gateway-FF9900?logo=amazonaws&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-OpenPyXL-150458?logo=pandas&logoColor=white)

**Medical billing validation tool for Metro Physicians LLC.** Transforms Epic billing CSV exports into color-coded Excel workbooks with intelligent charge scrubbing, duplicate detection, and lost days analysis — helping billing departments validate charges before submission.

---

## Features

- **📄 CSV → Excel Conversion** — Accepts `.csv` and `.txt` billing exports (supports `^`, comma, and tab delimiters); outputs formatted `.xlsx` workbooks
- **⚖️ Charge Scrubbing** — Applies 8 billing rules to classify each charge as `CHARGE`, `DENY`, or `REVIEW`
- **🔍 Duplicate Detection** — Flags charges sharing the same patient, CPT code, and date of service
- **📅 Lost Days Detection** — Identifies gaps in patient service dates within a hospitalization window
- **🎨 Color-Coded Output** — Visual highlights on key columns (green = CHARGE, red = DENY, yellow = REVIEW, orange = Lost Days)
- **📦 Batch Conversion** — Convert multiple files at once; downloads as a ZIP archive
- **🖱️ Drag-and-Drop Upload** — Intuitive file upload with duplicate file detection
- **📊 Summary Analytics Sheet** — Date range, total charges, unique patients, breakdown by provider and CPT code

---

## Billing Rules Reference

The charge scrubbing engine evaluates each patient's charges per date of service using the following rules:

| Rule | Condition | Action |
|------|-----------|--------|
| 0 | Same patient + CPT + DOS (duplicate) | DENY duplicate |
| 1 | Unlisted code (99499) | DENY |
| 2 | Initial + Subsequent (no Critical) | CHARGE Initial, DENY Subsequent |
| 3 | Initial + Discharge (no Critical) | CHARGE Initial, DENY Discharge |
| 4 | Discharge + Subsequent (no Initial/Critical) | CHARGE Discharge, DENY Subsequent |
| 5 | Critical + Subsequent (no Initial/Discharge) | REVIEW both — timeline dependent |
| 6 | Initial + Critical | REVIEW both — timeline dependent |
| 7 | Critical + Subsequent + Discharge (no Initial) | CHARGE Critical, DENY others |
| 8 | ACP (99497) billed by same provider as Initial | DENY ACP |

---

## Output Workbook

Each converted file produces an Excel workbook with three sheets:

| Sheet | Contents |
|-------|----------|
| **Charge Data** | All charges with color-coded Recommendation and Notes columns |
| **Summary** | Date range, charge counts, provider breakdown, CPT breakdown |
| **Lost Days** | Patients with service date gaps, missing dates, and day counts |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Material-UI (MUI) |
| Backend | AWS Lambda (Python), Pandas, OpenPyXL |
| API | AWS API Gateway |
| Packaging | JSZip (multi-file ZIP download) |

---

## Project Structure

```
csv-convert/
├── frontend/                  # React application
│   ├── src/
│   │   ├── App.jsx            # App layout wrapper
│   │   ├── components/
│   │   │   ├── CsvConverter.jsx   # Main upload & conversion UI
│   │   │   ├── Header.jsx         # AppBar with Metro Physicians branding
│   │   │   └── Footer.jsx         # Footer
│   │   └── assets/
│   │       └── metro-logo.jpg
│   ├── .env                   # VITE_API_URL environment variable
│   ├── vite.config.js
│   └── package.json
│
└── lambda/
    └── lambda_function.py     # Charge scrubbing, Excel generation
```

---

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build → dist/
```

### Environment

Create `frontend/.env`:

```
VITE_API_URL=https://<api-gateway-url>/prod
```

### Lambda Deployment

1. Package `lambda/lambda_function.py` with Python dependencies:
   ```bash
   pip install pandas openpyxl -t ./package
   cp lambda/lambda_function.py ./package/
   cd package && zip -r ../lambda.zip .
   ```
2. Deploy `lambda.zip` to AWS Lambda (Python 3.x runtime)
3. Connect an **API Gateway** POST endpoint and update `VITE_API_URL`

---

## How It Works

1. User uploads one or more CSV/TXT billing export files
2. Frontend detects duplicate filenames and prompts before adding to queue
3. Files are sent to the Lambda endpoint as multipart form-data
4. Lambda parses the file, strips Epic trailer rows, and applies charge scrubbing rules
5. Lost days analysis identifies gaps in each patient's service date timeline
6. An Excel workbook is generated and returned as base64-encoded binary
7. Single file → direct `.xlsx` download; multiple files → `.zip` archive

---

*Built for Metro Physicians LLC billing operations.*

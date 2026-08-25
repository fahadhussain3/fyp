import os
import re
import shutil
import subprocess
import json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

app = FastAPI(title="BISE Gazette Universal Parser & Search API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Supabase Configuration ---
SUPABASE_URL = "https://vijizoadoxsijlvfrxek.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpaml6b2Fkb3hzaWpsdmZyeGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjQ3MzgsImV4cCI6MjEwMzE0MDczOH0.zhakKWWEqiPACjtN02d4-Z8Ls1DhJF1pQIWQlxewvCk"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
TABLE_NAME = "student_results"

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -------------------------------------------------------------
# POPPLER BINARY PATH CONFIGURATION
# If Poppler is in your PATH, leave these as "pdfinfo" / "pdftotext".
# If not, set the exact path, e.g.: r"C:\poppler\Library\bin\pdfinfo.exe"
# -------------------------------------------------------------
POPPLER_BIN_DIR = r"C:\poppler\poppler-26.02.0\Library\bin"

PDFINFO_BIN = "pdfinfo" if shutil.which("pdfinfo") else (
    os.path.join(POPPLER_BIN_DIR, "pdfinfo.exe") if os.path.exists(POPPLER_BIN_DIR) else "pdfinfo"
)
PDFTOTEXT_BIN = "pdftotext" if shutil.which("pdftotext") else (
    os.path.join(POPPLER_BIN_DIR, "pdftotext.exe") if os.path.exists(POPPLER_BIN_DIR) else "pdftotext"
)

BOARD_PATTERNS = {
    "Lahore": {
        "pattern": r"(\d{6})\s+([A-Z][A-Z\.\s]*?)\s+\d{2}/\d{2}/\d{2}\s+PASS\s+(\d{3,4})\s+[A-E]\+?",
        "groups": ["roll_number", "name", "marks"]
    },
    "Faisalabad": {
        "pattern": r"(\d{5,7})\s+(?:PASS\s+)?(\d{3,4})",
        "groups": ["roll_number", "marks"]
    },
    "Generic": {
        "pattern": r"(\d{5,7})\s+PASS\s+(\d{3,4})",
        "groups": ["roll_number", "marks"]
    }
}


def get_page_count(pdf_path: str) -> int:
    try:
        result = subprocess.run([PDFINFO_BIN, pdf_path], capture_output=True, text=True, check=True)
        for line in result.stdout.splitlines():
            if line.startswith("Pages:"):
                return int(line.split(":")[1].strip())
        raise RuntimeError("Could not determine page count from PDF output.")
    except FileNotFoundError:
        raise RuntimeError(f"Poppler executable '{PDFINFO_BIN}' not found. Verify Poppler installation path.")


def get_page_text(pdf_path: str, page_num: int) -> str:
    try:
        result = subprocess.run(
            [PDFTOTEXT_BIN, "-f", str(page_num), "-l", str(page_num), "-layout", pdf_path, "-"],
            capture_output=True,
            text=True,
        )
        return result.stdout if result.returncode == 0 else ""
    except Exception:
        return ""


# -------------------------------------------------------------
# 1. PDF UPLOAD & PARSER ENDPOINT
# -------------------------------------------------------------
@app.post("/api/upload-and-parse")
async def upload_and_parse_gazette(
    file: UploadFile = File(...),
    board: str = Form(...),
    class_num: int = Form(...),
    year: int = Form(...),
    selected_fields: str = Form("[]")
):
    temp_file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        normalized_board = "Lahore" if "lahore" in board.lower() else ("Faisalabad" if "faisalabad" in board.lower() else "Generic")
        config = BOARD_PATTERNS.get(normalized_board, BOARD_PATTERNS["Generic"])
        compiled_re = re.compile(config["pattern"])

        total_pages = get_page_count(temp_file_path)
        print(f"[*] Total Pages to Process: {total_pages}")

        records = []
        current_time = datetime.now(timezone.utc).isoformat()

        for page_num in range(1, total_pages + 1):
            text = get_page_text(temp_file_path, page_num)
            if not text.strip():
                continue

            for match in compiled_re.findall(text):
                if normalized_board == "Lahore":
                    roll_no, name, marks = match
                    records.append({
                        "roll_number": int(roll_no),
                        "name": name.strip(),
                        "marks": int(marks),
                        "board": board.strip(),
                        "group": None,
                        "class": int(class_num),
                        "year": int(year),
                        "created_at": current_time,
                    })
                else:
                    roll_no, marks = match
                    records.append({
                        "roll_number": int(roll_no),
                        "name": None,
                        "marks": int(marks),
                        "board": board.strip(),
                        "group": None,
                        "class": int(class_num),
                        "year": int(year),
                        "created_at": current_time,
                    })

            if page_num % 200 == 0:
                print(f"Processed {page_num}/{total_pages} pages... ({len(records)} records extracted)")

        print(f"[*] Uploading {len(records)} records to Supabase...")

        batch_size = 500
        inserted_count = 0
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            supabase.table(TABLE_NAME).insert(batch).execute()
            inserted_count += len(batch)

        return {
            "status": "success",
            "total_pages": total_pages,
            "records_inserted": inserted_count
        }

    except Exception as e:
        print(f"[X] Processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


# -------------------------------------------------------------
# 2. SEARCH & PAGINATION ENDPOINT
# -------------------------------------------------------------
@app.get("/api/results")
async def get_results(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    roll_number: Optional[int] = None,
    name: Optional[str] = None,
    board: Optional[str] = None,
    class_num: Optional[int] = None,
    year: Optional[int] = None,
):
    try:
        from_idx = (page - 1) * page_size
        to_idx = from_idx + page_size - 1

        query = supabase.table(TABLE_NAME).select("*", count="exact").order("roll_number", desc=False)

        if roll_number is not None:
            query = query.eq("roll_number", roll_number)
        if name:
            query = query.ilike("name", f"%{name.strip()}%")
        if board:
            query = query.ilike("board", f"%{board.strip()}%")
        if class_num is not None:
            query = query.eq("class", class_num)
        if year is not None:
            query = query.eq("year", year)

        response = query.range(from_idx, to_idx).execute()

        return {
            "data": response.data,
            "total_count": response.count if response.count is not None else 0,
            "page": page,
            "page_size": page_size,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
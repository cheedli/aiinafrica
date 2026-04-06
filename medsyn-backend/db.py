import json
import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "medsyn.db")

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS investigations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    patient_summary TEXT,
    detected_language TEXT,
    top_diagnosis TEXT,
    top_confidence REAL,
    differentials TEXT,
    evidence TEXT,
    action_plan TEXT,
    who_context TEXT,
    full_report TEXT
);

CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    first_name TEXT,
    last_name TEXT,
    age INTEGER,
    sex TEXT,
    country TEXT,
    region TEXT,
    chief_complaint TEXT,
    history TEXT,
    medications TEXT,
    allergies TEXT,
    lab_results TEXT,
    notes TEXT,
    blood_type TEXT DEFAULT '',
    patient_id TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS patient_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    patient_id INTEGER,
    role TEXT,
    content TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS patient_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    patient_id INTEGER,
    filename TEXT,
    source_type TEXT,
    chunks INTEGER,
    preview TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS benchmark_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    case_id TEXT UNIQUE,
    patient_id INTEGER,
    verdict TEXT,
    score INTEGER,
    differentials TEXT,
    tools TEXT,
    full_report TEXT
);
"""

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        for stmt in CREATE_SQL.strip().split(';'):
            stmt = stmt.strip()
            if stmt:
                await db.execute(stmt)
        await db.commit()

# ── Investigations ────────────────────────────────────────────────────────────

async def save_investigation(report: dict):
    differentials = report.get("differentials", [])
    top = differentials[0] if differentials else {}
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO investigations
            (patient_summary, detected_language, top_diagnosis, top_confidence, differentials, evidence, action_plan, who_context, full_report)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            report.get("patient_summary", ""),
            report.get("detected_language", "English"),
            top.get("name", "Unknown"),
            top.get("confidence", 0.0),
            json.dumps(differentials),
            json.dumps(report.get("evidence", [])),
            json.dumps(report.get("action_plan", {})),
            report.get("who_context", ""),
            json.dumps(report),
        ))
        await db.commit()

async def get_all_investigations(limit: int = 50):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, created_at, patient_summary, detected_language, top_diagnosis, top_confidence, differentials FROM investigations ORDER BY created_at DESC LIMIT ?",
            (limit,)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

async def get_investigation(id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM investigations WHERE id = ?", (id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                d = dict(row)
                d["full_report"] = json.loads(d["full_report"])
                return d
            return None

async def get_stats():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("SELECT COUNT(*) as total FROM investigations") as c:
            total = (await c.fetchone())["total"]

        async with db.execute("SELECT AVG(top_confidence) as avg_conf FROM investigations") as c:
            row = await c.fetchone()
            avg_conf = round((row["avg_conf"] or 0) * 100, 1)

        async with db.execute("""
            SELECT detected_language, COUNT(*) as cnt
            FROM investigations GROUP BY detected_language ORDER BY cnt DESC
        """) as c:
            languages = [dict(r) for r in await c.fetchall()]

        async with db.execute("""
            SELECT top_diagnosis, COUNT(*) as cnt
            FROM investigations GROUP BY top_diagnosis ORDER BY cnt DESC LIMIT 5
        """) as c:
            top_diagnoses = [dict(r) for r in await c.fetchall()]

        async with db.execute("""
            SELECT DATE(created_at) as date, COUNT(*) as cnt
            FROM investigations GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 14
        """) as c:
            daily = [dict(r) for r in await c.fetchall()]

        async with db.execute("SELECT COUNT(*) as total FROM patients") as c:
            total_patients = (await c.fetchone())["total"]

        return {
            "total_investigations": total,
            "total_patients": total_patients,
            "avg_confidence_pct": avg_conf,
            "languages": languages,
            "top_diagnoses": top_diagnoses,
            "daily_activity": daily,
        }

# ── Patients ──────────────────────────────────────────────────────────────────

async def create_patient(data: dict) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("""
            INSERT INTO patients (first_name, last_name, age, sex, country, region, chief_complaint, history, medications, allergies, lab_results, notes, blood_type, patient_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("first_name", ""),
            data.get("last_name", ""),
            data.get("age"),
            data.get("sex", ""),
            data.get("country", ""),
            data.get("region", ""),
            data.get("chief_complaint", ""),
            data.get("history", ""),
            data.get("medications", ""),
            data.get("allergies", ""),
            data.get("lab_results", ""),
            data.get("notes", ""),
            data.get("blood_type", ""),
            data.get("patient_id", ""),
        ))
        await db.commit()
        return cursor.lastrowid

async def update_patient(id: int, data: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE patients SET
                first_name=?, last_name=?, age=?, sex=?, country=?, region=?,
                chief_complaint=?, history=?, medications=?, allergies=?, lab_results=?, notes=?,
                blood_type=?, patient_id=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        """, (
            data.get("first_name", ""),
            data.get("last_name", ""),
            data.get("age"),
            data.get("sex", ""),
            data.get("country", ""),
            data.get("region", ""),
            data.get("chief_complaint", ""),
            data.get("history", ""),
            data.get("medications", ""),
            data.get("allergies", ""),
            data.get("lab_results", ""),
            data.get("notes", ""),
            data.get("blood_type", ""),
            data.get("patient_id", ""),
            id,
        ))
        await db.commit()

async def get_all_patients():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM patients ORDER BY created_at DESC") as cursor:
            return [dict(r) for r in await cursor.fetchall()]

async def get_patient(id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM patients WHERE id=?", (id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def delete_patient(id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM patients WHERE id=?", (id,))
        await db.execute("DELETE FROM patient_messages WHERE patient_id=?", (id,))
        await db.execute("DELETE FROM patient_documents WHERE patient_id=?", (id,))
        await db.commit()

# ── Patient documents ─────────────────────────────────────────────────────────

async def save_document(patient_id: int, filename: str, source_type: str, chunks: int, preview: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO patient_documents (patient_id, filename, source_type, chunks, preview) VALUES (?, ?, ?, ?, ?)",
            (patient_id, filename, source_type, chunks, preview)
        )
        await db.commit()

async def get_documents(patient_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM patient_documents WHERE patient_id=? ORDER BY created_at DESC",
            (patient_id,)
        ) as cursor:
            return [dict(r) for r in await cursor.fetchall()]

# ── Patient chat history ──────────────────────────────────────────────────────

async def save_message(patient_id: int, role: str, content: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO patient_messages (patient_id, role, content) VALUES (?, ?, ?)",
            (patient_id, role, content)
        )
        await db.commit()

async def get_messages(patient_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT role, content, created_at FROM patient_messages WHERE patient_id=? ORDER BY created_at ASC",
            (patient_id,)
        ) as cursor:
            return [dict(r) for r in await cursor.fetchall()]

# ── Benchmark results ─────────────────────────────────────────────────────────

async def save_benchmark_result(case_id: str, patient_id: int, verdict: str, score: int, differentials: list, tools: list, full_report: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO benchmark_results (case_id, patient_id, verdict, score, differentials, tools, full_report, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(case_id) DO UPDATE SET
                verdict=excluded.verdict,
                score=excluded.score,
                differentials=excluded.differentials,
                tools=excluded.tools,
                full_report=excluded.full_report,
                updated_at=CURRENT_TIMESTAMP
        """, (
            case_id,
            patient_id,
            verdict,
            score,
            json.dumps(differentials),
            json.dumps(tools),
            json.dumps(full_report),
        ))
        await db.commit()

async def get_benchmark_results():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM benchmark_results ORDER BY case_id ASC") as cursor:
            rows = await cursor.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["differentials"] = json.loads(d["differentials"] or "[]")
                d["tools"] = json.loads(d["tools"] or "[]")
                d["full_report"] = json.loads(d["full_report"] or "{}")
                results.append(d)
            return results

async def delete_benchmark_result(case_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM benchmark_results WHERE case_id=?", (case_id,))
        await db.commit()

async def clear_benchmark_results():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM benchmark_results")
        await db.commit()

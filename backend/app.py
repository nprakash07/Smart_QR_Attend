"""
app.py — local development entry point.
For Vercel deployment, api/index.py imports this file.
"""
import mysql.connector
from flask import Flask, redirect, url_for, request
from config import SECRET_KEY, DB_CONFIG, FRONTEND_URL
from routes.teacher import teacher_bp
from routes.student  import student_bp


def ensure_database():
    """Create database, tables, fix unique key, and seed demo data."""
    # Create DB if not exists
    cfg = {k: v for k, v in DB_CONFIG.items() if k != "database"}
    try:
        con = mysql.connector.connect(**cfg)
        cur = con.cursor()
        cur.execute(
            f"CREATE DATABASE IF NOT EXISTS `{DB_CONFIG['database']}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        con.commit(); cur.close(); con.close()
    except Exception as e:
        print(f"⚠  Could not create DB: {e}")

    con = mysql.connector.connect(**DB_CONFIG)
    cur = con.cursor()

    # teachers
    cur.execute("""
        CREATE TABLE IF NOT EXISTS teachers (
            id       INT AUTO_INCREMENT PRIMARY KEY,
            email    VARCHAR(120) UNIQUE NOT NULL,
            password VARCHAR(120)        NOT NULL
        ) ENGINE=InnoDB
    """)

    # students
    cur.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id       INT AUTO_INCREMENT PRIMARY KEY,
            name     VARCHAR(100)        NOT NULL,
            email    VARCHAR(120) UNIQUE NOT NULL,
            reg_no   VARCHAR(20)  UNIQUE NOT NULL,
            password VARCHAR(120)        NOT NULL
        ) ENGINE=InnoDB
    """)

    # attendance — correct unique key from the start
    cur.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            student_id     INT          NOT NULL,
            date           DATE         NOT NULL,
            session_number TINYINT      NOT NULL DEFAULT 1,
            subject        VARCHAR(120) NOT NULL DEFAULT 'General',
            semester       VARCHAR(60)  NOT NULL DEFAULT 'Semester 1',
            status         CHAR(1)      NOT NULL DEFAULT 'A',
            UNIQUE KEY uniq_att_full
              (student_id, date, session_number, subject(100), semester(60)),
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    """)

    # Add subject/semester columns to existing table if missing
    for col, defn in [
        ("subject",  "VARCHAR(120) NOT NULL DEFAULT 'General'    AFTER session_number"),
        ("semester", "VARCHAR(60)  NOT NULL DEFAULT 'Semester 1' AFTER subject"),
    ]:
        try:
            cur.execute(f"ALTER TABLE attendance ADD COLUMN {col} {defn}")
            con.commit()
        except Exception:
            pass  # already exists

    # Fix unique key: drop old key that lacks subject/semester, add new one
    cur.execute(
        "SHOW INDEX FROM attendance WHERE Non_unique=0 AND Key_name != 'PRIMARY'"
    )
    for row in cur.fetchall():
        key_name = row[2]
        cur2 = con.cursor()
        cur2.execute(
            "SELECT COUNT(*) FROM information_schema.statistics "
            "WHERE table_schema=%s AND table_name='attendance' "
            "AND index_name=%s AND column_name='subject'",
            (DB_CONFIG["database"], key_name)
        )
        has_subj = cur2.fetchone()[0] > 0
        cur2.close()
        if not has_subj:
            try:
                con.cursor().execute(f"ALTER TABLE attendance DROP INDEX `{key_name}`")
                con.commit()
            except Exception:
                pass
    try:
        cur.execute("""
            ALTER TABLE attendance
            ADD UNIQUE KEY uniq_att_full
            (student_id, date, session_number, subject(100), semester(60))
        """)
        con.commit()
    except Exception:
        pass

    # live_sessions table — replaces in-memory session_state.py
    cur.execute("""
        CREATE TABLE IF NOT EXISTS live_sessions (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            session_uuid      VARCHAR(36) UNIQUE NOT NULL,
            current_token     VARCHAR(36) NOT NULL,
            previous_token    VARCHAR(36),
            token_expiry      BIGINT      NOT NULL DEFAULT 0,
            prev_token_expiry BIGINT      NOT NULL DEFAULT 0,
            session_date      DATE        NOT NULL,
            session_number    TINYINT     NOT NULL DEFAULT 1,
            subject           VARCHAR(120) NOT NULL DEFAULT 'General',
            semester          VARCHAR(60)  NOT NULL DEFAULT 'Semester 1',
            is_active         TINYINT     NOT NULL DEFAULT 1,
            created_at        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
    """)

    # Seed demo data
    cur.execute("INSERT IGNORE INTO teachers (email,password) VALUES (%s,%s)",
                ("teacher@college.com", "1234"))
    for i in range(1, 11):
        reg = f"2301109{i:03d}"
        cur.execute(
            "INSERT IGNORE INTO students (name,email,reg_no,password) VALUES(%s,%s,%s,%s)",
            (f"Student {i:02d}", f"{reg}@college.com", reg, "1234")
        )

    con.commit(); cur.close(); con.close()
    print(f"✅  Database ready")


# Run setup on import (safe — uses INSERT IGNORE and IF NOT EXISTS)
try:
    ensure_database()
except Exception as e:
    print(f"⚠  DB setup warning: {e}")


# ── Flask app ─────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = SECRET_KEY

# Required for cross-origin cookies (frontend on Vercel, backend on Vercel)
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"]   = True
app.config["SESSION_COOKIE_HTTPONLY"] = True

# Register blueprints
app.register_blueprint(teacher_bp)
app.register_blueprint(student_bp)


# ── CORS ──────────────────────────────────────────────────────
ALLOWED = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    FRONTEND_URL,          # set as env var in Vercel dashboard
]

@app.after_request
def add_cors(response):
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED:
        response.headers["Access-Control-Allow-Origin"]      = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"]     = "GET,POST,DELETE,OPTIONS"
        response.headers["Access-Control-Allow-Headers"]     = "Content-Type"
    return response


@app.route("/")
def home():
    return redirect(url_for("teacher.teacher_login"))


if __name__ == "__main__":
    # Local development only
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"]   = False
    app.run(host="0.0.0.0", port=8000, debug=True, use_reloader=False)
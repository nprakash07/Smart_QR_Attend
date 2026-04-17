"""
All database queries.
Session state is stored in MySQL (not in-memory) so Vercel serverless works correctly.
"""
import time
import uuid as _uuid
from db import get_connection


# ── Auth ──────────────────────────────────────────────────────
def get_teacher_by_email(email):
    c = get_connection(); r = c.cursor(dictionary=True)
    r.execute("SELECT * FROM teachers WHERE email=%s", (email,))
    row = r.fetchone(); r.close(); c.close(); return row

def get_student_by_email(email):
    c = get_connection(); r = c.cursor(dictionary=True)
    r.execute("SELECT * FROM students WHERE email=%s", (email,))
    row = r.fetchone(); r.close(); c.close(); return row

def get_student_by_id(student_id):
    c = get_connection(); r = c.cursor(dictionary=True)
    r.execute("SELECT * FROM students WHERE id=%s", (student_id,))
    row = r.fetchone(); r.close(); c.close(); return row


# ── Attendance: write ─────────────────────────────────────────
def init_attendance_for_session(date_str, sess_num, subject, semester):
    c = get_connection(); r = c.cursor()
    r.execute("SELECT id FROM students")
    for (sid,) in r.fetchall():
        r.execute(
            "INSERT IGNORE INTO attendance "
            "(student_id,date,session_number,subject,semester,status) "
            "VALUES(%s,%s,%s,%s,%s,'A')",
            (sid, date_str, sess_num, subject, semester)
        )
    c.commit(); r.close(); c.close()

def mark_student_present(student_id, date_str, sess_num, subject, semester):
    c = get_connection(); r = c.cursor()
    r.execute(
        "INSERT INTO attendance "
        "(student_id,date,session_number,subject,semester,status) "
        "VALUES(%s,%s,%s,%s,%s,'P') "
        "ON DUPLICATE KEY UPDATE status='P'",
        (student_id, date_str, sess_num, subject, semester)
    )
    c.commit(); r.close(); c.close()

def student_already_marked(student_id, date_str, sess_num, subject, semester):
    """Check DB instead of in-memory set — works across serverless invocations."""
    c = get_connection(); r = c.cursor()
    r.execute(
        "SELECT COUNT(*) FROM attendance "
        "WHERE student_id=%s AND date=%s AND session_number=%s "
        "AND subject=%s AND semester=%s AND status='P'",
        (student_id, date_str, sess_num, subject, semester)
    )
    count = r.fetchone()[0]; r.close(); c.close()
    return count > 0


# ── Attendance: read ──────────────────────────────────────────
def get_attendance_table(subject=None, semester=None):
    c = get_connection(); r = c.cursor(dictionary=True)
    if subject and semester:
        r.execute(
            "SELECT DISTINCT date,session_number FROM attendance "
            "WHERE subject=%s AND semester=%s ORDER BY date,session_number",
            (subject, semester)
        )
    else:
        r.execute("SELECT DISTINCT date,session_number FROM attendance ORDER BY date,session_number")
    combos = r.fetchall()

    r.execute("SELECT id,reg_no,name FROM students ORDER BY reg_no")
    students = r.fetchall()

    if subject and semester:
        r.execute(
            "SELECT student_id,CAST(date AS CHAR) AS date,session_number,status "
            "FROM attendance WHERE subject=%s AND semester=%s",
            (subject, semester)
        )
    else:
        r.execute("SELECT student_id,CAST(date AS CHAR) AS date,session_number,status FROM attendance")
    raw = r.fetchall()
    r.close(); c.close()

    att_map  = {(x["student_id"],x["date"],x["session_number"]):x["status"] for x in raw}
    col_keys = [f"{str(cb['date'])}_S{cb['session_number']}" for cb in combos]
    rows = []
    for i, s in enumerate(students, 1):
        row = {"sl":i,"id":s["id"],"reg_no":s["reg_no"],"name":s["name"]}
        for cb in combos:
            row[f"{str(cb['date'])}_S{cb['session_number']}"] = att_map.get(
                (s["id"], str(cb["date"]), cb["session_number"]), "–")
        rows.append(row)
    return {"columns": col_keys, "rows": rows}

def count_marked(date_str, sess_num, subject, semester):
    c = get_connection(); r = c.cursor()
    r.execute(
        "SELECT COUNT(*) FROM attendance "
        "WHERE date=%s AND session_number=%s AND subject=%s AND semester=%s AND status='P'",
        (date_str, sess_num, subject, semester)
    )
    marked = r.fetchone()[0]
    r.execute("SELECT COUNT(*) FROM students")
    total  = r.fetchone()[0]
    r.close(); c.close()
    return marked, total


# ── Attendance: delete ────────────────────────────────────────
def delete_all_attendance_for_student(student_id):
    c = get_connection(); r = c.cursor()
    r.execute("DELETE FROM attendance WHERE student_id=%s", (student_id,))
    c.commit(); r.close(); c.close()

def delete_specific_attendance(student_id, date_str, sess_num):
    c = get_connection(); r = c.cursor()
    r.execute("DELETE FROM attendance WHERE student_id=%s AND date=%s AND session_number=%s",
              (student_id, date_str, sess_num))
    c.commit(); r.close(); c.close()

def delete_entire_date_session(date_str, sess_num):
    c = get_connection(); r = c.cursor()
    r.execute("DELETE FROM attendance WHERE date=%s AND session_number=%s", (date_str, sess_num))
    c.commit(); r.close(); c.close()


# ── Session state (stored in MySQL — works on Vercel serverless) ──
def create_db_session(session_uuid, token, date_str, sess_num, subject, semester):
    """Deactivate any old session and create a new one."""
    c = get_connection(); r = c.cursor()
    r.execute("UPDATE live_sessions SET is_active=0 WHERE is_active=1")
    expiry = int(time.time()) + 15
    r.execute("""
        INSERT INTO live_sessions
          (session_uuid, current_token, previous_token,
           token_expiry, prev_token_expiry,
           session_date, session_number, subject, semester, is_active)
        VALUES (%s,%s,NULL,%s,0,%s,%s,%s,%s,1)
        ON DUPLICATE KEY UPDATE
          current_token=%s, previous_token=NULL,
          token_expiry=%s, prev_token_expiry=0,
          session_date=%s, session_number=%s,
          subject=%s, semester=%s, is_active=1
    """, (session_uuid, token, expiry, date_str, sess_num, subject, semester,
          token, expiry, date_str, sess_num, subject, semester))
    c.commit(); r.close(); c.close()

def get_active_db_session():
    """Get the currently active session row."""
    c = get_connection(); r = c.cursor(dictionary=True)
    r.execute(
        "SELECT * FROM live_sessions WHERE is_active=1 ORDER BY created_at DESC LIMIT 1"
    )
    row = r.fetchone(); r.close(); c.close()
    if row:
        # Convert date to string if needed
        if hasattr(row.get('session_date'), 'isoformat'):
            row['session_date'] = row['session_date'].isoformat()
    return row

def rotate_token_if_needed(session_uuid):
    """
    Lazy token rotation — called on every /current-token request.
    Replaces the background thread that can't run on Vercel serverless.
    """
    c = get_connection(); r = c.cursor(dictionary=True)
    r.execute("SELECT * FROM live_sessions WHERE session_uuid=%s AND is_active=1", (session_uuid,))
    sess = r.fetchone()
    if not sess:
        r.close(); c.close(); return None

    # Convert date if needed
    if hasattr(sess.get('session_date'), 'isoformat'):
        sess['session_date'] = sess['session_date'].isoformat()

    now = int(time.time())
    if now > int(sess['token_expiry']):
        new_token   = str(_uuid.uuid4())
        prev_expiry = now + 4   # 4-second grace window
        new_expiry  = now + 15
        r2 = c.cursor()
        r2.execute("""
            UPDATE live_sessions SET
              previous_token=%s, prev_token_expiry=%s,
              current_token=%s,  token_expiry=%s
            WHERE session_uuid=%s
        """, (sess['current_token'], prev_expiry, new_token, new_expiry, session_uuid))
        c.commit(); r2.close()
        sess['previous_token']    = sess['current_token']
        sess['prev_token_expiry'] = prev_expiry
        sess['current_token']     = new_token
        sess['token_expiry']      = new_expiry

    r.close(); c.close()
    return sess

def stop_db_session():
    c = get_connection(); r = c.cursor()
    r.execute("UPDATE live_sessions SET is_active=0 WHERE is_active=1")
    c.commit(); r.close(); c.close()
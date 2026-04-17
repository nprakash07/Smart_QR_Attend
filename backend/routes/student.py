import time
from flask import (Blueprint, jsonify, redirect, render_template,
                   request, session, url_for)
import db.queries as q
from auth import make_student_token, get_student_id

student_bp = Blueprint("student", __name__)


# ── HTML login ────────────────────────────────────────────────
@student_bp.route("/student-login", methods=["GET", "POST"])
def student_login():
    if request.method == "POST":
        s = q.get_student_by_email(request.form.get("email", ""))
        if s and s["password"] == request.form.get("password", ""):
            session["student"]    = s["email"]
            session["student_id"] = s["id"]
            session["reg_no"]     = s["reg_no"]
            return redirect(url_for("student.student_dashboard"))
        return render_template("student_login.html", error="Invalid Credentials")
    return render_template("student_login.html")


# ── JSON login for React ──────────────────────────────────────
@student_bp.route("/student-login-json", methods=["POST", "OPTIONS"])
def student_login_json():
    if request.method == "OPTIONS": return "", 204
    data = request.json or {}
    s    = q.get_student_by_email(data.get("email", ""))
    if s and s["password"] == data.get("password", ""):
        session["student"]    = s["email"]
        session["student_id"] = s["id"]
        session["reg_no"]     = s["reg_no"]
        return jsonify({
            "user" : {"id": s["id"], "name": s["name"], "email": s["email"],
                      "role": "student", "reg_no": s["reg_no"]},
            "token": make_student_token(s["id"])   # HMAC token — works cross-domain
        })
    return jsonify({"error": "Invalid credentials"}), 401


@student_bp.route("/student-dashboard")
def student_dashboard():
    if "student" not in session: return redirect(url_for("student.student_login"))
    return render_template("student_dashboard.html")


# ── Mark attendance ───────────────────────────────────────────
@student_bp.route("/mark-attendance", methods=["POST", "OPTIONS"])
def mark_attendance():
    if request.method == "OPTIONS": return "", 204

    sid = get_student_id()   # token-based — no cookies needed
    if not sid: return jsonify({"error": "Not logged in"}), 401

    data = request.json or {}

    # Get active session from DB (no in-memory state needed)
    active = q.get_active_db_session()
    if not active:
        return jsonify({"error": "No active attendance session"}), 400
    if data.get("session_id") != active["session_uuid"]:
        return jsonify({"error": "Invalid session"}), 400

    # Validate token (with grace window for mid-rotation scans)
    token = data.get("token")
    now   = int(time.time())
    prev  = active.get("previous_token")
    valid = (
        (token == active["current_token"] and now <= int(active["token_expiry"])) or
        (prev and token == prev and now <= int(active["prev_token_expiry"]))
    )
    if not valid:
        return jsonify({"error": "QR expired — scan the new code"}), 400

    date_str = str(active["session_date"])
    sess_num = active["session_number"]
    subject  = active["subject"]
    semester = active["semester"]

    # Duplicate check via DB (works across serverless invocations)
    if q.student_already_marked(sid, date_str, sess_num, subject, semester):
        return jsonify({"error": "Already marked for this session"}), 400

    q.mark_student_present(sid, date_str, sess_num, subject, semester)
    # Get reg_no for display
    student = q.get_student_by_id(sid)
    reg = student["reg_no"] if student else str(sid)
    return jsonify({"message": f"✅ Attendance marked! ({reg})"})


# ── Student's own attendance ──────────────────────────────────
@student_bp.route("/my-attendance")
def my_attendance():
    sid = get_student_id()
    if not sid: return jsonify({"error": "Unauthorized"}), 401
    return jsonify(q.get_attendance_table())


@student_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("student.student_login"))
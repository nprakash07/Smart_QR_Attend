"""
routes/admin.py — Admin-only endpoints.
Admin credentials are set via ADMIN_EMAIL / ADMIN_PASSWORD env vars (or defaults).
"""
from flask import Blueprint, jsonify, request
import db.queries as q
from config import ADMIN_EMAIL, ADMIN_PASSWORD
from auth import make_teacher_token   # reuse HMAC; role='admin' produces unique token

import hmac
import hashlib
from config import SECRET_KEY


def make_admin_token() -> str:
    key = SECRET_KEY.encode()
    msg = b"admin:0"
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def _check_admin() -> bool:
    token = request.headers.get("Authorization", "")
    if token.startswith("Bearer "):
        token = token[7:]
    return hmac.compare_digest(token, make_admin_token())


admin_bp = Blueprint("admin", __name__)


# ── Login ─────────────────────────────────────────────────────
@admin_bp.route("/admin-login-json", methods=["POST", "OPTIONS"])
def admin_login_json():
    if request.method == "OPTIONS":
        return "", 204
    data = request.json or {}
    if data.get("email") == ADMIN_EMAIL and data.get("password") == ADMIN_PASSWORD:
        return jsonify({
            "user":  {"id": 0, "name": "Admin", "email": ADMIN_EMAIL, "role": "admin"},
            "token": make_admin_token(),
        })
    return jsonify({"error": "Invalid admin credentials"}), 401


# ── List all teachers ─────────────────────────────────────────
@admin_bp.route("/admin/teachers", methods=["GET", "OPTIONS"])
def list_teachers():
    if request.method == "OPTIONS":
        return "", 204
    if not _check_admin():
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(q.get_all_teachers())


# ── Create teacher ────────────────────────────────────────────
@admin_bp.route("/admin/teachers", methods=["POST"])
def create_teacher():
    if not _check_admin():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    email = (data.get("email") or "").strip()
    pwd   = (data.get("password") or "").strip()
    if not email or not pwd:
        return jsonify({"error": "email and password are required"}), 400
    try:
        q.create_teacher(email, pwd)
        return jsonify({"status": "created"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ── Delete teacher ────────────────────────────────────────────
@admin_bp.route("/admin/teachers/<int:teacher_id>", methods=["DELETE", "OPTIONS"])
def delete_teacher(teacher_id):
    if request.method == "OPTIONS":
        return "", 204
    if not _check_admin():
        return jsonify({"error": "Unauthorized"}), 401
    q.delete_teacher(teacher_id)
    return jsonify({"status": "deleted"})


# ── List all students ─────────────────────────────────────────
@admin_bp.route("/admin/students", methods=["GET", "OPTIONS"])
def list_students():
    if request.method == "OPTIONS":
        return "", 204
    if not _check_admin():
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(q.get_all_students())


# ── Create student ────────────────────────────────────────────
@admin_bp.route("/admin/students", methods=["POST"])
def create_student():
    if not _check_admin():
        return jsonify({"error": "Unauthorized"}), 401
    data   = request.json or {}
    name   = (data.get("name")     or "").strip()
    email  = (data.get("email")    or "").strip()
    reg_no = (data.get("reg_no")   or "").strip()
    pwd    = (data.get("password") or "").strip()
    if not all([name, email, reg_no, pwd]):
        return jsonify({"error": "name, email, reg_no and password are required"}), 400
    try:
        q.create_student(name, email, reg_no, pwd)
        return jsonify({"status": "created"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ── Delete student ────────────────────────────────────────────
@admin_bp.route("/admin/students/<int:student_id>", methods=["DELETE", "OPTIONS"])
def delete_student(student_id):
    if request.method == "OPTIONS":
        return "", 204
    if not _check_admin():
        return jsonify({"error": "Unauthorized"}), 401
    q.delete_student(student_id)
    return jsonify({"status": "deleted"})

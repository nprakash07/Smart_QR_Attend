"""
auth.py — Stateless token-based authentication using HMAC.
Replaces Flask session cookies, which don't work cross-domain on Vercel.
"""
import hmac
import hashlib
from flask import request, session
from config import SECRET_KEY


def _make_token(role: str, user_id: int) -> str:
    key = SECRET_KEY.encode()
    msg = f"{role}:{user_id}".encode()
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def make_student_token(student_id: int) -> str:
    return _make_token("student", student_id)


def make_teacher_token(teacher_id: int) -> str:
    return _make_token("teacher", teacher_id)


def _get_bearer_token() -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


def _get_user_id_from_header() -> int | None:
    uid = request.headers.get("X-User-ID")
    if uid:
        try:
            return int(uid)
        except (ValueError, TypeError):
            pass
    return None


def get_student_id() -> int | None:
    """Return verified student_id from token header, or Flask session as fallback."""
    token = _get_bearer_token()
    if token:
        uid = _get_user_id_from_header()
        if uid:
            expected = _make_token("student", uid)
            if hmac.compare_digest(expected, token):
                return uid
    # Fallback for local dev where cookies still work
    return session.get("student_id")


def get_teacher_id() -> int | None:
    """Return verified teacher_id from token header, query param, or Flask session fallback."""
    # 1. Try Authorization header (AJAX requests)
    token = _get_bearer_token()
    uid   = _get_user_id_from_header()
    if token and uid:
        expected = _make_token("teacher", uid)
        if hmac.compare_digest(expected, token):
            return uid

    # 2. Try query params (browser direct navigation — used by export-excel link)
    token_qp  = request.args.get("token", "")
    uid_qp    = request.args.get("user_id", "")
    if token_qp and uid_qp:
        try:
            uid_int  = int(uid_qp)
            expected = _make_token("teacher", uid_int)
            if hmac.compare_digest(expected, token_qp):
                return uid_int
        except (ValueError, TypeError):
            pass

    # 3. Fallback for local dev where cookies still work
    return session.get("teacher_id")

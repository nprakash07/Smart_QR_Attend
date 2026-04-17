import os

# ─────────────────────────────────────────────────────────────
#  config.py
#  Reads from Vercel Environment Variables in production,
#  or uses local credentials for development.
# ─────────────────────────────────────────────────────────────

DB_CONFIG = {
    "host"    : os.getenv("DB_HOST", "localhost"),
    "user"    : os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "Prakash@2004"), 
    "database": os.getenv("DB_NAME", "smart_attend_db"),
}

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
SECRET_KEY = os.getenv("SECRET_KEY", "smartattend_secret_2024")

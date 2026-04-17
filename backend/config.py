import os

# ─────────────────────────────────────────────────────────────
#  config.py
#  Reads from Vercel Environment Variables in production,
#  or uses local credentials for development.
# ─────────────────────────────────────────────────────────────

# Disable SSL only on local dev; Aiven (and most cloud DBs) require SSL
_is_local = os.getenv("DB_HOST", "localhost") == "localhost"

DB_CONFIG = {
    "host"       : os.getenv("DB_HOST", "localhost"),
    "port"       : int(os.getenv("DB_PORT", 3306)),
    "user"       : os.getenv("DB_USER", "root"),
    "password"   : os.getenv("DB_PASSWORD", "Prakash@2004"),
    "database"   : os.getenv("DB_NAME", "smart_attend_db"),
    "ssl_disabled": _is_local,  # False on Vercel = SSL ON; True locally = SSL OFF
}

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
SECRET_KEY = os.getenv("SECRET_KEY", "smartattend_secret_2024")

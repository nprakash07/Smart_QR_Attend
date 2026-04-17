from config import DB_CONFIG
import importlib

def get_connection():
    try:
        mysql_connector = importlib.import_module("mysql.connector")
    except ModuleNotFoundError as e:
        raise RuntimeError(
            "mysql.connector package not found; install it with: pip install mysql-connector-python"
        ) from e
    return mysql_connector.connect(**DB_CONFIG)
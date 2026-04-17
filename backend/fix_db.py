import mysql.connector
from config import DB_CONFIG

print("Connecting to database...")
con = mysql.connector.connect(**DB_CONFIG)
cur = con.cursor()

cur.execute("SHOW INDEX FROM attendance WHERE Non_unique=0 AND Key_name != 'PRIMARY'")
old_keys = {row[2] for row in cur.fetchall()}
print(f"Found unique keys: {old_keys}")

for key_name in old_keys:
    cur.execute(
        "SELECT COUNT(*) FROM information_schema.statistics "
        "WHERE table_schema=%s AND table_name='attendance' "
        "AND index_name=%s AND column_name='subject'",
        (DB_CONFIG['database'], key_name)
    )
    has_subject = cur.fetchone()[0] > 0
    if not has_subject:
        try:
            cur.execute(f"ALTER TABLE attendance DROP INDEX `{key_name}`")
            con.commit()
            print(f"Dropped old key: {key_name}")
        except Exception as e:
            print(f"Could not drop {key_name}: {e}")

try:
    cur.execute("""
        ALTER TABLE attendance
        ADD UNIQUE KEY uniq_att_full
        (student_id, date, session_number, subject(100), semester(60))
    """)
    con.commit()
    print("New unique key added successfully")
except Exception as e:
    print(f"Key note: {e}")

cur.close()
con.close()
print("Done. Now restart Flask: python app.py")
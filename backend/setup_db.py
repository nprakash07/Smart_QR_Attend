"""
Run this ONCE before starting the app:
    python setup_db.py
"""
import mysql.connector
from config import DB_CONFIG, SECRET_KEY

# 1. Create database
cfg = {k: v for k, v in DB_CONFIG.items() if k != "database"}
con = mysql.connector.connect(**cfg)
cur = con.cursor()
cur.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']} "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
con.commit(); cur.close(); con.close()
print(f"✅ Database '{DB_CONFIG['database']}' ready")

# 2. Create tables
from db import get_connection
con = get_connection(); cur = con.cursor()

cur.execute("""
    CREATE TABLE IF NOT EXISTS teachers (
        id       INT AUTO_INCREMENT PRIMARY KEY,
        email    VARCHAR(120) UNIQUE NOT NULL,
        password VARCHAR(120)        NOT NULL
    ) ENGINE=InnoDB
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id       INT AUTO_INCREMENT PRIMARY KEY,
        name     VARCHAR(100)        NOT NULL,
        email    VARCHAR(120) UNIQUE NOT NULL,
        reg_no   VARCHAR(20)  UNIQUE NOT NULL,
        password VARCHAR(120)        NOT NULL
    ) ENGINE=InnoDB
""")

cur.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        student_id     INT      NOT NULL,
        date           DATE     NOT NULL,
        session_number TINYINT  NOT NULL DEFAULT 1,
        status         CHAR(1)  NOT NULL DEFAULT 'A',
        UNIQUE KEY uniq_att (student_id, date, session_number),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
""")

con.commit()
print("✅ Tables created")

# 3. Seed demo data
cur.execute("INSERT IGNORE INTO teachers (email,password) VALUES (%s,%s)",
            ("teacher@college.com","1234"))

for i in range(1, 11):
    reg   = f"2301109{i:03d}"
    email = f"{reg}@college.com"
    cur.execute("INSERT IGNORE INTO students (name,email,reg_no,password) VALUES(%s,%s,%s,%s)",
                (f"Student {i:02d}", email, reg, "1234"))

con.commit(); cur.close(); con.close()
print("✅ Demo data seeded")
print()
print("─" * 45)
print("  Teacher login : teacher@college.com / 1234")
print("  Students      : 2301109001@college.com → 2301109010@college.com / 1234")
print("─" * 45)
print("\nNow run:  python app.py")
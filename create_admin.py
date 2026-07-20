"""
create_admin.py — Run this once to create your first Admin account.

Usage:
    python create_admin.py

This is only needed the FIRST time you set up the project on a new machine,
since there is no Admin yet to create one from the app UI.
After this, any Admin can create more Admins directly from the app.
"""

import mysql.connector
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 50)
print("  BeyondSure — Create First Admin Account")
print("=" * 50)
print()

name       = input("Full name       : ").strip()
code       = input("Employee code   : ").strip()
email      = input("Email           : ").strip().lower()
mobile     = input("Mobile          : ").strip()
password   = input("Password        : ").strip()

if not all([name, code, email, password]):
    print("\n❌ Name, code, email and password are all required.")
    exit(1)

hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

try:
    conn = mysql.connector.connect(
        host     = os.getenv("DB_HOST",        "localhost"),
        user     = os.getenv("DB_USER",        "root"),
        password = os.getenv("DB_PASSWORD",    ""),
        database = os.getenv("TICKET_DB_NAME", "ticket_db"),
    )
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO employees
            (employee_code, employee_name, email, mobile, password, designation, department, role, status)
        VALUES (%s, %s, %s, %s, %s, 'Administrator', 'Management', 'Admin', 'Active')
        """,
        (code, name, email, mobile or "", hashed_pw)
    )
    conn.commit()
    print()
    print("✅ Admin account created successfully!")
    print(f"   Name  : {name}")
    print(f"   Email : {email}")
    print(f"   Role  : Admin")
    print()
    print("You can now log in to the app with these credentials.")
except mysql.connector.errors.IntegrityError as e:
    if "email" in str(e):
        print("\n❌ That email already exists in the database.")
    elif "employee_code" in str(e):
        print("\n❌ That employee code already exists in the database.")
    else:
        print(f"\n❌ Database error: {e}")
except mysql.connector.Error as e:
    print(f"\n❌ Could not connect to database: {e}")
    print("   Make sure your .env file has the correct DB credentials.")
finally:
    try:
        cursor.close()
        conn.close()
    except Exception:
        pass

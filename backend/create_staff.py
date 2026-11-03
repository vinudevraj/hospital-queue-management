import getpass
import os
from dotenv import load_dotenv

load_dotenv()
import mysql.connector
from werkzeug.security import generate_password_hash

username = input("Staff username: ").strip()
full_name = input("Staff full name: ").strip()
password = getpass.getpass("Create password: ")
confirm = getpass.getpass("Confirm password: ")

if not username or not full_name or not password:
    raise SystemExit("All fields are required.")

if password != confirm:
    raise SystemExit("Passwords do not match.")

connection = mysql.connector.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME")
)

try:
    cursor = connection.cursor()
    cursor.execute(
        """INSERT INTO staff (username, password_hash, full_name, role)
           VALUES (%s, %s, %s, 'admin')""",
        (username, generate_password_hash(password), full_name)
    )
    connection.commit()
    print("Admin staff account created successfully.")
finally:
    cursor.close()
    connection.close()

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os
import mysql.connector


app = Flask(__name__)
CORS(app)


MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "ml",
    "wait_time_model.pkl"
)

model = joblib.load(MODEL_PATH)


def get_db_connection():
    return mysql.connector.connect(
        host="127.0.0.1",
        user="hospital_app",
        password="HospitalApp@2026",
        database="hospital_queue"
    )


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Hospital Smart Queue Management API is running"
    })


@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    required_fields = [
        "AgeGroup",
        "Department",
        "AppointmentType",
        "ArrivalMethod",
        "TriageCategory",
        "FacilityOccupancyRate",
        "ProvidersOnShift",
        "NursesOnShift",
        "StaffToPatientRatio",
        "ArrivalHour",
        "DayOfWeek",
        "IsWeekend",
        "Month"
    ]

    missing_fields = [
        field for field in required_fields
        if field not in data
    ]

    if missing_fields:
        return jsonify({
            "error": "Missing required fields",
            "fields": missing_fields
        }), 400

    input_data = pd.DataFrame([{
        field: data[field]
        for field in required_fields
    }])

    prediction = model.predict(input_data)[0]

    prediction = max(0, float(prediction))

    return jsonify({
        "predicted_wait_time_minutes": round(prediction, 2)
    })


@app.route("/doctors", methods=["GET"])
def get_doctors():

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                doctor_id,
                doctor_name,
                department,
                specialization,
                status
            FROM doctors
            ORDER BY CAST(SUBSTRING(doctor_id, 3) AS UNSIGNED)
        """)

        doctors = cursor.fetchall()

        return jsonify(doctors)

    except mysql.connector.Error as error:
        return jsonify({
            "error": "Database connection failed",
            "message": str(error)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.route("/patients", methods=["GET"])
def get_patients():

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                p.patient_id,
                p.token,
                p.patient_name,
                p.age,
                p.gender,
                p.phone,
                p.condition_name,
                p.doctor_id,
                d.doctor_name,
                p.department,
                p.triage_category,
                p.predicted_wait_time,
                p.status,
                p.is_emergency,
                p.registered_at
            FROM patients p
            LEFT JOIN doctors d
                ON p.doctor_id = d.doctor_id
            ORDER BY p.registered_at ASC, p.patient_id ASC
            LIMIT 20
        """)

        patients = cursor.fetchall()

        for patient in patients:
            if patient["registered_at"]:
                patient["registered_at"] = patient["registered_at"].isoformat()

        return jsonify(patients)

    except mysql.connector.Error as error:
        return jsonify({
            "error": "Database connection failed",
            "message": str(error)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.route("/patients", methods=["POST"])
def create_patient():

    data = request.get_json() or {}

    required_fields = [
        "patient_name",
        "age",
        "phone",
        "condition_name",
        "doctor_id",
        "department",
        "triage_category",
        "predicted_wait_time",
        "is_emergency"
    ]

    missing_fields = [
        field for field in required_fields
        if field not in data
    ]

    if missing_fields:
        return jsonify({
            "error": "Missing required fields",
            "fields": missing_fields
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT doctor_id, doctor_name, department
            FROM doctors
            WHERE doctor_id = %s
        """, (data["doctor_id"],))

        doctor = cursor.fetchone()

        if not doctor:
            return jsonify({
                "error": "Doctor not found"
            }), 404

        if doctor["department"] != data["department"]:
            return jsonify({
                "error": "Doctor does not belong to selected department"
            }), 400

        cursor.execute("""
            SELECT token
            FROM patients
            ORDER BY patient_id DESC
            LIMIT 1
        """)

        last_patient = cursor.fetchone()

        if last_patient and last_patient["token"].startswith("T"):
            try:
                last_number = int(last_patient["token"][1:])
            except ValueError:
                last_number = 0
        else:
            last_number = 0

        token = f"T{last_number + 1:03d}"

        cursor.execute("""
            INSERT INTO patients (
                token,
                patient_name,
                age,
                phone,
                condition_name,
                doctor_id,
                department,
                triage_category,
                predicted_wait_time,
                status,
                is_emergency
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'waiting', %s)
        """, (
            token,
            data["patient_name"],
            data["age"],
            data["phone"],
            data["condition_name"],
            data["doctor_id"],
            data["department"],
            data["triage_category"],
            data["predicted_wait_time"],
            data["is_emergency"]
        ))

        patient_id = cursor.lastrowid

        priority_map = {
            "Emergency": 1,
            "Immediate": 2,
            "Urgent": 3,
            "Semi-Urgent": 4,
            "Non-Urgent": 5
        }

        priority = priority_map.get(
            data["triage_category"],
            5
        )

        cursor.execute("""
            SELECT COALESCE(MAX(queue_position), 0) + 1 AS next_position
            FROM queue
            WHERE status = 'waiting'
        """)

        queue_position = cursor.fetchone()["next_position"]

        cursor.execute("""
            INSERT INTO queue (
                patient_id,
                token,
                priority,
                queue_position,
                status,
                predicted_wait_time
            )
            VALUES (%s, %s, %s, %s, 'waiting', %s)
        """, (
            patient_id,
            token,
            priority,
            queue_position,
            data["predicted_wait_time"]
        ))

        connection.commit()

        return jsonify({
            "message": "Patient registered successfully",
            "token": token,
            "patient_id": patient_id,
            "doctor_id": doctor["doctor_id"],
            "doctor_name": doctor["doctor_name"],
            "department": doctor["department"],
            "predicted_wait_time": data["predicted_wait_time"]
        }), 201

    except mysql.connector.Error as error:
        if connection:
            connection.rollback()

        return jsonify({
            "error": "Database operation failed",
            "message": str(error)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )

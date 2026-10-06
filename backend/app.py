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
                p.registered_at,
                p.appointment_date
            FROM patients p
            LEFT JOIN doctors d
                ON p.doctor_id = d.doctor_id
            WHERE DATE(p.registered_at) = CURDATE()
            ORDER BY p.registered_at ASC, p.patient_id ASC
            LIMIT 100
        """)

        patients = cursor.fetchall()

        for patient in patients:
            if patient["registered_at"]:
                patient["registered_at"] = patient["registered_at"].isoformat()

            if patient["appointment_date"]:
                patient["appointment_date"] = patient["appointment_date"].isoformat()

        return jsonify(patients), 200

    except mysql.connector.Error as error:
        return jsonify({
            "error": "Database operation failed",
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
        "is_emergency",
        "appointment_date"
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
            WHERE DATE(registered_at) = CURDATE()
              AND token REGEXP '^T[0-9]+$'
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
                is_emergency,
                appointment_date
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'waiting', %s, %s)
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
            data["is_emergency"],
            data["appointment_date"]
        ))

        patient_id = cursor.lastrowid

        priority_map = {
            "emergency": 1,
            "immediate": 2,
            "urgent": 3,
            "semi-urgent": 4,
            "non-urgent": 5
        }

        triage_category = str(data["triage_category"]).strip().lower()
        priority = priority_map.get(triage_category, 5)

        queue_position = 1

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
            "predicted_wait_time": data["predicted_wait_time"],
            "appointment_date": data["appointment_date"]
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


@app.route("/queue", methods=["GET"])
def get_queue():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            q.queue_id,
            q.patient_id,
            q.token,
            q.priority,
            q.status,
            q.predicted_wait_time,
            q.added_at,
            q.consulting_started_at,
            p.patient_name,
            p.age,
            p.department,
            p.triage_category,
            p.is_emergency,
            p.appointment_date,
            d.doctor_id,
            d.doctor_name
        FROM queue q
        JOIN patients p ON q.patient_id = p.patient_id
        LEFT JOIN doctors d ON p.doctor_id = d.doctor_id
        WHERE DATE(p.registered_at) = CURDATE()
          AND q.status IN ("waiting", "consulting")
        ORDER BY
            q.priority ASC,
            q.added_at ASC,
            q.queue_id ASC
    """)

    rows = cursor.fetchall()

    service_time = 18
    consulting_remaining = 0
    waiting_count = 0
    result = []

    for row in rows:
        if row["status"] == "consulting":
            remaining = service_time

            if row["consulting_started_at"]:
                cursor.execute(
                    """
                    SELECT GREATEST(
                        0,
                        %s - TIMESTAMPDIFF(
                            MINUTE,
                            %s,
                            NOW()
                        )
                    ) AS remaining
                    """,
                    (service_time, row["consulting_started_at"])
                )

                remaining = int(cursor.fetchone()["remaining"])

            row["queue_position"] = 0
            row["live_eta_minutes"] = remaining
            consulting_remaining = max(
                consulting_remaining,
                remaining
            )

        else:
            waiting_count += 1
            row["queue_position"] = waiting_count

            row["live_eta_minutes"] = (
                consulting_remaining
                + waiting_count * service_time
            )

        if row["added_at"]:
            row["added_at"] = row["added_at"].isoformat()

        if row["consulting_started_at"]:
            row["consulting_started_at"] = (
                row["consulting_started_at"].isoformat()
            )

        if row["appointment_date"]:
            row["appointment_date"] = (
                row["appointment_date"].isoformat()
            )

        result.append(row)

    cursor.close()
    conn.close()

    return jsonify({
        "queue": result,
        "waiting_count": waiting_count,
        "service_time_minutes": service_time
    })


@app.route("/queue/call-next", methods=["POST"])
def call_next_patient():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                q.queue_id,
                q.patient_id,
                q.token
            FROM queue q
            JOIN patients p
                ON q.patient_id = p.patient_id
            WHERE DATE(p.registered_at) = CURDATE()
              AND q.status = 'waiting'
              AND p.status = 'waiting'
            ORDER BY
                q.priority ASC,
                q.added_at ASC,
                q.queue_id ASC
            LIMIT 1
        """)

        next_patient = cursor.fetchone()

        if not next_patient:
            return jsonify({
                "error": "No patients waiting."
            }), 404

        cursor.execute("""
            UPDATE patients
            SET status = 'consulting'
            WHERE patient_id = %s
        """, (next_patient["patient_id"],))

        cursor.execute("""
            UPDATE queue
            SET status = 'consulting',
                consulting_started_at = NOW()
            WHERE queue_id = %s
        """, (next_patient["queue_id"],))

        connection.commit()

        return jsonify({
            "message": "Patient called successfully.",
            "patient_id": next_patient["patient_id"],
            "token": next_patient["token"]
        }), 200

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


@app.route("/queue/complete/<int:patient_id>", methods=["POST"])
def complete_patient(patient_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT patient_id, token, status
            FROM patients
            WHERE patient_id = %s
            LIMIT 1
        """, (patient_id,))

        patient = cursor.fetchone()

        if not patient:
            return jsonify({
                "error": "Patient not found."
            }), 404

        if patient["status"] != "consulting":
            return jsonify({
                "error": "Patient is not currently consulting."
            }), 400

        cursor.execute("""
            UPDATE patients
            SET status = 'completed'
            WHERE patient_id = %s
        """, (patient_id,))

        cursor.execute("""
            UPDATE queue
            SET status = 'completed'
            WHERE patient_id = %s
        """, (patient_id,))

        connection.commit()

        return jsonify({
            "message": "Consultation completed successfully.",
            "patient_id": patient_id,
            "token": patient["token"]
        }), 200

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


@app.route("/queue/skip/<int:patient_id>", methods=["POST"])
def skip_patient(patient_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                q.queue_id,
                q.token,
                q.status
            FROM queue q
            JOIN patients p
                ON q.patient_id = p.patient_id
            WHERE q.patient_id = %s
              AND DATE(p.registered_at) = CURDATE()
            LIMIT 1
        """, (patient_id,))

        patient = cursor.fetchone()

        if not patient:
            return jsonify({
                "error": "Patient not found in today's queue."
            }), 404

        if patient["status"] != "waiting":
            return jsonify({
                "error": "Only waiting patients can be skipped."
            }), 400

        cursor.execute("""
            SELECT COALESCE(MAX(q.added_at), NOW()) AS last_added_at
            FROM queue q
            JOIN patients p
                ON q.patient_id = p.patient_id
            WHERE DATE(p.registered_at) = CURDATE()
              AND q.status = 'waiting'
              AND q.queue_id <> %s
        """, (patient["queue_id"],))

        row = cursor.fetchone()
        last_added_at = row["last_added_at"]

        cursor.execute("""
            UPDATE queue
            SET added_at = DATE_ADD(%s, INTERVAL 1 SECOND)
            WHERE queue_id = %s
        """, (last_added_at, patient["queue_id"]))

        # Recalculate stored queue positions after the skip.
        cursor.execute("""
            SELECT q.queue_id
            FROM queue q
            JOIN patients p
                ON q.patient_id = p.patient_id
            WHERE DATE(p.registered_at) = CURDATE()
              AND q.status = 'waiting'
            ORDER BY
                q.priority ASC,
                q.added_at ASC,
                q.queue_id ASC
        """)

        waiting_rows = cursor.fetchall()

        for position, queue_row in enumerate(waiting_rows, start=1):
            cursor.execute("""
                UPDATE queue
                SET queue_position = %s
                WHERE queue_id = %s
            """, (position, queue_row["queue_id"]))

        connection.commit()

        return jsonify({
            "message": "Patient moved to the end of the queue.",
            "patient_id": patient_id,
            "token": patient["token"]
        }), 200

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


@app.route("/queue/emergency/<int:patient_id>", methods=["POST"])
def toggle_emergency(patient_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                p.patient_id,
                p.token,
                p.is_emergency,
                q.queue_id,
                q.priority,
                q.status
            FROM patients p
            LEFT JOIN queue q
                ON p.patient_id = q.patient_id
            WHERE p.patient_id = %s
            LIMIT 1
        """, (patient_id,))

        patient = cursor.fetchone()

        if not patient:
            return jsonify({
                "error": "Patient not found."
            }), 404

        new_emergency = not bool(patient["is_emergency"])

        if new_emergency:
            new_priority = 1
        else:
            priority_map = {
                "emergency": 1,
                "immediate": 2,
                "urgent": 3,
                "semi-urgent": 4,
                "non-urgent": 5
            }

            cursor.execute("""
                SELECT triage_category
                FROM patients
                WHERE patient_id = %s
                LIMIT 1
            """, (patient_id,))

            triage_row = cursor.fetchone()
            triage_category = (
                str(triage_row["triage_category"]).strip().lower()
                if triage_row and triage_row["triage_category"]
                else "non-urgent"
            )

            new_priority = priority_map.get(triage_category, 5)

        cursor.execute("""
            UPDATE patients
            SET is_emergency = %s
            WHERE patient_id = %s
        """, (int(new_emergency), patient_id))

        if patient["queue_id"]:
            cursor.execute("""
                UPDATE queue
                SET priority = %s
                WHERE queue_id = %s
            """, (new_priority, patient["queue_id"]))

        connection.commit()

        return jsonify({
            "message": "Emergency status updated.",
            "patient_id": patient_id,
            "token": patient["token"],
            "is_emergency": new_emergency,
            "priority": new_priority
        }), 200

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

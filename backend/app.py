from datetime import datetime, timedelta
import secrets
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
    connection = mysql.connector.connect(
        host="127.0.0.1",
        user="hospital_app",
        password="HospitalApp@2026",
        database="hospital_queue"
    )
    cursor = connection.cursor()
    cursor.execute("SET time_zone = '+05:30'")
    cursor.close()
    return connection


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



@app.route("/analytics", methods=["GET"])
def get_analytics():

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Live hospital registrations start after the imported dataset records.
        LIVE_PATIENT_ID_MIN = 5004

        cursor.execute("""
            SELECT
                COUNT(*) AS total_patients,
                SUM(status = 'completed') AS completed_patients,
                SUM(status = 'waiting') AS waiting_patients,
                SUM(status = 'consulting') AS consulting_patients,
                SUM(is_emergency = 1) AS emergency_cases
            FROM patients
            WHERE DATE(registered_at) = CURDATE()
              AND patient_id >= %s
        """, (LIVE_PATIENT_ID_MIN,))
        summary = cursor.fetchone()

        cursor.execute("""
            SELECT AVG(
                TIMESTAMPDIFF(
                    SECOND,
                    q.added_at,
                    q.consulting_started_at
                ) / 60
            ) AS average_wait_time
            FROM queue q
            JOIN patients p
                ON q.patient_id = p.patient_id
            WHERE DATE(p.registered_at) = CURDATE()
              AND p.patient_id >= %s
              AND q.status = 'completed'
              AND q.consulting_started_at IS NOT NULL
        """, (LIVE_PATIENT_ID_MIN,))
        wait_result = cursor.fetchone()

        total_patients = int(summary["total_patients"] or 0)
        completed_patients = int(summary["completed_patients"] or 0)

        efficiency = (
            round((completed_patients / total_patients) * 100)
            if total_patients
            else 0
        )

        cursor.execute("""
            SELECT
                HOUR(registered_at) AS hour,
                COUNT(*) AS patients
            FROM patients
            WHERE DATE(registered_at) = CURDATE()
              AND patient_id >= %s
            GROUP BY HOUR(registered_at)
            ORDER BY hour
        """, (LIVE_PATIENT_ID_MIN,))
        hourly_rows = cursor.fetchall()

        hourly_counts = {
            int(row["hour"]): int(row["patients"])
            for row in hourly_rows
        }

        hourly_volume = [
            {
                "time": (
                    f"{hour % 12 or 12}"
                    f"{'AM' if hour < 12 else 'PM'}"
                ),
                "patients": hourly_counts.get(hour, 0)
            }
            for hour in range(24)
        ]

        peak_hour = (
            max(hourly_rows, key=lambda row: row["patients"])["hour"]
            if hourly_rows else None
        )

        peak_hour_label = (
            f"{peak_hour % 12 or 12}"
            f"{' AM' if peak_hour < 12 else ' PM'}"
            if peak_hour is not None
            else "—"
        )

        cursor.execute("""
            SELECT
                DATE(registered_at) AS date,
                COUNT(*) AS patients,
                ROUND(
                    SUM(status = 'completed') / COUNT(*) * 100
                ) AS efficiency
            FROM patients
            WHERE registered_at >= CURDATE() - INTERVAL 6 DAY
              AND patient_id >= %s
            GROUP BY DATE(registered_at)
            ORDER BY date
        """, (LIVE_PATIENT_ID_MIN,))
        weekly_rows = cursor.fetchall()

        weekly_counts = {
            row["date"]: {
                "patients": int(row["patients"]),
                "efficiency": int(row["efficiency"] or 0)
            }
            for row in weekly_rows
        }

        weekly_trend = []

        for offset in range(6, -1, -1):
            cursor.execute(
                "SELECT DATE(CURDATE() - INTERVAL %s DAY) AS date",
                (offset,)
            )
            date_row = cursor.fetchone()
            current_date = date_row["date"]

            values = weekly_counts.get(
                current_date,
                {"patients": 0, "efficiency": 0}
            )

            weekly_trend.append({
                "day": current_date.strftime("%a"),
                "date": current_date.strftime("%Y-%m-%d"),
                "patients": values["patients"],
                "efficiency": values["efficiency"]
            })

        cursor.execute("""
            SELECT
                CASE
                    WHEN TIMESTAMPDIFF(
                        SECOND,
                        q.consulting_started_at,
                        q.completed_at
                    ) / 60 < 10 THEN '< 10 min'
                    WHEN TIMESTAMPDIFF(
                        SECOND,
                        q.consulting_started_at,
                        q.completed_at
                    ) / 60 < 15 THEN '10–15 min'
                    WHEN TIMESTAMPDIFF(
                        SECOND,
                        q.consulting_started_at,
                        q.completed_at
                    ) / 60 < 20 THEN '15–20 min'
                    ELSE '> 20 min'
                END AS duration_range,
                COUNT(*) AS count
            FROM queue q
            JOIN patients p
                ON q.patient_id = p.patient_id
            WHERE DATE(p.registered_at) = CURDATE()
              AND p.patient_id >= %s
              AND q.status = 'completed'
              AND q.consulting_started_at IS NOT NULL
              AND q.completed_at IS NOT NULL
              AND q.completed_at >= q.consulting_started_at
            GROUP BY duration_range
            ORDER BY
                CASE duration_range
                    WHEN '< 10 min' THEN 1
                    WHEN '10–15 min' THEN 2
                    WHEN '15–20 min' THEN 3
                    ELSE 4
                END
        """, (LIVE_PATIENT_ID_MIN,))
        duration_rows = cursor.fetchall()

        duration_total = sum(
            int(row["count"]) for row in duration_rows
        )

        duration_distribution = [
            {
                "name": row["duration_range"],
                "value": round(
                    int(row["count"]) / duration_total * 100,
                    1
                ) if duration_total else 0
            }
            for row in duration_rows
        ]

        # Patients by department today.
        cursor.execute("""
            SELECT
                p.department AS name,
                COUNT(*) AS patients
            FROM patients p
            WHERE DATE(p.registered_at) = CURDATE()
              AND p.patient_id >= %s
              AND p.department IS NOT NULL
              AND p.department <> ''
            GROUP BY p.department
            ORDER BY patients DESC, p.department ASC
        """, (LIVE_PATIENT_ID_MIN,))
        department_rows = cursor.fetchall()

        patients_by_department = [
            {
                "name": row["name"],
                "patients": int(row["patients"])
            }
            for row in department_rows
        ]

        # Patients by triage priority today.
        cursor.execute("""
            SELECT
                p.triage_category AS name,
                COUNT(*) AS patients
            FROM patients p
            WHERE DATE(p.registered_at) = CURDATE()
              AND p.patient_id >= %s
              AND p.triage_category IS NOT NULL
              AND p.triage_category <> ''
            GROUP BY p.triage_category
            ORDER BY
                CASE LOWER(p.triage_category)
                    WHEN 'emergency' THEN 1
                    WHEN 'immediate' THEN 2
                    WHEN 'urgent' THEN 3
                    WHEN 'semi-urgent' THEN 4
                    WHEN 'non-urgent' THEN 5
                    ELSE 6
                END
        """, (LIVE_PATIENT_ID_MIN,))
        priority_rows = cursor.fetchall()

        patients_by_priority = [
            {
                "name": row["name"],
                "patients": int(row["patients"])
            }
            for row in priority_rows
        ]

        # Average actual wait time by department today.
        cursor.execute("""
            SELECT
                p.department AS name,
                ROUND(
                    AVG(
                        TIMESTAMPDIFF(
                            SECOND,
                            q.added_at,
                            q.consulting_started_at
                        ) / 60
                    )
                ) AS average_wait
            FROM queue q
            JOIN patients p
                ON q.patient_id = p.patient_id
            WHERE DATE(p.registered_at) = CURDATE()
              AND p.patient_id >= %s
              AND q.status = 'completed'
              AND q.added_at IS NOT NULL
              AND q.consulting_started_at IS NOT NULL
              AND q.consulting_started_at >= q.added_at
            GROUP BY p.department
            ORDER BY average_wait DESC, p.department ASC
        """, (LIVE_PATIENT_ID_MIN,))
        department_wait_rows = cursor.fetchall()

        average_wait_by_department = [
            {
                "name": row["name"],
                "average_wait": int(row["average_wait"] or 0)
            }
            for row in department_wait_rows
        ]

        cursor.execute("""
            SELECT
                p.patient_id,
                p.token,
                p.patient_name,
                p.age,
                p.gender,
                p.phone,
                p.condition_name,
                p.department,
                d.doctor_name,
                p.triage_category,
                p.is_emergency,
                p.predicted_wait_time,
                p.status,
                p.registered_at,
                q.added_at,
                q.consulting_started_at,
                q.status AS queue_status
            FROM patients p
            LEFT JOIN doctors d
                ON p.doctor_id = d.doctor_id
            LEFT JOIN queue q
                ON p.patient_id = q.patient_id
            WHERE DATE(p.registered_at) = CURDATE()
              AND p.patient_id >= %s
            ORDER BY p.registered_at ASC, p.patient_id ASC
        """, (LIVE_PATIENT_ID_MIN,))

        patient_rows = cursor.fetchall()

        patient_records = [
            {
                "token": row["token"],
                "patient_name": row["patient_name"],
                "age": row["age"],
                "gender": row["gender"] or "",
                "phone": row["phone"] or "",
                "condition": row["condition_name"] or "",
                "department": row["department"] or "",
                "doctor": row["doctor_name"] or "Not assigned",
                "triage_category": row["triage_category"] or "",
                "emergency": "Yes" if row["is_emergency"] else "No",
                "predicted_wait_time": int(row["predicted_wait_time"] or 0),
                "actual_wait_time": (
                    round(
                        (
                            row["consulting_started_at"] - row["added_at"]
                        ).total_seconds() / 60
                    )
                    if row["status"] == "completed"
                    and row["consulting_started_at"]
                    and row["added_at"]
                    else None
                ),
                "status": row["status"] or "",
                "registered_at": (
                    row["registered_at"].strftime("%Y-%m-%d %I:%M %p")
                    if row["registered_at"] else ""
                ),
                "consulting_started_at": (
                    row["consulting_started_at"].strftime("%Y-%m-%d %I:%M %p")
                    if row["consulting_started_at"] else ""
                )
            }
            for row in patient_rows
        ]

        return jsonify({
            "total_patients_today": total_patients,
            "completed_patients_today": completed_patients,
            "waiting_patients": int(summary["waiting_patients"] or 0),
            "consulting_patients": int(summary["consulting_patients"] or 0),
            "average_wait_time": round(
                float(wait_result["average_wait_time"] or 0)
            ),
            "queue_efficiency": efficiency,
            "peak_hour": peak_hour_label,
            "emergency_cases": int(summary["emergency_cases"] or 0),
            "hourly_volume": hourly_volume,
            "weekly_trend": weekly_trend,
            "duration_distribution": duration_distribution,
            "patients_by_department": patients_by_department,
            "patients_by_priority": patients_by_priority,
            "average_wait_by_department": average_wait_by_department,
            "patient_records": patient_records
        })

    except Exception as e:
        return jsonify({
            "error": "Failed to load analytics",
            "details": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/doctors/<doctor_id>/leave", methods=["POST"])
def update_doctor_leave(doctor_id):

    connection = None
    cursor = None

    try:
        data = request.get_json() or {}
        is_on_leave = data.get("is_on_leave")

        if type(is_on_leave) is not bool:
            return jsonify({
                "error": "is_on_leave must be true or false"
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT doctor_id, status
            FROM doctors
            WHERE doctor_id = %s
            FOR UPDATE
        """, (doctor_id,))

        doctor = cursor.fetchone()

        if not doctor:
            return jsonify({"error": "Doctor not found"}), 404

        if is_on_leave:
            cursor.execute("""
                SELECT COUNT(*) AS active_patients
                FROM queue q
                JOIN patients p ON q.patient_id = p.patient_id
                WHERE p.doctor_id = %s
                  AND DATE(p.registered_at) = CURDATE()
                  AND q.status IN ('waiting', 'consulting')
            """, (doctor_id,))

            active_count = int(cursor.fetchone()["active_patients"])

            if active_count > 0:
                return jsonify({
                    "error": (
                        "This doctor has active patients. "
                        "Complete or safely reassign their queue before marking leave."
                    ),
                    "active_patients": active_count
                }), 409

        cursor.execute("""
            UPDATE doctors
            SET status = %s
            WHERE doctor_id = %s
        """, ("On Leave" if is_on_leave else "Available", doctor_id))

        connection.commit()

        return jsonify({
            "message": (
                "Doctor marked On Leave"
                if is_on_leave
                else "Doctor marked Available"
            ),
            "doctor_id": doctor_id,
            "status": "On Leave" if is_on_leave else "Available"
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


@app.route("/doctors", methods=["GET"])
def get_doctors():

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                d.doctor_id,
                d.doctor_name,
                d.department,
                d.specialization,
                CASE
                    WHEN UPPER(COALESCE(d.status, 'Available')) = 'ON LEAVE'
                    THEN 'On Leave'
                    WHEN EXISTS (
                        SELECT 1
                        FROM queue q
                        JOIN patients p
                            ON q.patient_id = p.patient_id
                        WHERE p.doctor_id = d.doctor_id
                          AND DATE(p.registered_at) = CURDATE()
                          AND q.status = 'consulting'
                    )
                    THEN 'Busy'
                    ELSE 'Available'
                END AS status,
                (
                    SELECT COUNT(*)
                    FROM queue q
                    JOIN patients p
                        ON q.patient_id = p.patient_id
                    WHERE p.doctor_id = d.doctor_id
                      AND DATE(p.registered_at) = CURDATE()
                      AND q.status = 'waiting'
                ) AS waiting_patients
            FROM doctors d
            ORDER BY CAST(SUBSTRING(d.doctor_id, 3) AS UNSIGNED)
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



@app.route("/patients/token/<token>", methods=["GET"])
def get_patient_by_token(token):

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
                p.appointment_date,
                q.queue_id,
                q.priority,
                q.queue_position,
                q.status AS queue_status,
                q.added_at,
                q.consulting_started_at
            FROM patients p
            LEFT JOIN doctors d
                ON p.doctor_id = d.doctor_id
            LEFT JOIN queue q
                ON q.patient_id = p.patient_id
            WHERE UPPER(p.token) = UPPER(%s)
              AND DATE(p.registered_at) = CURDATE()
            ORDER BY q.queue_id DESC
            LIMIT 1
        """, (token.strip(),))

        patient = cursor.fetchone()

        if not patient:
            return jsonify({
                "error": "Patient token not found for today."
            }), 404

        # Historical average consultation duration by department.
        cursor.execute("""
            SELECT
                Department,
                AVG(ConsultationDurationTime) AS avg_duration
            FROM hospital_wait_data
            WHERE ConsultationDurationTime IS NOT NULL
              AND ConsultationDurationTime > 0
            GROUP BY Department
        """)

        department_service_times = {
            row["Department"]: max(1, round(float(row["avg_duration"])))
            for row in cursor.fetchall()
            if row["Department"]
        }

        default_service_time = 20
        live_eta_minutes = None
        live_eta_seconds = None
        queue_position = None

        # Only active queue entries have a live ETA.
        if patient["queue_status"] in ("waiting", "consulting"):

            cursor.execute("""
                SELECT
                    q.queue_id,
                    q.patient_id,
                    q.token,
                    q.status,
                    q.priority,
                    q.added_at,
                    q.consulting_started_at,
                    p.department
                FROM queue q
                JOIN patients p
                    ON q.patient_id = p.patient_id
                WHERE DATE(p.registered_at) = CURDATE()
                  AND q.status IN ("waiting", "consulting")
                  AND p.department = %s
                  AND p.doctor_id <=> %s
                ORDER BY
                    q.priority ASC,
                    q.added_at ASC,
                    q.queue_id ASC
            """, (patient["department"], patient["doctor_id"]))

            department_rows = cursor.fetchall()

            consulting_remaining = 0
            consulting_remaining_seconds = 0
            waiting_rows = []

            service_time = department_service_times.get(
                patient["department"] or "General",
                default_service_time
            )

            for row in department_rows:
                if row["status"] == "consulting":
                    remaining = service_time
                    remaining_seconds = service_time * 60

                    if row["consulting_started_at"]:
                        cursor.execute("""
                            SELECT GREATEST(
                                0,
                                %s * 60 - TIMESTAMPDIFF(
                                    SECOND,
                                    %s,
                                    NOW()
                                )
                            ) AS remaining_seconds
                        """, (
                            service_time,
                            row["consulting_started_at"]
                        ))

                        remaining_seconds = int(
                            cursor.fetchone()["remaining_seconds"]
                        )

                        remaining = (
                            remaining_seconds + 59
                        ) // 60

                    consulting_remaining = max(consulting_remaining, service_time)
                    consulting_remaining_seconds = max(consulting_remaining_seconds, service_time * 60)

                elif row["status"] == "waiting":
                    waiting_rows.append(row)

            if patient["queue_status"] == "consulting":
                queue_position = 0
                live_eta_minutes = consulting_remaining
                live_eta_seconds = consulting_remaining_seconds

            else:
                matching_index = next(
                    (
                        index
                        for index, row in enumerate(waiting_rows)
                        if row["patient_id"] == patient["patient_id"]
                    ),
                    None
                )

                if matching_index is not None:
                    queue_position = matching_index + 1
                    live_eta_minutes = consulting_remaining
                    live_eta_seconds = consulting_remaining_seconds

                    for prior_row in waiting_rows[:matching_index]:
                        prior_service_time = department_service_times.get(
                            prior_row["department"] or "General",
                            default_service_time
                        )
                        live_eta_minutes += prior_service_time
                        live_eta_seconds += prior_service_time * 60

        for field in [
            "registered_at",
            "appointment_date",
            "added_at",
            "consulting_started_at"
        ]:
            if patient.get(field):
                patient[field] = patient[field].isoformat()

        patient["queue_position"] = queue_position
        patient["live_eta_minutes"] = live_eta_minutes
        patient["live_eta_seconds"] = live_eta_seconds

        return jsonify(patient), 200

    except mysql.connector.Error as error:
        return jsonify({
            "error": "Database operation failed",
            "message": str(error),
            "mysql_error_code": error.errno
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
                p.appointment_date,
                q.added_at,
                q.consulting_started_at,
                CASE
                    WHEN q.added_at IS NULL THEN NULL
                    WHEN p.status = 'waiting' THEN
                        GREATEST(0, TIMESTAMPDIFF(SECOND, q.added_at, NOW()))
                    WHEN q.consulting_started_at IS NOT NULL THEN
                        GREATEST(
                            0,
                            TIMESTAMPDIFF(
                                SECOND,
                                q.added_at,
                                q.consulting_started_at
                            )
                        )
                    ELSE NULL
                END AS actual_wait_seconds
            FROM patients p
            LEFT JOIN doctors d
                ON p.doctor_id = d.doctor_id
            LEFT JOIN queue q
                ON p.patient_id = q.patient_id
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

            if patient["added_at"]:
                patient["added_at"] = patient["added_at"].isoformat()

            if patient["consulting_started_at"]:
                patient["consulting_started_at"] = (
                    patient["consulting_started_at"].isoformat()
                )

        return jsonify(patients), 200

    except mysql.connector.Error as error:
        return jsonify({
            "error": "Database operation failed",
            "message": str(error),
            "mysql_error_code": error.errno
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

        selected_department = str(data["department"]).strip()

        # Lock available doctors in the selected department.
        cursor.execute("""
            SELECT doctor_id, doctor_name, department, status
            FROM doctors
            WHERE LOWER(TRIM(department)) = LOWER(TRIM(%s))
              AND UPPER(TRIM(COALESCE(status, 'Available')))
                  NOT IN ('ON LEAVE', 'UNAVAILABLE')
            ORDER BY doctor_id
            FOR UPDATE
        """, (selected_department,))

        available_doctors = cursor.fetchall()

        if not available_doctors:
            connection.rollback()
            return jsonify({
                "error": "This department is currently unavailable because all doctors are on leave or unavailable."
            }), 409

        requested_doctor_id = data.get("doctor_id")

        if requested_doctor_id:
            doctor = next(
                (
                    item for item in available_doctors
                    if item["doctor_id"] == requested_doctor_id
                ),
                None
            )

            if not doctor:
                connection.rollback()
                return jsonify({
                    "error": "Selected doctor is not available in this department."
                }), 409

        else:
            # Assign the doctor with the lowest active queue workload.
            doctor_workloads = []

            for available_doctor in available_doctors:
                cursor.execute("""
                    SELECT COUNT(*) AS active_count
                    FROM patients p
                    JOIN queue q ON q.patient_id = p.patient_id
                    WHERE p.doctor_id = %s
                      AND DATE(p.registered_at) = CURDATE()
                      AND q.status IN ('waiting', 'consulting')
                """, (available_doctor["doctor_id"],))

                workload = int(
                    cursor.fetchone()["active_count"] or 0
                )

                doctor_workloads.append((
                    workload,
                    available_doctor["doctor_id"],
                    available_doctor
                ))

            doctor_workloads.sort(
                key=lambda item: (item[0], item[1])
            )

            doctor = doctor_workloads[0][2]

        data["doctor_id"] = doctor["doctor_id"]
        data["department"] = doctor["department"]

        cursor.execute("""
            SELECT COALESCE(
                MAX(CAST(SUBSTRING(token, 2) AS UNSIGNED)),
                0
            ) AS last_number
            FROM patients
            WHERE token REGEXP '^T[0-9]+$'
        """)

        token_result = cursor.fetchone()
        last_number = int(token_result["last_number"] or 0)
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
        print("MYSQL ERROR:", error)
        print("MYSQL ERROR CODE:", error.errno)

        if connection:
            connection.rollback()

        return jsonify({
            "error": "Database operation failed",
            "message": str(error),
            "mysql_error_code": error.errno
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()



@app.route("/appointments/slots", methods=["GET"])
def get_appointment_slots():

    department = request.args.get("department", "").strip()
    appointment_date = request.args.get("date", "").strip()

    if not department or not appointment_date:
        return jsonify({
            "error": "Department and date are required."
        }), 400

    try:
        selected_date = datetime.strptime(
            appointment_date, "%Y-%m-%d"
        ).date()
    except ValueError:
        return jsonify({
            "error": "Invalid date format. Use YYYY-MM-DD."
        }), 400

    if selected_date < datetime.now().date():
        return jsonify({
            "error": "Appointments cannot be booked for past dates."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT department_id, department_name
            FROM departments
            WHERE LOWER(TRIM(department_name)) =
                  LOWER(TRIM(%s))
        """, (department,))

        department_record = cursor.fetchone()

        if not department_record:
            return jsonify({
                "error": "Department not found."
            }), 404

        department_name = department_record["department_name"]

        cursor.execute("""
            SELECT COUNT(*) AS available_count
            FROM doctors
            WHERE LOWER(TRIM(department)) =
                  LOWER(TRIM(%s))
              AND UPPER(TRIM(COALESCE(status, 'Available')))
                  NOT IN ('ON LEAVE', 'UNAVAILABLE')
        """, (department_name,))

        available_count = cursor.fetchone()["available_count"]

        if not available_count:
            return jsonify({
                "error": "No doctors are currently available in this department.",
                "slots": []
            }), 409

        now = datetime.now()
        slots = []

        for hour in range(9, 17):
            for minute in (0, 30):

                slot_datetime = datetime(
                    selected_date.year,
                    selected_date.month,
                    selected_date.day,
                    hour,
                    minute
                )

                if slot_datetime <= now:
                    continue

                cursor.execute("""
                    SELECT COUNT(*) AS booked_count
                    FROM appointments
                    WHERE department = %s
                      AND appointment_datetime = %s
                      AND status IN ('booked', 'checked_in')
                """, (department_name, slot_datetime))

                booked_count = int(
                    cursor.fetchone()["booked_count"] or 0
                )

                slots.append({
                    "time": slot_datetime.strftime("%I:%M %p"),
                    "appointment_datetime": slot_datetime.strftime(
                        "%Y-%m-%d %H:%M:%S"
                    ),
                    "booked": booked_count,
                    "remaining": max(0, 5 - booked_count),
                    "available": booked_count < 5
                })

        return jsonify({
            "department": department_name,
            "date": appointment_date,
            "slot_duration_minutes": 30,
            "maximum_bookings_per_slot": 5,
            "slots": slots
        })

    except mysql.connector.Error as error:
        print("APPOINTMENT SLOT ERROR:", error)

        return jsonify({
            "error": "Unable to retrieve appointment slots."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()



@app.route("/appointments", methods=["POST"])
def create_appointment():

    data = request.get_json() or {}

    required_fields = [
        "patient_name",
        "age",
        "phone",
        "condition_name",
        "department",
        "appointment_datetime"
    ]

    missing_fields = [
        field for field in required_fields
        if field not in data or data[field] is None
        or str(data[field]).strip() == ""
    ]

    if missing_fields:
        return jsonify({
            "error": "Missing required fields",
            "fields": missing_fields
        }), 400

    try:
        age = int(data["age"])
    except (ValueError, TypeError):
        return jsonify({"error": "Age must be a valid number."}), 400

    if age < 0 or age > 120:
        return jsonify({"error": "Age must be between 0 and 120."}), 400

    phone = str(data["phone"]).strip()

    if not phone.isdigit() or len(phone) != 10:
        return jsonify({
            "error": "Phone number must contain exactly 10 digits."
        }), 400

    patient_name = str(data["patient_name"]).strip()
    condition_name = str(data["condition_name"]).strip()
    department = str(data["department"]).strip()

    if not patient_name or len(patient_name) > 100:
        return jsonify({"error": "Enter a valid patient name."}), 400

    if not condition_name or len(condition_name) > 255:
        return jsonify({"error": "Enter a valid reason for visit."}), 400

    try:
        appointment_datetime = datetime.strptime(
            str(data["appointment_datetime"]).strip(),
            "%Y-%m-%d %H:%M:%S"
        )
    except ValueError:
        return jsonify({
            "error": "Invalid appointment date or time."
        }), 400

    now = datetime.now()

    if appointment_datetime <= now:
        return jsonify({
            "error": "Appointment time must be in the future."
        }), 400

    if (
        appointment_datetime.hour < 9
        or appointment_datetime.hour >= 17
        or appointment_datetime.minute not in (0, 30)
        or appointment_datetime.second != 0
    ):
        return jsonify({
            "error": "Choose a valid 30-minute slot between 9 AM and 5 PM."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Lock the department row to prevent simultaneous overbooking.
        cursor.execute("""
            SELECT department_id, department_name
            FROM departments
            WHERE LOWER(TRIM(department_name)) =
                  LOWER(TRIM(%s))
            FOR UPDATE
        """, (department,))

        department_record = cursor.fetchone()

        if not department_record:
            connection.rollback()
            return jsonify({"error": "Department not found."}), 404

        department_name = department_record["department_name"]

        cursor.execute("""
            SELECT COUNT(*) AS available_count
            FROM doctors
            WHERE LOWER(TRIM(department)) =
                  LOWER(TRIM(%s))
              AND UPPER(TRIM(COALESCE(status, 'Available')))
                  NOT IN ('ON LEAVE', 'UNAVAILABLE')
        """, (department_name,))

        available_count = int(
            cursor.fetchone()["available_count"] or 0
        )

        if available_count == 0:
            connection.rollback()
            return jsonify({
                "error": "No doctors are currently available in this department."
            }), 409

        cursor.execute("""
            SELECT COUNT(*) AS booked_count
            FROM appointments
            WHERE department = %s
              AND appointment_datetime = %s
              AND status IN ('booked', 'checked_in')
        """, (department_name, appointment_datetime))

        booked_count = int(
            cursor.fetchone()["booked_count"] or 0
        )

        if booked_count >= 5:
            connection.rollback()
            return jsonify({
                "error": "This appointment slot is fully booked.",
                "remaining": 0
            }), 409

        booking_ref = "APT" + secrets.token_hex(5).upper()

        cursor.execute("""
            INSERT INTO appointments (
                booking_ref,
                patient_name,
                age,
                phone,
                condition_name,
                department,
                appointment_datetime,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'booked')
        """, (
            booking_ref,
            patient_name,
            age,
            phone,
            condition_name,
            department_name,
            appointment_datetime
        ))

        appointment_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Appointment booked successfully.",
            "appointment_id": appointment_id,
            "booking_ref": booking_ref,
            "patient_name": patient_name,
            "department": department_name,
            "appointment_datetime": appointment_datetime.strftime(
                "%Y-%m-%d %H:%M:%S"
            ),
            "status": "booked",
            "queue_token": None,
            "remaining_slots": 4 - booked_count
        }), 201

    except mysql.connector.Error as error:
        if connection:
            connection.rollback()

        print("APPOINTMENT BOOKING ERROR:", error)

        return jsonify({
            "error": "Unable to book appointment."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()



@app.route("/appointments", methods=["GET"])
def get_appointments():
    connection = None
    cursor = None

    try:
        appointment_date = request.args.get(
            "date",
            datetime.now().strftime("%Y-%m-%d")
        )
        department = request.args.get("department")
        status = request.args.get("status")

        try:
            datetime.strptime(appointment_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({
                "error": "Invalid date. Use YYYY-MM-DD."
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                a.appointment_id,
                a.booking_ref,
                a.patient_name,
                a.age,
                a.phone,
                a.condition_name,
                a.department,
                a.appointment_datetime,
                a.status,
                a.doctor_id,
                d.doctor_name,
                a.patient_id,
                a.created_at
            FROM appointments a
            LEFT JOIN doctors d
                ON a.doctor_id = d.doctor_id
            WHERE DATE(a.appointment_datetime) = %s
        """

        params = [appointment_date]

        if department:
            query += " AND a.department = %s"
            params.append(department)

        if status:
            query += " AND a.status = %s"
            params.append(status)

        query += " ORDER BY a.appointment_datetime ASC"

        cursor.execute(query, tuple(params))
        appointments = cursor.fetchall()

        for appointment in appointments:
            if appointment.get("appointment_datetime"):
                appointment["appointment_datetime"] = (
                    appointment["appointment_datetime"].strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                )

            if appointment.get("created_at"):
                appointment["created_at"] = (
                    appointment["created_at"].strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                )

        return jsonify({
            "appointments": appointments,
            "total": len(appointments),
            "date": appointment_date
        }), 200

    except mysql.connector.Error as error:
        print("GET APPOINTMENTS ERROR:", error)
        return jsonify({
            "error": "Unable to retrieve appointments."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()



@app.route("/appointments/<int:appointment_id>/check-in", methods=["POST"])
def check_in_appointment(appointment_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Lock the appointment to prevent duplicate check-ins.
        cursor.execute("""
            SELECT *
            FROM appointments
            WHERE appointment_id = %s
            FOR UPDATE
        """, (appointment_id,))

        appointment = cursor.fetchone()

        if not appointment:
            connection.rollback()
            return jsonify({"error": "Appointment not found."}), 404

        if appointment["status"] != "booked":
            connection.rollback()
            return jsonify({
                "error": "Only booked appointments can be checked in.",
                "status": appointment["status"]
            }), 409

        now = datetime.now()

        if appointment["appointment_datetime"].date() != now.date():
            connection.rollback()
            return jsonify({
                "error": "Check-in is allowed only on the appointment date.",
                "appointment_date": appointment[
                    "appointment_datetime"
                ].strftime("%Y-%m-%d")
            }), 409

        department = appointment["department"]

        # Lock available doctors in this department.
        cursor.execute("""
            SELECT doctor_id, doctor_name, department, status
            FROM doctors
            WHERE LOWER(TRIM(department)) = LOWER(TRIM(%s))
              AND UPPER(TRIM(COALESCE(status, 'Available')))
                  NOT IN ('ON LEAVE', 'UNAVAILABLE')
            ORDER BY doctor_id
            FOR UPDATE
        """, (department,))

        available_doctors = cursor.fetchall()

        if not available_doctors:
            connection.rollback()
            return jsonify({
                "error": "No available doctors in this department."
            }), 409

        # Assign the doctor with the lowest active queue workload.
        doctor_workloads = []

        for doctor in available_doctors:
            cursor.execute("""
                SELECT COUNT(*) AS active_count
                FROM patients p
                JOIN queue q ON q.patient_id = p.patient_id
                WHERE p.doctor_id = %s
                  AND DATE(p.registered_at) = CURDATE()
                  AND q.status IN ('waiting', 'consulting')
            """, (doctor["doctor_id"],))

            workload = int(cursor.fetchone()["active_count"] or 0)

            doctor_workloads.append((
                workload,
                doctor["doctor_id"],
                doctor
            ))

        doctor_workloads.sort(key=lambda item: (item[0], item[1]))
        selected_doctor = doctor_workloads[0][2]

        # Generate the same age groups used by the frontend.
        age = int(appointment["age"])

        if age <= 17:
            age_group = "Pediatric (0-17)"
        elif age <= 35:
            age_group = "Young Adult (18-35)"
        elif age <= 60:
            age_group = "Adult (36-60)"
        else:
            age_group = "Senior (61+)"

        triage_category = "Non-urgent"

        # Use the exact feature format expected by the trained model.
        prediction_input = pd.DataFrame([{
            "AgeGroup": age_group,
            "Department": department,
            "AppointmentType": "New Patient",
            "ArrivalMethod": "Scheduled",
            "TriageCategory": triage_category,
            "FacilityOccupancyRate": 0.30,
            "ProvidersOnShift": 1,
            "NursesOnShift": 2,
            "StaffToPatientRatio": 0.5,
            "ArrivalHour": now.hour,
            "DayOfWeek": now.strftime("%a"),
            "IsWeekend": now.weekday() >= 5,
            "Month": now.strftime("%b")
        }])

        prediction = model.predict(prediction_input)[0]
        predicted_wait_time = max(0, round(float(prediction)))

        # Generate a patient token using the existing token convention.
        cursor.execute("""
            SELECT COALESCE(
                MAX(CAST(SUBSTRING(token, 2) AS UNSIGNED)),
                0
            ) AS last_number
            FROM patients
            WHERE token REGEXP '^T[0-9]+$'
        """)

        last_number = int(cursor.fetchone()["last_number"] or 0)
        token = f"T{last_number + 1:03d}"

        # Create the patient record.
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
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s,
                'waiting', 0, %s
            )
        """, (
            token,
            appointment["patient_name"],
            age,
            appointment["phone"],
            appointment["condition_name"],
            selected_doctor["doctor_id"],
            department,
            triage_category,
            predicted_wait_time,
            now
        ))

        patient_id = cursor.lastrowid

        # Use the existing queue priority convention.
        cursor.execute("""
            INSERT INTO queue (
                patient_id,
                token,
                priority,
                queue_position,
                status,
                predicted_wait_time
            )
            VALUES (%s, %s, 5, 1, 'waiting', %s)
        """, (
            patient_id,
            token,
            predicted_wait_time
        ))

        # Link the appointment to its patient and assigned doctor.
        cursor.execute("""
            UPDATE appointments
            SET status = 'checked_in',
                doctor_id = %s,
                patient_id = %s
            WHERE appointment_id = %s
              AND status = 'booked'
              AND patient_id IS NULL
        """, (
            selected_doctor["doctor_id"],
            patient_id,
            appointment_id
        ))

        if cursor.rowcount != 1:
            raise Exception("Appointment status could not be updated.")

        connection.commit()

        return jsonify({
            "message": "Appointment checked in successfully.",
            "appointment_id": appointment_id,
            "booking_ref": appointment["booking_ref"],
            "patient_id": patient_id,
            "token": token,
            "doctor_id": selected_doctor["doctor_id"],
            "doctor_name": selected_doctor["doctor_name"],
            "department": department,
            "predicted_wait_time": predicted_wait_time,
            "status": "checked_in"
        }), 200

    except Exception as error:
        if connection:
            connection.rollback()

        print("APPOINTMENT CHECK-IN ERROR:", error)

        return jsonify({
            "error": "Unable to check in appointment."
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

    # Historical average consultation duration by department.
    # These values come directly from the hospital dataset.
    cursor.execute("""
        SELECT
            Department,
            AVG(ConsultationDurationTime) AS avg_duration
        FROM hospital_wait_data
        WHERE ConsultationDurationTime IS NOT NULL
          AND ConsultationDurationTime > 0
        GROUP BY Department
    """)

    department_service_times = {
        row["Department"]: max(1, round(float(row["avg_duration"])))
        for row in cursor.fetchall()
        if row["Department"]
    }

    default_service_time = 20

    # Build an independent live queue for each doctor and department.
    # A doctor's patients must never affect another doctor's ETA.
    doctor_queue_state = {}

    for row in rows:
        department = row["department"] or "General"
        doctor_key = (department, row["doctor_id"])

        if doctor_key not in doctor_queue_state:
            doctor_queue_state[doctor_key] = {
                "consulting_remaining": 0,
                "consulting_remaining_seconds": 0,
                "waiting": []
            }

        state = doctor_queue_state[doctor_key]

        service_time = department_service_times.get(
            department,
            default_service_time
        )

        if row["status"] == "consulting":
            remaining = service_time

            if row["consulting_started_at"]:
                cursor.execute(
                    """
                    SELECT GREATEST(
                        0,
                        %s * 60 - TIMESTAMPDIFF(
                            SECOND,
                            %s,
                            NOW()
                        )
                    ) AS remaining_seconds
                    """,
                    (service_time, row["consulting_started_at"])
                )

                remaining_seconds = int(
                    cursor.fetchone()["remaining_seconds"]
                )

                remaining = (
                    remaining_seconds + 59
                ) // 60

            row["queue_position"] = 0
            row["live_eta_minutes"] = remaining
            row["live_eta_seconds"] = remaining_seconds

            state["consulting_remaining"] = max(state["consulting_remaining"], service_time)
            state["consulting_remaining_seconds"] = max(state["consulting_remaining_seconds"], service_time * 60)

        else:
            state["waiting"].append(row)

    # Calculate waiting positions and live wait after the
    # current consultation is known for every department.
    waiting_count = 0
    result = []

    for row in rows:
        department = row["department"] or "General"
        doctor_key = (department, row["doctor_id"])
        state = doctor_queue_state[doctor_key]

        if row["status"] == "waiting":
            waiting_count += 1

            waiting_rows = state["waiting"]
            position = waiting_rows.index(row) + 1

            row["queue_position"] = position

            # Live Wait means time until consultation STARTS.
            # The first waiting patient waits only for the
            # current consultation to finish. If no one is
            # consulting, their wait is zero.
            prior_wait = state["consulting_remaining"]
            prior_wait_seconds = state["consulting_remaining_seconds"]

            for prior_row in waiting_rows[:position - 1]:
                prior_service_time = department_service_times.get(
                    prior_row["department"] or "General",
                    default_service_time
                )
                prior_wait += prior_service_time
                prior_wait_seconds += prior_service_time * 60

            row["live_eta_minutes"] = prior_wait
            row["live_eta_seconds"] = prior_wait_seconds

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
        "service_time_minutes": department_service_times,
        "default_service_time_minutes": default_service_time
    })


@app.route("/queue/call-next", methods=["POST"])
def call_next_patient():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        request_data = request.get_json(silent=True) or {}
        department = request_data.get("department", "all")

        query = """
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
        """

        params = []

        if department and department != "all":
            query += " AND p.department = %s"
            params.append(department)

        query += """
            ORDER BY
                q.priority ASC,
                q.added_at ASC,
                q.queue_id ASC
            LIMIT 1
        """

        cursor.execute(query, tuple(params))

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
            "message": str(error),
            "mysql_error_code": error.errno
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
            SET status = 'completed',
                completed_at = NOW()
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
            "message": str(error),
            "mysql_error_code": error.errno
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
            SELECT
                p.department,
                COALESCE(
                    MAX(q.added_at),
                    NOW()
                ) AS last_added_at
            FROM queue q
            JOIN patients p
                ON q.patient_id = p.patient_id
            WHERE DATE(p.registered_at) = CURDATE()
              AND q.status = 'waiting'
              AND p.department = (
                  SELECT department
                  FROM patients
                  WHERE patient_id = %s
              )
              AND q.queue_id <> %s
        """, (patient_id, patient["queue_id"]))

        row = cursor.fetchone()
        last_added_at = row["last_added_at"]

        cursor.execute("""
            UPDATE queue
            SET added_at = DATE_ADD(%s, INTERVAL 1 SECOND)
            WHERE queue_id = %s
        """, (last_added_at, patient["queue_id"]))

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
            "message": str(error),
            "mysql_error_code": error.errno
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
            "message": str(error),
            "mysql_error_code": error.errno
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

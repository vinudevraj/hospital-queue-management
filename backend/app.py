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
            for hour in range(6, 18)
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
            row["date"].strftime("%a"): {
                "patients": int(row["patients"]),
                "efficiency": int(row["efficiency"] or 0)
            }
            for row in weekly_rows
        }

        weekly_trend = [
            {
                "day": day,
                "patients": weekly_counts.get(
                    day,
                    {"patients": 0, "efficiency": 0}
                )["patients"],
                "efficiency": weekly_counts.get(
                    day,
                    {"patients": 0, "efficiency": 0}
                )["efficiency"]
            }
            for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        ]

        cursor.execute("""
            SELECT
                CASE
                    WHEN ConsultationDurationTime < 10 THEN '< 10 min'
                    WHEN ConsultationDurationTime < 15 THEN '10–15 min'
                    WHEN ConsultationDurationTime < 20 THEN '15–20 min'
                    ELSE '> 20 min'
                END AS duration_range,
                COUNT(*) AS count
            FROM hospital_wait_data
            GROUP BY duration_range
            ORDER BY
                CASE duration_range
                    WHEN '< 10 min' THEN 1
                    WHEN '10–15 min' THEN 2
                    WHEN '15–20 min' THEN 3
                    ELSE 4
                END
        """)
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
                ORDER BY
                    q.priority ASC,
                    q.added_at ASC,
                    q.queue_id ASC
            """, (patient["department"],))

            department_rows = cursor.fetchall()

            consulting_remaining = 0
            waiting_rows = []

            service_time = department_service_times.get(
                patient["department"] or "General",
                default_service_time
            )

            for row in department_rows:
                if row["status"] == "consulting":
                    remaining = service_time

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

                    consulting_remaining = max(
                        consulting_remaining,
                        remaining
                    )

                elif row["status"] == "waiting":
                    waiting_rows.append(row)

            if patient["queue_status"] == "consulting":
                queue_position = 0
                live_eta_minutes = consulting_remaining

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

                    for prior_row in waiting_rows[:matching_index]:
                        prior_service_time = department_service_times.get(
                            prior_row["department"] or "General",
                            default_service_time
                        )
                        live_eta_minutes += prior_service_time

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

        doctor_department = str(doctor["department"]).strip()
        selected_department = str(data["department"]).strip()

        if doctor_department.lower() != selected_department.lower():
            return jsonify({
                "error": "Doctor does not belong to selected department",
                "doctor_id": doctor["doctor_id"],
                "doctor_department": doctor_department,
                "selected_department": selected_department
            }), 400

        data["department"] = doctor_department

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

    # Build live queue state independently for each department.
    # The current consultation is determined first so that its
    # remaining time is always included for waiting patients,
    # regardless of queue priority ordering.
    department_state = {}

    for row in rows:
        department = row["department"] or "General"

        if department not in department_state:
            department_state[department] = {
                "consulting_remaining": 0,
                "waiting": []
            }

        state = department_state[department]

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

            state["consulting_remaining"] = max(
                state["consulting_remaining"],
                remaining
            )

        else:
            state["waiting"].append(row)

    # Calculate waiting positions and live wait after the
    # current consultation is known for every department.
    waiting_count = 0
    result = []

    for row in rows:
        department = row["department"] or "General"
        state = department_state[department]

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

            for prior_row in waiting_rows[:position - 1]:
                prior_service_time = department_service_times.get(
                    prior_row["department"] or "General",
                    default_service_time
                )
                prior_wait += prior_service_time

            row["live_eta_minutes"] = prior_wait

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

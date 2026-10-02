import pandas as pd
import mysql.connector


CSV_FILE = "Hospital Wait  TIme Data.csv"


DEPARTMENT_DOCTORS = {
    "Orthopedics": "DR1",
    "Cardiology": "DR2",
    "General Surgery": "DR3",
    "Emergency": "DR4",
    "Radiology": "DR5",
    "Obstetrics": "DR6",
    "Neurology": "DR7",
    "Oncology": "DR8",
    "Pediatrics": "DR9",
    "Internal Medicine": "DR10"
}


TRIAGE_PRIORITY = {
    "Emergency": 1,
    "Immediate": 2,
    "Urgent": 3,
    "Semi-urgent": 4,
    "Non-urgent": 5
}


def get_age(age_group):
    mapping = {
        "Child (0-17)": 10,
        "Young Adult (18-35)": 25,
        "Adult (36-60)": 45,
        "Senior (61+)": 70
    }

    return mapping.get(age_group, 30)


def main():

    print("Loading CSV...")

    df = pd.read_csv(CSV_FILE)

    print(f"CSV records: {len(df)}")

    connection = mysql.connector.connect(
        host="127.0.0.1",
        user="hospital_app",
        password="HospitalApp@2026",
        database="hospital_queue"
    )

    cursor = connection.cursor()

    print("Clearing existing patient and queue records...")

    cursor.execute("DELETE FROM queue")
    cursor.execute("DELETE FROM patients")

    inserted = 0

    for index, row in df.iterrows():

        department = row["Department"]

        doctor_id = DEPARTMENT_DOCTORS.get(department)

        if not doctor_id:
            continue

        triage = row["TriageCategory"]

        priority = TRIAGE_PRIORITY.get(triage, 5)

        wait_time = round(float(row["TriageToProviderStartTime"]))

        token = f"T{index + 1:04d}"

        age = get_age(row["AgeGroup"])

        is_emergency = 1 if triage in ["Emergency", "Immediate"] else 0

        patient_name = f"CSV Patient {index + 1}"

        condition = str(row["ReasonForVisit"])

        if condition == "nan":
            condition = "General"

        cursor.execute("""
            INSERT INTO patients (
                token,
                patient_name,
                age,
                gender,
                phone,
                condition_name,
                doctor_id,
                department,
                triage_category,
                predicted_wait_time,
                status,
                is_emergency
            )
            VALUES (
                %s, %s, %s, NULL, NULL, %s, %s, %s,
                %s, %s, 'waiting', %s
            )
        """, (
            token,
            patient_name,
            age,
            condition,
            doctor_id,
            department,
            triage,
            wait_time,
            is_emergency
        ))

        patient_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO queue (
                patient_id,
                token,
                priority,
                queue_position,
                status,
                predicted_wait_time
            )
            VALUES (
                %s, %s, %s, %s, 'waiting', %s
            )
        """, (
            patient_id,
            token,
            priority,
            index + 1,
            wait_time
        ))

        inserted += 1

    connection.commit()

    cursor.close()
    connection.close()

    print(f"Successfully imported: {inserted} patients")


if __name__ == "__main__":
    main()

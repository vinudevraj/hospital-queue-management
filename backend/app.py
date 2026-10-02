from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os


app = Flask(__name__)
CORS(app)


MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "ml",
    "wait_time_model.pkl"
)

model = joblib.load(MODEL_PATH)


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


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )

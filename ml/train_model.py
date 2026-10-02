import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


DATA_FILE = "Hospital Wait  TIme Data.csv"

FEATURES = [
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

TARGET = "TriageToProviderStartTime"


df = pd.read_csv(DATA_FILE)

X = df[FEATURES]
y = df[TARGET]

categorical_features = [
    "AgeGroup",
    "Department",
    "AppointmentType",
    "ArrivalMethod",
    "TriageCategory",
    "DayOfWeek",
    "IsWeekend",
    "Month"
]

numeric_features = [
    "FacilityOccupancyRate",
    "ProvidersOnShift",
    "NursesOnShift",
    "StaffToPatientRatio",
    "ArrivalHour"
]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OneHotEncoder(handle_unknown="ignore"))
            ]),
            categorical_features
        ),
        (
            "numeric",
            Pipeline([
                ("imputer", SimpleImputer(strategy="median"))
            ]),
            numeric_features
        )
    ]
)


models = {
    "Linear Regression": LinearRegression(),
    "Decision Tree": DecisionTreeRegressor(
        random_state=42,
        max_depth=10
    ),
    "Random Forest": RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        n_jobs=-1
    )
}


X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)


results = {}
trained_pipelines = {}


for name, model in models.items():

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", model)
    ])

    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    rmse = mean_squared_error(y_test, predictions) ** 0.5
    r2 = r2_score(y_test, predictions)

    results[name] = {
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2
    }

    trained_pipelines[name] = pipeline


print("\nModel Results")
print("=" * 60)

for name, metrics in results.items():
    print(f"\n{name}")
    print(f"MAE  : {metrics['MAE']:.2f} minutes")
    print(f"RMSE : {metrics['RMSE']:.2f} minutes")
    print(f"R²   : {metrics['R2']:.4f}")


best_model_name = min(
    results,
    key=lambda name: results[name]["MAE"]
)

best_model = trained_pipelines[best_model_name]

joblib.dump(best_model, "ml/wait_time_model.pkl")

print("\n" + "=" * 60)
print(f"Selected Model: {best_model_name}")
print("Saved Model: ml/wait_time_model.pkl")

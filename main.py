import os
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from flask import Flask, request, jsonify
from flask_cors import CORS

from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.neighbors import KNeighborsRegressor, KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import (
    r2_score, mean_absolute_error, mean_squared_error,
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
)

# ================================
# Load Dataset
# ================================

data_path = os.path.join(os.getcwd(), "insurance.csv")
df = pd.read_csv(data_path)

if "expenses" in df.columns and "charges" not in df.columns:
    df = df.rename(columns={"expenses": "charges"})

print("Shape:", df.shape)
print("\nData Types:")
print(df.dtypes)
print("\nNull Values:")
print(df.isnull().sum())
print("\nDuplicate Rows:", df.duplicated().sum())

# ================================
# Data Cleaning
# ================================

df_clean = df.copy()

df_clean = df_clean.drop_duplicates().reset_index(drop=True)

def remove_outliers_iqr(dataframe, column_name):
    q1 = dataframe[column_name].quantile(0.25)
    q3 = dataframe[column_name].quantile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    return dataframe[(dataframe[column_name] >= lower_bound) & 
                     (dataframe[column_name] <= upper_bound)]

df_clean = remove_outliers_iqr(df_clean, "bmi")
df_clean = remove_outliers_iqr(df_clean, "charges")
df_clean = df_clean.reset_index(drop=True)

print("Cleaned Data Shape:", df_clean.shape)

# ================================
# EDA
# ================================

plt.figure()
sns.histplot(df_clean["charges"], kde=True)
plt.title("Distribution of Charges")
plt.show()

plt.figure()
sns.scatterplot(data=df_clean, x="age", y="charges")
plt.title("Age vs Charges")
plt.show()

plt.figure()
sns.boxplot(data=df_clean, x="smoker", y="charges")
plt.title("Smoker vs Charges")
plt.show()

# ================================
# Feature Engineering
# ================================

df_model = df_clean.copy()
risk_threshold = df_model["charges"].median()
df_model["high_risk"] = (df_model["charges"] > risk_threshold).astype(int)

X = df_model.drop(columns=["charges", "high_risk"])
y_reg = df_model["charges"]
y_clf = df_model["high_risk"]

X_encoded = pd.get_dummies(X, columns=["sex", "smoker", "region"], drop_first=True)

numeric_columns = ["age", "bmi", "children"]

scaler = StandardScaler()
X_processed = X_encoded.copy()
X_processed[numeric_columns] = scaler.fit_transform(X_processed[numeric_columns])

feature_columns = X_processed.columns.tolist()

# ================================
# Train-Test Split
# ================================

X_train_reg, X_test_reg, y_train_reg, y_test_reg = train_test_split(
    X_processed, y_reg, test_size=0.2, random_state=200
)

X_train_clf, X_test_clf, y_train_clf, y_test_clf = train_test_split(
    X_processed, y_clf, test_size=0.2, random_state=200, stratify=y_clf
)

# ================================
# Model Training
# ================================

reg_models = {
    "LinearRegression": LinearRegression(),
    "KNeighborsRegressor": KNeighborsRegressor(n_neighbors=5)
}

clf_models = {
    "LogisticRegression": LogisticRegression(max_iter=1000),
    "KNeighborsClassifier": KNeighborsClassifier(n_neighbors=5),
    "GaussianNB": GaussianNB()
}

trained_reg_models = {}
trained_clf_models = {}

for name, model in reg_models.items():
    model.fit(X_train_reg, y_train_reg)
    trained_reg_models[name] = model

for name, model in clf_models.items():
    model.fit(X_train_clf, y_train_clf)
    trained_clf_models[name] = model

# ================================
# Regression Evaluation
# ================================

reg_results = []

for name, model in trained_reg_models.items():
    y_pred = model.predict(X_test_reg)
    reg_results.append({
        "Model": name,
        "R2": r2_score(y_test_reg, y_pred),
        "MAE": mean_absolute_error(y_test_reg, y_pred),
        "MSE": mean_squared_error(y_test_reg, y_pred)
    })

reg_results_df = pd.DataFrame(reg_results).sort_values(by="R2", ascending=False)
print(reg_results_df)

# ================================
# Classification Evaluation
# ================================

clf_results = []
conf_matrices = {}

for name, model in trained_clf_models.items():
    y_pred = model.predict(X_test_clf)
    conf_matrices[name] = confusion_matrix(y_test_clf, y_pred)
    clf_results.append({
        "Model": name,
        "Accuracy": accuracy_score(y_test_clf, y_pred),
        "Precision": precision_score(y_test_clf, y_pred, zero_division=0),
        "Recall": recall_score(y_test_clf, y_pred, zero_division=0),
        "F1": f1_score(y_test_clf, y_pred, zero_division=0)
    })

clf_results_df = pd.DataFrame(clf_results).sort_values(by="Accuracy", ascending=False)
print(clf_results_df)

# ================================
# Save Best Models
# ================================

best_reg_model_name = reg_results_df.iloc[0]["Model"]
best_clf_model_name = clf_results_df.iloc[0]["Model"]

best_reg_model = trained_reg_models[best_reg_model_name]
best_clf_model = trained_clf_models[best_clf_model_name]

models_dir = os.path.join(os.getcwd(), "models")
os.makedirs(models_dir, exist_ok=True)

joblib.dump(best_reg_model, os.path.join(models_dir, "best_regression_model.pkl"))
joblib.dump(best_clf_model, os.path.join(models_dir, "best_classification_model.pkl"))
joblib.dump({
    "scaler": scaler,
    "feature_columns": feature_columns,
    "numeric_columns": numeric_columns,
    "risk_threshold": risk_threshold
}, os.path.join(models_dir, "preprocessing_bundle.pkl"))

# ================================
# Prediction Function
# ================================

def predict_new_customer(profile_dict):
    input_df = pd.DataFrame([profile_dict])
    input_encoded = pd.get_dummies(input_df, columns=["sex", "smoker", "region"], drop_first=True)
    input_encoded = input_encoded.reindex(columns=feature_columns, fill_value=0)
    input_encoded[numeric_columns] = scaler.transform(input_encoded[numeric_columns])

    predicted_premium = float(best_reg_model.predict(input_encoded)[0])
    predicted_risk = int(best_clf_model.predict(input_encoded)[0])
    risk_label = "High Risk" if predicted_risk == 1 else "Low Risk"

    result = {
        "Predicted Premium": round(predicted_premium, 2),
        "Risk Class": risk_label
    }
    print(result)
    return result

# ================================
# Sample Prediction
# ================================

sample_customer = {
    "age": 38.5,
    "sex": "male",
    "bmi": 19,
    "children": 3,
    "smoker": "no",
    "region": "northwest"
}

predict_new_customer(sample_customer)

# ================================
# Flask API Server
# ================================

app = Flask(__name__)
CORS(app)

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    required = ["age", "sex", "bmi", "children", "smoker", "region"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    profile = {
        "age": float(data["age"]),
        "sex": data["sex"],
        "bmi": float(data["bmi"]),
        "children": int(data["children"]),
        "smoker": data["smoker"],
        "region": data["region"]
    }
    result = predict_new_customer(profile)
    return jsonify(result)

if __name__ == "__main__":
    print("\n" + "="*50)
    print("Flask API server starting on http://localhost:5000")
    print("="*50)
    app.run(host="0.0.0.0", port=5000, debug=False)
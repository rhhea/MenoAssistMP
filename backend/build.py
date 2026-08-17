"""
WHY WE NEED TO RELABEL IT:
The source dataset only has a binary target: menopause_reached (0/1).
Our app needs 3 classes: pre-menopause / menopause / post-menopause,
matching STRAW+10's staging logic (age, FSH, LH, estradiol trend,
cycle regularity all move together as a woman progresses through the
transition -- see Harlow et al. 2012, STRAW+10 criteria).

METHOD: composite z-scored "menopause progression score"
  score = mean(z(age), z(FSH), z(LH), -z(estradiol), -z(periods_last_12_months))
Higher score = biologically further along the transition (older, higher
FSH/LH, lower estradiol, fewer periods in the last year -- exactly the
STRAW+10 direction of change). We tertile-split this score into 3
labels. This is NOT a hard clinical rule (the source data doesn't have
true amenorrhea-duration data to apply STRAW+10 literally), but it is
a defensible, documented, and citable relabeling methodology -- state
this explicitly in your capstone report's limitations section.
"""

import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder

SOURCE_CSV = "menocare.csv"  # the 1500-row dataset from rhhea/menocaredemo

import os
os.makedirs("outputs", exist_ok=True)
MODEL_OUT = "outputs/menopause_stage_model.joblib"


FEATURE_COLS = [
    "age", "bmi", "smoking_status", "age_at_menarche", "num_pregnancies",
    "FSH_mIU_mL", "LH_mIU_mL", "estradiol_pg_mL", "sleep_hours_avg",
    "exercise_minutes_per_week", "stress_level_1to10", "systolic_bp",
    "vitamin_D_ng_mL", "periods_last_12_months",
]


def relabel_to_stages(df: pd.DataFrame) -> pd.DataFrame:
    z = lambda s: (s - s.mean()) / s.std()
    score = (
        z(df["age"]) + z(df["FSH_mIU_mL"]) + z(df["LH_mIU_mL"])
        - z(df["estradiol_pg_mL"]) - z(df["periods_last_12_months"])
    ) / 5

    q1, q2 = score.quantile([0.33, 0.66])

    def bucket(s):
        if s < q1:
            return "pre-menopause"
        elif s < q2:
            return "menopause"
        return "post-menopause"

    df = df.copy()
    df["stage"] = score.apply(bucket)
    return df


def train():
    df = pd.read_csv(SOURCE_CSV)
    df = relabel_to_stages(df)

    smoke_encoder = LabelEncoder()
    df["smoking_status"] = smoke_encoder.fit_transform(df["smoking_status"])

    X = df[FEATURE_COLS]
    stage_encoder = LabelEncoder()
    y = stage_encoder.fit_transform(df["stage"])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators=400, max_depth=8, min_samples_leaf=3,
        random_state=42, class_weight="balanced",
    )
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)

    print("=== Random Forest -- STRAW+10-inspired 3-class stage model ===")
    print(classification_report(y_test, y_pred, target_names=stage_encoder.classes_))
    print("Confusion matrix:")
    print(pd.DataFrame(
        confusion_matrix(y_test, y_pred),
        index=stage_encoder.classes_, columns=stage_encoder.classes_,
    ))
    print("\nFeature importances:")
    for feat, imp in sorted(zip(FEATURE_COLS, clf.feature_importances_), key=lambda x: -x[1]):
        print(f"  {feat:30s} {imp:.3f}")

    # Save everything the Streamlit app needs
    joblib.dump({
        "model": clf,
        "stage_encoder": stage_encoder,
        "smoke_encoder": smoke_encoder,
        "feature_cols": FEATURE_COLS,
        "X_train": X_train, 
    }, MODEL_OUT)
   
    print(f"\nSaved model -> {MODEL_OUT}")
   


if __name__ == "__main__":
    train()
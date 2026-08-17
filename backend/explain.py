"""
Menocare -- Plain-language SHAP explanations
================================================
Turns raw SHAP contribution values into sentences a non-technical user
can read, instead of showing them numbers/charts they'd need a data
science background to interpret.

HOW SHAP WORKS HERE (in short):
For a single prediction, SHAP tells you how much each feature pushed
the model's output UP or DOWN for the predicted class, relative to the
"average" prediction. E.g. "your FSH level pushed the prediction
+0.18 toward post-menopause." We turn that number into: "Your FSH
level is higher than typical, which is a strong signal of
post-menopause."

We do NOT show raw SHAP values to the user -- only the derived
sentences (though a chart is available for anyone who wants it,
e.g. for your capstone report / technical evaluation).

Usage:
    from explain import explain_prediction
    bullets, shap_values = explain_prediction(input_row_df, model, feature_cols, stage_encoder, X_reference)
    for b in bullets:
        print(b)
"""

import numpy as np
import pandas as pd
import shap


FEATURE_INFO = {
    "age": {
        "label": "Age",
        "high_phrase": "your age is on the higher side for this comparison",
        "low_phrase": "your age is on the younger side for this comparison",
    },
    "FSH_mIU_mL": {
        "label": "FSH level",
        "high_phrase": "your FSH (follicle-stimulating hormone) level is elevated, which typically rises as ovarian function declines",
        "low_phrase": "your FSH level is relatively low, typical of active reproductive function",
    },
    "LH_mIU_mL": {
        "label": "LH level",
        "high_phrase": "your LH (luteinizing hormone) level is elevated, another marker that tends to rise through the menopause transition",
        "low_phrase": "your LH level is relatively low",
    },
    "estradiol_pg_mL": {
        "label": "Estradiol level",
        "high_phrase": "your estradiol level is relatively high, typical of active reproductive years",
        "low_phrase": "your estradiol level is relatively low, which is common as menopause progresses",
    },
    "periods_last_12_months": {
        "label": "Periods in the last 12 months",
        "high_phrase": "you've had a regular number of periods in the last year",
        "low_phrase": "you've had few or no periods in the last year",
    },
    "bmi": {
        "label": "BMI",
        "high_phrase": "your BMI is on the higher side",
        "low_phrase": "your BMI is on the lower side",
    },
    "sleep_hours_avg": {
        "label": "Average sleep",
        "high_phrase": "you're getting more sleep on average",
        "low_phrase": "you're getting less sleep on average, which can be affected by hormonal changes",
    },
    "stress_level_1to10": {
        "label": "Stress level",
        "high_phrase": "your reported stress level is high",
        "low_phrase": "your reported stress level is low",
    },
    "exercise_minutes_per_week": {
        "label": "Exercise",
        "high_phrase": "you're getting a good amount of weekly exercise",
        "low_phrase": "your weekly exercise is on the lower side",
    },
    "vitamin_D_ng_mL": {
        "label": "Vitamin D",
        "high_phrase": "your vitamin D level is on the higher side",
        "low_phrase": "your vitamin D level is on the lower side",
    },
    "systolic_bp": {
        "label": "Blood pressure",
        "high_phrase": "your systolic blood pressure is on the higher side",
        "low_phrase": "your systolic blood pressure is on the lower side",
    },
    "age_at_menarche": {
        "label": "Age at first period",
        "high_phrase": "you started menstruating relatively later",
        "low_phrase": "you started menstruating relatively earlier",
    },
    "num_pregnancies": {
        "label": "Number of pregnancies",
        "high_phrase": "you've had more pregnancies",
        "low_phrase": "you've had fewer pregnancies",
    },
    "smoking_status": {
        "label": "Smoking status",
        "high_phrase": "your smoking history",
        "low_phrase": "your smoking history",
    },
}


def explain_prediction(input_row: pd.DataFrame, model, feature_cols, stage_encoder,
                        X_reference: pd.DataFrame, top_n: int = 4):
    """
    input_row      : single-row DataFrame with the user's feature values
    model           : trained RandomForestClassifier
    feature_cols    : list of feature column names, same order as training
    stage_encoder   : the LabelEncoder used for the stage labels
    X_reference     : the training feature set (used so SHAP knows what
                       "typical" values look like -- pass your X_train)
    top_n           : how many top contributing factors to explain

    Returns: (bullets, shap_values_for_predicted_class)
        bullets -- list of plain-English strings
    """
    explainer = shap.TreeExplainer(model, X_reference)
    shap_values = explainer.shap_values(input_row[feature_cols])

    pred_idx = model.predict(input_row[feature_cols])[0]
    pred_stage = stage_encoder.inverse_transform([pred_idx])[0]

    contribs = shap_values[0, :, pred_idx]

    order = np.argsort(-np.abs(contribs))[:top_n]

    bullets = [f"The model predicted **{pred_stage.title()}**. Here's why, in plain terms:"]
    for i in order:
        feat = feature_cols[i]
        contrib = contribs[i]
        info = FEATURE_INFO.get(feat, {"label": feat, "high_phrase": f"{feat} is high", "low_phrase": f"{feat} is low"})

        user_val = input_row[feat].values[0]
        ref_mean = X_reference[feat].mean()
        direction_phrase = info["high_phrase"] if user_val >= ref_mean else info["low_phrase"]

        pushed = "supported" if contrib > 0 else "worked against"
        strength = "strongly" if abs(contrib) > np.abs(contribs).mean() * 1.5 else "somewhat"

        sentence_start = direction_phrase[0].upper() + direction_phrase[1:]
        bullets.append(
            f"- **{info['label']}**: {sentence_start}. "
            f"This {strength} {pushed} the '{pred_stage.title()}' prediction."
        )

    return bullets, contribs
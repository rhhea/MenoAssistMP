"""
Menocare -- Streamlit demo frontend
=======================================
Temporary UI for testing the prediction model end-to-end before the
React rebuild. Run with:  streamlit run app.py

Loads menopause_stage_model.joblib (trained by train_model.py) and
exposes a form matching the "Fill Basic Form" -> "Capture Health
Metrics" + "Capture Mood Inputs" -> "Classify User Stage" flow from
the architecture diagram, followed by stubbed Diet/Exercise module
recommendations for the predicted stage.
"""

import streamlit as st
import pandas as pd
import joblib
from explain import explain_prediction

st.set_page_config(page_title="Menocare", page_icon="🌸", layout="centered")

MODEL_PATH = "outputs/menopause_stage_model.joblib"


@st.cache_resource
def load_model():
    return joblib.load(MODEL_PATH)


bundle = load_model()
model = bundle["model"]
stage_encoder = bundle["stage_encoder"]
smoke_encoder = bundle["smoke_encoder"]
feature_cols = bundle["feature_cols"]
X_train_ref = bundle["X_train"]

st.title("🌸 Menocare")
st.caption("Menopause stage prediction -- demo (Streamlit placeholder for the React frontend)")

# ---------------------------------------------------------------
# BASIC FORM + HEALTH METRICS  (mirrors the flowchart's "Fill Basic
# Form" -> "Capture Health Metrics" / "Capture Mood Inputs" steps)
# ---------------------------------------------------------------
st.header("Basic Form")

col1, col2 = st.columns(2)
with col1:
    age = st.number_input("Age", min_value=30, max_value=70, value=50)
    bmi = st.number_input("BMI", min_value=15.0, max_value=45.0, value=25.0, step=0.1)
    age_at_menarche = st.number_input("Age at menarche (first period)", min_value=8, max_value=18, value=12)
    num_pregnancies = st.number_input("Number of pregnancies", min_value=0, max_value=10, value=1)
    smoking_status = st.selectbox("Smoking status", options=list(smoke_encoder.classes_))
with col2:
    periods_last_12_months = st.slider("Periods in the last 12 months", 0, 13, 6)
    sleep_hours_avg = st.slider("Average sleep (hours/night)", 3.0, 10.0, 7.0, 0.5)
    exercise_minutes_per_week = st.slider("Exercise (minutes/week)", 0, 400, 120, 10)
    stress_level_1to10 = st.slider("Stress level (1-10)", 1, 10, 5)
    systolic_bp = st.number_input("Systolic BP", min_value=80, max_value=200, value=120)

st.header("Health Metrics (lab values, optional but improves accuracy)")
col3, col4, col5 = st.columns(3)
with col3:
    fsh = st.number_input("FSH (mIU/mL)", min_value=0.0, max_value=150.0, value=30.0)
with col4:
    lh = st.number_input("LH (mIU/mL)", min_value=0.0, max_value=100.0, value=25.0)
with col5:
    estradiol = st.number_input("Estradiol (pg/mL)", min_value=0.0, max_value=250.0, value=70.0)

vitamin_d = st.number_input("Vitamin D (ng/mL)", min_value=0.0, max_value=100.0, value=30.0)

# ---------------------------------------------------------------
# CLASSIFY USER STAGE
# ---------------------------------------------------------------
if st.button("Predict My Stage", type="primary"):
    row = {
        "age": age,
        "bmi": bmi,
        "smoking_status": smoke_encoder.transform([smoking_status])[0],
        "age_at_menarche": age_at_menarche,
        "num_pregnancies": num_pregnancies,
        "FSH_mIU_mL": fsh,
        "LH_mIU_mL": lh,
        "estradiol_pg_mL": estradiol,
        "sleep_hours_avg": sleep_hours_avg,
        "exercise_minutes_per_week": exercise_minutes_per_week,
        "stress_level_1to10": stress_level_1to10,
        "systolic_bp": systolic_bp,
        "vitamin_D_ng_mL": vitamin_d,
        "periods_last_12_months": periods_last_12_months,
    }
    X = pd.DataFrame([row])[feature_cols]

    pred_idx = model.predict(X)[0]
    pred_stage = stage_encoder.inverse_transform([pred_idx])[0]
    proba = model.predict_proba(X)[0]

    st.divider()
    st.subheader(f"Predicted stage: **{pred_stage.title()}**")

    proba_df = pd.DataFrame({
        "Stage": stage_encoder.classes_,
        "Probability": proba,
    }).sort_values("Probability", ascending=False)
    st.bar_chart(proba_df.set_index("Stage"))

    # -----------------------------------------------------------
    # WHY? -- SHAP-based plain-language explanation
    # -----------------------------------------------------------
    st.subheader("🔍 Why this prediction?")
    with st.spinner("Working out the reasoning..."):
        bullets, _ = explain_prediction(X, model, feature_cols, stage_encoder, X_train_ref, top_n=4)
    for b in bullets:
        st.markdown(b)

    # -----------------------------------------------------------
    # DIET MODULE  (Select Diet Plan -> stage-specific plan)
    # -----------------------------------------------------------
    st.header("🥗 Diet Module")
    diet_plans = {
        "pre-menopause": ("Balanced Diet Plan",
            "Focus on steady blood sugar: whole grains, lean protein, "
            "plenty of fiber. Maintain iron intake to support regular cycles."),
        "menopause": ("Hormone-supportive Diet Plan",
            "Add phytoestrogen-rich foods (flaxseed, soy), calcium + vitamin D "
            "for bone density, and omega-3s to help manage hot flashes and mood swings."),
        "post-menopause": ("Weight-management Diet Plan",
            "Prioritize protein (aim ~25-30g/meal) to preserve muscle mass, "
            "watch refined carbs as metabolism slows, and keep calcium/vitamin D high for bone health."),
    }
    plan_name, plan_detail = diet_plans[pred_stage]
    st.markdown(f"**{plan_name}**")
    st.write(plan_detail)

    # -----------------------------------------------------------
    # EXERCISE MODULE (Generate Exercise Recommendations)
    # -----------------------------------------------------------
    st.header("🏃 Exercise Module")
    exercise_plans = {
        "pre-menopause": "Mix of cardio and strength training, 150 min/week moderate activity.",
        "menopause": "Low-impact cardio (walking, swimming) + light strength training to ease joint stress and support mood.",
        "post-menopause": "Prioritize strength and bone-health routines (resistance training, weight-bearing exercise) to counter bone density loss.",
    }
    st.write(exercise_plans[pred_stage])

    if stress_level_1to10 >= 7:
        st.info("Your reported stress level is high -- consider pairing exercise with relaxation practices (yoga, breathing exercises).")

st.divider()
st.caption(
    "⚠️ This is a demo prediction tool trained on a reference dataset, not a diagnostic device. "
    "Consult a doctor for actual menopause staging and treatment decisions."
)
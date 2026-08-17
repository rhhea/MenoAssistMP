"""
Menocare -- FastAPI backend
============================
Wraps outputs/menopause_stage_model.joblib (trained by build.py)
behind a REST API so the React frontend can call it directly instead
of the Streamlit form.

Also exposes /diet-exercise-plan, which generates a Gemini-backed diet
and exercise plan for a given (stage, diet_type) pair -- see
diet_exercise.py for how/why that module differs from the RF stage
model (LLM guidance vs. trained classifier).

Run with:  uvicorn main:app --reload --port 8000
"""

import joblib
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from explain import explain_prediction
from diet_exercise import DietExercisePlan, DietExerciseRequest, GeminiPlanError, generate_diet_exercise_plan

load_dotenv()  # reads GEMINI_API_KEY / GEMINI_MODEL from a local .env file

MODEL_PATH = "outputs/menopause_stage_model.joblib"

app = FastAPI(title="Menocare API")

# Allow the React dev server (Vite default: 5173, CRA default: 3000)
# to call this API. Add your deployed frontend's origin here too.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

bundle = joblib.load(MODEL_PATH)
model = bundle["model"]
stage_encoder = bundle["stage_encoder"]
smoke_encoder = bundle["smoke_encoder"]
feature_cols = bundle["feature_cols"]
X_train_ref = bundle["X_train"]


class AssessmentInput(BaseModel):
    age: int = Field(..., ge=30, le=70)
    bmi: float = Field(..., ge=15, le=45)
    smoking_status: str  # must match one of smoke_encoder.classes_
    age_at_menarche: int = Field(..., ge=8, le=18)
    num_pregnancies: int = Field(..., ge=0, le=10)
    FSH_mIU_mL: float = Field(..., ge=0, le=150)
    LH_mIU_mL: float = Field(..., ge=0, le=100)
    estradiol_pg_mL: float = Field(..., ge=0, le=250)
    sleep_hours_avg: float = Field(..., ge=3, le=10)
    exercise_minutes_per_week: int = Field(..., ge=0, le=400)
    stress_level_1to10: int = Field(..., ge=1, le=10)
    systolic_bp: int = Field(..., ge=80, le=200)
    vitamin_D_ng_mL: float = Field(..., ge=0, le=100)
    periods_last_12_months: int = Field(..., ge=0, le=13)


class PredictionOutput(BaseModel):
    stage: str
    probabilities: dict[str, float]
    explanation: list[str]


def _clean_bullet(text: str) -> str:
    """explain_prediction() returns markdown-styled bullets ("- **Label**: ...")
    meant for a markdown renderer (e.g. Streamlit). The React frontend renders
    plain <p> tags, so strip the markdown here rather than changing explain.py."""
    text = text.replace("**", "")
    if text.startswith("- "):
        text = text[2:]
    return text.strip()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionOutput)
def predict(payload: AssessmentInput):
    if payload.smoking_status not in smoke_encoder.classes_:
        raise HTTPException(
            status_code=422,
            detail=f"smoking_status must be one of {list(smoke_encoder.classes_)}",
        )

    row = payload.model_dump()
    row["smoking_status"] = smoke_encoder.transform([row["smoking_status"]])[0]
    X = pd.DataFrame([row])[feature_cols]

    pred_idx = model.predict(X)[0]
    pred_stage = stage_encoder.inverse_transform([pred_idx])[0]
    proba = model.predict_proba(X)[0]

    bullets, _ = explain_prediction(X, model, feature_cols, stage_encoder, X_train_ref, top_n=3)
    # bullets[0] is a summary line ("The model predicted **X**...") --
    # the frontend already shows a "Why this prediction?" heading, so skip it.
    explanation = [_clean_bullet(b) for b in bullets[1:]]

    return PredictionOutput(
        stage=pred_stage,
        probabilities={cls: float(p) for cls, p in zip(stage_encoder.classes_, proba)},
        explanation=explanation,
    )


@app.post("/diet-exercise-plan", response_model=DietExercisePlan)
def diet_exercise_plan(payload: DietExerciseRequest):
    try:
        return generate_diet_exercise_plan(payload)
    except GeminiPlanError as e:
        raise HTTPException(status_code=502, detail=str(e))
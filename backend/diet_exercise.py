"""
Menocare -- Diet & Exercise plan module
=========================================
Generates a personalized nutrient-target + diet + exercise plan using the
Gemini API, conditioned on:
  - the predicted menopause stage (from menopause_stage_model.joblib)
  - the user's dietary preference (vegetarian / non-vegetarian / vegan)
  - light context (age, bmi, exercise level, stress, sleep) already
    collected in the main assessment, so the plan doesn't contradict it

WHY GEMINI HERE AND NOT A TRAINED MODEL:
Unlike the stage classifier, we have no ground-truth dataset linking
(stage, diet_type, ...) -> real nutrient outcomes, and building a
believable synthetic one is more fragile than just asking a capable LLM
to reason over well-established nutrition guidance (RDA-type targets,
menopause-specific literature on calcium/vitamin D/omega-3, and
diet-type adjustments for vegan/vegetarian bioavailability). We ask
Gemini for STRUCTURED JSON (responseSchema) so the output is exactly as
parseable as a model's .predict() would be -- no free-text scraping.

State this explicitly in your capstone report: the stage model is a
trained RandomForestClassifier on real (relabeled) data; the diet/
exercise module is LLM-generated guidance, not a trained predictive
model, and should be presented/labelled as such to the user.
"""

import json
import os
from typing import Optional

import requests
from pydantic import BaseModel, Field

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

VALID_DIET_TYPES = {"vegetarian", "non-vegetarian", "vegan"}
VALID_STAGES = {"pre-menopause", "menopause", "post-menopause"}

STAGE_LABELS = {
    "pre-menopause": "Pre-menopause",
    "menopause": "Menopause transition (perimenopause)",
    "post-menopause": "Post-menopause",
}


# ---------------------------------------------------------------
# Request / response contracts
# ---------------------------------------------------------------
class DietExerciseRequest(BaseModel):
    stage: str
    diet_type: str
    age: Optional[int] = None
    bmi: Optional[float] = None
    exercise_minutes_per_week: Optional[int] = None
    stress_level_1to10: Optional[int] = None
    sleep_hours_avg: Optional[float] = None


class NutrientTargets(BaseModel):
    protein_g: float = Field(..., description="Daily protein target in grams")
    calcium_mg: float = Field(..., description="Daily calcium target in mg")
    vitamin_d_iu: float = Field(..., description="Daily vitamin D target in IU")
    iron_mg: float = Field(..., description="Daily iron target in mg")
    omega3_g: float = Field(..., description="Daily omega-3 target in grams")


class DietExercisePlan(BaseModel):
    stage: str
    diet_type: str
    nutrient_targets: NutrientTargets
    diet_summary: str
    diet_tips: list[str]
    exercise_summary: str
    exercise_tips: list[str]
    explanation: list[str]


# ---------------------------------------------------------------
# Gemini structured-output schema (mirrors DietExercisePlan minus
# stage/diet_type, which we already know and re-attach ourselves)
# ---------------------------------------------------------------
_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "nutrient_targets": {
            "type": "OBJECT",
            "properties": {
                "protein_g": {"type": "NUMBER"},
                "calcium_mg": {"type": "NUMBER"},
                "vitamin_d_iu": {"type": "NUMBER"},
                "iron_mg": {"type": "NUMBER"},
                "omega3_g": {"type": "NUMBER"},
            },
            "required": ["protein_g", "calcium_mg", "vitamin_d_iu", "iron_mg", "omega3_g"],
        },
        "diet_summary": {"type": "STRING"},
        "diet_tips": {"type": "ARRAY", "items": {"type": "STRING"}},
        "exercise_summary": {"type": "STRING"},
        "exercise_tips": {"type": "ARRAY", "items": {"type": "STRING"}},
        "explanation": {"type": "ARRAY", "items": {"type": "STRING"}},
    },
    "required": [
        "nutrient_targets",
        "diet_summary",
        "diet_tips",
        "exercise_summary",
        "exercise_tips",
        "explanation",
    ],
}


def _build_prompt(req: DietExerciseRequest) -> str:
    context_bits = []
    if req.age is not None:
        context_bits.append(f"age {req.age}")
    if req.bmi is not None:
        context_bits.append(f"BMI {req.bmi}")
    if req.exercise_minutes_per_week is not None:
        context_bits.append(f"currently exercises {req.exercise_minutes_per_week} min/week")
    if req.stress_level_1to10 is not None:
        context_bits.append(f"stress level {req.stress_level_1to10}/10")
    if req.sleep_hours_avg is not None:
        context_bits.append(f"averages {req.sleep_hours_avg} hours of sleep/night")
    context_str = "; ".join(context_bits) if context_bits else "no additional context provided"

    return f"""You are a nutrition- and exercise-guidance assistant embedded in a
menopause wellness app called MenoAssist. A user has been classified into a
menopause stage by a separate trained model. Generate a personalized diet
and exercise plan for them.

User profile:
- Menopause stage: {STAGE_LABELS.get(req.stage, req.stage)}
- Dietary preference: {req.diet_type}
- Additional context: {context_str}

Requirements:
- Ground nutrient targets in established guidance (RDA-style values),
  adjusted sensibly for menopause stage (e.g. higher calcium/vitamin D in
  menopause transition and post-menopause; iron adjustments as periods
  change; omega-3 emphasis during the menopause transition for mood/hot
  flash support) and for the stated diet type (e.g. vegan iron/omega-3/B12
  considerations given lower bioavailability from plant sources).
- diet_tips: 4-6 concrete, diet-type-appropriate food suggestions (no
  foods that conflict with "{req.diet_type}").
- exercise_tips: 4-6 concrete exercises/activities appropriate for this
  stage (bone health emphasis post-menopause, joint-friendly low-impact
  options during the transition, building strength/cardio base in
  pre-menopause), considering the context given.
- diet_summary / exercise_summary: 1-2 sentence plain-language overview
  each.
- explanation: 3-4 short bullet points in plain language explaining WHY
  these targets/recommendations fit this specific stage and diet type
  (not generic menopause facts -- tie it to the numbers/choices above).
- This is general wellness guidance, not medical advice. Do not include
  disclaimer boilerplate in the text fields themselves -- the app
  displays a standard disclaimer separately.

Respond with JSON matching the provided schema only."""


class GeminiPlanError(Exception):
    pass


def generate_diet_exercise_plan(req: DietExerciseRequest) -> DietExercisePlan:
    if req.stage not in VALID_STAGES:
        raise GeminiPlanError(f"stage must be one of {sorted(VALID_STAGES)}")
    if req.diet_type not in VALID_DIET_TYPES:
        raise GeminiPlanError(f"diet_type must be one of {sorted(VALID_DIET_TYPES)}")
    if not GEMINI_API_KEY:
        raise GeminiPlanError("GEMINI_API_KEY is not set on the server")

    payload = {
        "contents": [{"parts": [{"text": _build_prompt(req)}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": _RESPONSE_SCHEMA,
            "temperature": 0.4,
        },
    }

    try:
        resp = requests.post(
            GEMINI_URL,
            params={"key": GEMINI_API_KEY},
            json=payload,
            timeout=30,
        )
    except requests.RequestException as e:
        raise GeminiPlanError(f"Could not reach Gemini API: {e}") from e

    if resp.status_code != 200:
        raise GeminiPlanError(f"Gemini API error ({resp.status_code}): {resp.text[:500]}")

    data = resp.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise GeminiPlanError(f"Unexpected Gemini response shape: {e}") from e

    try:
        return DietExercisePlan(stage=req.stage, diet_type=req.diet_type, **parsed)
    except Exception as e:
        raise GeminiPlanError(f"Gemini response failed validation: {e}") from e
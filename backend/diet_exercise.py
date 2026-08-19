"""
Menocare -- Diet & Exercise plan module (Groq-backed)
=========================================
Generates a personalized nutrient-target + diet + exercise plan using the
Groq API, conditioned on:
  - the predicted menopause stage (from menopause_stage_model.joblib)
  - the user's dietary preference (vegetarian / non-vegetarian / vegan)
  - light context (age, bmi, exercise level, stress, sleep) already
    collected in the main assessment, so the plan doesn't contradict it

WHY GROQ HERE AND NOT A TRAINED MODEL:
Unlike the stage classifier, we have no ground-truth dataset linking
(stage, diet_type, ...) -> real nutrient outcomes, and building a
believable synthetic one is more fragile than just asking a capable LLM
to reason over well-established nutrition guidance (RDA-type targets,
menopause-specific literature on calcium/vitamin D/omega-3, and
diet-type adjustments for vegan/vegetarian bioavailability). We ask
Groq's Llama model for JSON output (response_format=json_object) plus an
explicit schema in the prompt, then validate it against a Pydantic model
server-side -- so a malformed response fails loudly instead of silently.

State this explicitly in your capstone report: the stage model is a
trained RandomForestClassifier on real (relabeled) data; the diet/
exercise module is LLM-generated guidance, not a trained predictive
model, and should be presented/labelled as such to the user.
"""

import json
import os
from typing import Optional

import requests
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load .env here too (not just in main.py) so this module never depends on
# import order elsewhere in the project. Safe to call more than once.
load_dotenv()

print("GROQ key loaded:", bool(os.environ.get("GROQ_API_KEY")))
print("Looking for .env at:", os.path.abspath(".env"))

# NOTE: set this in your .env as, exactly:
#   GROQ_API_KEY=gsk_your_actual_key_here
# (no quotes, no spaces around the =, and restart the server after editing .env)
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def _get_api_key() -> str:
    # Read at call time, not at import time -- guarantees we always see
    # whatever load_dotenv() most recently put into the environment,
    # regardless of when/where this module was first imported.
    return os.environ.get("GROQ_API_KEY", "")

VALID_DIET_TYPES = {"vegetarian", "non-vegetarian", "vegan"}
VALID_STAGES = {"pre-menopause", "menopause", "post-menopause"}

STAGE_LABELS = {
    "pre-menopause": "Pre-menopause",
    "menopause": "Menopause transition (perimenopause)",
    "post-menopause": "Post-menopause",
}


# ---------------------------------------------------------------
# Request / response contracts (unchanged from the Gemini version --
# main.py's /diet-exercise-plan route doesn't need to know which
# provider is behind this module)
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

    # Groq's json_object mode guarantees *valid* JSON but not a specific
    # shape, so the exact key names/types are spelled out here explicitly
    # (Gemini's responseSchema enforced this server-side; Groq needs it
    # in-prompt, then we validate with Pydantic on our end regardless).
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

Respond with ONLY a JSON object, no markdown fences, no commentary,
matching exactly this shape:
{{
  "nutrient_targets": {{
    "protein_g": <number>,
    "calcium_mg": <number>,
    "vitamin_d_iu": <number>,
    "iron_mg": <number>,
    "omega3_g": <number>
  }},
  "diet_summary": "<string>",
  "diet_tips": ["<string>", "..."],
  "exercise_summary": "<string>",
  "exercise_tips": ["<string>", "..."],
  "explanation": ["<string>", "..."]
}}"""


class PlanGenerationError(Exception):
    pass


# Kept as an alias so existing `except GeminiPlanError` clauses elsewhere
# (e.g. in main.py) don't break if you haven't updated them yet.
GeminiPlanError = PlanGenerationError


def generate_diet_exercise_plan(req: DietExerciseRequest) -> DietExercisePlan:
    if req.stage not in VALID_STAGES:
        raise PlanGenerationError(f"stage must be one of {sorted(VALID_STAGES)}")
    if req.diet_type not in VALID_DIET_TYPES:
        raise PlanGenerationError(f"diet_type must be one of {sorted(VALID_DIET_TYPES)}")
    api_key = _get_api_key()
    if not api_key:
        raise PlanGenerationError("GROQ_API_KEY is not set on the server")

    payload = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": _build_prompt(req)}],
        "response_format": {"type": "json_object"},
        "temperature": 0.4,
    }

    try:
        resp = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
    except requests.RequestException as e:
        raise PlanGenerationError(f"Could not reach Groq API: {e}") from e

    if resp.status_code != 200:
        raise PlanGenerationError(f"Groq API error ({resp.status_code}): {resp.text[:500]}")

    data = resp.json()
    try:
        text = data["choices"][0]["message"]["content"]
        parsed = json.loads(text)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise PlanGenerationError(f"Unexpected Groq response shape: {e}") from e

    try:
        return DietExercisePlan(stage=req.stage, diet_type=req.diet_type, **parsed)
    except Exception as e:
        raise PlanGenerationError(f"Groq response failed validation: {e}") from e
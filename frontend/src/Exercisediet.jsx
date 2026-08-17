import React, { useState } from "react";
import {
  Salad,
  Dumbbell,
  Sparkles,
  Leaf,
  Drumstick,
  Wheat,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

/* ---------------------------------------------------------------
   Standalone module: predicted stage in, Gemini-backed diet +
   exercise plan out. Self-contained styling (scoped "ed-" class
   prefix) so it can be dropped into the app without importing
   anything from MenoAssistApp.jsx.

   Usage:
     <ExerciseDiet
       stage="menopause"                 // required: one of the 3 stage keys
       context={{                        // optional, improves the plan
         age: 47, bmi: 24.5,
         exerciseMinutesPerWeek: 120,
         stressLevel: 6, sleepHoursAvg: 6.5,
       }}
     />
--------------------------------------------------------------- */

const C = {
  cream: "#FDF6F0",
  plum: "#3E2A38",
  plumSoft: "#7A6373",
  rose: "#E38A9B",
  roseDeep: "#C96B7E",
  roseTint: "#FBEAEE",
  amber: "#E3A94B",
  amberDeep: "#B87F2B",
  amberTint: "#FBF0DD",
  sage: "#7E9B85",
  sageDeep: "#57715E",
  sageTint: "#EAF1EB",
  cardBorder: "#F0E2DC",
  white: "#FFFFFF",
};

const DISPLAY_FONT = `"Fraunces", "Iowan Old Style", "Georgia", serif`;
const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif`;

const STAGE_STYLE = {
  "pre-menopause": { label: "Pre-menopause", color: C.rose, deep: C.roseDeep, tint: C.roseTint },
  menopause: { label: "Menopause transition", color: C.amber, deep: C.amberDeep, tint: C.amberTint },
  "post-menopause": { label: "Post-menopause", color: C.sage, deep: C.sageDeep, tint: C.sageTint },
};

const DIET_OPTIONS = [
  { key: "vegetarian", label: "Vegetarian", icon: Wheat },
  { key: "non-vegetarian", label: "Non-vegetarian", icon: Drumstick },
  { key: "vegan", label: "Vegan", icon: Leaf },
];

const NUTRIENT_META = [
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "calcium_mg", label: "Calcium", unit: "mg" },
  { key: "vitamin_d_iu", label: "Vitamin D", unit: "IU" },
  { key: "iron_mg", label: "Iron", unit: "mg" },
  { key: "omega3_g", label: "Omega-3", unit: "g" },
];

const API_BASE = "http://localhost:8000";

async function fetchDietExercisePlan({ stage, dietType, context }) {
  const res = await fetch(`${API_BASE}/diet-exercise-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stage,
      diet_type: dietType,
      age: context?.age,
      bmi: context?.bmi,
      exercise_minutes_per_week: context?.exerciseMinutesPerWeek,
      stress_level_1to10: context?.stressLevel,
      sleep_hours_avg: context?.sleepHoursAvg,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return res.json();
}

function DietPicker({ value, onChange, deep }) {
  return (
    <div className="ed-diet-picker">
      {DIET_OPTIONS.map(({ key, label, icon: Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            className={`ed-diet-pill ${active ? "ed-diet-pill-active" : ""}`}
            style={active ? { background: deep, color: C.white, borderColor: deep } : undefined}
            onClick={() => onChange(key)}
            type="button"
          >
            <Icon size={15} strokeWidth={2.2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function ExerciseDiet({ stage, context }) {
  const [dietType, setDietType] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const style = STAGE_STYLE[stage];
  if (!style) {
    return (
      <div className="ed-root">
        <style>{ED_CSS}</style>
        <p className="ed-body">
          No predicted stage available yet — run the assessment first.
        </p>
      </div>
    );
  }

  const generate = async () => {
    if (!dietType) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDietExercisePlan({ stage, dietType, context });
      setPlan(data);
    } catch (e) {
      setError(e.message || "Couldn't reach the plan server.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPlan(null);
    setError(null);
  };

  return (
    <div className="ed-root">
      <style>{ED_CSS}</style>

      <div className="ed-header" style={{ background: style.tint }}>
        <span className="ed-eyebrow" style={{ color: style.deep }}>
          <Sparkles size={13} strokeWidth={2.4} /> Personalized plan
        </span>
        <h2 className="ed-title">Diet &amp; exercise for {style.label}</h2>
        <p className="ed-subtitle">
          Generated for your predicted stage. Pick a diet preference to get
          nutrient targets, food suggestions, and a matching exercise plan.
        </p>
      </div>

      {!plan && (
        <div className="ed-card">
          <div className="ed-card-heading">Dietary preference</div>
          <DietPicker value={dietType} onChange={setDietType} deep={style.deep} />

          {error && <p className="ed-error">{error} — is the backend running at localhost:8000?</p>}

          <button
            className="ed-btn-primary"
            style={{
              background: `linear-gradient(135deg, ${style.color}, ${style.deep})`,
              opacity: !dietType || loading ? 0.6 : 1,
              pointerEvents: !dietType || loading ? "none" : "auto",
            }}
            onClick={generate}
            type="button"
          >
            {loading ? "Generating…" : "Generate my plan"}
            {!loading && <ChevronRight size={16} strokeWidth={2.4} />}
          </button>
        </div>
      )}

      {plan && (
        <>
          <div className="ed-card">
            <div className="ed-card-row">
              <Salad size={18} color={style.deep} strokeWidth={2.2} />
              <span className="ed-card-heading">Daily nutrient targets</span>
            </div>
            <div className="ed-nutrient-grid">
              {NUTRIENT_META.map(({ key, label, unit }) => (
                <div key={key} className="ed-nutrient-tile" style={{ background: style.tint }}>
                  <div className="ed-nutrient-value" style={{ color: style.deep }}>
                    {Math.round(plan.nutrient_targets[key])}
                    <span className="ed-nutrient-unit">{unit}</span>
                  </div>
                  <div className="ed-nutrient-label">{label}</div>
                </div>
              ))}
            </div>
            <p className="ed-body" style={{ marginTop: 10 }}>{plan.diet_summary}</p>
            <ul className="ed-list">
              {plan.diet_tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="ed-card">
            <div className="ed-card-row">
              <Dumbbell size={18} color={style.deep} strokeWidth={2.2} />
              <span className="ed-card-heading">Exercise plan</span>
            </div>
            <p className="ed-body">{plan.exercise_summary}</p>
            <ul className="ed-list">
              {plan.exercise_tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="ed-card">
            <div className="ed-card-row" style={{ marginBottom: 4 }}>
              <Sparkles size={16} color={style.deep} strokeWidth={2.2} />
              <span className="ed-card-heading">Why this plan?</span>
            </div>
            {plan.explanation.map((text, i) => (
              <p className="ed-body" key={i} style={{ margin: "4px 0" }}>{text}</p>
            ))}
          </div>

          <button className="ed-btn-ghost" onClick={reset} type="button">
            <RotateCcw size={14} strokeWidth={2.4} /> Try a different diet preference
          </button>
        </>
      )}

      <p className="ed-caption">
        AI-generated wellness guidance, not a diagnostic or medical recommendation.
        Talk to a doctor before changing diet, supplements, or exercise routines.
      </p>
    </div>
  );
}

const ED_CSS = `
  .ed-root { font-family: ${FONT}; max-width: 620px; margin: 0 auto; display:flex; flex-direction:column; gap: 18px; }
  .ed-eyebrow { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:8px; }
  .ed-header { border-radius: 22px; padding: 22px 24px; }
  .ed-title { font-family: ${DISPLAY_FONT}; font-size: 24px; font-weight: 700; color: ${C.plum}; margin: 0 0 6px; }
  .ed-subtitle { font-size: 13.5px; color: ${C.plumSoft}; line-height: 1.6; margin: 0; }
  .ed-card { background: ${C.white}; border: 1px solid ${C.cardBorder}; border-radius: 20px; padding: 18px 22px; }
  .ed-card-row { display:flex; align-items:center; gap:8px; margin-bottom: 8px; }
  .ed-card-heading { font-size: 15px; font-weight: 600; color: ${C.plum}; }
  .ed-body { font-size: 13.5px; color: ${C.plumSoft}; line-height: 1.6; margin: 0; }
  .ed-list { margin: 8px 0 0; padding-left: 18px; display:flex; flex-direction:column; gap: 5px; }
  .ed-list li { font-size: 13.5px; color: ${C.plumSoft}; line-height: 1.5; }
  .ed-diet-picker { display:flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
  .ed-diet-pill { display:flex; align-items:center; gap:6px; background: ${C.cream}; border: 1px solid ${C.cardBorder}; border-radius: 999px; padding: 9px 16px; font-family: inherit; font-size: 13px; font-weight: 600; color: ${C.plum}; cursor: pointer; }
  .ed-diet-pill-active { border-width: 1px; }
  .ed-btn-primary { display:flex; align-items:center; justify-content:center; gap:6px; color: #fff; border:none; border-radius: 16px; padding: 12px 20px; font-size: 14.5px; font-weight: 600; font-family: inherit; margin-top: 16px; width: 100%; cursor: pointer; }
  .ed-btn-ghost { display:flex; align-items:center; justify-content:center; gap:6px; background: transparent; border: none; color: ${C.roseDeep}; font-size: 13.5px; font-weight: 600; font-family: inherit; padding: 6px; align-self:center; cursor: pointer; }
  .ed-nutrient-grid { display:grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 4px; }
  .ed-nutrient-tile { border-radius: 14px; padding: 10px 4px; text-align:center; }
  .ed-nutrient-value { font-family: ${DISPLAY_FONT}; font-size: 17px; font-weight: 700; }
  .ed-nutrient-unit { font-size: 10px; font-weight: 600; margin-left: 2px; }
  .ed-nutrient-label { font-size: 10.5px; color: ${C.plumSoft}; margin-top: 2px; font-weight: 600; }
  .ed-error { font-size: 13px; color: ${C.roseDeep}; margin-top: 10px; }
  .ed-caption { font-size: 11.5px; color: ${C.plumSoft}; text-align:center; line-height:1.5; margin: 0; opacity: 0.85; }
  @media (max-width: 480px) { .ed-nutrient-grid { grid-template-columns: repeat(3, 1fr); } }
`;
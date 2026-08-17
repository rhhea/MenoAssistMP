import React, { useState } from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Moon,
  Activity,
  HeartPulse,
  Info,
  RotateCcw,
  Wind,
} from "lucide-react";

/* ---------------------------------------------------------------
   Design tokens
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
  lavender: "#F3E9F2",
  cardBorder: "#F0E2DC",
  white: "#FFFFFF",
};

const STAGE_META = {
  "pre-menopause": {
    label: "Pre-menopause",
    short: "Cycles are regular; hormones are just beginning to shift.",
    color: C.rose,
    deep: C.roseDeep,
    tint: C.roseTint,
    bloom: 1,
  },
  menopause: {
    label: "Menopause transition",
    short: "Cycles turn irregular as estrogen swings and FSH climbs.",
    color: C.amber,
    deep: C.amberDeep,
    tint: C.amberTint,
    bloom: 2,
  },
  "post-menopause": {
    label: "Post-menopause",
    short: "12+ months without a period; hormone levels have settled.",
    color: C.sage,
    deep: C.sageDeep,
    tint: C.sageTint,
    bloom: 3,
  },
};

const DIET = {
  "pre-menopause": {
    name: "Balanced diet plan",
    text: "Steady blood sugar first: whole grains, lean protein, and plenty of fiber. Keep iron intake up to support regular cycles.",
  },
  menopause: {
    name: "Hormone-support diet plan",
    text: "Add phytoestrogen-rich foods like flaxseed and soy, calcium and vitamin D for bone density, and omega-3s to ease hot flashes and mood swings.",
  },
  "post-menopause": {
    name: "Weight-management diet plan",
    text: "Prioritize protein, about 25-30g a meal, to preserve muscle. Watch refined carbs as metabolism slows, and keep calcium and vitamin D high.",
  },
};

const EXERCISE = {
  "pre-menopause": "A mix of cardio and strength training, roughly 150 minutes a week of moderate activity.",
  menopause: "Low-impact cardio (walking, swimming) plus light strength training to ease joint stress and support mood.",
  "post-menopause": "Lead with strength and bone-health work, resistance training and weight-bearing exercise, to counter bone density loss.",
};

const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif`;

/* ---------------------------------------------------------------
   Flower cursor + flower badge (signature motif, reused across nav,
   stage list, and results)
--------------------------------------------------------------- */
function makeFlowerCursor(hex) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='-15 -15 30 30'><g fill='${hex}'>
    <path d='M0,0 C-4,-6 -4,-13 0,-18 C4,-13 4,-6 0,0 Z'/>
    <path d='M0,0 C6,-4 13,-4 18,0 C13,4 6,4 0,0 Z'/>
    <path d='M0,0 C4,6 4,13 0,18 C-4,13 -4,6 0,0 Z'/>
    <path d='M0,0 C-6,4 -13,4 -18,0 C-13,-4 -6,-4 0,0 Z'/>
  </g><circle r='3.4' fill='#FFF9F4'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 15 15, pointer`;
}
const FLOWER_CURSOR = makeFlowerCursor(C.roseDeep);

function Flower({ stage = 3, size = 56, color, center }) {
  const cfg = { 1: { d: 3, s: 0.5 }, 2: { d: 6, s: 0.78 }, 3: { d: 9, s: 1 } }[stage];
  const petals = new Array(6).fill(0);
  return (
    <svg width={size} height={size} viewBox="-32 -32 64 64" aria-hidden="true">
      {petals.map((_, i) => {
        const angle = (360 / petals.length) * i;
        return (
          <g key={i} transform={`rotate(${angle}) translate(0 ${-cfg.d}) scale(${cfg.s})`}>
            <path
              d="M0,0 C-7,-11 -7,-24 0,-32 C7,-24 7,-11 0,0 Z"
              fill={color}
              opacity={0.94}
            />
          </g>
        );
      })}
      <circle r={stage === 1 ? 4.5 : 7} fill={center} />
    </svg>
  );
}

/* ---------------------------------------------------------------
   Prediction API — calls the FastAPI backend in backend/main.py,
   which loads the real trained model from backend/outputs/.
--------------------------------------------------------------- */
const API_BASE = "http://localhost:8000";

async function fetchStage(f) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      age: f.age,
      bmi: f.bmi,
      smoking_status: f.smokingStatus,
      age_at_menarche: f.ageAtMenarche,
      num_pregnancies: f.numPregnancies,
      FSH_mIU_mL: f.fsh,
      LH_mIU_mL: f.lh,
      estradiol_pg_mL: f.estradiol,
      sleep_hours_avg: f.sleepHours,
      exercise_minutes_per_week: f.exerciseMinutes,
      stress_level_1to10: f.stressLevel,
      systolic_bp: f.systolicBP,
      vitamin_D_ng_mL: f.vitaminD,
      periods_last_12_months: f.periods,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ? JSON.stringify(body.detail) : `API error: ${res.status}`);
  }
  const data = await res.json();
  return {
    stage: data.stage,
    proba: {
      "pre-menopause": data.probabilities["pre-menopause"],
      menopause: data.probabilities["menopause"],
      "post-menopause": data.probabilities["post-menopause"],
    },
    factors: data.explanation, // array of ready-made sentences from explain_prediction()
  };
}

/* ---------------------------------------------------------------
   Small building blocks
--------------------------------------------------------------- */
function PrimaryButton({ children, onClick, style }) {
  return (
    <button className="mc-btn-primary" style={{ cursor: FLOWER_CURSOR, ...style }} onClick={onClick}>
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, style }) {
  return (
    <button className="mc-btn-ghost" style={{ cursor: FLOWER_CURSOR, ...style }} onClick={onClick}>
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="mc-field">
      <span className="mc-field-label">{label}</span>
      {children}
    </label>
  );
}

/* ---------------------------------------------------------------
   Pages
--------------------------------------------------------------- */
function HomePage({ onStart, onSeeResults, hasResult }) {
  const [openInfo, setOpenInfo] = useState(true);
  return (
    <div className="mc-page">
      <section className="mc-hero">
        <div className="mc-hero-copy">
          <h1 className="mc-title">A gentle read on where you are in menopause</h1>
          <p className="mc-subtitle">
            Answer a short form about your health and lifestyle, and Menocare places you on the pre-menopause,
            menopause, and post-menopause continuum — with a plain-language explanation and a plan to match.
          </p>
          <div className="mc-hero-actions">
            <PrimaryButton onClick={onStart}>
              Start your journey <ChevronRight size={16} strokeWidth={2.4} />
            </PrimaryButton>
            {hasResult && <GhostButton onClick={onSeeResults}>See my last result</GhostButton>}
          </div>
        </div>
        <div className="mc-hero-flower">
          <Flower stage={2} size={200} color={C.rose} center={C.amber} />
        </div>
      </section>

      <button className="mc-card mc-info-toggle" style={{ cursor: FLOWER_CURSOR }} onClick={() => setOpenInfo((v) => !v)}>
        <div className="mc-card-row">
          <Info size={18} color={C.roseDeep} strokeWidth={2.2} />
          <span className="mc-card-heading">What is menopause?</span>
          <ChevronRight
            size={16}
            color={C.plumSoft}
            style={{ marginLeft: "auto", transform: openInfo ? "rotate(90deg)" : "none", transition: "transform .2s" }}
          />
        </div>
        {openInfo && (
          <p className="mc-card-body">
            Menopause is the natural drop in reproductive hormones that ends your menstrual cycles for good.
            It isn't one moment but a multi-year shift, and where you sit in that shift shapes which symptoms
            show up and which habits help most.
          </p>
        )}
      </button>

      <div className="mc-section-label">The 3 stages</div>
      <div className="mc-stage-grid">
        {Object.entries(STAGE_META).map(([key, meta], i) => (
          <div className="mc-stage-card" key={key} style={{ background: meta.tint }}>
            <span className="mc-stage-num">{i + 1}</span>
            <Flower stage={meta.bloom} size={48} color={meta.color} center={meta.deep} />
            <div className="mc-stage-name" style={{ color: meta.deep }}>{meta.label}</div>
            <div className="mc-stage-desc">{meta.short}</div>
          </div>
        ))}
      </div>

      <p className="mc-caption">
        Menocare is a demo screening tool trained on a reference dataset, not a diagnostic device.
        Always confirm staging and treatment with a doctor.
      </p>
    </div>
  );
}

const DEFAULTS = {
  age: 50, bmi: 25, ageAtMenarche: 12, numPregnancies: 1, smokingStatus: "never",
  periods: 6, fsh: 30, lh: 25, estradiol: 70, vitaminD: 30, systolicBP: 120,
  sleepHours: 7, exerciseMinutes: 120, stressLevel: 5,
};

function AssessPage({ onBack, onFinish, loading, error }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULTS);
  const steps = ["Basic form", "Health metrics", "Mood & lifestyle"];
  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "range" || e.target.type === "number" ? Number(e.target.value) : e.target.value }));

  const goBack = () => (step === 0 ? onBack() : setStep((s) => s - 1));
  const goNext = () => (step === steps.length - 1 ? onFinish(form) : setStep((s) => s + 1));

  return (
    <div className="mc-page mc-page-narrow">
      <div className="mc-card mc-form-card">
        <div className="mc-flow-header">
          <button className="mc-icon-btn" style={{ cursor: FLOWER_CURSOR }} onClick={goBack} aria-label="Back">
            <ChevronLeft size={20} color={C.plum} />
          </button>
          <div className="mc-step-dots">
            {steps.map((_, i) => (
              <span key={i} className={`mc-dot ${i === step ? "mc-dot-active" : i < step ? "mc-dot-done" : ""}`} />
            ))}
          </div>
          <span style={{ width: 32 }} />
        </div>
        <h2 className="mc-step-title">{steps[step]}</h2>

        {step === 0 && (
          <div className="mc-form-grid">
            <Field label="Age"><input type="number" value={form.age} onChange={set("age")} min={30} max={70} /></Field>
            <Field label="BMI"><input type="number" step="0.1" value={form.bmi} onChange={set("bmi")} min={15} max={45} /></Field>
            <Field label="Age at first period"><input type="number" value={form.ageAtMenarche} onChange={set("ageAtMenarche")} min={8} max={18} /></Field>
            <Field label="Pregnancies"><input type="number" value={form.numPregnancies} onChange={set("numPregnancies")} min={0} max={10} /></Field>
            <Field label="Smoking status">
              <select value={form.smokingStatus} onChange={set("smokingStatus")}>
                <option value="never">Never</option>
                <option value="former">Former</option>
                <option value="current">Current</option>
              </select>
            </Field>
            <Field label={`Periods in the last 12 months: ${form.periods}`}>
              <input type="range" min={0} max={13} value={form.periods} onChange={set("periods")} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="mc-form-grid">
            <p className="mc-step-hint">Optional lab values — leave the defaults if you don't have recent numbers.</p>
            <Field label="FSH (mIU/mL)"><input type="number" value={form.fsh} onChange={set("fsh")} min={0} max={150} /></Field>
            <Field label="LH (mIU/mL)"><input type="number" value={form.lh} onChange={set("lh")} min={0} max={100} /></Field>
            <Field label="Estradiol (pg/mL)"><input type="number" value={form.estradiol} onChange={set("estradiol")} min={0} max={250} /></Field>
            <Field label="Vitamin D (ng/mL)"><input type="number" value={form.vitaminD} onChange={set("vitaminD")} min={0} max={100} /></Field>
            <Field label="Systolic BP"><input type="number" value={form.systolicBP} onChange={set("systolicBP")} min={80} max={200} /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="mc-form-grid">
            <Field label={`Average sleep: ${form.sleepHours} hrs/night`}>
              <input type="range" min={3} max={10} step={0.5} value={form.sleepHours} onChange={set("sleepHours")} />
            </Field>
            <Field label={`Exercise: ${form.exerciseMinutes} min/week`}>
              <input type="range" min={0} max={400} step={10} value={form.exerciseMinutes} onChange={set("exerciseMinutes")} />
            </Field>
            <Field label={`Stress level: ${form.stressLevel}/10`}>
              <input type="range" min={1} max={10} value={form.stressLevel} onChange={set("stressLevel")} />
            </Field>
          </div>
        )}

        {error && (
          <p className="mc-card-body" style={{ color: C.roseDeep, marginTop: 12 }}>
            {error} — is the backend running at localhost:8000?
          </p>
        )}
        <PrimaryButton
          onClick={goNext}
          style={{ marginTop: 22, width: "100%", opacity: loading ? 0.7 : 1, pointerEvents: loading ? "none" : "auto" }}
        >
          {loading ? "Predicting…" : step === steps.length - 1 ? "Predict my stage" : "Continue"}
          {!loading && <ChevronRight size={16} strokeWidth={2.4} />}
        </PrimaryButton>
      </div>
    </div>
  );
}

function ResultsPage({ result, onRetake }) {
  if (!result) {
    return (
      <div className="mc-page mc-empty">
        <Flower stage={1} size={64} color={C.rose} center={C.amber} />
        <p className="mc-card-body" style={{ textAlign: "center", marginTop: 12 }}>
          Take the assessment to see your stage.
        </p>
        <PrimaryButton onClick={onRetake} style={{ marginTop: 14 }}>Start assessment</PrimaryButton>
      </div>
    );
  }
  const meta = STAGE_META[result.stage];
  const chartData = Object.entries(result.proba).map(([k, v]) => ({
    name: STAGE_META[k].label.split(" ")[0],
    key: k,
    value: Math.round(v * 100),
  }));

  return (
    <div className="mc-page">
      <div className="mc-results-grid">
        <div className="mc-results-col">
          <div className="mc-bloom-wrap" style={{ background: meta.tint }}>
            <Flower stage={meta.bloom} size={100} color={meta.color} center={meta.deep} />
            <div className="mc-stage-name" style={{ color: meta.deep, fontSize: 20, marginTop: 8 }}>{meta.label}</div>
            <div className="mc-stage-desc" style={{ textAlign: "center" }}>{meta.short}</div>
          </div>

          <div className="mc-card">
            <div className="mc-card-heading" style={{ marginBottom: 6 }}>Prediction breakdown</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={chartData} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: C.plumSoft, fontFamily: FONT }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell key={d.key} fill={STAGE_META[d.key].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <GhostButton onClick={onRetake}>
            <RotateCcw size={14} strokeWidth={2.4} /> Retake the assessment
          </GhostButton>
        </div>

        <div className="mc-results-col">
          <div className="mc-card">
            <div className="mc-card-row" style={{ marginBottom: 8 }}>
              <Sparkles size={18} color={C.roseDeep} strokeWidth={2.2} />
              <span className="mc-card-heading">Why this prediction?</span>
            </div>
            {result.factors.map((text, i) => (
              <p className="mc-card-body" key={i} style={{ margin: "4px 0" }}>
                {text}
              </p>
            ))}
          </div>

          <div className="mc-card">
            <div className="mc-card-row" style={{ marginBottom: 6 }}>
              <HeartPulse size={18} color={meta.deep} strokeWidth={2.2} />
              <span className="mc-card-heading">{DIET[result.stage].name}</span>
            </div>
            <p className="mc-card-body">{DIET[result.stage].text}</p>
          </div>

          <div className="mc-card">
            <div className="mc-card-row" style={{ marginBottom: 6 }}>
              <Activity size={18} color={meta.deep} strokeWidth={2.2} />
              <span className="mc-card-heading">Exercise plan</span>
            </div>
            <p className="mc-card-body">{EXERCISE[result.stage]}</p>
          </div>

          {result.highStress && (
            <div className="mc-card" style={{ background: C.amberTint, borderColor: "transparent" }}>
              <div className="mc-card-row">
                <Wind size={18} color={C.amberDeep} strokeWidth={2.2} />
                <span className="mc-card-body" style={{ margin: 0 }}>
                  Your reported stress is high — pair exercise with a relaxation practice like yoga or breathing work.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mc-caption">
        Demo prediction from a reference model, not a diagnostic device. Consult a doctor for actual staging
        and treatment decisions.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------
   App shell — full-width responsive webapp with a top nav
--------------------------------------------------------------- */
export default function MenocareApp() {
  const [page, setPage] = useState("home");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const finishAssess = async (form) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchStage(form);
      setResult({ ...r, highStress: form.stressLevel >= 7 });
      setPage("results");
    } catch (e) {
      setError(e.message || "Couldn't reach the prediction server.");
    } finally {
      setLoading(false);
    }
  };

  const nav = [
    { key: "home", label: "Home" },
    { key: "assess", label: "Assessment" },
    { key: "results", label: "Results", disabled: !result },
  ];

  return (
    <div className="mc-app-bg">
      <style>{`
        * { box-sizing: border-box; }
        .mc-app-bg { font-family: ${FONT}; background: radial-gradient(circle at 15% 0%, ${C.lavender}, ${C.cream} 45%); min-height: 100%; }
        .mc-nav { position: sticky; top: 0; z-index: 5; display:flex; align-items:center; gap: 28px; padding: 16px 36px; background: rgba(253,246,240,0.86); backdrop-filter: blur(12px); border-bottom: 1px solid ${C.cardBorder}; }
        .mc-nav-brand { display:flex; align-items:center; gap:8px; font-weight: 700; font-size: 17px; color: ${C.plum}; margin-right: 8px; }
        .mc-nav-link { background:none; border:none; font-family: inherit; font-size: 14px; font-weight: 600; color: ${C.plumSoft}; padding: 6px 2px; border-bottom: 2px solid transparent; }
        .mc-nav-link-active { color: ${C.roseDeep}; border-bottom-color: ${C.roseDeep}; }
        .mc-nav-link:disabled { opacity: 0.4; }
        .mc-page { max-width: 1040px; margin: 0 auto; padding: 40px 36px 60px; display:flex; flex-direction:column; gap: 22px; }
        .mc-page-narrow { max-width: 620px; }
        .mc-hero { display:flex; align-items:center; justify-content:space-between; gap: 32px; padding: 20px 4px 8px; }
        .mc-hero-copy { max-width: 480px; }
        .mc-hero-actions { display:flex; align-items:center; gap: 16px; margin-top: 22px; }
        .mc-hero-flower { animation: mc-sway 6s ease-in-out infinite; flex-shrink: 0; }
        @keyframes mc-sway { 0%,100%{ transform: rotate(-4deg);} 50%{ transform: rotate(4deg);} }
        .mc-title { font-size: 34px; line-height:1.15; font-weight: 700; color: ${C.plum}; margin: 0 0 12px; letter-spacing: -0.4px; }
        .mc-subtitle { font-size: 15px; line-height:1.6; color: ${C.plumSoft}; margin: 0; }
        .mc-btn-primary { display:flex; align-items:center; justify-content:center; gap:6px; background: linear-gradient(135deg, ${C.rose}, ${C.roseDeep}); color: #fff; border:none; border-radius: 16px; padding: 13px 22px; font-size: 15px; font-weight: 600; font-family: inherit; box-shadow: 0 10px 20px -10px rgba(201,107,126,0.6); transition: transform .15s ease; }
        .mc-btn-primary:active { transform: scale(0.97); }
        .mc-btn-ghost { display:flex; align-items:center; justify-content:center; gap:6px; background: transparent; color: ${C.roseDeep}; border: none; font-size: 14px; font-weight: 600; font-family: inherit; padding: 6px; }
        .mc-card { background: ${C.white}; border: 1px solid ${C.cardBorder}; border-radius: 20px; padding: 18px 22px; text-align:left; width:100%; }
        .mc-info-toggle { display:block; cursor: pointer; }
        .mc-card-row { display:flex; align-items:center; gap:8px; }
        .mc-card-heading { font-size: 15px; font-weight: 600; color: ${C.plum}; }
        .mc-card-body { font-size: 13.5px; color: ${C.plumSoft}; line-height: 1.6; margin: 6px 0 0; }
        .mc-section-label { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${C.plumSoft}; margin: 6px 2px -4px; }
        .mc-stage-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .mc-stage-card { display:flex; flex-direction:column; align-items:flex-start; gap: 6px; border-radius: 18px; padding: 18px; position: relative; }
        .mc-stage-num { position:absolute; top: 14px; right: 16px; font-size: 12px; font-weight: 700; color: ${C.plumSoft}; }
        .mc-stage-name { font-size: 15px; font-weight: 700; margin-top: 4px; }
        .mc-stage-desc { font-size: 12.5px; color: ${C.plumSoft}; line-height: 1.5; }
        .mc-caption { font-size: 11.5px; color: ${C.plumSoft}; text-align:center; line-height:1.5; margin: 10px 0 0; opacity: 0.85; }
        .mc-form-card { max-width: 560px; margin: 0 auto; padding: 26px 30px 30px; }
        .mc-flow-header { display:flex; align-items:center; justify-content:space-between; }
        .mc-icon-btn { background: ${C.cream}; border: 1px solid ${C.cardBorder}; border-radius: 12px; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; }
        .mc-step-dots { display:flex; gap:6px; }
        .mc-dot { width: 26px; height: 4px; border-radius: 4px; background: ${C.cardBorder}; }
        .mc-dot-active { background: ${C.roseDeep}; }
        .mc-dot-done { background: ${C.rose}; }
        .mc-step-title { font-size: 21px; font-weight: 700; color: ${C.plum}; margin: 16px 0 18px; }
        .mc-step-hint { font-size: 12.5px; color: ${C.plumSoft}; margin: -6px 0 2px; grid-column: 1 / -1; }
        .mc-form-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .mc-field { display:flex; flex-direction:column; gap: 5px; }
        .mc-field-label { font-size: 12.5px; font-weight: 600; color: ${C.plumSoft}; }
        .mc-field input, .mc-field select { font-family: inherit; font-size: 15px; color: ${C.plum}; background: ${C.cream}; border: 1px solid ${C.cardBorder}; border-radius: 12px; padding: 10px 12px; cursor: text; }
        .mc-field input[type=range] { padding: 0; accent-color: ${C.roseDeep}; cursor: pointer; grid-column: span 1; }
        .mc-field select { cursor: pointer; }
        .mc-field input:focus, .mc-field select:focus { outline: 2px solid ${C.rose}; outline-offset: 1px; }
        .mc-results-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items:start; }
        .mc-results-col { display:flex; flex-direction:column; gap: 16px; }
        .mc-bloom-wrap { display:flex; flex-direction:column; align-items:center; border-radius: 22px; padding: 26px 16px; animation: mc-pop .5s cubic-bezier(.2,1.4,.4,1); }
        @keyframes mc-pop { from { opacity:0; transform: scale(.85);} to { opacity:1; transform: scale(1);} }
        .mc-empty { align-items:center; justify-content:center; text-align:center; min-height: 320px; }
        @media (prefers-reduced-motion: reduce) { .mc-hero-flower, .mc-bloom-wrap { animation: none; } }
        @media (max-width: 760px) {
          .mc-hero { flex-direction: column-reverse; text-align:center; }
          .mc-hero-actions { justify-content:center; }
          .mc-stage-grid { grid-template-columns: 1fr; }
          .mc-form-grid { grid-template-columns: 1fr; }
          .mc-results-grid { grid-template-columns: 1fr; }
          .mc-page { padding: 28px 18px 44px; }
          .mc-nav { padding: 14px 18px; gap: 18px; }
        }
      `}</style>

      <nav className="mc-nav">
        <div className="mc-nav-brand">
          <Flower stage={2} size={26} color={C.rose} center={C.amber} />
          Menocare
        </div>
        {nav.map((n) => (
          <button
            key={n.key}
            className={`mc-nav-link ${page === n.key ? "mc-nav-link-active" : ""}`}
            style={{ cursor: n.disabled ? "not-allowed" : FLOWER_CURSOR }}
            disabled={n.disabled}
            onClick={() => setPage(n.key)}
          >
            {n.label}
          </button>
        ))}
      </nav>

      {page === "home" && (
        <HomePage onStart={() => setPage("assess")} onSeeResults={() => setPage("results")} hasResult={!!result} />
      )}
      {page === "assess" && (
        <AssessPage onBack={() => setPage("home")} onFinish={finishAssess} loading={loading} error={error} />
      )}
      {page === "results" && <ResultsPage result={result} onRetake={() => setPage("assess")} />}
    </div>
  );
}
import React, { useState, useRef, useEffect } from "react";
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
  MessageCircle,
  Leaf,
  BookOpen,
  Stethoscope,
} from "lucide-react";
import ExerciseDiet from "./ExerciseDiet";
import Chatbot from "./Chatbot";

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

const DISPLAY_FONT = `"Fraunces", "Iowan Old Style", "Georgia", serif`;
const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif`;

const STAGE_META = {
  "pre-menopause": {
    label: "Pre-menopause",
    short: "Cycles are regular; hormones are just beginning to shift.",
    duration: "Typically your 30s through the mid-40s",
    hormoneNote:
      "Estrogen and progesterone still cycle on a normal monthly rhythm. Ovarian follicle reserve is quietly declining in the background, but the drop is slow enough that hormone levels stay within a fairly predictable range from one cycle to the next.",
    detail:
      "This is the stage most people spend the longest in. Ovulation is still happening regularly, so periods keep their usual timing, flow, and length. Underneath that stability, though, the number of remaining egg follicles is falling year over year, and FSH — the pituitary hormone that recruits follicles each month — can begin to creep upward almost imperceptibly. Most people notice nothing unusual at all; a smaller group will pick up on subtle shifts in sleep quality, PMS intensity, or cycle length a few years before anything else changes.",
    signs: [
      "Periods stay regular and largely predictable",
      "Fertility is essentially unaffected",
      "Occasional, mild shifts in mood or sleep",
      "PMS symptoms may feel slightly more noticeable",
    ],
    color: C.rose,
    deep: C.roseDeep,
    tint: C.roseTint,
    bloom: 1,
  },
  menopause: {
    label: "Menopause transition",
    short: "Cycles turn irregular as estrogen swings and FSH climbs.",
    duration: "Usually lasts 4 to 8 years",
    hormoneNote:
      "FSH and LH climb steadily as estradiol starts swinging unpredictably — some months higher than a normal cycle, some months far lower. It's this volatility, more than a simple decline, that drives most of the transition's symptoms.",
    detail:
      "Often called perimenopause, this is the most symptomatic stretch of the whole continuum. Ovulation becomes inconsistent, so cycles lengthen, shorten, or skip entirely, and flow can range from unusually light to unusually heavy. The erratic rise and fall of estradiol is what triggers hot flashes, night sweats, and the mood swings people describe most often — the body is reacting to instability, not just to lower hormone levels. Sleep is frequently disrupted independent of night sweats, and many people notice brain fog, joint aches, or new anxiety for the first time here.",
    signs: [
      "Periods become irregular in timing, length, and flow",
      "Hot flashes and night sweats appear or intensify",
      "Mood swings, irritability, or new-onset anxiety",
      "Disrupted or lighter sleep, even without night sweats",
      "Brain fog and difficulty concentrating",
    ],
    color: C.amber,
    deep: C.amberDeep,
    tint: C.amberTint,
    bloom: 2,
  },
  "post-menopause": {
    label: "Post-menopause",
    short: "12+ months without a period; hormone levels have settled.",
    duration: "Begins 12 months after your last period and continues from there",
    hormoneNote:
      "Estrogen settles at a consistently low level and FSH remains elevated long term, but — importantly — the wild month-to-month swings of the transition are over. Hormones are low, but they are stable.",
    detail:
      "Post-menopause is defined retrospectively: it officially begins once 12 consecutive months have passed without a period. For many people, the acute symptoms of the transition — hot flashes, mood swings — ease gradually as hormone levels stop fluctuating and settle into a new, lower baseline. The focus shifts from managing volatility to managing the longer-term effects of sustained low estrogen, particularly on bone density, cardiovascular health, and metabolism, all of which benefit from proactive attention in this stage.",
    signs: [
      "No periods for 12 months or more",
      "Hot flash frequency often eases over time, though not always",
      "Vaginal dryness and urinary changes can persist or emerge",
      "Bone density and cardiovascular risk need closer, ongoing attention",
    ],
    color: C.sage,
    deep: C.sageDeep,
    tint: C.sageTint,
    bloom: 3,
  },
};

const DIET = {
  "pre-menopause": {
    name: "Balanced diet plan",
    text: "Steady blood sugar first: whole grains, lean protein, and plenty of fiber to keep energy and mood even through the cycle. Keep iron intake up — leafy greens, legumes, and lean red meat or fortified alternatives — to support regular menstrual blood loss. This is also the easiest stage to build bone-density reserves for later, so don't skip calcium and vitamin D just because symptoms feel far off.",
  },
  menopause: {
    name: "Hormone-support diet plan",
    text: "Add phytoestrogen-rich foods — flaxseed, soy, chickpeas — which can gently soften hot flash intensity for some people. Prioritize calcium and vitamin D as bone density loss accelerates here, and lean on omega-3s (fatty fish, walnuts, flax oil) to help ease mood swings and hot flashes. Limiting caffeine and alcohol in the evening can noticeably improve night sweats and sleep quality.",
  },
  "post-menopause": {
    name: "Weight-management diet plan",
    text: "Prioritize protein — roughly 25–30g per meal — to preserve muscle mass as metabolism slows. Watch refined carbohydrates and added sugar, which the body now processes less efficiently, and keep calcium and vitamin D intake high to protect against the bone density loss that continues in this stage. Heart-healthy fats and fiber also matter more now, as cardiovascular risk rises after estrogen's protective effect fades.",
  },
};

const EXERCISE = {
  "pre-menopause":
    "A mix of cardio and strength training, roughly 150 minutes a week of moderate activity. This is the ideal window to build strength and bone density reserves you'll draw on later — think brisk walking, cycling, or swimming alongside two strength sessions a week.",
  menopause:
    "Low-impact cardio (walking, swimming, cycling) paired with light-to-moderate strength training eases joint stress while still supporting mood and sleep. Many people find that adding a mind-body practice — yoga, tai chi — helps specifically with the mood volatility and sleep disruption of this stage.",
  "post-menopause":
    "Lead with strength and bone-health work — resistance training and weight-bearing exercise — to counter the accelerated bone density loss of this stage. Balance work (single-leg stands, tai chi) also becomes more valuable now, reducing fall and fracture risk alongside the strength gains.",
};

/* ---------------------------------------------------------------
   Flower cursor + flower motif (signature element, reused as the
   stage-continuum marker throughout the page)
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
            <path d="M0,0 C-7,-11 -7,-24 0,-32 C7,-24 7,-11 0,0 Z" fill={color} opacity={0.94} />
          </g>
        );
      })}
      <circle r={stage === 1 ? 4.5 : 7} fill={center} />
    </svg>
  );
}

/* ---------------------------------------------------------------
   Bespoke hormone-trend diagram — the signature editorial visual
   for the "What is menopause" section. Illustrative, not literal
   patient data.
--------------------------------------------------------------- */
function HormoneTrendChart() {
  return (
    <svg viewBox="0 0 600 250" width="100%" height="auto" role="img" aria-label="Illustrative estrogen and FSH trend across the three stages">
      {[190, 410].map((x) => (
        <line key={x} x1={x} y1={20} x2={x} y2={190} stroke={C.cardBorder} strokeWidth="1.5" strokeDasharray="4 5" />
      ))}
      <line x1={40} y1={190} x2={580} y2={190} stroke={C.cardBorder} strokeWidth="1.5" />

      <path d="M80,50 L300,100 L520,160" fill="none" stroke={C.roseDeep} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M80,170 L300,90 L520,40" fill="none" stroke={C.amberDeep} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {[
        [80, 50, C.roseDeep],
        [300, 100, C.roseDeep],
        [520, 160, C.roseDeep],
        [80, 170, C.amberDeep],
        [300, 90, C.amberDeep],
        [520, 40, C.amberDeep],
      ].map(([x, y, fill], i) => (
        <circle key={i} cx={x} cy={y} r={5.5} fill={fill} stroke={C.white} strokeWidth="2" />
      ))}

      {["Pre-menopause", "Menopause transition", "Post-menopause"].map((label, i) => (
        <text key={label} x={[80, 300, 520][i]} y={214} textAnchor="middle" fontSize="12.5" fontFamily={FONT} fill={C.plumSoft} fontWeight="600">
          {label}
        </text>
      ))}

      <g transform="translate(40, 14)">
        <circle cx={0} cy={0} r={5} fill={C.roseDeep} />
        <text x={12} y={4} fontSize="12.5" fontFamily={FONT} fill={C.plum} fontWeight="600">Estrogen</text>
        <circle cx={100} cy={0} r={5} fill={C.amberDeep} />
        <text x={112} y={4} fontSize="12.5" fontFamily={FONT} fill={C.plum} fontWeight="600">FSH</text>
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------
   Scroll-reveal wrapper
--------------------------------------------------------------- */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, className = "", style, delay = 0 }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`mc-reveal ${visible ? "mc-reveal-in" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms", ...style }}
    >
      {children}
    </div>
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
    factors: data.explanation,
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
   HOME — long-form, informative landing page
--------------------------------------------------------------- */
function HomePage({ onStart }) {
  return (
    <div className="mc-page">
      {/* Hero / masthead */}
      <section className="mc-hero">
        <div className="mc-hero-copy">
          <span className="mc-eyebrow">Machine Learning · Women's Health</span>
          <h1 className="mc-title">MenoAssist</h1>
          <p className="mc-hero-tagline">A machine-learning–powered menopause staging &amp; assistant platform.</p>
          <p className="mc-subtitle">
            MenoAssist reads a short profile of your health and lifestyle and places you on the pre-menopause,
            menopause, and post-menopause continuum — a trained classification model, a plain-language
            explanation of why it reached that answer, and a stage-matched plan to act on.
          </p>
          <div className="mc-hero-actions">
            <PrimaryButton onClick={onStart}>
              Start your assessment <ChevronRight size={16} strokeWidth={2.4} />
            </PrimaryButton>
          </div>
        </div>
        <div className="mc-hero-flower">
          <Flower stage={2} size={190} color={C.rose} center={C.amber} />
        </div>
      </section>

      {/* What is menopause */}
      <Reveal>
        <section className="mc-section">
          <span className="mc-eyebrow">
            <BookOpen size={13} strokeWidth={2.4} /> The background
          </span>
          <h2 className="mc-section-title">What is menopause?</h2>
          <div className="mc-section-body-grid">
            <p className="mc-body-text">
              Menopause is the natural, permanent decline in reproductive hormones — chiefly estrogen and
              progesterone — that eventually ends the menstrual cycle for good. It isn't a single event so much
              as a multi-year physiological shift: the ovaries gradually release fewer follicles, the pituitary
              gland compensates by producing more FSH (follicle-stimulating hormone) and LH (luteinizing hormone)
              to try to prompt ovulation, and the resulting hormonal environment changes shape at each point
              along the way.
            </p>
            <p className="mc-body-text">
              Clinically, this shift is broken into three stages — pre-menopause, the menopause transition
              (perimenopause), and post-menopause — each with a distinct hormonal signature and a different
              cluster of symptoms. Knowing which stage you're in matters: it changes what your symptoms most
              likely mean, what lab values look "normal," and which interventions — dietary, lifestyle, or
              medical — tend to help most. That's precisely the question MenoAssist is built to answer.
            </p>
          </div>
          <div className="mc-diagram-card">
            <HormoneTrendChart />
            <p className="mc-caption mc-diagram-caption">
              Illustrative trend only — actual hormone trajectories vary significantly by individual.
            </p>
          </div>
        </section>
      </Reveal>

      {/* The three stages, detailed */}
      <section className="mc-section">
        <Reveal>
          <span className="mc-eyebrow">
            <Leaf size={13} strokeWidth={2.4} /> The continuum
          </span>
          <h2 className="mc-section-title">The three stages of menopause</h2>
          <p className="mc-body-text" style={{ maxWidth: 720 }}>
            MenoAssist's model classifies every profile into one of these three stages. Each one blooms further
            than the last — a continuum, not a diagnosis of decline — and each calls for a different kind of
            attention.
          </p>
        </Reveal>

        <div className="mc-stage-detail-list">
          {Object.entries(STAGE_META).map(([key, meta], i) => (
            <Reveal key={key} delay={i * 90}>
              <article className={`mc-stage-detail ${i % 2 === 1 ? "mc-stage-detail-rev" : ""}`}>
                <div className="mc-stage-detail-visual" style={{ background: meta.tint }}>
                  <Flower stage={meta.bloom} size={92} color={meta.color} center={meta.deep} />
                  <div className="mc-stage-detail-duration" style={{ color: meta.deep }}>{meta.duration}</div>
                </div>
                <div className="mc-stage-detail-copy">
                  <div className="mc-stage-detail-label" style={{ color: meta.deep }}>
                    Stage {i + 1} of 3 — {meta.label}
                  </div>
                  <p className="mc-body-text">{meta.detail}</p>
                  <div className="mc-hormone-note" style={{ borderColor: meta.color, background: meta.tint }}>
                    <strong style={{ color: meta.deep }}>Hormone profile — </strong>
                    <span>{meta.hormoneNote}</span>
                  </div>
                  <div className="mc-signs-label">Common signs</div>
                  <ul className="mc-signs-list">
                    {meta.signs.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works / CTA */}
      <Reveal>
        <section className="mc-section mc-howitworks">
          <span className="mc-eyebrow">
            <Stethoscope size={13} strokeWidth={2.4} /> How MenoAssist works
          </span>
          <h2 className="mc-section-title">One assessment, a trained classification model, a clear answer</h2>
          <p className="mc-body-text" style={{ maxWidth: 720 }}>
            You'll answer questions about your age, cycle history, available lab values, and day-to-day
            lifestyle in a single short form. That profile is passed to a model trained on a reference menopause
            dataset, which returns a predicted stage, a confidence breakdown across all three stages, and a
            plain-language explanation of the factors that drove the prediction.
          </p>
          <PrimaryButton onClick={onStart}>
            Start your assessment <ChevronRight size={16} strokeWidth={2.4} />
          </PrimaryButton>
        </section>
      </Reveal>

      <p className="mc-caption">
        MenoAssist is a demo screening tool trained on a reference dataset, not a diagnostic device. Always
        confirm staging and treatment with a doctor.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------
   ASSESSMENT — single-pass form, all fields at once
--------------------------------------------------------------- */
const DEFAULTS = {
  age: 50, bmi: 25, ageAtMenarche: 12, numPregnancies: 1, smokingStatus: "Never",
  periods: 6, fsh: 30, lh: 25, estradiol: 70, vitaminD: 30, systolicBP: 120,
  sleepHours: 7, exerciseMinutes: 120, stressLevel: 5,
};

function AssessPage({ onBack, onFinish, loading, error }) {
  const [form, setForm] = useState(DEFAULTS);
  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "range" || e.target.type === "number" ? Number(e.target.value) : e.target.value }));

  return (
    <div className="mc-page mc-page-narrow">
      <div className="mc-card mc-form-card">
        <div className="mc-flow-header">
          <button className="mc-icon-btn" style={{ cursor: FLOWER_CURSOR }} onClick={onBack} aria-label="Back">
            <ChevronLeft size={20} color={C.plum} />
          </button>
          <span className="mc-form-header-label">Your assessment</span>
          <span style={{ width: 32 }} />
        </div>
        <h2 className="mc-step-title">Tell us about yourself</h2>
        <p className="mc-step-hint" style={{ margin: "-8px 0 4px" }}>
          Answer everything you can in one go. Lab values are optional — leave the defaults if you don't have
          recent numbers.
        </p>

        <div className="mc-form-section-label">Basic information</div>
        <div className="mc-form-grid">
          <Field label="Age"><input type="number" value={form.age} onChange={set("age")} min={30} max={70} /></Field>
          <Field label="BMI"><input type="number" step="0.1" value={form.bmi} onChange={set("bmi")} min={15} max={45} /></Field>
          <Field label="Age at first period"><input type="number" value={form.ageAtMenarche} onChange={set("ageAtMenarche")} min={8} max={18} /></Field>
          <Field label="Pregnancies"><input type="number" value={form.numPregnancies} onChange={set("numPregnancies")} min={0} max={10} /></Field>
          <Field label="Smoking status">
            <select value={form.smokingStatus} onChange={set("smokingStatus")}>
              <option value="Never">Never</option>
              <option value="Former">Former</option>
              <option value="Current">Current</option>
            </select>
          </Field>
          <Field label={`Periods in the last 12 months: ${form.periods}`}>
            <input type="range" min={0} max={13} value={form.periods} onChange={set("periods")} />
          </Field>
        </div>

        <div className="mc-form-section-label">Health &amp; lab metrics (optional)</div>
        <div className="mc-form-grid">
          <Field label="FSH (mIU/mL)"><input type="number" value={form.fsh} onChange={set("fsh")} min={0} max={150} /></Field>
          <Field label="LH (mIU/mL)"><input type="number" value={form.lh} onChange={set("lh")} min={0} max={100} /></Field>
          <Field label="Estradiol (pg/mL)"><input type="number" value={form.estradiol} onChange={set("estradiol")} min={0} max={250} /></Field>
          <Field label="Vitamin D (ng/mL)"><input type="number" value={form.vitaminD} onChange={set("vitaminD")} min={0} max={100} /></Field>
          <Field label="Systolic BP"><input type="number" value={form.systolicBP} onChange={set("systolicBP")} min={80} max={200} /></Field>
        </div>

        <div className="mc-form-section-label">Lifestyle &amp; wellbeing</div>
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

        {error && (
          <p className="mc-card-body" style={{ color: C.roseDeep, marginTop: 12 }}>
            {error} — is the backend running at localhost:8000?
          </p>
        )}
        <PrimaryButton
          onClick={() => onFinish(form)}
          style={{ marginTop: 22, width: "100%", opacity: loading ? 0.7 : 1, pointerEvents: loading ? "none" : "auto" }}
        >
          {loading ? "Predicting…" : "Predict my stage"}
          {!loading && <ChevronRight size={16} strokeWidth={2.4} />}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   RESULTS — stacked vertically: stage, chart, explanation
--------------------------------------------------------------- */
function ResultsPage({ result, onRetake, onCarePlan, onChat })  {
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
    <div className="mc-page mc-page-narrow">
      <div className="mc-bloom-wrap" style={{ background: meta.tint }}>
        <Flower stage={meta.bloom} size={100} color={meta.color} center={meta.deep} />
        <div className="mc-stage-name" style={{ color: meta.deep, fontSize: 22, marginTop: 10 }}>{meta.label}</div>
        <div className="mc-stage-desc" style={{ textAlign: "center", maxWidth: 380 }}>{meta.short}</div>
      </div>

      <div className="mc-card">
        <div className="mc-card-heading" style={{ marginBottom: 6 }}>Prediction breakdown</div>
        <ResponsiveContainer width="100%" height={150}>
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

      <div className="mc-results-actions">
        <PrimaryButton onClick={onCarePlan}>
          View my care plan <ChevronRight size={16} strokeWidth={2.4} />
        </PrimaryButton>
        <GhostButton onClick={onRetake}>
          <RotateCcw size={14} strokeWidth={2.4} /> Retake the assessment
        </GhostButton>
      </div>

      <button className="mc-chatbot-teaser" style={{ cursor: FLOWER_CURSOR }} onClick={onChat}>
  <MessageCircle size={15} strokeWidth={2.2} />
  Emotional check-in companion
  <span className="mc-teaser-tag">Open</span>
</button>

      <p className="mc-caption">
        Demo prediction from a reference model, not a diagnostic device. Consult a doctor for actual staging
        and treatment decisions.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------
   CARE PLAN — diet + exercise, its own page
--------------------------------------------------------------- */
function CarePlanPage({ result, onBack }) {
  if (!result) {
    return (
      <div className="mc-page mc-empty">
        <Flower stage={1} size={64} color={C.rose} center={C.amber} />
        <p className="mc-card-body" style={{ textAlign: "center", marginTop: 12 }}>
          Take the assessment first to unlock your stage-matched care plan.
        </p>
        <PrimaryButton onClick={onBack} style={{ marginTop: 14 }}>Back</PrimaryButton>
      </div>
    );
  }
  const meta = STAGE_META[result.stage];
  return (
    <div className="mc-page mc-page-narrow">
      <div className="mc-flow-header" style={{ marginBottom: 4 }}>
        <button className="mc-icon-btn" style={{ cursor: FLOWER_CURSOR }} onClick={onBack} aria-label="Back">
          <ChevronLeft size={20} color={C.plum} />
        </button>
        <span className="mc-form-header-label">Care plan</span>
        <span style={{ width: 32 }} />
      </div>

      <div className="mc-bloom-wrap" style={{ background: meta.tint, padding: "20px 16px" }}>
        <Flower stage={meta.bloom} size={64} color={meta.color} center={meta.deep} />
        <div className="mc-stage-name" style={{ color: meta.deep, fontSize: 17, marginTop: 6 }}>
          Matched to {meta.label}
        </div>
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
              Your reported stress is high — pair exercise with a relaxation practice like yoga or breathing
              work.
            </span>
          </div>
        </div>
      )}

      <p className="mc-caption">
        General wellness guidance, not a personalized medical plan. Talk to a doctor before changing
        medication, diet, or exercise routines.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------
   App shell
--------------------------------------------------------------- */
export default function MenoAssistApp() {
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
  { key: "care", label: "Care Plan", disabled: !result },
  { key: "chat", label: "Chat", disabled: !result },   // add this
];

  return (
    <div className="mc-app-bg">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&display=swap');
        * { box-sizing: border-box; }
        .mc-app-bg { font-family: ${FONT}; background: radial-gradient(circle at 15% 0%, ${C.lavender}, ${C.cream} 45%); min-height: 100%; }
        .mc-nav { position: sticky; top: 0; z-index: 5; display:flex; align-items:center; gap: 28px; padding: 16px 36px; background: rgba(253,246,240,0.86); backdrop-filter: blur(12px); border-bottom: 1px solid ${C.cardBorder}; }
        .mc-nav-brand { display:flex; align-items:center; gap:8px; font-family: ${DISPLAY_FONT}; font-weight: 600; font-size: 19px; color: ${C.plum}; margin-right: 8px; }
        .mc-nav-link { background:none; border:none; font-family: inherit; font-size: 14px; font-weight: 600; color: ${C.plumSoft}; padding: 6px 2px; border-bottom: 2px solid transparent; }
        .mc-nav-link-active { color: ${C.roseDeep}; border-bottom-color: ${C.roseDeep}; }
        .mc-nav-link:disabled { opacity: 0.4; }

        .mc-page { max-width: 1040px; margin: 0 auto; padding: 44px 36px 70px; display:flex; flex-direction:column; gap: 56px; }
        .mc-page-narrow { max-width: 620px; gap: 20px; }

        .mc-eyebrow { display:inline-flex; align-items:center; gap: 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.roseDeep}; margin-bottom: 10px; }

        .mc-hero { display:flex; align-items:center; justify-content:space-between; gap: 32px; padding: 8px 4px 0; }
        .mc-hero-copy { max-width: 540px; }
        .mc-hero-actions { display:flex; align-items:center; gap: 16px; margin-top: 24px; }
        .mc-hero-flower { animation: mc-sway 6s ease-in-out infinite; flex-shrink: 0; }
        @keyframes mc-sway { 0%,100%{ transform: rotate(-4deg);} 50%{ transform: rotate(4deg);} }
        .mc-title { font-family: ${DISPLAY_FONT}; font-size: 52px; line-height:1; font-weight: 700; color: ${C.plum}; margin: 0 0 10px; letter-spacing: -0.5px; }
        .mc-hero-tagline { font-family: ${DISPLAY_FONT}; font-style: italic; font-weight: 500; font-size: 19px; color: ${C.roseDeep}; margin: 0 0 14px; }
        .mc-subtitle { font-size: 15px; line-height:1.7; color: ${C.plumSoft}; margin: 0; }

        .mc-section { display:flex; flex-direction:column; gap: 18px; }
        .mc-section-title { font-family: ${DISPLAY_FONT}; font-size: 30px; font-weight: 700; color: ${C.plum}; margin: 0 0 4px; letter-spacing: -0.3px; }
        .mc-section-body-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .mc-body-text { font-size: 14.5px; line-height: 1.75; color: ${C.plumSoft}; margin: 0; }

        .mc-diagram-card { background: ${C.white}; border: 1px solid ${C.cardBorder}; border-radius: 22px; padding: 24px 22px 14px; }
        .mc-diagram-caption { margin-top: 6px; }

        .mc-stage-detail-list { display:flex; flex-direction:column; gap: 20px; }
        .mc-stage-detail { display:grid; grid-template-columns: 240px 1fr; gap: 28px; align-items:start; background: ${C.white}; border: 1px solid ${C.cardBorder}; border-radius: 24px; padding: 26px; }
        .mc-stage-detail-rev { grid-template-columns: 1fr 240px; }
        .mc-stage-detail-rev .mc-stage-detail-visual { order: 2; }
        .mc-stage-detail-visual { display:flex; flex-direction:column; align-items:center; justify-content:center; gap: 10px; border-radius: 18px; padding: 22px 14px; text-align:center; }
        .mc-stage-detail-duration { font-size: 12px; font-weight: 700; }
        .mc-stage-detail-copy { display:flex; flex-direction:column; gap: 10px; }
        .mc-stage-detail-label { font-family: ${DISPLAY_FONT}; font-size: 19px; font-weight: 700; }
        .mc-hormone-note { font-size: 13px; line-height: 1.6; color: ${C.plum}; border-left: 3px solid; border-radius: 8px; padding: 10px 14px; }
        .mc-signs-label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${C.plumSoft}; margin-top: 4px; }
        .mc-signs-list { margin: 0; padding-left: 18px; display:flex; flex-direction:column; gap: 4px; }
        .mc-signs-list li { font-size: 13.5px; color: ${C.plumSoft}; line-height: 1.5; }

        .mc-howitworks { background: ${C.white}; border: 1px solid ${C.cardBorder}; border-radius: 28px; padding: 40px 40px 44px; align-items:flex-start; }

        .mc-btn-primary { display:flex; align-items:center; justify-content:center; gap:6px; background: linear-gradient(135deg, ${C.rose}, ${C.roseDeep}); color: #fff; border:none; border-radius: 16px; padding: 13px 22px; font-size: 15px; font-weight: 600; font-family: inherit; box-shadow: 0 10px 20px -10px rgba(201,107,126,0.6); transition: transform .15s ease; }
        .mc-btn-primary:active { transform: scale(0.97); }
        .mc-btn-ghost { display:flex; align-items:center; justify-content:center; gap:6px; background: transparent; color: ${C.roseDeep}; border: none; font-size: 14px; font-weight: 600; font-family: inherit; padding: 6px; }
        .mc-card { background: ${C.white}; border: 1px solid ${C.cardBorder}; border-radius: 20px; padding: 18px 22px; text-align:left; width:100%; }
        .mc-card-row { display:flex; align-items:center; gap:8px; }
        .mc-card-heading { font-size: 15px; font-weight: 600; color: ${C.plum}; }
        .mc-card-body { font-size: 13.5px; color: ${C.plumSoft}; line-height: 1.6; margin: 6px 0 0; }
        .mc-caption { font-size: 11.5px; color: ${C.plumSoft}; text-align:center; line-height:1.5; margin: 0; opacity: 0.85; }

        .mc-form-card { max-width: 560px; margin: 0 auto; padding: 26px 30px 30px; }
        .mc-flow-header { display:flex; align-items:center; justify-content:space-between; }
        .mc-icon-btn { background: ${C.cream}; border: 1px solid ${C.cardBorder}; border-radius: 12px; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; }
        .mc-form-header-label { font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${C.plumSoft}; }
        .mc-step-title { font-family: ${DISPLAY_FONT}; font-size: 24px; font-weight: 700; color: ${C.plum}; margin: 16px 0 2px; }
        .mc-step-hint { font-size: 12.5px; color: ${C.plumSoft}; }
        .mc-form-section-label { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${C.roseDeep}; margin: 20px 0 2px; padding-top: 14px; border-top: 1px solid ${C.cardBorder}; }
        .mc-form-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 10px; }
        .mc-field { display:flex; flex-direction:column; gap: 5px; }
        .mc-field-label { font-size: 12.5px; font-weight: 600; color: ${C.plumSoft}; }
        .mc-field input, .mc-field select { font-family: inherit; font-size: 15px; color: ${C.plum}; background: ${C.cream}; border: 1px solid ${C.cardBorder}; border-radius: 12px; padding: 10px 12px; cursor: text; }
        .mc-field input[type=range] { padding: 0; accent-color: ${C.roseDeep}; cursor: pointer; }
        .mc-field select { cursor: pointer; }
        .mc-field input:focus, .mc-field select:focus { outline: 2px solid ${C.rose}; outline-offset: 1px; }

        .mc-bloom-wrap { display:flex; flex-direction:column; align-items:center; border-radius: 22px; padding: 30px 16px; animation: mc-pop .5s cubic-bezier(.2,1.4,.4,1); }
        @keyframes mc-pop { from { opacity:0; transform: scale(.85);} to { opacity:1; transform: scale(1);} }
        .mc-stage-name { font-weight: 700; font-family: ${DISPLAY_FONT}; }
        .mc-stage-desc { font-size: 12.5px; color: ${C.plumSoft}; line-height: 1.5; }
        .mc-results-actions { display:flex; flex-direction:column; align-items:center; gap: 10px; }

        .mc-chatbot-teaser { align-self:center; display:flex; align-items:center; gap: 8px; background: ${C.lavender}; border: 1px dashed ${C.plumSoft}; border-radius: 999px; padding: 9px 16px; font-family: inherit; font-size: 12.5px; font-weight: 600; color: ${C.plumSoft}; opacity: 0.9; }
        .mc-teaser-tag { background: ${C.white}; color: ${C.roseDeep}; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; }

        .mc-empty { align-items:center; justify-content:center; text-align:center; min-height: 320px; }

        .mc-reveal { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s ease; }
        .mc-reveal-in { opacity: 1; transform: none; }

        @media (prefers-reduced-motion: reduce) { .mc-hero-flower, .mc-bloom-wrap { animation: none; } .mc-reveal { opacity:1; transform:none; transition:none; } }
        @media (max-width: 760px) {
          .mc-hero { flex-direction: column-reverse; text-align:center; }
          .mc-hero-actions { justify-content:center; }
          .mc-section-body-grid { grid-template-columns: 1fr; }
          .mc-stage-detail, .mc-stage-detail-rev { grid-template-columns: 1fr; }
          .mc-stage-detail-rev .mc-stage-detail-visual { order: 0; }
          .mc-form-grid { grid-template-columns: 1fr; }
          .mc-page { padding: 30px 18px 50px; gap: 42px; }
          .mc-nav { padding: 14px 18px; gap: 18px; }
          .mc-howitworks { padding: 30px 22px; }
        }
      `}</style>

      <nav className="mc-nav">
        <div className="mc-nav-brand">
          <Flower stage={2} size={26} color={C.rose} center={C.amber} />
          MenoAssist
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

      {page === "home" && <HomePage onStart={() => setPage("assess")} />}
      {page === "assess" && (
        <AssessPage onBack={() => setPage("home")} onFinish={finishAssess} loading={loading} error={error} />
      )}
      {page === "results" && (
  <ResultsPage
    result={result}
    onRetake={() => setPage("assess")}
    onCarePlan={() => setPage("care")}
    onChat={() => setPage("chat")}
  />
)}
      {page === "care" && (
        <div className="mc-page mc-page-narrow">
          <ExerciseDiet stage={result?.stage} />
        </div>
      )}
     {result && (
  <div
    className="mc-page mc-page-narrow"
    style={{ display: page === "chat" ? undefined : "none" }}
  >
    <Chatbot stage={result.stage} userId="demo-user" />
  </div>
)}
    </div>
  );
}
// frontend/src/Chatbot.jsx
//
// Usage (e.g. in MenocareApp.jsx, after the assessment result is available):
//   import Chatbot from "./Chatbot";
//   {result && <Chatbot stage={result.stage} userId={userId} />}
//
// `stage` must be the predicted stage string ("pre-menopause" | "menopause" | "post-menopause").
// If `stage` is missing, the chat stays locked.

import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const GREETING =
  "Hi, I'm here to listen. Tell me how you've been feeling, or ask me anything about symptoms and daily life.";

const colors = {
  ink: "#3E2A38",
  muted: "#7A6373",
  surface: "#FBEAEE",
  line: "#F0E2DC",
  user: "#C96B7E",
  alert: "#B87F2B",
  alertBg: "#FBF0DD",
};

const s = {
  card: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: 640,
    height: "min(72vh, 640px)",
    margin: "0 auto",
    background: "#fff",
    color: colors.ink,
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    overflow: "hidden",
    fontFamily: "inherit",
  },
  header: {
    padding: "14px 18px",
    background: colors.surface,
    borderBottom: `1px solid ${colors.line}`,
  },
  title: { margin: 0, fontSize: 17, fontWeight: 600 },
  sub: { margin: "2px 0 0", fontSize: 13, color: colors.muted },
  log: {
    flex: 1,
    overflowY: "auto",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row: (role) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: role === "user" ? "flex-end" : "flex-start",
  }),
  bubble: (role, flagged) => ({
    maxWidth: "82%",
    padding: "10px 14px",
    borderRadius: role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
    background: role === "user" ? colors.user : flagged ? colors.alertBg : colors.surface,
    color: role === "user" ? "#fff" : colors.ink,
    border: flagged ? `1px solid ${colors.alert}` : "none",
    fontSize: 15,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  }),
  mood: { marginTop: 3, fontSize: 12, color: colors.muted },
  error: {
    alignSelf: "center",
    padding: "8px 12px",
    fontSize: 13,
    color: colors.alert,
    background: colors.alertBg,
    borderRadius: 8,
  },
  form: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: `1px solid ${colors.line}`,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    resize: "none",
    maxHeight: 120,
    padding: "10px 12px",
    fontFamily: "inherit",
    fontSize: 15,
    lineHeight: 1.4,
    color: colors.ink,
    background: "#fff",
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
  },
  button: (disabled) => ({
    padding: "10px 18px",
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 600,
    color: "#fff",
    background: colors.user,
    border: "none",
    borderRadius: 10,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  }),
  note: { padding: "0 14px 10px", fontSize: 12, color: colors.muted },
  locked: {
    padding: 28,
    textAlign: "center",
    color: colors.muted,
    background: colors.surface,
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    maxWidth: 640,
    margin: "0 auto",
  },
};

const css = `
.meno-chat textarea:focus-visible,
.meno-chat button:focus-visible { outline: 2px solid ${colors.user}; outline-offset: 2px; }
.meno-dots span { display:inline-block; width:6px; height:6px; margin:0 2px; border-radius:50%;
  background:${colors.muted}; animation: meno-bounce 1s infinite ease-in-out; }
.meno-dots span:nth-child(2) { animation-delay: .15s; }
.meno-dots span:nth-child(3) { animation-delay: .3s; }
@keyframes meno-bounce { 0%,80%,100% { opacity:.3; transform:translateY(0); } 40% { opacity:1; transform:translateY(-3px); } }
@media (prefers-reduced-motion: reduce) { .meno-dots span { animation: none; opacity: .7; } }
`;

export default function Chatbot({ stage, userId = "guest" }) {
  const [messages, setMessages] = useState([
    { id: 0, role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(1);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  if (!stage) {
    return (
      <div style={s.locked}>
        Complete your assessment to unlock the chat.
      </div>
    );
  }

  async function send(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    // last few turns (skip the greeting) for conversational context
    const history = messages
      .slice(1)
      .slice(-6)
      .map(({ role, content }) => ({ role, content }));

    const userMsg = { id: nextId.current++, role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, stage, user_id: userId, history }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setMessages((m) => [
        ...m.map((msg) =>
          msg.id === userMsg.id ? { ...msg, emotion: data.emotion } : msg
        ),
        {
          id: nextId.current++,
          role: "assistant",
          content: data.reply,
          flagged: data.flagged,
        },
      ]);
    } catch (err) {
      setError(
        err.message && !err.message.startsWith("Failed")
          ? err.message
          : "Couldn't reach the chat service. Check that the backend is running, then try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <section className="meno-chat" style={s.card} aria-label="Check-in chat">
      <style>{css}</style>

      <header style={s.header}>
        <h2 style={s.title}>Check-in chat</h2>
        <p style={s.sub}>A private space to talk about how you're feeling · Stage: {stage}</p>
      </header>

      <div style={s.log} role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} style={s.row(m.role)}>
            <div style={s.bubble(m.role, m.flagged)}>{m.content}</div>
            {m.role === "user" && m.emotion && m.emotion !== "neutral" && (
              <span style={s.mood}>Sounds like: {m.emotion}</span>
            )}
          </div>
        ))}

        {loading && (
          <div style={s.row("assistant")} aria-label="MenoAssist is typing">
            <div style={s.bubble("assistant")}>
              <span className="meno-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}

        {error && <div style={s.error} role="alert">{error}</div>}
        <div ref={endRef} />
      </div>

      <form style={s.form} onSubmit={send}>
        <textarea
          style={s.input}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="How are you feeling today?"
          aria-label="Your message"
          maxLength={1500}
        />
        <button type="submit" style={s.button(loading || !input.trim())} disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
      <p style={s.note}>This chat offers support, not medical advice. For health concerns, talk to a doctor.</p>
    </section>
  );
}
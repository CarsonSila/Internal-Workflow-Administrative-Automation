import { useState, useRef, useEffect } from "react";
import { Icon } from "./icons";

interface Message {
  role: "user" | "ai";
  content: string;
  metric?: { label: string; value: string; color: string };
}

const SUGGESTIONS = [
  "Which program has the highest duplicate rate?",
  "How many unresolved identity conflicts exist?",
  "Show beneficiaries in multiple programs",
  "Summarize today's data quality issues",
];

const AI_RESPONSES: Record<string, Message> = {
  "Which program has the highest duplicate rate?": {
    role: "ai",
    content: "Vocational currently has the highest duplicate rate at 4.1%, followed by Scholarship at 3.8% — likely from beneficiaries enrolling in multiple programs with slightly different name spellings.",
    metric: { label: "Vocational Dup Rate", value: "4.1%", color: "var(--magenta)" },
  },
  "How many unresolved identity conflicts exist?": {
    role: "ai",
    content: "11 unresolved identity matches sit in the review queue. 8 are high-confidence (>90%) and likely the same person; 3 need manual review.",
    metric: { label: "Pending Reviews", value: "11", color: "var(--amber)" },
  },
  "Show beneficiaries in multiple programs": {
    role: "ai",
    content: "3,421 beneficiaries are in 2+ programs. 284 are in 3, and 12 are in all 4 — expected, and a sign the identity engine is verifying cross-program identities correctly.",
    metric: { label: "Multi-Program", value: "3,421", color: "var(--primary)" },
  },
  "Summarize today's data quality issues": {
    role: "ai",
    content: "Top issues today: 1,840 stale records (>180 days), 867 unnormalized locations, 412 missing dates of birth. Overall health: 91%, up 0.4 points from last week.",
    metric: { label: "Total Issues", value: "3,119", color: "var(--amber)" },
  },
};

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "14px 16px", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--primary)", opacity: 0.6,
          animation: `live-dot 1.2s ease-in-out infinite`,
          animationDelay: `${i * 0.2}s`,
        }}/>
      ))}
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "I'm PLP Intelligence. Ask me anything about beneficiary identity, data quality, or program analytics." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, open]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const response = AI_RESPONSES[text] || {
        role: "ai" as const,
        content: `I've looked at the identity graph for "${text}" and found relevant patterns across ${Math.floor(Math.random() * 500 + 100)} records. Want me to drill into a specific program or time range?`,
      };
      setMessages(prev => [...prev, response]);
    }, 1000 + Math.random() * 500);
  };

  return (
    <>
      {/* Trigger bubble — always visible, bottom-right, above everything */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open PLP Intelligence assistant"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 500,
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--primary)", color: "var(--primary-foreground)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "var(--shadow-lg)",
            fontSize: 22,
            animation: "fadeIn 0.3s both",
          }}
        >
          ⚡
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div
          className="glass animate-in"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 500,
            width: 360, maxWidth: "calc(100vw - 32px)",
            height: 480, maxHeight: "calc(100vh - 100px)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary-dim), var(--magenta-dim))",
              border: "1.5px solid var(--primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "var(--primary)", flexShrink: 0,
            }}>⚡</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>PLP Intelligence</div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>Identity graph assistant</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="btn btn-ghost"
              style={{ padding: "4px 8px", fontSize: 12 }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  animation: "fadeIn 0.25s both",
                }}>
                  <div style={{
                    maxWidth: "82%",
                    background: m.role === "user" ? "var(--primary-dim)" : "var(--bg3)",
                    border: `1px solid ${m.role === "user" ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: m.role === "user"
                      ? "var(--radius) var(--radius-sm) var(--radius) var(--radius)"
                      : "var(--radius-sm) var(--radius) var(--radius) var(--radius)",
                    padding: "10px 12px",
                  }}>
                    <p style={{ fontSize: 12.5, color: "var(--text)", margin: 0, lineHeight: 1.5 }}>{m.content}</p>
                    {m.metric && (
                      <div style={{
                        marginTop: 8, padding: "8px 10px",
                        background: `${m.metric.color}10`,
                        border: `1px solid ${m.metric.color}25`,
                        borderRadius: "var(--radius-sm)",
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: m.metric.color }}>{m.metric.value}</div>
                        <div style={{ fontSize: 10, color: "var(--text-2)" }}>{m.metric.label}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm) var(--radius) var(--radius) var(--radius)" }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Suggestions — only before the conversation grows, to save space */}
          {messages.length === 1 && (
            <div style={{ padding: "0 16px 10px", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} className="btn btn-ghost" style={{ fontSize: 10, padding: "4px 8px" }}
                    onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{ flexShrink: 0, padding: "10px 12px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(input)}
              placeholder="Ask about identities, duplicates…"
              style={{ flex: 1, borderRadius: "var(--radius)", padding: "8px 12px", fontSize: 12 }}
            />
            <button className="btn btn-primary" onClick={() => sendMessage(input)} style={{ padding: "8px 14px", fontSize: 12 }}>
              <Icon.ArrowRight />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

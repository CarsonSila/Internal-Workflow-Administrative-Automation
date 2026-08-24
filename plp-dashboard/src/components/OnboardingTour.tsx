import { useEffect, useRef, useState } from "react";
import { toursEnabled, TOURS_ENABLED_EVENT, RESTART_TOUR_EVENT } from "./tourSettings";

export interface TourStep {
  target: string;
  title: string;
  body: string;
}

export function useOnboarding(pageKey: string, steps: TourStep[]) {
  const storageKey = `plp_onboarding_${pageKey}`;
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (steps.length === 0 || !toursEnabled()) return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) setActive(true);
  }, [pageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onSettingChange = (e: Event) => {
      const enabled = (e as CustomEvent<boolean>).detail;
      if (!enabled) { setActive(false); setStepIndex(0); }
    };
    const onRestart = () => { setStepIndex(0); setActive(true); };
    window.addEventListener(TOURS_ENABLED_EVENT, onSettingChange);
    window.addEventListener(RESTART_TOUR_EVENT, onRestart);
    return () => {
      window.removeEventListener(TOURS_ENABLED_EVENT, onSettingChange);
      window.removeEventListener(RESTART_TOUR_EVENT, onRestart);
    };
  }, []);

  const dismiss = () => { localStorage.setItem(storageKey, "1"); setActive(false); setStepIndex(0); };
  const next = () => { if (stepIndex >= steps.length - 1) dismiss(); else setStepIndex(i => i + 1); };
  const restart = () => { setStepIndex(0); setActive(true); };

  return { active, stepIndex, steps, next, dismiss, restart };
}

const EDGE_MARGIN = 12;
const SETTLE_FRAMES = 90;
const STABLE_STREAK = 3;

export function OnboardingTour({ active, stepIndex, steps, next, dismiss }: ReturnType<typeof useOnboarding>) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[stepIndex];
  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    if (!active || !step) { setRect(null); return; }

    let rafId = 0;
    let attempts = 0;
    let stableStreak = 0;
    let lastRect: DOMRect | null = null;
    let scrolledOnce = false;
    

    const sameRect = (a: DOMRect, b: DOMRect) =>
      a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

    const measure = () => {
      const el = document.querySelector(step.target);
      if (!el) {
        attempts++;
        if (attempts > SETTLE_FRAMES) { nextRef.current(); return; }
        rafId = requestAnimationFrame(measure);
        return;
      }

      if (!scrolledOnce) {
        el.scrollIntoView({ behavior: "auto", block: "center" });
        scrolledOnce = true;
        rafId = requestAnimationFrame(measure);
        return;
      }

      const r = el.getBoundingClientRect();
      if (lastRect && sameRect(lastRect, r)) stableStreak++;
      else stableStreak = 0;
      lastRect = r;

      if (stableStreak >= STABLE_STREAK) {
        setRect(r);
        return;
      }
      attempts++;
      if (attempts < SETTLE_FRAMES) rafId = requestAnimationFrame(measure);
      else nextRef.current();
    };
    rafId = requestAnimationFrame(measure);

    const onWindowChange = () => {
      const el = document.querySelector(step.target);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
    };
  }, [active, step]);

  if (!active || !step || !rect) return null;

  // Slightly larger pad than before, so the box more reliably covers the
  // full intended element including its own border/shadow, not just its
  // exact content box.
  const pad = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spotLeft = Math.max(rect.left - pad, EDGE_MARGIN);
  const spotTop = Math.max(rect.top - pad, EDGE_MARGIN);
  const spotRight = Math.min(rect.right + pad, vw - EDGE_MARGIN);
  const spotBottom = Math.min(rect.bottom + pad, vh - EDGE_MARGIN);
  const spotWidth = Math.max(spotRight - spotLeft, 0);
  const spotHeight = Math.max(spotBottom - spotTop, 0);

  const tooltipWidth = Math.min(280, vw - EDGE_MARGIN * 2);
  const tooltipTop = rect.bottom + pad + 12 < vh - 140
    ? Math.min(rect.bottom + pad + 12, vh - 160)
    : Math.max(rect.top - 12 - 130, EDGE_MARGIN);
  const tooltipLeft = Math.min(Math.max(rect.left, EDGE_MARGIN), vw - tooltipWidth - EDGE_MARGIN);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, overflow: "hidden" }}>
      <div onClick={dismiss} style={{
        position: "absolute", top: spotTop, left: spotLeft,
        width: spotWidth, height: spotHeight,
        borderRadius: "var(--radius)", boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
        border: "2px solid var(--primary)", pointerEvents: "none",
        transition: "top 0.3s var(--ease-out), left 0.3s var(--ease-out), width 0.3s var(--ease-out), height 0.3s var(--ease-out)",
      }} />
      <div onClick={dismiss} style={{ position: "absolute", inset: 0 }} />
      <div className="glass" style={{
        position: "absolute", top: tooltipTop, left: tooltipLeft,
        width: tooltipWidth, padding: 16, zIndex: 601,
        transition: "top 0.3s var(--ease-out), left 0.3s var(--ease-out)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.06em", marginBottom: 6 }}>
          STEP {stepIndex + 1} OF {steps.length}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{step.title}</div>
        <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5, margin: "0 0 14px" }}>{step.body}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: "5px 10px" }} onClick={dismiss}>Skip</button>
          <button className="btn btn-primary" style={{ fontSize: 11, padding: "5px 14px" }} onClick={next}>
            {stepIndex >= steps.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";

const INCOME_THRESHOLDS = {
  1: 89000,
  2: 112000,
  3: 135000,
};

function getThreshold(children) {
  if (children <= 3) return INCOME_THRESHOLDS[children];
  return 135000 + (children - 3) * 23000;
}

function getAbatementStart(children) {
  const cutoff = getThreshold(children);
  return cutoff - 18000;
}

function calcWeeklyAmount(income, children) {
  const fullCutoff = getThreshold(children);
  const abateStart = getAbatementStart(children);
  if (income <= abateStart) return 50;
  if (income >= fullCutoff) return 0;
  const ratio = (fullCutoff - income) / (fullCutoff - abateStart);
  return Math.round(50 * ratio);
}

const questions = [
  {
    id: "children",
    label: "Do you have dependent children?",
    sublabel: "Children under 18 living with you",
    type: "yesno",
  },
  {
    id: "numChildren",
    label: "How many dependent children?",
    type: "stepper",
    showIf: (a) => a.children === true,
  },
  {
    id: "employed",
    label: "Is at least one parent in paid employment?",
    sublabel: "Full-time or part-time, any hours count",
    type: "yesno",
    showIf: (a) => a.children === true,
  },
  {
    id: "benefit",
    label: "Does either parent receive a main benefit?",
    sublabel: "Jobseeker Support, Sole Parent Support, Supported Living Payment, Youth Payment, Young Parent Payment",
    type: "yesno",
    showIf: (a) => a.children === true && a.employed === true,
  },
  {
    id: "income",
    label: "What is your combined household income?",
    sublabel: "Before tax, both parents combined (annual NZD)",
    type: "income",
    showIf: (a) => a.children === true && a.employed === true && a.benefit === false,
  },
];

function IncomeInput({ numChildren, onConfirm }) {
  const cutoff = getThreshold(numChildren);
  const sliderMax = Math.round(cutoff * 1.2 / 10000) * 10000;
  const abateStart = getAbatementStart(numChildren);

  const [sliderVal, setSliderVal] = useState(Math.round(sliderMax * 0.45));
  const [manualVal, setManualVal] = useState("");
  const [isManual, setIsManual] = useState(false);

  const displayVal = isManual
    ? (Number(manualVal.replace(/,/g, "")) || sliderVal)
    : sliderVal;

  const weekly = calcWeeklyAmount(displayVal, numChildren);

  const abatePct = (abateStart / sliderMax) * 100;
  const cutoffPct = (cutoff / sliderMax) * 100;

  const trackBg = `linear-gradient(to right,
    #10b981 0%, #10b981 ${abatePct}%,
    #f59e0b ${abatePct}%, #f59e0b ${cutoffPct}%,
    rgba(239,68,68,0.4) ${cutoffPct}%, rgba(239,68,68,0.4) 100%)`;

  const liveColor = weekly === 50 ? "#10b981" : weekly > 0 ? "#f59e0b" : "#ef4444";
  const liveLabel = weekly === 50
    ? `Full $50 / week · $2,600 / year`
    : weekly > 0
    ? `~$${weekly} / week (approximate — abated rate) · ~$${weekly * 52} / year`
    : `Not eligible — above $${cutoff.toLocaleString()} threshold`;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <style>{`
        .isl { -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:6px; outline:none; cursor:pointer; }
        .isl::-webkit-slider-thumb { -webkit-appearance:none; width:24px; height:24px; border-radius:50%; background:#fff; border:3px solid #0ea5e9; box-shadow:0 2px 8px rgba(0,0,0,0.4); cursor:pointer; }
        .isl::-moz-range-thumb { width:24px; height:24px; border-radius:50%; background:#fff; border:3px solid #0ea5e9; box-shadow:0 2px 8px rgba(0,0,0,0.4); cursor:pointer; border:none; }
      `}</style>

      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:13, color:"#475569", fontFamily:"monospace", flexShrink:0 }}>NZD</span>
        {isManual ? (
          <input
            autoFocus
            type="number"
            value={manualVal}
            onChange={e => setManualVal(e.target.value)}
            onBlur={() => {
              const v = Number(manualVal);
              if (!isNaN(v) && v >= 0) setSliderVal(Math.min(v, sliderMax));
              setIsManual(false);
            }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                const v = Number(manualVal);
                if (!isNaN(v) && v >= 0) setSliderVal(Math.min(v, sliderMax));
                setIsManual(false);
              }
            }}
            style={{
              background:"transparent", border:"none",
              borderBottom:"2px solid #0ea5e9",
              color:"#f1f5f9", fontSize:36, fontWeight:800,
              fontFamily:"monospace", outline:"none",
              width:"100%", padding:"2px 0",
            }}
          />
        ) : (
          <button
            onClick={() => { setManualVal(String(displayVal)); setIsManual(true); }}
            title="Click to type a value"
            style={{
              background:"none", border:"none", borderBottom:"2px solid rgba(255,255,255,0.08)",
              cursor:"text", fontSize:36, fontWeight:800,
              fontFamily:"monospace", color:"#f1f5f9",
              padding:"2px 0", textAlign:"left", width:"100%",
            }}
          >
            ${displayVal.toLocaleString()}
          </button>
        )}
        <span style={{ fontSize:11, color:"#334155", fontFamily:"sans-serif", flexShrink:0 }}>tap to type</span>
      </div>

      <input
        className="isl"
        type="range"
        aria-label="Combined household income before tax"
        min={0} max={sliderMax} step={1000}
        value={sliderVal}
        style={{ background: trackBg }}
        onChange={e => {
          const v = Number(e.target.value);
          setSliderVal(v);
          setManualVal(String(v));
        }}
      />

      <div style={{ position:"relative", height:16, fontSize:10, fontFamily:"monospace", marginTop:-10 }}>
        <span style={{ position:"absolute", left:0, color:"#10b981" }}>$0</span>
        <span style={{ position:"absolute", left:`${abatePct}%`, transform:"translateX(-50%)", color:"#f59e0b" }}>
          ${(abateStart/1000).toFixed(0)}k
        </span>
        <span style={{ position:"absolute", left:`${Math.min(cutoffPct,92)}%`, transform:"translateX(-50%)", color:"#ef4444" }}>
          ${(cutoff/1000).toFixed(0)}k
        </span>
      </div>

      <div style={{
        display:"flex", alignItems:"center", gap:12,
        background:`${liveColor}18`,
        border:`1.5px solid ${liveColor}55`,
        borderRadius:12, padding:"14px 16px",
        transition:"all 0.25s ease",
      }}>
        <div style={{
          width:10, height:10, borderRadius:"50%",
          background:liveColor, flexShrink:0,
          boxShadow:`0 0 8px ${liveColor}`,
        }} />
        <div>
          <div style={{ fontFamily:"monospace", fontWeight:700, fontSize:15, color:liveColor }}>{liveLabel}</div>
          <div style={{ fontSize:11, color:"#475569", marginTop:2, fontFamily:"sans-serif" }}>
            {weekly > 0
              ? "Starts 7 April 2026 · ends when 91 petrol < $3/L for 4 weeks"
              : "Adjust income or number of children above"}
          </div>
        </div>
      </div>

      <button
        onClick={() => onConfirm(displayVal)}
        style={{
          padding:"13px", background:"#0ea5e9", color:"#fff",
          border:"none", borderRadius:10, cursor:"pointer",
          fontSize:14, fontWeight:700, fontFamily:"sans-serif",
          letterSpacing:"0.03em",
        }}
      >
        Confirm &amp; See Full Result →
      </button>
    </div>
  );
}

function Result({ answers }) {
  const { children, employed, benefit, income, numChildren } = answers;

  if (!children)
    return <Verdict type="no" reason="No dependent children" detail="This relief targets working families with dependent children under 18." />;
  if (!employed)
    return <Verdict type="no" reason="No parent in paid work" detail="At least one parent must be in paid employment — full-time or part-time." />;
  if (benefit)
    return <Verdict type="no" reason="Main benefit received" detail="Families where either parent receives a main benefit are excluded from this boost. Your benefit payments are adjusted from 1 April under normal indexing. Check ird.govt.nz/working-for-families for other credits you may still be entitled to." />;

  const kids = numChildren || 1;
  const inc = income || 0;
  const threshold = getThreshold(kids);
  const weekly = calcWeeklyAmount(inc, kids);
  const annual = weekly * 52;

  if (weekly === 0)
    return (
      <Verdict
        type="no"
        reason="Income above threshold"
        detail={`For ${kids} child${kids > 1 ? "ren" : ""}, the household income cutoff is $${threshold.toLocaleString()}. Your income of $${inc.toLocaleString()} is above this limit.`}
      />
    );

  if (weekly === 50)
    return (
      <Verdict
        type="yes"
        reason="You qualify — full payment"
        detail="You're eligible for the full $50/week boost, starting 7 April 2026."
        weekly={50}
        annual={2600}
      />
    );

  return (
    <Verdict
      type="partial"
      reason="You qualify — reduced payment"
      detail="Your income is in the abatement zone. You'll receive a reduced amount (approximate — exact rate to be confirmed by IRD) starting 7 April 2026."
      weekly={weekly}
      annual={annual}
    />
  );
}

function Verdict({ type, reason, detail, weekly, annual }) {
  const config = {
    yes: { bg: "rgba(16,185,129,0.12)", border: "#10b981", icon: "✓", color: "#10b981", label: "ELIGIBLE" },
    partial: { bg: "rgba(245,158,11,0.12)", border: "#f59e0b", icon: "◑", color: "#f59e0b", label: "PARTIALLY ELIGIBLE" },
    no: { bg: "rgba(239,68,68,0.1)", border: "#ef4444", icon: "✕", color: "#ef4444", label: "NOT ELIGIBLE" },
  }[type];

  return (
    <div style={{
      background: config.bg,
      border: `1.5px solid ${config.border}`,
      borderRadius: 16,
      padding: "28px 28px 24px",
      marginTop: 8,
      animation: "fadeUp 0.4s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{
          width: 36, height: 36, borderRadius: "50%",
          background: config.border, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 700, flexShrink: 0,
        }}>{config.icon}</span>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", color: config.color, fontWeight: 700, fontFamily: "monospace" }}>{config.label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>{reason}</div>
        </div>
      </div>
      <p style={{ margin: "0 0 0 48px", color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>{detail}</p>
      {weekly !== undefined && (
        <div style={{ margin: "20px 0 0 48px", display: "flex", gap: 16 }}>
          {[
            { label: "Per week", val: `$${weekly}` },
            { label: "Per year (est.)", val: `$${annual.toLocaleString()}` },
          ].map(({ label, val }) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "12px 20px", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: config.color, fontFamily: "monospace" }}>{val}</div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
            </div>
          ))}
        </div>
      )}
      {type !== "no" && (
        <div style={{ margin: "16px 0 0 48px", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
          ⚡ Payments start <strong style={{color:"#94a3b8"}}>7 April 2026</strong> · Ends when 91 petrol &lt; $3/L for 4 weeks, or after 12 months · Verify eligibility at <strong style={{color:"#94a3b8"}}>ird.govt.nz</strong>
        </div>
      )}
    </div>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: "NZ IWTC Eligibility Calculator", text: "Check if you qualify for the $50/week fuel relief boost", url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <button onClick={share} aria-label="Share this calculator" style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)",
      borderRadius: 8, padding: "7px 13px", cursor: "pointer",
      color: copied ? "#10b981" : "#0ea5e9", fontSize: 12,
      fontFamily: "sans-serif", fontWeight: 600,
      transition: "all 0.2s", whiteSpace: "nowrap",
    }}>
      {copied ? "✓ Copied!" : "⬆ Share"}
    </button>
  );
}

export default function App() {
  const [answers, setAnswers] = useState({ numChildren: 1 });
  const [active, setActive] = useState(0);

  const visibleQuestions = questions.filter(q => !q.showIf || q.showIf(answers));

  const answer = (id, val) => {
    const next = { ...answers, [id]: val };
    if (id === "children" && !val) { setAnswers({ numChildren: 1, children: false }); setActive(0); return; }
    if (id === "employed" && !val) { delete next.benefit; delete next.income; }
    if (id === "benefit" && val) { delete next.income; }
    setAnswers(next);
    const nextVisible = questions.filter(q => !q.showIf || q.showIf(next));
    const nextIdx = nextVisible.findIndex(q => q.id === id) + 1;
    setActive(Math.min(nextIdx, nextVisible.length - 1));
  };

  const isDone = (() => {
    if (answers.children === false) return true;
    if (answers.employed === false) return true;
    if (answers.benefit === true) return true;
    if (answers.income !== undefined) return true;
    return false;
  })();

  const progress = isDone ? 100 : (active / Math.max(visibleQuestions.length - 1, 1)) * 90;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f1e",
      color: "#f1f5f9",
      fontFamily: "'Georgia', serif",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "40px 16px 60px",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        button:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 560 }}>

        <div style={{
          display:"flex", alignItems:"center", gap:10,
          background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)",
          borderRadius:10, padding:"10px 14px", marginBottom:24,
          fontFamily:"sans-serif",
        }}>
          <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
          <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.5 }}>
            <strong style={{ color:"#f59e0b" }}>Scheme status: Active as of 25 March 2026.</strong>{" "}
            Payments begin 7 April. This relief ends when 91 octane petrol drops below $3/L for 4 consecutive weeks, or after 12 months.{" "}
            <a href="https://www.ird.govt.nz" target="_blank" rel="noopener noreferrer" style={{ color:"#0ea5e9" }}>Confirm at ird.govt.nz →</a>
          </div>
        </div>

        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                background: "linear-gradient(135deg, #1e3a5f, #0ea5e9)",
                width: 40, height: 40, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>🇳🇿</div>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#0ea5e9", textTransform: "uppercase", fontFamily: "monospace" }}>New Zealand · March 2026</div>
                <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>Fuel Crisis Relief Package</div>
              </div>
            </div>
            <ShareButton />
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 6, padding: "4px 10px", marginBottom: 14,
          }}>
            <span style={{ fontSize: 10, color: "#ef4444" }}>⚠</span>
            <span style={{ fontSize: 10, color: "#ef4444", fontFamily: "monospace", letterSpacing: "0.05em" }}>
              UNOFFICIAL TOOL · Not affiliated with IRD or the NZ Government
            </span>
          </div>

          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: "#f8fafc" }}>
            In-Work Tax Credit<br />
            <span style={{ color: "#0ea5e9" }}>Eligibility Calculator</span>
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 8, lineHeight: 1.6, fontFamily: "sans-serif" }}>
            Based on the Government's $50/week temporary boost announced 25 March 2026. Confirm your result at{" "}
            <a href="https://www.ird.govt.nz/working-for-families/types/in-work-tax-credit/" target="_blank" rel="noopener noreferrer" style={{ color: "#0ea5e9" }}>ird.govt.nz</a>.
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 3, marginBottom: 32 }}>
          <div style={{
            height: "100%", borderRadius: 4,
            background: "linear-gradient(90deg, #0ea5e9, #06b6d4)",
            width: `${progress}%`, transition: "width 0.4s ease",
          }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {visibleQuestions.map((q, qi) => {
            const isActive = qi === active && !isDone;
            const isAnswered = answers[q.id] !== undefined;
            const isPast = qi < active || isDone;

            return (
              <div key={q.id} style={{
                background: isActive ? "rgba(14,165,233,0.06)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isActive ? "rgba(14,165,233,0.3)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 14,
                padding: "20px 22px",
                transition: "all 0.3s ease",
                opacity: isPast || isActive ? 1 : 0.4,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: q.sublabel ? 4 : 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: isActive ? "#f1f5f9" : "#94a3b8", lineHeight: 1.3 }}>{q.label}</div>
                    {q.sublabel && <div style={{ fontSize: 12, color: "#475569", marginTop: 2, fontFamily: "sans-serif" }}>{q.sublabel}</div>}
                  </div>
                  {isAnswered && !isActive && (
                    <div style={{
                      fontSize: 11, color: "#0ea5e9", background: "rgba(14,165,233,0.1)",
                      border: "1px solid rgba(14,165,233,0.2)", borderRadius: 20,
                      padding: "2px 10px", whiteSpace: "nowrap", marginLeft: 12, fontFamily: "monospace",
                    }}>
                      {q.type === "yesno" ? (answers[q.id] ? "Yes" : "No")
                        : q.type === "stepper" ? `${answers[q.id]} child${answers[q.id] > 1 ? "ren" : ""}`
                        : `$${Number(answers[q.id]).toLocaleString()}`}
                    </div>
                  )}
                </div>

                {isActive && (
                  <div style={{ marginTop: 14 }}>
                    {q.type === "yesno" && (
                      <div style={{ display: "flex", gap: 10 }}>
                        {[true, false].map(val => (
                          <button key={String(val)} aria-label={`${q.label} — ${val ? "Yes" : "No"}`} onClick={() => answer(q.id, val)} style={{
                            flex: 1, padding: "11px 0",
                            background: answers[q.id] === val ? "#0ea5e9" : "rgba(255,255,255,0.05)",
                            color: answers[q.id] === val ? "#fff" : "#94a3b8",
                            border: `1px solid ${answers[q.id] === val ? "#0ea5e9" : "rgba(255,255,255,0.1)"}`,
                            borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600,
                            transition: "all 0.2s", fontFamily: "sans-serif",
                          }}>{val ? "Yes" : "No"}</button>
                        ))}
                      </div>
                    )}

                    {q.type === "stepper" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {[1,2,3,4,5,6].map(n => (
                          <button key={n} onClick={() => answer(q.id, n)} style={{
                            width: 44, height: 44,
                            background: answers.numChildren === n ? "#0ea5e9" : "rgba(255,255,255,0.05)",
                            color: answers.numChildren === n ? "#fff" : "#94a3b8",
                            border: `1px solid ${answers.numChildren === n ? "#0ea5e9" : "rgba(255,255,255,0.1)"}`,
                            borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 700,
                            transition: "all 0.2s",
                          }}>{n === 6 ? "6+" : n}</button>
                        ))}
                        <button onClick={() => { answer(q.id, answers.numChildren || 1); }} style={{
                          marginLeft: "auto", padding: "10px 20px",
                          background: "#0ea5e9", color: "#fff", border: "none",
                          borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                          fontFamily: "sans-serif",
                        }}>Continue →</button>
                      </div>
                    )}

                    {q.type === "income" && (
                      <IncomeInput
                        numChildren={answers.numChildren || 1}
                        onConfirm={val => answer("income", val)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isDone && (
          <div style={{ marginTop: 24 }}>
            <Result answers={answers} />
          </div>
        )}

        {isDone && (
          <button onClick={() => { setAnswers({ numChildren: 1 }); setActive(0); }} style={{
            marginTop: 20, width: "100%", padding: "12px",
            background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
            color: "#475569", borderRadius: 10, cursor: "pointer",
            fontSize: 13, fontFamily: "sans-serif",
          }}>← Start over</button>
        )}

        <div style={{ marginTop: 40, padding: "18px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 10, borderLeft: "3px solid #1e3a5f" }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#475569", fontWeight: 700, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>Important — Please Read</p>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: "#334155", lineHeight: 1.7, fontFamily: "sans-serif" }}>
            <strong style={{ color: "#475569" }}>Not financial or legal advice.</strong> This tool is for general information purposes only. It does not constitute financial, tax, or legal advice and must not be relied upon as such. Your actual eligibility and payment amount can only be confirmed by Inland Revenue (IRD).
          </p>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: "#334155", lineHeight: 1.7, fontFamily: "sans-serif" }}>
            <strong style={{ color: "#475569" }}>Subject to legislative change.</strong> This calculator reflects policy details announced 25 March 2026. The enabling legislation has not yet passed. Income thresholds, abatement rates, and eligibility criteria may change before or after the scheme comes into effect on 7 April 2026.
          </p>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: "#334155", lineHeight: 1.7, fontFamily: "sans-serif" }}>
            <strong style={{ color: "#475569" }}>Abatement estimates are approximate.</strong> IRD has not published the exact abatement formula for this temporary boost. Reduced payment amounts shown are indicative only.
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "#334155", lineHeight: 1.7, fontFamily: "sans-serif" }}>
            <strong style={{ color: "#475569" }}>No data collected.</strong> This calculator runs entirely in your browser. No personal information is transmitted or stored.{" "}
            Last verified: <strong style={{ color: "#475569" }}>25 March 2026</strong> ·{" "}
            <a href="https://www.ird.govt.nz/working-for-families/types/in-work-tax-credit/" target="_blank" rel="noopener noreferrer" style={{ color: "#0ea5e9" }}>Official IRD source →</a>
          </p>
        </div>
      </div>
    </div>
  );
}
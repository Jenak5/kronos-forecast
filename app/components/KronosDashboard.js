"use client";

import { useState, useEffect, useCallback } from "react";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const API_BASE = "https://jenak5-kronos-forecast.hf.space";

export default function KronosDashboard() {
  const [instrument, setInstrument] = useState("NQ");
  const [timeframe, setTimeframe] = useState("1h");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/forecast?instrument=${instrument}&timeframe=${timeframe}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      setData(await res.json());
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [instrument, timeframe]);

  useEffect(() => { fetchForecast(); }, [fetchForecast]);

  const fmt = (ts) => { const d = new Date(ts); return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`; };

  const chartData = data ? [
    ...data.historical.map(c => ({ label: fmt(c.timestamp), close: c.close, type: "hist" })),
    ...data.forecast_mean.map((c, i) => ({ label: "→ "+fmt(c.timestamp), fcMean: c.close, fcUpper: data.forecast_upper[i].close, fcLower: data.forecast_lower[i].close, type: "fc" })),
  ] : [];

  if (chartData.length > 0 && data) {
    const b = data.historical.length - 1;
    chartData[b].fcMean = chartData[b].close;
    chartData[b].fcUpper = chartData[b].close;
    chartData[b].fcLower = chartData[b].close;
  }

  const allP = chartData.flatMap(d => [d.close, d.fcMean, d.fcUpper, d.fcLower].filter(Boolean));
  const yMin = allP.length ? Math.floor(Math.min(...allP) - 30) : 0;
  const yMax = allP.length ? Math.ceil(Math.max(...allP) + 30) : 100;

  const dirColor = data?.direction === "BULLISH" ? "#22c55e" : data?.direction === "BEARISH" ? "#ef4444" : "#f59e0b";
  const confLabel = data?.confidence > 70 ? "High" : data?.confidence > 40 ? "Moderate" : "Low";
  const volColor = data?.volatility_ratio < 0.8 ? "#22c55e" : data?.volatility_ratio < 1.2 ? "#a1a1aa" : data?.volatility_ratio < 1.5 ? "#f59e0b" : "#ef4444";
  const volLabel = data?.volatility_ratio < 0.6 ? "Compressed" : data?.volatility_ratio < 0.8 ? "Low" : data?.volatility_ratio < 1.2 ? "Normal" : data?.volatility_ratio < 1.5 ? "Elevated" : "Very High";
  const lastClose = data?.historical?.[data.historical.length-1]?.close;
  const fcFinal = data?.forecast_mean?.[data.forecast_mean.length-1]?.close;
  const pctMove = lastClose && fcFinal ? (((fcFinal-lastClose)/lastClose)*100).toFixed(2) : null;

  const magicCtx = () => {
    if (!data || timeframe !== "4h") return null;
    const vr = data.volatility_ratio;
    if (vr < 0.6) return { text: "Compressed vol — Magic Hour reversion 94.6% reliable. 5.4% fail rate. Full size fade-to-midpoint.", color: "#22c55e", pct: "94.6%" };
    if (vr < 0.8) return { text: "Low vol — Magic Hour reversion 93.6% reliable. 6.4% fail rate. Strong fade conditions.", color: "#22c55e", pct: "93.6%" };
    if (vr < 1.2) return { text: "Normal vol — Magic Hour reversion 90.3% reliable. Standard conditions.", color: "#a1a1aa", pct: "90.3%" };
    return { text: "Elevated vol — Magic Hour reversion drops to 84.5%. 15.5% fail rate. Reduce size or skip.", color: "#ef4444", pct: "84.5%" };
  };

  const sniperCtx = () => {
    if (!data || timeframe !== "1h") return null;
    const vr = data.volatility_ratio;
    const z = instrument === "NQ" ? "≥18pt" : "≥5pt";
    if (vr < 1.2) return { text: `Low vol — Sniper ELITE zones at 65.9% WR. Full size if ELITE (${z}) aligns.`, color: "#22c55e", pct: "65.9%" };
    if (vr < 1.5) return { text: "Normal vol — Sniper at 59.8% WR. Full size ELITE, half size GOOD.", color: "#f59e0b", pct: "59.8%" };
    return { text: "Elevated vol — Sniper accuracy drops. Half size only, ELITE zones required.", color: "#ef4444", pct: "—" };
  };

  const mc = magicCtx();
  const sc = sniperCtx();
  const ctx = mc || sc;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (<div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 6, padding: "8px 12px", fontSize: 11, fontFamily: "monospace", color: "#e4e4e7" }}>
      <div style={{ color: "#71717a", marginBottom: 4 }}>{label}</div>
      {payload.filter(p => p.value != null).map((p, i) => (<div key={i} style={{ color: p.color || "#e4e4e7" }}>{p.name}: {p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>))}
    </div>);
  };

  const tfLabels = { "5m": "Entry timing", "15m": "Structure", "1h": "Sniper vol", "4h": "Magic Hr vol" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e4e4e7", fontFamily: "'SF Mono','Fira Code',monospace" }}>
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #1e1e2a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#fafafa" }}>KRONOS</span>
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#1e1e2a", color: "#71717a", letterSpacing: "1.5px", fontWeight: 600 }}>NQ+ES v4</span>
            </div>
            <div style={{ fontSize: 10, color: "#52525b", marginTop: 4 }}>{data ? `Updated ${new Date(data.generated_at).toLocaleString()}` : "Loading…"}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {["NQ","ES"].map(inst => (<button key={inst} onClick={() => setInstrument(inst)} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", border: "1px solid", borderColor: instrument===inst?"#3b82f6":"#27272a", borderRadius: 4, background: instrument===inst?"#1e3a5f":"#18181b", color: instrument===inst?"#60a5fa":"#71717a", cursor: "pointer" }}>{inst}</button>))}
            <div style={{ width: 1, height: 18, background: "#27272a", margin: "0 2px" }} />
            {["5m","15m","1h","4h"].map(tf => (<button key={tf} onClick={() => setTimeframe(tf)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", border: "1px solid", borderColor: timeframe===tf?"#8b5cf6":"#27272a", borderRadius: 4, background: timeframe===tf?"#2e1065":"#18181b", color: timeframe===tf?"#a78bfa":"#71717a", cursor: "pointer" }}>
              <div>{tf}</div>
              <div style={{ fontSize: 8, color: timeframe===tf?"#7c3aed":"#3f3f46", marginTop: 1 }}>{tfLabels[tf]}</div>
            </button>))}
            <button onClick={fetchForecast} disabled={loading} style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", border: "1px solid #27272a", borderRadius: 4, background: "#18181b", color: loading?"#52525b":"#fafafa", cursor: loading?"wait":"pointer", marginLeft: 2 }}>{loading ? "⏳" : "↻"}</button>
          </div>
        </div>
      </div>

      {error && (<div style={{ margin: "16px 24px", padding: "12px 16px", background: "#1c1917", border: "1px solid #422006", borderRadius: 6, fontSize: 12, color: "#d97706" }}>{error.includes("Failed to fetch") ? "⚠ API sleeping — wait ~2 min and refresh." : `⚠ ${error}`}</div>)}

      {data && (<>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "14px 24px 6px" }}>
          <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>DIRECTION</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: dirColor }}>{data.direction==="BULLISH"?"▲":data.direction==="BEARISH"?"▼":"◆"} {data.direction}</div>
          </div>
          <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>CONFIDENCE</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 18, fontWeight: 700, color: data.confidence>70?"#22c55e":data.confidence>40?"#f59e0b":"#71717a" }}>{Math.round(data.confidence)}%</span><span style={{ fontSize: 10, color: "#52525b" }}>{confLabel}</span></div>
            <div style={{ height: 3, background: "#27272a", borderRadius: 2, marginTop: 6 }}><div style={{ width: `${Math.min(data.confidence,100)}%`, height: "100%", background: data.confidence>70?"#22c55e":data.confidence>40?"#f59e0b":"#71717a", borderRadius: 2 }} /></div>
          </div>
          <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>VOL RATIO</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 18, fontWeight: 700, color: volColor }}>{data.volatility_ratio.toFixed(1)}×</span><span style={{ fontSize: 10, color: volColor }}>{volLabel}</span></div>
          </div>
          <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>PREDICTED MOVE</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 18, fontWeight: 700, color: pctMove>0?"#22c55e":pctMove<0?"#ef4444":"#71717a" }}>{pctMove>0?"+":""}{pctMove}%</span></div>
            <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>{lastClose?.toLocaleString()} → {fcFinal?.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
          </div>
        </div>

        {ctx && (<div style={{ padding: "6px 24px" }}>
          <div style={{ background: "#12121a", border: `1px solid ${ctx.color}33`, borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: ctx.color, minWidth: 70, textAlign: "center" }}>{ctx.pct}</div>
            <div>
              <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 4 }}>{mc ? "MAGIC HOUR REVERSION (6-8 AM ET)" : "SNIPER WINDOW (11 AM-12 PM ET)"}</div>
              <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.5 }}>{ctx.text}</div>
            </div>
          </div>
        </div>)}

        <div style={{ padding: "8px 24px 4px" }}>
          <div style={{ background: "#0d0d14", border: "1px solid #1e1e2a", borderRadius: 8, padding: "16px 8px 8px 0" }}>
            <div style={{ display: "flex", gap: 16, padding: "0 0 8px 16px", fontSize: 10, color: "#52525b" }}>
              <span><span style={{ display: "inline-block", width: 12, height: 2, background: "#60a5fa", marginRight: 4, verticalAlign: "middle" }} />Historical</span>
              <span><span style={{ display: "inline-block", width: 12, height: 2, background: "#22c55e", marginRight: 4, verticalAlign: "middle" }} />Forecast</span>
              <span><span style={{ display: "inline-block", width: 12, height: 6, background: "rgba(34,197,94,0.15)", marginRight: 4, verticalAlign: "middle", borderRadius: 1 }} />Confidence band</span>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="#1a1a24" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "#3f3f46", fontSize: 9 }} axisLine={{ stroke: "#27272a" }} tickLine={false} interval={Math.floor(chartData.length/8)} />
                <YAxis domain={[yMin,yMax]} tick={{ fill: "#3f3f46", fontSize: 9 }} axisLine={{ stroke: "#27272a" }} tickLine={false} tickFormatter={v => v.toLocaleString()} />
                <Tooltip content={<CustomTooltip />} />
                <Area dataKey="fcUpper" stroke="none" fill="rgba(34,197,94,0.1)" connectNulls isAnimationActive={false} />
                <Area dataKey="fcLower" stroke="none" fill="#0d0d14" connectNulls isAnimationActive={false} />
                <ReferenceLine x={chartData[data.historical.length-1]?.label} stroke="#3b82f6" strokeDasharray="4 4" strokeWidth={1} />
                <Line dataKey="close" stroke="#60a5fa" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} name="Close" />
                <Line dataKey="fcMean" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls isAnimationActive={false} name="Forecast" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ padding: "8px 24px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>MAGIC HOUR (6-8 AM ET)</div>
            <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>Check 4h vol before session. Compressed &lt;0.6 = 94.6% reversion. Low &lt;0.8 = 93.6%. Elevated &gt;1.2 = reduced reliability.</div>
          </div>
          <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>SNIPER (11 AM-12 PM ET)</div>
            <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>Check 1h vol before entry. Low &lt;1.2 = 65.9% WR on ELITE zones. Normal &lt;1.5 = 59.8%. Elevated = half size only.</div>
          </div>
        </div>
      </>)}

      {loading && !data && (<div style={{ padding: 80, textAlign: "center", color: "#52525b", fontSize: 13 }}>Loading Kronos forecast… (first load may take ~2 min if API was sleeping)</div>)}
    </div>
  );
}

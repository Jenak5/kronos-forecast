"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function KronosDashboard() {
  const [instrument, setInstrument] = useState("NQ");
  const [timeframe, setTimeframe] = useState("4h");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/forecast?instrument=${instrument}&timeframe=${timeframe}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `API ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [instrument, timeframe]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const fmt = (ts) => {
    const d = new Date(ts);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`;
  };

  const chartData = data
    ? data.historical.map((c) => ({
        label: fmt(c.timestamp),
        close: c.close,
        high: c.high,
        low: c.low,
      }))
    : [];

  const allPrices = chartData.flatMap((d) => [d.close, d.high, d.low]);
  const yMin = allPrices.length ? Math.floor(Math.min(...allPrices) - 20) : 0;
  const yMax = allPrices.length ? Math.ceil(Math.max(...allPrices) + 20) : 100;

  const vr = data?.volatility_ratio || 1;
  const volColor =
    vr < 0.6 ? "#22c55e" : vr < 0.8 ? "#4ade80" : vr < 1.2 ? "#a1a1aa" : vr < 1.5 ? "#f59e0b" : "#ef4444";
  const volLabel =
    vr < 0.6 ? "COMPRESSED" : vr < 0.8 ? "LOW" : vr < 1.2 ? "NORMAL" : vr < 1.5 ? "ELEVATED" : "VERY HIGH";

  const dirColor =
    data?.direction === "BULLISH" ? "#22c55e" : data?.direction === "BEARISH" ? "#ef4444" : "#71717a";

  const ctx = data?.context;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0" }}>
        <div style={{ color: "#64748b", marginBottom: 6, fontSize: 10 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span>{p.name}</span>
            <span style={{ fontWeight: 600 }}>{p.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>
    );
  };

  const tfMeta = {
    "5m": { label: "5m", desc: "Entry timing", icon: "◦" },
    "15m": { label: "15m", desc: "Power Hour", icon: "⚡" },
    "1h": { label: "1h", desc: "Directional vol", icon: "◎" },
    "4h": { label: "4h", desc: "Magic Hour", icon: "◈" },
  };

  const now = new Date();
  const etHour = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" })).getHours();
  const sessionLabel =
    etHour >= 6 && etHour < 9 ? "MAGIC HOUR ACTIVE" :
    etHour >= 10 && etHour < 11 ? "10 AM SECONDARY" :
    etHour >= 11 && etHour < 14 ? "DIRECTIONAL WINDOW" :
    etHour >= 15 && etHour < 16 ? "POWER HOUR ACTIVE" :
    etHour >= 18 || etHour < 6 ? "OVERNIGHT — NO EDGE" :
    "REGULAR SESSION";
  const sessionColor =
    etHour >= 6 && etHour < 9 ? "#22c55e" :
    etHour >= 11 && etHour < 14 ? "#3b82f6" :
    etHour >= 15 && etHour < 16 ? "#f59e0b" :
    etHour >= 18 || etHour < 6 ? "#ef4444" :
    "#71717a";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a12 0%, #0d0d1a 100%)", color: "#e2e8f0", fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid #1a1a2e" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.5px" }}>KRONOS</span>
              <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: "linear-gradient(135deg, #1e1e3a, #2a1a3e)", color: "#a78bfa", letterSpacing: "2px", fontWeight: 600, border: "1px solid #2e2e4a" }}>VOL FILTER</span>
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
              {data ? `${data.cached ? "Cached • " : ""}${new Date(data.generated_at).toLocaleString()}` : "Loading…"}
            </div>
          </div>

          {/* Session indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: sessionColor, boxShadow: `0 0 8px ${sessionColor}` }} />
            <span style={{ fontSize: 10, color: sessionColor, fontWeight: 600, letterSpacing: "1px" }}>{sessionLabel}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 14 }}>
          {["NQ", "ES"].map((inst) => (
            <button key={inst} onClick={() => setInstrument(inst)} style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              border: "1px solid", borderColor: instrument === inst ? "#3b82f6" : "#1e1e3a",
              borderRadius: 6, background: instrument === inst ? "linear-gradient(135deg, #1e3a5f, #1a2e4a)" : "#12121e",
              color: instrument === inst ? "#60a5fa" : "#64748b", cursor: "pointer",
              transition: "all 0.2s",
            }}>{inst}</button>
          ))}
          <div style={{ width: 1, height: 22, background: "#1e1e3a", margin: "0 4px" }} />
          {["5m", "15m", "1h", "4h"].map((tf) => (
            <button key={tf} onClick={() => setTimeframe(tf)} style={{
              padding: "6px 12px", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
              border: "1px solid", borderColor: timeframe === tf ? "#8b5cf6" : "#1e1e3a",
              borderRadius: 6, background: timeframe === tf ? "linear-gradient(135deg, #2e1065, #1e1050)" : "#12121e",
              color: timeframe === tf ? "#c4b5fd" : "#64748b", cursor: "pointer",
              transition: "all 0.2s", textAlign: "center",
            }}>
              <div style={{ fontSize: 12 }}>{tfMeta[tf].icon} {tf}</div>
              <div style={{ fontSize: 8, color: timeframe === tf ? "#8b5cf6" : "#334155", marginTop: 2 }}>{tfMeta[tf].desc}</div>
            </button>
          ))}
          <button onClick={fetchForecast} disabled={loading} style={{
            padding: "6px 14px", fontSize: 13, fontFamily: "inherit",
            border: "1px solid #1e1e3a", borderRadius: 6, background: "#12121e",
            color: loading ? "#334155" : "#e2e8f0", cursor: loading ? "wait" : "pointer",
            marginLeft: 4, transition: "all 0.2s",
          }}>{loading ? "⏳" : "↻"}</button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: "16px 24px", padding: "14px 18px", background: "#1a1208", border: "1px solid #422006", borderRadius: 8, fontSize: 12, color: "#fbbf24" }}>
          ⚠ {error}
        </div>
      )}

      {data && (
        <>
          {/* Primary Signal: Vol Ratio */}
          <div style={{ padding: "16px 24px 8px" }}>
            <div style={{
              background: "linear-gradient(135deg, #12121e, #16162a)",
              border: `1px solid ${volColor}22`,
              borderRadius: 12, padding: "20px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: `0 0 30px ${volColor}08`,
            }}>
              <div>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: "2px", fontWeight: 600, marginBottom: 8 }}>VOLATILITY RATIO</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 42, fontWeight: 700, color: volColor, lineHeight: 1 }}>{vr.toFixed(2)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: volColor, letterSpacing: "1px" }}>{volLabel}</span>
                </div>
                <div style={{ marginTop: 10, height: 4, background: "#1e1e3a", borderRadius: 4, width: 200, overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(vr / 2 * 100, 100)}%`,
                    height: "100%", background: `linear-gradient(90deg, #22c55e, ${volColor})`,
                    borderRadius: 4, transition: "width 0.5s",
                  }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: "2px", fontWeight: 600, marginBottom: 8 }}>DIRECTION</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: dirColor }}>
                  {data.direction === "BULLISH" ? "▲" : data.direction === "BEARISH" ? "▼" : "◆"} {data.direction}
                </div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                  {instrument} @ {data.last_close?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Trading Context Card */}
          {ctx && (
            <div style={{ padding: "6px 24px" }}>
              <div style={{
                background: "linear-gradient(135deg, #12121e, #16162a)",
                border: `1px solid ${ctx.color}33`,
                borderRadius: 12, padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <div style={{
                  fontSize: 28, fontWeight: 700, color: ctx.color,
                  minWidth: 75, textAlign: "center", lineHeight: 1,
                }}>{ctx.pct}</div>
                <div style={{ borderLeft: `2px solid ${ctx.color}33`, paddingLeft: 16 }}>
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "2px", fontWeight: 600, marginBottom: 5 }}>{ctx.label}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{ctx.text}</div>
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <div style={{ padding: "10px 24px 6px" }}>
            <div style={{ background: "#0e0e1a", border: "1px solid #1e1e3a", borderRadius: 12, padding: "16px 8px 8px 0" }}>
              <div style={{ display: "flex", gap: 16, padding: "0 0 10px 20px", fontSize: 10, color: "#475569" }}>
                <span><span style={{ display: "inline-block", width: 12, height: 2, background: "#60a5fa", marginRight: 6, verticalAlign: "middle" }} />Price</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid stroke="#1a1a2e" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#334155", fontSize: 9 }} axisLine={{ stroke: "#1e1e3a" }} tickLine={false} interval={Math.floor(chartData.length / 6)} />
                  <YAxis domain={[yMin, yMax]} tick={{ fill: "#334155", fontSize: 9 }} axisLine={{ stroke: "#1e1e3a" }} tickLine={false} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line dataKey="close" stroke="#60a5fa" strokeWidth={2} dot={false} isAnimationActive={false} name="Close" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Reference Cards */}
          <div style={{ padding: "8px 24px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "#12121e", border: "1px solid #1e1e3a", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 9, color: "#22c55e", letterSpacing: "2px", fontWeight: 600, marginBottom: 8 }}>◈ MAGIC HOUR 6-9 AM ET</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
                <span style={{ color: "#c4b5fd", fontWeight: 600 }}>7 AM Golden</span> = A+ (92.8% all vols)<br />
                <span style={{ color: "#c4b5fd", fontWeight: 600 }}>6 AM Pre-Mkt</span> = B+ (~92% all vols)<br />
                <span style={{ color: "#fbbf24", fontWeight: 600 }}>8 AM Cont.</span> = vol-sensitive<br />
                (Full size &lt;1.2 / skip &gt;1.2)
              </div>
            </div>
            <div style={{ background: "#12121e", border: "1px solid #1e1e3a", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 9, color: "#3b82f6", letterSpacing: "2px", fontWeight: 600, marginBottom: 8 }}>◎ DIRECTIONAL 11 AM-2 PM ET</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
                ELITE FVG directional. Check <span style={{ color: "#c4b5fd", fontWeight: 600 }}>1h vol</span> first.<br />
                11-12 → 65.9% WR (sniper prime)<br />
                12-1 → 57.8% WR (continuation)<br />
                1-2 → 62.0% WR at vol &lt;1.5
              </div>
            </div>
            <div style={{ background: "#12121e", border: "1px solid #1e1e3a", borderRadius: 10, padding: "14px 16px", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 9, color: "#f59e0b", letterSpacing: "2px", fontWeight: 600, marginBottom: 8 }}>⚡ POWER HOUR 3-4 PM ET</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
                High volume close window. 76% reversion at normal vol. NOT a directional FVG edge (46% WR). Use for closing positions or momentum scalps. Check <span style={{ color: "#c4b5fd", fontWeight: 600 }}>15m vol</span>.
              </div>
            </div>
          </div>
        </>
      )}

      {loading && !data && (
        <div style={{ padding: 80, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#475569" }}>Loading vol data…</div>
        </div>
      )}
    </div>
  );
}

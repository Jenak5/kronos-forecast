"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

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
      const res = await fetch(
        `${API_BASE}/forecast?instrument=${instrument}&timeframe=${timeframe}`
      );
      if (!res.ok) throw new Error(`API ${res.status}`);
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
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const chartData = data
    ? [
        ...data.historical.map((c) => ({
          label: fmt(c.timestamp),
          close: c.close,
          type: "hist",
        })),
        ...data.forecast_mean.map((c, i) => ({
          label: "→ " + fmt(c.timestamp),
          fcMean: c.close,
          fcUpper: data.forecast_upper[i].close,
          fcLower: data.forecast_lower[i].close,
          type: "fc",
        })),
      ]
    : [];

  if (chartData.length > 0 && data) {
    const bridgeIdx = data.historical.length - 1;
    chartData[bridgeIdx].fcMean = chartData[bridgeIdx].close;
    chartData[bridgeIdx].fcUpper = chartData[bridgeIdx].close;
    chartData[bridgeIdx].fcLower = chartData[bridgeIdx].close;
  }

  const allPrices = chartData.flatMap((d) =>
    [d.close, d.fcMean, d.fcUpper, d.fcLower].filter(Boolean)
  );
  const yMin = allPrices.length ? Math.floor(Math.min(...allPrices) - 30) : 0;
  const yMax = allPrices.length ? Math.ceil(Math.max(...allPrices) + 30) : 100;

  const dirColor =
    data?.direction === "BULLISH"
      ? "#22c55e"
      : data?.direction === "BEARISH"
      ? "#ef4444"
      : "#f59e0b";

  const confLabel =
    data?.confidence > 70
      ? "High"
      : data?.confidence > 40
      ? "Moderate"
      : "Low";

  const volLabel =
    data?.volatility_ratio > 3
      ? "Elevated"
      : data?.volatility_ratio > 1.2
      ? "Above avg"
      : data?.volatility_ratio < 0.8
      ? "Low"
      : "Normal";

  const volColor =
    data?.volatility_ratio > 3
      ? "#ef4444"
      : data?.volatility_ratio > 1.2
      ? "#f59e0b"
      : "#22c55e";

  const lastClose = data?.historical?.[data.historical.length - 1]?.close;
  const fcFinal = data?.forecast_mean?.[data.forecast_mean.length - 1]?.close;
  const pctMove =
    lastClose && fcFinal
      ? (((fcFinal - lastClose) / lastClose) * 100).toFixed(2)
      : null;

  const tradingNote = () => {
    if (!data) return "";
    if (data.confidence > 70 && data.direction === "BULLISH")
      return `High confidence bullish — if ELITE zone (≥${instrument === "NQ" ? "18" : "5"}pt) aligns, full size LONG`;
    if (data.confidence > 70 && data.direction === "BEARISH")
      return `High confidence bearish — if ELITE zone aligns, full size SHORT`;
    if (data.confidence > 40)
      return `Moderate confidence — require GOOD+ IFVG zone for entry, half size`;
    return `Low confidence — paper-trade only or skip. Wait for stronger IFVG setup`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 11,
          fontFamily: "monospace",
          color: "#e4e4e7",
        }}
      >
        <div style={{ color: "#71717a", marginBottom: 4 }}>{label}</div>
        {payload
          .filter((p) => p.value != null)
          .map((p, i) => (
            <div key={i} style={{ color: p.color || "#e4e4e7" }}>
              {p.name}: {p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e4e4e7" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #1e1e2a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#fafafa" }}>KRONOS</span>
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#1e1e2a", color: "#71717a", letterSpacing: "1.5px", fontWeight: 600 }}>NQ FINE-TUNED</span>
            </div>
            <div style={{ fontSize: 10, color: "#52525b", marginTop: 4 }}>
              {data ? `Updated ${new Date(data.generated_at).toLocaleString()}` : "Loading…"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {["NQ", "ES"].map((inst) => (
              <button key={inst} onClick={() => setInstrument(inst)} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", border: "1px solid", borderColor: instrument === inst ? "#3b82f6" : "#27272a", borderRadius: 4, background: instrument === inst ? "#1e3a5f" : "#18181b", color: instrument === inst ? "#60a5fa" : "#71717a", cursor: "pointer" }}>
                {inst}
              </button>
            ))}
            <div style={{ width: 1, height: 18, background: "#27272a", margin: "0 2px" }} />
            {["5m", "1h"].map((tf) => (
              <button key={tf} onClick={() => setTimeframe(tf)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", border: "1px solid", borderColor: timeframe === tf ? "#8b5cf6" : "#27272a", borderRadius: 4, background: timeframe === tf ? "#2e1065" : "#18181b", color: timeframe === tf ? "#a78bfa" : "#71717a", cursor: "pointer" }}>
                {tf}
              </button>
            ))}
            <button onClick={fetchForecast} disabled={loading} style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, fontFamily: "inherit", border: "1px solid #27272a", borderRadius: 4, background: "#18181b", color: loading ? "#52525b" : "#fafafa", cursor: loading ? "wait" : "pointer", marginLeft: 2 }}>
              {loading ? "⏳" : "↻"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: "16px 24px", padding: "12px 16px", background: "#1c1917", border: "1px solid #422006", borderRadius: 6, fontSize: 12, color: "#d97706" }}>
          {error.includes("Failed to fetch") ? "⚠ API sleeping — HF free tier hibernates after 48hrs. Wait ~2 min and refresh." : `⚠ ${error}`}
        </div>
      )}

      {data && (
        <>
          {/* Signal Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "14px 24px 6px" }}>
            <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>DIRECTION</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: dirColor }}>
                {data.direction === "BULLISH" ? "▲" : data.direction === "BEARISH" ? "▼" : "◆"} {data.direction}
              </div>
            </div>
            <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>CONFIDENCE</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: data.confidence > 70 ? "#22c55e" : data.confidence > 40 ? "#f59e0b" : "#71717a" }}>{Math.round(data.confidence)}%</span>
                <span style={{ fontSize: 10, color: "#52525b" }}>{confLabel}</span>
              </div>
              <div style={{ height: 3, background: "#27272a", borderRadius: 2, marginTop: 6 }}>
                <div style={{ width: `${Math.min(data.confidence, 100)}%`, height: "100%", background: data.confidence > 70 ? "#22c55e" : data.confidence > 40 ? "#f59e0b" : "#71717a", borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>VOL RATIO</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: volColor }}>{data.volatility_ratio.toFixed(1)}×</span>
                <span style={{ fontSize: 10, color: volColor }}>{volLabel}</span>
              </div>
            </div>
            <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>PREDICTED MOVE</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: pctMove > 0 ? "#22c55e" : pctMove < 0 ? "#ef4444" : "#71717a" }}>{pctMove > 0 ? "+" : ""}{pctMove}%</span>
              </div>
              <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>
                {lastClose?.toLocaleString()} → {fcFinal?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Chart */}
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
                  <XAxis dataKey="label" tick={{ fill: "#3f3f46", fontSize: 9 }} axisLine={{ stroke: "#27272a" }} tickLine={false} interval={Math.floor(chartData.length / 8)} />
                  <YAxis domain={[yMin, yMax]} tick={{ fill: "#3f3f46", fontSize: 9 }} axisLine={{ stroke: "#27272a" }} tickLine={false} tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area dataKey="fcUpper" stroke="none" fill="rgba(34,197,94,0.1)" connectNulls isAnimationActive={false} />
                  <Area dataKey="fcLower" stroke="none" fill="#0d0d14" connectNulls isAnimationActive={false} />
                  <ReferenceLine x={chartData[data.historical.length - 1]?.label} stroke="#3b82f6" strokeDasharray="4 4" strokeWidth={1} />
                  <Line dataKey="close" stroke="#60a5fa" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} name="Close" />
                  <Line dataKey="fcMean" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls isAnimationActive={false} name="Forecast" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trading Context */}
          <div style={{ padding: "8px 24px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>MAGIC HOUR ALIGNMENT</div>
              <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>
                {data.direction === "BULLISH" ? (
                  <span>Kronos bias supports <span style={{ color: "#22c55e", fontWeight: 600 }}>LONG</span> entries during 7AM golden hour</span>
                ) : data.direction === "BEARISH" ? (
                  <span>Kronos bias supports <span style={{ color: "#ef4444", fontWeight: 600 }}>SHORT</span> entries during 7AM golden hour</span>
                ) : (
                  <span style={{ color: "#f59e0b" }}>Neutral — wait for IFVG zone confirmation</span>
                )}
              </div>
            </div>
            <div style={{ background: "#12121a", border: "1px solid #1e1e2a", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 6 }}>TRADE SIGNAL</div>
              <div style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.6 }}>{tradingNote()}</div>
            </div>
          </div>
        </>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div style={{ padding: 80, textAlign: "center", color: "#52525b", fontSize: 13 }}>
          Loading Kronos forecast… (first load may take ~2 min if API was sleeping)
        </div>
      )}
    </div>
  );
}

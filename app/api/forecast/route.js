import YahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

const yahooFinance = new YahooFinance();

// Cache responses for 5 minutes
const cache = {};
const CACHE_TTL = 300_000; // 5 min in ms

function calcATR(candles, period) {
  if (candles.length < period) return null;
  const ranges = candles.map(c => c.high - c.low);
  const slice = ranges.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function resample4h(candles) {
  const groups = {};
  for (const c of candles) {
    const d = new Date(c.timestamp);
    const bucket = Math.floor(d.getHours() / 4) * 4;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${bucket}`;
    if (!groups[key]) {
      groups[key] = { timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close };
    } else {
      groups[key].high = Math.max(groups[key].high, c.high);
      groups[key].low = Math.min(groups[key].low, c.low);
      groups[key].close = c.close;
    }
  }
  return Object.values(groups);
}

function getContext(volRatio, timeframe, instrument) {
  const zone = instrument === 'NQ' ? '≥18pt' : '≥5pt';

  if (timeframe === '4h') {
    if (volRatio < 0.6) return {
      label: 'MAGIC HOUR REVERSION (6-9 AM ET)',
      text: `Compressed vol — All 3 hours: 90-93% reversion. 7 AM Golden Hour is prime (92.8%). Full size all three.`,
      color: '#22c55e', pct: '92.8%'
    };
    if (volRatio < 0.8) return {
      label: 'MAGIC HOUR REVERSION (6-9 AM ET)',
      text: `Low vol — 6 AM: 92.5% | 7 AM Golden: 92.2% | 8 AM: 91.5%. Full size all three hours.`,
      color: '#22c55e', pct: '92.4%'
    };
    if (volRatio < 1.2) return {
      label: 'MAGIC HOUR REVERSION (6-9 AM ET)',
      text: `Normal vol — 6 AM: 87-90% | 7 AM Golden: 90-96% (best at 1.0-1.2!) | 8 AM: 88-90%. Full size, favor 7 AM.`,
      color: '#a1a1aa', pct: '92.0%'
    };
    return {
      label: 'MAGIC HOUR REVERSION (6-9 AM ET)',
      text: `Elevated vol — 6 AM: 90.2% (still good) | 7 AM Golden: 91.5% (still good) | 8 AM: 83% (REDUCE/SKIP). 8 AM is vol-sensitive.`,
      color: '#f59e0b', pct: '6-7AM: 90%+'
    };
  }

  if (timeframe === '1h') {
    if (volRatio < 1.2) return {
      label: 'DIRECTIONAL WINDOW (11 AM-2 PM ET)',
      text: `Low vol — ELITE zones: 65.9% WR at 11-12, 57.8% at 12-1, 62.0% at 1-2 PM. Full size if ELITE (${zone}) aligns.`,
      color: '#22c55e', pct: '62-66%'
    };
    if (volRatio < 1.5) return {
      label: 'DIRECTIONAL WINDOW (11 AM-2 PM ET)',
      text: `Normal vol — ELITE zones: 59.8% WR at 11-12, 55.8% at 12-1, 55.6% at 1-2 PM. Full size ELITE, half size GOOD.`,
      color: '#f59e0b', pct: '56-60%'
    };
    return {
      label: 'DIRECTIONAL WINDOW (11 AM-2 PM ET)',
      text: `Elevated vol — Directional accuracy drops across all hours. Half size only, ELITE zones required.`,
      color: '#ef4444', pct: '—'
    };
  }

  if (timeframe === '15m') {
    return {
      label: 'POWER HOUR (3-4 PM ET)',
      text: `High volume close window. 76% reversion at normal vol. NOT a directional FVG edge (46% WR). Use for closing positions or momentum scalps only.`,
      color: '#f59e0b', pct: '76%'
    };
  }

  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const instrument = searchParams.get('instrument') || 'NQ';
  const timeframe = searchParams.get('timeframe') || '1h';

  if (!['NQ', 'ES'].includes(instrument)) {
    return NextResponse.json({ error: 'Invalid instrument' }, { status: 400 });
  }
  if (!['5m', '15m', '1h', '4h'].includes(timeframe)) {
    return NextResponse.json({ error: 'Invalid timeframe' }, { status: 400 });
  }

  // Check cache
  const cacheKey = `${instrument}_${timeframe}`;
  const now = Date.now();
  if (cache[cacheKey] && (now - cache[cacheKey].time < CACHE_TTL)) {
    return NextResponse.json({ ...cache[cacheKey].data, cached: true });
  }

  const ticker = instrument === 'NQ' ? 'NQ=F' : 'ES=F';

  // Map timeframes to yahoo-finance2 params
  const tfConfig = {
    '5m':  { interval: '5m',  period1: new Date(now - 5 * 86400000) },
    '15m': { interval: '15m', period1: new Date(now - 30 * 86400000) },
    '1h':  { interval: '1h',  period1: new Date(now - 60 * 86400000) },
    '4h':  { interval: '1h',  period1: new Date(now - 60 * 86400000) },
  };

  try {
    const config = tfConfig[timeframe];
    const result = await yahooFinance.chart(ticker, {
      interval: config.interval,
      period1: config.period1,
    });

    if (!result?.quotes?.length) {
      return NextResponse.json({ error: 'No data returned from Yahoo Finance' }, { status: 502 });
    }

    // Convert to candle format
    let candles = result.quotes
      .filter(q => q.open && q.high && q.low && q.close)
      .map(q => ({
        timestamp: new Date(q.date).toISOString(),
        open: Math.round(q.open * 100) / 100,
        high: Math.round(q.high * 100) / 100,
        low: Math.round(q.low * 100) / 100,
        close: Math.round(q.close * 100) / 100,
      }));

    // Resample to 4h if needed
    if (timeframe === '4h') {
      candles = resample4h(candles);
    }

    if (candles.length < 30) {
      return NextResponse.json({ error: 'Not enough candle data' }, { status: 502 });
    }

    // Calculate vol ratio
    const atr8 = calcATR(candles, 8);
    const atr24 = calcATR(candles, 24);
    const volRatio = (atr8 && atr24 && atr24 > 0) ? Math.round((atr8 / atr24) * 100) / 100 : 1.0;

    // Simple direction from last few candles
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 4] || candles[0];
    const pctChange = ((last.close - prev.close) / prev.close) * 100;
    const direction = pctChange > 0.1 ? 'BULLISH' : pctChange < -0.1 ? 'BEARISH' : 'NEUTRAL';
    const confidence = Math.min(Math.abs(pctChange) * 20, 85);

    // Get trading context
    const context = getContext(volRatio, timeframe, instrument);

    // Last 50 candles for chart
    const historical = candles.slice(-50);

    const response = {
      instrument,
      timeframe,
      generated_at: new Date().toISOString(),
      historical,
      volatility_ratio: volRatio,
      direction,
      confidence: Math.round(confidence * 10) / 10,
      context,
      last_close: last.close,
      cached: false,
    };

    // Store in cache
    cache[cacheKey] = { time: now, data: response };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Forecast error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch data' }, { status: 502 });
  }
}

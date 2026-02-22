import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from "face-api.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const MODELS_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

const EMOTION_CONFIG = {
  happy:     { emoji: "😄", label: "Happy",    color: "#22c55e", glow: "rgba(34,197,94,0.4)"   },
  neutral:   { emoji: "😐", label: "Neutral",  color: "#E8A07A", glow: "rgba(232,160,122,0.4)" },
  confused:  { emoji: "😕", label: "Confused", color: "#C084FC", glow: "rgba(192,132,252,0.4)" },
  sad:       { emoji: "😢", label: "Sad",      color: "#60a5fa", glow: "rgba(96,165,250,0.4)"  },
  angry:     { emoji: "😠", label: "Angry",    color: "#ef4444", glow: "rgba(239,68,68,0.4)"   },
  surprised: { emoji: "😲", label: "Surprised",color: "#f59e0b", glow: "rgba(245,158,11,0.4)"  },
  fearful:   { emoji: "😨", label: "Fearful",  color: "#a78bfa", glow: "rgba(167,139,250,0.4)" },
  disgusted: { emoji: "🤢", label: "Disgusted",color: "#84cc16", glow: "rgba(132,204,22,0.4)"  },
};

// Map face-api expression keys → our unified keys
const mapExpression = (expressions) => {
  const raw = { ...expressions };
  // face-api uses "disgusted"/"surprised" etc — map confused heuristically
  raw.confused = Math.max(raw.disgusted ?? 0, raw.fearful ?? 0) * 0.5 +
                 (raw.sad ?? 0) * 0.3;
  return raw;
};

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function EmotionBar({ label, value, color, emoji, animated }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{emoji}</span>
      <span style={{
        fontFamily: "'Caveat Brush', cursive", fontSize: 11,
        color: "rgba(90,26,154,0.7)", width: 58, flexShrink: 0,
      }}>{label}</span>
      <div style={{
        flex: 1, height: 7, borderRadius: 4,
        background: "rgba(123,47,190,0.08)",
        border: "1px solid rgba(123,47,190,0.1)",
        overflow: "hidden", position: "relative",
      }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            height: "100%", borderRadius: 4,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            boxShadow: pct > 30 ? `0 0 8px ${color}88` : "none",
          }}
        />
      </div>
      <span style={{
        fontFamily: "'Caveat Brush', cursive", fontSize: 10,
        color: "rgba(90,26,154,0.5)", width: 28, textAlign: "right", flexShrink: 0,
      }}>{pct}%</span>
    </div>
  );
}

// ─── History Sparkline (last 20 readings) ────────────────────────────────────
function Sparkline({ history, color, width = 120, height = 28 }) {
  if (!history || history.length < 2) return null;
  const max = Math.max(...history, 0.01);
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.05"/>
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none" stroke={color}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        opacity="0.85"
      />
      {/* last dot */}
      {history.length > 0 && (() => {
        const last = history[history.length - 1];
        const x = width;
        const y = height - (last / max) * height;
        return <circle cx={x} cy={y} r="2.5" fill={color} opacity="0.9"/>;
      })()}
    </svg>
  );
}

// ─── Dominant Emotion Badge ───────────────────────────────────────────────────
function DominantBadge({ emotion, confidence }) {
  if (!emotion) return null;
  const cfg = EMOTION_CONFIG[emotion] ?? EMOTION_CONFIG.neutral;
  return (
    <motion.div
      key={emotion}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: `${cfg.color}18`,
        border: `1.5px solid ${cfg.color}55`,
        borderRadius: 14, padding: "6px 14px",
        boxShadow: `0 0 20px ${cfg.glow}`,
      }}
    >
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ fontSize: 22 }}
      >{cfg.emoji}</motion.span>
      <div>
        <div style={{ fontFamily: "'Barriecito', cursive", fontSize: 16, color: cfg.color, letterSpacing: "1px" }}>
          {cfg.label}
        </div>
        <div style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 10, color: "rgba(90,26,154,0.5)" }}>
          {Math.round(confidence * 100)}% confidence
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main EmotionDetector ─────────────────────────────────────────────────────
export default function EmotionDetector({
  videoRef,        // ref to the <video> element to analyse
  label = "You",   // whose video — "You" or remote email
  enabled = true,  // toggle from parent
  onEmotionChange, // optional callback(emotion, confidence, expressions)
}) {
  const canvasRef          = useRef(null);
  const intervalRef        = useRef(null);
  const historyRef         = useRef({}); // { happy: [0.1, 0.3, ...], ... }

  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [expressions,   setExpressions]   = useState(null);  // raw { happy:0.8, ... }
  const [dominant,      setDominant]      = useState(null);  // "happy"
  const [confidence,    setConfidence]    = useState(0);
  const [faceDetected,  setFaceDetected]  = useState(false);
  const [history,       setHistory]       = useState({});    // { happy: [...] }
  const [fps,           setFps]           = useState(0);
  const [showChart,     setShowChart]     = useState(true);
  const [panelOpen,     setPanelOpen]     = useState(true);

  const fpsCountRef = useRef({ count: 0, last: Date.now() });

  // ── Load face-api models ─────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function loadModels() {
      try {
        setLoading(true); setError(null);
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
        ]);
        if (!cancelled) { setModelsLoaded(true); setLoading(false); }
      } catch (err) {
        if (!cancelled) {
          console.error("[EmotionDetector] model load failed:", err);
          setError("Failed to load AI models. Check your connection.");
          setLoading(false);
        }
      }
    }

    loadModels();
    return () => { cancelled = true; };
  }, [enabled]);

  // ── Detection loop ───────────────────────────────────────────────────────
  const detect = useCallback(async () => {
    const video = videoRef?.current;
    if (!video || video.readyState < 2 || !modelsLoaded) return;

    try {
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
        .withFaceExpressions();

      if (!result) {
        setFaceDetected(false);
        return;
      }

      setFaceDetected(true);

      // FPS counter
      fpsCountRef.current.count++;
      const now = Date.now();
      if (now - fpsCountRef.current.last >= 1000) {
        setFps(fpsCountRef.current.count);
        fpsCountRef.current = { count: 0, last: now };
      }

      const raw = mapExpression(result.expressions);
      setExpressions(raw);

      // Find dominant
      const dom = Object.entries(raw).reduce((a, b) => b[1] > a[1] ? b : a);
      setDominant(dom[0]);
      setConfidence(dom[1]);
      onEmotionChange?.(dom[0], dom[1], raw);

      // Update history (keep last 20)
      setHistory(prev => {
        const next = { ...prev };
        Object.keys(EMOTION_CONFIG).forEach(key => {
          const arr = [...(next[key] ?? []), raw[key] ?? 0];
          next[key] = arr.slice(-20);
        });
        historyRef.current = next;
        return next;
      });

      // Draw face box on canvas overlay
      const canvas = canvasRef.current;
      if (canvas) {
        const dims = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, dims);
        const resized = faceapi.resizeResults(result, dims);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Purple box around face
        const box = resized.detection.box;
        ctx.strokeStyle = "#7B2FBE";
        ctx.lineWidth   = 2;
        ctx.shadowColor = "#C084FC";
        ctx.shadowBlur  = 8;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Corner accents
        const cLen = 12;
        ctx.strokeStyle = "#E8A07A";
        ctx.lineWidth   = 3;
        ctx.shadowColor = "#E8A07A";
        // TL
        ctx.beginPath(); ctx.moveTo(box.x, box.y + cLen); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cLen, box.y); ctx.stroke();
        // TR
        ctx.beginPath(); ctx.moveTo(box.x + box.width - cLen, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + cLen); ctx.stroke();
        // BL
        ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - cLen); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + cLen, box.y + box.height); ctx.stroke();
        // BR
        ctx.beginPath(); ctx.moveTo(box.x + box.width - cLen, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - cLen); ctx.stroke();
      }

    } catch (err) {
      // Silently ignore per-frame errors
    }
  }, [modelsLoaded, videoRef, onEmotionChange]);

  useEffect(() => {
    if (!modelsLoaded || !enabled) return;
    intervalRef.current = setInterval(detect, 500); // 2 fps detection
    return () => clearInterval(intervalRef.current);
  }, [modelsLoaded, enabled, detect]);

  // ── Clear canvas when disabled ───────────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      const ctx = canvasRef.current?.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setFaceDetected(false);
      setExpressions(null);
      setDominant(null);
    }
  }, [enabled]);

  if (!enabled) return null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Canvas overlay on video (positioned by parent absolutely) ── */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          pointerEvents: "none", zIndex: 5,
        }}
      />

      {/* ── Floating panel ── */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 20, maxWidth: 230 }}>

        {/* Toggle button */}
        <motion.button
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={() => setPanelOpen(p => !p)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 20, border: "none",
            cursor: "pointer", marginBottom: 6, marginLeft: "auto",
            background: panelOpen
              ? "linear-gradient(135deg,#7B2FBE,#C084FC)"
              : "rgba(255,255,255,0.82)",
            backdropFilter: "blur(12px)",
            border: "1.5px solid rgba(123,47,190,0.25)",
            color: panelOpen ? "#fff" : "#5A1A9A",
            fontFamily: "'Caveat Brush', cursive", fontSize: 12,
            boxShadow: panelOpen ? "0 4px 16px rgba(123,47,190,0.4)" : "0 2px 8px rgba(123,47,190,0.12)",
          }}
        >
          <span style={{ fontSize: 14 }}>🧠</span>
          AI Emotion {panelOpen ? "▲" : "▼"}
        </motion.button>

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              style={{
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(24px)",
                border: "1.5px solid rgba(123,47,190,0.18)",
                borderRadius: 18,
                padding: "14px 14px 12px",
                boxShadow: "0 12px 40px rgba(123,47,190,0.2), inset 0 1px 0 rgba(255,255,255,0.95)",
                display: "flex", flexDirection: "column", gap: 10,
              }}
            >
              {/* Top glow line */}
              <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, background: "linear-gradient(90deg,transparent,rgba(123,47,190,0.5),rgba(232,160,122,0.5),transparent)", borderRadius: "50%", pointerEvents: "none" }} />

              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontFamily: "'Barriecito', cursive", fontSize: 14, color: "#5A1A9A", letterSpacing: "1px" }}>
                  🧠 {label}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {/* FPS badge */}
                  {faceDetected && (
                    <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "1px 6px", fontFamily: "'Caveat Brush', cursive", fontSize: 9, color: "#15803d" }}>
                      {fps} fps
                    </div>
                  )}
                  {/* Face status dot */}
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    style={{ width: 7, height: 7, borderRadius: "50%", background: faceDetected ? "#22c55e" : "#ef4444" }}
                  />
                </div>
              </div>

              {/* Loading state */}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(123,47,190,0.2)", borderTopColor: "#7B2FBE" }}
                  />
                  <span style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 11, color: "#8B5E9B" }}>Loading AI models…</span>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "7px 10px", fontFamily: "'Caveat Brush', cursive", fontSize: 11, color: "#dc2626" }}>
                  ⚠️ {error}
                </div>
              )}

              {/* No face */}
              {!loading && !error && !faceDetected && modelsLoaded && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ textAlign: "center", padding: "6px 0", fontFamily: "'Caveat Brush', cursive", fontSize: 12, color: "rgba(90,26,154,0.5)" }}
                >
                  👁️ Looking for face…
                </motion.div>
              )}

              {/* Dominant emotion */}
              {!loading && faceDetected && dominant && (
                <DominantBadge emotion={dominant} confidence={confidence} />
              )}

              {/* Emotion bars */}
              {!loading && faceDetected && expressions && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {Object.entries(EMOTION_CONFIG).map(([key, cfg]) => (
                    <EmotionBar
                      key={key}
                      label={cfg.label}
                      emoji={cfg.emoji}
                      color={cfg.color}
                      value={expressions[key] ?? 0}
                    />
                  ))}
                </div>
              )}

              {/* Sparkline chart */}
              {!loading && faceDetected && Object.keys(history).length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 10, color: "rgba(90,26,154,0.45)" }}>Emotion trend</span>
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => setShowChart(p => !p)}
                      style={{ background: "rgba(123,47,190,0.08)", border: "1px solid rgba(123,47,190,0.15)", borderRadius: 6, padding: "1px 7px", cursor: "pointer", fontFamily: "'Caveat Brush', cursive", fontSize: 9, color: "#7B2FBE" }}
                    >{showChart ? "Hide" : "Show"}</motion.button>
                  </div>
                  <AnimatePresence>
                    {showChart && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          background: "rgba(123,47,190,0.04)",
                          border: "1px solid rgba(123,47,190,0.1)",
                          borderRadius: 10, padding: "8px 10px",
                          display: "flex", flexDirection: "column", gap: 4,
                        }}
                      >
                        {/* Show sparklines for top 3 emotions only */}
                        {Object.entries(EMOTION_CONFIG)
                          .filter(([key]) => history[key]?.length > 1)
                          .sort(([a], [b]) => (expressions?.[b] ?? 0) - (expressions?.[a] ?? 0))
                          .slice(0, 3)
                          .map(([key, cfg]) => (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 9, color: cfg.color, width: 46, flexShrink: 0 }}>{cfg.emoji} {cfg.label}</span>
                              <Sparkline history={history[key] ?? []} color={cfg.color} width={110} height={22} />
                            </div>
                          ))
                        }
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Footer */}
              <div style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 9, color: "rgba(90,26,154,0.3)", textAlign: "center" }}>
                Powered by face-api.js · Runs locally 🔒
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
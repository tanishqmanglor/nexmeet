import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

// ─── Status stages (3 seconds total) ─────────────────────────────────────────
const STAGES = [
  { text: "Finding your match...", emoji: "🔍", duration: 1000 },
  { text: "Connecting...",         emoji: "⚡", duration: 1200 },
  { text: "Connected! 🎉",         emoji: "✅", duration: 800  },
];

// ─── Avatar placeholder (initials circle) ────────────────────────────────────
function Avatar({ email, side, connected }) {
  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : side === "left" ? "ME" : "??";

  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -60 : 60, scale: 0.7 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.2 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
    >
      {/* Outer pulse ring */}
      <div style={{ position: "relative", width: 110, height: 110 }}>
        {connected && (
          <>
            <motion.div
              animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              style={{
                position: "absolute", inset: -10,
                borderRadius: "50%",
                border: "2.5px solid rgba(123,47,190,0.5)",
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.9], opacity: [0.35, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
              style={{
                position: "absolute", inset: -10,
                borderRadius: "50%",
                border: "2px solid rgba(192,132,252,0.4)",
              }}
            />
          </>
        )}

        {/* Spinning orbit ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", inset: -8,
            borderRadius: "50%",
            border: "2px dashed rgba(123,47,190,0.25)",
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", inset: -16,
            borderRadius: "50%",
            border: "1.5px solid transparent",
            borderTopColor: "#E8A07A",
            borderBottomColor: "#C084FC",
          }}
        />

        {/* Avatar circle */}
        <motion.div
          animate={connected
            ? { boxShadow: ["0 0 20px rgba(123,47,190,0.3)", "0 0 48px rgba(192,132,252,0.65)", "0 0 20px rgba(123,47,190,0.3)"] }
            : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: "absolute", inset: 0,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#C084FC,#7B2FBE)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(123,47,190,0.35)",
            border: "3px solid rgba(255,255,255,0.8)",
          }}
        >
          <span style={{
            fontFamily: "'Barriecito', cursive",
            fontSize: 32, color: "#fff",
            textShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}>{initials}</span>
        </motion.div>

        {/* Status dot */}
        <motion.div
          animate={connected
            ? { background: "#22c55e", boxShadow: "0 0 10px #22c55e" }
            : { opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: connected ? 0 : Infinity }}
          style={{
            position: "absolute", bottom: 4, right: 4,
            width: 16, height: 16, borderRadius: "50%",
            background: connected ? "#22c55e" : "#E8A07A",
            border: "3px solid #fff",
          }}
        />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'Caveat Brush', cursive",
          fontSize: 14, color: "#5A1A9A", fontWeight: 700,
        }}>
          {side === "left" ? "You" : (email ?? "Waiting...")}
        </div>
        <div style={{
          fontFamily: "'Forum', serif",
          fontSize: 11, color: "rgba(90,26,154,0.45)", marginTop: 2,
        }}>
          {side === "left" ? "Host" : "Guest"}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Three.js particle bridge ─────────────────────────────────────────────────
function ParticleBridge({ connected }) {
  const mountRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 260;
    const H = el.clientHeight || 180;

    // Scene
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Particles flowing left ↔ right
    const COUNT   = 120;
    const geo     = new THREE.BufferGeometry();
    const pos     = new Float32Array(COUNT * 3);
    const phases  = new Float32Array(COUNT);
    const speeds  = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 6;   // x: -3 to 3
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.6; // y: slight spread
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
      phases[i]  = Math.random() * Math.PI * 2;
      speeds[i]  = 0.4 + Math.random() * 0.6;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: false,
      color: connected ? 0x22c55e : 0xC084FC,
      transparent: true,
      opacity: 0.85,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // Center glow sphere
    const glowGeo = new THREE.SphereGeometry(0.18, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color: connected ? 0x22c55e : 0x7B2FBE, transparent: true, opacity: 0.6 });
    const glow    = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    // Orbit ring
    const ringGeo = new THREE.TorusGeometry(0.45, 0.015, 8, 80);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xE8A07A, transparent: true, opacity: 0.5 });
    const ring    = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;

      const posArr = geo.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        posArr[i * 3] += speeds[i] * 0.012;
        if (posArr[i * 3] > 3.2) posArr[i * 3] = -3.2;
        posArr[i * 3 + 1] = Math.sin(t * speeds[i] + phases[i]) * 0.35;
      }
      geo.attributes.position.needsUpdate = true;

      glow.scale.setScalar(1 + Math.sin(t * 2.5) * 0.18);
      ring.rotation.y = t * 0.8;
      ring.rotation.z = t * 0.3;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [connected]);

  return (
    <div ref={mountRef} style={{ width: "100%", maxWidth: 300, height: 180 }} />
  );
}

// ─── Wave pulse lines (CSS only, fallback / decoration) ──────────────────────
function WavePulse({ connected }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scaleX: [0.4, 1.6, 0.4],
            opacity: [0.15, connected ? 0.55 : 0.3, 0.15],
          }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
          style={{
            position: "absolute",
            width: "78%", height: 2,
            background: `linear-gradient(90deg,transparent,${connected ? "#22c55e" : "#7B2FBE"},transparent)`,
            borderRadius: 2,
            top: `${44 + i * 10}%`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main ConnectingPage ──────────────────────────────────────────────────────
export default function ConnectingPage({
  myEmail      = "you@email.com",
  remoteEmail  = null,
  onComplete   = () => {},
}) {
  const [stageIdx,   setStageIdx]   = useState(0);
  const [done,       setDone]       = useState(false);
  const [connected,  setConnected]  = useState(false);

  useEffect(() => {
    let totalElapsed = 0;
    const timers = [];

    STAGES.forEach((stage, i) => {
      const t = setTimeout(() => {
        setStageIdx(i);
        if (i === STAGES.length - 1) {
          setConnected(true);
          const fin = setTimeout(() => { setDone(true); onComplete?.(); }, stage.duration + 300);
          timers.push(fin);
        }
      }, totalElapsed);
      timers.push(t);
      totalElapsed += stage.duration;
    });

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const stage = STAGES[stageIdx];

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="connecting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.55 } }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "linear-gradient(135deg,#F0D5F7 0%,#EAC8F8 45%,#FDD5B0 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            fontFamily: "'Forum', serif", overflow: "hidden",
          }}
        >
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Barriecito&family=Caveat+Brush&family=Forum&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }

            @keyframes floatBlob {
              0%,100% { transform: translate(0,0) scale(1); }
              50%      { transform: translate(20px,-18px) scale(1.07); }
            }
          `}</style>

          {/* ── Background blobs ── */}
          {[
            { w:580, c:"rgba(192,132,252,0.18)", l:"-12%", t:"-15%", d:14 },
            { w:520, c:"rgba(245,197,163,0.24)", l:"55%",  t:"50%",  d:11 },
            { w:360, c:"rgba(123,47,190,0.12)",  l:"5%",   t:"55%",  d:9  },
            { w:280, c:"rgba(232,160,122,0.22)", l:"70%",  t:"5%",   d:12 },
            { w:180, c:"rgba(192,132,252,0.28)", l:"15%",  t:"15%",  d:7  },
          ].map((b, i) => (
            <div key={i} style={{
              position: "absolute", width: b.w, height: b.w,
              left: b.l, top: b.t, borderRadius: "50%",
              background: `radial-gradient(circle,${b.c},transparent 70%)`,
              filter: "blur(32px)", pointerEvents: "none",
              animation: `floatBlob ${b.d}s ease-in-out ${i * 1.3}s infinite`,
            }} />
          ))}

          {/* Glass haze */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 1,
            backdropFilter: "blur(1px)",
            background: "rgba(255,255,255,0.05)",
            pointerEvents: "none",
          }} />

          {/* ── Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 44, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative", zIndex: 10,
              background: "rgba(255,255,255,0.58)",
              border: "1.5px solid rgba(123,47,190,0.16)",
              borderRadius: 34, backdropFilter: "blur(36px)",
              boxShadow: "0 32px 80px rgba(123,47,190,0.18),inset 0 1px 0 rgba(255,255,255,0.95)",
              padding: "44px 52px 38px",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 0,
              maxWidth: 680, width: "90vw",
            }}
          >
            {/* Top shimmer line */}
            <div style={{
              position: "absolute", top: 0, left: "15%", right: "15%", height: 2,
              background: "linear-gradient(90deg,transparent,rgba(123,47,190,0.55),rgba(232,160,122,0.55),transparent)",
              borderRadius: "50%",
            }} />

            {/* Logo + Title */}
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              style={{ textAlign: "center", marginBottom: 32 }}
            >
              <div style={{
                fontFamily: "'Barriecito', cursive", fontSize: 38,
                color: "#5A1A9A", letterSpacing: "2px",
                textShadow: "3px 3px 0 rgba(245,197,163,0.85),0 6px 28px rgba(123,47,190,0.18)",
              }}>NexMeet</div>
              <div style={{
                fontFamily: "'Caveat Brush', cursive", fontSize: 13,
                color: "#8B5E9B", marginTop: 3,
              }}>Crystal-clear video calls 🌸</div>
            </motion.div>

            {/* ── Avatar row ── */}
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "center", gap: 0,
              width: "100%", position: "relative",
            }}>
              {/* Left avatar */}
              <Avatar email={myEmail} side="left" connected={connected} />

              {/* Centre — Three.js + wave */}
              <div style={{
                flex: 1, minWidth: 200, maxWidth: 320,
                display: "flex", flexDirection: "column",
                alignItems: "center", position: "relative",
              }}>
                <WavePulse connected={connected} />
                <ParticleBridge connected={connected} />

                {/* Status badge */}
                <motion.div
                  key={stageIdx}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  style={{
                    marginTop: 8,
                    background: connected
                      ? "linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.08))"
                      : "rgba(123,47,190,0.08)",
                    border: `1.5px solid ${connected ? "rgba(34,197,94,0.4)" : "rgba(123,47,190,0.2)"}`,
                    borderRadius: 20, padding: "6px 18px",
                    display: "flex", alignItems: "center", gap: 7,
                  }}
                >
                  {/* Animated dot */}
                  {!connected && (
                    <motion.span
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                      style={{ width: 7, height: 7, borderRadius: "50%", background: "#7B2FBE", display: "inline-block" }}
                    />
                  )}
                  {connected && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      style={{ fontSize: 13 }}
                    >✅</motion.span>
                  )}
                  <span style={{
                    fontFamily: "'Caveat Brush', cursive",
                    fontSize: 13, color: connected ? "#15803d" : "#5A1A9A",
                    fontWeight: 700,
                  }}>
                    {stage.text}
                  </span>
                </motion.div>
              </div>

              {/* Right avatar */}
              <Avatar email={remoteEmail} side="right" connected={connected} />
            </div>

            {/* ── Progress bar ── */}
            <div style={{
              marginTop: 32, width: "85%",
              height: 4, borderRadius: 4,
              background: "rgba(123,47,190,0.1)",
              overflow: "hidden",
            }}>
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: connected ? "100%" : stageIdx === 0 ? "30%" : "65%" }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
                style={{
                  height: "100%", borderRadius: 4,
                  background: connected
                    ? "linear-gradient(90deg,#22c55e,#4ade80)"
                    : "linear-gradient(90deg,#7B2FBE,#E8A07A,#C084FC)",
                }}
              />
            </div>

            {/* Stage dots */}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {STAGES.map((s, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: i === stageIdx ? 1.35 : 1,
                    background: i <= stageIdx
                      ? (connected && i === STAGES.length - 1 ? "#22c55e" : "#7B2FBE")
                      : "rgba(123,47,190,0.2)",
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 9, height: 9, borderRadius: "50%",
                    background: "rgba(123,47,190,0.2)",
                  }}
                />
              ))}
            </div>

            {/* Tips line */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              style={{
                marginTop: 22,
                fontFamily: "'Caveat Brush', cursive",
                fontSize: 12, color: "rgba(90,26,154,0.42)",
                textAlign: "center", letterSpacing: ".03em",
              }}
            >
              End-to-end encrypted · No account needed · Free forever
            </motion.p>
          </motion.div>

          {/* Credit */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.9 }}
            style={{
              position: "absolute", bottom: 26, zIndex: 10,
              fontFamily: "'Barriecito', cursive",
              fontSize: 16, color: "rgba(123,47,190,0.4)",
              letterSpacing: "2px",
            }}
          >✦ Developed by Tanishq ✦</motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── USAGE EXAMPLE ────────────────────────────────────────────────────────────
// In your app, call it like:
//
// <ConnectingPage
//   myEmail="you@gmail.com"
//   remoteEmail="friend@gmail.com"
//   onComplete={() => navigate("/room/abc123")}
// />
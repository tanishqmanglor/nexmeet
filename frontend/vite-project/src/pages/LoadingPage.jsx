import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NexMeetLogo from "../assets/nexmeet-logo.png";

const TIPS = [
  "End-to-end encrypted · No account needed · Free forever",
  "Pro tip: Press Space to toggle your microphone",
  "Screen sharing works on Chrome, Edge & Firefox",
  "Your video never leaves your device unencrypted",
];

// ── Liquid SVG Blob ────────────────────────────────────────────────────────────
function LiquidBlob({ size, color, duration, delay, x, y, blur = 0 }) {
  return (
    <motion.div style={{ position: "absolute", width: size, height: size, left: x, top: y, filter: `blur(${blur}px)`, zIndex: 0 }}>
      <motion.svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}
        animate={{ rotate: [0, 360] }} transition={{ duration: duration * 3, repeat: Infinity, ease: "linear" }}
      >
        <motion.path fill={color}
          animate={{ d: [
            "M47.5,-61.1C59.7,-51.4,66.8,-34.9,70.2,-17.5C73.6,-0.1,73.3,18.1,65.5,32.4C57.7,46.7,42.4,57.1,25.8,63.7C9.2,70.3,-8.7,73.1,-25.4,68.4C-42.1,63.6,-57.6,51.4,-66.2,35.4C-74.8,19.4,-76.5,-0.4,-70.5,-17.5C-64.4,-34.5,-50.7,-48.8,-35.7,-57.7C-20.7,-66.6,-4.4,-70.1,11.4,-68.2C27.2,-66.3,35.3,-70.8,47.5,-61.1Z",
            "M38.9,-52.6C50.7,-42.8,60.8,-31.2,66.3,-16.9C71.8,-2.6,72.6,14.3,66.1,28.3C59.6,42.4,45.8,53.6,30.4,60.5C15,67.4,-2.1,70,-19.7,66.5C-37.3,62.9,-55.3,53.1,-64.8,37.8C-74.3,22.4,-75.3,1.5,-69.5,-16.8C-63.6,-35,-51,-50.5,-36.4,-59.7C-21.8,-68.9,-5.2,-71.7,9.1,-68.2C23.4,-64.7,27.1,-62.4,38.9,-52.6Z",
            "M54.2,-67.3C68.3,-56.5,76.5,-38.2,78.8,-19.5C81.1,-0.7,77.6,18.5,68.3,34C59,49.5,43.9,61.2,27,68.2C10.1,75.1,-8.6,77.3,-25.4,72.1C-42.2,66.9,-57.1,54.3,-66.3,38.4C-75.5,22.5,-79,3.3,-74.9,-13.8C-70.8,-30.9,-59.1,-46,-44.9,-57C-30.7,-68,-13.3,-74.9,3.7,-79.5C20.7,-84.1,40.1,-78.1,54.2,-67.3Z",
            "M47.5,-61.1C59.7,-51.4,66.8,-34.9,70.2,-17.5C73.6,-0.1,73.3,18.1,65.5,32.4C57.7,46.7,42.4,57.1,25.8,63.7C9.2,70.3,-8.7,73.1,-25.4,68.4C-42.1,63.6,-57.6,51.4,-66.2,35.4C-74.8,19.4,-76.5,-0.4,-70.5,-17.5C-64.4,-34.5,-50.7,-48.8,-35.7,-57.7C-20.7,-66.6,-4.4,-70.1,11.4,-68.2C27.2,-66.3,35.3,-70.8,47.5,-61.1Z",
          ]}}
          transition={{ duration, delay, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />
      </motion.svg>
    </motion.div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function InfiniteSpinner() {
  return (
    <>
      <style>{`
        @keyframes spinCW  { to { transform: rotate(360deg); } }
        @keyframes spinCCW { to { transform: rotate(-360deg); } }
        @keyframes iconPop {
          0%,100% { box-shadow: 0 0 28px rgba(123,47,190,.25); }
          50%      { box-shadow: 0 0 56px rgba(192,132,252,.55); }
        }
        @keyframes dotBounce {
          0%,80%,100% { transform: scale(.5); opacity:.3; }
          40%          { transform: scale(1.3); opacity:1; }
        }
      `}</style>
      <div style={{ position: "relative", width: 94, height: 94, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", width: 136, height: 136, borderRadius: "50%", border: "2.5px solid transparent", borderTopColor: "#E8A07A", borderBottomColor: "#C084FC", animation: "spinCCW 4.2s linear infinite" }} />
        <div style={{ position: "absolute", width: 112, height: 112, borderRadius: "50%", border: "2px solid transparent", borderLeftColor: "#7B2FBE", borderRightColor: "#F5C5A3", animation: "spinCW 2.8s linear infinite" }} />
        <div style={{ position: "absolute", width: 90, height: 90, borderRadius: "50%", border: "1.5px dashed rgba(123,47,190,0.2)", animation: "spinCCW 9s linear infinite" }} />
        {/* <div style={{ width: 76, height: 76, borderRadius: 22, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, animation: "iconPop 3s ease-in-out infinite" }}>
          <img src={NexMeetLogo} alt="NexMeet" style={{ width: "130%", height: "130%", objectFit: "contain" }} />
        </div> */}
      </div>
      <div style={{ display: "flex", gap: 9, marginTop: 30 }}>
        {[{ c: "#7B2FBE", d: "0s" }, { c: "#E8A07A", d: ".18s" }, { c: "#C084FC", d: ".36s" }].map((dot, i) => (
          <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: dot.c, animation: `dotBounce 1.3s ease-in-out ${dot.d} infinite` }} />
        ))}
      </div>
    </>
  );
}

// ── Main LoadingPage ───────────────────────────────────────────────────────────
export default function LoadingPage({ onComplete }) {
  const [tipIdx, setTipIdx] = useState(0);
  const [done, setDone]     = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDone(true); onComplete?.(); }, 4200);
    return () => clearTimeout(t);
  }, [onComplete]);

  useEffect(() => {
    const iv = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 3500);
    return () => clearInterval(iv);
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.7, ease: "easeInOut" } }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "linear-gradient(135deg,#F0D5F7 0%,#EAC8F8 45%,#FDD5B0 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Forum', serif", overflow: "hidden" }}
        >
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Barriecito&family=Caveat+Brush&family=Forum&display=swap');`}</style>

          {/* Blobs */}
          <LiquidBlob size={580} color="rgba(192,132,252,0.20)" duration={11} delay={0}   x="-16%" y="-18%" blur={36}/>
          <LiquidBlob size={520} color="rgba(245,197,163,0.26)" duration={14} delay={1.2} x="52%"  y="48%"  blur={30}/>
          <LiquidBlob size={420} color="rgba(123,47,190,0.13)"  duration={9}  delay={2.1} x="8%"   y="52%"  blur={26}/>
          <LiquidBlob size={340} color="rgba(245,197,163,0.20)" duration={12} delay={0.6} x="65%"  y="-10%" blur={22}/>
          <LiquidBlob size={240} color="rgba(123,47,190,0.17)"  duration={7}  delay={1.4} x="28%"  y="68%"  blur={16}/>
          <LiquidBlob size={200} color="rgba(232,160,122,0.24)" duration={8.5}delay={0.4} x="72%"  y="28%"  blur={14}/>
          <LiquidBlob size={120} color="rgba(192,132,252,0.30)" duration={5}  delay={0.9} x="12%"  y="18%"  blur={7}/>
          <LiquidBlob size={100} color="rgba(245,197,163,0.35)" duration={6.5}delay={1.7} x="78%"  y="68%"  blur={6}/>

          {/* Glass haze */}
          <div style={{ position: "absolute", inset: 0, zIndex: 1, backdropFilter: "blur(1.5px)", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

          {/* Card */}
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}
            style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.58)", border: "1.5px solid rgba(123,47,190,0.15)", borderRadius: 34, padding: "50px 60px 42px", backdropFilter: "blur(32px)", boxShadow: "0 32px 80px rgba(123,47,190,0.18),inset 0 1px 0 rgba(255,255,255,0.95)" }}
          >
            {/* Top glow */}
            <div style={{ position: "absolute", top: 0, left: "18%", right: "18%", height: 2, background: "linear-gradient(90deg,transparent,rgba(123,47,190,0.55),rgba(232,160,122,0.55),transparent)", borderRadius: "50%" }} />

            {/* Logo + title */}
            <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.75 }} style={{ textAlign: "center", marginBottom: 34 }}>
              <motion.div animate={{ y: [0,-4,0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} style={{ width: 80, height: 80, margin: "0 auto 12px" }}>
                <img src={NexMeetLogo} alt="NexMeet" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </motion.div>
              <div style={{ fontFamily: "'Barriecito', cursive", fontSize: 48, color: "#5A1A9A", letterSpacing: "3px", lineHeight: 1.05, textShadow: "3px 3px 0 rgba(245,197,163,0.85),0 6px 28px rgba(123,47,190,0.2)" }}>NexMeet</div>
              <div style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 15, color: "#8B5E9B", marginTop: 5 }}>Crystal-clear video calls 🌸</div>
            </motion.div>

            {/* Spinner */}
            <motion.div initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.75 }} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <InfiniteSpinner />
            </motion.div>

            {/* Tip */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} style={{ marginTop: 30, minHeight: 24, textAlign: "center", maxWidth: 280 }}>
              <AnimatePresence mode="wait">
                <motion.p key={tipIdx} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }} transition={{ duration: 0.4 }}
                  style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 13, color: "rgba(90,26,154,0.48)", letterSpacing: ".03em", lineHeight: 1.5 }}
                >{TIPS[tipIdx]}</motion.p>
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Credit */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.9 }}
            style={{ position: "absolute", bottom: 26, zIndex: 10, fontFamily: "'Barriecito', cursive", fontSize: 16, color: "rgba(123,47,190,0.4)", letterSpacing: "2px" }}
          >✦ Developed by Tanishq ✦</motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
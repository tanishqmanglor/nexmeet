import React, { useEffect, useState, useCallback } from "react";
import { useSocket } from "../Providers/Socket";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import NexMeetLogo from "../assets/nexmeet-logo.png";

const Home = () => {
  const { socket }  = useSocket();
  const navigate    = useNavigate();
  const [email, setEmail]     = useState("");
  const [roomId, setRoomId]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleRoomJoined = useCallback(({ roomId }) => {
    // ✅ CHANGED: store email → go to ConnectingPage → it redirects to Room
    sessionStorage.setItem("myEmail", email);
    navigate(`/connecting/${roomId}`);
  }, [navigate, email]); // ✅ added `email` to deps

  useEffect(() => {
    socket.on("joined-room", handleRoomJoined);
    socket.on("room-full", () => {
      setError("Room is full! Try a different Room ID.");
      setLoading(false);
    });
    return () => {
      socket.off("joined-room", handleRoomJoined);
      socket.off("room-full");
    };
  }, [socket, handleRoomJoined]);

  const handleJoinRoom = () => {
    if (!email || !roomId) { setError("Please fill in both fields."); return; }
    setError(""); setLoading(true);
    socket.emit("join-room", { roomId, emailId: email });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barriecito&family=Caveat+Brush&family=Forum&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F0D5F7; }
        input::placeholder { color: rgba(90,26,154,0.35); }
        input:focus { outline: none; }
        button:focus { outline: none; }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg,#F0D5F7 0%,#E8C5F5 40%,#F5C5A3 100%)",
        fontFamily: "'Forum', serif", position: "relative", overflow: "hidden",
      }}>
        {/* Ambient orbs */}
        <motion.div animate={{ x: [0,40,0], y: [0,-30,0], scale: [1,1.1,1] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", top: "10%", left: "15%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(123,47,190,0.18) 0%,transparent 70%)", pointerEvents: "none" }}
        />
        <motion.div animate={{ x: [0,-30,0], y: [0,40,0], scale: [1,1.15,1] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", bottom: "10%", right: "10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,197,163,0.5) 0%,transparent 70%)", pointerEvents: "none" }}
        />
        <motion.div animate={{ x: [0,20,0], y: [0,-20,0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", top: "50%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(155,81,224,0.12) 0%,transparent 70%)", pointerEvents: "none" }}
        />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div key={i}
            animate={{ y: [0,-20,0], opacity: [0.4,0.9,0.4] }}
            transition={{ duration: 3 + i * 0.7, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
            style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: i % 2 === 0 ? "#7B2FBE" : "#E8A07A", left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%`, pointerEvents: "none" }}
          />
        ))}

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 150, damping: 20 }}
          style={{
            width: 420,
            background: "rgba(255,255,255,0.72)",
            border: "1.5px solid rgba(123,47,190,0.15)",
            borderRadius: 28, padding: "48px 40px",
            backdropFilter: "blur(28px)",
            boxShadow: "0 24px 80px rgba(123,47,190,0.2), inset 0 1px 0 rgba(255,255,255,0.9)",
            position: "relative", zIndex: 10,
          }}
        >
          {/* Top glow line */}
          <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, background: "linear-gradient(90deg,transparent,rgba(123,47,190,0.7),transparent)", borderRadius: "50%" }} />

          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 38 }}
          >
            <motion.div
              animate={{ rotate: [0,5,-5,0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 90, height: 90, marginBottom: 16 }}
            >
              <img src={NexMeetLogo} alt="NexMeet Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </motion.div>
            <h1 style={{ fontFamily: "'Barriecito', cursive", fontWeight: 400, fontSize: 34, color: "#5A1A9A", letterSpacing: "2px", marginBottom: 6, textShadow: "2px 2px 0px rgba(245,197,163,0.8)" }}>
              NexMeet
            </h1>
            <p style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 15, color: "#8B5E9B" }}>
              Connect instantly with anyone 🌸
            </p>
          </motion.div>

          {/* Inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { placeholder: "Email address", value: email, onChange: setEmail, icon: "✉️", type: "email" },
              { placeholder: "Room ID",       value: roomId, onChange: setRoomId, icon: "🔑", type: "text" },
            ].map((field, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>{field.icon}</span>
                <input
                  type={field.type} placeholder={field.placeholder}
                  value={field.value} onChange={(e) => { field.onChange(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  style={{ width: "100%", padding: "14px 14px 14px 46px", borderRadius: 14, border: "1.5px solid rgba(123,47,190,0.18)", background: "rgba(245,197,163,0.15)", color: "#2D1B4E", fontSize: 15, fontFamily: "'Forum', serif", transition: "border-color 0.2s, background 0.2s" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(123,47,190,0.6)"; e.target.style.background = "rgba(192,132,252,0.1)"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "rgba(123,47,190,0.18)"; e.target.style.background = "rgba(245,197,163,0.15)"; }}
                />
              </motion.div>
            ))}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8, height: 0 }}
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "9px 14px", color: "#dc2626", fontFamily: "'Caveat Brush', cursive", fontSize: 14 }}
                >⚠️ {error}</motion.div>
              )}
            </AnimatePresence>

            {/* Join Button */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 12px 40px rgba(123,47,190,0.5)" }}
                whileTap={{ scale: 0.97 }}
                onClick={handleJoinRoom}
                disabled={loading}
                style={{
                  width: "100%", padding: "15px 0", borderRadius: 14, border: "none",
                  background: loading ? "rgba(123,47,190,0.4)" : "linear-gradient(135deg,#7B2FBE 0%,#C084FC 100%)",
                  color: "#fff", fontFamily: "'Forum', serif", fontWeight: 700, fontSize: 17,
                  cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.5px",
                  boxShadow: "0 8px 24px rgba(123,47,190,0.38)", transition: "background 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }}
                    />
                    Joining…
                  </>
                ) : <>🚀 Join Room</>}
              </motion.button>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{ textAlign: "center", marginTop: 26, fontFamily: "'Caveat Brush', cursive", fontSize: 13, color: "rgba(90,26,154,0.45)", lineHeight: 1.7 }}
          >
            No account needed · End-to-end encrypted · Free forever
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ textAlign: "center", marginTop: 10, fontFamily: "'Barriecito', cursive", fontSize: 14, color: "rgba(123,47,190,0.5)", letterSpacing: "1px" }}
          >
            ✦ Developed by Tanishq ✦
          </motion.p>
        </motion.div>
      </div>
    </>
  );
};

export default Home;
import React, { useEffect, useCallback, useState, useRef } from "react";
import { useSocket } from "../Providers/Socket";
import { usePeer } from "../Providers/Peer";
import { motion, AnimatePresence } from "framer-motion";
import NexMeetLogo from "../assets/nexmeet-logo.png";

const STATE_COLOR = {
  new: "#9B7BB0", connecting: "#E8A07A", connected: "#22c55e",
  disconnected: "#ef4444", failed: "#ef4444", closed: "#9B7BB0",
};

// ── Control Button ─────────────────────────────────────────────────────────────
const CtrlBtn = ({ onClick, label, icon, active, danger, disabled }) => (
  <motion.button
    whileHover={disabled ? {} : { scale: 1.08, y: -2 }}
    whileTap={disabled ? {} : { scale: 0.93 }}
    onClick={onClick} disabled={disabled} title={label}
    style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      padding: "10px 18px", borderRadius: 16, border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      background: danger ? "linear-gradient(135deg,#ef4444,#dc2626)"
        : active ? "linear-gradient(135deg,#E8A07A,#F5C5A3)"
        : "rgba(123,47,190,0.08)",
      color: danger ? "#fff" : "#5A1A9A",
      opacity: disabled ? 0.4 : 1,
      backdropFilter: "blur(10px)",
      border: `1.5px solid ${danger ? "rgba(239,68,68,0.4)" : active ? "rgba(232,160,122,0.6)" : "rgba(123,47,190,0.15)"}`,
      transition: "background 0.2s",
      boxShadow: danger ? "0 4px 20px rgba(239,68,68,0.3)" : active ? "0 4px 20px rgba(232,160,122,0.35)" : "none",
    }}
  >
    <span style={{ fontSize: 18 }}>{icon}</span>
    <span style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 11, fontWeight: 600, opacity: 0.75, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{label}</span>
  </motion.button>
);

// ── Video Tile ─────────────────────────────────────────────────────────────────
const VideoTile = ({ videoRef, label, isMain, isMuted, speaking, waiting, waitingLabel, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay: index * 0.12, type: "spring", stiffness: 180, damping: 20 }}
    style={{
      position: "relative", borderRadius: isMain ? 24 : 18, overflow: "hidden",
      background: "linear-gradient(135deg,#F0D5F7,#E8C5F5)",
      border: speaking ? "2px solid #7B2FBE" : "2px solid rgba(123,47,190,0.18)",
      width: "100%", height: "100%",
      boxShadow: speaking ? "0 0 28px rgba(123,47,190,0.35)" : "0 4px 24px rgba(123,47,190,0.12)",
      transition: "border-color 0.3s, box-shadow 0.3s",
    }}
  >
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 30% 20%,rgba(245,197,163,0.2) 0%,transparent 60%)" }} />
    <video ref={videoRef} autoPlay playsInline muted={isMuted} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

    <AnimatePresence>
      {waiting && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#F0D5F7,#E8C5F5)", gap: 12 }}
        >
          <motion.div animate={{ scale: [1,1.1,1], opacity: [0.5,1,0.5] }} transition={{ duration: 2, repeat: Infinity }} style={{ fontSize: 40 }}>⏳</motion.div>
          <span style={{ color: "#8B5E9B", fontSize: 14, fontFamily: "'Caveat Brush', cursive" }}>Waiting for participant…</span>
          {waitingLabel && <span style={{ color: "rgba(90,26,154,0.45)", fontSize: 12, fontFamily: "'Forum', serif" }}>{waitingLabel}</span>}
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {speaking && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: [0.7,0], scale: [1,1.05] }} exit={{ opacity: 0 }} transition={{ duration: 1.2, repeat: Infinity }}
          style={{ position: "absolute", inset: 0, border: "2px solid #7B2FBE", borderRadius: isMain ? 24 : 18, pointerEvents: "none" }}
        />
      )}
    </AnimatePresence>

    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.12 + 0.2 }}
      style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,0.8)", backdropFilter: "blur(10px)", borderRadius: 10, padding: "4px 12px", color: "#5A1A9A", fontFamily: "'Caveat Brush', cursive", fontSize: 12, fontWeight: 600, border: "1px solid rgba(123,47,190,0.2)", display: "flex", alignItems: "center", gap: 5 }}
    >
      {speaking && <motion.span animate={{ scale: [1,1.4,1] }} transition={{ repeat: Infinity, duration: 0.7 }} style={{ color: "#7B2FBE", fontSize: 8 }}>●</motion.span>}
      {label}
    </motion.div>
  </motion.div>
);

// ── Main Room ──────────────────────────────────────────────────────────────────
const Room = () => {
  const { socket } = useSocket();
  const { peer, createOffer, createAnswer, setRemoteAnswer, sendStream, remoteStream, connectionState } = usePeer();

  const [remoteEmailId, setRemoteEmailId]           = useState(null);
  const [myStream, setMyStream]                     = useState(null);
  const [roomFull, setRoomFull]                     = useState(false);
  const [remoteDisconnected, setRemoteDisconnected] = useState(false);
  const [isMuted, setIsMuted]                       = useState(false);
  const [isCameraOff, setIsCameraOff]               = useState(false);
  const [isScreenSharing, setIsScreenSharing]       = useState(false);
  const [activeTab, setActiveTab]                   = useState("chat");
  const [message, setMessage]                       = useState("");
  const [messages, setMessages]                     = useState([]);
  const [handRaised, setHandRaised]                 = useState(false);
  const [remoteHand, setRemoteHand]                 = useState(null);
  const [mediaRecorder, setMediaRecorder]           = useState(null);
  const [recordedChunks, setRecordedChunks]         = useState([]);
  const [isRecording, setIsRecording]               = useState(false);
  const [callDuration, setCallDuration]             = useState(0);

  const myVideoRef            = useRef(null);
  const remoteVideoRef        = useRef(null);
  const myStreamRef           = useRef(null);
  const remoteEmailIdRef      = useRef(null);
  const pendingOfferEmailsRef = useRef([]);
  const callStartRef          = useRef(null);
  const chatEndRef            = useRef(null);

  useEffect(() => { myStreamRef.current = myStream; }, [myStream]);
  useEffect(() => { remoteEmailIdRef.current = remoteEmailId; }, [remoteEmailId]);

  // Timer
  useEffect(() => {
    if (connectionState === "connected" && !callStartRef.current) callStartRef.current = Date.now();
    if (connectionState === "connected") {
      const iv = setInterval(() => setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000)), 1000);
      return () => clearInterval(iv);
    }
  }, [connectionState]);

  const formatDuration = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Camera
  useEffect(() => {
    let streamRef;
    async function getMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef = stream;
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        setMyStream(stream);
      } catch (err) { console.error("[Media]", err); }
    }
    getMedia();
    return () => streamRef?.getTracks().forEach((t) => t.stop());
  }, []);

  // Send stream + flush pending
  useEffect(() => {
    if (!myStream) return;
    sendStream(myStream);
    if (myVideoRef.current) myVideoRef.current.srcObject = myStream;
    const pending = [...pendingOfferEmailsRef.current];
    pendingOfferEmailsRef.current = [];
    if (pending.length > 0) {
      setTimeout(async () => {
        for (const emailId of pending) {
          try { const offer = await createOffer(); socket.emit("call-user", { offer, emailId }); }
          catch (err) { console.error("[Signaling] queued offer failed:", err); }
        }
      }, 500);
    }
  }, [myStream, sendStream, createOffer, socket]);

  // Remote video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Chat scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Controls
  const toggleMute   = () => { myStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled)); setIsMuted((p) => !p); };
  const toggleCamera = () => { myStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled)); setIsCameraOff((p) => !p); };

  const startScreenShare = async () => {
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (myVideoRef.current) myVideoRef.current.srcObject = ss;
      sendStream(ss); setIsScreenSharing(true);
      ss.getVideoTracks()[0].onended = async () => {
        try { const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); setMyStream(cam); }
        catch (e) { console.error(e); }
        setIsScreenSharing(false);
      };
    } catch (err) { console.error("[ScreenShare]", err); }
  };

  // Chat
  const sendMessage = useCallback(() => {
    if (!message.trim()) return;
    socket.emit("send-message", { message });
    setMessages((p) => [...p, { sender: "Me", message, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setMessage("");
  }, [message, socket]);

  useEffect(() => {
    const h = (d) => setMessages((p) => [...p, d]);
    socket.on("receive-message", h);
    return () => socket.off("receive-message", h);
  }, [socket]);

  // Hand
  const toggleHand = () => { const s = !handRaised; setHandRaised(s); socket.emit("raise-hand", s); };
  useEffect(() => { const h = (d) => setRemoteHand(d); socket.on("remote-hand", h); return () => socket.off("remote-hand", h); }, [socket]);

  // Recording
  const startRecording = () => {
    if (!remoteStream || !myStream) return;
    const combined = new MediaStream([...remoteStream.getTracks(), ...myStream.getAudioTracks()]);
    const rec = new MediaRecorder(combined, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
    rec.ondataavailable = (e) => { if (e.data.size > 0) setRecordedChunks((p) => [...p, e.data]); };
    rec.start(1000); setMediaRecorder(rec); setIsRecording(true);
  };
  const stopRecording = () => { mediaRecorder?.stop(); setIsRecording(false); };

  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `recording-${Date.now()}.webm`; a.click();
      URL.revokeObjectURL(url); setRecordedChunks([]);
    }
  }, [isRecording, recordedChunks]);

  // Signaling
  const handleExistingUsers = useCallback(async ({ users }) => {
    for (const emailId of users) {
      setRemoteEmailId(emailId); setRemoteDisconnected(false);
      if (!myStreamRef.current) { pendingOfferEmailsRef.current.push(emailId); continue; }
      try { sendStream(myStreamRef.current); await new Promise((r) => setTimeout(r, 500)); const offer = await createOffer(); socket.emit("call-user", { offer, emailId }); }
      catch (err) { console.error("[Signaling] createOffer:", err); }
    }
  }, [createOffer, sendStream, socket]);

  const handleNewUserJoined = useCallback(async ({ emailId }) => {
    setRemoteEmailId(emailId); setRemoteDisconnected(false);
    if (!myStreamRef.current) { pendingOfferEmailsRef.current.push(emailId); return; }
    try { sendStream(myStreamRef.current); await new Promise((r) => setTimeout(r, 500)); const offer = await createOffer(); socket.emit("call-user", { offer, emailId }); }
    catch (err) { console.error("[Signaling] createOffer:", err); }
  }, [createOffer, sendStream, socket]);

  const handleIncomingCall = useCallback(async ({ from, offer }) => {
    setRemoteEmailId(from); setRemoteDisconnected(false);
    if (myStreamRef.current) sendStream(myStreamRef.current);
    const answer = await createAnswer(offer);
    socket.emit("call-accepted", { answer, emailId: from });
  }, [createAnswer, sendStream, socket]);

  const handleCallAccepted     = useCallback(async ({ answer }) => { await setRemoteAnswer(answer); }, [setRemoteAnswer]);
  const handleUserDisconnected = useCallback(() => { setRemoteEmailId(null); setRemoteDisconnected(true); pendingOfferEmailsRef.current = []; callStartRef.current = null; setCallDuration(0); }, []);
  const handleRoomFull         = useCallback(() => setRoomFull(true), []);

  useEffect(() => {
    socket.on("all-users",         handleExistingUsers);
    socket.on("user-joined",       handleNewUserJoined);
    socket.on("incoming-call",     handleIncomingCall);
    socket.on("call-accepted",     handleCallAccepted);
    socket.on("user-disconnected", handleUserDisconnected);
    socket.on("room-full",         handleRoomFull);
    return () => {
      socket.off("all-users",         handleExistingUsers);
      socket.off("user-joined",       handleNewUserJoined);
      socket.off("incoming-call",     handleIncomingCall);
      socket.off("call-accepted",     handleCallAccepted);
      socket.off("user-disconnected", handleUserDisconnected);
      socket.off("room-full",         handleRoomFull);
    };
  }, [socket, handleExistingUsers, handleNewUserJoined, handleIncomingCall, handleCallAccepted, handleUserDisconnected, handleRoomFull]);

  // ICE
  useEffect(() => {
    const h = async ({ candidate }) => { if (candidate) { try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error("[ICE]", e); } } };
    socket.on("ice-candidate", h); return () => socket.off("ice-candidate", h);
  }, [peer, socket]);

  useEffect(() => {
    peer.onicecandidate = (ev) => { if (ev.candidate && remoteEmailIdRef.current) socket.emit("ice-candidate", { emailId: remoteEmailIdRef.current, candidate: ev.candidate }); };
  }, [peer, socket]);

  const stateColor = STATE_COLOR[connectionState] ?? "#9B7BB0";

  // ── Room Full ──────────────────────────────────────────────────────────────
  if (roomFull) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barriecito&family=Caveat+Brush&family=Forum&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#F0D5F7,#E8C5F5,#F5C5A3)", fontFamily: "'Forum', serif", gap: 18 }}
      >
        <img src={NexMeetLogo} alt="NexMeet" style={{ width: 90, height: 90, objectFit: "contain" }} />
        <div style={{ fontSize: 56 }}>🚫</div>
        <h2 style={{ fontFamily: "'Barriecito', cursive", fontSize: 34, color: "#5A1A9A", textShadow: "2px 2px 0 rgba(245,197,163,0.8)" }}>Room is Full</h2>
        <p style={{ color: "#8B5E9B", fontSize: 15, fontFamily: "'Caveat Brush', cursive" }}>This room already has the maximum number of participants.</p>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => window.history.back()}
          style={{ marginTop: 8, padding: "13px 32px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#7B2FBE,#C084FC)", color: "#fff", fontFamily: "'Forum', serif", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 8px 24px rgba(123,47,190,0.38)" }}
        >← Go Back</motion.button>
        <p style={{ fontFamily: "'Barriecito', cursive", fontSize: 13, color: "rgba(123,47,190,0.4)" }}>✦ Developed by Tanishq ✦</p>
      </motion.div>
    </>
  );

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barriecito&family=Caveat+Brush&family=Forum&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F0D5F7; overflow: hidden; }
        input::placeholder { color: rgba(90,26,154,0.35); }
        input:focus { outline: none; } button:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(123,47,190,0.2); border-radius: 2px; }
      `}</style>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg,#F0D5F7 0%,#E8C5F5 50%,#FDD5B0 100%)", display: "flex", flexDirection: "column", fontFamily: "'Forum', serif", overflow: "hidden", position: "relative" }}
      >
        {/* Orbs */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <motion.div animate={{ x: [0,30,0], y: [0,-20,0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} style={{ position: "absolute", top: -80, left: -80, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(123,47,190,0.15) 0%,transparent 70%)" }} />
          <motion.div animate={{ x: [0,-20,0], y: [0,30,0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} style={{ position: "absolute", bottom: -80, right: 240, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,197,163,0.4) 0%,transparent 70%)" }} />
        </div>

        {/* Header */}
        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 22 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 22px", flexShrink: 0, borderBottom: "1.5px solid rgba(123,47,190,0.12)", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", zIndex: 10 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <motion.div animate={{ rotate: [0,5,-5,0] }} transition={{ duration: 5, repeat: Infinity }} style={{ width: 44, height: 44 }}>
              <img src={NexMeetLogo} alt="NexMeet" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </motion.div>
            <div>
              <div style={{ fontFamily: "'Barriecito', cursive", fontSize: 22, color: "#5A1A9A", letterSpacing: "1px", textShadow: "1px 1px 0 rgba(245,197,163,0.6)" }}>NexMeet</div>
              <div style={{ fontSize: 11, color: "#8B5E9B", fontFamily: "'Caveat Brush', cursive" }}>
                {connectionState === "connected" ? `Connected · ${formatDuration(callDuration)}` : connectionState}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.div animate={connectionState === "connected" ? { opacity: [1,0.5,1] } : {}} transition={{ duration: 2, repeat: Infinity }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: `${stateColor}22`, border: `1.5px solid ${stateColor}55`, borderRadius: 20, padding: "4px 14px" }}
            >
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: stateColor }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: stateColor, fontFamily: "'Caveat Brush', cursive" }}>{connectionState}</span>
            </motion.div>
            {remoteEmailId && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                style={{ background: "rgba(123,47,190,0.08)", border: "1.5px solid rgba(123,47,190,0.18)", borderRadius: 20, padding: "4px 14px", fontSize: 11, color: "#5A1A9A", fontFamily: "'Forum', serif", fontWeight: 600 }}
              >👤 {remoteEmailId}</motion.div>
            )}
            <div style={{ fontFamily: "'Barriecito', cursive", fontSize: 13, color: "rgba(123,47,190,0.4)" }}>✦ Tanishq</div>
          </div>
        </motion.div>

        {/* Notifications */}
        <AnimatePresence>
          {remoteDisconnected && !remoteEmailId && (
            <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }}
              style={{ background: "rgba(232,160,122,0.2)", borderBottom: "1px solid rgba(232,160,122,0.4)", padding: "8px 22px", fontSize: 13, color: "#C05E2A", fontFamily: "'Caveat Brush', cursive", display: "flex", alignItems: "center", gap: 8 }}
            >⚠️ Remote participant disconnected</motion.div>
          )}
          {remoteHand?.state && (
            <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }}
              style={{ background: "rgba(192,132,252,0.15)", borderBottom: "1px solid rgba(123,47,190,0.2)", padding: "8px 22px", fontSize: 13, color: "#5A1A9A", fontFamily: "'Caveat Brush', cursive", display: "flex", alignItems: "center", gap: 8 }}
            >✋ <strong>{remoteHand.sender}</strong> raised their hand</motion.div>
          )}
        </AnimatePresence>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: "14px 16px", gap: 14, minHeight: 0 }}>

          {/* Videos */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <VideoTile videoRef={remoteVideoRef} label={remoteEmailId ?? "Remote"} isMain isMuted={false}
                speaking={connectionState === "connected" && !!remoteStream} waiting={!remoteStream}
                waitingLabel={remoteEmailId ? `${remoteEmailId} hasn't joined yet` : "Share the room link to invite someone"} index={0}
              />
            </div>
            <div style={{ height: 130, flexShrink: 0 }}>
              <VideoTile videoRef={myVideoRef} label={`You${isScreenSharing ? " 🖥" : ""}`} isMain={false} isMuted speaking={false} waiting={false} index={1} />
            </div>
          </div>

          {/* Right Panel */}
          <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring" }}
            style={{ width: 280, display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.65)", border: "1.5px solid rgba(123,47,190,0.12)", borderRadius: 22, overflow: "hidden", backdropFilter: "blur(20px)", flexShrink: 0, boxShadow: "0 8px 32px rgba(123,47,190,0.1)" }}
          >
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1.5px solid rgba(123,47,190,0.1)", padding: "4px 4px 0", flexShrink: 0 }}>
              {[{ id: "chat", label: "Chat", icon: "💬", badge: messages.length }, { id: "info", label: "Info", icon: "ℹ️" }].map((tab) => (
                <motion.button key={tab.id} whileTap={{ scale: 0.96 }} onClick={() => setActiveTab(tab.id)}
                  style={{ flex: 1, padding: "10px 8px", border: "none", cursor: "pointer", background: "none", color: activeTab === tab.id ? "#5A1A9A" : "rgba(90,26,154,0.4)", fontFamily: "'Caveat Brush', cursive", fontSize: 14, fontWeight: 600, borderBottom: activeTab === tab.id ? "2.5px solid #7B2FBE" : "2.5px solid transparent", transition: "color 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                >
                  {tab.icon} {tab.label}
                  {tab.badge > 0 && <span style={{ background: "rgba(123,47,190,0.15)", color: "#7B2FBE", borderRadius: 10, padding: "0 6px", fontSize: 10 }}>{tab.badge}</span>}
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "chat" ? (
                <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {messages.length === 0 && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, opacity: 0.45 }}>
                        <span style={{ fontSize: 36 }}>💬</span>
                        <span style={{ fontSize: 13, color: "#8B5E9B", fontFamily: "'Caveat Brush', cursive" }}>No messages yet</span>
                      </div>
                    )}
                    {messages.map((msg, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} style={{ display: "flex", flexDirection: "column", alignItems: msg.sender === "Me" ? "flex-end" : "flex-start", gap: 3 }}>
                        {msg.sender !== "Me" && <span style={{ fontSize: 10, fontWeight: 600, color: "#8B5E9B", paddingLeft: 4, fontFamily: "'Caveat Brush', cursive" }}>{msg.sender}</span>}
                        <div style={{ maxWidth: "85%", padding: "8px 13px", borderRadius: msg.sender === "Me" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.sender === "Me" ? "linear-gradient(135deg,#7B2FBE,#C084FC)" : "rgba(245,197,163,0.35)", border: msg.sender === "Me" ? "none" : "1px solid rgba(232,160,122,0.4)", fontSize: 13, color: msg.sender === "Me" ? "#fff" : "#2D1B4E", lineHeight: 1.5, fontFamily: "'Forum', serif" }}>
                          {msg.message}
                        </div>
                        <span style={{ fontSize: 9, color: "rgba(90,26,154,0.35)", padding: "0 4px", fontFamily: "'Caveat Brush', cursive" }}>{msg.time}</span>
                      </motion.div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div style={{ padding: "10px", borderTop: "1.5px solid rgba(123,47,190,0.1)", display: "flex", gap: 8, flexShrink: 0 }}>
                    <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message…"
                      style={{ flex: 1, background: "rgba(245,197,163,0.15)", border: "1.5px solid rgba(123,47,190,0.15)", borderRadius: 12, padding: "8px 13px", color: "#2D1B4E", fontSize: 13, fontFamily: "'Forum', serif" }}
                    />
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={sendMessage}
                      style={{ width: 38, height: 38, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7B2FBE,#C084FC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, boxShadow: "0 4px 12px rgba(123,47,190,0.4)", flexShrink: 0 }}
                    >➤</motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ flex: 1, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
                  {[
                    { label: "Status",       value: connectionState,                   icon: "🔗" },
                    { label: "Duration",      value: formatDuration(callDuration),      icon: "⏱" },
                    { label: "Remote",        value: remoteEmailId ?? "—",              icon: "👤" },
                    { label: "Video",         value: isCameraOff ? "Off" : "On",        icon: "📹" },
                    { label: "Audio",         value: isMuted ? "Muted" : "Active",      icon: "🎙" },
                    { label: "Screen Share",  value: isScreenSharing ? "Active" : "Off",icon: "🖥" },
                    { label: "Recording",     value: isRecording ? "Recording…" : "Off",icon: "⏺" },
                  ].map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, background: "rgba(245,197,163,0.12)", border: "1px solid rgba(123,47,190,0.1)" }}
                    >
                      <span style={{ fontSize: 12, color: "#8B5E9B", display: "flex", alignItems: "center", gap: 6, fontFamily: "'Forum', serif" }}>{item.icon} {item.label}</span>
                      <span style={{ fontSize: 14, color: "#5A1A9A", fontWeight: 700, fontFamily: "'Caveat Brush', cursive" }}>{item.value}</span>
                    </motion.div>
                  ))}
                  <div style={{ textAlign: "center", marginTop: "auto", paddingTop: 12, fontFamily: "'Barriecito', cursive", fontSize: 14, color: "rgba(123,47,190,0.4)", letterSpacing: "1px", borderTop: "1px solid rgba(123,47,190,0.1)" }}>
                    ✦ Developed by Tanishq ✦
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Controls */}
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 22 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", flexShrink: 0, flexWrap: "wrap", borderTop: "1.5px solid rgba(123,47,190,0.12)", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)" }}
        >
          <CtrlBtn onClick={toggleMute}       active={isMuted}         icon={isMuted ? "🔇" : "🎙"}     label={isMuted ? "Unmute" : "Mute"} />
          <CtrlBtn onClick={toggleCamera}     active={isCameraOff}     icon={isCameraOff ? "📷" : "📹"} label={isCameraOff ? "Cam On" : "Cam Off"} />
          <CtrlBtn onClick={startScreenShare} active={isScreenSharing} icon="🖥"                        label={isScreenSharing ? "Sharing…" : "Share"} disabled={isScreenSharing} />
          <CtrlBtn onClick={toggleHand}       active={handRaised}      icon="✋"                         label={handRaised ? "Lower Hand" : "Raise Hand"} />
          <CtrlBtn onClick={isRecording ? stopRecording : startRecording} active={isRecording} danger={isRecording}
            icon={isRecording ? "⏹" : "⏺"} label={isRecording ? "Stop Rec" : "Record"} disabled={!remoteStream && !isRecording}
          />
          <motion.button whileHover={{ scale: 1.05, boxShadow: "0 8px 32px rgba(239,68,68,0.5)" }} whileTap={{ scale: 0.95 }} onClick={() => window.location.href = "/"}
            style={{ padding: "10px 28px", borderRadius: 16, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontFamily: "'Forum', serif", fontWeight: 700, fontSize: 14, boxShadow: "0 4px 20px rgba(239,68,68,0.35)", marginLeft: 8 }}
          >📵 End Call</motion.button>
        </motion.div>
      </motion.div>
    </>
  );
};

export default Room;
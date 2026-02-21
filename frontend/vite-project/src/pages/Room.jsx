import React, { useEffect, useCallback, useState, useRef } from "react";
import { useSocket } from "../Providers/Socket";
import { usePeer } from "../Providers/Peer";
import { motion, AnimatePresence } from "framer-motion";
import NexMeetLogo from "../assets/nexmeet-logo.png";

const STATE_COLOR = {
  new: "#9B7BB0", connecting: "#E8A07A", connected: "#22c55e",
  disconnected: "#ef4444", failed: "#ef4444", closed: "#9B7BB0",
};

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const MicOnIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const MicOffIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const CamOnIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
const CamOffIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06A4 4 0 1 1 7.72 7.72"/></svg>;
const ScreenIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const HandIcon     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>;
const ChatIcon     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const PhoneOffIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.61a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.34 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.28 9"/><line x1="23" y1="1" x2="1" y2="23"/></svg>;
const RecordIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>;
const StopIcon     = () => <svg width="20" height="20" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/></svg>;
const SendIcon     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const CloseIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

// ── Control Button ─────────────────────────────────────────────────────────────
const CtrlBtn = ({ onClick, label, icon: Icon, active, danger, disabled, badge }) => (
  <div style={{ position: "relative" }}>
    <motion.button
      whileHover={disabled ? {} : { scale: 1.08, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.92 }}
      onClick={onClick} disabled={disabled} title={label}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "9px 14px", borderRadius: 16, border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: danger
          ? "linear-gradient(135deg,#ef4444,#dc2626)"
          : active
          ? "linear-gradient(135deg,#E8A07A,#F5C5A3)"
          : "rgba(123,47,190,0.08)",
        color: danger ? "#fff" : active ? "#fff" : "#5A1A9A",
        opacity: disabled ? 0.38 : 1,
        backdropFilter: "blur(10px)",
        border: `1.5px solid ${
          danger ? "rgba(239,68,68,0.4)"
          : active ? "rgba(232,160,122,0.6)"
          : "rgba(123,47,190,0.15)"
        }`,
        transition: "all 0.18s",
        boxShadow: danger
          ? "0 4px 20px rgba(239,68,68,0.3)"
          : active
          ? "0 4px 20px rgba(232,160,122,0.35)"
          : "none",
        minWidth: 52,
      }}
    >
      <Icon />
      <span style={{
        fontFamily: "'Caveat Brush', cursive", fontSize: 10, fontWeight: 600,
        opacity: 0.78, whiteSpace: "nowrap",
      }}>{label}</span>
    </motion.button>
    {badge > 0 && (
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        style={{
          position: "absolute", top: -5, right: -5,
          background: "#ef4444", color: "#fff", borderRadius: "50%",
          width: 18, height: 18, fontSize: 9, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "2px solid #F0D5F7", pointerEvents: "none",
        }}
      >{badge > 9 ? "9+" : badge}</motion.div>
    )}
  </div>
);

// ── Video Tile ─────────────────────────────────────────────────────────────────
const VideoTile = ({ videoRef, label, isMuted, speaking, waiting, waitingLabel, index = 0, handRaised }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.93, y: 14 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay: index * 0.1, type: "spring", stiffness: 180, damping: 20 }}
    style={{
      position: "relative", borderRadius: 20, overflow: "hidden",
      background: "linear-gradient(135deg,#F0D5F7,#E8C5F5)",
      border: speaking ? "2.5px solid #7B2FBE" : "2px solid rgba(123,47,190,0.18)",
      width: "100%", height: "100%",
      boxShadow: speaking
        ? "0 0 30px rgba(123,47,190,0.38), 0 4px 24px rgba(123,47,190,0.14)"
        : "0 4px 24px rgba(123,47,190,0.12)",
      transition: "border-color 0.3s, box-shadow 0.3s",
    }}
  >
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 30% 20%,rgba(245,197,163,0.18) 0%,transparent 60%)" }} />
    <video ref={videoRef} autoPlay playsInline muted={isMuted}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

    <AnimatePresence>
      {waiting && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#F0D5F7,#E8C5F5)", gap: 12 }}
        >
          <motion.div animate={{ scale: [1,1.12,1], opacity: [0.5,1,0.5] }} transition={{ duration: 2.2, repeat: Infinity }} style={{ fontSize: 44 }}>⏳</motion.div>
          <span style={{ color: "#8B5E9B", fontSize: 14, fontFamily: "'Caveat Brush', cursive" }}>Waiting for participant…</span>
          {waitingLabel && <span style={{ color: "rgba(90,26,154,0.45)", fontSize: 12, fontFamily: "'Forum', serif", textAlign: "center", maxWidth: 200, padding: "0 16px" }}>{waitingLabel}</span>}
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {speaking && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0.65,0], scale: [1,1.03] }} exit={{ opacity: 0 }} transition={{ duration: 1.3, repeat: Infinity }}
          style={{ position: "absolute", inset: 0, border: "2.5px solid #7B2FBE", borderRadius: 20, pointerEvents: "none" }} />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {handRaised && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.93)", backdropFilter: "blur(18px)",
            borderRadius: 22, padding: "18px 32px",
            border: "2px solid rgba(123,47,190,0.22)",
            boxShadow: "0 16px 48px rgba(123,47,190,0.28)",
            zIndex: 10, pointerEvents: "none",
          }}
        >
          <motion.span
            animate={{ rotate: [0, 18, -12, 18, 0], scale: [1, 1.25, 1, 1.2, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.8 }}
            style={{ fontSize: 50, lineHeight: 1, display: "block" }}
          >✋</motion.span>
          <span style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 15, color: "#5A1A9A", fontWeight: 700, whiteSpace: "nowrap" }}>
            {label} raised hand!
          </span>
        </motion.div>
      )}
    </AnimatePresence>

    <motion.div
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.2 }}
      style={{
        position: "absolute", bottom: 10, left: 10,
        background: "rgba(255,255,255,0.82)", backdropFilter: "blur(10px)",
        borderRadius: 9, padding: "3px 11px",
        color: "#5A1A9A", fontFamily: "'Caveat Brush', cursive", fontSize: 12, fontWeight: 600,
        border: "1px solid rgba(123,47,190,0.18)",
        display: "flex", alignItems: "center", gap: 5,
      }}
    >
      {speaking && (
        <motion.span animate={{ scale: [1,1.5,1] }} transition={{ repeat: Infinity, duration: 0.7 }}
          style={{ color: "#7B2FBE", fontSize: 7, lineHeight: 1 }}>●</motion.span>
      )}
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
  const [chatOpen, setChatOpen]                     = useState(false);
  const [message, setMessage]                       = useState("");
  const [messages, setMessages]                     = useState([]);
  const [unreadCount, setUnreadCount]               = useState(0);
  const [handRaised, setHandRaised]                 = useState(false);
  const [remoteHandRaised, setRemoteHandRaised]     = useState(false);
  const [mediaRecorder, setMediaRecorder]           = useState(null);
  const [recordedChunks, setRecordedChunks]         = useState([]);
  const [isRecording, setIsRecording]               = useState(false);
  const [callDuration, setCallDuration]             = useState(0);
  const [isMobile, setIsMobile]                     = useState(false);

  const myVideoRef            = useRef(null);
  const remoteVideoRef        = useRef(null);
  const myStreamRef           = useRef(null);
  const remoteEmailIdRef      = useRef(null);
  const pendingOfferEmailsRef = useRef([]);
  const callStartRef          = useRef(null);
  const chatEndRef            = useRef(null);
  const prevMsgLenRef         = useRef(0);

  // Responsive
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
    let stream;
    let cancelled = false;
    async function getMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        setMyStream(stream);
      } catch (err) { console.error("[Media]", err); }
    }
    getMedia();
    return () => { cancelled = true; stream?.getTracks().forEach((t) => t.stop()); };
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

  // Unread count
  useEffect(() => {
    if (messages.length > prevMsgLenRef.current) {
      const last = messages[messages.length - 1];
      if (!chatOpen && last?.sender !== "Me") setUnreadCount((p) => p + 1);
    }
    prevMsgLenRef.current = messages.length;
  }, [messages, chatOpen]);

  useEffect(() => { if (chatOpen) setUnreadCount(0); }, [chatOpen]);

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

  const stopScreenShare = () => { myStream?.getVideoTracks().forEach((t) => t.stop()); setIsScreenSharing(false); };

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

  // Hand raise
  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    socket.emit("raise-hand", next);
  };

  useEffect(() => {
    const h = ({ state }) => setRemoteHandRaised(state);
    socket.on("remote-hand", h);
    return () => socket.off("remote-hand", h);
  }, [socket]);

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

  // ── Signaling ──────────────────────────────────────────────────────────────
  const handleExistingUsers = useCallback(async ({ users }) => {
    for (const emailId of users) {
      setRemoteEmailId(emailId);
      setRemoteDisconnected(false);
      // ✅ ADDED: store remote email so ConnectingPage can show their name
      sessionStorage.setItem("remoteEmail", emailId);
      if (!myStreamRef.current) { pendingOfferEmailsRef.current.push(emailId); continue; }
      try {
        sendStream(myStreamRef.current);
        await new Promise((r) => setTimeout(r, 500));
        const offer = await createOffer();
        socket.emit("call-user", { offer, emailId });
      } catch (err) { console.error("[Signaling] createOffer:", err); }
    }
  }, [createOffer, sendStream, socket]);

  const handleNewUserJoined = useCallback(async ({ emailId }) => {
    setRemoteEmailId(emailId);
    setRemoteDisconnected(false);
    // ✅ ADDED: store remote email so ConnectingPage can show their name
    sessionStorage.setItem("remoteEmail", emailId);
    if (!myStreamRef.current) { pendingOfferEmailsRef.current.push(emailId); return; }
    try {
      sendStream(myStreamRef.current);
      await new Promise((r) => setTimeout(r, 500));
      const offer = await createOffer();
      socket.emit("call-user", { offer, emailId });
    } catch (err) { console.error("[Signaling] createOffer:", err); }
  }, [createOffer, sendStream, socket]);

  const handleIncomingCall = useCallback(async ({ from, offer }) => {
    setRemoteEmailId(from);
    setRemoteDisconnected(false);
    if (myStreamRef.current) sendStream(myStreamRef.current);
    const answer = await createAnswer(offer);
    socket.emit("call-accepted", { answer, emailId: from });
  }, [createAnswer, sendStream, socket]);

  const handleCallAccepted     = useCallback(async ({ answer }) => { await setRemoteAnswer(answer); }, [setRemoteAnswer]);
  const handleUserDisconnected = useCallback(() => {
    setRemoteEmailId(null);
    setRemoteDisconnected(true);
    setRemoteHandRaised(false);
    sessionStorage.removeItem("remoteEmail"); // ✅ ADDED: clean up on disconnect
    pendingOfferEmailsRef.current = [];
    callStartRef.current = null;
    setCallDuration(0);
  }, []);
  const handleRoomFull = useCallback(() => setRoomFull(true), []);

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

  useEffect(() => {
    const h = async ({ candidate }) => {
      if (candidate) { try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error("[ICE]", e); } }
    };
    socket.on("ice-candidate", h); return () => socket.off("ice-candidate", h);
  }, [peer, socket]);

  useEffect(() => {
    peer.onicecandidate = (ev) => {
      if (ev.candidate && remoteEmailIdRef.current)
        socket.emit("ice-candidate", { emailId: remoteEmailIdRef.current, candidate: ev.candidate });
    };
  }, [peer, socket]);

  const stateColor = STATE_COLOR[connectionState] ?? "#9B7BB0";

  // ── Room Full ──────────────────────────────────────────────────────────────
  if (roomFull) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barriecito&family=Caveat+Brush&family=Forum&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
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

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}
        style={{
          width: "100vw", height: "100dvh",
          background: "linear-gradient(135deg,#F0D5F7 0%,#E8C5F5 50%,#FDD5B0 100%)",
          display: "flex", flexDirection: "column", fontFamily: "'Forum', serif",
          overflow: "hidden", position: "relative",
        }}
      >
        {/* Orbs */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <motion.div animate={{ x: [0,30,0], y: [0,-20,0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", top: -80, left: -80, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(123,47,190,0.14) 0%,transparent 70%)" }} />
          <motion.div animate={{ x: [0,-20,0], y: [0,30,0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", bottom: -80, right: 240, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,197,163,0.38) 0%,transparent 70%)" }} />
        </div>

        {/* ── NAVBAR ── */}
        <motion.nav
          initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 22 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: isMobile ? "0 12px" : "0 22px",
            height: isMobile ? 52 : 60, flexShrink: 0,
            borderBottom: "1.5px solid rgba(123,47,190,0.12)",
            background: "rgba(255,255,255,0.62)", backdropFilter: "blur(20px)", zIndex: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.img src={NexMeetLogo} alt="NexMeet"
              animate={{ rotate: [0,5,-5,0] }} transition={{ duration: 5, repeat: Infinity }}
              style={{ width: isMobile ? 30 : 40, height: isMobile ? 30 : 40, objectFit: "contain" }}
            />
            {!isMobile && (
              <div>
                <div style={{ fontFamily: "'Barriecito', cursive", fontSize: 21, color: "#5A1A9A", letterSpacing: "1px", textShadow: "1px 1px 0 rgba(245,197,163,0.6)" }}>NexMeet</div>
                <div style={{ fontSize: 10, color: "#8B5E9B", fontFamily: "'Caveat Brush', cursive", marginTop: -2 }}>
                  {connectionState === "connected" ? `Connected · ${formatDuration(callDuration)}` : connectionState}
                </div>
              </div>
            )}
          </div>

          <motion.div
            animate={connectionState === "connected" ? { opacity: [1,0.55,1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: `${stateColor}1A`, border: `1.5px solid ${stateColor}44`, borderRadius: 20, padding: isMobile ? "3px 10px" : "4px 14px" }}
          >
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: stateColor }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: stateColor, fontFamily: "'Caveat Brush', cursive" }}>
              {isMobile && connectionState === "connected" ? formatDuration(callDuration) : connectionState}
            </span>
          </motion.div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {remoteEmailId && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                style={{
                  background: "rgba(123,47,190,0.08)", border: "1.5px solid rgba(123,47,190,0.18)",
                  borderRadius: 20, padding: "3px 12px", fontSize: 11,
                  color: "#5A1A9A", fontFamily: "'Forum', serif", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 5,
                  maxWidth: isMobile ? 110 : 200, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                }}
              >👤 {remoteEmailId}</motion.div>
            )}
            {!isMobile && <div style={{ fontFamily: "'Barriecito', cursive", fontSize: 13, color: "rgba(123,47,190,0.35)" }}>✦ Tanishq</div>}
          </div>
        </motion.nav>

        {/* Disconnect banner */}
        <AnimatePresence>
          {remoteDisconnected && !remoteEmailId && (
            <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }}
              style={{ background: "rgba(232,160,122,0.2)", borderBottom: "1px solid rgba(232,160,122,0.4)", padding: "7px 22px", fontSize: 12, color: "#C05E2A", fontFamily: "'Caveat Brush', cursive", display: "flex", alignItems: "center", gap: 8 }}
            >⚠️ Remote participant disconnected</motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: isMobile ? "8px" : "12px 14px", gap: isMobile ? 8 : 12, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 8 : 12, minWidth: 0, minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
              <VideoTile
                videoRef={remoteVideoRef} label={remoteEmailId ?? "Remote"}
                isMuted={false} speaking={connectionState === "connected" && !!remoteStream}
                waiting={!remoteStream}
                waitingLabel={remoteEmailId ? `Connecting with ${remoteEmailId}…` : "Share the room link to invite someone"}
                index={0} handRaised={remoteHandRaised}
              />
            </div>
            <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
              <VideoTile
                videoRef={myVideoRef} label={`You${isScreenSharing ? " 🖥" : ""}`}
                isMuted speaking={false} waiting={false} index={1} handRaised={handRaised}
              />
            </div>
          </div>

          {/* Chat panel */}
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                key="chat"
                initial={{ x: isMobile ? 0 : 320, y: isMobile ? "100%" : 0, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                exit={{ x: isMobile ? 0 : 320, y: isMobile ? "100%" : 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                style={{
                  ...(isMobile ? { position: "absolute", inset: 0, zIndex: 50, borderRadius: 20 } : { width: 296, flexShrink: 0 }),
                  display: "flex", flexDirection: "column",
                  background: "rgba(255,255,255,0.9)", backdropFilter: "blur(24px)",
                  border: "1.5px solid rgba(123,47,190,0.15)", borderRadius: 20,
                  overflow: "hidden", boxShadow: "0 12px 40px rgba(123,47,190,0.16)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: "1.5px solid rgba(123,47,190,0.1)", background: "rgba(123,47,190,0.05)", flexShrink: 0 }}>
                  <span style={{ color: "#5A1A9A", fontFamily: "'Caveat Brush', cursive", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}><ChatIcon /> Chat</span>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setChatOpen(false)}
                    style={{ background: "rgba(123,47,190,0.08)", border: "1.5px solid rgba(123,47,190,0.18)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "#7B2FBE", display: "flex", alignItems: "center", justifyContent: "center" }}
                  ><CloseIcon /></motion.button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {messages.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, opacity: 0.42 }}>
                      <span style={{ fontSize: 38 }}>💬</span>
                      <span style={{ fontSize: 13, color: "#8B5E9B", fontFamily: "'Caveat Brush', cursive" }}>No messages yet</span>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      style={{ display: "flex", flexDirection: "column", alignItems: msg.sender === "Me" ? "flex-end" : "flex-start", gap: 3 }}
                    >
                      {msg.sender !== "Me" && <span style={{ fontSize: 10, fontWeight: 600, color: "#8B5E9B", paddingLeft: 4, fontFamily: "'Caveat Brush', cursive" }}>{msg.sender}</span>}
                      <div style={{ maxWidth: "85%", padding: "8px 13px", borderRadius: msg.sender === "Me" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.sender === "Me" ? "linear-gradient(135deg,#7B2FBE,#C084FC)" : "rgba(245,197,163,0.3)", border: msg.sender === "Me" ? "none" : "1px solid rgba(232,160,122,0.4)", fontSize: 13, color: msg.sender === "Me" ? "#fff" : "#2D1B4E", lineHeight: 1.5, fontFamily: "'Forum', serif" }}>{msg.message}</div>
                      <span style={{ fontSize: 9, color: "rgba(90,26,154,0.35)", padding: "0 4px", fontFamily: "'Caveat Brush', cursive" }}>{msg.time}</span>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ padding: "10px 12px", borderTop: "1.5px solid rgba(123,47,190,0.1)", display: "flex", gap: 8, flexShrink: 0 }}>
                  <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message…"
                    style={{ flex: 1, background: "rgba(245,197,163,0.15)", border: "1.5px solid rgba(123,47,190,0.15)", borderRadius: 12, padding: "9px 13px", color: "#2D1B4E", fontSize: 13, fontFamily: "'Forum', serif" }}
                  />
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={sendMessage}
                    style={{ width: 38, height: 38, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7B2FBE,#C084FC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 12px rgba(123,47,190,0.4)", flexShrink: 0 }}
                  ><SendIcon /></motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── CONTROLS BAR ── */}
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 22 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 4 : 8, padding: isMobile ? "8px 4px env(safe-area-inset-bottom,8px)" : "10px 20px", flexShrink: 0, flexWrap: "wrap", borderTop: "1.5px solid rgba(123,47,190,0.12)", background: "rgba(255,255,255,0.65)", backdropFilter: "blur(20px)" }}
        >
          <CtrlBtn onClick={toggleMute}   active={isMuted}    icon={isMuted ? MicOffIcon : MicOnIcon}     label={isMuted ? "Unmute" : "Mute"} />
          <CtrlBtn onClick={toggleCamera} active={isCameraOff} icon={isCameraOff ? CamOffIcon : CamOnIcon} label={isCameraOff ? "Cam On" : "Cam Off"} />
          <CtrlBtn onClick={isScreenSharing ? stopScreenShare : startScreenShare} active={isScreenSharing} icon={ScreenIcon} label={isScreenSharing ? "Stop" : "Share"} />

          <motion.div animate={handRaised ? { rotate: [0, 14, -10, 14, 0] } : {}} transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}>
            <CtrlBtn onClick={toggleHand} active={handRaised} icon={HandIcon} label={handRaised ? "Lower" : "Raise"} />
          </motion.div>

          <CtrlBtn onClick={isRecording ? stopRecording : startRecording} active={isRecording} danger={isRecording} icon={isRecording ? StopIcon : RecordIcon} label={isRecording ? "Stop" : "Record"} disabled={!remoteStream && !isRecording} />

          <div style={{ width: 1, height: 34, background: "rgba(123,47,190,0.18)", margin: "0 2px", flexShrink: 0 }} />
          <CtrlBtn onClick={() => setChatOpen((p) => !p)} active={chatOpen} icon={ChatIcon} label="Chat" badge={unreadCount} />
          <div style={{ width: 1, height: 34, background: "rgba(123,47,190,0.18)", margin: "0 2px", flexShrink: 0 }} />

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 8px 32px rgba(239,68,68,0.5)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = "/"}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: isMobile ? "9px 14px" : "9px 20px", borderRadius: 16, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", boxShadow: "0 4px 20px rgba(239,68,68,0.35)" }}
          >
            <PhoneOffIcon />
            <span style={{ fontFamily: "'Caveat Brush', cursive", fontSize: 10, opacity: 0.9, whiteSpace: "nowrap" }}>End Call</span>
          </motion.button>
        </motion.div>

        {!isMobile && (
          <div style={{ textAlign: "center", padding: "2px 0 4px", fontFamily: "'Barriecito', cursive", fontSize: 11, color: "rgba(123,47,190,0.3)", flexShrink: 0 }}>
            ✦ Developed by Tanishq ✦
          </div>
        )}
      </motion.div>
    </>
  );
};

export default Room;
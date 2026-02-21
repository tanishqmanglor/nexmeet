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
      padding: "10px 16px", borderRadius: 16, border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      background: danger
        ? "linear-gradient(135deg,#ef4444,#dc2626)"
        : active
        ? "linear-gradient(135deg,#7B2FBE,#C084FC)"
        : "rgba(255,255,255,0.18)",
      color: danger ? "#fff" : active ? "#fff" : "rgba(255,255,255,0.9)",
      opacity: disabled ? 0.4 : 1,
      backdropFilter: "blur(10px)",
      border: `1.5px solid ${
        danger ? "rgba(239,68,68,0.5)"
        : active ? "rgba(192,132,252,0.6)"
        : "rgba(255,255,255,0.2)"
      }`,
      transition: "all 0.2s",
      boxShadow: danger
        ? "0 4px 20px rgba(239,68,68,0.4)"
        : active
        ? "0 4px 20px rgba(123,47,190,0.4)"
        : "0 2px 8px rgba(0,0,0,0.2)",
      minWidth: 64,
    }}
  >
    <span style={{ fontSize: 20 }}>{icon}</span>
    <span style={{
      fontFamily: "'Caveat Brush', cursive", fontSize: 10, fontWeight: 600,
      opacity: 0.9, letterSpacing: "0.03em", whiteSpace: "nowrap"
    }}>{label}</span>
  </motion.button>
);

// ── Video Tile ─────────────────────────────────────────────────────────────────
const VideoTile = ({ videoRef, label, isMain, isMuted, speaking, waiting, waitingLabel, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 16 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay: index * 0.1, type: "spring", stiffness: 180, damping: 20 }}
    style={{
      position: "relative", borderRadius: isMain ? 20 : 14, overflow: "hidden",
      background: "linear-gradient(135deg,#1a0533,#2d1060)",
      border: speaking ? "2px solid #C084FC" : "2px solid rgba(123,47,190,0.25)",
      width: "100%", height: "100%",
      boxShadow: speaking
        ? "0 0 32px rgba(192,132,252,0.5), 0 8px 32px rgba(0,0,0,0.4)"
        : "0 8px 32px rgba(0,0,0,0.35)",
      transition: "border-color 0.3s, box-shadow 0.3s",
    }}
  >
    <video
      ref={videoRef} autoPlay playsInline muted={isMuted}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />

    <AnimatePresence>
      {waiting && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg,#1a0533,#2d1060)", gap: 14,
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            style={{ fontSize: 44 }}
          >⏳</motion.div>
          <span style={{ color: "#C084FC", fontSize: 14, fontFamily: "'Caveat Brush', cursive" }}>
            Waiting for participant…
          </span>
          {waitingLabel && (
            <span style={{ color: "rgba(192,132,252,0.5)", fontSize: 12, fontFamily: "'Forum', serif", textAlign: "center", maxWidth: 200 }}>
              {waitingLabel}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>

    {/* Speaking ring */}
    <AnimatePresence>
      {speaking && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: [0.6, 0], scale: [1, 1.04] }}
          exit={{ opacity: 0 }} transition={{ duration: 1.4, repeat: Infinity }}
          style={{
            position: "absolute", inset: 0,
            border: "2px solid #C084FC", borderRadius: isMain ? 20 : 14, pointerEvents: "none",
          }}
        />
      )}
    </AnimatePresence>

    {/* Label */}
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.2 }}
      style={{
        position: "absolute", bottom: 10, left: 10,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)",
        borderRadius: 8, padding: "3px 10px",
        color: "#fff", fontFamily: "'Caveat Brush', cursive", fontSize: 12, fontWeight: 600,
        border: "1px solid rgba(255,255,255,0.12)",
        display: "flex", alignItems: "center", gap: 5,
      }}
    >
      {speaking && (
        <motion.span
          animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}
          style={{ color: "#C084FC", fontSize: 8 }}
        >●</motion.span>
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
  const [infoOpen, setInfoOpen]                     = useState(false);
  const [message, setMessage]                       = useState("");
  const [messages, setMessages]                     = useState([]);
  const [unreadCount, setUnreadCount]               = useState(0);
  const [handRaised, setHandRaised]                 = useState(false);
  const [remoteHand, setRemoteHand]                 = useState(null);
  const [mediaRecorder, setMediaRecorder]           = useState(null);
  const [recordedChunks, setRecordedChunks]         = useState([]);
  const [isRecording, setIsRecording]               = useState(false);
  const [callDuration, setCallDuration]             = useState(0);
  const [notification, setNotification]             = useState(null);

  const myVideoRef            = useRef(null);
  const remoteVideoRef        = useRef(null);
  const myStreamRef           = useRef(null);
  const remoteEmailIdRef      = useRef(null);
  const pendingOfferEmailsRef = useRef([]);
  const callStartRef          = useRef(null);
  const chatEndRef            = useRef(null);

  useEffect(() => { myStreamRef.current = myStream; }, [myStream]);
  useEffect(() => { remoteEmailIdRef.current = remoteEmailId; }, [remoteEmailId]);

  // Notification helper
  const showNotification = (msg, duration = 3000) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), duration);
  };

  // Timer
  useEffect(() => {
    if (connectionState === "connected" && !callStartRef.current)
      callStartRef.current = Date.now();
    if (connectionState === "connected") {
      const iv = setInterval(
        () => setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000)),
        1000
      );
      return () => clearInterval(iv);
    }
  }, [connectionState]);

  const formatDuration = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Camera — FIXED race condition ──────────────────────────────────────────
  useEffect(() => {
    let stream;
    let cancelled = false;

    async function getMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        setMyStream(stream);
      } catch (err) {
        console.error("[Media]", err);
        if (!cancelled) showNotification("⚠️ Camera/mic unavailable");
      }
    }

    getMedia();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
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
          try {
            const offer = await createOffer();
            socket.emit("call-user", { offer, emailId });
          } catch (err) { console.error("[Signaling] queued offer failed:", err); }
        }
      }, 500);
    }
  }, [myStream, sendStream, createOffer, socket]);

  // Remote video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream)
        remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Chat scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Unread badge
  useEffect(() => {
    if (!chatOpen) setUnreadCount((p) => p + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => { if (chatOpen) setUnreadCount(0); }, [chatOpen]);

  // Controls
  const toggleMute = () => {
    myStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((p) => !p);
  };
  const toggleCamera = () => {
    myStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsCameraOff((p) => !p);
  };

  const startScreenShare = async () => {
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (myVideoRef.current) myVideoRef.current.srcObject = ss;
      sendStream(ss);
      setIsScreenSharing(true);
      ss.getVideoTracks()[0].onended = async () => {
        try {
          const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setMyStream(cam);
        } catch (e) { console.error(e); }
        setIsScreenSharing(false);
      };
    } catch (err) { console.error("[ScreenShare]", err); }
  };

  const stopScreenShare = () => {
    myStream?.getVideoTracks().forEach((t) => t.stop());
    setIsScreenSharing(false);
  };

  // Chat
  const sendMessage = useCallback(() => {
    if (!message.trim()) return;
    socket.emit("send-message", { message });
    setMessages((p) => [...p, {
      sender: "Me", message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    setMessage("");
  }, [message, socket]);

  useEffect(() => {
    const h = (d) => {
      setMessages((p) => [...p, d]);
      if (!chatOpen) showNotification(`💬 ${d.sender}: ${d.message.slice(0, 40)}`);
    };
    socket.on("receive-message", h);
    return () => socket.off("receive-message", h);
  }, [socket, chatOpen]);

  // Hand raise
  const toggleHand = () => {
    const s = !handRaised;
    setHandRaised(s);
    socket.emit("raise-hand", s);
    if (s) showNotification("✋ You raised your hand");
  };

  useEffect(() => {
    const h = (d) => {
      setRemoteHand(d);
      if (d.state) showNotification(`✋ ${d.sender} raised their hand`);
    };
    socket.on("remote-hand", h);
    return () => socket.off("remote-hand", h);
  }, [socket]);

  // Recording
  const startRecording = () => {
    if (!remoteStream || !myStream) return;
    const combined = new MediaStream([...remoteStream.getTracks(), ...myStream.getAudioTracks()]);
    const rec = new MediaRecorder(combined, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9" : "video/webm",
    });
    rec.ondataavailable = (e) => { if (e.data.size > 0) setRecordedChunks((p) => [...p, e.data]); };
    rec.start(1000);
    setMediaRecorder(rec);
    setIsRecording(true);
    showNotification("⏺ Recording started");
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    showNotification("⏹ Recording saved");
  };

  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `recording-${Date.now()}.webm`; a.click();
      URL.revokeObjectURL(url);
      setRecordedChunks([]);
    }
  }, [isRecording, recordedChunks]);

  // ── Signaling ────────────────────────────────────────────────────────────────
  const handleExistingUsers = useCallback(async ({ users }) => {
    for (const emailId of users) {
      setRemoteEmailId(emailId); setRemoteDisconnected(false);
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
    setRemoteEmailId(emailId); setRemoteDisconnected(false);
    showNotification(`👤 ${emailId} joined`);
    if (!myStreamRef.current) { pendingOfferEmailsRef.current.push(emailId); return; }
    try {
      sendStream(myStreamRef.current);
      await new Promise((r) => setTimeout(r, 500));
      const offer = await createOffer();
      socket.emit("call-user", { offer, emailId });
    } catch (err) { console.error("[Signaling] createOffer:", err); }
  }, [createOffer, sendStream, socket]);

  const handleIncomingCall = useCallback(async ({ from, offer }) => {
    setRemoteEmailId(from); setRemoteDisconnected(false);
    if (myStreamRef.current) sendStream(myStreamRef.current);
    const answer = await createAnswer(offer);
    socket.emit("call-accepted", { answer, emailId: from });
  }, [createAnswer, sendStream, socket]);

  const handleCallAccepted = useCallback(async ({ answer }) => {
    await setRemoteAnswer(answer);
  }, [setRemoteAnswer]);

  const handleUserDisconnected = useCallback(() => {
    setRemoteEmailId(null); setRemoteDisconnected(true);
    pendingOfferEmailsRef.current = [];
    callStartRef.current = null; setCallDuration(0);
    showNotification("⚠️ Participant disconnected");
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

  // ICE
  useEffect(() => {
    const h = async ({ candidate }) => {
      if (candidate) {
        try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (e) { console.error("[ICE]", e); }
      }
    };
    socket.on("ice-candidate", h);
    return () => socket.off("ice-candidate", h);
  }, [peer, socket]);

  useEffect(() => {
    peer.onicecandidate = (ev) => {
      if (ev.candidate && remoteEmailIdRef.current)
        socket.emit("ice-candidate", { emailId: remoteEmailIdRef.current, candidate: ev.candidate });
    };
  }, [peer, socket]);

  const stateColor = STATE_COLOR[connectionState] ?? "#9B7BB0";

  // ── Room Full ────────────────────────────────────────────────────────────────
  if (roomFull) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barriecito&family=Caveat+Brush&family=Forum&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        style={{
          minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#0d0021 0%,#1a0040 50%,#0d0021 100%)",
          fontFamily: "'Forum', serif", gap: 18,
        }}
      >
        <div style={{ fontSize: 56 }}>🚫</div>
        <h2 style={{ fontFamily: "'Barriecito', cursive", fontSize: 34, color: "#C084FC" }}>Room is Full</h2>
        <p style={{ color: "#9B7BB0", fontSize: 15, fontFamily: "'Caveat Brush', cursive" }}>
          This room already has the maximum number of participants.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => window.history.back()}
          style={{
            marginTop: 8, padding: "13px 32px", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg,#7B2FBE,#C084FC)", color: "#fff",
            fontFamily: "'Forum', serif", fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}
        >← Go Back</motion.button>
      </motion.div>
    </>
  );

  // ── Main UI ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barriecito&family=Caveat+Brush&family=Forum&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0021; overflow: hidden; }
        input::placeholder { color: rgba(192,132,252,0.4); }
        input:focus { outline: none; }
        button:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(123,47,190,0.4); border-radius: 2px; }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        style={{
          width: "100vw", height: "100vh",
          background: "linear-gradient(135deg,#0d0021 0%,#1a0040 60%,#0d0021 100%)",
          display: "flex", flexDirection: "column", fontFamily: "'Forum', serif",
          overflow: "hidden", position: "relative",
        }}
      >
        {/* ── Background orbs ── */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <motion.div
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", top: -100, left: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(123,47,190,0.12) 0%,transparent 70%)" }}
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", bottom: -100, right: -50, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(192,132,252,0.08) 0%,transparent 70%)" }}
          />
        </div>

        {/* ── NAV BAR ─────────────────────────────────────────────────────── */}
        <motion.nav
          initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 22 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 24px", height: 60, flexShrink: 0,
            background: "rgba(13,0,33,0.85)", backdropFilter: "blur(24px)",
            borderBottom: "1px solid rgba(123,47,190,0.2)",
            zIndex: 20,
          }}
        >
          {/* Left — Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.img
              src={NexMeetLogo} alt="NexMeet"
              animate={{ rotate: [0, 4, -4, 0] }} transition={{ duration: 6, repeat: Infinity }}
              style={{ width: 36, height: 36, objectFit: "contain" }}
            />
            <div>
              <div style={{ fontFamily: "'Barriecito', cursive", fontSize: 20, color: "#C084FC", letterSpacing: "1px" }}>
                NexMeet
              </div>
              <div style={{ fontSize: 10, color: "rgba(192,132,252,0.55)", fontFamily: "'Caveat Brush', cursive", marginTop: -2 }}>
                {connectionState === "connected"
                  ? `● Connected · ${formatDuration(callDuration)}`
                  : connectionState}
              </div>
            </div>
          </div>

          {/* Center — Connection badge */}
          <motion.div
            animate={connectionState === "connected" ? { opacity: [1, 0.6, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: `${stateColor}18`,
              border: `1.5px solid ${stateColor}44`,
              borderRadius: 20, padding: "5px 16px",
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: stateColor }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: stateColor, fontFamily: "'Caveat Brush', cursive" }}>
              {connectionState}
            </span>
          </motion.div>

          {/* Right — Remote info + hand indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Hand raised indicator in nav */}
            <AnimatePresence>
              {handRaised && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  style={{
                    background: "rgba(232,160,122,0.2)", border: "1.5px solid rgba(232,160,122,0.5)",
                    borderRadius: 20, padding: "4px 12px", fontSize: 12,
                    color: "#E8A07A", fontFamily: "'Caveat Brush', cursive",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                    ✋
                  </motion.span>
                  Hand Raised
                </motion.div>
              )}
            </AnimatePresence>

            {remoteEmailId && (
              <motion.div
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                style={{
                  background: "rgba(123,47,190,0.15)", border: "1.5px solid rgba(123,47,190,0.3)",
                  borderRadius: 20, padding: "5px 14px", fontSize: 11,
                  color: "#C084FC", fontFamily: "'Forum', serif", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <span>👤</span> {remoteEmailId}
              </motion.div>
            )}

            <div style={{ fontFamily: "'Barriecito', cursive", fontSize: 12, color: "rgba(192,132,252,0.3)" }}>
              ✦ Tanishq
            </div>
          </div>
        </motion.nav>

        {/* ── Toast notification ───────────────────────────────────────────── */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              style={{
                position: "absolute", top: 68, left: "50%", transform: "translateX(-50%)",
                background: "rgba(13,0,33,0.92)", backdropFilter: "blur(16px)",
                border: "1px solid rgba(192,132,252,0.3)", borderRadius: 12,
                padding: "8px 20px", color: "#fff", fontSize: 13,
                fontFamily: "'Forum', serif", zIndex: 100,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                whiteSpace: "nowrap",
              }}
            >
              {notification}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: "12px 14px", gap: 12, minHeight: 0, position: "relative" }}>

          {/* Videos area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            {/* Remote video (main) */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <VideoTile
                videoRef={remoteVideoRef}
                label={remoteEmailId ?? "Remote"}
                isMain isMuted={false}
                speaking={connectionState === "connected" && !!remoteStream}
                waiting={!remoteStream}
                waitingLabel={
                  remoteEmailId
                    ? `Connecting with ${remoteEmailId}…`
                    : "Share the room link to invite someone"
                }
                index={0}
              />
            </div>
            {/* My video (pip) */}
            <div style={{ height: 120, flexShrink: 0 }}>
              <VideoTile
                videoRef={myVideoRef}
                label={`You${isScreenSharing ? " 🖥" : ""}`}
                isMain={false} isMuted speaking={false} waiting={false} index={1}
              />
            </div>
          </div>

          {/* ── Sliding Chat Panel ──────────────────────────────────────────── */}
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                key="chat-panel"
                initial={{ x: 340, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 340, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                style={{
                  width: 320, display: "flex", flexDirection: "column",
                  background: "rgba(13,0,33,0.88)", backdropFilter: "blur(24px)",
                  border: "1px solid rgba(123,47,190,0.25)", borderRadius: 20,
                  overflow: "hidden", flexShrink: 0,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                }}
              >
                {/* Chat header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px",
                  borderBottom: "1px solid rgba(123,47,190,0.2)",
                  background: "rgba(123,47,190,0.08)",
                }}>
                  <span style={{ color: "#C084FC", fontFamily: "'Caveat Brush', cursive", fontSize: 16, fontWeight: 700 }}>
                    💬 Chat
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setChatOpen(false)}
                    style={{
                      background: "rgba(123,47,190,0.2)", border: "1px solid rgba(123,47,190,0.3)",
                      borderRadius: 8, width: 28, height: 28, cursor: "pointer",
                      color: "#C084FC", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >✕</motion.button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {messages.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, opacity: 0.4 }}>
                      <span style={{ fontSize: 36 }}>💬</span>
                      <span style={{ fontSize: 13, color: "#C084FC", fontFamily: "'Caveat Brush', cursive" }}>No messages yet</span>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      style={{ display: "flex", flexDirection: "column", alignItems: msg.sender === "Me" ? "flex-end" : "flex-start", gap: 3 }}
                    >
                      {msg.sender !== "Me" && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#9B7BB0", paddingLeft: 4, fontFamily: "'Caveat Brush', cursive" }}>
                          {msg.sender}
                        </span>
                      )}
                      <div style={{
                        maxWidth: "85%", padding: "8px 13px",
                        borderRadius: msg.sender === "Me" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: msg.sender === "Me"
                          ? "linear-gradient(135deg,#7B2FBE,#C084FC)"
                          : "rgba(255,255,255,0.07)",
                        border: msg.sender === "Me" ? "none" : "1px solid rgba(123,47,190,0.2)",
                        fontSize: 13, color: "#fff", lineHeight: 1.5, fontFamily: "'Forum', serif",
                      }}>
                        {msg.message}
                      </div>
                      <span style={{ fontSize: 9, color: "rgba(192,132,252,0.4)", padding: "0 4px", fontFamily: "'Caveat Brush', cursive" }}>
                        {msg.time}
                      </span>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(123,47,190,0.2)", display: "flex", gap: 8, flexShrink: 0 }}>
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message…"
                    style={{
                      flex: 1, background: "rgba(123,47,190,0.1)",
                      border: "1.5px solid rgba(123,47,190,0.25)",
                      borderRadius: 12, padding: "9px 13px",
                      color: "#fff", fontSize: 13, fontFamily: "'Forum', serif",
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={sendMessage}
                    style={{
                      width: 38, height: 38, borderRadius: 12, border: "none", cursor: "pointer",
                      background: "linear-gradient(135deg,#7B2FBE,#C084FC)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, boxShadow: "0 4px 12px rgba(123,47,190,0.4)", flexShrink: 0,
                      color: "#fff",
                    }}
                  >➤</motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Sliding Info Panel ──────────────────────────────────────────── */}
          <AnimatePresence>
            {infoOpen && (
              <motion.div
                key="info-panel"
                initial={{ x: 340, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 340, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                style={{
                  width: 280, display: "flex", flexDirection: "column",
                  background: "rgba(13,0,33,0.88)", backdropFilter: "blur(24px)",
                  border: "1px solid rgba(123,47,190,0.25)", borderRadius: 20,
                  overflow: "hidden", flexShrink: 0,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderBottom: "1px solid rgba(123,47,190,0.2)",
                  background: "rgba(123,47,190,0.08)",
                }}>
                  <span style={{ color: "#C084FC", fontFamily: "'Caveat Brush', cursive", fontSize: 16, fontWeight: 700 }}>
                    ℹ️ Info
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setInfoOpen(false)}
                    style={{
                      background: "rgba(123,47,190,0.2)", border: "1px solid rgba(123,47,190,0.3)",
                      borderRadius: 8, width: 28, height: 28, cursor: "pointer",
                      color: "#C084FC", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >✕</motion.button>
                </div>
                <div style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
                  {[
                    { label: "Status",      value: connectionState,                    icon: "🔗" },
                    { label: "Duration",    value: formatDuration(callDuration),        icon: "⏱" },
                    { label: "Remote",      value: remoteEmailId ?? "—",               icon: "👤" },
                    { label: "Video",       value: isCameraOff ? "Off" : "On",          icon: "📹" },
                    { label: "Audio",       value: isMuted ? "Muted" : "Active",        icon: "🎙" },
                    { label: "Screen",      value: isScreenSharing ? "Sharing" : "Off", icon: "🖥" },
                    { label: "Recording",   value: isRecording ? "Active" : "Off",      icon: "⏺" },
                    { label: "Hand",        value: handRaised ? "Raised" : "Down",      icon: "✋" },
                  ].map((item, i) => (
                    <motion.div
                      key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px", borderRadius: 10,
                        background: "rgba(123,47,190,0.08)", border: "1px solid rgba(123,47,190,0.15)",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "#9B7BB0", display: "flex", alignItems: "center", gap: 6, fontFamily: "'Forum', serif" }}>
                        {item.icon} {item.label}
                      </span>
                      <span style={{ fontSize: 13, color: "#C084FC", fontWeight: 700, fontFamily: "'Caveat Brush', cursive" }}>
                        {item.value}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── CONTROLS BAR ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 200, damping: 22 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, padding: "12px 20px", flexShrink: 0, flexWrap: "wrap",
            background: "rgba(13,0,33,0.85)", backdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(123,47,190,0.2)",
          }}
        >
          {/* Mute */}
          <CtrlBtn onClick={toggleMute} active={isMuted} icon={isMuted ? "🔇" : "🎙"} label={isMuted ? "Unmute" : "Mute"} />

          {/* Camera */}
          <CtrlBtn onClick={toggleCamera} active={isCameraOff} icon={isCameraOff ? "📷" : "📹"} label={isCameraOff ? "Cam On" : "Cam Off"} />

          {/* Screen share */}
          <CtrlBtn
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            active={isScreenSharing} icon="🖥"
            label={isScreenSharing ? "Stop Share" : "Share"}
          />

          {/* ✅ Hand raise — now clearly visible */}
          <CtrlBtn
            onClick={toggleHand} active={handRaised}
            icon={handRaised ? "✋" : "🖐"} label={handRaised ? "Lower" : "Raise Hand"}
          />

          {/* Recording */}
          <CtrlBtn
            onClick={isRecording ? stopRecording : startRecording}
            active={isRecording} danger={isRecording}
            icon={isRecording ? "⏹" : "⏺"}
            label={isRecording ? "Stop Rec" : "Record"}
            disabled={!remoteStream && !isRecording}
          />

          {/* Divider */}
          <div style={{ width: 1, height: 36, background: "rgba(123,47,190,0.25)", margin: "0 4px" }} />

          {/* Chat toggle with unread badge */}
          <div style={{ position: "relative" }}>
            <CtrlBtn
              onClick={() => { setChatOpen((p) => !p); setInfoOpen(false); }}
              active={chatOpen} icon="💬" label="Chat"
            />
            {unreadCount > 0 && !chatOpen && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                style={{
                  position: "absolute", top: -4, right: -4,
                  background: "#ef4444", color: "#fff", borderRadius: "50%",
                  width: 18, height: 18, fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #0d0021",
                }}
              >{unreadCount > 9 ? "9+" : unreadCount}</motion.div>
            )}
          </div>

          {/* Info toggle */}
          <CtrlBtn
            onClick={() => { setInfoOpen((p) => !p); setChatOpen(false); }}
            active={infoOpen} icon="ℹ️" label="Info"
          />

          {/* Divider */}
          <div style={{ width: 1, height: 36, background: "rgba(123,47,190,0.25)", margin: "0 4px" }} />

          {/* End call */}
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 8px 32px rgba(239,68,68,0.6)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = "/"}
            style={{
              padding: "10px 24px", borderRadius: 16, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff",
              fontFamily: "'Forum', serif", fontWeight: 700, fontSize: 14,
              boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            <span>📵</span> End Call
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
};

export default Room;
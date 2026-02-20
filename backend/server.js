const express    = require("express");
const cors       = require("cors");
const http       = require("http");
const { Server } = require("socket.io");

const app = express();

const ALLOWED_ORIGINS = [
  "https://nexmeet-tanishqmanglor-p3ha.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

// ✅ Health check — Render pings GET / to confirm server is alive
app.get("/", (req, res) => {
  res.json({ status: "✅ NexMeet backend is running!" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// ── In-memory state ────────────────────────────────────────────────────────────
const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();
const socketToRoomMapping  = new Map();
const MAX_ROOM_SIZE = 2;

function getRoomMembers(roomId, excludeSocketId = null) {
  const members = [];
  for (const [sid, rid] of socketToRoomMapping.entries()) {
    if (rid === roomId && sid !== excludeSocketId) {
      const email = socketToEmailMapping.get(sid);
      if (email) members.push({ socketId: sid, emailId: email });
    }
  }
  return members;
}

// ── Handlers ───────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("[+] Connected:", socket.id);

  socket.on("join-room", ({ roomId, emailId }) => {
    const currentMembers = getRoomMembers(roomId);
    if (currentMembers.length >= MAX_ROOM_SIZE) {
      socket.emit("room-full", { roomId });
      return;
    }
    const oldSocketId = emailToSocketMapping.get(emailId);
    if (oldSocketId && oldSocketId !== socket.id) {
      socketToEmailMapping.delete(oldSocketId);
      socketToRoomMapping.delete(oldSocketId);
    }
    emailToSocketMapping.set(emailId, socket.id);
    socketToEmailMapping.set(socket.id, emailId);
    socketToRoomMapping.set(socket.id, roomId);
    socket.join(roomId);

    const existingUsers = getRoomMembers(roomId, socket.id).map((m) => m.emailId);
    socket.emit("all-users", { users: existingUsers });
    socket.broadcast.to(roomId).emit("user-joined", { emailId });
    socket.emit("joined-room", { roomId });
    console.log(`[Room] ${emailId} joined ${roomId} (${existingUsers.length + 1}/${MAX_ROOM_SIZE})`);
  });

  socket.on("call-user", ({ offer, emailId }) => {
    const fromEmail      = socketToEmailMapping.get(socket.id);
    const targetSocketId = emailToSocketMapping.get(emailId);
    if (!targetSocketId) return;
    socket.to(targetSocketId).emit("incoming-call", { from: fromEmail, offer });
  });

  socket.on("call-accepted", ({ emailId, answer }) => {
    const targetSocketId = emailToSocketMapping.get(emailId);
    if (!targetSocketId) return;
    socket.to(targetSocketId).emit("call-accepted", { answer });
  });

  socket.on("ice-candidate", ({ emailId, candidate }) => {
    const targetSocketId = emailToSocketMapping.get(emailId);
    if (!targetSocketId) return;
    socket.to(targetSocketId).emit("ice-candidate", { candidate });
  });

  socket.on("send-message", ({ message }) => {
    const roomId = socketToRoomMapping.get(socket.id);
    const sender = socketToEmailMapping.get(socket.id);
    if (!roomId || !message?.trim()) return;
    socket.to(roomId).emit("receive-message", {
      sender, message,
      time: new Date().toLocaleTimeString(),
    });
  });

  socket.on("raise-hand", (state) => {
    const roomId = socketToRoomMapping.get(socket.id);
    const sender = socketToEmailMapping.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit("remote-hand", { sender, state });
  });

  socket.on("disconnect", () => {
    const emailId = socketToEmailMapping.get(socket.id);
    const roomId  = socketToRoomMapping.get(socket.id);
    if (emailId) emailToSocketMapping.delete(emailId);
    socketToEmailMapping.delete(socket.id);
    socketToRoomMapping.delete(socket.id);
    if (roomId) socket.to(roomId).emit("user-disconnected", { emailId });
    console.log(`[-] Disconnected: ${socket.id} (${emailId ?? "unknown"})`);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`✅ NexMeet server running on port ${PORT}`));
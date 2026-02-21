import { useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import LoadingPage from "./pages/LoadingPage";
import ConnectingPage from "./pages/ConnectingPage";
import "./App.css";

function App() {
  const [loaded, setLoaded] = useState(false);

  // ── Step 1: Initial app loading screen ──────────────────────────────────────
  if (!loaded) {
    return <LoadingPage onComplete={() => setLoaded(true)} />;
  }

  return (
    <Routes>
      <Route path="/"                   element={<Home />} />
      <Route path="/home"               element={<Home />} />

      {/* Step 2: ConnectingPage sits BETWEEN Home → Room */}
      {/* User lands here → 3s animation → auto-redirects to /room/:roomId  */}
      <Route path="/connecting/:roomId" element={<ConnectingWrapper />} />

      <Route path="/room/:roomId"       element={<Room />} />
      <Route path="*"                   element={<Home />} />
    </Routes>
  );
}

// ── ConnectingWrapper ─────────────────────────────────────────────────────────
// Reads roomId from the URL params, grabs emails from sessionStorage,
// shows the 3-second animation, then navigates to the actual room.
function ConnectingWrapper() {
  const navigate        = useNavigate();
  const { roomId }      = useParams();

  // These are set in Home.jsx (see comment below) before navigating here
  const myEmail     = sessionStorage.getItem("myEmail")     || "you@email.com";
  const remoteEmail = sessionStorage.getItem("remoteEmail") || null;

  return (
    <ConnectingPage
      myEmail={myEmail}
      remoteEmail={remoteEmail}
      onComplete={() => navigate(`/room/${roomId}`)}
    />
  );
}

export default App;


// ─────────────────────────────────────────────────────────────────────────────
// HOW TO TRIGGER ConnectingPage FROM Home.jsx
// ─────────────────────────────────────────────────────────────────────────────
//
// In your Home.jsx, wherever the user clicks "Join Room" or "Create Room",
// do this BEFORE navigating:
//
//   import { useNavigate } from "react-router-dom";
//
//   const navigate = useNavigate();
//
//   const handleJoin = (roomId, email) => {
//     sessionStorage.setItem("myEmail", email);         // your email
//     sessionStorage.setItem("remoteEmail", "");        // unknown at this point
//     navigate(`/connecting/${roomId}`);                // → shows ConnectingPage
//   };                                                  // → then Room opens auto
//
// If you already know the remote user's email (e.g. from a socket event),
// set it too:
//   sessionStorage.setItem("remoteEmail", remoteUserEmail);
//
// ─────────────────────────────────────────────────────────────────────────────
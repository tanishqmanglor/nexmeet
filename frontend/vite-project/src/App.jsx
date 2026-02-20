import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import LoadingPage from "./pages/LoadingPage";
import "./App.css";

function App() {
  const [loaded, setLoaded] = useState(false);

  // Show loading screen first — once progress hits 100% it calls onComplete
  if (!loaded) {
    return <LoadingPage onComplete={() => setLoaded(true)} />;
  }

  return (
    <Routes>
      <Route path="/"             element={<Home />} />
      <Route path="/home"         element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
      <Route path="*"             element={<Home />} />
    </Routes>
  );
}

export default App;
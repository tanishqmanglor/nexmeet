import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SocketProvider } from "./Providers/Socket";
import { PeerProvider } from "./Providers/Peer"; // ✅ ADD THIS

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <SocketProvider>
      <PeerProvider>   {/* ✅ ADD THIS */}
        <App />
      </PeerProvider>
    </SocketProvider>
  </BrowserRouter>
);
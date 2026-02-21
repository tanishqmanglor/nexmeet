import React, { useMemo, useEffect } from "react";
import { io } from "socket.io-client";

const SocketContext = React.createContext(null);

export const useSocket = () => React.useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const socket = useMemo(() => {
    return io(import.meta.env.VITE_BACKEND_URL || "https://nexmeettanishqmanglor.onrender.com", {
      transports: ["polling", "websocket"], // ✅ polling first — survives cold start
      reconnectionAttempts: 10,            // ✅ more attempts
      reconnectionDelay: 2000,             // ✅ wait longer between retries
      reconnectionDelayMax: 10000,         // ✅ cap backoff at 10s
      timeout: 30000,                      // ✅ 30s — enough for Render cold start
      autoConnect: true,
    });
  }, []);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => { socket.disconnect(); };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
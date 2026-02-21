import React, {
  useMemo,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const PeerContext = React.createContext(null);

export const usePeer = () => useContext(PeerContext);

const ICE_CONFIG = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
    // Free TURN servers — required for production (handles NAT/firewall)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export const PeerProvider = ({ children }) => {
  const [remoteStream, setRemoteStream]       = useState(null);
  const [connectionState, setConnectionState] = useState("new");

  // ✅ Use state so peer can be recreated on disconnect/reconnect
  const [peer, setPeer] = useState(() => new RTCPeerConnection(ICE_CONFIG));

  // ✅ Reset peer — call this when remote disconnects so next call gets a fresh peer
  const resetPeer = useCallback(() => {
    setPeer((oldPeer) => {
      oldPeer.close();
      return new RTCPeerConnection(ICE_CONFIG);
    });
    setRemoteStream(null);
    setConnectionState("new");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { peer.close(); };
  }, [peer]);

  // Connection state
  useEffect(() => {
    const handleConnectionStateChange = () => {
      setConnectionState(peer.connectionState);
      console.log("[Peer] connectionState →", peer.connectionState);
    };
    peer.addEventListener("connectionstatechange", handleConnectionStateChange);
    return () => peer.removeEventListener("connectionstatechange", handleConnectionStateChange);
  }, [peer]);

  // ✅ Robust track handler — fallback builds stream manually if event.streams[0] is empty
  const handleTrackEvent = useCallback((event) => {
    console.log("[Peer] track event fired, streams:", event.streams);
    if (event.streams?.[0]) {
      setRemoteStream(event.streams[0]);
    } else {
      setRemoteStream((prev) => {
        const stream = prev ?? new MediaStream();
        stream.addTrack(event.track);
        return stream;
      });
    }
  }, []);

  useEffect(() => {
    peer.addEventListener("track", handleTrackEvent);
    return () => peer.removeEventListener("track", handleTrackEvent);
  }, [peer, handleTrackEvent]);

  const createOffer = useCallback(async () => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    return offer;
  }, [peer]);

  const createAnswer = useCallback(async (offer) => {
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    return answer;
  }, [peer]);

  const setRemoteAnswer = useCallback(async (answer) => {
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
  }, [peer]);

  const sendStream = useCallback((stream) => {
    if (!stream) return;
    const senders = peer.getSenders();
    stream.getTracks().forEach((track) => {
      const sender = senders.find((s) => s.track && s.track.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track).catch(console.error);
      } else {
        peer.addTrack(track, stream);
      }
    });
  }, [peer]);

  return (
    <PeerContext.Provider value={{
      peer, createOffer, createAnswer, setRemoteAnswer,
      sendStream, remoteStream, connectionState, resetPeer,
    }}>
      {children}
    </PeerContext.Provider>
  );
};
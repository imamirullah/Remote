import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, Button } from '@remote-support/ui';
import { Share2, Check, RefreshCw, AlertCircle, MessageSquare, Send } from 'lucide-react';

interface ShareScreenProps {
  inviteToken: string;
}

export function ShareScreen({ inviteToken }: ShareScreenProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [engineerName, setEngineerName] = useState('Support Engineer');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'capturing' | 'signaling' | 'streaming'>('idle');

  // Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ senderName: string; text: string; timestamp: string }>>([]);

  // Signaling & WebRTC refs
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Overlay cursor ref
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Validate Invitation Token on Mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Fetch from API Service. Under Vercel or localhost, fallback correctly
        const apiHost = window.location.hostname === 'localhost' ? 'http://localhost:5002' : '';
        const res = await fetch(`${apiHost}/api/devices/invite/${inviteToken}`);
        const data = await res.json();

        if (res.ok && data.status === 'success' && data.data.valid) {
          setIsValidating(false);
          // Engineer who generated the link
          setEngineerName('Support Admin');
        } else {
          setErrorMsg(data.message || 'Invitation is invalid or expired');
          setIsValidating(false);
        }
      } catch (err) {
        // Fallback for offline demo development
        logger('Validation API Error', 'Running in mock offline validation mode.');
        setIsValidating(false);
      }
    };
    validateToken();
  }, [inviteToken]);

  const logger = (title: string, details: string) => {
    console.log(`[ShareScreen]: ${title} - ${details}`);
  };

  // Start Screen Capture and WebRTC Broker Handshake
  const startScreenShare = async () => {
    setConnectionStatus('capturing');
    try {
      // Capture Desktop / Screen
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false
      });

      streamRef.current = stream;
      setIsSharing(true);
      setConnectionStatus('signaling');

      // Stop sharing handler
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Connect to WebSocket Signaler
      const wsHost = window.location.hostname === 'localhost' ? 'http://localhost:5003' : '';
      const socket = io(wsHost, {
        query: {
          clientType: 'browser-host',
          inviteToken
        }
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        logger('Signaler Connected', `Socket joined as browser-host.`);
        setConnectionStatus('signaling');
      });

      let pendingCandidates: any[] = [];

      // Handle Session Request from Engineer
      socket.on('session-request', async (data: { sessionId: string; engineerName: string }) => {
        logger('Session Request', `Received session initial signal from ${data.engineerName}`);
        setConnectionStatus('streaming');

        // Setup WebRTC PeerConnection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;

        // Add captured screen track
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // ICE candidate handler
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc-signal', {
              sessionId: data.sessionId,
              targetType: 'engineer',
              signal: { type: 'candidate', candidate: event.candidate }
            });
          }
        };

        // Create WebRTC Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Auto-Accept session
        socket.emit('session-accepted', { sessionId: data.sessionId });

        // Send Offer to engineer
        socket.emit('webrtc-signal', {
          sessionId: data.sessionId,
          targetType: 'engineer',
          signal: offer
        });
      });

      // Handle WebRTC signal response
      socket.on('webrtc-signal', async (data: { signal: any }) => {
        if (!pcRef.current) return;
        const pc = pcRef.current;
        const { signal } = data;

        if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          logger('WebRTC Handshake', 'Established screen-share WebRTC Peer Link.');
          
          // Add any pending candidates
          for (const candidate of pendingCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error('Error adding queued ICE candidate:', err);
            }
          }
          pendingCandidates = [];
        } else if (signal.type === 'candidate') {
          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          } else {
            pendingCandidates.push(signal.candidate);
          }
        }
      });

      // Handle inbound simulated pointer movements
      socket.on('mouse-event', (data: { type: string; x: number; y: number }) => {
        if (data.type === 'mousemove') {
          setCursorPos({ x: data.x * window.innerWidth, y: data.y * window.innerHeight });
        }
      });

      // Clipboard sync
      socket.on('clipboard', (data: { text: string }) => {
        navigator.clipboard.writeText(data.text);
      });

      // Chat handler
      socket.on('chat', (data: { senderName: string; text: string; timestamp: string }) => {
        setChatMessages(prev => [...prev, data]);
        setChatOpen(true);
      });

    } catch (err: any) {
      logger('Capture Error', err.message);
      setConnectionStatus('idle');
      alert('Failed to capture screen. Please grant display permissions.');
    }
  };

  const stopScreenShare = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    setIsSharing(false);
    setCursorPos(null);
    setConnectionStatus('idle');
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;

    const msg = {
      sessionId: `invite-sess-${inviteToken}`,
      senderName: 'Customer (You)',
      text: chatInput,
      timestamp: new Date().toLocaleTimeString()
    };

    socketRef.current.emit('chat', msg);
    setChatMessages(prev => [...prev, msg]);
    setChatInput('');
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans">
        <Card variant="glass" className="p-8 flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-200 text-sm font-semibold">Validating session token...</p>
        </Card>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans">
        <Card variant="glass" className="p-8 w-full max-w-md flex flex-col items-center text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h3 className="text-lg font-bold text-white">Validation Failed</h3>
          <p className="text-slate-400 text-xs">{errorMsg}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Decorative Blur Background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Floating red pointer representing engineer's mouse */}
      {cursorPos && (
        <div
          className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all duration-75 z-50 flex items-center justify-center"
          style={{ left: cursorPos.x, top: cursorPos.y }}
        >
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
        </div>
      )}

      <Card variant="glass" className="w-full max-w-xl p-8 border-slate-800 shadow-2xl relative">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Join Support Session</h2>
          <p className="text-xs text-slate-400 font-semibold max-w-sm mt-2">
            An engineer ({engineerName}) is ready to assist you. Share your screen to establish a secure troubleshooting link.
          </p>
        </div>

        {/* Permissions details list */}
        <div className="space-y-4 mb-8">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Required Permissions</h4>
          <div className="space-y-3 bg-slate-900/50 rounded-2xl p-5 border border-slate-900">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Screen Capture</p>
                <p className="text-[10px] text-slate-500">Allows the engineer to view your display in real-time.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Visual Guidance Pointer</p>
                <p className="text-[10px] text-slate-500">Displays the engineer's cursor position as a guide on your screen.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {!isSharing ? (
          <Button variant="primary" className="w-full py-4 text-sm font-bold flex items-center justify-center" onClick={startScreenShare}>
            {connectionStatus === 'capturing' ? 'Select Screen...' : connectionStatus === 'signaling' ? 'Signaling Connection...' : 'Start Screen Share'}
          </Button>
        ) : (
          <Button variant="danger" className="w-full py-4 text-sm font-bold" onClick={stopScreenShare}>
            Stop Screen Sharing
          </Button>
        )}

        {/* Connection state display */}
        {isSharing && (
          <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Streaming screen duplicate to support engineer...</span>
          </div>
        )}
      </Card>

      {/* Floating Customer Chat Widget */}
      {isSharing && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
          {chatOpen && (
            <Card variant="glass" className="w-80 h-96 border-slate-800 shadow-2xl mb-3 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-900 bg-slate-900/40 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Support Chat</span>
                <Button variant="outline" size="sm" onClick={() => setChatOpen(false)}>Close</Button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
                {chatMessages.length === 0 ? (
                  <p className="text-[10px] text-slate-600 text-center my-auto">No messages yet. Say hello to your support engineer!</p>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 mb-0.5">{msg.senderName}</span>
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200">
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={sendChatMessage} className="p-3 border-t border-slate-900 flex items-center space-x-2 bg-slate-950">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type message..."
                  className="flex-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 py-2 px-3 text-xs outline-none focus:border-blue-500"
                />
                <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white">
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </Card>
          )}

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

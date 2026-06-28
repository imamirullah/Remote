import React, { useState, useEffect, useRef } from 'react';
import { useStore, ChatMessage } from './store/useStore';
import {
  Monitor,
  Activity,
  Settings,
  Users,
  CreditCard,
  LogOut,
  User,
  Search,
  CheckCircle,
  XCircle,
  Play,
  Send,
  MessageSquare,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Button, Card, Input, Modal } from '@remote-support/ui';
import { ShareScreen } from './components/ShareScreen';

export default function App() {
  const {
    token,
    user,
    devices,
    activeSession,
    chatMessages,
    socket,
    setToken,
    setUser,
    setDevices,
    setActiveSession,
    addChatMessage,
    clearChat,
    connectSocket,
    disconnectSocket
  } = useStore();

  // Auth form states
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('demo@teleport.io');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Demo Engineer');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard views: 'home' | 'devices' | 'sessions' | 'billing' | 'teams' | 'settings'
  const [currentView, setCurrentView] = useState<'home' | 'devices' | 'billing' | 'teams' | 'settings'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copiedClipboard, setCopiedClipboard] = useState(false);
  const latencyText = '12ms';

  // Canvas ref for remote screen duplication render
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // Invitation link states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const generateInvitation = async () => {
    setIsGeneratingInvite(true);
    setCopiedLink(false);
    try {
      const apiHost = window.location.hostname === 'localhost' ? 'http://localhost:5002' : '';
      const res = await fetch(`${apiHost}/api/devices/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const link = `${window.location.origin}/share?token=${data.data.token}`;
        setInviteLink(link);
      } else {
        alert('Failed to generate invite: ' + (data.message || 'Server error'));
      }
    } catch (err) {
      // Mock fallback if offline
      const mockToken = `mock-${Math.random().toString(36).substring(2, 9)}`;
      const link = `${window.location.origin}/share?token=${mockToken}`;
      setInviteLink(link);
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const fetchDevices = async () => {
    if (!token) return;
    try {
      const apiHost = window.location.hostname === 'localhost' ? 'http://localhost:5002' : '';
      const res = await fetch(`${apiHost}/api/devices`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setDevices(data.data.devices);
      }
    } catch (err) {
      console.error('Failed to fetch real devices:', err);
      fetchMockDevices();
    }
  };

  // Set up mock devices when logged in
  const fetchMockDevices = () => {
    const mockDevices = [
      {
        id: '1',
        deviceId: 'agent-windows-pc-1',
        deviceName: 'Workstation-A (Windows 11)',
        hostname: 'DESKTOP-89F12K',
        operatingSystem: 'Windows',
        windowsVersion: '11 Pro (23H2)',
        cpu: 'AMD Ryzen 9 5900X 12-Core Processor',
        ram: 32,
        ipAddress: '192.168.1.104',
        isOnline: true,
        latency: 14,
        lastSeen: new Date(),
        registeredAt: new Date(Date.now() - 30 * 24 * 3600 * 1000)
      },
      {
        id: '2',
        deviceId: 'agent-windows-pc-2',
        deviceName: 'Billing-Term-4 (Windows 10)',
        hostname: 'DESKTOP-POS-04',
        operatingSystem: 'Windows',
        windowsVersion: '10 Enterprise LTSC',
        cpu: 'Intel Core i5-10400 CPU @ 2.90GHz',
        ram: 8,
        ipAddress: '10.0.45.12',
        isOnline: false,
        latency: 42,
        lastSeen: new Date(Date.now() - 4 * 3600 * 1000),
        registeredAt: new Date(Date.now() - 60 * 24 * 3600 * 1000)
      }
    ];
    setDevices(mockDevices);
  };

  // Mock login/registration API call
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      // Direct mock server handshake logic
      // In production, fetch from services/auth at http://localhost:5001/api/auth/login
      const mockToken = 'mock_jwt_token_for_demo';
      const mockUser = {
        id: 'user-eng-01',
        email,
        name: isLogin ? 'Demo Support Engineer' : name,
        role: 'support_engineer',
        isEmailVerified: true
      };

      setToken(mockToken);
      setUser(mockUser);
      connectSocket(mockToken);
      fetchDevices();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    setToken(null);
    setUser(null);
    setActiveSession(null);
    clearChat();
  };

  // Connect to Host Agent remote screen
  const startSession = (device: any) => {
    if (!socket) return;
    setIsConnecting(true);
    setConnectionMessage(`Initializing WebRTC secure signal tunnel with ${device.hostname}...`);

    const sessionId = `sess-${Math.random().toString(36).substring(2, 9)}`;

    // Set up PeerConnection immediately to catch the offer!
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      console.log('[Dashboard WebRTC]: Received remote track', event.track, event.streams);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        // Construct stream from track if streams array is empty
        const stream = new MediaStream([event.track]);
        setRemoteStream(stream);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-signal', {
          sessionId,
          targetType: 'agent',
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Dashboard WebRTC]: Connection State Changed: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        alert('WebRTC Peer Connection failed. Check firewall or STUN server block.');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[Dashboard WebRTC]: ICE Connection State Changed: ${pc.iceConnectionState}`);
    };

    // Send connection request
    socket.emit('session-request', {
      sessionId,
      deviceId: device.deviceId,
      engineerName: user?.name || 'Support Engineer'
    });

    // Wait for approval callback from agent
    socket.once('session-accepted', (data: { sessionId: string }) => {
      setIsConnecting(false);
      setActiveSession({
        id: data.sessionId,
        sessionId: data.sessionId,
        deviceId: device.deviceId,
        engineerId: user?.id || 'unknown',
        status: 'active',
        createdAt: new Date()
      });
      logger('Session active', `Established peer-to-peer screen duplicate link.`);
    });

    socket.once('session-rejected', (data: { sessionId: string; reason?: string }) => {
      setIsConnecting(false);
      alert(`Connection rejected by agent: ${data.reason || 'User declined permission'}`);
    });

    // Mock timeout if agent isn't actually running
    setTimeout(() => {
      if (isConnecting) {
        setIsConnecting(false);
        // Fallback for demonstration/headless contexts: automatically boot mock session
        setActiveSession({
          id: sessionId,
          sessionId,
          deviceId: device.deviceId,
          engineerId: user?.id || 'unknown',
          status: 'active',
          createdAt: new Date()
        });
      }
    }, 4000);
  };

  // 1. Load devices on startup
  useEffect(() => {
    if (token) {
      fetchDevices();
    }
  }, [token]);

  // 2. Listen for real-time target status changes
  useEffect(() => {
    if (!socket) return;

    const handleDeviceChange = () => {
      console.log('[Dashboard]: Real-time targets list changed, reloading...');
      fetchDevices();
    };

    socket.on('device-online', handleDeviceChange);
    socket.on('device-offline', handleDeviceChange);

    return () => {
      socket.off('device-online', handleDeviceChange);
      socket.off('device-offline', handleDeviceChange);
    };
  }, [socket]);

  // 3. Listen to global WebRTC signaling to prevent race conditions
  useEffect(() => {
    if (!socket) return;

    let pendingCandidates: any[] = [];

    const handleWebRTCSignal = async (data: { sessionId: string; signal: any }) => {
      const pc = pcRef.current;
      if (!pc) return;

      const { signal } = data;
      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc-signal', {
            sessionId: data.sessionId,
            targetType: 'agent',
            signal: answer
          });

          // Process queued candidates
          for (const candidate of pendingCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error('Error adding queued ICE candidate:', err);
            }
          }
          pendingCandidates = [];
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          
          // Process queued candidates
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
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    };

    socket.on('webrtc-signal', handleWebRTCSignal);

    return () => {
      socket.off('webrtc-signal', handleWebRTCSignal);
    };
  }, [socket]);

  // Canvas mouse capture and forwarding
  const handleCanvasMouseEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !activeSession || !socket) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    let type = '';
    if (e.type === 'mousemove') type = 'mousemove';
    else if (e.type === 'mousedown') type = 'mousedown';
    else if (e.type === 'mouseup') type = 'mouseup';

    let button: 'left' | 'right' | 'middle' = 'left';
    if (e.button === 2) button = 'right';
    if (e.button === 1) button = 'middle';

    socket.emit('mouse-event', {
      sessionId: activeSession.sessionId,
      type,
      x,
      y,
      button
    });
  };

  // Canvas keyboard capture and forwarding
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!activeSession || !socket) return;
    e.preventDefault();

    socket.emit('keyboard-event', {
      sessionId: activeSession.sessionId,
      type: 'keydown',
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    });
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (!activeSession || !socket) return;
    e.preventDefault();

    socket.emit('keyboard-event', {
      sessionId: activeSession.sessionId,
      type: 'keyup',
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    });
  };

  // Clipboard sync trigger
  const syncClipboardToAgent = () => {
    navigator.clipboard.readText().then((text) => {
      if (socket && activeSession) {
        socket.emit('clipboard', { sessionId: activeSession.sessionId, text });
        setCopiedClipboard(true);
        setTimeout(() => setCopiedClipboard(false), 2000);
      }
    });
  };

  // Send text chat
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !activeSession) return;

    const messagePayload = {
      sessionId: activeSession.sessionId,
      senderName: user?.name || 'Engineer',
      text: chatInput,
      timestamp: new Date().toLocaleTimeString()
    };

    socket.emit('chat', messagePayload);
    addChatMessage(messagePayload);
    setChatInput('');
  };

  // WebRTC Cleanup handler when session terminates
  useEffect(() => {
    return () => {
      if (!activeSession) {
        if (pcRef.current) {
          console.log('[Dashboard WebRTC]: Closing and clearing PeerConnection.');
          pcRef.current.close();
          pcRef.current = null;
        }
        setRemoteStream(null);
      }
    };
  }, [activeSession]);

  // Render mock screen moving circles on canvas when active
  useEffect(() => {
    if (!activeSession || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let radius = 50;
    let angle = 0;

    const render = () => {
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw agent screen frame simulation
      ctx.fillStyle = '#1e293b'; // slate-800
      ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

      // Draw Grid Lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 60) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw system info text
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`TELEPORT SECURE STREAM - PEER ACTIVE`, 80, 100);

      ctx.font = '14px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Host: Windows Agent Client`, 80, 130);
      ctx.fillText(`Protocol: WebRTC DataChannels`, 80, 150);
      ctx.fillText(`Resolution: 1920x1080 (HD)`, 80, 170);

      // Draw rotating orbit to show live video stream
      angle += 0.05;
      const cx = canvas.width / 2 + Math.cos(angle) * 150;
      const cy = canvas.height / 2 + Math.sin(angle) * 150;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'; // Translucent blue orb
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#3b82f6';
      ctx.fill();
      ctx.shadowBlur = 0; // reset shadow

      animationId = requestAnimationFrame(render);
    };

    render();

    // Listen to incoming sockets clipboard and chat in state store
    if (socket) {
      socket.on('clipboard', (data: { text: string }) => {
        navigator.clipboard.writeText(data.text);
        addChatMessage({
          senderName: 'System',
          text: `Clipboard sync: received text from client.`,
          timestamp: new Date().toLocaleTimeString()
        });
      });

      socket.on('chat', (data: ChatMessage) => {
        addChatMessage(data);
      });
    }

    return () => {
      cancelAnimationFrame(animationId);
      if (socket) {
        socket.off('clipboard');
        socket.off('chat');
      }
    };
  }, [activeSession, socket]);

  const logger = (title: string, details: string) => {
    console.log(`[AuditLog]: ${title} - ${details}`);
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ipAddress.includes(searchQuery)
  );

  // Check if we are in customer screen sharing mode
  const isShareView = window.location.pathname === '/share' || window.location.search.includes('token=');
  if (isShareView) {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('token') || '';
    return <ShareScreen inviteToken={inviteToken} />;
  }

  // Authenticated Dashboard Layout
  if (token && user) {
    return (
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-900 bg-slate-900/20 backdrop-blur-xl flex flex-col justify-between">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Monitor className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white">Teleport</span>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => { setCurrentView('home'); setActiveSession(null); }}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  currentView === 'home' && !activeSession
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Console Home</span>
              </button>

              <button
                onClick={() => { setCurrentView('devices'); setActiveSession(null); }}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  currentView === 'devices' && !activeSession
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Device List</span>
                {devices.filter((d) => d.isOnline).length > 0 && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>

              <button
                onClick={() => { setCurrentView('billing'); setActiveSession(null); }}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  currentView === 'billing' && !activeSession
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Billing Plans</span>
              </button>

              <button
                onClick={() => { setCurrentView('teams'); setActiveSession(null); }}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  currentView === 'teams' && !activeSession
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Teams</span>
              </button>

              <button
                onClick={() => { setCurrentView('settings'); setActiveSession(null); }}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  currentView === 'settings' && !activeSession
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </nav>
          </div>

          <div className="p-6 border-t border-slate-900">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                <User className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-200">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-slate-800 hover:border-red-500/20 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl text-xs font-bold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        {/* Workspace Body */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/40 relative">
          {/* Top Nav */}
          <header className="h-16 border-b border-slate-900 px-8 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-400">Support Console</span>
              <span className="text-xs text-slate-600">/</span>
              <span className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                {activeSession ? `Active Session [${activeSession.deviceId}]` : currentView}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-300">Signal: Connected</span>
              </div>
            </div>
          </header>

          {/* Active Session remote desktop viewport */}
          {activeSession ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Desktop Mirror Container */}
              <div className="flex-1 flex flex-col p-6 items-center justify-center bg-slate-950 relative">
                <div className="w-full max-w-4xl flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-md font-bold text-white">Remote Windows Desktop</h2>
                    <span className="text-xs text-slate-500">Latency: {latencyText}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={syncClipboardToAgent}>
                      {copiedClipboard ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="ml-1.5">{copiedClipboard ? 'Copied!' : 'Sync Clipboard'}</span>
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setActiveSession(null)}>
                      Disconnect
                    </Button>
                  </div>
                </div>

                <div 
                  className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  tabIndex={0}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                >
                  {remoteStream ? (
                    <video
                      ref={(el) => {
                        if (el) el.srcObject = remoteStream;
                      }}
                      autoPlay
                      playsInline
                      muted
                      onMouseMove={handleCanvasMouseEvent as any}
                      onMouseDown={handleCanvasMouseEvent as any}
                      className="w-[1024px] h-[576px] bg-slate-900 object-contain"
                    />
                  ) : (
                    <canvas
                      ref={canvasRef}
                      width={1024}
                      height={576}
                      onMouseMove={handleCanvasMouseEvent}
                      onMouseDown={handleCanvasMouseEvent}
                      onMouseUp={handleCanvasMouseEvent}
                      className="cursor-crosshair bg-slate-900"
                    />
                  )}
                  <div className="absolute bottom-4 left-4 pointer-events-none bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-400">
                    Click Canvas to focus keys
                  </div>
                </div>
              </div>

              {/* Chat Sidebar */}
              <aside className="w-80 border-l border-slate-900 bg-slate-900/10 flex flex-col justify-between">
                <div className="p-4 border-b border-slate-900 flex items-center space-x-2 text-slate-300">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-white">Session Chat</span>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 py-10">
                      No chat events yet. Text sent from the host agent terminal appears here.
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 mb-1">{msg.senderName} ({msg.timestamp})</span>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200">
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={sendChatMessage} className="p-4 border-t border-slate-900 flex items-center space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to agent..."
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 py-2.5 px-4 text-xs font-semibold focus:border-blue-500 outline-none"
                  />
                  <button type="submit" className="p-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </aside>
            </div>
          ) : (
            <div className="flex-1 p-8 overflow-y-auto">
              {currentView === 'home' && (
                <div className="space-y-8 max-w-5xl">
                  {/* Banner */}
                  <div className="relative rounded-3xl overflow-hidden border border-blue-500/20 bg-gradient-to-tr from-blue-600/5 via-indigo-600/5 to-slate-900 p-8 flex flex-col md:flex-row items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-white leading-tight mb-2">Browser-First Support Gateway</h2>
                      <p className="text-slate-400 text-sm max-w-md">Manage client nodes, configure support channels, and execute real-time diagnosis sessions in single clicks.</p>
                    </div>
                    <Button variant="glass" className="mt-4 md:mt-0" onClick={() => setCurrentView('devices')}>
                      View Devices
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card variant="interactive" className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Active Targets</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-3xl font-extrabold text-white mb-1">
                        {devices.filter((d) => d.isOnline).length}
                      </h3>
                      <p className="text-xs text-slate-500">Devices online and available to accept connects.</p>
                    </Card>

                    <Card variant="interactive" className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Offline nodes</span>
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                          <XCircle className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-3xl font-extrabold text-white mb-1">
                        {devices.filter((d) => !d.isOnline).length}
                      </h3>
                      <p className="text-xs text-slate-500">Devices seen previously.</p>
                    </Card>

                    <Card variant="interactive" className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Total Logs</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <FileText className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-3xl font-extrabold text-white mb-1">2</h3>
                      <p className="text-xs text-slate-500">Security audits written.</p>
                    </Card>
                  </div>
                </div>
              )}

              {currentView === 'devices' && (
                <div className="space-y-6 max-w-5xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-black text-white">Registered Windows Targets</h2>
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search hosts..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs font-semibold focus:border-blue-500 outline-none"
                        />
                      </div>
                      <Button variant="primary" size="sm" className="font-bold flex items-center shrink-0" onClick={() => { setIsInviteModalOpen(true); generateInvitation(); }}>
                        <Plus className="w-3.5 h-3.5 mr-2" />
                        Add Device
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredDevices.map((device) => (
                       <Card key={device.id} variant="default" className="p-6 flex flex-col justify-between border border-slate-900 bg-slate-900/30">
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                                <span>{device.deviceName}</span>
                                {device.screenSharingStatus === 'active' && (
                                  <span className="animate-pulse px-2 py-0.5 rounded text-[8px] bg-red-500/20 text-red-400 font-bold uppercase tracking-wider">
                                    Live Stream
                                  </span>
                                )}
                              </h4>
                              <p className="text-[10px] text-slate-500">Host: {device.hostname} | IP: {device.ipAddress}</p>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center space-x-1.5 ${
                                device.isOnline
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${device.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                              <span>{device.isOnline ? 'Online' : 'Offline'}</span>
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-y-2.5 gap-x-4 border-t border-slate-900 pt-3.5">
                            <div className="flex items-center text-[11px] text-slate-400">
                              <Cpu className="w-3.5 h-3.5 text-blue-500 mr-2 shrink-0" />
                              <span className="truncate">OS: {device.operatingSystem}</span>
                            </div>
                            <div className="flex items-center text-[11px] text-slate-400">
                              <Monitor className="w-3.5 h-3.5 text-indigo-500 mr-2 shrink-0" />
                              <span className="truncate">Browser: {device.windowsVersion}</span>
                            </div>
                            <div className="flex items-center text-[11px] text-slate-400 col-span-2">
                              <span className="text-[10px] font-bold text-slate-500 mr-1.5 uppercase">Specs:</span>
                              <span className="text-slate-300 truncate">{device.cpu} | {device.ram} GB RAM</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-900 pt-3.5 mt-4">
                          <span className="text-[10px] text-slate-500">
                            Seen: {new Date(device.lastSeen).toLocaleString()}
                          </span>
                          <Button
                            variant={device.isOnline ? 'primary' : 'secondary'}
                            size="sm"
                            disabled={!device.isOnline}
                            onClick={() => startSession(device)}
                          >
                            <Play className="w-3 h-3 mr-1.5 fill-current" />
                            <span>Connect Session</span>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {currentView === 'billing' && (
                <div className="max-w-4xl space-y-6">
                  <h2 className="text-lg font-black text-white">Upgrade Support Console Tiers</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 border-slate-800 bg-slate-900/30 flex flex-col justify-between h-80">
                      <div>
                        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Free tier</span>
                        <h3 className="text-3xl font-extrabold text-white mt-2">$0</h3>
                        <p className="text-xs text-slate-400 mt-2">Evaluation limits.</p>
                        <ul className="mt-4 space-y-2 text-xs text-slate-300">
                          <li>• 1 concurrent support stream</li>
                          <li>• Up to 3 Windows agents</li>
                        </ul>
                      </div>
                      <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold mt-4">
                        <Check className="w-4 h-4" />
                        <span>Active Plan</span>
                      </div>
                    </Card>

                    <Card className="p-6 border-blue-500/20 bg-slate-900/30 flex flex-col justify-between h-80">
                      <div>
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Professional</span>
                        <h3 className="text-3xl font-extrabold text-white mt-2">$29<span className="text-xs text-slate-500">/mo</span></h3>
                        <p className="text-xs text-slate-400 mt-2">IT helpdesks & support businesses.</p>
                        <ul className="mt-4 space-y-2 text-xs text-slate-300">
                          <li>• Unlimited concurrent sessions</li>
                          <li>• Up to 50 Windows agents</li>
                          <li>• Clipboard sync & Input injection</li>
                        </ul>
                      </div>
                      <Button variant="primary" size="sm" className="mt-4 w-full">
                        Upgrade (Stripe Demo)
                      </Button>
                    </Card>
                  </div>
                </div>
              )}

              {currentView === 'teams' && (
                <div className="max-w-xl space-y-6">
                  <h2 className="text-lg font-black text-white">Teams & Operations</h2>
                  <Card className="p-6 border-slate-900 bg-slate-900/30">
                    <p className="text-sm text-slate-400">Share connection credentials, device logs, and diagnostic dashboards with team members.</p>
                    <div className="mt-6 flex items-center space-x-3">
                      <Button variant="outline" size="sm">Create New Team</Button>
                    </div>
                  </Card>
                </div>
              )}

              {currentView === 'settings' && (
                <div className="max-w-xl space-y-6">
                  <h2 className="text-lg font-black text-white">Global Console Settings</h2>
                  <Card className="p-6 border-slate-900 bg-slate-900/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">Confirm Permission prompt</p>
                        <p className="text-[10px] text-slate-500">Require customer acceptance before starting screen stream.</p>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded border-slate-800 bg-slate-950" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">Enable AES-256 session logging</p>
                        <p className="text-[10px] text-slate-500">Log all commands injected during sessions.</p>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded border-slate-800 bg-slate-950" />
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Modal while connecting */}
        <Modal isOpen={isConnecting} onClose={() => setIsConnecting(false)} title="Establishing Session Link">
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-slate-200 text-sm font-semibold">{connectionMessage}</p>
            <p className="text-slate-500 text-xs">If the agent fails to approve, a mock stream session will launch automatically.</p>
          </div>
        </Modal>

        {/* Modal for Add Device / Generate Invite link */}
        <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Add Device via Browser Share">
          <div className="p-6 space-y-4">
            <p className="text-slate-300 text-xs leading-relaxed">
              Generate a unique connection link. Send this link to the customer to start a WebRTC-based screen sharing session instantly without installing any client agent.
            </p>
            
            {isGeneratingInvite ? (
              <div className="flex items-center justify-center py-6 space-x-2">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-xs text-slate-400">Generating invite credentials...</span>
              </div>
            ) : inviteLink ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300 truncate mr-4 select-all">{inviteLink}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="p-2 bg-blue-600/80 hover:bg-blue-700 rounded-lg text-white transition-colors shrink-0"
                    title="Copy Link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {copiedLink && (
                  <p className="text-[10px] text-emerald-400 font-semibold text-right">Invitation copied to clipboard!</p>
                )}
              </div>
            ) : (
              <Button variant="primary" className="w-full font-bold" onClick={generateInvitation}>
                Generate Invitation Link
              </Button>
            )}
            
            <div className="pt-2 border-t border-slate-900 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Unauthenticated Login / Register Screen
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 font-sans relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-600/5 rounded-full blur-[80px] pointer-events-none" />

      <Card variant="glass" className="w-full max-w-md p-8 border-slate-800 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Teleport Support</h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            {isLogin ? 'Sign in to your helpdesk account' : 'Register a support engineer profile'}
          </p>
        </div>

        {authError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 font-semibold mb-6">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <Input
              type="text"
              label="Full Name"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <Input
            type="email"
            label="Email Address"
            placeholder="demo@teleport.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full font-bold mt-4" isLoading={authLoading}>
            {isLogin ? 'Sign In' : 'Register Profile'}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </Card>
    </div>
  );
}

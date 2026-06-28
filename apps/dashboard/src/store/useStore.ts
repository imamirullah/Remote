import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { IDevice, ISession } from '@remote-support/shared-types';

export interface ChatMessage {
  senderName: string;
  text: string;
  timestamp: string;
}

interface StoreState {
  user: any | null;
  token: string | null;
  devices: IDevice[];
  activeSession: ISession | null;
  chatMessages: ChatMessage[];
  socket: Socket | null;
  
  setUser: (user: any) => void;
  setToken: (token: string | null) => void;
  setDevices: (devices: IDevice[]) => void;
  setActiveSession: (session: ISession | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  devices: [],
  activeSession: null,
  chatMessages: [],
  socket: null,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },
  setDevices: (devices) => set({ devices }),
  setActiveSession: (activeSession) => set({ activeSession }),
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  connectSocket: (token) => {
    const existingSocket = get().socket;
    if (existingSocket) return;

    const socketUrl = 'http://localhost:5003/';
    const socket = io(socketUrl, {
      auth: { token },
      query: { clientType: 'engineer' },
    });

    socket.on('connect', () => {
      console.log('Connected to signaling WebSocket server.');
    });

    // Handle online/offline devices broadcasts
    socket.on('device-online', (data: { deviceId: string }) => {
      set((state) => ({
        devices: state.devices.map((d) =>
          d.deviceId === data.deviceId ? { ...d, isOnline: true } : d
        ),
      }));
    });

    socket.on('device-offline', (data: { deviceId: string }) => {
      set((state) => ({
        devices: state.devices.map((d) =>
          d.deviceId === data.deviceId ? { ...d, isOnline: false } : d
        ),
      }));
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));

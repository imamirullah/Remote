// User Roles
export type UserRole = 'admin' | 'support_engineer' | 'customer';

// User Account
export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Device specifications and status
export interface IDevice {
  id: string;
  deviceId: string; // Hardware-based unique identifier
  deviceName: string;
  hostname: string;
  operatingSystem: string;
  windowsVersion: string;
  cpu: string;
  ram: number; // in GB
  ipAddress: string;
  isOnline: boolean;
  screenSharingStatus?: string;
  latency?: number;
  lastSeen: Date;
  registeredAt: Date;
}

// Session Status
export type SessionStatus = 'requested' | 'accepted' | 'rejected' | 'active' | 'completed';

// Session Information
export interface ISession {
  id: string;
  sessionId: string;
  deviceId: string;
  engineerId: string;
  status: SessionStatus;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  recordingUrl?: string;
}

// Audit Log entry
export interface IAuditLog {
  id: string;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: Date;
}

// System Health Information
export interface ISystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    api: boolean;
    websocket: boolean;
    auth: boolean;
    redis: boolean;
    mongodb: boolean;
  };
  cpuUsage: number;
  memoryUsage: number;
  activeSessions: number;
  uptime: number; // in seconds
}

// Team management
export interface ITeam {
  id: string;
  name: string;
  ownerId: string;
  members: {
    userId: string;
    role: 'manager' | 'member';
  }[];
  createdAt: Date;
}

// Subscription pricing plans
export type SubscriptionTier = 'free' | 'professional' | 'enterprise';

export interface ISubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeSubscriptionId?: string;
}

// WebSocket Event Payloads
export interface DeviceOnlinePayload {
  deviceId: string;
  deviceName: string;
  hostname: string;
  operatingSystem: string;
  windowsVersion: string;
  cpu: string;
  ram: number;
  ipAddress: string;
}

export interface SessionRequestPayload {
  sessionId: string;
  deviceId: string;
  engineerId: string;
  engineerName: string;
}

export interface SessionResponsePayload {
  sessionId: string;
  accepted: boolean;
  reason?: string;
}

export interface WebRTCSignalPayload {
  sessionId: string;
  targetId: string; // The receiver's socket/peer ID
  signal: {
    type: 'offer' | 'answer' | 'candidate';
    sdp?: string;
    candidate?: any;
  };
}

export interface MouseEventPayload {
  sessionId: string;
  type: 'mousemove' | 'mousedown' | 'mouseup' | 'click' | 'dblclick' | 'wheel';
  x: number; // normalized coordinate (0.0 to 1.0)
  y: number; // normalized coordinate (0.0 to 1.0)
  button?: 'left' | 'right' | 'middle';
  deltaX?: number;
  deltaY?: number;
}

export interface KeyboardEventPayload {
  sessionId: string;
  type: 'keydown' | 'keyup';
  key: string;      // Key value (e.g. "a", "Enter")
  code: string;     // Physical key code (e.g. "KeyA", "Enter")
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface ClipboardPayload {
  sessionId: string;
  text: string;
}

export interface ChatMessagePayload {
  sessionId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface HeartbeatPayload {
  deviceId: string;
  latency?: number;
}

import { useState } from 'react';
import {
  ShieldAlert,
  Users,
  Server,
  Activity,
  DollarSign,
  FileText,
  Clock,
  Search,
  CheckCircle,
  Database
} from 'lucide-react';
import { Card } from '@remote-support/ui';

export default function App() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'sessions' | 'logs'>('metrics');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock Database
  const systemHealth = {
    status: 'healthy',
    uptime: '14d 8h 24m',
    services: [
      { name: 'Auth Microservice', status: 'online', port: 5001 },
      { name: 'API Microservice', status: 'online', port: 5002 },
      { name: 'WebSocket Signaling broker', status: 'online', port: 5003 },
      { name: 'Billing Microservice', status: 'online', port: 5004 },
      { name: 'Notifications Dispatcher', status: 'online', port: 5005 },
      { name: 'MongoDB ReplicaSet', status: 'online', port: 27017 },
      { name: 'Redis Cache cluster', status: 'online', port: 6379 }
    ]
  };

  const usersList = [
    { id: '1', name: 'Amir Khan', email: 'amir@teleport.io', role: 'admin', verified: true, date: '2026-01-10' },
    { id: '2', name: 'John Doe', email: 'john@helpdesk.com', role: 'support_engineer', verified: true, date: '2026-03-14' },
    { id: '3', name: 'Sarah Smith', email: 'sarah.smith@client.org', role: 'customer', verified: false, date: '2026-06-25' }
  ];

  const sessionsList = [
    { id: 'sess-89a12k', engineer: 'John Doe', device: 'DESKTOP-89F12K', duration: '18m 40s', date: '2026-06-28', status: 'completed' },
    { id: 'sess-04p12d', engineer: 'John Doe', device: 'Workstation-A', duration: 'Active now', date: '2026-06-28', status: 'active' }
  ];

  const auditLogs = [
    { timestamp: '13:12:04', actor: 'John Doe', action: 'session-request', target: 'DESKTOP-89F12K', ip: '192.168.1.104' },
    { timestamp: '13:12:08', actor: 'DESKTOP-89F12K', action: 'session-accepted', target: 'John Doe', ip: '127.0.0.1' },
    { timestamp: '13:30:48', actor: 'John Doe', action: 'session-completed', target: 'DESKTOP-89F12K', ip: '192.168.1.104' }
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-900/10 flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-md text-white">Teleport Admin</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'metrics'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>System Health</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'sessions'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Sessions Audit</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Security Logs</span>
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-900 pt-4">
          <p className="text-[10px] font-bold text-slate-500">ADMINISTRATIVE PORTAL</p>
          <p className="text-[10px] text-slate-600 mt-1">Teleport Cluster Gateway</p>
        </div>
      </aside>

      {/* Main Panel Body */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/40">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-900 px-8 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
            {activeTab === 'metrics' && 'Cluster Overview'}
            {activeTab === 'users' && 'Account Credentials'}
            {activeTab === 'sessions' && 'Active Connection Index'}
            {activeTab === 'logs' && 'Cryptographic Audits'}
          </h2>
          <div className="flex items-center space-x-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs text-slate-400 font-semibold">Active Node: Primary US-East</span>
          </div>
        </header>

        {/* Workspace views */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'metrics' && (
            <div className="space-y-8 max-w-5xl">
              {/* Analytics summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 border-slate-900 bg-slate-900/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Monthly Revenue</span>
                  <div className="flex items-center space-x-2 mt-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-3xl font-extrabold text-white">$14,240</h3>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-bold mt-2">+12% vs last month</p>
                </Card>

                <Card className="p-6 border-slate-900 bg-slate-900/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Handshakes</span>
                  <div className="flex items-center space-x-2 mt-2">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-3xl font-extrabold text-white">4</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">WebRTC signalling channels</p>
                </Card>

                <Card className="p-6 border-slate-900 bg-slate-900/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Engineers Online</span>
                  <div className="flex items-center space-x-2 mt-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <h3 className="text-3xl font-extrabold text-white">8</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Logged-in browsers</p>
                </Card>

                <Card className="p-6 border-slate-900 bg-slate-900/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cluster Uptime</span>
                  <div className="flex items-center space-x-2 mt-2">
                    <Server className="w-5 h-5 text-purple-500" />
                    <h3 className="text-2xl font-extrabold text-white truncate">{systemHealth.uptime}</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">0 service crash incidents</p>
                </Card>
              </div>

              {/* Service Health Cards */}
              <div>
                <h3 className="text-md font-bold text-white mb-4">Cluster Service Instances</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systemHealth.services.map((svc) => (
                    <Card key={svc.name} className="p-4 border-slate-900 bg-slate-900/30 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Database className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="text-xs font-bold text-white">{svc.name}</p>
                          <p className="text-[9px] text-slate-500">Internal Port: {svc.port}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400 mr-1" />
                        <span>Active</span>
                      </span>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="max-w-4xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-bold text-white">Console User Directory</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs font-semibold focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <Card className="border-slate-900 bg-slate-900/10 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-900/50 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Registered Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {usersList.map((user) => (
                      <tr key={user.id} className="border-b border-slate-900 hover:bg-slate-900/40">
                        <td className="p-4 font-bold text-white">{user.name}</td>
                        <td className="p-4 text-slate-400">{user.email}</td>
                        <td className="p-4 uppercase tracking-wider text-[10px] text-slate-400 font-bold">{user.role}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            user.verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {user.verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">{user.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="max-w-4xl space-y-6">
              <h3 className="text-md font-bold text-white">Remote Handshake Audits</h3>
              <Card className="border-slate-900 bg-slate-900/10 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-900/50 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      <th className="p-4">Session ID</th>
                      <th className="p-4">Engineer</th>
                      <th className="p-4">Device Host</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {sessionsList.map((sess) => (
                      <tr key={sess.id} className="border-b border-slate-900 hover:bg-slate-900/40">
                        <td className="p-4 font-bold text-indigo-400">{sess.id}</td>
                        <td className="p-4 text-slate-200">{sess.engineer}</td>
                        <td className="p-4 text-slate-400">{sess.device}</td>
                        <td className="p-4 text-slate-400">{sess.duration}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            sess.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 animate-pulse' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {sess.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">{sess.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="max-w-4xl space-y-6">
              <h3 className="text-md font-bold text-white">Cryptographic Security Logs</h3>
              <Card className="p-6 border-slate-900 bg-slate-900/20 font-mono text-xs text-slate-400 space-y-3">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-2 py-1.5 border-b border-slate-900/80 last:border-b-0">
                    <span className="text-slate-600 font-semibold">[{log.timestamp}]</span>
                    <span className="text-indigo-400 font-bold">{log.actor}</span>
                    <span className="text-slate-500">dispatched action</span>
                    <span className="text-white font-bold">{log.action}</span>
                    <span className="text-slate-500">to</span>
                    <span className="text-purple-400 font-bold">{log.target}</span>
                    <span className="text-slate-600">(IP: {log.ip})</span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

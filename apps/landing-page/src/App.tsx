import { Download, Monitor, Shield, Zap, Keyboard, Activity } from 'lucide-react';

export default function App() {
  const handleDownload = () => {
    // Mock Agent download triggering file generation or pointing to rust release binary
    const mockFileContent = "REM Teleport Agent Bootstrapper\necho Launching Teleport Remote Support Agent...\n";
    const blob = new Blob([mockFileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'teleport-agent-install.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Teleport
          </span>
        </div>
        <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#download" className="hover:text-white transition-colors">Download Agent</a>
        </nav>
        <div className="flex items-center space-x-4">
          <a 
            href="http://localhost:5173/" 
            className="px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-900 rounded-xl border border-slate-800 transition-all"
          >
            Launch Console
          </a>
          <button 
            onClick={handleDownload}
            className="hidden sm:flex items-center px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-white shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Agent
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-20 flex flex-col items-center text-center overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-pulse">
          <Activity className="w-3.5 h-3.5" />
          <span>Browser-First Remote Support</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Connect to any remote device straight from your browser.
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl font-medium mb-10 leading-relaxed">
          The support engineer never installs any software. Just sign in, choose a customer's Windows machine, and start control. Pure WebRTC performance.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button 
            onClick={handleDownload}
            className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-base font-bold text-white rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] transition-all"
          >
            <Download className="w-5 h-5 mr-2.5" />
            Download Windows Agent
          </button>
          <a 
            href="http://localhost:5173/"
            className="w-full sm:w-auto px-8 py-4 border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-base font-bold rounded-2xl text-slate-300 hover:text-white transition-all text-center"
          >
            Open Console
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="px-6 py-20 bg-slate-950 relative border-t border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4">
              Designed for Speed. Hardened for Security.
            </h2>
            <p className="text-slate-400 font-medium">
              A robust client-server architecture bringing native performance to standard web engines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">WebRTC Video Streaming</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                DXGI screen duplication matches Windows desktop frame buffers, streamed peer-to-peer using high-performance H.264 video compression.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="p-8 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-500 mb-6">
                <Keyboard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">OS-Level Input Injection</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Mouse movements, scroll events, and raw keyboard strokes are routed instantly to the target Windows service using `SendInput` APIs.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="p-8 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-500 mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AES-256 GCM Sessions</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Connection handshakes require explicit user permission confirmation. Signaling and session channels are fully encrypted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-20 bg-slate-950 relative border-t border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4">
              Simple, Predictable Pricing
            </h2>
            <p className="text-slate-400 font-medium">
              Choose the plan that suits your team. Upgrade or cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-3xl border border-slate-900 bg-slate-950 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-500 uppercase tracking-widest">Free</span>
                <div className="flex items-baseline mt-4">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-slate-500 ml-2">/ month</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">Perfect for personal use and evaluating the platform.</p>
                <ul className="mt-6 space-y-4 text-sm text-slate-300">
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> 1 concurrent session</li>
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> Up to 3 registered devices</li>
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> Standard resolution streaming</li>
                </ul>
              </div>
              <a href="http://localhost:5173/register" className="mt-8 block text-center py-3 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-sm font-bold text-white rounded-xl transition-all">
                Get Started
              </a>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-3xl border border-blue-500 bg-slate-900/40 relative flex flex-col justify-between shadow-2xl shadow-blue-500/5">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-blue-600 text-white text-xs font-extrabold uppercase px-3 py-1 rounded-full">
                Most Popular
              </div>
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest font-sans">Professional</span>
                <div className="flex items-baseline mt-4">
                  <span className="text-4xl font-extrabold text-white">$29</span>
                  <span className="text-slate-500 ml-2">/ month</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">Great for individual IT professionals and freelancers.</p>
                <ul className="mt-6 space-y-4 text-sm text-slate-300">
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> Unlimited concurrent sessions</li>
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> Up to 50 registered devices</li>
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> Full HD 60fps WebRTC streaming</li>
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> Clipboard & File Transfer</li>
                </ul>
              </div>
              <button 
                onClick={handleDownload}
                className="mt-8 block text-center py-3 bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all"
              >
                Buy Now
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 rounded-3xl border border-slate-900 bg-slate-950 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Enterprise</span>
                <div className="flex items-baseline mt-4">
                  <span className="text-4xl font-extrabold text-white">Custom</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">Designed for large corporate environments and MSP teams.</p>
                <ul className="mt-6 space-y-4 text-sm text-slate-300">
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> Unlimited devices & sessions</li>
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> Full Active Directory/SSO integration</li>
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> Encrypted Session Recording logs</li>
                  <li className="flex items-center"><Zap className="w-4 h-4 text-blue-500 mr-3" /> Dedicated self-hosted signaling nodes</li>
                </ul>
              </div>
              <a href="mailto:sales@teleport-remote.com" className="mt-8 block text-center py-3 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-sm font-bold text-white rounded-xl transition-all">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 px-6 py-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Teleport Inc. All rights reserved. Built with Rust & React.</p>
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  GraduationCap, 
  HelpCircle, 
  Sliders, 
  History, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  FileSpreadsheet,
  Radar,
  Lock,
  ChevronRight,
  LogIn
} from 'lucide-react';

export default function LandingPage({ onLogin, onDemoLogin, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showManualLogin, setShowManualLogin] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsLoading(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      // handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  const demoCards = [
    {
      role: "STUDENT",
      title: "Student Experience",
      name: "Aarav Sharma (A101)",
      desc: "Score: 87.6/100. Explore the signature 'WHY 87.6?' breakdown, 'What-If' mark simulator, and personal Mark DNA.",
      username: "student_a101",
      badge: "Student Portal",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      buttonBg: "bg-emerald-600 hover:bg-emerald-700 text-white"
    },
    {
      role: "FACULTY",
      title: "Faculty Control",
      name: "Prof. Rajesh Kumar",
      desc: "Manage Data Structures (CS201), Smart Excel Merge with flexible column mapping, Conflict Detector, and Consolidated Marksheets.",
      username: "faculty1",
      badge: "Faculty Course Setup",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      buttonBg: "bg-indigo-600 hover:bg-indigo-700 text-white"
    },
    {
      role: "HOD",
      title: "Academic Oversight",
      name: "Dr. Arvind Sharma (HOD)",
      desc: "Institutional Assessment Health, Anomaly Radar (missing marks, clusters, weightage mismatch), course lock/unlock authorization.",
      username: "hod",
      badge: "Institutional Health",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      buttonBg: "bg-purple-600 hover:bg-purple-700 text-white"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      
      {/* Top Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">MARKSCOPE</span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowManualLogin(!showManualLogin)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {showManualLogin ? "Hide Credentials Form" : "Custom Login"}
            </button>
            <button
              onClick={() => onDemoLogin("student_a101")}
              className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
            >
              Instant Live Demo
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 flex-1 flex flex-col justify-center">
        
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Explainable Academic Assessment Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            “Every mark has a story.”
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Transform fragmented Excel spreadsheets into accurate, explainable and transparent academic records.
            Trace every score from raw submission to final weighted grade.
          </p>
        </div>

        {/* 3 Core Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 transition-all hover:shadow-xl hover:shadow-indigo-500/10 group">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-4">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">EXPLAIN</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Understand exactly how every mark was calculated. Step-by-step visual formulas, Best-of-N rules, and audit adjustment tracking.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 transition-all hover:shadow-xl hover:shadow-emerald-500/10 group">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform mb-4">
              <Sliders className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">SIMULATE</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              What-If simulator allows students to experiment with hypothetical scores in real-time without modifying official institutional marks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10 group">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform mb-4">
              <History className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">TRACE</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Git-like audit timeline tracks every change, who made it, when, previous and new values, preventing disputes and preserving integrity.
            </p>
          </div>

        </div>

        {/* Manual Credentials Box (if toggled) */}
        {showManualLogin && (
          <div className="max-w-md mx-auto w-full mb-10 p-6 rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-2 mb-4">
              <LogIn className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Sign In With Credentials</h3>
            </div>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username or Email</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. hod, faculty1, student_a101"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. hod123, faculty123, student123"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md mt-2"
              >
                {isLoading ? "Signing in..." : "Sign In to MarkScope"}
              </button>
            </form>
          </div>
        )}

        {/* Demo Personas Grid */}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
              One-Click Evaluation Personas — Ready To Demo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {demoCards.map((card) => (
              <div
                key={card.username}
                className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 hover:border-slate-700 flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border uppercase font-bold ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">u: {card.username}</span>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-white">{card.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{card.desc}</p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => onDemoLogin(card.username)}
                    className={`w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 ${card.buttonBg}`}
                  >
                    <span>Launch as {card.role}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>MARKSCOPE — Internal Marks Compilation & Assessment Intelligence Platform</p>
        <p className="text-[11px] text-slate-600 mt-1">Built with React, FastAPI, SQLAlchemy & Modern Web Standards</p>
      </footer>

    </div>
  );
}

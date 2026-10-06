import React, { useState } from 'react';
import { 
  GraduationCap, 
  UserCircle, 
  LogOut, 
  Sparkles, 
  FileSpreadsheet, 
  HelpCircle, 
  ChevronDown,
  ShieldCheck,
  Compass
} from 'lucide-react';

export default function Navbar({ 
  user, 
  onLogout, 
  onDemoSwitch, 
  onOpenSampleFiles, 
  onOpenTour,
  activeTab,
  setActiveTab 
}) {
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const demoAccounts = [
    { label: "Dr. Arvind Sharma (HOD)", username: "hod", role: "HOD", tag: "Full Academic Oversight" },
    { label: "Prof. Rajesh Kumar (Faculty)", username: "faculty1", role: "FACULTY", tag: "CS201 Data Structures" },
    { label: "Prof. Sneha Patel (Faculty)", username: "faculty2", role: "FACULTY", tag: "CS101 Locked Course" },
    { label: "Aarav Sharma (Student A101)", username: "student_a101", role: "STUDENT", tag: "Score 87.6, Explained & DNA" },
    { label: "Ananya Iyer (Student A102)", username: "student_a102", role: "STUDENT", tag: "Has Active Mark Conflict" },
    { label: "Priya Nair (Student A104)", username: "student_a104", role: "STUDENT", tag: "Dispute Ticket #MR-1028" },
  ];

  const getRoleBadge = (role) => {
    switch (role) {
      case 'HOD':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'FACULTY':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'STUDENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab && setActiveTab('home')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">MARKSCOPE</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ACADEMIC SAAS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">Every mark has a story.</p>
            </div>
          </div>

          {/* Quick Actions & Demo Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Interactive Guided Tour Button */}
            <button
              onClick={onOpenTour}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-600/50 transition-colors shadow-sm"
              title="Launch 10-step hackathon demo walkthrough"
            >
              <Compass className="h-3.5 w-3.5 text-indigo-400 animate-spin-slow" />
              <span className="hidden md:inline">Guided Demo Tour</span>
              <span className="md:hidden">Tour</span>
            </button>

            {/* Sample Files Download Button */}
            <button
              onClick={onOpenSampleFiles}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
              title="Download realistic test Excel files"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden md:inline">Sample Files</span>
            </button>

            {/* Instant Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 transition-all shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden lg:inline">Switch Persona</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {showDemoMenu && (
                <div 
                  className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setShowDemoMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <p className="text-xs font-semibold text-slate-300">Instant Demo Role Switcher</p>
                    <p className="text-[11px] text-slate-400">Jump between roles to test permissions & isolation</p>
                  </div>
                  <div className="space-y-1">
                    {demoAccounts.map((acc) => (
                      <button
                        key={acc.username}
                        onClick={() => onDemoSwitch(acc.username)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                          user?.username === acc.username ? 'bg-indigo-600/30 border border-indigo-500/40 text-white' : 'hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-100">{acc.label}</div>
                          <div className="text-[10px] text-slate-400">{acc.tag}</div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${getRoleBadge(acc.role)}`}>
                          {acc.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Current User Info & Logout */}
            {user && (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-white leading-tight">{user.full_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {user.roll_no || user.faculty_code || user.role}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${getRoleBadge(user.role)}`}>
                  {user.role}
                </span>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}

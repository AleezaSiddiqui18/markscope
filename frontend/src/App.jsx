import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import StudentDashboard from './components/StudentDashboard';
import FacultyDashboard from './components/FacultyDashboard';
import HODDashboard from './components/HODDashboard';
import DemoTourBanner from './components/DemoTourBanner';
import SampleFilesModal from './components/SampleFilesModal';
import { authAPI } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState(null);
  
  // Guided Tour Banner state
  const [showTour, setShowTour] = useState(false);
  
  // Sample Files Modal state
  const [showSampleFiles, setShowSampleFiles] = useState(false);

  // Cross-component modal triggers for Guided Tour
  const [studentInitialModal, setStudentInitialModal] = useState(null);
  const [facultyInitialTab, setFacultyInitialTab] = useState('marksheet');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("markscope_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const profile = await authAPI.getProfile();
      setUser(profile);
    } catch (err) {
      localStorage.removeItem("markscope_token");
      localStorage.removeItem("markscope_user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (username, password) => {
    setLoginError(null);
    try {
      const res = await authAPI.login(username, password);
      localStorage.setItem("markscope_token", res.access_token);
      localStorage.setItem("markscope_user", JSON.stringify(res.user));
      setUser(res.user);
    } catch (err) {
      setLoginError(err.message || "Invalid credentials.");
      throw err;
    }
  };

  const handleDemoLogin = async (username) => {
    setLoginError(null);
    try {
      const res = await authAPI.demoSwitch(username);
      localStorage.setItem("markscope_token", res.access_token);
      localStorage.setItem("markscope_user", JSON.stringify(res.user));
      setUser(res.user);
    } catch (err) {
      alert("Demo login error: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("markscope_token");
    localStorage.removeItem("markscope_user");
    setUser(null);
    setShowTour(false);
  };

  // Helper for Tour steps
  const handleTourNavigateTab = (tabId) => {
    setFacultyInitialTab(tabId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide text-indigo-200">Initializing MarkScope Engine...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, render modern SaaS Landing Page
  if (!user) {
    return (
      <LandingPage
        onLogin={handleLogin}
        onDemoLogin={handleDemoLogin}
        error={loginError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navigation */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onDemoSwitch={handleDemoLogin}
        onOpenSampleFiles={() => setShowSampleFiles(true)}
        onOpenTour={() => setShowTour(true)}
      />

      {/* Guided Tour Banner (if active) */}
      {showTour && (
        <DemoTourBanner
          onClose={() => setShowTour(false)}
          onDemoSwitch={handleDemoLogin}
          onNavigateTab={handleTourNavigateTab}
          onOpenExplain={() => setStudentInitialModal('explain')}
          onOpenWhatIf={() => setStudentInitialModal('whatif')}
          onOpenTimeline={() => setStudentInitialModal('timeline')}
        />
      )}

      {/* Main Content Area based on User Role */}
      <main className="flex-1">
        {user.role === 'STUDENT' && (
          <StudentDashboard
            user={user}
            initialOpenModal={studentInitialModal}
          />
        )}

        {user.role === 'FACULTY' && (
          <FacultyDashboard
            user={user}
            initialTab={facultyInitialTab}
          />
        )}

        {user.role === 'HOD' && (
          <HODDashboard
            user={user}
          />
        )}
      </main>

      {/* Sample Files Download Modal */}
      <SampleFilesModal
        isOpen={showSampleFiles}
        onClose={() => setShowSampleFiles(false)}
      />

      {/* Subtle Bottom Status Bar */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-slate-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="font-semibold text-slate-600">MarkScope Assessment Engine: v1.0 Operational</span>
        </div>
        <div className="flex items-center space-x-4 text-[11px]">
          <span>Role: <strong className="text-slate-700">{user.role}</strong></span>
          <span>Security: <strong className="text-slate-700">Strict IDOR Enforced</strong></span>
          <span>FastAPI + React</span>
        </div>
      </footer>

    </div>
  );
}

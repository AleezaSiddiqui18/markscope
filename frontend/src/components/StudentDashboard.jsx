import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Sliders, 
  History, 
  Dna, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  RotateCcw, 
  FileText, 
  Send, 
  Sparkles,
  TrendingUp,
  Award,
  ChevronRight,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { studentAPI, disputeAPI } from '../api';

export default function StudentDashboard({ user, initialOpenModal }) {
  const studentId = user.student_id;
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [explainData, setExplainData] = useState(null);
  const [dnaData, setDnaData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active view modal or drawer: 'explain' | 'whatif' | 'timeline' | 'dna' | 'dispute' | null
  const [activeModal, setActiveModal] = useState(initialOpenModal || null);

  // What-If Simulator state
  const [simulatedScores, setSimulatedScores] = useState({});
  const [simResult, setSimResult] = useState(null);

  // Dispute Request form state
  const [disputeComponentId, setDisputeComponentId] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSuccessMsg, setDisputeSuccessMsg] = useState(null);

  useEffect(() => {
    if (initialOpenModal) {
      setActiveModal(initialOpenModal);
    }
  }, [initialOpenModal]);

  useEffect(() => {
    loadDashboard();
  }, [studentId]);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseDetails(selectedCourseId);
    }
  }, [selectedCourseId]);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const data = await studentAPI.getDashboard(studentId);
      setCourses(data.courses || []);
      if (data.courses && data.courses.length > 0) {
        setSelectedCourseId(data.courses[0].course_id);
      }
    } catch (err) {
      console.error("Failed to load student dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseDetails = async (courseId) => {
    try {
      const [exp, dna, timeline] = await Promise.all([
        studentAPI.explain(studentId, courseId),
        studentAPI.getDNA(studentId, courseId),
        studentAPI.getTimeline(studentId, courseId),
      ]);
      setExplainData(exp);
      setDnaData(dna);
      setTimelineData(timeline);

      // Initialize simulator with current obtained scores
      const initialSim = {};
      exp.components.forEach(c => {
        initialSim[c.component_id] = c.obtained_marks;
      });
      setSimulatedScores(initialSim);
      setSimResult(null);

      if (exp.components.length > 0) {
        setDisputeComponentId(exp.components[0].component_id);
      }
    } catch (err) {
      console.error("Failed to load course details:", err);
    }
  };

  const handleRunSimulation = async (newScores) => {
    setSimulatedScores(newScores);
    try {
      const payload = Object.entries(newScores).map(([compId, score]) => ({
        component_id: parseInt(compId),
        simulated_marks: parseFloat(score) || 0
      }));
      const res = await studentAPI.whatIf(studentId, selectedCourseId, payload);
      setSimResult(res);
    } catch (err) {
      console.error("Simulation failed:", err);
    }
  };

  const resetSimulation = () => {
    if (!explainData) return;
    const initialSim = {};
    explainData.components.forEach(c => {
      initialSim[c.component_id] = c.obtained_marks;
    });
    setSimulatedScores(initialSim);
    setSimResult(null);
  };

  const handleTriggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    try {
      const res = await disputeAPI.create(
        selectedCourseId,
        parseInt(disputeComponentId),
        "Assessment",
        disputeReason
      );
      setDisputeSuccessMsg(`Review Request Ticket #${res.ticket_no} submitted successfully. Faculty & HOD have been notified.`);
      setDisputeReason('');
      // Reload timeline to show dispute submission event
      loadCourseDetails(selectedCourseId);
    } catch (err) {
      alert("Failed to submit review request: " + err.message);
    }
  };

  const selectedCourse = courses.find(c => c.course_id === selectedCourseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Loading student assessment profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner & Course Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
            Student Academic Portal
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Welcome, {user.full_name}
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Roll Number: <span className="font-semibold text-slate-800">{user.roll_no}</span> • {user.department}
          </p>
        </div>

        {/* Course Dropdown */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-500">Enrolled Course:</label>
          <select
            value={selectedCourseId || ''}
            onChange={(e) => setSelectedCourseId(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            {courses.map(c => (
              <option key={c.course_id} value={c.course_id}>
                {c.course_code}: {c.course_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Score Card */}
      {explainData && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl border border-indigo-900/50 relative overflow-hidden">
          
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            
            {/* Score & Status */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                  {explainData.course_code} • {explainData.course_name}
                </span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                  explainData.is_locked ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {explainData.is_locked ? "🔒 Locked & Finalized" : "● Submitted"}
                </span>
              </div>

              <div className="flex items-baseline space-x-3">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-white">
                  {explainData.total_internal_mark.toFixed(1)}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-slate-400">
                  / {explainData.max_possible_internal.toFixed(0)}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-mono">
                Formula: {explainData.calculation_formula}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
              
              <button
                onClick={() => { setActiveModal('explain'); handleTriggerCelebration(); }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 active:scale-95 text-center group"
              >
                <HelpCircle className="h-5 w-5 mb-1 text-indigo-200 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-extrabold">WHY {explainData.total_internal_mark.toFixed(1)}?</span>
                <span className="text-[10px] text-indigo-200 opacity-80">Full Math</span>
              </button>

              <button
                onClick={() => setActiveModal('whatif')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white transition-all active:scale-95 text-center group"
              >
                <Sliders className="h-5 w-5 mb-1 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">WHAT IF?</span>
                <span className="text-[10px] text-slate-400">Simulator</span>
              </button>

              <button
                onClick={() => setActiveModal('timeline')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white transition-all active:scale-95 text-center group"
              >
                <History className="h-5 w-5 mb-1 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">TIMELINE</span>
                <span className="text-[10px] text-slate-400">Audit Trail</span>
              </button>

              <button
                onClick={() => setActiveModal('dna')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white transition-all active:scale-95 text-center group"
              >
                <Dna className="h-5 w-5 mb-1 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">MARK DNA</span>
                <span className="text-[10px] text-slate-400">Profile</span>
              </button>

            </div>

          </div>

        </div>
      )}

      {/* Component Breakdown Cards (Official Clean Grid) */}
      {explainData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Official Component Breakdown</h3>
            <button
              onClick={() => setActiveModal('dispute')}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Request Review / Dispute</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {explainData.components.map((comp) => (
              <div 
                key={comp.component_id}
                className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {comp.component_type}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900">{comp.component_name}</h4>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Weight: {comp.weightage}%
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-medium text-slate-500">Marks Scored</span>
                    <span className="text-xl font-extrabold text-slate-900 font-mono">
                      {comp.obtained_marks} <span className="text-xs text-slate-400 font-normal">/ {comp.max_marks}</span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(comp.percentage, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Weighted Contribution</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      +{comp.weighted_contribution.toFixed(1)} / {comp.weightage.toFixed(0)} pts
                    </span>
                  </div>

                  {comp.delta_note && (
                    <div className="p-2 rounded-lg bg-emerald-50 text-[11px] text-emerald-800 border border-emerald-200 flex items-start space-x-1.5 mt-2">
                      <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                      <span>{comp.delta_note}</span>
                    </div>
                  )}

                  {comp.is_best_of_n && (
                    <div className="p-2 rounded-lg bg-indigo-50 text-[11px] text-indigo-800 border border-indigo-100">
                      <span className="font-semibold">Best-of-N Applied:</span> Top scores selected automatically.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 1: SIGNATURE "WHY 87.6?" CALCULATION BREAKDOWN MODAL */}
      {/* ========================================================================= */}
      {activeModal === 'explain' && explainData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-lg font-black text-white">Calculation Breakdown</h3>
                </div>
                <p className="text-xs text-indigo-200">How your official internal mark of {explainData.total_internal_mark.toFixed(1)} was generated</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-300 hover:text-white rounded-lg">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Formula Step */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Official Standard Formula</span>
                <p className="text-sm font-mono font-semibold text-slate-800 mt-1">
                  Weighted Score = (Marks Obtained / Maximum Marks) × Component Weightage
                </p>
              </div>

              {/* Step-by-Step Cards */}
              <div className="space-y-4">
                {explainData.components.map((c, i) => (
                  <div key={c.component_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-bold text-slate-800">
                        Component {i + 1}: {c.component_name} ({c.weightage}% Weight)
                      </h5>
                      <span className="text-xs font-mono font-bold text-indigo-700">
                        +{c.weighted_contribution.toFixed(1)} pts
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                      <span>({c.obtained_marks} / {c.max_marks})</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span>{c.percentage.toFixed(1)}%</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span>× {c.weightage}%</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="font-bold text-slate-900">{c.weighted_contribution.toFixed(1)} points</span>
                    </div>

                    {c.subtests && c.subtests.length > 1 && (
                      <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                        <span className="font-semibold text-slate-700">Best-of-N Subtests Breakdown:</span>
                        {c.subtests.map((s, idx) => (
                          <div key={idx} className="flex justify-between items-center pl-2">
                            <span>{s.subtest_name}: {s.marks_obtained}/{s.max_marks}</span>
                            <span className={s.is_counted ? "text-emerald-700 font-semibold" : "text-amber-700"}>
                              {s.is_counted ? "✓ Counted in average" : `✗ ${s.exclusion_reason}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Past Revision Delta Notice */}
              {explainData.version_changes && explainData.version_changes.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span>Score Adjustment History</span>
                  </div>
                  {explainData.version_changes.map((change, idx) => (
                    <p key={idx} className="text-xs text-emerald-800">{change}</p>
                  ))}
                </div>
              )}

              {/* Total Summary */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Internal Score</span>
                  <div className="text-2xl font-black">{explainData.total_internal_mark.toFixed(1)} / 100.0</div>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 ml-auto mb-1" />
                  <span>100% Calculation Integrity</span>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
              >
                Understood
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 2: "WHAT-IF" REAL-TIME MARK SIMULATOR MODAL */}
      {/* ========================================================================= */}
      {activeModal === 'whatif' && explainData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Sliders className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-black text-white">“What If?” Mark Simulator</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  SIMULATION — NOT OFFICIAL
                </span>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-300 hover:text-white rounded-lg">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              
              <p className="text-xs text-slate-500">
                Adjust hypothetical scores using the sliders to see in real-time how improvements in tests or assignments would affect your final internal score.
              </p>

              {/* Simulation Result Comparison Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Official Internal</span>
                  <div className="text-2xl font-bold">{explainData.total_internal_mark.toFixed(1)}</div>
                </div>

                <ArrowRight className="h-6 w-6 text-slate-500" />

                <div>
                  <span className="text-[10px] text-indigo-300 uppercase font-semibold">Projected Score</span>
                  <div className="text-3xl font-black text-emerald-400">
                    {(simResult ? simResult.projected_internal : explainData.total_internal_mark).toFixed(1)}
                  </div>
                </div>

                {simResult && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Difference</span>
                    <div className={`text-base font-bold ${simResult.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {simResult.difference >= 0 ? `+${simResult.difference.toFixed(1)}` : simResult.difference.toFixed(1)} pts
                    </div>
                  </div>
                )}
              </div>

              {/* Sliders for each component */}
              <div className="space-y-5">
                {explainData.components.map((comp) => {
                  const val = simulatedScores[comp.component_id] ?? comp.obtained_marks;
                  return (
                    <div key={comp.component_id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900">{comp.component_name}</span>
                          <span className="text-[10px] text-slate-500 ml-2">(Max: {comp.max_marks}, Weight: {comp.weightage}%)</span>
                        </div>
                        <span className="text-sm font-extrabold font-mono text-indigo-700">
                          {parseFloat(val).toFixed(1)} / {comp.max_marks}
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max={comp.max_marks}
                        step="0.5"
                        value={val}
                        onChange={(e) => {
                          const updated = { ...simulatedScores, [comp.component_id]: parseFloat(e.target.value) };
                          handleRunSimulation(updated);
                        }}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />

                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>0.0</span>
                        <span>Official: {comp.obtained_marks}</span>
                        <span>{comp.max_marks}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={resetSimulation}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset to Official</span>
              </button>

              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 3: MARKSCOPE TIMELINE MODAL */}
      {/* ========================================================================= */}
      {activeModal === 'timeline' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-black text-white">MarkScope Audit Timeline</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-300 hover:text-white rounded-lg">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <p className="text-xs text-slate-500">
                A transparent, tamper-evident log of every mark event from initial spreadsheet upload to final lock.
              </p>

              <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timelineData.map((ev) => (
                  <div key={ev.id} className="relative">
                    <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full bg-indigo-600 border-2 border-white shadow-sm"></div>
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">{ev.formatted_date}</span>
                        {ev.delta && (
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            ev.delta.startsWith('+') ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {ev.delta}
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-bold text-slate-900">{ev.title}</h5>
                      <p className="text-xs text-slate-600">{ev.description}</p>
                      <span className="text-[10px] text-slate-400 block pt-1">Action logged by: {ev.actor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 4: MARK DNA PROFILE MODAL */}
      {/* ========================================================================= */}
      {activeModal === 'dna' && dnaData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Dna className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-black text-white">Your Mark DNA Profile</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-300 hover:text-white rounded-lg">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <p className="text-xs text-slate-500">
                A non-competitive visual analysis of your score composition, strength areas, and potential growth headroom.
              </p>

              {/* Key Insights Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 block">Strongest Component</span>
                  <span className="text-base font-extrabold text-slate-900">{dnaData.strongest_component}</span>
                  <span className="text-[11px] text-slate-500 block">({dnaData.strongest_points}% scored)</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Largest Contribution</span>
                  <span className="text-base font-extrabold text-slate-900">{dnaData.largest_contribution_component}</span>
                  <span className="text-[11px] text-slate-500 block">({dnaData.largest_contribution_points} pts)</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">Growth Headroom</span>
                  <span className="text-base font-extrabold text-slate-900">{dnaData.headroom_component}</span>
                  <span className="text-[11px] text-slate-500 block">(+{dnaData.headroom_points} possible pts)</span>
                </div>
              </div>

              {/* Component DNA share bars */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Internal Score Composition</h5>
                {dnaData.slices.map((slice) => (
                  <div key={slice.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{slice.name}</span>
                      <span className="text-indigo-600 font-mono">{slice.share_percentage}% of total score</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                      <div 
                        className="bg-indigo-600 h-3 rounded-full" 
                        style={{ width: `${slice.share_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FEATURE 5: STUDENT DISPUTE / REVALUATION REQUEST MODAL */}
      {/* ========================================================================= */}
      {activeModal === 'dispute' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden flex flex-col">
            
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Marks Review / Dispute Request</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 text-slate-300 hover:text-white rounded-lg">✕</button>
            </div>

            <form onSubmit={handleSubmitDispute} className="p-6 space-y-4">
              
              {disputeSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  {disputeSuccessMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment Component</label>
                <select
                  value={disputeComponentId}
                  onChange={(e) => setDisputeComponentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {explainData?.components.map(c => (
                    <option key={c.component_id} value={c.component_id}>
                      {c.component_name} (Current: {c.obtained_marks}/{c.max_marks})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Revaluation</label>
                <textarea
                  rows="4"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="e.g. I believe the uploaded score does not match my evaluated lab paper sheet. Question 3 graph traversal was marked full."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                ></textarea>
                <p className="text-[11px] text-slate-400 mt-1">
                  Students cannot directly edit marks. This will generate a formal ticket for Faculty/HOD re-evaluation.
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
                >
                  Submit Ticket
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

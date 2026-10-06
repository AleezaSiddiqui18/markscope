import React, { useState, useEffect } from 'react';
import { 
  Radar, 
  Activity, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  FileSpreadsheet, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Users, 
  Search, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { analyticsAPI, courseAPI, marksAPI } from '../api';

export default function HODDashboard({ user }) {
  const [healthData, setHealthData] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [courses, setCourses] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('radar'); // 'radar' | 'health' | 'courses' | 'audit'
  const [isLoading, setIsLoading] = useState(true);

  // Selected anomaly details modal
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);

  // Unlock Course Modal
  const [unlockingCourse, setUnlockingCourse] = useState(null);
  const [unlockReason, setUnlockReason] = useState('Authorized by Academic Examination Board for re-evaluation');

  useEffect(() => {
    loadHODData();
  }, []);

  const loadHODData = async () => {
    setIsLoading(true);
    try {
      const [health, anomList, courseList, logs] = await Promise.all([
        analyticsAPI.getHealth(),
        analyticsAPI.getAnomalies(),
        courseAPI.list(),
        analyticsAPI.getAuditLogs(30)
      ]);
      setHealthData(health);
      setAnomalies(anomList);
      setCourses(courseList);
      setAuditLogs(logs);
    } catch (err) {
      console.error("Error loading HOD dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockCourse = async (e) => {
    e.preventDefault();
    if (!unlockingCourse || !unlockReason.trim()) return;

    try {
      await courseAPI.unlock(unlockingCourse.id, unlockReason.trim());
      alert(`Course ${unlockingCourse.code} has been securely unlocked for revision.`);
      setUnlockingCourse(null);
      setUnlockReason('');
      loadHODData();
    } catch (err) {
      alert("Failed to unlock course: " + err.message);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'HIGH':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-500">Scanning institutional assessment integrity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
            Institutional Examination Oversight
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Academic Assessment Health & Oversight
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            HOD: <span className="font-semibold text-slate-800">{user.full_name}</span> • {user.department}
          </p>
        </div>

        <button
          onClick={loadHODData}
          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          <span>Refresh Scan</span>
        </button>
      </div>

      {/* FEATURE 8: ASSESSMENT HEALTH / DATA QUALITY DASHBOARD */}
      {healthData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data Completeness</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">{healthData.data_completeness_pct}%</div>
            <span className="text-[10px] text-slate-400">Student marks present</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calculation Integrity</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{healthData.calculation_integrity_pct}%</div>
            <span className="text-[10px] text-slate-400">Reproducible math</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unresolved Conflicts</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{healthData.unresolved_conflicts}</div>
            <span className="text-[10px] text-slate-400">File discrepancies</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Missing Marks</span>
            <div className="text-2xl font-black text-rose-600 mt-1">{healthData.missing_marks_count}</div>
            <span className="text-[10px] text-slate-400">Enrolled records null</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Locked Records</span>
            <div className="text-2xl font-black text-purple-600 mt-1">{healthData.locked_records_pct}%</div>
            <span className="text-[10px] text-slate-400">Tamper-protected</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Reviews</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{healthData.pending_reviews_count}</div>
            <span className="text-[10px] text-slate-400">Student disputes</span>
          </div>

        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('radar')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'radar' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radar className="h-4 w-4" />
          <span>Anomaly Radar ({anomalies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'courses' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Course Lock / Unlock Control</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'audit' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Global Institutional Audit Log</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 4: ANOMALY RADAR */}
      {/* ========================================================================= */}
      {activeTab === 'radar' && (
        <div className="space-y-4">
          
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Institutional Anomaly Radar</h3>
              <p className="text-xs text-slate-500">
                Automated scanning detects statistical inconsistencies, missing marks, score jumps, and weightage discrepancies using objective quality-control language.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              {anomalies.length} Flagged Observations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalies.map((anom) => (
              <div
                key={anom.id}
                onClick={() => setSelectedAnomaly(anom)}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border uppercase font-extrabold ${getSeverityBadge(anom.severity)}`}>
                      {anom.severity} PRIORITY
                    </span>
                    <span className="text-xs font-bold text-slate-700 font-mono">{anom.course_code}</span>
                  </div>
                  <span className="text-[11px] text-purple-600 font-semibold hover:underline flex items-center">
                    Inspect <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{anom.rule_type.replace(/_/g, ' ')}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{anom.description}</p>
                </div>

                {anom.student_roll_no && (
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                    <span>Student: {anom.student_name}</span>
                    <span className="font-mono font-bold text-slate-700">{anom.student_roll_no}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Anomaly Inspection Modal */}
          {selectedAnomaly && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border uppercase font-extrabold ${getSeverityBadge(selectedAnomaly.severity)}`}>
                      {selectedAnomaly.severity} PRIORITY
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-2">
                      Anomaly Explanation: {selectedAnomaly.rule_type.replace(/_/g, ' ')}
                    </h3>
                  </div>
                  <button onClick={() => setSelectedAnomaly(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <p className="font-semibold text-slate-800">{selectedAnomaly.description}</p>
                  <p className="text-slate-500 leading-relaxed">
                    MarkScope flagged this record using academic quality-assurance heuristics. Review is recommended before finalizing the consolidated gazette.
                  </p>
                </div>

                {selectedAnomaly.details && (
                  <div className="p-3 rounded-xl bg-slate-100 text-xs font-mono text-slate-700 overflow-x-auto">
                    <pre>{JSON.stringify(selectedAnomaly.details, null, 2)}</pre>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedAnomaly(null)}
                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
                  >
                    Acknowledge & Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COURSE LOCK / UNLOCK CONTROL */}
      {/* ========================================================================= */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Course Lock & Tamper Oversight</h3>
              <p className="text-xs text-slate-500">
                Only the HOD can authorize course unlocking after official mark submission. Every unlock event creates a permanent audit entry.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courses.map(course => (
              <div key={course.id} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-800">{course.code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                      course.is_locked ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {course.status}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">{course.name}</h4>
                  <p className="text-xs text-slate-500">Faculty: {course.faculty_name}</p>
                  <p className="text-xs text-slate-500">Enrolled Students: {course.enrolled_count}</p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  {course.is_locked ? (
                    <button
                      onClick={() => setUnlockingCourse(course)}
                      className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      <span>Unlock Course (HOD Authorization)</span>
                    </button>
                  ) : (
                    <div className="text-center py-2 text-xs font-semibold text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      Editable by Course Faculty
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Unlock Modal */}
          {unlockingCourse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Unlock className="h-5 w-5 text-purple-600" />
                  <h3 className="text-base font-bold text-slate-900">Authorize Course Unlock</h3>
                </div>

                <p className="text-xs text-slate-600">
                  You are unlocking <strong>{unlockingCourse.name} ({unlockingCourse.code})</strong>. An administrative reason must be recorded in the institutional audit log.
                </p>

                <form onSubmit={handleUnlockCourse} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Reason</label>
                    <textarea
                      rows="3"
                      required
                      value={unlockReason}
                      onChange={(e) => setUnlockReason(e.target.value)}
                      placeholder="e.g. Authorized by Academic Examination Board for re-evaluation"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    ></textarea>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setUnlockingCourse(null)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-sm"
                    >
                      Confirm Unlock
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GLOBAL INSTITUTIONAL AUDIT LOG */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Global Academic Audit Log</h3>
              <p className="text-xs text-slate-500">Master record of all creation, upload, lock, unlock, and resolution events across all college courses.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Initiated By</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{log.formatted_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {log.user_name} <span className="text-[10px] text-slate-400">({log.user_role})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{log.entity_type} #{log.entity_id}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

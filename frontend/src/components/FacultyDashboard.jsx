import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Search, 
  Download, 
  ArrowUpDown, 
  History, 
  Layers, 
  ShieldAlert, 
  Edit3, 
  Save, 
  Check, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import { courseAPI, marksAPI, excelAPI, disputeAPI } from '../api';

export default function FacultyDashboard({ user, initialTab }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'marksheet'); // 'marksheet' | 'entry' | 'excel' | 'conflicts' | 'history' | 'disputes' | 'setup'
  
  const [marksheetData, setMarksheetData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [conflictsData, setConflictsData] = useState([]);
  const [disputesData, setDisputesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Marks Entry state
  const [manualMarks, setManualMarks] = useState({});
  const [manualReasons, setManualReasons] = useState({});
  const [entryStatusMsg, setEntryStatusMsg] = useState(null);
  const [selectedComponentId, setSelectedComponentId] = useState(null);

  // Smart Excel Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCompId, setUploadCompId] = useState('');
  const [uploadSubtest, setUploadSubtest] = useState('Default');
  const [previewData, setPreviewData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Course Setup Modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newComponents, setNewComponents] = useState([
    { name: "Tests", type: "TEST", max_marks: 50, weightage: 40, is_best_of_n: true, best_of_n_count: 2, total_subtests: 3 },
    { name: "Assignments", type: "ASSIGNMENT", max_marks: 20, weightage: 20, is_best_of_n: false, best_of_n_count: 1, total_subtests: 1 },
    { name: "Lab", type: "LAB", max_marks: 30, weightage: 40, is_best_of_n: false, best_of_n_count: 1, total_subtests: 1 },
  ]);

  // Conflict Resolution dialog
  const [resolvingConflict, setResolvingConflict] = useState(null);
  const [conflictReason, setConflictReason] = useState('Verified with official answer script');

  // Dispute resolution dialog
  const [resolvingDispute, setResolvingDispute] = useState(null);
  const [disputeResponse, setDisputeResponse] = useState('');
  const [disputeNewMark, setDisputeNewMark] = useState('');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseData(selectedCourseId);
    }
  }, [selectedCourseId, activeTab]);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const data = await courseAPI.list();
      setCourses(data);
      if (data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } catch (err) {
      console.error("Error loading courses:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseData = async (courseId) => {
    try {
      const [marksheet, conflicts, history, disputes] = await Promise.all([
        marksAPI.getConsolidated(courseId),
        excelAPI.getConflicts(courseId),
        marksAPI.getHistory(courseId),
        disputeAPI.list()
      ]);
      setMarksheetData(marksheet);
      setConflictsData(conflicts);
      setHistoryData(history);
      setDisputesData(disputes.filter(d => d.course_id === courseId));

      if (marksheet.components && marksheet.components.length > 0) {
        if (!selectedComponentId) setSelectedComponentId(marksheet.components[0].id);
        if (!uploadCompId) setUploadCompId(marksheet.components[0].id);
      }

      // Populate manual entry state
      const initialMarks = {};
      marksheet.rows.forEach(r => {
        Object.entries(r.component_marks).forEach(([cName, cVal]) => {
          initialMarks[`${r.student_id}-${cName}`] = cVal.obtained;
        });
      });
      setManualMarks(initialMarks);

    } catch (err) {
      console.error("Failed to load course details:", err);
    }
  };

  const currentCourse = courses.find(c => c.id === selectedCourseId) || marksheetData;

  const handleLockCourse = async () => {
    if (!window.confirm(`Are you sure you want to lock ${currentCourse.code}? Once locked, faculty cannot modify marks without administrative HOD approval.`)) {
      return;
    }
    try {
      await courseAPI.lock(selectedCourseId);
      alert("Course marksheet locked successfully.");
      loadCourses();
      loadCourseData(selectedCourseId);
    } catch (err) {
      alert("Failed to lock course: " + err.message);
    }
  };

  const handleSaveManualMark = async (studentId, componentId, subtestName, val) => {
    const reason = manualReasons[studentId] || "Direct faculty update";
    try {
      await marksAPI.saveEntry(selectedCourseId, [
        {
          student_id: studentId,
          component_id: componentId,
          subtest_name: subtestName,
          marks_obtained: parseFloat(val),
          reason
        }
      ]);
      setEntryStatusMsg(`Updated mark for student ${studentId}.`);
      setTimeout(() => setEntryStatusMsg(null), 3000);
      loadCourseData(selectedCourseId);
    } catch (err) {
      alert("Error saving mark: " + err.message);
    }
  };

  const handlePreviewExcel = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadCompId) return;

    setIsUploading(true);
    setPreviewData(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("component_id", uploadCompId);
    formData.append("subtest_name", uploadSubtest);

    try {
      const preview = await excelAPI.preview(selectedCourseId, formData);
      setPreviewData(preview);
    } catch (err) {
      alert("Spreadsheet preview failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !uploadCompId) return;
    try {
      const res = await excelAPI.confirm(selectedCourseId, uploadCompId, uploadSubtest, previewData);
      setImportResult(res);
      setPreviewData(null);
      setUploadFile(null);
      loadCourseData(selectedCourseId);
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  };

  const handleResolveConflict = async (action) => {
    if (!resolvingConflict) return;
    try {
      await excelAPI.resolveConflict(
        selectedCourseId,
        resolvingConflict.id,
        action,
        conflictReason
      );
      setResolvingConflict(null);
      loadCourseData(selectedCourseId);
      alert(`Conflict marked as ${action === 'KEEP' ? 'Official Mark Kept' : 'Overwritten with New Mark'}`);
    } catch (err) {
      alert("Failed to resolve conflict: " + err.message);
    }
  };

  const handleResolveDispute = async (status) => {
    if (!resolvingDispute) return;
    try {
      await disputeAPI.resolve(
        resolvingDispute.ticket_no,
        status,
        disputeResponse || "Reviewed by faculty",
        disputeNewMark ? parseFloat(disputeNewMark) : null
      );
      setResolvingDispute(null);
      setDisputeResponse('');
      setDisputeNewMark('');
      loadCourseData(selectedCourseId);
      alert(`Ticket #${resolvingDispute.ticket_no} updated to ${status}.`);
    } catch (err) {
      alert("Failed to update ticket: " + err.message);
    }
  };

  const handleExportCSV = async () => {
    const res = await marksAPI.exportCSV(selectedCourseId);
    if (res.isBlob) {
      const url = window.URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marksheet_${currentCourse?.code}.csv`;
      a.click();
    }
  };

  const handleExportExcel = async () => {
    const res = await marksAPI.exportExcel(selectedCourseId);
    if (res.isBlob) {
      const url = window.URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marksheet_${currentCourse?.code}.xlsx`;
      a.click();
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const totalWeight = newComponents.reduce((sum, c) => sum + parseFloat(c.weightage || 0), 0);
    if (Math.abs(totalWeight - 100.0) > 0.01) {
      alert(`Total component weightage must equal exactly 100%. Current sum: ${totalWeight}%`);
      return;
    }
    try {
      const res = await courseAPI.create({
        code: newCourseCode.trim(),
        name: newCourseName.trim(),
        semester: 5,
        academic_year: "2026-2027",
        components: newComponents
      });
      alert(`Course ${res.code} created successfully!`);
      setShowCourseModal(false);
      loadCourses();
    } catch (err) {
      alert("Failed to create course: " + err.message);
    }
  };

  // Filter rows by search
  const filteredRows = marksheetData?.rows.filter(r => 
    r.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header & Course Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              Faculty Administration
            </span>
            {currentCourse?.is_locked && (
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 flex items-center space-x-1">
                <Lock className="h-3 w-3" />
                <span>Locked Course</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {currentCourse?.name || "Course Marksheet"}
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Course Code: <span className="font-semibold text-slate-800">{currentCourse?.code}</span> • Instructor: {user.full_name}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Course Dropdown */}
          <select
            value={selectedCourseId || ''}
            onChange={(e) => setSelectedCourseId(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.code}: {c.name} {c.is_locked ? "🔒" : ""}
              </option>
            ))}
          </select>

          {/* New Course Button */}
          <button
            onClick={() => setShowCourseModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {[
          { id: 'marksheet', label: 'Consolidated Marksheet', count: null },
          { id: 'entry', label: 'Manual Entry', count: null },
          { id: 'excel', label: 'Smart Excel Import', count: null },
          { id: 'conflicts', label: 'Conflict Detector', count: conflictsData.length, badgeColor: 'bg-amber-100 text-amber-800' },
          { id: 'history', label: 'Version Audit History', count: historyData.length, badgeColor: 'bg-slate-100 text-slate-700' },
          { id: 'disputes', label: 'Review Requests', count: disputesData.length, badgeColor: 'bg-indigo-100 text-indigo-800' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${tab.badgeColor}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONSOLIDATED MARKSHEET */}
      {/* ========================================================================= */}
      {activeTab === 'marksheet' && marksheetData && (
        <div className="space-y-4">
          
          {/* Actions & Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            
            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Roll No or Student Name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Class Stats */}
            <div className="flex items-center space-x-4 text-xs font-mono">
              <span className="text-slate-500">Students: <strong className="text-slate-800">{marksheetData.total_students}</strong></span>
              <span className="text-slate-500">Class Avg: <strong className="text-indigo-600">{marksheetData.class_average.toFixed(1)}/100</strong></span>
              <span className="text-slate-500">Highest: <strong className="text-emerald-600">{marksheetData.highest_score.toFixed(1)}</strong></span>
            </div>

            {/* Export & Lock Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>CSV</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>

              {!marksheetData.is_locked ? (
                <button
                  onClick={handleLockCourse}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
                  title="Lock course to prevent accidental edits"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Lock Marksheet</span>
                </button>
              ) : (
                <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Locked</span>
                </span>
              )}
            </div>

          </div>

          {/* Consolidated Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  {marksheetData.components.map(comp => (
                    <th key={comp.id} className="py-3 px-3 text-center border-l border-slate-200">
                      <div>{comp.name}</div>
                      <span className="text-[10px] text-slate-400 font-normal">Max {comp.max_marks} ({comp.weightage}%)</span>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right border-l-2 border-slate-300 bg-indigo-50/40 text-indigo-900 font-extrabold">
                    Final Internal (/100)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRows.map((row) => (
                  <tr key={row.student_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{row.roll_no}</td>
                    <td className="py-3 px-4 text-slate-900">{row.student_name}</td>
                    
                    {marksheetData.components.map(comp => {
                      const cData = row.component_marks[comp.name];
                      return (
                        <td key={comp.id} className="py-3 px-3 text-center border-l border-slate-100">
                          {cData ? (
                            <div>
                              <div className="font-mono text-slate-800">{cData.obtained} <span className="text-[10px] text-slate-400">/ {cData.max}</span></div>
                              <div className="text-[10px] font-bold text-indigo-600 font-mono">+{cData.weighted.toFixed(1)} pts</div>
                            </div>
                          ) : (
                            <span className="text-amber-500 font-bold text-xs">Missing</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3 px-4 text-right border-l-2 border-slate-200 bg-indigo-50/20 font-mono font-black text-sm text-indigo-950">
                      {row.final_internal_mark.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MANUAL ENTRY */}
      {/* ========================================================================= */}
      {activeTab === 'entry' && marksheetData && (
        <div className="space-y-4">
          
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Direct Manual Mark Entry</h3>
              <p className="text-xs text-slate-500">Edit scores directly in table. Every modification automatically logs an audit version.</p>
            </div>

            {marksheetData.is_locked && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
                <Lock className="h-4 w-4" />
                <span>Course is locked. Marks cannot be edited.</span>
              </div>
            )}
          </div>

          {entryStatusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              ✓ {entryStatusMsg}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  {marksheetData.components.map(comp => (
                    <th key={comp.id} className="py-3 px-3 text-center border-l border-slate-200">
                      {comp.name} (Max {comp.max_marks})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marksheetData.rows.map(row => (
                  <tr key={row.student_id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{row.roll_no}</td>
                    <td className="py-3 px-4 text-slate-900">{row.student_name}</td>

                    {marksheetData.components.map(comp => {
                      const key = `${row.student_id}-${comp.name}`;
                      const currentVal = manualMarks[key] !== undefined ? manualMarks[key] : (row.component_marks[comp.name]?.obtained || 0);

                      return (
                        <td key={comp.id} className="py-2.5 px-3 text-center border-l border-slate-100">
                          <div className="inline-flex items-center space-x-1.5">
                            <input
                              type="number"
                              min="0"
                              max={comp.max_marks}
                              step="0.5"
                              disabled={marksheetData.is_locked}
                              value={currentVal}
                              onChange={(e) => {
                                setManualMarks({ ...manualMarks, [key]: e.target.value });
                              }}
                              className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                            />
                            <button
                              disabled={marksheetData.is_locked}
                              onClick={() => handleSaveManualMark(row.student_id, comp.id, "Test 1", currentVal)}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30"
                              title="Save mark to audit version"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SMART EXCEL IMPORT */}
      {/* ========================================================================= */}
      {activeTab === 'excel' && marksheetData && (
        <div className="space-y-6">
          
          {/* Upload Form Box */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Smart Excel / CSV Bulk Merge</h3>
              <p className="text-xs text-slate-500">
                Upload spreadsheets like <code className="font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">test_marks.xlsx</code>.
                MarkScope automatically identifies student identifiers (Roll No, USN, Enrollment No) and score headers.
              </p>
            </div>

            <form onSubmit={handlePreviewExcel} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Component</label>
                <select
                  value={uploadCompId}
                  onChange={(e) => setUploadCompId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800"
                >
                  {marksheetData.components.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Max {c.max_marks})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subtest / Assessment Label</label>
                <input
                  type="text"
                  value={uploadSubtest}
                  onChange={(e) => setUploadSubtest(e.target.value)}
                  placeholder="e.g. Test 1, Assignment 1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Spreadsheet File (.xlsx, .csv)</label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading || marksheetData.is_locked}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{isUploading ? "Analyzing..." : "Analyze Spreadsheet"}</span>
                </button>
              </div>

            </form>
          </div>

          {/* Success Banner */}
          {importResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span className="font-bold">{importResult.message}</span>
              </div>
              <button onClick={() => setImportResult(null)} className="text-emerald-700 font-bold hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Smart Import Preview Card */}
          {previewData && (
            <div className="p-6 rounded-2xl bg-white border border-indigo-200 shadow-xl space-y-4 animate-in fade-in duration-150">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-base font-bold text-slate-900">Smart Import Preview</h4>
                  </div>
                  <p className="text-xs text-slate-500">File: {previewData.filename}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewData(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-colors"
                  >
                    Confirm & Apply Import ({previewData.matched_count} Valid)
                  </button>
                </div>
              </div>

              {/* Detected Column Mapping */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Detected Roll No Column</span>
                  <span className="font-bold font-mono text-indigo-700">{previewData.detected_columns.student_identifier}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Detected Name Column</span>
                  <span className="font-bold font-mono text-slate-800">{previewData.detected_columns.student_name || "None (Optional)"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Detected Marks Column</span>
                  <span className="font-bold font-mono text-indigo-700">{previewData.detected_columns.marks}</span>
                </div>
              </div>

              {/* Stats Badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  ✓ {previewData.matched_count} Matched
                </span>
                {previewData.conflict_count > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">
                    ⚠ {previewData.conflict_count} Conflicts (Requires Faculty Review)
                  </span>
                )}
                {previewData.unmatched_count > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold">
                    ✕ {previewData.unmatched_count} Unmatched Students
                  </span>
                )}
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Excel Row</th>
                      <th className="py-2 px-3">Student ID</th>
                      <th className="py-2 px-3">Candidate</th>
                      <th className="py-2 px-3">Incoming Mark</th>
                      <th className="py-2 px-3">Existing Mark</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.rows.map((r, idx) => (
                      <tr key={idx} className={r.status === 'CONFLICT' ? 'bg-amber-50/50' : (r.status === 'INVALID' ? 'bg-rose-50/50' : '')}>
                        <td className="py-2 px-3 font-mono text-slate-500">#{r.row_index}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{r.roll_no}</td>
                        <td className="py-2 px-3 text-slate-700">{r.name}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.incoming_mark}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{r.existing_mark !== null ? r.existing_mark : "-"}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'NEW' || r.status === 'IDENTICAL' ? 'bg-emerald-100 text-emerald-800' :
                            r.status === 'CONFLICT' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {r.status} {r.error ? `(${r.error})` : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONFLICT DETECTOR */}
      {/* ========================================================================= */}
      {activeTab === 'conflicts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Spreadsheet Conflict Detector</h3>
              <p className="text-xs text-slate-500">
                When two Excel uploads contain differing marks for the same student, MarkScope halts automatic overwriting and requests explicit faculty decision.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {conflictsData.length} Unresolved Conflicts
            </span>
          </div>

          {conflictsData.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              ✓ No pending mark conflicts for this course. All imported files are consistent.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conflictsData.map(c => (
                <div key={c.id} className="p-5 rounded-2xl bg-white border border-amber-200 shadow-md space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ⚠ Mark Conflict Detected
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{c.student_name} ({c.student_roll_no})</h4>
                      <p className="text-xs text-slate-500">Component: {c.component_name} ({c.subtest_name})</p>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Source: {c.source_file}</span>
                  </div>

                  {/* Comparison Box */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-500 block">Existing Official Mark</span>
                      <span className="text-xl font-black text-slate-900 font-mono">{c.existing_mark} / {c.max_marks}</span>
                    </div>

                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-[10px] font-semibold text-amber-700 block">Uploaded New Mark</span>
                      <span className="text-xl font-black text-amber-900 font-mono">{c.incoming_mark} / {c.max_marks}</span>
                    </div>
                  </div>

                  {/* Resolution Buttons */}
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => setResolvingConflict(c)}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-colors text-center"
                    >
                      Resolve Conflict
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Conflict Resolution Modal */}
          {resolvingConflict && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900">Resolve Mark Conflict</h3>
                </div>

                <p className="text-xs text-slate-600">
                  Select which score should be accepted for <strong>{resolvingConflict.student_name} ({resolvingConflict.student_roll_no})</strong>.
                </p>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div>Existing: <strong className="font-mono">{resolvingConflict.existing_mark}</strong></div>
                  <div>Incoming from '{resolvingConflict.source_file}': <strong className="font-mono text-amber-700">{resolvingConflict.incoming_mark}</strong></div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Resolution Reason</label>
                  <input
                    type="text"
                    value={conflictReason}
                    onChange={(e) => setConflictReason(e.target.value)}
                    placeholder="e.g. Verified with physical paper sheet"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleResolveConflict("KEEP")}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-xs text-slate-700 transition-colors"
                  >
                    Keep Existing ({resolvingConflict.existing_mark})
                  </button>
                  <button
                    onClick={() => handleResolveConflict("OVERWRITE")}
                    className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-sm transition-colors"
                  >
                    Accept New ({resolvingConflict.incoming_mark})
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AUDIT LOG HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Mark Revision & Audit Trail</h3>
              <p className="text-xs text-slate-500">Every score change is immutably recorded with timestamp, author, previous and new scores, and rationale.</p>
            </div>
            <span className="text-xs font-bold font-mono text-slate-600">{historyData.length} Total Versions Logged</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Component</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Change Delta</th>
                  <th className="py-3 px-4">Changed By</th>
                  <th className="py-3 px-4">Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyData.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{v.formatted_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{v.student_name} ({v.roll_no})</td>
                    <td className="py-3 px-4 text-slate-600">{v.component_name} ({v.subtest_name})</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">v{v.version_number}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {v.previous_marks !== null ? (
                        <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {v.previous_marks} → {v.marks_obtained}
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Initial: {v.marks_obtained}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800">{v.changed_by}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{v.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REVIEW REQUESTS / DISPUTES */}
      {/* ========================================================================= */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Revaluation Requests</h3>
              <p className="text-xs text-slate-500">Formally submitted student inquiries regarding their component marks.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {disputesData.length} Tickets
            </span>
          </div>

          {disputesData.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              No active dispute tickets filed for this course.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {disputesData.map(d => (
                <div key={d.ticket_no} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        Ticket #{d.ticket_no}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{d.student_name} ({d.student_roll_no})</h4>
                      <p className="text-xs text-slate-500">Component: {d.component_name} (Current Mark: {d.current_mark})</p>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                      d.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      d.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Student Statement</span>
                    "{d.student_reason}"
                  </div>

                  {d.faculty_response && (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-0.5">Faculty Response</span>
                      {d.faculty_response}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => setResolvingDispute(d)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                    >
                      Respond & Resolve Ticket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolve Dispute Modal */}
          {resolvingDispute && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  Respond to Ticket #{resolvingDispute.ticket_no}
                </h3>
                <p className="text-xs text-slate-500">
                  Student: {resolvingDispute.student_name} ({resolvingDispute.student_roll_no})
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty Remarks</label>
                  <textarea
                    rows="3"
                    value={disputeResponse}
                    onChange={(e) => setDisputeResponse(e.target.value)}
                    placeholder="e.g. Paper re-evaluated with lab instructor. Adjusted Question 3 traversal marks."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Revised Mark (Leave blank if keeping {resolvingDispute.current_mark})</label>
                  <input
                    type="number"
                    step="0.5"
                    value={disputeNewMark}
                    onChange={(e) => setDisputeNewMark(e.target.value)}
                    placeholder={`e.g. ${resolvingDispute.current_mark + 2}`}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setResolvingDispute(null)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResolveDispute("RESOLVED")}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm"
                  >
                    Resolve & Update
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* COURSE SETUP MODAL */}
      {/* ========================================================================= */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create New Course & Components</h3>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 overflow-y-auto space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder="e.g. CS302"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Name</label>
                  <input
                    type="text"
                    required
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="e.g. Operating Systems"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Assessment Components</label>
                  <span className={`text-xs font-mono font-bold ${
                    newComponents.reduce((sum, c) => sum + parseFloat(c.weightage || 0), 0) === 100 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    Total: {newComponents.reduce((sum, c) => sum + parseFloat(c.weightage || 0), 0)}% / 100%
                  </span>
                </div>

                <div className="space-y-3">
                  {newComponents.map((comp, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-4 gap-2 items-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Name</span>
                        <input
                          type="text"
                          value={comp.name}
                          onChange={(e) => {
                            const updated = [...newComponents];
                            updated[idx].name = e.target.value;
                            setNewComponents(updated);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Max Marks</span>
                        <input
                          type="number"
                          value={comp.max_marks}
                          onChange={(e) => {
                            const updated = [...newComponents];
                            updated[idx].max_marks = parseFloat(e.target.value);
                            setNewComponents(updated);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Weightage %</span>
                        <input
                          type="number"
                          value={comp.weightage}
                          onChange={(e) => {
                            const updated = [...newComponents];
                            updated[idx].weightage = parseFloat(e.target.value);
                            setNewComponents(updated);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-indigo-700"
                        />
                      </div>

                      <div className="flex items-center space-x-1 pt-3">
                        <label className="flex items-center space-x-1 text-[11px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={comp.is_best_of_n}
                            onChange={(e) => {
                              const updated = [...newComponents];
                              updated[idx].is_best_of_n = e.target.checked;
                              setNewComponents(updated);
                            }}
                          />
                          <span>Best of N</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-colors"
                >
                  Save Course
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

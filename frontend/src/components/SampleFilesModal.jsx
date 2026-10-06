import React from 'react';
import { X, FileSpreadsheet, Download, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { excelAPI } from '../api';

export default function SampleFilesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleDownload = async (fileType, defaultFilename) => {
    try {
      const res = await excelAPI.downloadSample(fileType);
      if (res.isBlob) {
        const url = window.URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      alert("Failed to download file: " + err.message);
    }
  };

  const sampleFiles = [
    {
      type: "test_master",
      title: "DataStructures_Test1_Master.xlsx",
      desc: "Standard test marksheet with headers 'Roll No' and 'Test Score'. Perfect for initial batch upload test.",
      tag: "Normal Upload",
      tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
    },
    {
      type: "conflict_sample",
      title: "Test1_Rechecked_Conflict_Demo.xlsx",
      desc: "Contains a conflicting mark for student A102 (46.5 vs official 40.0). Demonstrates MarkScope's Conflict Detector.",
      tag: "Conflict Testing",
      tagColor: "bg-amber-50 text-amber-700 border-amber-200"
    },
    {
      type: "assignments",
      title: "DataStructures_Assignments.xlsx",
      desc: "Demonstrates alternate headers 'Enrollment Number' and 'Assignment Score' with student A105 missing a score.",
      tag: "Smart Headers + Missing",
      tagColor: "bg-blue-50 text-blue-700 border-blue-200"
    },
    {
      type: "lab",
      title: "DataStructures_Lab_Final.xlsx",
      desc: "Demonstrates college USN headers 'USN' and 'Lab Marks' with 100% matched records.",
      tag: "USN Header Matching",
      tagColor: "bg-purple-50 text-purple-700 border-purple-200"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Pre-Configured Test Spreadsheets</h3>
              <p className="text-xs text-slate-500">Download realistic Excel files to test Smart Import, Column Mapping & Conflict Detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Files List */}
        <div className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto">
          {sampleFiles.map((file) => (
            <div
              key={file.type}
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-semibold text-slate-800">{file.title}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${file.tagColor}`}>
                    {file.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-500 max-w-md">{file.desc}</p>
              </div>

              <button
                onClick={() => handleDownload(file.type, file.title)}
                className="flex-shrink-0 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-indigo-600 transition-colors shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .xlsx</span>
              </button>
            </div>
          ))}

          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start space-x-2.5">
            <Info className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-900 leading-relaxed">
              These spreadsheets are also saved locally at <code className="px-1.5 py-0.5 bg-white rounded border border-indigo-200 text-indigo-800 font-mono text-[11px]">sample_files/</code>. You can drag and drop them directly onto the Smart Excel Import tab!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

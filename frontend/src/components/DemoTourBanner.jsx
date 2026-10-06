import React, { useState } from 'react';
import { 
  Compass, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export default function DemoTourBanner({ 
  onClose, 
  onDemoSwitch, 
  onNavigateTab, 
  onOpenExplain,
  onOpenWhatIf,
  onOpenTimeline
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isMinimized, setIsMinimized] = useState(false);

  const steps = [
    {
      step: 1,
      title: "Step 1: Smart Excel Import & Column Detection",
      role: "faculty1",
      roleName: "Prof. Rajesh Kumar (Faculty)",
      description: "Upload sample test scores. Notice how MarkScope automatically recognizes 'Roll No' and 'Test Score' without requiring rigid formatting.",
      actionLabel: "Switch to Faculty & Go to Import",
      action: () => {
        onDemoSwitch("faculty1");
        onNavigateTab("excel");
      }
    },
    {
      step: 2,
      title: "Step 2: Conflict Detector & Diff Inspection",
      role: "faculty1",
      roleName: "Prof. Rajesh Kumar (Faculty)",
      description: "Notice student A102 has an active mark conflict (Official: 40/50 vs Uploaded: 45/50). MarkScope never silently overwrites data.",
      actionLabel: "View Pending Conflicts",
      action: () => {
        onDemoSwitch("faculty1");
        onNavigateTab("conflicts");
      }
    },
    {
      step: 3,
      title: "Step 3: Resolve Conflict with Audit Log",
      role: "faculty1",
      roleName: "Prof. Rajesh Kumar (Faculty)",
      description: "Faculty can 'Keep Official' or 'Accept Incoming' with a mandatory audit reason. Let's inspect the resolution dialog.",
      actionLabel: "Inspect Conflict Resolution",
      action: () => {
        onDemoSwitch("faculty1");
        onNavigateTab("conflicts");
      }
    },
    {
      step: 4,
      title: "Step 4: Consolidated Marksheet & Weighted Math",
      role: "faculty1",
      roleName: "Prof. Rajesh Kumar (Faculty)",
      description: "View the real-time calculated internal scores, class averages, component distributions, and export to CSV/Excel.",
      actionLabel: "Open Consolidated Marksheet",
      action: () => {
        onDemoSwitch("faculty1");
        onNavigateTab("marksheet");
      }
    },
    {
      step: 5,
      title: "Step 5: Assessment Health & Anomaly Radar",
      role: "hod",
      roleName: "Dr. Arvind Sharma (HOD)",
      description: "Switch to HOD to review Academic Health, completeness metrics, and flagged anomalies like missing marks for A105.",
      actionLabel: "Switch to HOD & View Radar",
      action: () => {
        onDemoSwitch("hod");
        onNavigateTab("radar");
      }
    },
    {
      step: 6,
      title: "Step 6: Mark Locking & Tamper Protection",
      role: "hod",
      roleName: "Dr. Arvind Sharma (HOD)",
      description: "Once locked, faculty cannot modify marks. Notice Course CS101 is locked, and only HOD can unlock with a recorded reason.",
      actionLabel: "View Course Lock Status",
      action: () => {
        onDemoSwitch("hod");
        onNavigateTab("courses");
      }
    },
    {
      step: 7,
      title: "Step 7: Student Login & Complete Privacy Isolation",
      role: "student_a101",
      roleName: "Aarav Sharma (Student A101)",
      description: "Switch to student Aarav Sharma. Verified backend IDOR protection ensures students can NEVER access anyone else's marks.",
      actionLabel: "Switch to Student Aarav",
      action: () => {
        onDemoSwitch("student_a101");
      }
    },
    {
      step: 8,
      title: "Step 8: Signature Feature — 'WHY 87.6?'",
      role: "student_a101",
      roleName: "Aarav Sharma (Student A101)",
      description: "Click 'WHY 87.6?' to see the step-by-step breakdown: raw scores, %, weights, Best-of-N, and the +4.2 delta from past paper recheck!",
      actionLabel: "Open 'WHY 87.6?' Breakdown",
      action: () => {
        onDemoSwitch("student_a101");
        if (onOpenExplain) onOpenExplain();
      }
    },
    {
      step: 9,
      title: "Step 9: 'What-If' Real-Time Mark Simulator",
      role: "student_a101",
      roleName: "Aarav Sharma (Student A101)",
      description: "Experiment with hypothetical component scores using sliders. See live projected totals and deltas without changing official marks.",
      actionLabel: "Launch 'What-If' Simulator",
      action: () => {
        onDemoSwitch("student_a101");
        if (onOpenWhatIf) onOpenWhatIf();
      }
    },
    {
      step: 10,
      title: "Step 10: Student Review Request & Mark DNA",
      role: "student_a104",
      roleName: "Priya Nair (Student A104)",
      description: "Inspect review ticket #MR-1028 filed by Priya Nair for lab revaluation, and explore the student's unique Mark DNA profile.",
      actionLabel: "Switch to Priya & View Dispute",
      action: () => {
        onDemoSwitch("student_a104");
      }
    }
  ];

  const current = steps[currentStep - 1];

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all font-semibold text-xs border border-indigo-400/30"
        >
          <Compass className="h-4 w-4 animate-spin-slow" />
          <span>Resume Guided Demo ({currentStep}/10)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-800/40 px-4 py-3 shadow-lg relative z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Step Indicator & Info */}
        <div className="flex items-start sm:items-center space-x-3 w-full md:w-auto">
          <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center font-bold text-sm text-indigo-200">
            {currentStep}/10
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Hackathon Guided Walkthrough
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/20">
                Persona: {current.roleName}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white">{current.title}</h4>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">{current.description}</p>
          </div>
        </div>

        {/* Action Button & Step Navigation */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          
          <button
            onClick={current.action}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-slate-950 transition-all shadow-md active:scale-95"
          >
            <span>{current.actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center space-x-1 border-l border-slate-700 pl-2">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
              disabled={currentStep === 1}
              className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
              title="Previous Step"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentStep((prev) => Math.min(prev + 1, 10))}
              disabled={currentStep === 10}
              className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
              title="Next Step"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 ml-1"
            title="Minimize"
          >
            <X className="h-4 w-4" />
          </button>

        </div>

      </div>
    </div>
  );
}

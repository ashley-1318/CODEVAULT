"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import PipelineStatus from "@/components/PipelineStatus";
import {
  uploadCobol,
  runPipeline,
  approvePipeline,
  getPipelineStatus,
  ClassifiedParagraph,
} from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type StepStatus = "pending" | "in-progress" | "complete" | "error";

interface Step {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
}

// ─── Classification badge colors ──────────────────────────────────────────────
const classColors: Record<string, string> = {
  REGULATORY_MANDATE: "badge-regulatory",
  COMMERCIAL_AGREEMENT: "badge-commercial",
  RISK_POLICY: "badge-risk",
  OPERATIONAL_PROCEDURE: "badge-operational",
  TECHNICAL_PLUMBING: "badge-technical",
  UNKNOWN_ORIGIN: "badge-unknown",
};

const shortLabel: Record<string, string> = {
  REGULATORY_MANDATE: "Regulatory",
  COMMERCIAL_AGREEMENT: "Commercial",
  RISK_POLICY: "Risk Policy",
  OPERATIONAL_PROCEDURE: "Operational",
  TECHNICAL_PLUMBING: "Technical",
  UNKNOWN_ORIGIN: "Unknown",
};

// ─── Initial pipeline steps ───────────────────────────────────────────────────
const initialSteps: Step[] = [
  { id: "upload", label: "Upload", description: "Store COBOL file in MinIO", status: "pending" },
  { id: "parse", label: "Parse", description: "Extract program structure", status: "pending" },
  { id: "chronicle", label: "CHRONICLE Agent", description: "Groq AI paragraph classification", status: "pending" },
  { id: "review", label: "Human Review", description: "Approve classification results", status: "pending" },
  { id: "registry", label: "Registry", description: "Store in Neo4j & PostgreSQL", status: "pending" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClassifiedParagraph[]>([]);
  const [showApproval, setShowApproval] = useState(false);
  const [approvalResult, setApprovalResult] = useState<string | null>(null);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [programName, setProgramName] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateStep = (id: string, status: StepStatus) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setError(null);
      setSteps(initialSteps);
      setShowApproval(false);
      setApprovalResult(null);
      setThreadId(null);
      setPreview([]);
      setRiskScore(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".cbl", ".cob", ".cpy", ".copy"] },
    maxFiles: 1,
  });


  // ── Polling pipeline status ───────────────────────────────────────────────
  useEffect(() => {
    if (threadId && isRunning) {
      pollingRef.current = setInterval(async () => {
        try {
          const status = await getPipelineStatus(threadId);
          const phase = status.current_phase || "";

          if (phase.includes("load_program")) updateStep("parse", "complete");
          if (phase.includes("classify")) updateStep("chronicle", "in-progress");
          if (phase.includes("classify_logic_complete")) updateStep("chronicle", "complete");
          if (phase.includes("score_risk_complete")) {
            if (status.regulatory_risk_score != null) setRiskScore(status.regulatory_risk_score);
          }
        } catch {
          // Polling failures are non-fatal
        }
      }, 3000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [threadId, isRunning]);

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!file) return;

    setIsRunning(true);
    setError(null);
    setSteps(initialSteps);
    setShowApproval(false);
    setApprovalResult(null);

    // Step 1 — Upload
    updateStep("upload", "in-progress");
    let uploadResult;
    try {
      uploadResult = await uploadCobol(file);
      setProgramId(uploadResult.program_id);
      setProgramName(uploadResult.program_name);
      updateStep("upload", "complete");
      updateStep("parse", "complete"); // parse happens on upload
    } catch (e: unknown) {
      updateStep("upload", "error");
      setError(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
      setIsRunning(false);
      return;
    }

    // Step 2 / 3 — Run CHRONICLE pipeline
    updateStep("chronicle", "in-progress");
    let pipelineResult;
    try {
      const rawCobol = await file.text();
      pipelineResult = await runPipeline(
        uploadResult.program_id,
        rawCobol,
        uploadResult.minio_path
      );

      setThreadId(pipelineResult.thread_id);
      setRiskScore(pipelineResult.regulatory_risk_score);
      setPreview(pipelineResult.preview);
      updateStep("chronicle", "complete");
      updateStep("review", "in-progress");
      setShowApproval(true);
    } catch (e: unknown) {
      updateStep("chronicle", "error");
      setError(`Pipeline error: ${e instanceof Error ? e.message : String(e)}`);
      setIsRunning(false);
      return;
    }
  };

  // ── Approval handler ─────────────────────────────────────────────────────
  const handleApproval = async (approved: boolean) => {
    if (!threadId) return;

    updateStep("review", "complete");
    updateStep("registry", "in-progress");

    try {
      const result = await approvePipeline(threadId, approved);
      setShowApproval(false);

      if (approved && result.status === "complete") {
        updateStep("registry", "complete");
        setApprovalResult(`✅ Pipeline complete! Compliance map generated for ${programName}.`);
      } else {
        updateStep("registry", "error");
        setApprovalResult("❌ Pipeline rejected. No data was stored.");
      }
    } catch (e: unknown) {
      updateStep("registry", "error");
      setError(`Approval error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsRunning(false);
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Upload COBOL Program</h1>
        <p className="text-gray-400">
          Upload a <code className="text-vault-400 font-mono text-sm">.cbl</code>,{" "}
          <code className="text-vault-400 font-mono text-sm">.cob</code>, or{" "}
          <code className="text-vault-400 font-mono text-sm">.cpy</code> file to begin the
          CHRONICLE analysis pipeline.
        </p>

      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left column: upload + submit */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            id="cobol-dropzone"
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragActive
                ? "border-vault-400 bg-vault-500/10 scale-[1.01]"
                : "border-gray-700 bg-gray-900/50 hover:border-gray-500 hover:bg-gray-800/30"
            }`}
          >
            <input {...getInputProps()} id="cobol-file-input" />
            <div className="text-5xl mb-4">📂</div>
            {isDragActive ? (
              <p className="text-vault-300 font-medium">Drop your COBOL file here...</p>
            ) : (
              <>
                <p className="text-gray-300 font-medium mb-1">
                  Drag & drop your COBOL file here
                </p>
                <p className="text-gray-500 text-sm">
                  or click to browse — accepts .cbl, .cob, .cpy, and .copy files
                </p>

              </>
            )}
          </div>

          {/* File preview */}
          {file && (
            <div className="glass-card p-4 flex items-center gap-4 animate-slide-up">
              <div className="w-10 h-10 rounded-lg bg-vault-600/30 border border-vault-500/30 flex items-center justify-center">
                <span className="text-vault-300 font-mono text-xs font-bold uppercase">
                  {file.name.split(".").pop()}
                </span>

              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{file.name}</p>
                <p className="text-gray-500 text-sm">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setSteps(initialSteps);
                }}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Submit button */}
          <button
            id="submit-pipeline"
            onClick={handleSubmit}
            disabled={!file || isRunning}
            className="w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 
              bg-vault-600 hover:bg-vault-500 hover:shadow-lg hover:shadow-vault-500/30 
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-vault-600 disabled:hover:shadow-none"
          >
            {isRunning ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running CHRONICLE Pipeline...
              </span>
            ) : (
              "Run CHRONICLE Pipeline →"
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Completion message */}
          {approvalResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm animate-slide-up">
              {approvalResult}
              {programName && (
                <div className="mt-2">
                  <a
                    href={`/compliance-map/${programName}`}
                    className="text-vault-400 hover:text-vault-300 underline"
                  >
                    View Compliance Map →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Human approval panel */}
          {showApproval && preview.length > 0 && (
            <div className="glass-card p-6 animate-slide-up">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    ⏸ Human Review Required
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Review the top 10 classified paragraphs before approving.
                  </p>
                </div>
                {riskScore != null && (
                  <div className="text-right">
                    <div
                      className={`text-2xl font-bold ${
                        riskScore > 0.7
                          ? "text-red-400"
                          : riskScore > 0.4
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {(riskScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-gray-500 text-xs">Risk Score</div>
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-2 text-gray-500">Paragraph</th>
                      <th className="text-left py-2 px-2 text-gray-500">Classification</th>
                      <th className="text-left py-2 px-2 text-gray-500">Confidence</th>
                      <th className="text-left py-2 px-2 text-gray-500">Regulation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((cp, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-800 hover:bg-gray-800/30"
                      >
                        <td className="py-2 px-2 font-mono text-gray-200">
                          {cp.paragraph}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              classColors[cp.classification] || "badge-unknown"
                            }`}
                          >
                            {shortLabel[cp.classification] || cp.classification}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-400">
                          {Math.round(cp.confidence * 100)}%
                        </td>
                        <td className="py-2 px-2 text-gray-400">
                          {cp.regulation || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Approve / Reject buttons */}
              <div className="flex gap-3">
                <button
                  id="btn-approve"
                  onClick={() => handleApproval(true)}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/30"
                >
                  ✓ Approve & Store
                </button>
                <button
                  id="btn-reject"
                  onClick={() => handleApproval(false)}
                  className="flex-1 py-3 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-300 font-semibold border border-red-600/40 transition-all duration-200"
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: pipeline status tracker */}
        <div>
          <div className="glass-card p-6 sticky top-24">
            <h2 className="text-base font-semibold text-white mb-6">Pipeline Status</h2>
            <PipelineStatus steps={steps} currentPhase="" />

            {programName && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Program</p>
                <p className="font-mono text-sm text-vault-300">{programName}</p>
              </div>
            )}

            {threadId && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Thread ID</p>
                <p className="font-mono text-xs text-gray-400 break-all">{threadId}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

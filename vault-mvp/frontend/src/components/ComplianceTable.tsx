"use client";

import React, { useState } from "react";
import RiskBadge from "./RiskBadge";

interface ComplianceEntry {
  paragraph: string;
  classification: string;
  confidence: number;
  rationale: string;
  regulation: string | null;
  is_dead_code: boolean;
  requires_human_review: boolean;
  risk_level: string;
}

interface ComplianceTableProps {
  entries: ComplianceEntry[];
  programName?: string;
}

const classificationColors: Record<string, string> = {
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

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 85 ? "bg-emerald-500" : pct >= 65 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5 w-20">
        <div
          className={`h-1.5 rounded-full progress-bar ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function ComplianceTable({ entries, programName }: ComplianceTableProps) {
  const [translateModal, setTranslateModal] = useState<string | null>(null);
  const [translationResult, setTranslationResult] = useState<{ cobol: string; target: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState<"python" | "java" | "typescript">("python");
  const [copying, setCopying] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const handleTranslate = async (paraName: string) => {
    if (!programName) return;
    setTranslateModal(paraName);
    setIsTranslating(true);
    setTranslationResult(null);

    try {
      const res = await fetch("http://localhost:8000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          program_name: programName, 
          paragraph_name: paraName, 
          target_language: targetLang 
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranslationResult({ cobol: data.original_cobol, target: data.translated_code });
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Paragraph</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Classification</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Confidence</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Regulation</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Risk</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Review</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Translate</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={i}
              className={`border-b border-gray-800 hover:bg-gray-800/40 transition-colors ${
                entry.is_dead_code ? "opacity-50" : ""
              }`}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-200 text-xs">
                    {entry.paragraph}
                  </span>
                  {entry.is_dead_code && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-gray-700 text-gray-400">
                      dead
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    classificationColors[entry.classification] || "badge-unknown"
                  }`}
                >
                  {shortLabel[entry.classification] || entry.classification}
                </span>
              </td>
              <td className="py-3 px-4">
                <ConfidenceBar value={entry.confidence} />
              </td>
              <td className="py-3 px-4">
                <span className="text-gray-300 text-xs">
                  {entry.regulation || (
                    <span className="text-gray-600">—</span>
                  )}
                </span>
              </td>
              <td className="py-3 px-4">
                <RiskBadge level={entry.risk_level} size="sm" />
              </td>
              <td className="py-3 px-4 text-center">
                {entry.requires_human_review ? (
                  <span
                    title="Requires human review"
                    className="text-amber-400 text-base"
                  >
                    ⚠
                  </span>
                ) : (
                  <span className="text-emerald-500 text-base">✓</span>
                )}
              </td>
              <td className="py-3 px-4 text-center">
                {programName && !entry.is_dead_code && (
                  <button
                    onClick={() => handleTranslate(entry.paragraph)}
                    className="group relative text-xs bg-vault-600/20 text-vault-400 hover:bg-vault-600/40 px-3 py-1.5 rounded-lg border border-vault-500/20 font-medium transition-all whitespace-nowrap flex items-center gap-2"
                  >
                    🚀 Refactor
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-vault-400 rounded-full animate-ping" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Translation Modal Overlap */}
      {translateModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-10">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-6xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/80 sticky top-0 z-10 rounded-t-3xl backdrop-blur-sm">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                   <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Logic Reconstruction</span>
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <span className="text-vault-400">{translateModal}</span> 
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                  <div className="flex gap-1">
                    {(["python", "java", "typescript"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setTargetLang(lang);
                          handleTranslate(translateModal!);
                        }}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all tracking-wider border ${
                          targetLang === lang 
                            ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]" 
                            : "bg-gray-800 text-gray-400 border-gray-700 hover:text-white"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </h2>

              </div>
              <button 
                onClick={() => setTranslateModal(null)}
                className="text-gray-400 hover:text-white bg-gray-800/50 hover:bg-red-500/20 p-3 rounded-2xl transition-all border border-gray-700/50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            
            <div className="p-8 overflow-y-auto flex-1 h-full bg-[#111] rounded-b-3xl">
              {isTranslating ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
                  <div className="w-10 h-10 border-4 border-vault-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium tracking-wide">TRANSFORMING LEGACY BLOCKS...</p>
                </div>
              ) : translationResult ? (
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 h-full min-h-0">
                  <div className="flex flex-col min-h-0">
                    <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-[0.2em]">Source logic</h3>
                    <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-gray-800 bg-gray-950/50">
                      <pre className="h-full w-full p-6 text-sm text-gray-300 font-mono overflow-auto scrollbar-thin scrollbar-thumb-gray-700 whitespace-pre-wrap">
{translationResult.cobol}
                      </pre>
                    </div>
                  </div>
                  <div className="flex flex-col min-h-0 relative">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-yellow-500/80 uppercase tracking-[0.2em]">Refactored {targetLang}</h3>

                      <button
                        onClick={() => handleCopy(translationResult.target)}
                        className={`text-[10px] px-2 py-1 rounded border transition-all flex items-center gap-1.5 ${
                          copying 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                            : "bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700"
                        }`}
                      >
                        {copying ? (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                            COPIED
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                            COPY CODE
                          </>
                        )}
                      </button>
                    </div>
                     <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-yellow-500/10 bg-gray-950/50">
                      <pre className="h-full w-full p-6 text-sm text-yellow-100/90 font-mono overflow-auto scrollbar-thin scrollbar-thumb-yellow-700/30 whitespace-pre-wrap">
{translationResult.target}
                      </pre>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-red-400 gap-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <p className="font-semibold">Architect Engine Offline</p>
                  <p className="text-xs text-gray-500">Could not connect to translation microservice.</p>
                </div>
              )}
            </div>

            
          </div>
        </div>
      )}
    </div>
  );
}

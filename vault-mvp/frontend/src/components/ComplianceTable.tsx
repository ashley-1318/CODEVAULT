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

  const handleTranslate = async (paraName: string) => {
    if (!programName) return;
    setTranslateModal(paraName);
    setIsTranslating(true);
    setTranslationResult(null);

    try {
      const res = await fetch("http://localhost:8000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_name: programName, paragraph_name: paraName, target_language: "python" }),
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
                    className="text-xs bg-vault-600/20 text-vault-400 hover:bg-vault-600/40 px-3 py-1.5 rounded-lg border border-vault-500/20 font-medium transition-colors whitespace-nowrap"
                  >
                    To Python
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Translation Modal Overlap */}
      {translateModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-vault-400">Translation:</span>
                <span className="font-mono text-gray-400 text-sm">{translateModal}</span> 
                → 
                <span className="text-yellow-400 text-sm font-mono">Python</span>
              </h2>
              <button 
                onClick={() => setTranslateModal(null)}
                className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 h-full">
              {isTranslating ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
                  <div className="w-8 h-8 border-4 border-vault-500 border-t-transparent rounded-full animate-spin" />
                  <p>AI Architect is translating {translateModal} to Python via Groq...</p>
                </div>
              ) : translationResult ? (
                <div className="grid grid-cols-2 gap-6 h-full">
                  <div className="h-full flex flex-col">
                    <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Original COBOL</h3>
                    <pre className="bg-[#1e1e1e] p-4 rounded-xl text-xs sm:text-sm text-gray-300 overflow-auto border border-gray-800 font-mono shadow-inner flex-1 whitespace-pre-wrap">
{translationResult.cobol}
                    </pre>
                  </div>
                  <div className="h-full flex flex-col">
                    <h3 className="text-sm font-medium text-yellow-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14.228 17.534v1.89h-.002v1.383c0 2.222-2.146 3.193-2.146 3.193s-1.897.41-3.957.195c-2.19-.23-3.033-1.076-3.033-1.076-1.002-.998-1.258-2.67-1.258-2.67V18.17s-.016-1.127.42-2.102c.437-.978 1.488-1.5 1.488-1.5.023-.005 3.15-.316 4.708-.4.996-.058 1.94-.124 1.94-.124h.02s1.472-.05 1.83.69c0 0 .195.344.183 1.054a1.8 1.8 0 01-.195.746H11.2s-2.072-.116-2.072 1.48c0 1.597 2.072 1.424 2.072 1.424h3.028zm1.096-7.863V7.79H15.323v-1.38c0-2.22 2.146-3.192 2.146-3.192s1.898-.413 3.958-.196c2.19.23 3.033 1.077 3.033 1.077 1.002.997 1.258 2.67 1.258 2.67v2.285s.016 1.127-.42 2.102c-.437.977-1.488 1.5-1.488 1.5-.023.004-3.15.316-4.708.4-.996.057-1.94.123-1.94.123h-.02s-1.472.05-1.83-.69c0 0-.195-.344-.183-1.054a1.8 1.8 0 01.195-.745h3.027s2.072.115 2.072-1.48c0-1.596-2.07-1.423-2.07-1.423h-3.026z"/></svg>
                      Modern Python
                    </h3>
                    <pre className="bg-[#1e1e1e] p-4 rounded-xl text-xs sm:text-sm text-yellow-100 overflow-auto border border-gray-800 font-mono shadow-inner flex-1 whitespace-pre-wrap">
{translationResult.target}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-red-400">
                  <p>Failed to generate translation. Check backend logs.</p>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

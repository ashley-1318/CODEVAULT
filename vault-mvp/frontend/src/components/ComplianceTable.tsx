"use client";

import React from "react";
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

export default function ComplianceTable({ entries }: ComplianceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Paragraph</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Classification</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Confidence</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Regulation</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Risk</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Review</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

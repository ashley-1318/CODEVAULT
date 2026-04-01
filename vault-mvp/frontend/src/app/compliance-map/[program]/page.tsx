"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import ClassificationPieChart from "@/components/ClassificationPieChart";
import ComplianceTable from "@/components/ComplianceTable";
import RiskBadge from "@/components/RiskBadge";
import { getComplianceMap, ComplianceMap, ClassifiedParagraph } from "@/lib/api";

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

const REGULATION_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#06b6d4",
];

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: "red" | "amber" | "green" | "blue";
}) {
  const colMap = {
    red: "text-red-400",
    amber: "text-amber-400",
    green: "text-emerald-400",
    blue: "text-vault-400",
  };
  return (
    <div className="glass-card p-5">
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${highlight ? colMap[highlight] : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function ComplianceMapPage() {
  const params = useParams();
  const programName = decodeURIComponent(params.program as string);

  const [map, setMap] = useState<ComplianceMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getComplianceMap(programName);
        setMap(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [programName]);

  const riskScore = map?.regulatory_risk_score || 0;
  const riskColor =
    riskScore > 0.7 ? "text-red-400" : riskScore > 0.4 ? "text-amber-400" : "text-emerald-400";

  const regulationBarData = useMemo(
    () =>
      (map?.regulatory_obligations || []).map((r, i) => ({
        name: r.regulation,
        count: r.paragraph_count,
        color: REGULATION_COLORS[i % REGULATION_COLORS.length],
      })),
    [map]
  );

  const filteredEntries = useMemo(() => {
    if (!map) return [];
    return map.entries
      .map((e: ClassifiedParagraph) => ({
        ...e,
        risk_level: e.risk_level ?? "LOW",
      }))
      .filter((e) => {
        const matchClass = classFilter === "ALL" || e.classification === classFilter;
        const matchRisk = riskFilter === "ALL" || e.risk_level === riskFilter;
        const matchSearch =
          !search || e.paragraph.toLowerCase().includes(search.toLowerCase());
        return matchClass && matchRisk && matchSearch;
      });
  }, [map, classFilter, riskFilter, search]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <div className="skeleton h-12 rounded-xl w-1/2" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
          <p className="font-semibold mb-1">Failed to load compliance map</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!map) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-gray-500 text-sm font-mono">Compliance Map</span>
            <span className="text-gray-700">/</span>
            <span className="text-vault-400 font-mono text-sm">{map.program}</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-1">{map.program}</h1>
          <p className="text-gray-500 text-sm">
            Generated: {new Date(map.generated_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Regulatory Risk Score</p>
            <p className={`text-5xl font-bold ${riskColor}`}>
              {(riskScore * 100).toFixed(0)}%
            </p>
            <RiskBadge
              level={riskScore > 0.7 ? "HIGH" : riskScore > 0.4 ? "MEDIUM" : "LOW"}
              size="md"
            />
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Paragraphs"
          value={map.summary.total_paragraphs}
          highlight="blue"
        />
        <StatCard
          label="Regulatory Mandate"
          value={map.summary.regulatory_mandate_count}
          sub="paragraphs with external compliance"
          highlight={map.summary.regulatory_mandate_count > 0 ? "red" : "green"}
        />
        <StatCard
          label="Dead Code"
          value={map.summary.dead_code_count}
          sub="zero SMF executions"
          highlight={map.summary.dead_code_count > 0 ? "amber" : "green"}
        />
        <StatCard
          label="Requires Review"
          value={map.summary.requires_human_review_count}
          sub="low-confidence classifications"
          highlight={map.summary.requires_human_review_count > 0 ? "amber" : "green"}
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Classification Distribution
          </h2>
          <ClassificationPieChart distribution={map.classification_distribution} />
        </div>

        {/* Bar chart — regulations */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Identified Regulations
          </h2>
          {regulationBarData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No regulations identified
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={regulationBarData}
                margin={{ top: 5, right: 10, bottom: 60, left: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(17,24,39,0.9)",
                    border: "1px solid rgba(55,65,81,0.5)",
                    borderRadius: "0.5rem",
                    color: "white",
                  }}
                  formatter={(v: number) => [`${v} paragraph${v !== 1 ? "s" : ""}`, "Count"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {regulationBarData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Regulatory obligations */}
      {map.regulatory_obligations.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Regulatory Obligations</h2>
          <div className="flex flex-wrap gap-3">
            {map.regulatory_obligations.map((ob, i) => (
              <div
                key={i}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <p className="text-red-300 font-medium text-sm">{ob.regulation}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {ob.paragraph_count} paragraph{ob.paragraph_count !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filterable entries table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">All Paragraphs</h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              id="para-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search paragraph name..."
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 text-sm"
            />

            <select
              id="class-filter"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 focus:outline-none focus:ring-2 focus:ring-vault-500/50 text-sm"
            >
              <option value="ALL">All Classifications</option>
              {Object.keys(shortLabel).map((key) => (
                <option key={key} value={key}>
                  {shortLabel[key]}
                </option>
              ))}
            </select>

            <select
              id="risk-filter"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 focus:outline-none focus:ring-2 focus:ring-vault-500/50 text-sm"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>

            <span className="ml-auto text-gray-500 text-sm self-center">
              {filteredEntries.length} of {map.entries.length} entries
            </span>
          </div>
        </div>

        <ComplianceTable entries={filteredEntries} />
      </div>
    </div>
  );
}

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
  const [traces, setTraces] = useState<any[]>([]);
  const [showTrace, setShowTrace] = useState(false);


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
    const loadTraces = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/logs/trace/${programName}`);
        if (res.ok) {
          const data = await res.json();
          setTraces(data.traces || []);
        }
      } catch (e) {
        console.error("Trace load error:", e);
      }
    };
    load();
    loadTraces();
    const interval = setInterval(loadTraces, 5000); // Poll every 5s
    return () => clearInterval(interval);
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

  const goBack = () => {
     window.history.back();
  };


  const exportToExcel = () => {
    if (!map) return;
    const headers = ["Paragraph", "Classification", "Confidence", "Regulatory Factor", "Risk Level", "Dead Code", "Needs Review"];
    const rows = filteredEntries.map(e => [
      e.paragraph,
      e.classification,
      (e.confidence * 100).toFixed(0) + "%",
      `"${e.regulation || ''}"`,
      e.risk_level || 'LOW',
      e.is_dead_code ? 'Yes' : 'No',
      e.requires_human_review ? 'Yes' : 'No'
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${map.program}_compliance_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
      {/* Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between no-print">
        <button 
          onClick={goBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 group-hover:border-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </div>
          <span className="text-sm font-medium">Back to Registry</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
           <span>REGISTRY</span>
           <span>/</span>
           <span className="text-vault-400">{map.program}</span>
        </div>
      </div>

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

        <div className="flex flex-col sm:flex-row items-center gap-6 bg-gray-900/40 p-6 rounded-2xl border border-gray-800 shadow-xl">
          <div className="text-center sm:text-right flex-1">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1 font-semibold">Regulatory Risk Score</p>
            <p className={`text-6xl font-black ${riskColor}`}>
              {(riskScore * 100).toFixed(0)}%
            </p>
            <div className="mt-2 flex justify-center sm:justify-end">
               <RiskBadge
                level={riskScore > 0.7 ? "HIGH" : riskScore > 0.4 ? "MEDIUM" : "LOW"}
                size="md"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-3 min-w-[200px] no-print w-full sm:w-auto">
            <button
              onClick={exportToExcel}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 border border-emerald-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              EXPORT CSV (EXCEL)
            </button>
            <button
              onClick={exportToPDF}
              className="w-full px-6 py-3 bg-vault-600 hover:bg-vault-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 border border-vault-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              EXPORT PDF REPORT
            </button>
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
        <div className="glass-card p-5 relative overflow-hidden group cursor-pointer" onClick={() => setShowTrace(!showTrace)}>
          <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Live Status</p>
          <p className="text-3xl font-bold text-emerald-400">ONLINE</p>
          <p className="text-gray-500 text-xs mt-1">{traces.length} recent executions</p>
        </div>
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
      {showTrace && (
        <div className="glass-card p-6 border-emerald-500/30 bg-emerald-500/5 transition-all">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Mainframe Log Stream (SMF-70)
            </h2>
            <button onClick={() => setShowTrace(false)} className="text-gray-500 hover:text-white text-sm">Close</button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {traces.length === 0 ? (
              <p className="text-gray-500 text-center py-10 italic">Waiting for incoming logs from mainframe bulkhead...</p>
            ) : (
              traces.map((t: any, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-950/50 p-3 rounded-lg border border-gray-800 font-mono text-xs">
                   <div className="flex items-center gap-4">
                      <span className="text-vault-400">[{new Date(t.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-gray-300 font-bold uppercase">{t.paragraph}</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="text-gray-500">Hits: <span className="text-gray-200">{t.count}</span></span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">EXECUTED</span>
                   </div>
                </div>
              ))
            )}
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

        <ComplianceTable entries={filteredEntries} programName={map.program} />
      </div>
    </div>
  );
}

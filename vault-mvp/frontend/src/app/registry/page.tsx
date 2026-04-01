"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getRegistry, RegistryProgram } from "@/lib/api";

function RiskIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score > 0.7 ? "text-red-400" : score > 0.4 ? "text-amber-400" : "text-emerald-400";
  return <span className={`font-bold text-lg ${color}`}>{pct}%</span>;
}

export default function RegistryPage() {
  const [programs, setPrograms] = useState<RegistryProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getRegistry();
        setPrograms(data.programs);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filtered = programs.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Program Registry</h1>
          <p className="text-gray-400">
            All COBOL programs analyzed and stored in the Neo4j knowledge graph.
          </p>
        </div>
        <Link
          href="/upload"
          className="px-5 py-2.5 bg-vault-600 hover:bg-vault-500 text-white font-medium rounded-xl transition-all duration-200 text-sm whitespace-nowrap"
        >
          + Upload New
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          id="registry-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search programs..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500 transition-all text-sm"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="glass-card p-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">No programs found</p>
          <p className="text-gray-600 text-sm">
            {programs.length === 0
              ? "Upload a COBOL program to get started."
              : `No programs match "${search}".`}
          </p>
          {programs.length === 0 && (
            <Link
              href="/upload"
              className="inline-block mt-4 px-5 py-2 bg-vault-600 hover:bg-vault-500 text-white rounded-lg text-sm transition-colors"
            >
              Upload COBOL →
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900/50">
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Program Name</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Risk Score</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Paragraphs</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Dead Code</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Analyzed At</th>
                <th className="text-left py-4 px-6 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((prog, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-vault-600/30 border border-vault-500/30 flex items-center justify-center">
                        <span className="text-vault-300 text-xs font-bold">C</span>
                      </div>
                      <span className="font-mono font-semibold text-white">
                        {prog.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <RiskIndicator score={prog.regulatory_risk_score || 0} />
                  </td>
                  <td className="py-4 px-6 text-gray-300">{prog.total_paragraphs || "—"}</td>
                  <td className="py-4 px-6">
                    {prog.dead_code_count > 0 ? (
                      <span className="text-amber-400">{prog.dead_code_count}</span>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-gray-500 text-xs">
                    {prog.created_at
                      ? new Date(prog.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <Link
                        href={`/compliance-map/${prog.name}`}
                        className="px-3 py-1.5 rounded-lg bg-vault-600/20 hover:bg-vault-600/40 text-vault-300 text-xs font-medium border border-vault-500/20 transition-colors"
                      >
                        Compliance Map
                      </Link>
                      <Link
                        href={`/graph/${prog.name}`}
                        className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium transition-colors"
                      >
                        Graph
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-6 py-3 border-t border-gray-800 bg-gray-900/30">
            <p className="text-gray-500 text-xs">
              {filtered.length} of {programs.length} program{programs.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

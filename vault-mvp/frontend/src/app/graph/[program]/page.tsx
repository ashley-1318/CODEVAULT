"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DependencyGraph from "@/components/DependencyGraph";
import { getProgramRegistry } from "@/lib/api";

interface GraphNode {
  id: string;
  label: string;
  type: "program" | "paragraph" | "regulation";
  riskLevel?: string;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
}

export default function GraphPage() {
  const params = useParams();
  const programName = decodeURIComponent(params.program as string);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; deps: number; regs: number }>({
    total: 0,
    deps: 0,
    regs: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProgramRegistry(programName);
        const graphNodes: GraphNode[] = [];
        const graphLinks: GraphLink[] = [];
        const regulationSet = new Set<string>();

        // Program node
        graphNodes.push({
          id: programName,
          label: programName,
          type: "program",
        });

        // Paragraph nodes + CONTAINS links
        const paragraphs = (data.paragraphs as Record<string, unknown>[]) || [];
        for (const para of paragraphs) {
          const pName = String(para.name || "UNKNOWN");
          graphNodes.push({
            id: pName,
            label: pName,
            type: "paragraph",
            riskLevel: String(para.risk_level || "LOW"),
          });
          graphLinks.push({
            source: programName,
            target: pName,
            label: "CONTAINS",
          });

          // Regulation nodes
          const regs = (para.regulations as string[]) || [];
          for (const reg of regs) {
            if (reg && !regulationSet.has(reg)) {
              regulationSet.add(reg);
              graphNodes.push({ id: reg, label: reg, type: "regulation" });
            }
            if (reg) {
              graphLinks.push({
                source: pName,
                target: reg,
                label: "IMPLEMENTS",
              });
            }
          }
        }

        // Dependency links (DEPENDS_ON)
        const deps = (data.dependencies as Record<string, string>[]) || [];
        for (const dep of deps) {
          const target = dep.target_program;
          if (!graphNodes.find((n) => n.id === target)) {
            graphNodes.push({ id: target, label: target, type: "program" });
          }
          graphLinks.push({
            source: programName,
            target,
            label: "DEPENDS_ON",
          });
        }

        setNodes(graphNodes);
        setLinks(graphLinks);
        setStats({
          total: graphNodes.length,
          deps: deps.length,
          regs: regulationSet.size,
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [programName]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
          <span>Graph</span>
          <span>/</span>
          <span className="text-vault-400 font-mono">{programName}</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Dependency Graph
        </h1>
        <p className="text-gray-400">
          Programs, paragraphs, and regulatory relationships for{" "}
          <span className="font-mono text-vault-300">{programName}</span>
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Nodes", value: stats.total },
          { label: "Dependencies", value: stats.deps },
          { label: "Regulations", value: stats.regs },
        ].map((s, i) => (
          <div key={i} className="glass-card p-5 text-center">
            <p className="text-2xl font-bold text-vault-400">{s.value}</p>
            <p className="text-gray-500 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Graph */}
      {isLoading ? (
        <div className="skeleton h-96 rounded-xl" />
      ) : error ? (
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
          {error}
        </div>
      ) : (
        <DependencyGraph nodes={nodes} links={links} />
      )}
    </div>
  );
}

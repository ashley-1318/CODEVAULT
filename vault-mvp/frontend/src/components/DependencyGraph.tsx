"use client";

import React, { useEffect, useRef } from "react";

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

interface DependencyGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
}

const NODE_COLORS: Record<string, string> = {
  program: "#4d72fd",
  paragraph: "#10b981",
  regulation: "#ef4444",
};

export default function DependencyGraph({ nodes, links }: DependencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Simple SVG-based force-directed layout fallback
  // (react-force-graph requires browser APIs on client only)
  const width = 700;
  const height = 400;

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 glass-card rounded-xl">
        No graph data available
      </div>
    );
  }

  // Simple circular layout
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  const positioned = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return {
      ...node,
      x: nodes.length === 1 ? centerX : centerX + radius * Math.cos(angle),
      y: nodes.length === 1 ? centerY : centerY + radius * Math.sin(angle),
    };
  });

  const nodeMap = new Map(positioned.map((n) => [n.id, n]));

  return (
    <div ref={containerRef} className="w-full overflow-auto glass-card rounded-xl p-4">
      <svg width={width} height={height} className="w-full">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="rgba(156,163,175,0.6)" />
          </marker>
        </defs>

        {/* Links */}
        {links.map((link, i) => {
          const src = nodeMap.get(
            typeof link.source === "string" ? link.source : (link.source as { id: string }).id
          );
          const tgt = nodeMap.get(
            typeof link.target === "string" ? link.target : (link.target as { id: string }).id
          );
          if (!src || !tgt) return null;
          return (
            <g key={`link-${i}`}>
              <line
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="rgba(156,163,175,0.4)"
                strokeWidth={1.5}
                markerEnd="url(#arrowhead)"
              />
              <text
                x={(src.x + tgt.x) / 2}
                y={(src.y + tgt.y) / 2 - 4}
                fontSize={9}
                fill="rgba(156,163,175,0.7)"
                textAnchor="middle"
              >
                {link.label}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {positioned.map((node) => {
          const color = NODE_COLORS[node.type] || "#6b7280";
          const r = node.type === "program" ? 22 : 16;
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={color}
                fillOpacity={0.25}
                stroke={color}
                strokeWidth={2}
              />
              <text
                x={node.x}
                y={node.y + r + 14}
                fontSize={10}
                fill="white"
                textAnchor="middle"
                className="font-mono"
              >
                {node.label.length > 14
                  ? node.label.substring(0, 12) + "…"
                  : node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2 justify-center">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color, opacity: 0.8 }}
            />
            <span className="text-xs text-gray-400 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

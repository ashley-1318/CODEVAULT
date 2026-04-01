"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ClassificationPieChartProps {
  distribution: Record<string, number>;
}

const COLORS: Record<string, string> = {
  REGULATORY_MANDATE: "#ef4444",
  COMMERCIAL_AGREEMENT: "#f59e0b",
  RISK_POLICY: "#fb923c",
  OPERATIONAL_PROCEDURE: "#10b981",
  TECHNICAL_PLUMBING: "#818cf8",
  UNKNOWN_ORIGIN: "#6b7280",
};

const LABELS: Record<string, string> = {
  REGULATORY_MANDATE: "Regulatory",
  COMMERCIAL_AGREEMENT: "Commercial",
  RISK_POLICY: "Risk Policy",
  OPERATIONAL_PROCEDURE: "Operational",
  TECHNICAL_PLUMBING: "Technical",
  UNKNOWN_ORIGIN: "Unknown",
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { fullName: string } }[];
}) => {
  if (active && payload && payload.length) {
    const p = payload[0];
    return (
      <div className="glass-card p-3 text-sm">
        <p className="font-semibold text-white">{p.payload.fullName}</p>
        <p className="text-gray-400">
          {p.value} paragraph{p.value !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return null;
};

export default function ClassificationPieChart({
  distribution,
}: ClassificationPieChartProps) {
  const data = Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([key, value]) => ({
      name: LABELS[key] || key,
      fullName: key,
      value,
      color: COLORS[key] || "#6b7280",
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No classification data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={1}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-gray-400 text-xs">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

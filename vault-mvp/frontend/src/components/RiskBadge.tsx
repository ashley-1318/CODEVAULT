"use client";

import React from "react";

interface RiskBadgeProps {
  level: "HIGH" | "MEDIUM" | "LOW" | string;
  size?: "sm" | "md";
}

export default function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const config: Record<string, { label: string; className: string; dot: string }> = {
    HIGH: {
      label: "HIGH",
      className: "bg-red-500/15 text-red-400 border-red-500/30",
      dot: "bg-red-400",
    },
    MEDIUM: {
      label: "MEDIUM",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      dot: "bg-amber-400",
    },
    LOW: {
      label: "LOW",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      dot: "bg-emerald-400",
    },
  };

  const cfg = config[level?.toUpperCase()] || config["LOW"];
  const padClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cfg.className} ${padClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

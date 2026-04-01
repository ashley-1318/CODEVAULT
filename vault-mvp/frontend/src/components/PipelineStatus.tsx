"use client";

import React from "react";

interface PipelineStep {
  id: string;
  label: string;
  description: string;
  status: "pending" | "in-progress" | "complete" | "error";
}

interface PipelineStatusProps {
  steps: PipelineStep[];
  currentPhase: string;
}

const statusConfig = {
  pending: {
    icon: (
      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    dotClass: "bg-gray-600 border-gray-500",
    labelClass: "text-gray-500",
  },
  "in-progress": {
    icon: (
      <svg
        className="w-4 h-4 text-vault-400 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    ),
    dotClass: "bg-vault-500 border-vault-400 step-active",
    labelClass: "text-vault-300",
  },
  complete: {
    icon: (
      <svg
        className="w-4 h-4 text-emerald-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
    dotClass: "bg-emerald-500 border-emerald-400",
    labelClass: "text-emerald-300",
  },
  error: {
    icon: (
      <svg
        className="w-4 h-4 text-red-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    dotClass: "bg-red-500 border-red-400",
    labelClass: "text-red-300",
  },
};

export default function PipelineStatus({
  steps,
}: PipelineStatusProps) {
  return (
    <div className="space-y-1">
      {steps.map((step, index) => {
        const cfg = statusConfig[step.status];
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex gap-4">
            {/* Connector line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-500 ${cfg.dotClass}`}
              >
                {cfg.icon}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 mt-1 transition-colors duration-500 ${
                    step.status === "complete"
                      ? "bg-emerald-500/50"
                      : "bg-gray-700"
                  }`}
                  style={{ minHeight: "24px" }}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 pt-1 flex-1">
              <p className={`font-medium text-sm transition-colors duration-300 ${cfg.labelClass}`}>
                {step.label}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

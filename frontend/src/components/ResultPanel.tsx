"use client";

import type { PredictResult } from "@/lib/api";

function ProbBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="uppercase tracking-wide text-slate-400">{label}</span>
        <span className="font-mono text-slate-300">
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${color} transition-[width] duration-700 ease-out`}
          style={{ width: `${Math.max(value * 100, 1)}%` }}
        />
      </div>
    </div>
  );
}

export function ResultPanel({
  loading,
  error,
  result,
}: {
  loading: boolean;
  error: string | null;
  result: PredictResult | null;
}) {
  if (loading) {
    return (
      <div className="flex h-full min-h-72 flex-col items-center justify-center gap-4 text-slate-400">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
        <p className="text-sm">Analyzing with the hybrid model…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-72 flex-col items-center justify-center gap-2 text-center">
        <p className="font-medium text-rose-400">Could not analyze image</p>
        <p className="max-w-xs text-sm text-slate-500">{error}</p>
        <p className="mt-2 text-xs text-slate-600">
          Make sure the backend is running on {" "}
          <code className="rounded bg-slate-800 px-1">:8000</code>.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full min-h-72 flex-col items-center justify-center gap-2 text-center text-slate-500">
        <p className="text-sm">Upload an image and click Analyze.</p>
        <p className="text-xs text-slate-600">
          Verdict, confidence, and a Grad-CAM heatmap will appear here.
        </p>
      </div>
    );
  }

  const isFake = result.verdict === "fake";
  return (
    <div className="flex flex-col gap-6">
      {/* verdict badge */}
      <div
        className={[
          "flex items-center justify-between rounded-2xl border p-5",
          isFake
            ? "border-rose-500/30 bg-rose-500/10"
            : "border-emerald-500/30 bg-emerald-500/10",
        ].join(" ")}
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Verdict
          </p>
          <p
            className={`text-3xl font-extrabold tracking-tight ${
              isFake ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {result.verdict.toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Confidence
          </p>
          <p className="font-mono text-2xl font-bold text-slate-100">
            {(result.confidence * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* probability bars */}
      <div className="flex flex-col gap-3">
        <ProbBar label="fake" value={result.probs.fake} color="bg-rose-500" />
        <ProbBar label="real" value={result.probs.real} color="bg-emerald-500" />
      </div>

      {/* grad-cam */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">
          Grad-CAM explanation
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.gradcam_png}
          alt="Grad-CAM heatmap"
          className="w-full rounded-xl border border-slate-800"
        />
        <p className="mt-2 text-xs text-slate-500">
          Warmer regions contributed most to the decision.
        </p>
      </div>
    </div>
  );
}

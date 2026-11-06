// Client for the FastAPI model backend (Day 1).

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Verdict = "fake" | "real";

export interface PredictResult {
  verdict: Verdict;
  confidence: number; // 0..1
  probs: { fake: number; real: number };
  gradcam_png: string; // data: URI
}

export interface HealthResult {
  status: string;
  device: string;
  model_loaded: boolean;
}

export async function predict(file: File): Promise<PredictResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/predict`, { method: "POST", body: fd });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail ?? `Server error (${res.status})`);
  }
  return res.json();
}

export async function checkHealth(): Promise<HealthResult> {
  const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("backend offline");
  return res.json();
}

"use client";

import { useEffect, useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { ResultPanel } from "@/components/ResultPanel";
import { checkHealth, predict, type PredictResult } from "@/lib/api";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [device, setDevice] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    checkHealth()
      .then((h) => {
        setOnline(h.model_loaded);
        setDevice(h.device);
      })
      .catch(() => setOnline(false));
  }, []);

  function onFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    setSaved(false);
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const r = await predict(file);
      setResult(r);
      // save to the user's scan history (best-effort)
      fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdict: r.verdict,
          confidence: r.confidence,
          probFake: r.probs.fake,
          probReal: r.probs.real,
          gradcam: r.gradcam_png,
        }),
      })
        .then((res) => setSaved(res.ok))
        .catch(() => setSaved(false));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deepfake Face Detector</h1>
          <p className="text-sm text-slate-500">
            Upload a face image for a verdict, confidence, and a Grad-CAM explanation.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              online === null ? "bg-slate-500" : online ? "bg-emerald-400" : "bg-rose-500"
            }`}
          />
          <span className="text-slate-400">
            {online === null ? "checking…" : online ? `model online · ${device}` : "backend offline"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-300">1 · Upload a face image</h2>
          <Dropzone preview={preview} onFile={onFile} disabled={loading} />
          <button
            onClick={analyze}
            disabled={!file || loading}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">2 · Result</h2>
            {result && saved && (
              <span className="text-xs text-emerald-400">✓ saved to history</span>
            )}
          </div>
          <ResultPanel loading={loading} error={error} result={result} />
        </section>
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-slate-600">
        Hybrid model: ConvNeXt-Tiny + frozen CLIP ViT-L/14 → fusion head, with Grad-CAM.
        Trained on the 140k Real/Fake Faces dataset (StyleGAN) — most reliable on that
        distribution.
      </p>
    </main>
  );
}

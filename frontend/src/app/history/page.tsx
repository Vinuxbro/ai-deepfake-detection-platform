import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listScans, scanStats } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default async function HistoryPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const scans = listScans(user.id);
  const stats = scanStats(user.id);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
      <h1 className="text-2xl font-bold">Scan History</h1>
      <p className="mb-6 text-sm text-slate-500">
        Your past analyses, most recent first.
      </p>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatCard label="Total scans" value={stats.total} color="text-slate-100" />
        <StatCard label="Flagged fake" value={stats.fake} color="text-rose-400" />
        <StatCard label="Judged real" value={stats.real} color="text-emerald-400" />
      </div>

      {scans.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center text-slate-500">
          <p>No scans yet.</p>
          <p className="mt-1 text-sm">
            Analyze an image on the{" "}
            <a href="/" className="text-indigo-400 hover:underline">
              Detector
            </a>{" "}
            and it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {scans.map((s) => {
            const isFake = s.verdict === "fake";
            return (
              <div
                key={s.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40"
              >
                {s.gradcam ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.gradcam} alt="scan" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-slate-950 text-xs text-slate-600">
                    no image
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-bold ${isFake ? "text-rose-400" : "text-emerald-400"}`}
                    >
                      {s.verdict.toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {(s.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {new Date(s.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

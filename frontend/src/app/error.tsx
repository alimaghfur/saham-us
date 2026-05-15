"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="w-full max-w-lg rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-sm">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">
          Oops! Terjadi Kesalahan
        </h1>
        <p className="mb-6 text-slate-400">
          Halaman ini mengalami error. Tim kami sudah diberi tahu dan sedang
          memperbaiki masalah ini.
        </p>
        {error?.message && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
              Technical Details
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-900 p-3 font-mono text-xs text-red-300">
              {error.message}
            </pre>
          </details>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

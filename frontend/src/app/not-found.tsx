import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="w-full max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-indigo-500/10 p-4">
            <FileQuestion className="h-12 w-12 text-indigo-400" />
          </div>
        </div>
        <h1 className="mb-2 text-4xl font-bold text-white">404</h1>
        <h2 className="mb-4 text-xl font-semibold text-slate-300">
          Halaman Tidak Ditemukan
        </h2>
        <p className="mb-8 text-slate-400">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
          Silakan kembali ke dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <button
            onClick={() => typeof window !== "undefined" && window.history.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}

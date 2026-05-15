"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MobileNav } from "@/components/MobileNav";
import { TrendingUp } from "lucide-react";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  // Public pages (login) — render without app shell
  if (isPublicPage) {
    if (isAuthenticated && !isLoading) {
      router.replace("/");
      return null;
    }
    return <>{children}</>;
  }

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-indigo-400" />
            <span className="text-xl font-bold text-white">Saham-US</span>
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
          <p className="text-sm text-slate-400">Memuat...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!isAuthenticated) {
    router.replace("/login");
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
          <p className="text-sm text-slate-400">Mengalihkan ke halaman login...</p>
        </div>
      </div>
    );
  }

  // Authenticated — render with full app shell
  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="scrollbar-thin relative flex-1 overflow-y-auto pb-16 lg:pb-0">
            <div className="pointer-events-none absolute inset-0 dot-pattern opacity-30" />
            <div className="relative px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      <MobileNav />
    </>
  );
}

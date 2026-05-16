"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MobileNav } from "@/components/MobileNav";
import { TrendingUp, ShieldX, Home } from "lucide-react";
import Link from "next/link";

const PUBLIC_PATHS = ["/login"];
// These paths are always accessible for any authenticated user
const ALWAYS_ALLOWED = ["/", "/account", "/settings", "/login"];

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, initialize, user, allowedMenus } = useAuthStore();
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

  // Check menu access for admin role
  const isAccessDenied = (() => {
    // Super admin always has full access
    if (user?.role === "super_admin") return false;
    // Always-allowed paths
    if (ALWAYS_ALLOWED.includes(pathname)) return false;
    // If allowedMenus not loaded yet (empty array), allow access (loading state)
    if (allowedMenus.length === 0) return false;
    // Check if current path is in allowed menus
    // Match exact or startsWith for nested routes (e.g. /stock/AAPL matches /stock)
    const hasAccess = allowedMenus.some((menu) => {
      if (pathname === menu) return true;
      if (menu !== "/" && pathname.startsWith(menu + "/")) return true;
      // Special: /stock/* pages are always allowed if user has dashboard access
      if (pathname.startsWith("/stock/")) return true;
      return false;
    });
    return !hasAccess;
  })();

  // Authenticated — render with full app shell
  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="scrollbar-thin relative flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
            <div className="pointer-events-none absolute inset-0 dot-pattern opacity-30" />
            <div className="relative px-4 py-6 sm:px-6 lg:px-8">
              {isAccessDenied ? <AccessDenied /> : children}
            </div>
          </main>
        </div>
      </div>
      <MobileNav />
    </>
  );
}

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <ShieldX className="h-12 w-12 text-red-400" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Akses Ditolak</h1>
        <p className="mb-6 text-sm text-slate-400">
          Anda tidak memiliki izin untuk mengakses halaman ini.
          Hubungi Super Admin untuk mendapatkan akses.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Home className="h-4 w-4" />
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}

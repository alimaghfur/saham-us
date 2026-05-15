"use client";

import { useAuthStore } from "@/lib/auth-store";
import { User, Mail, Calendar, Shield, LogOut } from "lucide-react";

export default function AccountPage() {
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Akun Saya</h1>
        <p className="mt-1 text-sm text-slate-400">
          Kelola informasi profil dan pengaturan akun Anda
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
            {user.full_name
              ? user.full_name.charAt(0).toUpperCase()
              : user.username.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-semibold text-white">
              {user.full_name || user.username}
            </h2>
            <p className="text-sm text-slate-400">@{user.username}</p>
            <div className="flex items-center gap-2 pt-1">
              {user.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                  <Shield className="h-3 w-3" />
                  Terverifikasi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                  <Shield className="h-3 w-3" />
                  Belum Terverifikasi
                </span>
              )}
              {user.is_active && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                  Aktif
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Informasi Akun
        </h3>
        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
              <Mail className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm font-medium text-white">{user.email}</p>
            </div>
          </div>

          {/* Username */}
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
              <User className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Username</p>
              <p className="text-sm font-medium text-white">@{user.username}</p>
            </div>
          </div>

          {/* Joined Date */}
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
              <Calendar className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Bergabung</p>
              <p className="text-sm font-medium text-white">
                {new Date(user.created_at).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <h3 className="mb-2 text-sm font-semibold text-red-400">Zona Bahaya</h3>
        <p className="mb-4 text-xs text-slate-400">
          Keluar dari akun Anda. Anda perlu login kembali untuk mengakses platform.
        </p>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/30 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Keluar dari Akun
        </button>
      </div>
    </div>
  );
}

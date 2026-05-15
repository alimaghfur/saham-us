"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { User, Mail, Calendar, Shield, LogOut, Pencil, Save, X, Lock, Check } from "lucide-react";

export default function AccountPage() {
  const { user, logout, setUser } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Change password state
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  async function handleSaveProfile() {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName || null,
          username: username || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Gagal menyimpan profil");
      }

      const updatedUser = await res.json();
      setUser(updatedUser);
      setEditing(false);
      setSuccess("Profil berhasil diperbarui!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPwError("");
    setPwSuccess("");
    setPwSaving(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/auth/me/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Gagal mengubah password");
      }

      setPwSuccess("Password berhasil diubah!");
      setCurrentPassword("");
      setNewPassword("");
      setChangingPassword(false);
      setTimeout(() => setPwSuccess(""), 3000);
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditing(false);
    setFullName(user?.full_name || "");
    setUsername(user?.username || "");
    setError("");
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

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}
      {pwSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          <Check className="h-4 w-4" />
          {pwSuccess}
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
        <div className="flex items-start justify-between">
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
              </div>
            </div>
          </div>

          {/* Edit Button */}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-400"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="mt-6 space-y-4 border-t border-slate-800 pt-6">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                minLength={3}
                maxLength={50}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Simpan
              </button>
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Details */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Informasi Akun
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
              <Mail className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm font-medium text-white">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
              <User className="h-4 w-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Username</p>
              <p className="text-sm font-medium text-white">@{user.username}</p>
            </div>
          </div>

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

      {/* Change Password */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Keamanan
            </h3>
            <p className="mt-1 text-xs text-slate-500">Ubah password akun Anda</p>
          </div>
          {!changingPassword && (
            <button
              onClick={() => setChangingPassword(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-400"
            >
              <Lock className="h-3 w-3" />
              Ubah Password
            </button>
          )}
        </div>

        {changingPassword && (
          <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
            {pwError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {pwError}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Password Lama
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Password Baru
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                minLength={8}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleChangePassword}
                disabled={pwSaving || !currentPassword || newPassword.length < 8}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {pwSaving ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                Simpan Password
              </button>
              <button
                onClick={() => {
                  setChangingPassword(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setPwError("");
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                Batal
              </button>
            </div>
          </div>
        )}
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

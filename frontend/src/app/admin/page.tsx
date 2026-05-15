"use client";

import { useState, useEffect } from "react";
import { useAuthStore, User } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { Shield, Users, UserCheck, UserX, Crown, ChevronDown } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Redirect non-super_admin
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      router.replace("/");
    }
  }, [user, router]);

  // Fetch users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("/api/v1/auth/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 403) {
          router.replace("/");
          return;
        }
        if (!res.ok) throw new Error("Gagal memuat data user");
        const data = await res.json();
        setUsers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [router]);

  async function handleChangeRole(userId: string, newRole: string) {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/auth/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Gagal mengubah role");
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleStatus(userId: string, isActive: boolean) {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/auth/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Gagal mengubah status");
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (!user || user.role !== "super_admin") {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Manajemen User</h1>
          <p className="mt-1 text-sm text-slate-400">
            Kelola role dan status semua user (Super Admin only)
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5">
          <Crown className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-medium text-indigo-300">Super Admin</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/10 p-2">
              <Users className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{users.length}</p>
              <p className="text-xs text-slate-400">Total User</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <UserCheck className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {users.filter((u) => u.is_active).length}
              </p>
              <p className="text-xs text-slate-400">Aktif</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/10 p-2">
              <Shield className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {users.filter((u) => u.role === "super_admin").length}
              </p>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/30">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Bergabung
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-slate-800/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                      {(u.full_name || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {u.full_name || u.username}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.role === "super_admin" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-400">
                      <Crown className="h-3 w-3" />
                      Super Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                      <Shield className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.is_active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                      <UserCheck className="h-3 w-3" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                      <UserX className="h-3 w-3" />
                      Nonaktif
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(u.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id === user?.id ? (
                    <span className="text-xs text-slate-500">Anda</span>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {/* Toggle Role */}
                      <button
                        onClick={() =>
                          handleChangeRole(
                            u.id,
                            u.role === "super_admin" ? "admin" : "super_admin",
                          )
                        }
                        disabled={actionLoading === u.id}
                        className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-violet-500/50 hover:text-violet-400 disabled:opacity-50"
                      >
                        {u.role === "super_admin" ? "Jadikan Admin" : "Jadikan Super Admin"}
                      </button>
                      {/* Toggle Active */}
                      <button
                        onClick={() => handleToggleStatus(u.id, !u.is_active)}
                        disabled={actionLoading === u.id}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                          u.is_active
                            ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                            : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                        }`}
                      >
                        {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

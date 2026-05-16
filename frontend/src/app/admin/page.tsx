"use client";

import { useState, useEffect } from "react";
import { useAuthStore, User } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { Shield, Users, UserCheck, UserX, Crown, Plus, Pencil, Trash2, X, Save, Eye, EyeOff } from "lucide-react";

type ModalMode = "add" | "edit" | null;

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "super_admin">("admin");
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { if (user && user.role !== "super_admin") router.replace("/"); }, [user, router]);
  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/auth/users", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 403) { router.replace("/"); return; }
      if (!res.ok) throw new Error("Gagal memuat data user");
      setUsers(await res.json());
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  function openAddModal() { setModalMode("add"); setEditingUser(null); setFormEmail(""); setFormUsername(""); setFormFullName(""); setFormPassword(""); setFormRole("admin"); setFormActive(true); setFormError(""); setShowPassword(false); }
  function openEditModal(u: User) { setModalMode("edit"); setEditingUser(u); setFormEmail(u.email); setFormUsername(u.username); setFormFullName(u.full_name || ""); setFormPassword(""); setFormRole(u.role); setFormActive(u.is_active); setFormError(""); setShowPassword(false); }
  function closeModal() { setModalMode(null); setEditingUser(null); setFormError(""); }

  async function handleSubmit() {
    setFormError(""); setFormSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      if (modalMode === "add") {
        if (!formEmail || !formUsername || !formPassword) throw new Error("Email, username, dan password wajib diisi");
        const res = await fetch("/api/v1/auth/users", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: formEmail, username: formUsername, password: formPassword, full_name: formFullName || null, role: formRole }) });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || "Gagal menambahkan user"); }
        const newUser = await res.json();
        setUsers((prev) => [newUser, ...prev]);
      } else if (modalMode === "edit" && editingUser) {
        const payload: any = {};
        if (formEmail !== editingUser.email) payload.email = formEmail;
        if (formUsername !== editingUser.username) payload.username = formUsername;
        if (formFullName !== (editingUser.full_name || "")) payload.full_name = formFullName || null;
        if (formRole !== editingUser.role) payload.role = formRole;
        if (formActive !== editingUser.is_active) payload.is_active = formActive;
        if (formPassword) payload.password = formPassword;
        const res = await fetch(`/api/v1/auth/users/${editingUser.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || "Gagal mengupdate user"); }
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      }
      closeModal();
    } catch (err: any) { setFormError(err.message); } finally { setFormSaving(false); }
  }

  async function handleDelete(userId: string) {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/auth/users/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || "Gagal menghapus user"); }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
    } catch (err: any) { alert(err.message); } finally { setActionLoading(null); }
  }

  if (!user || user.role !== "super_admin") return null;
  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Manajemen User</h1><p className="mt-1 text-sm text-slate-400">Tambah, edit, dan hapus user (Super Admin only)</p></div>
        <button onClick={openAddModal} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"><Plus className="h-4 w-4" />Tambah User</button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-indigo-500/10 p-2"><Users className="h-5 w-5 text-indigo-400" /></div><div><p className="text-2xl font-bold text-white">{users.length}</p><p className="text-xs text-slate-400">Total User</p></div></div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-green-500/10 p-2"><UserCheck className="h-5 w-5 text-green-400" /></div><div><p className="text-2xl font-bold text-white">{users.filter((u) => u.is_active).length}</p><p className="text-xs text-slate-400">Aktif</p></div></div></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-violet-500/10 p-2"><Shield className="h-5 w-5 text-violet-400" /></div><div><p className="text-2xl font-bold text-white">{users.filter((u) => u.role === "super_admin").length}</p><p className="text-xs text-slate-400">Super Admin</p></div></div></div>
      </div>
      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <table className="w-full">
          <thead><tr className="border-b border-slate-800 bg-slate-800/30"><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">User</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Role</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Bergabung</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Aksi</th></tr></thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-slate-800/20">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">{(u.full_name || u.username).charAt(0).toUpperCase()}</div><div><p className="text-sm font-medium text-white">{u.full_name || u.username}</p><p className="text-xs text-slate-500">{u.email}</p></div></div></td>
                <td className="px-4 py-3">{u.role === "super_admin" ? <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-400"><Crown className="h-3 w-3" />Super Admin</span> : <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400"><Shield className="h-3 w-3" />Admin</span>}</td>
                <td className="px-4 py-3">{u.is_active ? <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400"><UserCheck className="h-3 w-3" />Aktif</span> : <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400"><UserX className="h-3 w-3" />Nonaktif</span>}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-3 text-right">{u.id === user?.id ? <span className="text-xs text-slate-500">Anda</span> : <div className="flex items-center justify-end gap-2"><button onClick={() => openEditModal(u)} className="rounded-lg border border-slate-700 p-1.5 text-slate-400 transition-colors hover:border-indigo-500/50 hover:text-indigo-400" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>{deleteConfirm === u.id ? <div className="flex items-center gap-1"><button onClick={() => handleDelete(u.id)} disabled={actionLoading === u.id} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50">Hapus</button><button onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-white">Batal</button></div> : <button onClick={() => setDeleteConfirm(u.id)} className="rounded-lg border border-red-500/30 p-1.5 text-red-400 transition-colors hover:bg-red-500/10" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>}</div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalMode && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">{modalMode === "add" ? "Tambah User Baru" : "Edit User"}</h2><button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button></div>
            {formError && <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">{formError}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="mb-1 block text-xs font-medium text-slate-400">Email *</label><input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@example.com" className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none" /></div><div><label className="mb-1 block text-xs font-medium text-slate-400">Username *</label><input type="text" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="username" className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none" /></div></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-400">Nama Lengkap</label><input type="text" value={formFullName} onChange={(e) => setFormFullName(e.target.value)} placeholder="Opsional" className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-400">Password {modalMode === "add" ? "*" : "(kosongkan jika tidak diubah)"}</label><div className="relative"><input type={showPassword ? "text" : "password"} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder={modalMode === "add" ? "Min 8 karakter" : "Kosongkan jika tidak diubah"} className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 pr-10 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="mb-1 block text-xs font-medium text-slate-400">Role</label><select value={formRole} onChange={(e) => setFormRole(e.target.value as any)} className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></div>{modalMode === "edit" && <div><label className="mb-1 block text-xs font-medium text-slate-400">Status</label><select value={formActive ? "active" : "inactive"} onChange={(e) => setFormActive(e.target.value === "active")} className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></div>}</div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3"><button onClick={closeModal} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">Batal</button><button onClick={handleSubmit} disabled={formSaving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{formSaving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save className="h-4 w-4" />}{modalMode === "add" ? "Tambah" : "Simpan"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

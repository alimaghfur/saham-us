"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { Shield, Check, X, Save, RotateCcw, Crown } from "lucide-react";

interface MenuInfo {
  path: string;
  name: string;
  section: string;
}

export default function MenuSettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [allMenus, setAllMenus] = useState<MenuInfo[]>([]);
  const [allowedMenus, setAllowedMenus] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.role !== "super_admin") router.replace("/");
  }, [user, router]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const token = localStorage.getItem("access_token");
      const [menusRes, accessRes] = await Promise.all([
        fetch("/api/v1/menu-access/all-menus", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/v1/menu-access/admin", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!menusRes.ok || !accessRes.ok) throw new Error("Gagal memuat data");
      const menus = await menusRes.json();
      const access = await accessRes.json();
      setAllMenus(menus);
      setAllowedMenus(access.allowed_menus);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleMenu(path: string) {
    setAllowedMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  }

  function selectAll() {
    setAllowedMenus(allMenus.map((m) => m.path));
  }

  function deselectAll() {
    // Always keep Dashboard and Account
    setAllowedMenus(["/", "/account"]);
  }

  function selectSection(section: string) {
    const sectionPaths = allMenus.filter((m) => m.section === section).map((m) => m.path);
    setAllowedMenus((prev) => [...new Set([...prev, ...sectionPaths])]);
  }

  function deselectSection(section: string) {
    const sectionPaths = allMenus.filter((m) => m.section === section).map((m) => m.path);
    // Don't remove Dashboard and Account
    setAllowedMenus((prev) => prev.filter((p) => !sectionPaths.includes(p) || p === "/" || p === "/account"));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/menu-access/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allowed_menus: allowedMenus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Gagal menyimpan");
      }
      setSuccess("Pengaturan akses menu berhasil disimpan!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user || user.role !== "super_admin") return null;
  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" /></div>;

  // Group menus by section
  const sections = [...new Set(allMenus.map((m) => m.section))];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pengaturan Akses Menu</h1>
          <p className="mt-1 text-sm text-slate-400">
            Atur menu mana saja yang bisa diakses oleh role <span className="font-semibold text-blue-400">Admin</span>. Super Admin selalu punya akses penuh.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5">
          <Crown className="h-4 w-4 text-violet-400" />
          <span className="text-xs font-medium text-violet-300">Super Admin Only</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
          <div>
            <p className="text-sm font-medium text-indigo-300">Cara Kerja Akses Menu</p>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
              <li>• <strong className="text-violet-400">Super Admin</strong> — Selalu bisa akses semua menu (tidak bisa dibatasi)</li>
              <li>• <strong className="text-blue-400">Admin</strong> — Hanya bisa akses menu yang dicentang di bawah</li>
              <li>• Menu yang tidak dicentang akan disembunyikan dari sidebar dan diblokir aksesnya</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Success/Error */}
      {success && <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300"><Check className="h-4 w-4" />{success}</div>}
      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <button onClick={selectAll} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-green-500/50 hover:text-green-400">
          Pilih Semua
        </button>
        <button onClick={deselectAll} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-red-500/50 hover:text-red-400">
          Hapus Semua
        </button>
        <div className="ml-auto text-xs text-slate-500">
          {allowedMenus.length} / {allMenus.length} menu aktif
        </div>
      </div>

      {/* Menu Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const sectionMenus = allMenus.filter((m) => m.section === section);
          const allChecked = sectionMenus.every((m) => allowedMenus.includes(m.path));
          const someChecked = sectionMenus.some((m) => allowedMenus.includes(m.path));

          return (
            <div key={section} className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => allChecked ? deselectSection(section) : selectSection(section)}
                    className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                      allChecked
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : someChecked
                          ? "border-indigo-500/50 bg-indigo-600/30 text-indigo-400"
                          : "border-slate-600 bg-slate-800 text-transparent hover:border-slate-500"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-semibold text-white">{section}</span>
                  <span className="rounded-md bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {sectionMenus.filter((m) => allowedMenus.includes(m.path)).length}/{sectionMenus.length}
                  </span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="divide-y divide-slate-800/50">
                {sectionMenus.map((menu) => {
                  const checked = allowedMenus.includes(menu.path);
                  const isRequired = menu.path === "/" || menu.path === "/account";
                  return (
                    <label
                      key={menu.path}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-800/30 ${isRequired ? "opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isRequired}
                        onChange={() => !isRequired && toggleMenu(menu.path)}
                        className="hidden"
                      />
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        checked
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-slate-600 bg-slate-800"
                      }`}>
                        {checked && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <span className="text-sm text-slate-300">{menu.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-slate-600">{menu.path}</span>
                      {isRequired && <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-400">Wajib</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save className="h-4 w-4" />}
          Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}

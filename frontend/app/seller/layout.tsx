"use client";
/**
 * Seller/Gift Hub Layout — Teal brand (#0D9488)
 * Desktop: fixed left sidebar | Mobile: hamburger + bottom tab bar
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

// ── Seller brand: Teal ────────────────────────────────────────────────────────
const S_PRIMARY = "#0D9488";   // Teal
const S_DARK    = "#0D1F1E";   // Deep teal-dark sidebar

const NAV = [
  { href: "/seller",                  label: "Overview",           icon: "📊" },
  { href: "/seller/products",         label: "Products",           icon: "🎁" },
  { href: "/seller/orders",           label: "Gift Orders",        icon: "💌" },
  { href: "/seller/marketplace",      label: "Marketplace",        icon: "📦" },
  { href: "/seller/analytics",        label: "Analytics",          icon: "📈" },
  { href: "/seller/setup",            label: "Store Setup",        icon: "⚙️" },
];

const BOTTOM_TABS = [
  { href: "/seller",           label: "Overview",  icon: "📊" },
  { href: "/seller/products",  label: "Products",  icon: "🎁" },
  { href: "/seller/orders",    label: "Orders",    icon: "💌" },
  { href: "/seller/analytics", label: "Analytics", icon: "📈" },
  { href: "/seller/setup",     label: "Setup",     icon: "⚙️" },
];

function SidebarContent({ path, onClose }: { path: string; onClose?: () => void }) {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  return (
    <>
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: `${S_PRIMARY}40` }}>
              🎁
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-wide">Seller Hub</p>
              <p className="text-teal-300 text-[10px] truncate max-w-[130px] opacity-80">
                {user?.email || "seller@snapshare.in"}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-teal-300">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV.map(item => {
          const active = item.href === "/seller" ? path === "/seller" : path.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active ? "text-white" : "text-teal-300 hover:text-white hover:bg-white/8"
              }`}
              style={active ? {
                background: `linear-gradient(135deg, ${S_PRIMARY}, #14B8A6)`,
                boxShadow: `0 4px 15px ${S_PRIMARY}40`,
              } : {}}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 space-y-1">
        <Link href="/dashboard/overview"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-teal-300 hover:text-white hover:bg-white/8 transition-all">
          <LayoutDashboard size={16} /> Main Dashboard
        </Link>
        <button
          onClick={() => { clearAuth(); router.push("/login"); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </>
  );
}

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "#F0FDFB" }}>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 min-h-screen flex-col flex-shrink-0"
        style={{ background: S_DARK }}>
        <SidebarContent path={path} />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)} />
          <aside className="relative z-10 w-64 flex flex-col shadow-2xl"
            style={{ background: S_DARK }}>
            <SidebarContent path={path} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-teal-100 shadow-sm bg-white">
          <button onClick={() => setOpen(true)}
            className="p-2 rounded-xl hover:bg-teal-50 transition-colors"
            style={{ color: S_PRIMARY }}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span>🎁</span>
            <span className="font-bold text-sm" style={{ color: S_PRIMARY }}>Seller Hub</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom tabs */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100">
          <div className="flex">
            {BOTTOM_TABS.map(tab => {
              const active = tab.href === "/seller" ? path === "/seller" : path.startsWith(tab.href);
              return (
                <Link key={tab.href} href={tab.href}
                  className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-semibold transition-colors ${
                    active ? "" : "text-gray-400"
                  }`}
                  style={active ? { color: S_PRIMARY } : {}}>
                  <span className="text-lg leading-tight">{tab.icon}</span>
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

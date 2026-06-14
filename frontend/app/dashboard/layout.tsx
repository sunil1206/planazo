"use client";
import { useAuthStore } from "@/stores/authStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Images, Settings, LogOut,
  Plus, Users, CreditCard, Sparkles, CheckSquare,
  DollarSign, UserCheck, Store, X, Menu, Gift,
} from "lucide-react";

const navItems = [
  { href: "/dashboard/overview",        label: "My Wedding",         icon: LayoutDashboard, section: "main",  emoji: "💍" },
  { href: "/dashboard/invites",         label: "Weddings",           icon: Plus,            section: "main",  emoji: "🎴" },
  { href: "/dashboard/birthdays",       label: "Birthdays",          icon: Users,           section: "main",  emoji: "🎂" },
  { href: "/dashboard/gallery-v2",      label: "Gallery & AI",       icon: Images,          section: "main",  emoji: "📷" },
  { href: "/dashboard/checklist",       label: "Checklist",          icon: CheckSquare,     section: "plan",  emoji: "✅" },
  { href: "/dashboard/budget",          label: "Budget",             icon: DollarSign,      section: "plan",  emoji: "💰" },
  { href: "/dashboard/guests",          label: "Guest List",         icon: UserCheck,       section: "plan",  emoji: "👥" },
  { href: "/dashboard/vendor-manager",  label: "My Vendors",         icon: Store,           section: "plan",  emoji: "🤝" },
  { href: "/dashboard/vendors",         label: "Find Vendors",       icon: Users,           section: "plan",  emoji: "🔍" },
  { href: "/dashboard/planner",         label: "AI Planner",         icon: Sparkles,        section: "plan",  emoji: "✨" },
  { href: "/dashboard/gifts",           label: "Schedule Gifts",     icon: Gift,            section: "gifts", emoji: "🎁" },
  { href: "/shop",                      label: "Gift Shop",          icon: Gift,            section: "gifts", emoji: "🛍️" },
  { href: "/dashboard/settings",        label: "Settings",           icon: Settings,        section: "other", emoji: "⚙️" },
];

// Bottom tabs shown on mobile (most used items)
const bottomTabs = [
  { href: "/dashboard/overview",   icon: LayoutDashboard, label: "Home" },
  { href: "/dashboard/invites",    icon: Plus,            label: "Wedding" },
  { href: "/dashboard/guests",     icon: UserCheck,       label: "Guests" },
  { href: "/dashboard/budget",     icon: DollarSign,      label: "Budget" },
  { href: "/dashboard/checklist",  icon: CheckSquare,     label: "Tasks" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();

  const [mounted,    setMounted]    = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push("/login");
  }, [mounted, isAuthenticated]);

  // Close sidebar when route changes (mobile nav)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!mounted) return null;
  if (!isAuthenticated) return null;

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#8B1A4A" }}>Planazo</h2>
          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{user?.email}</p>
        </div>
        {/* Close button — only visible on mobile */}
        <button onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {/* Main */}
        <div className="space-y-0.5">
          {navItems.filter(n => n.section === "main").map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === href ? "bg-[#8B1A4A] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
              }`}>
              <Icon size={17} /> {label}
            </Link>
          ))}
        </div>

        {/* Planning Suite */}
        <div>
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-3 mb-1.5">
            Planning Suite
          </p>
          <div className="space-y-0.5">
            {navItems.filter(n => n.section === "plan").map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  pathname === href ? "bg-[#8B1A4A] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                }`}>
                <Icon size={17} /> {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Gifts & Shop */}
        <div>
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-3 mb-1.5">
            Gifts & Shop
          </p>
          <div className="space-y-0.5">
            {navItems.filter(n => n.section === "gifts").map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  pathname === href ? "bg-[#0D9488] text-white shadow-sm" : "text-gray-600 hover:bg-teal-50"
                }`}>
                <Icon size={17} /> {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer links */}
      <div className="p-3 border-t border-gray-100 space-y-0.5">
        <Link href="/seller"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-purple-600 hover:bg-purple-50">
          <span>🏪</span> Seller Dashboard
        </Link>
        <Link href="/vendor/portfolio"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-amber-600 hover:bg-amber-50">
          <span>🎪</span> Vendor Hub
        </Link>
        <Link href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
          <CreditCard size={16} /> Upgrade Plan
        </Link>
        <button
          onClick={() => { clearAuth(); router.push("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Desktop sidebar (lg+) ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-gray-100 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
          {/* Drawer */}
          <aside className="relative z-10 w-64 bg-white h-full flex flex-col shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
            <Menu size={20} />
          </button>
          <h2 className="font-bold text-base" style={{ color: "#8B1A4A" }}>Planazo</h2>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/dashboard/planner"
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50">
              <Sparkles size={18} />
            </Link>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {/* Extra bottom padding on mobile for the tab bar */}
          <div className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
            {children}
          </div>
        </main>

        {/* ── Mobile bottom tab bar ──────────────────────────────────────────── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
          <div className="flex">
            {bottomTabs.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                    active ? "text-[#8B1A4A]" : "text-gray-400"
                  }`}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  <span>{label}</span>
                  {active && <div className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[#8B1A4A]" />}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

"use client";
/**
 * Vendor Hub Layout — Royal Purple brand (#7C3AED)
 * Desktop: fixed left sidebar | Mobile: hamburger + bottom tab bar
 */
import { useAuthStore } from "@/stores/authStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Images, MessageSquare, LogOut, LayoutDashboard,
  Store, Package, Crown, Menu, X,
} from "lucide-react";

// ── Vendor brand: Royal Purple ────────────────────────────────────────────────
const V_PRIMARY = "#7C3AED";
const V_DARK    = "#1E1030";

const navItems = [
  { href: "/vendor/portfolio",    label: "My Portfolio", icon: Images        },
  { href: "/vendor/packages",     label: "Packages",     icon: Package       },
  { href: "/vendor/enquiries",    label: "Enquiries",    icon: MessageSquare },
  { href: "/vendor/subscription", label: "Subscription", icon: Crown         },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();

  const [mounted,     setMounted]     = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && !isAuthenticated) router.push("/login");
  }, [mounted, isAuthenticated]);
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!mounted || !isAuthenticated) return null;

  const SidebarContent = () => (
    <>
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: `${V_PRIMARY}40` }}>
              🎪
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-wide">Vendor Hub</p>
              <p className="text-purple-300 text-[10px] truncate max-w-[130px] opacity-80">
                {user?.email}
              </p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-purple-300">
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active ? "text-white" : "text-purple-300 hover:text-white hover:bg-white/8"
              }`}
              style={active ? {
                background: `linear-gradient(135deg, ${V_PRIMARY}, #9333EA)`,
                boxShadow: `0 4px 15px ${V_PRIMARY}40`,
              } : {}}>
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 space-y-1">
        <Link href="/dashboard/overview"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-purple-300 hover:text-white hover:bg-white/8 transition-all">
          <LayoutDashboard size={16} /> Couple Dashboard
        </Link>
        <button
          onClick={() => { clearAuth(); router.push("/login"); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F5F3FF" }}>

      <aside className="hidden lg:flex w-64 min-h-screen flex-col flex-shrink-0"
        style={{ background: V_DARK }}>
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 flex flex-col shadow-2xl"
            style={{ background: V_DARK }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-purple-100 shadow-sm bg-white">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-purple-50 transition-colors"
            style={{ color: V_PRIMARY }}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎪</span>
            <span className="font-bold text-sm" style={{ color: V_PRIMARY }}>Vendor Hub</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100">
          <div className="flex">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-semibold transition-colors ${
                    active ? "" : "text-gray-400"
                  }`}
                  style={active ? { color: V_PRIMARY } : {}}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  <span>{label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

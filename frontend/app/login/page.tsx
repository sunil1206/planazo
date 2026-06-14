"use client";
/**
 * /login — Role-differentiated login
 * Step 1: Pick your role (Couple / Vendor / Seller)
 * Step 2: Sign in with Google, Email, or Phone OTP
 *         — each role has its own brand color and panel copy
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

// ── 3-pillar brand system ─────────────────────────────────────────────────────
const ROLES = {
  couple: {
    label:     "User",
    emoji:     "💑",
    tagline:   "Plan your dream wedding",
    desc:      "Create digital invitations, manage guests, find vendors, and capture every moment.",
    features:  ["Digital Invitations", "Photo Gallery", "AI Planner", "Guest Management"],
    primary:   "#8B1A4A",
    secondary: "#C9952A",
    gradient:  "linear-gradient(135deg, #0D1B2A 0%, #8B1A4A 100%)",
    bg:        "#FFF5F7",
    redirect:  "/dashboard/overview",
  },
  vendor: {
    label:     "Vendor",
    emoji:     "🎪",
    tagline:   "Grow your wedding business",
    desc:      "Showcase your portfolio, manage packages, receive enquiries, and get discovered by couples.",
    features:  ["Portfolio Builder", "Package Management", "Enquiry Inbox", "Subscription Plans"],
    primary:   "#7C3AED",
    secondary: "#9333EA",
    gradient:  "linear-gradient(135deg, #1E1030 0%, #7C3AED 100%)",
    bg:        "#F5F3FF",
    redirect:  "/vendor/portfolio",
  },
  seller: {
    label:     "Gift Seller",
    emoji:     "🎁",
    tagline:   "Sell on India's wedding marketplace",
    desc:      "List your products, manage orders, and reach thousands of couples planning their big day.",
    features:  ["Product Listings", "Order Management", "Analytics Dashboard", "Gift Marketplace"],
    primary:   "#0D9488",
    secondary: "#14B8A6",
    gradient:  "linear-gradient(135deg, #0D1F1E 0%, #0D9488 100%)",
    bg:        "#F0FDFB",
    redirect:  "/seller/setup",
  },
} as const;

type RoleKey = keyof typeof ROLES;
type LoginTab = "google" | "email" | "phone";

const DEV_USERS = {
  couple: { user: { id:1, email:"couple@test.com", full_name:"Test Couple",  role:"COUPLE" as const, avatar_url:"", subscription_plan:"pro"  }, access:"dev_access_token",  refresh:"dev_refresh_token",  redirect:"/dashboard/overview" },
  vendor: { user: { id:2, email:"vendor@test.com", full_name:"Test Vendor",  role:"VENDOR" as const, avatar_url:"", subscription_plan:"free" }, access:"dev_vendor_token",  refresh:"dev_vendor_refresh",  redirect:"/vendor/portfolio"   },
  seller: { user: { id:3, email:"seller@test.com", full_name:"Test Seller",  role:"VENDOR" as const, avatar_url:"", subscription_plan:"free" }, access:"dev_seller_token",  refresh:"dev_seller_refresh",  redirect:"/seller/setup"       },
};

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ color = "white" }: { color?: string }) {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke={color} strokeWidth="4" />
      <path className="opacity-75" fill={color} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Step 1: Role picker ───────────────────────────────────────────────────────
function RolePicker({ onSelect }: { onSelect: (role: RoleKey) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1B0D2E 100%)" }}>

      {/* Logo */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">💍</div>
        <h1 className="text-3xl font-light tracking-wide text-white">Planazo</h1>
        <p className="text-white/50 text-xs uppercase tracking-[0.4em] mt-1">India's Wedding Platform</p>
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-white text-center text-lg font-semibold mb-2">
          Who are you?
        </h2>
        <p className="text-white/50 text-center text-sm mb-8">
          Choose your role to get the right experience
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          {(Object.entries(ROLES) as [RoleKey, typeof ROLES[RoleKey]][]).map(([key, role]) => (
            <button key={key} onClick={() => onSelect(key)}
              className="group flex flex-col items-center gap-4 p-6 rounded-3xl border-2 border-white/10 hover:border-white/30 transition-all text-center relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"
                style={{ background: `radial-gradient(circle at 50% 80%, ${role.primary}30, transparent 70%)` }} />

              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${role.primary}25`, border: `1px solid ${role.primary}40` }}>
                {role.emoji}
              </div>

              <div className="relative">
                <p className="text-white font-bold text-base">{role.label}</p>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">{role.tagline}</p>
              </div>

              <div className="relative flex flex-wrap gap-1.5 justify-center">
                {role.features.slice(0, 2).map(f => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${role.primary}30`, color: role.secondary }}>
                    {f}
                  </span>
                ))}
              </div>

              <div className="relative flex items-center gap-1 text-xs font-semibold transition-colors group-hover:opacity-100 opacity-70"
                style={{ color: role.secondary }}>
                Get started <span>→</span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-white/30 text-xs mt-8">
          Already have an account?{" "}
          <button onClick={() => onSelect("couple")}
            className="underline text-white/50 hover:text-white/70 transition-colors">
            Sign in as user
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Step 2: Auth form ─────────────────────────────────────────────────────────
function AuthForm({ roleKey, onBack }: { roleKey: RoleKey; onBack: () => void }) {
  const role    = ROLES[roleKey];
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [tab,   setTab]   = useState<LoginTab>("google");

  const devLogin = (type: keyof typeof DEV_USERS) => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    const { user, access, refresh, redirect } = DEV_USERS[type];
    setAuth(user, access, refresh);
    router.push(redirect);
  };

  // ── Google ─────────────────────────────────────────────────────────────────
  const GooglePanel = () => {
    const [loading, setLoading] = useState(false);
    const handleGoogle = () => {
      setLoading(true);
      // Initiate NextAuth Google OAuth flow
      window.location.href = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(role.redirect)}`;
    };
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500 text-center">
          Quick sign-in with your Google account
        </p>
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-2xl py-4 px-4 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50">
          {loading ? <Spinner color="#9CA3AF" /> : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <span>{loading ? "Redirecting…" : "Continue with Google"}</span>
        </button>
      </div>
    );
  };

  // ── Email ─────────────────────────────────────────────────────────────────
  const EmailPanel = () => {
    const [form,     setForm]     = useState({ email: "", password: "" });
    const [error,    setError]    = useState("");
    const [loading,  setLoading]  = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(""); setLoading(true);
      localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token");
      try {
        const data: any = await authApi.login(form);
        setAuth(data.user, data.access, data.refresh);
        router.push(data.user?.role === "VENDOR" ? (roleKey === "seller" ? "/seller/setup" : "/vendor/portfolio") : "/dashboard/overview");
      } catch (err: any) {
        const msg = await (err?.response?.json() as Promise<any> | undefined)?.catch(() => null) as any;
        setError(msg?.detail || msg?.non_field_errors?.[0] || "Invalid email or password");
      } finally { setLoading(false); }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
          <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
            style={{ "--tw-ring-color": role.primary } as any}
            onFocus={e => (e.target.style.borderColor = role.primary)}
            onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-500">Password</label>
            <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-gray-600">Forgot?</Link>
          </div>
          <div className="relative">
            <input type={showPass ? "text" : "password"} required value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors pr-10"
              onFocus={e => (e.target.style.borderColor = role.primary)}
              onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
            />
            <button type="button" onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${role.primary}, ${role.secondary})` }}>
          {loading ? <><Spinner /> Signing in…</> : "Sign In →"}
        </button>
      </form>
    );
  };

  // ── Phone OTP ─────────────────────────────────────────────────────────────
  const PhonePanel = () => {
    const [phase,     setPhase]     = useState<"phone" | "otp">("phone");
    const [phone,     setPhone]     = useState("");
    const [otp,       setOtp]       = useState("");
    const [devOtp,    setDevOtp]    = useState("");
    const [error,     setError]     = useState("");
    const [loading,   setLoading]   = useState(false);
    const [countdown, setCountdown] = useState(0);

    const startCountdown = () => {
      setCountdown(60);
      const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    };

    const handleSend = async () => {
      setError("");
      if (!phone.startsWith("+") || phone.length < 12) { setError("Enter a valid Indian number, e.g. +919876543210"); return; }
      setLoading(true);
      try {
        const res: any = await authApi.sendOtp(phone);
        setDevOtp(res.dev_otp || "");
        setPhase("otp"); startCountdown();
      } catch (err: any) {
        const msg = await (err?.response?.json() as Promise<any> | undefined)?.catch(() => null) as any;
        setError(msg?.detail || "Could not send OTP. Try again.");
      } finally { setLoading(false); }
    };

    const handleVerify = async () => {
      setError("");
      if (otp.length !== 6) { setError("Enter the 6-digit OTP."); return; }
      setLoading(true);
      try {
        const data: any = await authApi.verifyOtp({ phone, otp, role: roleKey === "couple" ? "COUPLE" : "VENDOR" });
        setAuth(data.user, data.access, data.refresh);
        router.push(data.user?.role === "VENDOR" ? (roleKey === "seller" ? "/seller/setup" : "/vendor/portfolio") : "/dashboard/overview");
      } catch (err: any) {
        const msg = await (err?.response?.json() as Promise<any> | undefined)?.catch(() => null) as any;
        setError(msg?.detail || "Incorrect OTP.");
      } finally { setLoading(false); }
    };

    if (phase === "phone") return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Mobile Number</label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-600 shrink-0">🇮🇳 +91</div>
            <input type="tel" value={phone.replace("+91", "")}
              onChange={e => { const n = e.target.value.replace(/\D/g,"").slice(0,10); setPhone(n ? `+91${n}` : ""); }}
              placeholder="9876543210" maxLength={10}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none"
              onFocus={e => (e.target.style.borderColor = role.primary)}
              onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        </div>
        <button type="button" onClick={handleSend} disabled={loading || phone.length < 12}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${role.primary}, ${role.secondary})` }}>
          {loading ? <><Spinner /> Sending OTP…</> : "Send OTP →"}
        </button>
        <p className="text-xs text-center text-gray-400">OTP via SMS to your registered number</p>
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
          <span>📱</span>
          <div>
            <p className="text-xs font-medium text-green-700">OTP sent to {phone}</p>
            <button onClick={() => { setPhase("phone"); setOtp(""); setError(""); }}
              className="text-xs text-green-600 underline">Change number</button>
          </div>
        </div>
        {devOtp && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-xs font-semibold text-amber-700">🧪 Dev mode OTP:</p>
            <p className="text-2xl font-mono font-bold tracking-widest text-amber-800 mt-1">{devOtp}</p>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">6-digit OTP</label>
          <input type="text" inputMode="numeric" maxLength={6} value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
            placeholder="• • • • • •"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg text-center tracking-widest font-mono focus:outline-none"
            onFocus={e => (e.target.style.borderColor = role.primary)}
            onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
          />
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        </div>
        <button type="button" onClick={handleVerify} disabled={loading || otp.length !== 6}
          className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${role.primary}, ${role.secondary})` }}>
          {loading ? <><Spinner /> Verifying…</> : "Verify & Sign In ✓"}
        </button>
        <div className="text-center">
          {countdown > 0
            ? <p className="text-xs text-gray-400">Resend in {countdown}s</p>
            : <button onClick={handleSend} className="text-xs underline" style={{ color: role.primary }}>Resend OTP</button>
          }
        </div>
      </div>
    );
  };

  const TAB_ITEMS: { id: LoginTab; label: string; icon: string }[] = [
    { id: "google", label: "Google", icon: "G" },
    { id: "email",  label: "Email",  icon: "✉" },
    { id: "phone",  label: "Phone",  icon: "📱" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: role.bg }}>

      {/* ── Left branding panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: role.gradient }}>
        <div className="absolute inset-0 opacity-15 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 30% 40%, ${role.secondary} 0%, transparent 50%), radial-gradient(circle at 70% 70%, ${role.secondary} 0%, transparent 40%)` }} />

        <div className="relative text-center text-white max-w-sm">
          <div className="text-5xl mb-5">{role.emoji}</div>
          <h1 className="text-4xl font-light tracking-wide mb-2">Planazo</h1>
          <p className="text-xs uppercase tracking-[0.4em] opacity-50 mb-6">India's Wedding Platform</p>
          <div className="w-12 h-px mx-auto mb-6" style={{ background: role.secondary }} />
          <h2 className="text-xl font-bold mb-2">{role.tagline}</h2>
          <p className="text-sm opacity-60 leading-relaxed mb-8">{role.desc}</p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 text-left">
            {role.features.map(f => (
              <div key={f} className="flex items-center gap-2 text-xs opacity-70">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: role.secondary }} />
                {f}
              </div>
            ))}
          </div>

          {/* Role badge */}
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
            style={{ background: `${role.secondary}30`, border: `1px solid ${role.secondary}50`, color: role.secondary }}>
            Signing in as {role.label}
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm">

          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-3xl mb-2">{role.emoji}</div>
            <h1 className="text-xl font-bold" style={{ color: role.primary }}>{role.label} Login</h1>
            <p className="text-sm text-gray-400 mt-1">{role.tagline}</p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            {/* Back + heading */}
            <div className="flex items-center gap-2 mb-5">
              <button onClick={onBack}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                ←
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Welcome back, {role.label}</h2>
                <p className="text-xs text-gray-400">Choose how you'd like to sign in</p>
              </div>
            </div>

            {/* Role indicator pill */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-5 text-xs font-semibold"
              style={{ background: `${role.primary}12`, color: role.primary }}>
              <span>{role.emoji}</span>
              <span>{role.label} Account</span>
              <button onClick={onBack} className="ml-auto underline opacity-60 hover:opacity-100">Change</button>
            </div>

            {/* Auth method tabs */}
            <div className="flex rounded-2xl p-1 mb-6" style={{ background: "#F3F4F6" }}>
              {TAB_ITEMS.map(({ id, label, icon }) => (
                <button key={id} type="button" onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    tab === id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  <span className="text-sm">{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {tab === "google" && <GooglePanel />}
            {tab === "email"  && <EmailPanel  />}
            {tab === "phone"  && <PhonePanel  />}

            {/* Sign up link */}
            <p className="text-center text-sm text-gray-400 mt-6">
              New to Planazo?{" "}
              <Link href={`/register?role=${roleKey}`}
                className="font-semibold hover:underline" style={{ color: role.primary }}>
                Create account
              </Link>
            </p>
          </div>

          {/* Dev bypass */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-3">🧪 Dev bypass — UI testing only</p>
            <div className="grid grid-cols-3 gap-2">
              {(["couple", "vendor", "seller"] as const).map(type => (
                <button key={type} onClick={() => devLogin(type)}
                  className="py-2 rounded-xl text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: ROLES[type].primary }}>
                  {ROLES[type].emoji} {ROLES[type].label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-amber-600 mt-2 leading-relaxed">
              ⚠️ No backend calls. Image upload, vendor creation &amp; AI require real login.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            By signing in you agree to our{" "}
            <span className="underline cursor-pointer">Terms</span> &{" "}
            <span className="underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page entry point ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const [role, setRole] = useState<RoleKey | null>(null);

  if (!role) return <RolePicker onSelect={setRole} />;
  return <AuthForm roleKey={role} onBack={() => setRole(null)} />;
}

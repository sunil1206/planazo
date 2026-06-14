"use client";
/**
 * /reset-password?token=<token>
 * Set a new password using the token from the reset email.
 */
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [form, setForm]       = useState({ password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]  = useState(false);
  const [error,   setError]    = useState("");
  const [done,    setDone]     = useState(false);

  // No token in URL — redirect to forgot-password
  useEffect(() => {
    if (!token) router.replace("/forgot-password");
  }, [token]);

  const passChecks = [
    form.password.length >= 8,
    /[A-Z]/.test(form.password),
    /[0-9]/.test(form.password),
    /[^A-Za-z0-9]/.test(form.password),
  ];
  const passStrength = passChecks.filter(Boolean).length;
  const passColor = ["#EF4444", "#F97316", "#EAB308", "#84CC16", "#22C55E"][passStrength];
  const passLabel = ["Too short", "Weak", "Fair", "Good", "Strong ✓"][passStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      setDone(true);
      // Auto-redirect to login after 3 seconds
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      const msg = await (err?.response?.json() as Promise<any> | undefined)?.catch(() => null) as any;
      setError(msg?.detail || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1B0D2E 60%, #0D1F1E 100%)" }}>

      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "#8B1A4A" }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "#0D9488" }} />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎊</div>
          <h1 className="text-2xl font-light tracking-wide text-white">Planazo</h1>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">

          {!done ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-1">Set new password</h2>
                <p className="text-sm text-gray-400">Choose a strong password for your account.</p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-sm text-red-600">{error}</p>
                  {error.includes("expired") && (
                    <Link href="/forgot-password"
                      className="text-xs font-medium underline mt-1 block"
                      style={{ color: "#8B1A4A" }}>
                      Request a new reset link →
                    </Link>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">New password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"} required
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="Min. 8 characters"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm outline-none transition-colors"
                      onFocus={e => { e.target.style.borderColor = "#8B1A4A"; e.target.style.boxShadow = "0 0 0 3px #8B1A4A15"; }}
                      onBlur={e  => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }}
                    />
                    <button type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* Password strength */}
                {form.password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {passChecks.map((ok, i) => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all"
                          style={{ background: ok ? passColor : "#E5E7EB" }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: passColor }}>{passLabel}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Confirm password</label>
                  <input
                    type={showPass ? "text" : "password"} required
                    value={form.confirm}
                    onChange={e => setForm({ ...form, confirm: e.target.value })}
                    placeholder="Repeat your password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    onFocus={e => { e.target.style.borderColor = form.confirm && form.confirm !== form.password ? "#EF4444" : "#8B1A4A"; e.target.style.boxShadow = "0 0 0 3px #8B1A4A15"; }}
                    onBlur={e  => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }}
                  />
                  {form.confirm && form.confirm !== form.password && (
                    <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                  )}
                </div>

                <button type="submit" disabled={loading || form.password !== form.confirm || form.password.length < 8}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #8B1A4A, #C9952A)" }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Updating...
                    </span>
                  ) : "Update Password →"}
                </button>
              </form>
            </>
          ) : (
            /* ── Success state ── */
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                style={{ background: "#F0FFF4" }}>
                ✅
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Password updated!</h2>
              <p className="text-sm text-gray-400 mb-6">
                Your password has been changed successfully. Redirecting you to sign in...
              </p>
              <Link href="/login"
                className="inline-block px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8B1A4A, #C9952A)" }}>
                Sign In Now →
              </Link>
            </div>
          )}

          {!done && (
            <div className="mt-6 text-center">
              <Link href="/login"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1B0D2E 100%)" }}>
        <div className="text-white text-2xl animate-pulse">🎊</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

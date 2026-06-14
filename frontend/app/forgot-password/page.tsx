"use client";
/**
 * /forgot-password
 * Request a password reset link via email.
 * Works across all 3 pillars — dark gradient background, neutral branding.
 */
import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/lib/api";

type Step = "form" | "sent";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [step,    setStep]    = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [devInfo, setDevInfo] = useState<{ token?: string; url?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res: any = await authApi.forgotPassword(email.trim().toLowerCase());
      // Dev mode — backend returns token directly
      if (res.dev_token) {
        setDevInfo({ token: res.dev_token, url: res.dev_reset_url });
      }
      setStep("sent");
    } catch (err: any) {
      const msg = await (err?.response?.json() as Promise<any> | undefined)?.catch(() => null) as any;
      setError(msg?.detail || "Something went wrong. Please try again.");
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

          {step === "form" ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-1">Forgot password?</h2>
                <p className="text-sm text-gray-400">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Email address</label>
                  <input
                    type="email" required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    onFocus={e => { e.target.style.borderColor = "#8B1A4A"; e.target.style.boxShadow = "0 0 0 3px #8B1A4A15"; }}
                    onBlur={e  => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #8B1A4A, #C9952A)" }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending...
                    </span>
                  ) : "Send Reset Link →"}
                </button>
              </form>
            </>
          ) : (
            /* ── Sent confirmation ── */
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                  style={{ background: "#FFF5F7" }}>
                  📬
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Check your inbox</h2>
                <p className="text-sm text-gray-400">
                  If <span className="font-medium text-gray-600">{email}</span> has an account,
                  a reset link has been sent. Check your spam folder too.
                </p>
              </div>

              {/* Dev mode panel */}
              {devInfo && (
                <div className="mb-4 p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50">
                  <p className="text-xs font-bold text-amber-700 mb-2">🛠 Dev Mode — No email server configured</p>
                  <p className="text-xs text-amber-600 mb-2 break-all">Token: <code className="bg-amber-100 px-1 rounded">{devInfo.token}</code></p>
                  {devInfo.url && (
                    <Link href={devInfo.url.replace("http://localhost:3000", "")}
                      className="text-xs font-semibold text-amber-700 underline hover:text-amber-900">
                      → Click here to reset password directly
                    </Link>
                  )}
                </div>
              )}

              <button
                onClick={() => { setStep("form"); setEmail(""); setDevInfo(null); }}
                className="w-full py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Try a different email
              </button>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/login"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

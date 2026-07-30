import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../context/useAuth'
import { getErrorMessage } from '../lib/api'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// google.accounts.id.initialize() must run at most once per page load (Google
// warns/misbehaves — extra origin-check 403s — if it's called again), but
// StrictMode's mount→cleanup→mount would otherwise call it twice since a
// successful init has nothing to clean up. Module-level guards make the
// "only once" rule survive that, plus any real remount of this component.
let googleIdInitialized = false
let currentCredentialHandler = null

// Loads Google's gsi/client script (declared in index.html) before we try to use it.
function useGoogleIdentityServices(onCredential) {
  const buttonHostRef = useRef(null)
  // Tracks whether Google's real button has actually finished rendering into
  // buttonHostRef — renderButton() itself returns immediately, but the real
  // <div role="button"> wrapper (and the iframe inside it) can take a beat
  // to appear. Without this, a user who clicks "Sign in with Google" within
  // that window gets a false "still loading" error even though everything
  // is about to work fine — see handleGoogle() below, which now disables
  // the button until this flips true instead of racing it.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    currentCredentialHandler = onCredential
    return () => { if (currentCredentialHandler === onCredential) currentCredentialHandler = null }
  })

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let cancelled = false

    function init() {
      if (cancelled || !window.google?.accounts?.id || !buttonHostRef.current) return false
      if (!googleIdInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => currentCredentialHandler?.(response.credential),
        })
        googleIdInitialized = true
      }
      // Real Google button rendered off-screen — our own custom-styled button
      // triggers a click on it, so we never touch its required branding/markup.
      window.google.accounts.id.renderButton(buttonHostRef.current, { type: 'standard' })
      if (!cancelled) setReady(true)
      return true
    }

    if (!init()) {
      const id = setInterval(() => { if (init()) clearInterval(id) }, 200)
      return () => { cancelled = true; clearInterval(id) }
    }
  }, [])

  const trigger = useCallback(() => {
    const realButton = buttonHostRef.current?.querySelector('div[role="button"]')
    if (!realButton) return false
    realButton.click()
    return true
  }, [])

  return { buttonHostRef, trigger, ready }
}

// ── Prevent browser autofill while keeping click-to-suggest behaviour ────────
// Sets readOnly on mount (blocks autofill); removes it on first focus so the
// user can type and the browser still shows a suggestion dropdown on click.
function usePreventAutofill() {
  const [ready, setReady] = useState(false)
  return { readOnly: !ready, onFocus: () => setReady(true) }
}

const USER_TYPES = [
  { value: 'user',        label: 'User',        desc: 'Planning an event' },
  { value: 'vendor',      label: 'Vendor',      desc: 'Offering wedding services' },
  { value: 'gift_seller', label: 'Gift Seller',  desc: 'Selling gifts & products' },
]

const ROLE_CHIP = {
  user:        { label: 'User Account',        emoji: '🌸', bg: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.22)', color: '#f9a8d4' },
  vendor:      { label: 'Vendor Account',      emoji: '🏪', bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.22)', color: '#d8b4fe' },
  gift_seller: { label: 'Gift Seller Account', emoji: '🎁', bg: 'rgba(20,184,166,0.10)',  border: 'rgba(20,184,166,0.22)', color: '#5eead4' },
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function EyeOpen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosed() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// ── Password input ────────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder, show, onToggle, id, autoComplete, readOnly, onFocus }) {
  return (
    <div className="relative">
      {/*
        key forces React to mount a new <input> element when `show` changes.
        Without this, some browsers (Safari, older Chrome) silently refuse to
        change type from "password" to "text" on the same DOM node.
      */}
      <input
        key={`${id}-${show}`}
        id={id}
        type={show ? 'text' : 'password'}
        required
        placeholder={placeholder}
        className="glass-input pr-11"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        onFocus={onFocus}
        autoComplete={show ? 'off' : autoComplete}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2
          flex items-center justify-center w-8 h-8 rounded-lg
          text-white/60 hover:text-white hover:bg-white/[0.09]
          transition-all duration-150 cursor-pointer"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOpen /> : <EyeClosed />}
      </button>
    </div>
  )
}

// ── Role chip display ─────────────────────────────────────────────────────────
function RoleChip({ role, onNavigate }) {
  const chip = ROLE_CHIP[role]
  if (!chip) return null
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
      style={{ background: chip.bg, border: `1px solid ${chip.border}` }}>
      <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: chip.color }}>
        <span>{chip.emoji}</span>
        {chip.label}
      </span>
      <button type="button" onClick={onNavigate}
        className="text-[12px] font-semibold opacity-65 hover:opacity-100 transition-opacity bg-transparent border-0 p-0 cursor-pointer"
        style={{ color: chip.color }}>
        Change
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()
  const { login, register, loginWithGoogle } = useAuth()
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  // Login form
  const [loginEmail, setLoginEmail]     = useState('')
  const [loginPwd, setLoginPwd]         = useState('')
  const [showLoginPwd, setShowLoginPwd] = useState(false)
  const [loginUserType, setLoginUserType] = useState('')
  // Always false now — no backend endpoint exists to auto-detect role by email (see handleEmailBlur).
  const [roleFetching]                    = useState(false)
  const loginEmailAF   = usePreventAutofill()
  const loginPwdAF     = usePreventAutofill()

  // Signup form
  const [signupFullName, setSignupFullName] = useState('')
  const [signupEmail, setSignupEmail]       = useState('')
  const [signupPwd, setSignupPwd]           = useState('')
  const [signupConfirm, setSignupConfirm]   = useState('')
  const [showSignupPwd, setShowSignupPwd]   = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [signupUserType, setSignupUserType] = useState('')
  const signupNameAF    = usePreventAutofill()
  const signupEmailAF   = usePreventAutofill()
  const signupPwdAF     = usePreventAutofill()
  const signupConfirmAF = usePreventAutofill()

  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get('role')
    if (role && USER_TYPES.find(t => t.value === role)) {
      setLoginUserType(role)
      setSignupUserType(role)
    }
  }, [])

  const flip = (toSignup) => { setError(''); setSuccess(''); setFlipped(toSignup) }

  // Backend has no public "look up role by email" endpoint (it would leak account
  // existence pre-auth), so this can no longer auto-detect — user selects manually.
  const handleEmailBlur = () => {}

  const handleLogin = async () => {
    setError('')
    if (!loginUserType) { setError('Please select your account type to continue'); return }
    setLoading(true)
    try {
      await login(loginEmail, loginPwd, loginUserType)
      navigate('/home')
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password'))
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    setError('')
    if (!signupUserType) { setError('Please select your account type to continue'); return }
    if (!signupFullName.trim()) { setError('Please enter your full name'); return }
    if (signupPwd !== signupConfirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await register(signupEmail, signupPwd, signupFullName.trim(), signupUserType)
      navigate('/home')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create account'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = async (idToken) => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle(idToken, loginUserType)
      navigate('/home')
    } catch (err) {
      setError(getErrorMessage(err, 'Google sign-in failed'))
    } finally {
      setLoading(false)
    }
  }

  const { buttonHostRef: googleButtonHostRef, trigger: triggerGoogle, ready: googleReady } = useGoogleIdentityServices(handleGoogleCredential)

  const handleGoogle = () => {
    setError('')
    if (!loginUserType) { setError('Please select your account type to continue'); return }
    // The button is disabled while !googleReady (see below), so reaching
    // here with triggerGoogle() still failing is a genuine problem, not the
    // race this used to be — e.g. Google's script never loaded at all.
    if (!GOOGLE_CLIENT_ID || !triggerGoogle()) {
      setError('Google sign-in is unavailable right now — please use email/password, or refresh and try again.')
    }
  }

  return (
    <div className="relative min-h-screen flex items-start sm:items-center justify-center bg-[#060412] overflow-x-hidden overflow-y-auto px-4 py-5 sm:py-8">

      {/* ── Animated background ───────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="bg-orb orb-purple" />
        <div className="bg-orb orb-blue" />
        <div className="bg-orb orb-pink" />
        <div className="grid-lines" />
        <div className="noise-overlay" />
      </div>

      {/* ── Loading overlay ───────────────────────────────────── */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/65 backdrop-blur-md">
          <div className="relative flex items-center justify-center">
            <div className="loading-ring-outer" />
            <div className="loading-ring-inner" />
            <img src={logo} alt="Planazo" className="w-[72px] h-[72px] relative z-10 logo-pulse" />
          </div>
          <p className="mt-7 text-white/40 text-[11px] tracking-[0.25em] uppercase font-medium animate-pulse select-none">
            Loading
          </p>
        </div>
      )}

      {/* ── Flip card ─────────────────────────────────────────── */}
      <div className="relative w-full max-w-[440px] sm:my-auto" style={{ perspective: '1400px' }}>
        <div className="flip-inner" style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

          {/* ── FRONT: Sign In ─────────────────────────────────── */}
          <div className="flip-face glass-card">
            <div className="p-4 sm:p-6 flex flex-col">

              <div className="flex flex-col items-center mb-3 sm:mb-5">
                <img src={logo} alt="Planazo" className="w-9 h-9 sm:w-11 sm:h-11 mb-2 drop-shadow-[0_0_18px_rgba(139,92,246,0.55)]" />
                <h1 className="text-[18px] sm:text-[21px] font-bold text-white tracking-tight">Welcome back</h1>
                <p className="text-white/40 text-[12px] mt-0.5">Sign in to continue</p>
              </div>

              {error && !flipped && <div className="alert-banner alert-error mb-3">{error}</div>}
              {success && !flipped && <div className="alert-banner alert-success mb-3">{success}</div>}

              <div className="flex flex-col gap-2.5 sm:gap-3">

                {/* Account type — chip, loading state, or select-role prompt */}
                <div className="field-group">
                  <label className="field-label">
                    Account Type <span className="text-rose-400 ml-0.5">*</span>
                  </label>
                  {loginUserType ? (
                    <RoleChip role={loginUserType} onNavigate={() => navigate('/select-role')} />
                  ) : roleFetching ? (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)' }}>
                      <div className="w-3.5 h-3.5 border border-purple-400/40 border-t-purple-400 rounded-full animate-spin shrink-0" />
                      <span className="text-[13px] text-white/45">Detecting your account type…</span>
                    </div>
                  ) : (
                    <button type="button" onClick={() => navigate('/select-role')}
                      className="glass-input w-full flex items-center justify-between text-left cursor-pointer hover:border-purple-500/40 hover:bg-white/[0.06] transition-all duration-200">
                      <span className="text-white/30 text-[13px]">Select account type</span>
                      <span className="text-white/30 text-[14px]">→</span>
                    </button>
                  )}
                </div>

                {/* Email — triggers role auto-detect on blur */}
                <div className="field-group">
                  <label htmlFor="login-email" className="field-label">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="glass-input"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    onBlur={handleEmailBlur}
                    onFocus={loginEmailAF.onFocus}
                    readOnly={loginEmailAF.readOnly}
                    autoComplete="email"
                  />
                </div>

                <div className="field-group">
                  <div className="flex items-center justify-between mb-[6px]">
                    <label htmlFor="login-password" className="field-label !mb-0">Password</label>
                    <button type="button" className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors duration-200">
                      Forgot password?
                    </button>
                  </div>
                  <PasswordInput
                    id="login-password"
                    value={loginPwd}
                    onChange={e => setLoginPwd(e.target.value)}
                    placeholder="••••••••"
                    show={showLoginPwd}
                    onToggle={() => setShowLoginPwd(p => !p)}
                    autoComplete="current-password"
                    readOnly={loginPwdAF.readOnly}
                    onFocus={loginPwdAF.onFocus}
                  />
                </div>

                <button type="button" onClick={handleLogin} className="btn-primary mt-1">Sign In</button>
              </div>

              <div className="flex items-center my-2.5 gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-white/25 text-[11px] tracking-wider shrink-0">or continue with</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              <button
                onClick={handleGoogle}
                className="btn-google"
                disabled={!googleReady}
                style={!googleReady ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                <GoogleIcon />
                <span>{googleReady ? 'Sign in with Google' : 'Loading Google Sign-In…'}</span>
              </button>
              {/* Real Google-rendered button, kept off-screen — handleGoogle() clicks it programmatically. */}
              <div ref={googleButtonHostRef} aria-hidden="true"
                style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} />

              <p className="text-center text-white/35 text-[12px] mt-2.5 sm:mt-4">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => flip(true)}
                  className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-200">
                  Create one
                </button>
              </p>
            </div>
          </div>

          {/* ── BACK: Sign Up ──────────────────────────────────── */}
          <div className="flip-face glass-card flip-back">
            <div className="p-4 sm:p-6 flex flex-col">

              <div className="flex flex-col items-center mb-3 sm:mb-5">
                <img src={logo} alt="Planazo" className="w-9 h-9 sm:w-11 sm:h-11 mb-2 drop-shadow-[0_0_18px_rgba(139,92,246,0.55)]" />
                <h1 className="text-[18px] sm:text-[21px] font-bold text-white tracking-tight">Create account</h1>
                <p className="text-white/40 text-[12px] mt-0.5">Join Planazo today</p>
              </div>

              {error && flipped && <div className="alert-banner alert-error mb-3">{error}</div>}

              <div className="flex flex-col gap-2.5 sm:gap-3">

                {/* Account type — chip or select-role prompt (new users pick their own role) */}
                <div className="field-group">
                  <label className="field-label">
                    Account Type <span className="text-rose-400 ml-0.5">*</span>
                  </label>
                  {signupUserType ? (
                    <RoleChip role={signupUserType} onNavigate={() => navigate('/select-role')} />
                  ) : (
                    <button type="button" onClick={() => navigate('/select-role')}
                      className="glass-input w-full flex items-center justify-between text-left cursor-pointer hover:border-purple-500/40 hover:bg-white/[0.06] transition-all duration-200">
                      <span className="text-white/30 text-[13px]">Select account type</span>
                      <span className="text-white/30 text-[14px]">→</span>
                    </button>
                  )}
                </div>

                <div className="field-group">
                  <label htmlFor="signup-name" className="field-label">Full Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    placeholder="Jane Doe"
                    className="glass-input"
                    value={signupFullName}
                    onChange={e => setSignupFullName(e.target.value)}
                    onFocus={signupNameAF.onFocus}
                    readOnly={signupNameAF.readOnly}
                    autoComplete="name"
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="signup-email" className="field-label">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="glass-input"
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    onFocus={signupEmailAF.onFocus}
                    readOnly={signupEmailAF.readOnly}
                    autoComplete="email"
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="signup-password" className="field-label">Password</label>
                  <PasswordInput
                    id="signup-password"
                    value={signupPwd}
                    onChange={e => setSignupPwd(e.target.value)}
                    placeholder="min. 8 characters"
                    show={showSignupPwd}
                    onToggle={() => setShowSignupPwd(p => !p)}
                    autoComplete="new-password"
                    readOnly={signupPwdAF.readOnly}
                    onFocus={signupPwdAF.onFocus}
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="signup-confirm" className="field-label">Confirm Password</label>
                  <PasswordInput
                    id="signup-confirm"
                    value={signupConfirm}
                    onChange={e => setSignupConfirm(e.target.value)}
                    placeholder="••••••••"
                    show={showConfirmPwd}
                    onToggle={() => setShowConfirmPwd(p => !p)}
                    autoComplete="new-password"
                    readOnly={signupConfirmAF.readOnly}
                    onFocus={signupConfirmAF.onFocus}
                  />
                </div>

                <button type="button" onClick={handleSignup} className="btn-primary mt-1">Create Account</button>
              </div>

              <p className="text-center text-white/35 text-[12px] mt-2.5 sm:mt-4">
                Already have an account?{' '}
                <button type="button" onClick={() => flip(false)}
                  className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-200">
                  Sign in
                </button>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

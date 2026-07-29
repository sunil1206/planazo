import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { tokenStorage } from '../lib/tokenStorage'
import { AuthContext } from './authContextObject'

const USER_KEY = 'planazo_user'

// Backend role <-> frontend account-type values (see RoleSelect.jsx / Login.jsx USER_TYPES).
// 'gift_seller' is currently hidden in the UI but kept here so it keeps working if re-enabled.
const USER_TYPE_TO_ROLE = { user: 'COUPLE', vendor: 'VENDOR', gift_seller: 'VENDOR' }
const ROLE_TO_USER_TYPE = { COUPLE: 'user', VENDOR: 'vendor', ADMIN: 'vendor' }
const USER_TYPE_LABEL = { user: 'User', vendor: 'Vendor', gift_seller: 'Gift Seller' }

// Neither /login nor /google check the account-type chip the user clicked —
// they only know email/password or a Google token. So a mismatch (e.g. a
// COUPLE account signing in as Vendor) has to be caught here, client-side,
// before the session is ever persisted.
function assertUserTypeMatches(actualRole, expectedUserType) {
  const actualUserType = ROLE_TO_USER_TYPE[actualRole] ?? 'user'
  if (expectedUserType && actualUserType !== expectedUserType) {
    const label = USER_TYPE_LABEL[actualUserType] ?? actualUserType
    const err = new Error(`This account is registered as a ${label} account. Please select "${label}" to sign in.`)
    err.isClientValidation = true
    throw err
  }
}

function toStoredUser(userPublic) {
  return {
    name:     userPublic.full_name,
    email:    userPublic.email,
    userType: ROLE_TO_USER_TYPE[userPublic.role] ?? 'user',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!tokenStorage.getAccess())

  const persistSession = useCallback((tokenResponse) => {
    tokenStorage.setTokens(tokenResponse.access, tokenResponse.refresh)
    const storedUser = toStoredUser(tokenResponse.user)
    localStorage.setItem(USER_KEY, JSON.stringify(storedUser))
    setUser(storedUser)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  // Fired by the axios response interceptor when a refresh attempt fails.
  useEffect(() => {
    window.addEventListener('planazo:auth-expired', logout)
    return () => window.removeEventListener('planazo:auth-expired', logout)
  }, [logout])

  const login = useCallback(async (email, password, expectedUserType) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    assertUserTypeMatches(data.user.role, expectedUserType)
    persistSession(data)
    return data
  }, [persistSession])

  // Register returns the same TokenResponse shape as login, so signup logs the user in directly.
  const register = useCallback(async (email, password, fullName, userType) => {
    const role = USER_TYPE_TO_ROLE[userType] ?? 'COUPLE'
    const { data } = await api.post('/api/auth/register', { email, password, full_name: fullName, role })
    persistSession(data)
    return data
  }, [persistSession])

  // For a brand-new Google user the backend registers them with this role, so
  // the mismatch check below only ever fires for an existing account under a
  // different role — same fairness rule as password login.
  const loginWithGoogle = useCallback(async (googleToken, userType) => {
    const role = USER_TYPE_TO_ROLE[userType] ?? 'COUPLE'
    const { data } = await api.post('/api/auth/google', { token: googleToken, role })
    assertUserTypeMatches(data.user.role, userType)
    persistSession(data)
    return data
  }, [persistSession])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

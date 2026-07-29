import axios from 'axios'
import { tokenStorage } from './tokenStorage'

const BASE_URL = import.meta.env.VITE_API_URL

// These auth endpoints must never trigger the refresh-and-retry flow below —
// a 401 from them means bad credentials / an already-invalid refresh token,
// not an expired access token.
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/google', '/api/auth/token/refresh']

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const access = tokenStorage.getAccess()
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

// Concurrent 401s share one in-flight refresh call instead of each firing their own.
let refreshPromise = null

async function refreshAccessToken() {
  const refresh = tokenStorage.getRefresh()
  if (!refresh) throw new Error('No refresh token available')
  const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh`, { refresh })
  tokenStorage.setTokens(data.access, refresh)
  return data.access
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error
    const isAuthPath = config?.url && NO_REFRESH_PATHS.some(p => config.url.includes(p))

    if (!response || response.status !== 401 || config._retry || isAuthPath) {
      return Promise.reject(error)
    }

    config._retry = true
    try {
      refreshPromise = refreshPromise ?? refreshAccessToken()
      const access = await refreshPromise
      refreshPromise = null
      config.headers.Authorization = `Bearer ${access}`
      return api(config)
    } catch (refreshError) {
      refreshPromise = null
      tokenStorage.clear()
      // AuthContext listens for this to clear its state and redirect to /login.
      window.dispatchEvent(new Event('planazo:auth-expired'))
      return Promise.reject(refreshError)
    }
  }
)

// FastAPI error bodies are either { detail: "message" } or
// { detail: [{ msg: "...", ... }] } for 422 validation errors.
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  // Client-side validation errors (e.g. account-type mismatch) carry their own
  // message and never touched the network, so there's no err.response to read.
  if (err?.isClientValidation) return err.message
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  return fallback
}

export default api

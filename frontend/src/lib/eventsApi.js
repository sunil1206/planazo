// Real backend API helpers for the Weddings / Birthdays flows.
// Replaces the old localStorage-based mock API that used to live inline in
// Weddings.jsx / Birthdays.jsx / InvitationEditor.jsx / BirthdayEditor.jsx.
import api from './api'

// ── Slug helpers ───────────────────────────────────────────────────────────────
function slugify(text) {
  return (text || 'event')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 60) || 'event'
}

export function uniqueSlug(base) {
  return `${slugify(base)}-${Date.now().toString(36).slice(-5)}`
}

// ── Storage / photo uploads ─────────────────────────────────────────────────────
// Uploads a real File via the presign flow (S3/R2 in prod, local-upload fallback in dev).
export async function uploadImage(file, folder = 'gallery') {
  if (!file) return null
  const { data } = await api.post('/api/storage/presign/', {
    filename: file.name || `upload-${Date.now()}.jpg`,
    content_type: file.type || 'application/octet-stream',
    folder,
  })
  const { upload_url, cdn_url } = data
  if (upload_url.startsWith('/api/storage/local-upload')) {
    const form = new FormData()
    form.append('file', file)
    await api.post(upload_url, form)
  } else {
    await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  }
  return cdn_url
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mime = (header.match(/:(.*?);/) || [, 'image/jpeg'])[1]
  const bin = atob(base64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

// The editors compress photos client-side into base64 data URLs for instant preview.
// This uploads that data URL to real storage and returns the resulting cdn_url.
// If the value is already a real URL (loaded from the backend, unchanged), it's
// passed through untouched so we don't re-upload on every save.
export async function uploadIfLocal(dataUrlOrUrl, folder = 'gallery') {
  if (!dataUrlOrUrl) return null
  if (!dataUrlOrUrl.startsWith('data:')) return dataUrlOrUrl
  const blob = dataUrlToBlob(dataUrlOrUrl)
  const file = new File([blob], `${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })
  return uploadImage(file, folder)
}

// ── Vendors (public search, used by the Vendors tab in both editors) ───────────
export async function searchVendors(query) {
  if (!query || !query.trim()) return []
  const { data } = await api.get('/api/vendors/', { params: { search: query, page_size: 8 } })
  return data
}

// ── Wedding websites ────────────────────────────────────────────────────────────
export const weddingApi = {
  list: async () => (await api.get('/api/invitations/websites/')).data,
  get: async (slug) => (await api.get(`/api/invitations/websites/${slug}/`)).data,

  create: async ({ couple, brideName = '', groomName = '', theme }) =>
    (await api.post('/api/invitations/websites/', {
      couple,
      bride_info: brideName,
      groom_info: groomName,
      theme,
      slug: uniqueSlug(couple),
    })).data,

  update: async (slug, patch) => (await api.put(`/api/invitations/websites/${slug}/`, patch)).data,
  remove: async (slug) => api.delete(`/api/invitations/websites/${slug}/`),
  publish: async (slug) => (await api.put(`/api/invitations/websites/${slug}/`, { is_published: true })).data,
  unpublish: async (slug) => (await api.put(`/api/invitations/websites/${slug}/`, { is_published: false })).data,

  upsertBridegroom: async (slug, body) =>
    (await api.post(`/api/invitations/websites/${slug}/bridegroom/`, body)).data,

  createEvent: async (slug, body) => (await api.post(`/api/invitations/websites/${slug}/events/`, body)).data,
  updateEvent: async (slug, id, body) => (await api.put(`/api/invitations/websites/${slug}/events/${id}/`, body)).data,
  deleteEvent: async (slug, id) => api.delete(`/api/invitations/websites/${slug}/events/${id}/`),

  createStory: async (slug, body) => (await api.post(`/api/invitations/websites/${slug}/stories/`, body)).data,
  updateStory: async (slug, id, body) => (await api.put(`/api/invitations/websites/${slug}/stories/${id}/`, body)).data,
  deleteStory: async (slug, id) => api.delete(`/api/invitations/websites/${slug}/stories/${id}/`),

  upsertCountdown: async (slug, body) => (await api.post(`/api/invitations/websites/${slug}/countdown/`, body)).data,

  listVendors: async (slug) => (await api.get(`/api/invitations/websites/${slug}/vendors/`)).data,
  addVendor: async (slug, vendor_id, service_note = '') =>
    (await api.post(`/api/invitations/websites/${slug}/vendors/`, { vendor_id, service_note })).data,
  removeVendor: async (slug, rowId) => api.delete(`/api/invitations/websites/${slug}/vendors/${rowId}/`),

  listPhotos: async (slug) => (await api.get(`/api/invitations/websites/${slug}/photos/`)).data,
  addPhoto: async (slug, { image, tag = 'other', caption = '' }) =>
    (await api.post(`/api/invitations/websites/${slug}/photos/`, null, { params: { image, tag, caption } })).data,
  deletePhoto: async (slug, id) => api.delete(`/api/invitations/websites/${slug}/photos/${id}/`),

  listRSVPs: async (slug) => (await api.get(`/api/invitations/websites/${slug}/rsvps/`)).data,
  createRSVP: async (slug, body) => (await api.post(`/api/invitations/websites/${slug}/rsvps/`, body)).data,
  listWishes: async (slug) => (await api.get(`/api/invitations/websites/${slug}/wishes/`)).data,
  createWish: async (slug, body) => (await api.post(`/api/invitations/websites/${slug}/wishes/`, body)).data,

  recordVisit: async (slug) => api.post(`/api/invitations/websites/${slug}/visit/`),
}

// ── Birthday pages ──────────────────────────────────────────────────────────────
export const birthdayApi = {
  list: async () => (await api.get('/api/birthday/pages/')).data,
  get: async (slug) => (await api.get(`/api/birthday/pages/${slug}/`)).data,

  create: async ({ title, honoreeName = '', theme }) =>
    (await api.post('/api/birthday/pages/', {
      title,
      honoree_name: honoreeName || title,
      theme,
      slug: uniqueSlug(title),
    })).data,

  update: async (slug, patch) => (await api.put(`/api/birthday/pages/${slug}/`, patch)).data,
  remove: async (slug) => api.delete(`/api/birthday/pages/${slug}/`),
  publish: async (slug) => (await api.put(`/api/birthday/pages/${slug}/`, { is_published: true })).data,
  unpublish: async (slug) => (await api.put(`/api/birthday/pages/${slug}/`, { is_published: false })).data,

  createEvent: async (slug, body) => (await api.post(`/api/birthday/pages/${slug}/events/`, body)).data,
  updateEvent: async (slug, id, body) => (await api.put(`/api/birthday/pages/${slug}/events/${id}/`, body)).data,
  deleteEvent: async (slug, id) => api.delete(`/api/birthday/pages/${slug}/events/${id}/`),

  createStory: async (slug, body) => (await api.post(`/api/birthday/pages/${slug}/stories/`, body)).data,
  updateStory: async (slug, id, body) => (await api.put(`/api/birthday/pages/${slug}/stories/${id}/`, body)).data,
  deleteStory: async (slug, id) => api.delete(`/api/birthday/pages/${slug}/stories/${id}/`),

  upsertCountdown: async (slug, body) => (await api.post(`/api/birthday/pages/${slug}/countdown/`, body)).data,

  listWishes: async (slug) => (await api.get(`/api/birthday/pages/${slug}/wishes/`)).data,
  createWish: async (slug, body) => (await api.post(`/api/birthday/pages/${slug}/wishes/`, body)).data,
  listRSVPs: async (slug) => (await api.get(`/api/birthday/pages/${slug}/rsvps/`)).data,
  createRSVP: async (slug, body) => (await api.post(`/api/birthday/pages/${slug}/rsvps/`, body)).data,

  recordVisit: async (slug) => api.post(`/api/birthday/pages/${slug}/visit/`),
}

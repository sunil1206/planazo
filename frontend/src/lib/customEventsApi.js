// Real backend API helpers for the Custom Events module (Travel, Festival,
// Vacation, Meetup, etc.) — a lightweight planner that sits alongside the
// Wedding and Birthday modules without duplicating their heavier workflows.
import api from './api'

// Suggested types for the "New Event" picker — the field is free text, so
// users can also type their own custom type.
export const EVENT_TYPES = [
  'Travel', 'Vacation', 'Festival', 'Road Trip', 'College Event', 'Family Function',
  'Housewarming', 'Meetup', 'Reunion', 'Picnic', 'Office Event', 'Workshop',
  'Conference', 'Exhibition', 'Concert', 'Religious Event', 'Sports Event',
  'Charity Event', 'Personal Project', 'Celebration', 'Anniversary', 'Engagement',
  'Baby Shower', 'Graduation', 'Farewell', 'Other',
]

export const STATUSES = ['PLANNING', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']
export const VISIBILITIES = ['PRIVATE', 'SHARED', 'PUBLIC']

const base = '/api/custom-events'

export const customEventsApi = {
  // ── Events ────────────────────────────────────────────────────────────────
  list: async (params = {}) => (await api.get(`${base}/`, { params })).data,
  get: async (id) => (await api.get(`${base}/${id}/`)).data,
  create: async (body) => (await api.post(`${base}/`, body)).data,
  update: async (id, body) => (await api.put(`${base}/${id}/`, body)).data,
  remove: async (id) => api.delete(`${base}/${id}/`),
  dashboard: async (id) => (await api.get(`${base}/${id}/dashboard/`)).data,

  // ── Checklist ─────────────────────────────────────────────────────────────
  listChecklist: async (id) => (await api.get(`${base}/${id}/checklist/`)).data,
  createChecklistItem: async (id, body) => (await api.post(`${base}/${id}/checklist/`, body)).data,
  updateChecklistItem: async (id, itemId, body) => (await api.put(`${base}/${id}/checklist/${itemId}/`, body)).data,
  deleteChecklistItem: async (id, itemId) => api.delete(`${base}/${id}/checklist/${itemId}/`),
  toggleChecklistItem: async (id, itemId) => (await api.patch(`${base}/${id}/checklist/${itemId}/complete/`)).data,

  // ── Budget ────────────────────────────────────────────────────────────────
  listBudget: async (id) => (await api.get(`${base}/${id}/budget/`)).data,
  createBudgetItem: async (id, body) => (await api.post(`${base}/${id}/budget/`, body)).data,
  updateBudgetItem: async (id, itemId, body) => (await api.put(`${base}/${id}/budget/${itemId}/`, body)).data,
  deleteBudgetItem: async (id, itemId) => api.delete(`${base}/${id}/budget/${itemId}/`),

  // ── Notes ─────────────────────────────────────────────────────────────────
  listNotes: async (id) => (await api.get(`${base}/${id}/notes/`)).data,
  createNote: async (id, body) => (await api.post(`${base}/${id}/notes/`, body)).data,
  updateNote: async (id, noteId, body) => (await api.put(`${base}/${id}/notes/${noteId}/`, body)).data,
  deleteNote: async (id, noteId) => api.delete(`${base}/${id}/notes/${noteId}/`),

  // ── Gallery ───────────────────────────────────────────────────────────────
  listGallery: async (id) => (await api.get(`${base}/${id}/gallery/`)).data,
  addGalleryItem: async (id, body) => (await api.post(`${base}/${id}/gallery/`, body)).data,
  deleteGalleryItem: async (id, photoId) => api.delete(`${base}/${id}/gallery/${photoId}/`),

  // ── Files ─────────────────────────────────────────────────────────────────
  listFiles: async (id) => (await api.get(`${base}/${id}/files/`)).data,
  addFile: async (id, body) => (await api.post(`${base}/${id}/files/`, body)).data,
  deleteFile: async (id, fileId) => api.delete(`${base}/${id}/files/${fileId}/`),

  // ── Members ───────────────────────────────────────────────────────────────
  listMembers: async (id) => (await api.get(`${base}/${id}/members/`)).data,
  addMember: async (id, body) => (await api.post(`${base}/${id}/members/`, body)).data,
  updateMember: async (id, memberId, body) => (await api.put(`${base}/${id}/members/${memberId}/`, body)).data,
  removeMember: async (id, memberId) => api.delete(`${base}/${id}/members/${memberId}/`),
  inviteMember: async (id, memberId) => (await api.post(`${base}/${id}/members/${memberId}/invite/`)).data,
}

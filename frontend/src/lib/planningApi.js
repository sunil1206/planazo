// Real backend API helpers for the Planning Suite — Checklist, Budget, Guest
// List, My Vendors and Find Vendors, working across Wedding, Birthday and
// Custom Events (the three modules Planning Suite plans *for*, without
// creating events of its own).
import api from './api'

export const EVENT_TYPES = ['wedding', 'birthday', 'custom']
export const CHECKLIST_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE']
export const CHECKLIST_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const RSVP_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED']
export const VENDOR_BOOKING_STATUSES = ['ENQUIRED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']

const planningBase = (eventType, eventId) => `/api/planning/${eventType}/${eventId}`

export const planningApi = {
  // ── Unified events list ─────────────────────────────────────────────────
  listEvents: async (params = {}) => (await api.get('/api/events/', { params })).data,

  // ── Dashboard ───────────────────────────────────────────────────────────
  dashboard: async (eventType, eventId) => (await api.get(`${planningBase(eventType, eventId)}/dashboard/`)).data,

  // ── Checklist ───────────────────────────────────────────────────────────
  listChecklist: async (eventType, eventId) => (await api.get(`${planningBase(eventType, eventId)}/checklist/`)).data,
  createChecklistItem: async (eventType, eventId, body) => (await api.post(`${planningBase(eventType, eventId)}/checklist/`, body)).data,
  updateChecklistItem: async (eventType, eventId, itemId, body) => (await api.put(`${planningBase(eventType, eventId)}/checklist/${itemId}/`, body)).data,
  deleteChecklistItem: async (eventType, eventId, itemId) => api.delete(`${planningBase(eventType, eventId)}/checklist/${itemId}/`),

  // ── Budget ──────────────────────────────────────────────────────────────
  listBudget: async (eventType, eventId) => (await api.get(`${planningBase(eventType, eventId)}/budget/`)).data,
  createBudgetItem: async (eventType, eventId, body) => (await api.post(`${planningBase(eventType, eventId)}/budget/`, body)).data,
  updateBudgetItem: async (eventType, eventId, itemId, body) => (await api.put(`${planningBase(eventType, eventId)}/budget/${itemId}/`, body)).data,
  deleteBudgetItem: async (eventType, eventId, itemId) => api.delete(`${planningBase(eventType, eventId)}/budget/${itemId}/`),

  // ── Guest List ──────────────────────────────────────────────────────────
  listGuests: async (eventType, eventId) => (await api.get(`${planningBase(eventType, eventId)}/guests/`)).data,
  guestsSummary: async (eventType, eventId) => (await api.get(`${planningBase(eventType, eventId)}/guests/summary/`)).data,
  createGuest: async (eventType, eventId, body) => (await api.post(`${planningBase(eventType, eventId)}/guests/`, body)).data,
  updateGuest: async (eventType, eventId, itemId, body) => (await api.put(`${planningBase(eventType, eventId)}/guests/${itemId}/`, body)).data,
  deleteGuest: async (eventType, eventId, itemId) => api.delete(`${planningBase(eventType, eventId)}/guests/${itemId}/`),

  // ── My Vendors (bookings) ───────────────────────────────────────────────
  listVendorBookings: async (eventType, eventId) => (await api.get(`${planningBase(eventType, eventId)}/vendor-bookings/`)).data,
  createVendorBooking: async (eventType, eventId, body) => (await api.post(`${planningBase(eventType, eventId)}/vendor-bookings/`, body)).data,
  updateVendorBooking: async (eventType, eventId, itemId, body) => (await api.put(`${planningBase(eventType, eventId)}/vendor-bookings/${itemId}/`, body)).data,
  deleteVendorBooking: async (eventType, eventId, itemId) => api.delete(`${planningBase(eventType, eventId)}/vendor-bookings/${itemId}/`),

  // ── Find Vendors (marketplace search) ──────────────────────────────────
  searchVendors: async (params = {}) => (await api.get('/api/vendors/search/', { params })).data,
}

// ─── Shared TypeScript interfaces for all 5 invite theme components ───────────

export interface GalleryImage {
  id:        number;
  image:     string;
  tag?:      string;
  caption?:  string;
  category?: { id: number; name: string } | null;
}

export interface GalleryCategory {
  id:   number;
  name: string;
}

export interface Event {
  id:            number;
  title:         string;
  time:          string;
  date:          string;
  venue?:        string;
  location_name: string;
  location_link: string;
  desc:          string;
  description?:  string;
}

export interface Story {
  id:          number;
  title:       string;
  date:        string;
  desc:        string;
  description?: string;
  photo?:      string | null;
}

export interface Wish {
  id:           number;
  name:         string;
  relationship: string;
  message:      string;
  created_at:   string;
}

export interface BrideGroom {
  groom_name:        string;
  groom_description: string;
  groom_image?:      string | null;
  groom_photo?:      string | null;
  groom_instagram?:  string | null;
  bride_name:        string;
  bride_description: string;
  bride_image?:      string | null;
  bride_photo?:      string | null;
  bride_instagram?:  string | null;
}

export interface Vendor {
  id:             number;
  vendor_id:      number;
  title:          string;
  category:       string;
  category_label: string;
  thumbnail?:     string | null;
  slug:           string;
  city:           string;
  tagline?:       string;
  instagram?:     string | null;
  service_note?:  string;
}

export interface InvitationData {
  id:              number;
  couple:          string;
  slug:            string;
  thumbnail?:      string | null;
  is_published:    boolean;
  gallery_token:   string;
  theme:           string;
  bridegroom?:     BrideGroom | null;
  events:          Event[];
  stories:         Story[];
  countdown?:      { heading: string; event_date: string } | null;
  wishes:          Wish[];
  gallery_images:  GalleryImage[];
  gallery_count:   number;
  wedding_date?:   string | null;
  venue?:          string | null;
  vendors:         Vendor[];
  background_image?: string | null;
}

export interface ThemeProps {
  inv:                InvitationData;
  galleryImages:      GalleryImage[];
  galleryCategories:  GalleryCategory[];
  onRsvp:             (data: Record<string, unknown>) => Promise<void>;
  onWish:             (data: Record<string, unknown>) => Promise<void>;
  onUploadPhoto?:     (formData: FormData) => Promise<void>;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function imgUrl(src: string | null | undefined): string | undefined {
  if (!src) return undefined;
  return src.startsWith("http") ? src : `${API}${src}`;
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });
}

export function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day:   "numeric",
    month: "long",
    year:  "numeric",
  });
}

export const CATEGORY_ICONS: Record<string, string> = {
  PHOTOGRAPHER: "📷",
  EVENT:        "🎪",
  DECOR:        "🌸",
  CATERING:     "🍽️",
  MAKEUP:       "💄",
  MUSIC:        "🎵",
};

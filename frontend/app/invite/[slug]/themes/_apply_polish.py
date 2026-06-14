#!/usr/bin/env python3
"""
Re-applies the gallery fix + global navbar wiring + Share/Memories button polish
using atomic file writes (the Edit tool keeps truncating multi-byte files).
"""
import io, os, sys, re

ROOT = "/sessions/wonderful-beautiful-curie/mnt/snapshare/wedding-project"


def write(path, text):
    """Atomic UTF-8 write."""
    full = os.path.join(ROOT, path)
    tmp  = full + ".tmp"
    with io.open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    os.replace(tmp, full)
    print(f"  ok  {path}  ({len(text)} bytes)")


def patch(path, replacements, label=None):
    """Apply a list of (old, new) substring replacements once each. Atomic."""
    full = os.path.join(ROOT, path)
    with io.open(full, "r", encoding="utf-8") as f:
        text = f.read()
    changed = 0
    for old, new in replacements:
        if old not in text:
            print(f"  !!  needle not found in {path} -- {label or '?'}")
            return False
        text = text.replace(old, new, 1)
        changed += 1
    write(path, text)
    return True


# ─── 1. layout.tsx — import + mount GlobalNavGate ─────────────────────────────
patch(
    "frontend/app/layout.tsx",
    [
        (
            'import { Providers } from "@/components/shared/Providers";',
            'import { Providers } from "@/components/shared/Providers";\n'
            'import GlobalNavGate from "@/components/shared/GlobalNavGate";'
        ),
        (
            "        <Providers>\n          {children}\n        </Providers>",
            "        <Providers>\n          <GlobalNavGate />\n          {children}\n        </Providers>"
        ),
    ],
    label="layout.tsx",
)

# ─── 2. invite/[slug]/page.tsx — fix gallery endpoint + normalize fields ─────
OLD_BLOCK = (
    "      .then(async (data) => {\n"
    "        setInv(data);\n"
    "        // Fetch professional gallery + categories in parallel (non-blocking)\n"
    "        const [galleryRes, catRes] = await Promise.allSettled([\n"
    "          fetch(`${API}/api/gallery/images/?website=${data.id}`).then(r => r.json()),\n"
    "          fetch(`${API}/api/gallery/categories/`).then(r => r.json()),\n"
    "        ]);\n"
    "        if (galleryRes.status === \"fulfilled\") {\n"
    "          const gd = galleryRes.value;\n"
    "          setGalleryImages(Array.isArray(gd) ? gd : (gd?.results ?? []));\n"
    "        }\n"
    "        if (catRes.status === \"fulfilled\") {\n"
    "          const cd = catRes.value;\n"
    "          setGalleryCategories(Array.isArray(cd) ? cd : (cd?.results ?? []));\n"
    "        }\n"
    "      })\n"
)
NEW_BLOCK = (
    "      .then(async (data) => {\n"
    "        setInv(data);\n"
    "        // Fetch professional gallery + categories in parallel (non-blocking).\n"
    "        // IMPORTANT: use the PUBLIC `by-website` endpoint -- the plain\n"
    "        // /api/gallery/images/ route requires auth and ignores ?website=.\n"
    "        const [galleryRes, catRes] = await Promise.allSettled([\n"
    "          fetch(`${API}/api/gallery/images/by-website/?website_id=${data.id}`).then(r => r.json()),\n"
    "          fetch(`${API}/api/gallery/categories/`).then(r => r.json()),\n"
    "        ]);\n"
    "        if (galleryRes.status === \"fulfilled\") {\n"
    "          const gd  = galleryRes.value;\n"
    "          const raw = Array.isArray(gd) ? gd : (gd?.results ?? []);\n"
    "          // Backend returns { picture, picture_url, thumbnail_url, category (id),\n"
    "          // category_name }, but themes consume { id, image, caption, tag,\n"
    "          // category: {id, name} }.  Normalize once here so every theme works.\n"
    "          const normalized = raw.map((g) => ({\n"
    "            id:        g.id,\n"
    "            image:     g.picture_url || g.thumbnail_url || g.picture || g.image || \"\",\n"
    "            thumbnail: g.thumbnail_url || g.thumb_small || g.thumb_medium || g.picture_url || \"\",\n"
    "            caption:   g.title || g.caption || \"\",\n"
    "            tag:       g.tag || g.category_name || \"\",\n"
    "            category:  g.category_name\n"
    "              ? { id: g.category, name: g.category_name }\n"
    "              : (typeof g.category === \"object\" && g.category) ? g.category : null,\n"
    "          }));\n"
    "          setGalleryImages(normalized);\n"
    "        }\n"
    "        if (catRes.status === \"fulfilled\") {\n"
    "          const cd = catRes.value;\n"
    "          setGalleryCategories(Array.isArray(cd) ? cd : (cd?.results ?? []));\n"
    "        }\n"
    "      })\n"
)
patch("frontend/app/invite/[slug]/page.tsx", [(OLD_BLOCK, NEW_BLOCK)], label="invite page gallery fix")

# ─── 3. vendors/page.tsx — remove duplicate PublicNavbar (now global) ────────
patch(
    "frontend/app/vendors/page.tsx",
    [
        (
            'import PublicNavbar from "@/components/shared/PublicNavbar";',
            "// PublicNavbar is now mounted globally via app/layout.tsx -> GlobalNavGate.",
        ),
        (
            '    <div className="min-h-screen bg-[#fafafa]">\n      <PublicNavbar />\n',
            '    <div className="min-h-screen bg-[#fafafa]">\n',
        ),
    ],
    label="vendors page navbar removal",
)

print("\nall patches applied")

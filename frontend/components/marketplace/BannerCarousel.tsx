"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Banner } from "@/lib/marketplace/types";

/**
 * Auto-advancing banner carousel.
 * Renders mobile_image on small screens, desktop_image on md+.
 */
export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(id);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const b = banners[idx];
  if (!b) return null;

  const inner = (
    <div className="relative w-full h-[40vw] max-h-[420px] min-h-[180px] overflow-hidden rounded-2xl bg-stone-100">
      {/* Mobile */}
      {b.mobile_url ? (
        <img
          src={b.mobile_url}
          alt={b.title}
          className="md:hidden w-full h-full object-cover"
        />
      ) : null}
      {/* Desktop */}
      <img
        src={b.desktop_url || ""}
        alt={b.title}
        className={`${b.mobile_url ? "hidden md:block" : ""} w-full h-full object-cover`}
      />

      {/* Optional CTA */}
      {b.cta_label && (
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
          <span className="inline-block px-4 py-2 rounded-full bg-stone-900 text-white text-sm font-medium shadow-lg">
            {b.cta_label}
          </span>
        </div>
      )}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition ${
                i === idx ? "bg-white w-6" : "bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (b.cta_url) {
    return (
      <Link
        href={b.cta_url}
        target={b.open_in_new_tab ? "_blank" : undefined}
        rel={b.open_in_new_tab ? "noopener noreferrer" : undefined}
        className="block"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

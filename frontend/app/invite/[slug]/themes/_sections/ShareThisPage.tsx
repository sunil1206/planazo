"use client";
/**
 * Themable "Share This Page" section.
 * Drop into any invitation theme - pass palette + coupleName + slug.
 *
 * Buttons: WhatsApp - Facebook - X/Twitter - Telegram - Email - Copy Link - Native Share (mobile).
 */
import { useState, useMemo } from "react";

export interface ShareThisPageProps {
  /** The couple/title shown in the share message. */
  coupleName: string;
  /** Invitation slug - used to build the canonical URL on the client. */
  slug: string;
  /** Override the share URL entirely (e.g. for preview pages). */
  shareUrl?: string;

  /** Palette */
  background?: string;
  surface?: string;
  textColor?: string;
  mutedColor?: string;
  accent?: string;
  accentText?: string;

  /** Typography */
  serifClass?: string;
  sansClass?: string;

  /** Section labels (i18n-friendly) */
  eyebrow?: string;
  heading?: string;
  intro?: string;

  /** Optional id for in-page navigation. */
  sectionId?: string;
}

export default function ShareThisPage({
  coupleName,
  slug,
  shareUrl,
  background = "#0b0b0d",
  surface = "rgba(255,255,255,0.03)",
  textColor = "#ffffff",
  mutedColor = "rgba(255,255,255,0.55)",
  accent = "#C9A84C",
  accentText = "#0b0b0d",
  serifClass = "theme-serif",
  sansClass = "theme-sans",
  eyebrow = "Spread the joy",
  heading = "Share This Page",
  intro = "Help us share our celebration with the people we love.",
  sectionId = "share",
}: ShareThisPageProps) {
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    if (shareUrl) return shareUrl;
    if (typeof window !== "undefined") return window.location.origin + "/invite/" + slug;
    return "/invite/" + slug;
  }, [shareUrl, slug]);

  const message = "You're invited to " + coupleName + "'s wedding - see the invitation here: " + url;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: coupleName + " - Wedding Invitation", text: message, url });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  const links = [
    {
      key: "wa",
      label: "WhatsApp",
      href: "https://wa.me/?text=" + encodeURIComponent(message),
    },
    {
      key: "fb",
      label: "Facebook",
      href: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url),
    },
    {
      key: "x",
      label: "X",
      href: "https://twitter.com/intent/tweet?text=" + encodeURIComponent(message),
    },
    {
      key: "tg",
      label: "Telegram",
      href: "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(message),
    },
    {
      key: "mail",
      label: "Email",
      href: "mailto:?subject=" + encodeURIComponent(coupleName + " - Wedding Invitation") + "&body=" + encodeURIComponent(message),
    },
  ];

  return (
    <section
      id={sectionId}
      style={{ background, color: textColor }}
      className="py-20 px-4 md:px-8"
    >
      <div className="max-w-3xl mx-auto text-center">
        <p
          className={sansClass}
          style={{
            fontSize: 11,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: accent,
            marginBottom: 14,
            opacity: 0.85,
          }}
        >
          {eyebrow}
        </p>
        <h2
          className={serifClass}
          style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 300, lineHeight: 1.1, marginBottom: 14 }}
        >
          {heading}
        </h2>
        <div
          aria-hidden
          style={{ width: 60, height: 1, background: accent, opacity: 0.5, margin: "18px auto 22px" }}
        />
        <p
          className={sansClass}
          style={{ color: mutedColor, fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 32px" }}
        >
          {intro}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          {links.map((l) => (
            <a
              key={l.key}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={"Share on " + l.label}
              className={sansClass + " theme-cta"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 999,
                border: "1px solid " + accent + "55",
                background: surface,
                color: textColor,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "stretch",
            gap: 8,
            maxWidth: 560,
            margin: "0 auto",
            padding: 6,
            borderRadius: 14,
            background: surface,
            border: "1px solid " + accent + "33",
          }}
        >
          <div
            className={sansClass}
            style={{
              flex: "1 1 220px",
              minWidth: 0,
              padding: "10px 14px",
              fontSize: 13,
              color: mutedColor,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "left",
            }}
            title={url}
          >
            {url}
          </div>
          <button
            type="button"
            onClick={copy}
            className={sansClass + " theme-cta"}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: copied ? "#1f9d55" : accent,
              color: copied ? "#fff" : accentText,
            }}
          >
            {copied ? "Copied" : "Copy Link"}
          </button>
          <button
            type="button"
            onClick={nativeShare}
            className={sansClass + " theme-cta"}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid " + accent,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: "transparent",
              color: accent,
            }}
            aria-label="Share with device"
          >
            Share
          </button>
        </div>
      </div>
    </section>
  );
}

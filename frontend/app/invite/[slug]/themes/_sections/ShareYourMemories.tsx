"use client";
/**
 * Themable "Share Your Memories" section.
 * Inline guest-photo upload form. Drop into any invitation theme.
 */
import { useRef, useState } from "react";

export interface ShareYourMemoriesProps {
  onUploadPhoto?: (formData: FormData) => Promise<void>;

  background?: string;
  surface?: string;
  textColor?: string;
  mutedColor?: string;
  accent?: string;
  accentText?: string;

  serifClass?: string;
  sansClass?: string;

  eyebrow?: string;
  heading?: string;
  intro?: string;

  sectionId?: string;
}

export default function ShareYourMemories({
  onUploadPhoto,
  background = "#0b0b0d",
  surface = "rgba(255,255,255,0.03)",
  textColor = "#ffffff",
  mutedColor = "rgba(255,255,255,0.55)",
  accent = "#C9A84C",
  accentText = "#0b0b0d",
  serifClass = "theme-serif",
  sansClass = "theme-sans",
  eyebrow = "Captured a moment?",
  heading = "Share Your Memories",
  intro = "Upload a photo from the celebration and it will appear in our shared gallery.",
  sectionId = "memories",
}: ShareYourMemoriesProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!onUploadPhoto) return null;

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setError("Image is too large (15 MB max).");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    pickFile({ target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !onUploadPhoto) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("uploader_name", name || "Guest");
      fd.append("caption", caption);
      await onUploadPhoto(fd);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setFile(null);
        setPreview(null);
        setName("");
        setCaption("");
      }, 2400);
    } catch (err: any) {
      setError(err?.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id={sectionId}
      style={{ background, color: textColor }}
      className="py-20 px-4 md:px-8"
    >
      <div className="max-w-2xl mx-auto text-center">
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
          style={{ color: mutedColor, fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 28px" }}
        >
          {intro}
        </p>

        {done ? (
          <div
            role="status"
            style={{
              padding: "28px 24px",
              borderRadius: 18,
              background: surface,
              border: "1px solid " + accent + "55",
              maxWidth: 460,
              margin: "0 auto",
            }}
          >
            <h3
              className={serifClass}
              style={{ fontSize: "1.4rem", fontWeight: 300, marginBottom: 6 }}
            >
              Memory Uploaded
            </h3>
            <p className={sansClass} style={{ color: mutedColor, fontSize: 13 }}>
              Thank you - your moment is now part of our shared gallery.
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              maxWidth: 460,
              margin: "0 auto",
              textAlign: "left",
            }}
          >
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
              }}
              style={{
                border: "1.5px dashed " + accent + "55",
                borderRadius: 16,
                padding: preview ? 12 : "28px 16px",
                textAlign: "center",
                cursor: "pointer",
                background: preview ? "transparent" : surface,
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Selected memory preview"
                  style={{
                    maxHeight: 240,
                    maxWidth: "100%",
                    width: "100%",
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />
              ) : (
                <>
                  <p className={sansClass} style={{ fontSize: 14, color: textColor, marginBottom: 4 }}>
                    Tap to choose a photo
                  </p>
                  <p className={sansClass} style={{ fontSize: 11, color: mutedColor }}>
                    or drag and drop, JPG or PNG, up to 15 MB
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={pickFile}
              style={{ display: "none" }}
            />

            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={sansClass}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid " + accent + "40",
                background: surface,
                color: textColor,
                fontSize: 14,
                outline: "none",
              }}
            />

            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (optional)"
              className={sansClass}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid " + accent + "40",
                background: surface,
                color: textColor,
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />

            {error && (
              <p
                role="alert"
                className={sansClass}
                style={{ fontSize: 13, color: "#e25555", margin: 0 }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className={sansClass + " theme-cta"}
              style={{
                padding: "13px 18px",
                borderRadius: 12,
                border: "none",
                cursor: file && !loading ? "pointer" : "not-allowed",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                background: file && !loading ? accent : accent + "55",
                color: accentText,
                opacity: file && !loading ? 1 : 0.7,
              }}
            >
              {loading ? "Uploading" : "Share Memory"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

/**
 * Shim: next/image → plain <img>
 * Drops Next.js-specific props (priority, placeholder, blurDataURL, fill, sizes).
 */
import React from "react";

interface NextImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  placeholder?: string;
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  loading?: "lazy" | "eager";
}

export default function Image({
  src,
  alt,
  width,
  height,
  fill,
  priority: _priority,
  placeholder: _placeholder,
  blurDataURL: _blur,
  sizes: _sizes,
  quality: _quality,
  style,
  ...rest
}: NextImageProps) {
  const computedStyle: React.CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }
    : style ?? {};

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={computedStyle}
      {...rest}
    />
  );
}

/**
 * Shim: next/font/google → no-op
 * Vite loads fonts via CSS. This shim returns a className string so existing
 * layout files that do `const inter = Inter({...})` and use `inter.className`
 * don't crash.
 */
export function Inter(_opts?: unknown)  { return { className: "font-sans" }; }
export function Roboto(_opts?: unknown) { return { className: "font-sans" }; }
export function Poppins(_opts?: unknown){ return { className: "font-sans" }; }
export function Playfair_Display(_opts?: unknown) { return { className: "font-serif" }; }
export function Lato(_opts?: unknown)   { return { className: "font-sans" }; }

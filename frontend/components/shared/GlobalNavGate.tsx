"use client";
/**
 * GlobalNavGate
 *
 * Decides — based on the current pathname — whether to render the global
 * PublicNavbar. We want the navbar on every public marketing/auth surface
 * but hidden on routes that ship their own chrome (dashboards, invitation
 * viewer pages, etc.).
 *
 * Mounted in app/layout.tsx so every URL gets the right behaviour
 * automatically — no per-page wiring required.
 */
import { useLocation } from "react-router-dom";
import PublicNavbar from "./PublicNavbar";

// Routes (or route prefixes) that have their OWN navigation chrome and must
// NOT show the public navbar on top.
const HIDDEN_PREFIXES = [
  "/dashboard",   // user dashboard has its own sidebar/header
  "/vendor",      // vendor dashboard
  "/seller",      // gift seller dashboard
  "/shop/dashboard",
  "/invite/",     // public invitation viewer (each theme has its own sticky nav)
  "/birthday/",   // birthday viewer
  "/planner",     // planner has its own layout
];

// Auth pages should keep the navbar but use the "white" (solid) variant so
// it doesn't clash with the gradient backgrounds.
const SOLID_VARIANT_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/gift-login",
];

function startsWithAny(path: string, prefixes: string[]) {
  return prefixes.some((p) => path === p || path.startsWith(p));
}

export default function GlobalNavGate() {
  const { pathname } = useLocation();

  if (startsWithAny(pathname, HIDDEN_PREFIXES)) {
    return null;
  }

  const variant = startsWithAny(pathname, SOLID_VARIANT_PREFIXES) ? "white" : "auto";
  return <PublicNavbar variant={variant} />;
}

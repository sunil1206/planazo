"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, X, ChevronRight } from "lucide-react";

const NAV_LINKS = [
  ["Home",        "/"],
  ["Themes",      "/invite/themes"],
  ["Gallery",     "/gallery"],
  ["Pricing",     "/pricing"],
  ["Marketplace", "/shop"],
  ["Contact",     "/contact"],
];

interface PublicNavbarProps {
  /** Force transparent/dark variant regardless of scroll */
  variant?: "auto" | "white" | "dark";
}

export default function PublicNavbar({ variant = "auto" }: PublicNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (variant !== "auto") return;
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [variant]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const scrolled = variant === "white" || (variant === "auto" && isScrolled);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
              <Heart size={20} fill="currentColor" />
            </div>
            <span
              className={`font-bold text-xl tracking-tight transition-colors ${
                scrolled ? "text-slate-900" : "text-white"
              }`}
            >
              Planazo
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(([label, href]) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-semibold transition-colors ${
                    active
                      ? "text-rose-600"
                      : scrolled
                      ? "text-slate-600 hover:text-rose-600"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={`hidden sm:block px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                scrolled
                  ? "text-slate-700 hover:bg-slate-100"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-200/50 hover:bg-rose-700 hover:-translate-y-0.5 transition-all active:translate-y-0"
            >
              Get Started
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden p-2 rounded-xl transition-colors ${
                scrolled
                  ? "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen overlay */}
      <div
        className={`fixed inset-0 bg-white z-40 md:hidden transition-transform duration-500 ease-in-out ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-6 pt-24">
          <nav className="flex flex-col gap-6">
            {NAV_LINKS.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="text-2xl font-bold text-slate-800 hover:text-rose-600 transition-colors flex items-center justify-between"
              >
                {label}
                <ChevronRight size={24} className="text-slate-300" />
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-4">
            <Link
              href="/login"
              className="w-full py-4 text-center font-bold text-slate-800 border-2 border-slate-100 rounded-2xl"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="w-full py-4 text-center font-bold text-white bg-rose-600 rounded-2xl shadow-xl shadow-rose-100"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

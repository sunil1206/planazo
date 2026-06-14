"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ShoppingBag, Store, Search } from "lucide-react";

/**
 * Marketplace-specific navbar. Used inside the /marketplace route group
 * (renders BELOW the global public navbar if present).
 */
export default function MarketplaceNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/marketplace", label: "Home" },
    { href: "/marketplace/products", label: "All Products" },
    { href: "/marketplace/products?customizable=true", label: "Customizable" },
    { href: "/marketplace/vendors", label: "Vendors" },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <Link href="/marketplace" className="flex items-center gap-2 text-stone-900">
            <ShoppingBag className="w-5 h-5" />
            <span className="font-semibold">Marketplace</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-stone-600">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-stone-900 transition">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/marketplace/products"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-stone-700 hover:bg-stone-100"
            >
              <Search className="w-4 h-4" /> Search
            </Link>
          </div>

          {/* Mobile menu trigger */}
          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden py-3 border-t border-stone-200">
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-2 py-2 rounded text-sm text-stone-700 hover:bg-stone-100"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

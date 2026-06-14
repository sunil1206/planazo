"use client";
/**
 * /shop — Planazo standalone gift marketplace
 * Subdomain-ready: also serves shop.planazo.in
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SharedGiftShop from "./SharedGiftShop";

export default function ShopPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");
    setIsLoggedIn(!!token);
    setChecked(true);
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-teal-600 text-sm">Loading store…</div>
      </div>
    );
  }

  return (
    <SharedGiftShop
      mode="shop"
      isLoggedIn={isLoggedIn}
      onLoginRequired={() => router.push("/gift-login?next=/shop")}
    />
  );
}

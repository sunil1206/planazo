"use client";
/**
 * /birthday/[slug]/gifts — Birthday gift registry using shared gift shop UI
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SharedGiftShop from "@/app/shop/SharedGiftShop";

export default function BirthdayGiftsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  return (
    <SharedGiftShop
      mode="invite"
      inviteSlug={`birthday/${slug}`}
      accentColor="#7C3AED"   // purple for birthdays
      isLoggedIn={true}
    />
  );
}

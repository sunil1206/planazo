"use client";
/**
 * /invite/[slug]/gifts — Wedding gift registry using shared gift shop UI
 * Matches the /shop design but with wedding couple context and rose accent
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { invitationApi } from "@/lib/api";
import SharedGiftShop from "@/app/shop/SharedGiftShop";

interface InviteInfo {
  couple: string;
  theme: string;
  created_at: string;
}

export default function InviteGiftsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [info, setInfo] = useState<InviteInfo | null>(null);

  useEffect(() => {
    invitationApi.getPublic(slug)
      .then((d: any) => setInfo({
        couple:     d.couple || "",
        theme:      d.theme || "modern_minimal",
        created_at: d.created_at || "",
      }))
      .catch(() => setInfo({ couple: "", theme: "modern_minimal", created_at: "" }));
  }, [slug]);

  // Pick accent colour from invitation theme
  const themeAccents: Record<string, string> = {
    royal_mughal:    "#4A0E1C",
    kerala_trad:     "#1B4332",
    modern_minimal:  "#B76E79",
    floral_pastel:   "#D4A0B0",
    cinematic_dark:  "#C9952A",
    luxury_wedding:  "#C9952A",
  };
  const accent = themeAccents[info?.theme || ""] || "#B76E79";

  return (
    <SharedGiftShop
      mode="invite"
      inviteSlug={slug}
      coupleName={info?.couple}
      accentColor={accent}
      isLoggedIn={true}  // guests don't need to be logged in for invite gifts
    />
  );
}

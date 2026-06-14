"use client";
/**
 * /birthday/[slug] — Public birthday celebration page
 * Client Component so API call happens in the browser (fixes Docker SSR 404).
 */
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const StarGoldBirthday   = dynamic(() => import("@/components/birthday/StarGoldBirthday"),   { ssr: false });
const BalloonBash        = dynamic(() => import("@/components/birthday/BalloonBash"),        { ssr: false });
const FloralBirthday     = dynamic(() => import("@/components/birthday/FloralBirthday"),     { ssr: false });
const KidsParty          = dynamic(() => import("@/components/birthday/KidsParty"),          { ssr: false });
const CinematicBirthday  = dynamic(() => import("@/components/birthday/CinematicBirthday"),  { ssr: false });

const TEMPLATES: Record<string, React.ComponentType<{ data: any }>> = {
  star_gold:        StarGoldBirthday,
  balloon_bash:     BalloonBash,
  floral_birthday:  FloralBirthday,
  kids_party:       KidsParty,
  cinematic_dark:   CinematicBirthday,
};

export default function BirthdayPublicPage() {
  const params = useParams();
  const slug   = params?.slug as string;

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!slug) return;
    const DJANGO_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${DJANGO_URL}/api/birthday/public/${slug}/`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => { setData(json); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🎂</div>
          <p className="text-gray-400 text-sm">Loading celebration…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🎂</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h1>
          <p className="text-gray-400 text-sm mb-6">This birthday page may not be published yet.</p>
          <Link href="/" className="px-6 py-3 rounded-xl text-white text-sm font-medium"
            style={{ background: "linear-gradient(135deg, #9B59B6, #C9952A)" }}>
            Go to Planazo
          </Link>
        </div>
      </div>
    );
  }

  const Template = TEMPLATES[data.theme] || StarGoldBirthday;

  return (
    <div className="relative">
      <Template data={data} />
      <Link
        href={`/birthday/${slug}/gifts`}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl hover:scale-105 transition-transform"
        style={{ background: "linear-gradient(135deg, #9B59B6, #C9952A)" }}>
        🎁 <span>Send a Gift</span>
      </Link>
    </div>
  );
}

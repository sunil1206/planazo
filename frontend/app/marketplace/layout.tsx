import MarketplaceNavbar from "@/components/marketplace/MarketplaceNavbar";

export const metadata = {
  title: "Marketplace · Planazo",
  description: "Curated wedding gifts and vendors, all in one place.",
};

export default function MarketplaceLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <MarketplaceNavbar />
      <main>{children}</main>
    </div>
  );
}

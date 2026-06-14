import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import GlobalNavGate from "@/components/shared/GlobalNavGate";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:       "Snapshare — Digital Wedding Platform",
  description: "Beautiful digital wedding invitations, AI-powered photo galleries, and vendor discovery.",
  openGraph: {
    type:  "website",
    title: "Snapshare",
    url:   "https://snapshare.ai",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <GlobalNavGate />
          {children}
        </Providers>
      </body>
    </html>
  );
}

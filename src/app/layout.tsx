import type { Metadata } from "next";
import { headers } from "next/headers";
import "@/pbtv/theme.css";

async function seoMeta(): Promise<{ title: string; description: string; keywords?: string }> {
  // read host to allow per-domain branding later
  try {
    const h = await headers();
    void h; // reserved for future per-domain CMS overrides
  } catch {
    /* static */
  }
  return {
    title: "PLAYBEATTV — Premium Entertainment. One Powerful Platform.",
    description:
      "Subscribe to PLAYBEATTV for authorized live TV, sports, movies and series in HD/4K on all your devices. playbeattv.buzz",
    keywords: "IPTV, live tv, sports streaming, movies, series, playbeattv",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const m = await seoMeta();
  return {
    title: m.title,
    description: m.description,
    keywords: m.keywords,
    metadataBase: new URL("https://playbeattv.buzz"),
    openGraph: {
      title: m.title,
      description: m.description,
      url: "https://playbeattv.buzz",
      siteName: "PLAYBEATTV",
      type: "website",
    },
    icons: { icon: "/favicon.svg" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

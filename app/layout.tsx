import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
});

export const metadata: Metadata = {
  title: "Music Player 90s Interface",
  description: "Classic Windows 95/98 aesthetic music streaming application",
  openGraph: {
    title: "Music Player 90s Interface",
    description: "Classic Windows 95/98 aesthetic music streaming application",
    type: "website",
    url: "https://09musicplayer-kocwoj72m-somlutionsom.vercel.app",
    siteName: "Music Player 90s",
    images: [
      {
        url: "https://09musicplayer-kocwoj72m-somlutionsom.vercel.app/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Music Player 90s Interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Music Player 90s Interface",
    description: "Classic Windows 95/98 aesthetic music streaming application",
    images: ["https://09musicplayer-kocwoj72m-somlutionsom.vercel.app/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "X-Frame-Options": "SAMEORIGIN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${vt323.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

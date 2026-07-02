import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Persona Chat — Talk to Hitesh Choudhary & Piyush Garg",
  description:
    "AI-powered conversations with India's top tech educators. Chat with Hitesh Choudhary (Chai aur Code) or Piyush Garg — experience their unique teaching styles, get coding advice, and learn in Hinglish!",
  keywords: [
    "Hitesh Choudhary",
    "Piyush Garg",
    "AI Chat",
    "Persona",
    "Chai aur Code",
    "ChaiCode",
    "Teachyst",
    "GenAI",
    "Tech Educator",
  ],
  openGraph: {
    title: "Persona Chat — Talk to Hitesh Choudhary & Piyush Garg",
    description:
      "AI-powered conversations with India's top tech educators. Experience their unique teaching styles!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Your Name | Portfolio",
  description: "Full Stack Developer & Creative Coder - Building immersive digital experiences",
  keywords: ["developer", "portfolio", "react", "next.js", "three.js", "3D", "web developer"],
  authors: [{ name: "Your Name" }],
  openGraph: {
    title: "Your Name | Portfolio",
    description: "Full Stack Developer & Creative Coder",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} font-sans antialiased bg-linear-to-br from-gray-900 via-black to-gray-900 text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}

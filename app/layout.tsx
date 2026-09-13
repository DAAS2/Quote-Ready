/* eslint-disable @next/next/no-page-custom-font -- App Router: the root layout is
   the correct place for stylesheet links (there is no pages/_document here). */
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "QuoteReady — Scope before you price",
    template: "%s · QuoteReady",
  },
  description:
    "QuoteReady turns vague trade enquiries into quote-ready job scopes — showing what is known, missing, assumed, unsafe, or requires a site inspection before you commit to a price.",
  applicationName: "QuoteReady",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin=""
      />
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
      />
      <body className="bg-surface font-body-md text-body-md text-on-surface">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}

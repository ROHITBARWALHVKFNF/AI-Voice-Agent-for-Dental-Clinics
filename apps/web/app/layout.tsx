import type { Metadata } from "next";
import { CountryProvider } from "@/lib/country-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dental AI Clinic OS",
  description:
    "AI-powered operating system for dental clinics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CountryProvider>
          {children}
        </CountryProvider>
      </body>
    </html>
  );
}
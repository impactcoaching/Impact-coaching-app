import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Impact Coaching",
  description: "Your training, nutrition and check-ins with Adam, in one place.",
};

export const viewport: Viewport = {
  themeColor: "#060607",
  viewportFit: "cover",
  // Stops iPhone Safari zooming in when a field is tapped. People can still pinch to zoom.
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="stage" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

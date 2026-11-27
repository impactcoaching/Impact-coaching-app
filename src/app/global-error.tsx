"use client";

import "./globals.css";
import { CrashScreen } from "@/components/CrashScreen";

// Catches errors in the root layout itself, so it brings its own html and body.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en-GB">
      <body>
        <CrashScreen error={error} />
      </body>
    </html>
  );
}

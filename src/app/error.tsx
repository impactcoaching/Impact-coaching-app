"use client";

import { CrashScreen } from "@/components/CrashScreen";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return <CrashScreen error={error} />;
}

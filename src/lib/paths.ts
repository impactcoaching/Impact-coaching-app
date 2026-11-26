/** True if a storage path is a single file directly inside the given folder (no sub-folders, no "..") */
export function inFolder(path: string | null | undefined, folder: string) {
  if (!path) return false;
  const prefix = `${folder}/`;
  if (!path.startsWith(prefix)) return false;
  const name = path.slice(prefix.length);
  return /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}$/.test(name) && !name.includes("..");
}

/** A same-site path to send someone to after an email link, or "/" if it isn't one. */
export function safeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  try {
    const u = new URL(next, "https://x.invalid");
    return u.origin === "https://x.invalid" ? u.pathname + u.search + u.hash : "/";
  } catch {
    return "/";
  }
}

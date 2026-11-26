import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { posesFor } from "@/lib/checkins";
import { hasConsent } from "@/lib/checkins-server";
import { PhotoCompare, type Photo } from "@/components/PhotoCompare";
import { allowPhotos } from "@/app/actions/checkins";
import { AddPhotos } from "./AddPhotos";

export default async function ProgressPage() {
  const { supabase, user } = await requireProfile();
  const [{ data: rows }, { data: settings }, { data: intake }, allowed] = await Promise.all([
    supabase.from("progress_photos").select("id, pose, taken_on, path").eq("client_id", user.id).order("taken_on", { ascending: false }).limit(300),
    supabase.from("client_settings").select("poses").eq("client_id", user.id).maybeSingle(),
    supabase.from("client_intake").select("competes, division").eq("client_id", user.id).maybeSingle(),
    hasConsent(supabase, user.id, "progress_photos"),
  ]);
  const paths = (rows ?? []).map((r) => r.path);
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabase.storage.from("progress-photos").createSignedUrls(paths, 3600);
    data?.forEach((d) => d.path && d.signedUrl && (signed[d.path] = d.signedUrl));
  }
  const photos: Photo[] = (rows ?? []).filter((r) => signed[r.path]).map((r) => ({ id: r.id, pose: r.pose, taken_on: r.taken_on, url: signed[r.path] }));
  const poses = posesFor(settings?.poses, !!intake?.competes, intake?.division ?? null);

  return (
    <>
      <Link href="/app/checkin" className="small">
        ← Check-in
      </Link>
      <span className="eyebrow">Progress</span>
      <h1>
        Photos<span>see the change</span>
      </h1>
      {!allowed ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            You chose not to share progress photos. Turn them on to add some. They&apos;re private to you and Adam.
          </p>
          <form action={allowPhotos}>
            <button className="btn">Turn on progress photos</button>
          </form>
        </div>
      ) : (
        <>
          <div className="card" data-tour="compare">
            <h2>Compare</h2>
            <PhotoCompare photos={photos} poses={poses} />
          </div>
          <AddPhotos userId={user.id} poses={poses} />
        </>
      )}
    </>
  );
}

export function ComingSoon({ title, sub, stage, what }: { title: string; sub: string; stage: number; what: string }) {
  return (
    <>
      <h1>
        {title}
        <span>{sub}</span>
      </h1>
      <div className="card">
        <span className="chip pink" style={{ alignSelf: "flex-start" }}>
          Coming in build stage {stage}
        </span>
        <p className="muted" style={{ margin: 0 }}>
          {what}
        </p>
      </div>
    </>
  );
}

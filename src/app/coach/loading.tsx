/** Shown the instant the coach opens a page, while the page loads. */
export default function Loading() {
  return (
    <div className="stack skel" aria-busy="true" aria-label="Loading">
      <i className="sk sk-eyebrow" />
      <i className="sk sk-title" />
      <i className="sk sk-card" />
      <i className="sk sk-card short" />
    </div>
  );
}

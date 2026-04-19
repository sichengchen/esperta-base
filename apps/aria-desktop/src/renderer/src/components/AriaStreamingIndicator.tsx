export function AriaStreamingIndicator({
  phase = "thinking",
}: {
  phase?: "thinking" | "responding" | null;
}) {
  return (
    <div
      className={`aria-streaming-status${phase ? ` is-${phase}` : ""}`}
      aria-atomic="true"
      aria-live="polite"
      role="status"
    >
      <span className="aria-streaming-status-label">Thinking</span>
      <span className="aria-streaming-status-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

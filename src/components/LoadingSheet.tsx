/**
 * The loading treatment — a signature element, kept.
 *
 * A centred 400px white sheet on the page ground carrying a status line and a
 * 4px round rule, inside which a navy segment at 38% width sweeps back and
 * forth. A rule being drawn, not a spinning circle. Rebuilt in Tailwind at the
 * same measurements; nothing here is a redesign.
 */
export function LoadingSheet({ message }: { message: string }) {
  return (
    <div className="grid min-h-svh place-items-center bg-canvas p-6">
      <div className="w-[min(400px,100%)] rounded-lg border border-line bg-surface p-6 shadow-float">
        <div role="status" aria-live="polite" className="mb-4 text-md text-ink">
          {message}
        </div>
        <div className="relative h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <span className="absolute inset-y-0 left-0 w-[38%] animate-rule-sweep rounded-full bg-navy" />
        </div>
      </div>
    </div>
  )
}

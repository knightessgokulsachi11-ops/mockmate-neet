import { cn } from "@/lib/utils";
import type { QuestionStatus } from "@/lib/neet";

export const statusClass: Record<QuestionStatus, string> = {
  "not-visited": "bg-st-notvisited text-st-notvisited-foreground border-border",
  "not-answered": "bg-st-notanswered text-st-oncontrast border-transparent",
  answered: "bg-st-answered text-st-oncontrast border-transparent",
  review: "bg-st-review text-st-oncontrast border-transparent",
  "answered-review": "bg-st-review text-st-oncontrast border-transparent",
};

export function PaletteButton({
  n,
  status,
  active,
  onClick,
}: {
  n: number;
  status: QuestionStatus;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Question ${n}, ${status.replace("-", " ")}`}
      className={cn(
        "relative flex aspect-square w-full items-center justify-center rounded-none border text-sm font-semibold transition-colors",
        statusClass[status],
        active && "ring-2 ring-ring ring-offset-1 ring-offset-background",
      )}

    >
      {n}
      {status === "answered-review" && (
        <span className="absolute -bottom-1 -right-1 size-3 rounded-full border border-card bg-st-answered" />
      )}
    </button>
  );
}

export function StatusLegend({ counts }: { counts: Record<QuestionStatus, number> }) {
  const items: { key: QuestionStatus; label: string }[] = [
    { key: "answered", label: "Answered" },
    { key: "not-answered", label: "Not Answered" },
    { key: "not-visited", label: "Not Visited" },
    { key: "review", label: "Marked for Review" },
    { key: "answered-review", label: "Answered & Marked" },
  ];
  return (
    <div className="rounded-sm border-2 border-dashed border-border bg-muted/30 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Status
      </p>
      <ul className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-2">
            <span
              className={cn(
                "relative flex size-6 shrink-0 items-center justify-center rounded-none border text-[11px] font-semibold",
                statusClass[i.key],
              )}
            >
              {counts[i.key]}
              {i.key === "answered-review" && (
                <span className="absolute -bottom-1 -right-1 size-2.5 rounded-full border border-card bg-st-answered" />
              )}
            </span>
            <span className="text-muted-foreground">{i.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


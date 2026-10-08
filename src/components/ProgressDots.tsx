import { cn } from "@/lib/cn";

/**
 * Progress as dots.
 *
 * Deliberately not a bar and not a percentage - a filled bar is a progress bar in a video game, and
 * this app is not that. Done dots are MUTED rather than filled with a success colour, so finishing
 * a riddle feels like something that happened rather than something that was scored.
 *
 * The current dot is darker than the completed ones, which reads as "you are here" without any
 * celebration.
 */
export function ProgressDots({
  total,
  current,
  className,
}: {
  total: number;
  /** Zero-based index of the riddle being shown. */
  current: number;
  className?: string;
}) {
  if (total <= 0) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-[3px]", className)}
      // One announcement rather than one per dot.
      role="img"
      aria-label={`Riddle ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "size-[5px] shrink-0 rounded-full",
            i < current ? "bg-stone" : i === current ? "bg-ink" : "bg-sand",
          )}
        />
      ))}
    </div>
  );
}
import { cn } from "@/lib/cn";
import { ProgressDots } from "./ProgressDots";
import { PrimaryAction } from "./PrimaryAction";

/**
 * The riddle screen. This is the demo still frame and it carries more design weight than
 * anything else in the app.
 *
 * Layout, top to bottom:
 *   - progress, quiet: "3 of 12" and a row of dots
 *   - the riddle, vertically centred, taking all remaining space
 *   - one action, bottom-anchored for one-handed reach
 *
 * What is deliberately NOT here: a title bar, a map, an image, a hint button, a timer, a score, a
 * back arrow. Every one of those competes with a nine-year-old's attention and none of them is the
 * game. See docs/design/kids-ui-charter.md section 3.1.
 *
 * Takes plain strings rather than a Riddle object so that the sample fixtures and a real hunt saved
 * by increment 3 share exactly one screen implementation.
 */
export function RiddleScreen({
  riddle,
  index,
  total,
  onFound,
  children,
  className,
}: {
  riddle: string;
  index: number;
  total: number;
  onFound: () => void;
  /** Optional slot above the action, used for the adult-gated distance hint. */
  children?: React.ReactNode;
  className?: string;
}) {
  const isLast = index === total - 1;

  return (
    <main
      className={cn(
        "flex min-h-dvh flex-col bg-paper px-6",
        // Respect the notch and the home indicator rather than hiding controls under them.
        "pt-[max(1.25rem,env(safe-area-inset-top))]",
        "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-4">
        <span className="shrink-0 text-quiet text-ink-soft">
          {index + 1} of {total}
        </span>
        <ProgressDots total={total} current={index} className="justify-end" />
      </header>

      {/*
        flex-1 + items-center makes this the visual anchor of the screen. The riddle sits in the
        optical centre, not the geometric one.
      */}
      <section className="flex flex-1 items-center py-10">
        <p className="riddle text-riddle text-balance text-ink">{riddle}</p>
      </section>

      <footer className="flex flex-col gap-4">
        {children}
        <PrimaryAction onClick={onFound}>{isLast ? "I've found the last one" : "I've found it"}</PrimaryAction>
      </footer>
    </main>
  );
}
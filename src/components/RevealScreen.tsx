import { cn } from "@/lib/cn";
import { PrimaryAction } from "./PrimaryAction";
import { FoundIcon } from "./icons";

/**
 * The arrival screen. The payoff.
 *
 * It ends in a FACT about the place the child just stood in, never a score. No confetti, no points,
 * no level-up. The fact is the reward, and it is the only reason this app is worth a child's
 * afternoon - design charter section 3.2.
 *
 * "Correct." is deliberately the quietest part of the screen. The information about the war
 * memorial matters more than the confirmation that you found it.
 */
export function RevealScreen({
  fact,
  index,
  total,
  onNext,
  placeName,
  className,
}: {
  fact: string;
  index: number;
  total: number;
  onNext: () => void;
  placeName: string;
  className?: string;
}) {
  const isLast = index === total - 1;

  return (
    <main
      className={cn(
        "flex min-h-dvh flex-col bg-paper px-6",
        "pt-[max(1.25rem,env(safe-area-inset-top))]",
        "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <header className="flex items-center gap-3 text-found">
        {/*
          Icon + text, never colour alone. The tick is a different SHAPE from the other two
          states, so it survives a greyscale render and a washed-out screen.
        */}
        <FoundIcon className="size-6 shrink-0" />
        <span className="text-action">Correct.</span>
      </header>

      <section className="flex flex-1 items-center py-10">
        <p className="reveal-fact text-reveal-fact text-balance text-ink">{fact}</p>
      </section>

      <footer className="flex flex-col gap-4">
        <PrimaryAction onClick={onNext}>
          {isLast ? `That's all ${total}` : "Next"}
        </PrimaryAction>
        {isLast && (
          <p className="text-quiet text-center text-ink-soft">
            You walked {placeName} and found {total} {total === 1 ? "place" : "places"}.
          </p>
        )}
      </footer>
    </main>
  );
}
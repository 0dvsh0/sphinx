import { cn } from "@/lib/cn";

/**
 * The one action on a screen.
 *
 * One screen, one action. Two buttons side by side is a decision we have not earned the right to ask
 * a nine-year-old to make.
 *
 * Sizing follows the charter, section 5: 56px tall (not the 44px minimum) because this is the tap
 * that has to land. Full width and bottom-anchored so it is reachable one-handed.
 *
 * The press state changes colour and a border, NOT scale or bounce - charter section 9 forbids
 * scale animations.
 */
export function PrimaryAction({
  children,
  onClick,
  className,
  tone = "stone",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  tone?: "stone" | "quiet";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={cn(
        "flex min-h-tap-primary w-full items-center justify-center rounded-2xl px-6",
        "text-action transition-colors duration-150 ease-sphinx",
        // A press state that is visible without animating size.
        "active:translate-y-px",
        tone === "stone"
          ? "bg-stone-deep text-paper hover:bg-ink active:bg-ink"
          : "border-2 border-stone bg-transparent text-ink hover:bg-sand/60 active:bg-sand",
        // Disabled is a solid colour, NOT reduced opacity. A gate that is blocking someone has to be
        // legible enough to read why it is blocking them, and opacity would drop the label below the
        // contrast floor the rest of this interface is held to. WCAG exempts disabled controls; a
        // nine-year-old does not have that exemption.
        disabled && "bg-sand text-stone-deep hover:bg-sand active:bg-sand cursor-not-allowed",
        disabled && tone === "stone" && "border-2 border-stone",
        className,
      )}
    >
      {children}
    </button>
  );
}
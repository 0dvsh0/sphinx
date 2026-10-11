import { ParentPanel } from "@/components/parent/ParentPanel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grown-ups",
  description: "Safety settings, stranger script, and approvals for Sphinx walks.",
};

/**
 * /parent - the grown-ups' side of the app.
 *
 * A route rather than a slide-over, on purpose: a disclosure panel that can be dismissed by accident
 * is not a place to keep a stranger-safety script. This one is boring and it stays where it is.
 *
 * Deliberately has no child-facing link. The child's interface never points at it, so there is no
 * version of "find the settings" a nine-year-old can be sent to.
 */
export default function ParentPage() {
  return (
    <main>
      <ParentPanel />
    </main>
  );
}

import { osmAttribution } from "@/lib/config";

/**
 * ODbL attribution. Must be on screen and reachable at all times - it may be collapsed or
 * auto-hidden, but an (i) or an "About / Data licences" entry must remain.
 * See https://wiki.osmfoundation.org/wiki/Licence/Attribution_Guidelines
 *
 * A child is likely to be handed this app by another child and used somewhere we have never seen.
 * Attribution is a licence condition, not a footer nicety.
 */
export function OsmAttribution() {
  return (
    <a
      href={osmAttribution.href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-xs text-ink-soft underline underline-offset-2"
    >
      Map data by {osmAttribution.name} contributors
    </a>
  );
}
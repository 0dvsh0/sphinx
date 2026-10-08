import { SeededDemo } from "@/components/hunt/SeededDemo";
import baked from "../../../../data/riddles/bristol.json";
import type { HuntArtifact } from "@/lib/riddle";

/**
 * The demo: a real hunt, baked into the repository at build time.
 *
 * The hunts in data/riddles/ were built by `npm run hunt -- Bristol` from live OpenStreetMap data,
 * riddles and all. Nothing here is hand-written sample text.
 *
 * Baking them means the demo runs with no API key, no network, and no OpenStreetMap request - which
 * is what makes it safe to show, and safe to screenshot, on submission day.
 *
 * Regenerate with:
 *   npm run hunt -- Bristol --out data/riddles/bristol.json
 */
const artifact = {
  ...(baked as unknown as HuntArtifact),
  // Stable id: revisiting the demo resumes the walk rather than seeding a second copy.
  id: "demo-bristol",
};

export default function DemoWalkPage() {
  return <SeededDemo artifact={artifact} />;
}
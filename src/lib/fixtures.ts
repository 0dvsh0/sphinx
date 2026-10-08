/**
 * Hand-written sample riddles for the increment 1 design review.
 *
 * PLACEHOLDER DATA. These are written by hand in the house style to design and review the riddle
 * screen. They are NOT model output and NOT tied to real OSM features. Increment 2 replaces this
 * with real objects from real map data.
 *
 * They are kept honest to the house style anyway, because a design review against unrealistic
 * content is worthless:
 *   - two lines, never naming the target
 *   - every clue is something a child could verify by standing there
 *   - sober register; the war memorial line is the tone reference
 */

import type { Hunt } from "./riddle";

export const demoHunt: Hunt = {
  id: "demo-riverside-walk",
  placeName: "Riverside walk",
  riddles: [
    {
      id: "r1",
      // The reference line from the pitch. Register is set by this one.
      riddle: "I hold the names of those who didn't come home, and pigeons hold me.",
      fact: "A war memorial. The inscription on it carries the year 1919.",
    },
    {
      id: "r2",
      riddle: "Someone painted a sky where there is only a wall. Children have been adding to it for years.",
      fact: "A mural. The paint is a few layers thick, and the top layer is not from the artist.",
    },
    {
      id: "r3",
      riddle: "Small hands climbed here before you were born. The slide still goes the same way down.",
      fact: "A playground. The frame is older than the rubber surface it was reskinned with.",
    },
    {
      id: "r4",
      riddle: "I was a mouth for the thirsty. Now only the wall remembers the plumbing.",
      fact: "A drinking fountain, mapped but no longer working. The map still thinks it is there.",
    },
    {
      id: "r5",
      riddle: "Letters small enough to miss, on a wall that was busy being a wall.",
      fact: "A blue plaque, marking someone who lived or worked here.",
    },
    {
      id: "r6",
      riddle: "I used to be a wall with a roof. The roof went first. Then I forgot what I was for.",
      fact: "Ruins. What is left is the outline of a building that no longer stands.",
    },
  ],
};
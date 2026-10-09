import { HuntBuilder } from "@/components/hunt/HuntBuilder";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

/**
 * The hunt builder screen.
 *
 * Reached at /build. The one flow that genuinely needs a network connection - it fetches
 * OpenStreetMap data - and the only step in the product a grown-up operates rather than a child.
 */
export default function BuildPage() {
  return (
    <>
      <HuntBuilder />
      <ServiceWorkerRegistration />
    </>
  );
}
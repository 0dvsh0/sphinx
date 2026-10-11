import { SavedHuntPlayer } from "@/components/hunt/SavedHuntPlayer";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

/**
 * Plays a saved hunt, from IndexedDB, with no network.
 *
 * The component is a client component because the hunt only exists on the device - there is nothing
 * for a server to render. That is the point, not a limitation: the hunt was fetched once at build
 * time and everything after that is local.
 */
export function generateStaticParams() {
  return [
    { huntId: "demo" },
    { huntId: "bristol" },
    { huntId: "ahmedabad" },
    { huntId: "madison" },
  ];
}

export default async function PlayHuntPage({ params }: { params: Promise<{ huntId: string }> }) {
  const { huntId } = await params;

  return (
    <>
      <SavedHuntPlayer huntId={huntId} />
      <ServiceWorkerRegistration />
    </>
  );
}
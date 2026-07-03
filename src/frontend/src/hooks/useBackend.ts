import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";

/**
 * Returns the live backend actor (or null while the underlying agent is still
 * initializing). All data hooks in `useQueries.ts` consume this accessor so the
 * actor wiring lives in exactly one place.
 */
export function useBackend() {
  const { actor, isFetching } = useActor(createActor);
  return { actor, isFetching };
}

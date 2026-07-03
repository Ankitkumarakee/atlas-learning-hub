import { createActor } from "@/backend";
import { createActorWithConfig } from "@caffeineai/core-infrastructure";
import { useEffect, useState } from "react";
import { getGuestIdentity } from "./useGuestIdentity";

/**
 * Returns the live backend actor (or null while it is still initializing).
 * The actor is created with `createActorWithConfig` using the stable guest
 * identity so the backend sees a consistent principal for every caller.
 */
export function useBackend() {
  const [actor, setActor] = useState<ReturnType<typeof createActor> | null>(
    null,
  );
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);
    createActorWithConfig(createActor, {
      agentOptions: { identity: getGuestIdentity() },
    })
      .then((a) => {
        if (cancelled) return;
        setActor(a);
        setIsFetching(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { actor, isFetching };
}

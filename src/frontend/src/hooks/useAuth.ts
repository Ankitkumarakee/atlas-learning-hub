import { UserRole } from "@/backend";
import type { DisplayRole } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useBackend } from "./useBackend";
import { getGuestIdentity } from "./useGuestIdentity";

export interface AuthState {
  /** The principal of the stable guest identity used for all callers. */
  principal: string | null;
  /** Backend-resolved role for the caller (admin | user | guest). */
  role: UserRole;
  /** UI-facing role discriminator that adds a synthetic "creator" tier. */
  displayRole: DisplayRole;
  isSignedIn: boolean;
  isGuest: boolean;
  isUser: boolean;
  /** True for any authenticated, non-guest caller. */
  isCreator: boolean;
  isAdmin: boolean;
  signIn: () => void;
  signOut: () => void;
  /** True while the backend role lookup is in flight. */
  isLoadingRole: boolean;
}

const guestIdentity = getGuestIdentity();
const guestPrincipal = guestIdentity.getPrincipal().toText();

const noop = () => {};

/**
 * Returns a stable guest identity for every caller. Sign-in has been removed,
 * so the app always operates as the same persisted Ed25519 principal. The
 * `AuthState` shape is preserved so existing consumers keep compiling, but
 * `isSignedIn` is always true and `signIn`/`signOut` are no-ops.
 */
export function useAuth(): AuthState {
  const { actor, isFetching } = useBackend();

  const roleQuery = useQuery<UserRole>({
    queryKey: ["caller-role", guestPrincipal],
    queryFn: async () => {
      if (!actor) return UserRole.user;
      try {
        return await actor.getCallerUserRole();
      } catch {
        return UserRole.user;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });

  // The backend role is best-effort; the UI treats the guest as a creator
  // (can publish content) regardless of the backend's view.
  const role = roleQuery.data ?? UserRole.user;
  const isSignedIn = true;
  const isGuest = false;
  const isUser = true;
  const isAdmin = false;
  const isCreator = true;

  const displayRole: DisplayRole = "creator";

  return {
    principal: guestPrincipal,
    role,
    displayRole,
    isSignedIn,
    isGuest,
    isUser,
    isCreator,
    isAdmin,
    signIn: noop,
    signOut: noop,
    isLoadingRole: roleQuery.isLoading,
  };
}

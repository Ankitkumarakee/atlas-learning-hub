import { UserRole } from "@/backend";
import type { DisplayRole } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { useBackend } from "./useBackend";

export interface AuthState {
  /** The Internet Identity principal of the signed-in user, or null. */
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

/**
 * Wraps `useInternetIdentity()` and resolves the caller's backend role via
 * `getCallerUserRole()`. The backend only knows `admin | user | guest`; the
 * "creator" tier is a UI concept layered on top of authenticated users and is
 * surfaced through `displayRole` for navigation gating.
 */
export function useAuth(): AuthState {
  const { identity, login, clear, isAuthenticated } = useInternetIdentity();
  const { actor, isFetching } = useBackend();

  const principal = identity?.getPrincipal().toText() ?? null;

  const roleQuery = useQuery<UserRole>({
    queryKey: ["caller-role", principal],
    queryFn: async () => {
      if (!actor) return UserRole.guest;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    staleTime: 30_000,
  });

  const role = roleQuery.data ?? UserRole.guest;
  const isSignedIn = isAuthenticated;
  const isGuest = !isAuthenticated || role === UserRole.guest;
  const isUser = isSignedIn && role === UserRole.user;
  const isAdmin = isSignedIn && role === UserRole.admin;
  // Any authenticated, non-guest caller can publish content on this platform.
  const isCreator = isSignedIn && role !== UserRole.guest;

  const displayRole: DisplayRole = isAdmin
    ? "admin"
    : isCreator
      ? "creator"
      : isSignedIn
        ? "user"
        : "guest";

  return {
    principal,
    role,
    displayRole,
    isSignedIn,
    isGuest,
    isUser,
    isCreator,
    isAdmin,
    signIn: login,
    signOut: clear,
    isLoadingRole: roleQuery.isLoading,
  };
}

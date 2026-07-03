import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wraps `next-themes` so the rest of the app imports a single, project-local
 * `ThemeProvider`. Defaults to the user's system preference and persists the
 * choice in `localStorage` under the `atlas-theme` key.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="atlas-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

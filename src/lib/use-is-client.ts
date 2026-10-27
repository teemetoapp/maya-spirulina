import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** true after hydration on the client; false during SSR and the hydration render. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

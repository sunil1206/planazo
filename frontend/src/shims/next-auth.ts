/**
 * Shim: next-auth → no-op
 * Auth is handled by Zustand (stores/authStore.ts) + JWT in localStorage.
 * This shim prevents import errors for any file that still references next-auth.
 */
export default function NextAuth(_config: unknown) {
  return { handlers: {}, signIn: async () => {}, signOut: async () => {}, auth: async () => null };
}
export const signIn  = async () => {};
export const signOut = async () => {};
export const auth    = async () => null;

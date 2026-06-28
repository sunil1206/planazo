/**
 * Shim: next/navigation → react-router-dom
 * Lets existing pages that import from "next/navigation" work unchanged.
 *
 * API differences handled here:
 *   next/navigation usePathname()      → string
 *   next/navigation useSearchParams()  → URLSearchParams  (not a tuple)
 *   next/navigation useParams()        → Record<string,string>  (same as RRD)
 *   next/navigation useRouter()        → {push,replace,back,forward,refresh}
 */
import { useNavigate, useLocation, useParams as rrUseParams, useSearchParams as rrUseSearchParams } from "react-router-dom";

export function usePathname(): string {
  return useLocation().pathname;
}

export function useParams(): Record<string, string> {
  return rrUseParams() as Record<string, string>;
}

export function useSearchParams(): URLSearchParams {
  const [searchParams] = rrUseSearchParams();
  return searchParams;
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push:    (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back:    ()            => navigate(-1 as any),
    forward: ()            => navigate(1 as any),
    refresh: ()            => window.location.reload(),
  };
}

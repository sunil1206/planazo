/**
 * Shim: next/link → react-router-dom Link
 * Next.js Link uses `href`; react-router-dom Link uses `to`.
 */
import React from "react";
import { Link as RRLink } from "react-router-dom";

interface NextLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  replace?: boolean;
  children?: React.ReactNode;
  className?: string;
  prefetch?: boolean;
}

export default function Link({ href, replace, prefetch: _prefetch, children, ...rest }: NextLinkProps) {
  return (
    <RRLink to={href} replace={replace} {...rest}>
      {children}
    </RRLink>
  );
}

"""Server-rendered SEO landing pages.

Planazo's frontend (frontend/) is a Vite + React SPA — client-rendered, so
crawlers that don't execute JavaScript (Bing, GPTBot, PerplexityBot, and
others) never see its content. Rather than migrating the whole app to a
framework with SSR/SSG (Next.js, etc. — a large separate project), this
package adds a second, much smaller surface: real server-rendered HTML pages
for the content that actually needs to rank — vendor category/city listing
pages and vendor detail pages — built with FastAPI + Jinja2 directly from
the same Postgres data the SPA uses.

The interactive app (dashboards, editors, checkout, auth) stays exactly as
it is; this is purely additive, for the pages Google/Bing/AI crawlers need
to be able to read without running JS.

See app/ssr/router.py for routes, app/ssr/queries.py for the DB access,
and SEO_ROADMAP.md for what's covered vs. deliberately deferred.
"""

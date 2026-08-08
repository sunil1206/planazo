"""
Admin RBAC — platform-wide roles for the /admin, /vendor-admin, /gift-admin
SQLAdmin panels and any admin-only API route (e.g. /api/seo/admin/*).

Unrelated to app/models/permissions.py's EventRole/EventPermission, which
governs per-event collaboration (wedding/birthday photo permissions), not
admin panel access — but deliberately mirrors that module's
role -> capability-preset shape.
"""


class AdminRole:
    SUPER_ADMIN        = "SUPER_ADMIN"
    ADMIN              = "ADMIN"
    EDITOR             = "EDITOR"
    SEO_MANAGER        = "SEO_MANAGER"
    MARKETING_MANAGER  = "MARKETING_MANAGER"
    SUPPORT            = "SUPPORT"

    ALL = [SUPER_ADMIN, ADMIN, EDITOR, SEO_MANAGER, MARKETING_MANAGER, SUPPORT]

    # Capabilities are "resource:action" strings. "resource:*" grants every
    # action on that resource; "*" grants everything everywhere.
    CAPABILITIES: dict = {
        SUPER_ADMIN:        {"*"},
        ADMIN:               {"users:*", "orders:*", "vendors:*", "content:*",
                               "seo:*", "marketing:*", "support:*", "audit:*"},
        EDITOR:              {"content:*"},
        SEO_MANAGER:         {"seo:*"},
        MARKETING_MANAGER:   {"marketing:*", "content:read"},
        SUPPORT:             {"users:read", "orders:read", "vendors:read"},
    }

    @classmethod
    def has_capability(cls, role, capability: str) -> bool:
        """True if `role` (an AdminRole value, or None/unrecognized) grants `capability`."""
        caps = cls.CAPABILITIES.get(role, set())
        if "*" in caps or capability in caps:
            return True
        resource = capability.split(":", 1)[0]
        return f"{resource}:*" in caps

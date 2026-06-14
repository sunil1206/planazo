import environ
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR.parent / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost"])

# ─── Apps ─────────────────────────────────────────────────────────────────────
DJANGO_APPS = [
    "jazzmin",                        # ← must be BEFORE django.contrib.admin
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "django_prometheus",
]

LOCAL_APPS = [
    "apps.account.apps.AccountConfig",  # Use the full path to the Config class
    "apps.invitation",
    "apps.gallery",
    "apps.vendor",
    "apps.payment",
    "apps.gift",
    "apps.birthday.apps.BirthdayConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

SITE_ID = 1

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # serves /static/ without Nginx in dev
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

# ─── Database ─────────────────────────────────────────────────────────────────
DATABASES = {
    "default": env.db("DATABASE_URL", default=f"postgres://{env('DB_USER', default='planazo')}:{env('DB_PASSWORD', default='planazo123')}@{env('DB_HOST', default='postgres')}:{env('DB_PORT', default='5432')}/{env('DB_NAME', default='planazo')}")
}

# ─── Cache (Redis) ────────────────────────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://redis:6379/0"),
    }
}

# ─── Auth ─────────────────────────────────────────────────────────────────────
# AUTH_USER_MODEL = "account.User"
AUTH_USER_MODEL = "local_account.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# ─── Allauth ──────────────────────────────────────────────────────────────────
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_VERIFICATION = "none"  # No OTP/email verification required

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
        "APP": {
            "client_id": env("GOOGLE_CLIENT_ID", default=""),
            "secret": env("GOOGLE_CLIENT_SECRET", default=""),
            "key": "",
        },
    }
}

# ─── JWT ──────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=30)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ─── DRF ──────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}

# ─── CORS ─────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"]
)
CORS_ALLOW_CREDENTIALS = True

# ─── Media / Static ───────────────────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []
STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ─── Celery ───────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://redis:6379/1")
CELERY_RESULT_BACKEND = env("REDIS_URL", default="redis://redis:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Kolkata"

# ─── Email ────────────────────────────────────────────────────────────────────
RESEND_API_KEY = env("RESEND_API_KEY", default="")
DEFAULT_FROM_EMAIL  = env("FROM_EMAIL",        default="no-reply@planazo.ai")
GIFT_ADMIN_EMAIL    = env("GIFT_ADMIN_EMAIL",   default="gifts@planazo.ai")
VENDOR_ADMIN_EMAIL  = env("VENDOR_ADMIN_EMAIL", default="vendors@planazo.ai")
WEDDING_ADMIN_EMAIL = env("WEDDING_ADMIN_EMAIL",default="weddings@planazo.ai")

# ─── Sentry ───────────────────────────────────────────────────────────────────
SENTRY_DSN = env("SENTRY_DSN", default="")

# ─── Frontend URL ─────────────────────────────────────────────────────────────
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

# ─── Razorpay ─────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID = env("RAZORPAY_KEY_ID", default="")
RAZORPAY_KEY_SECRET = env("RAZORPAY_KEY_SECRET", default="")

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── Jazzmin Admin UI ─────────────────────────────────────────────────────────
JAZZMIN_SETTINGS = {
    # Title shown in the browser tab and top bar
    "site_title":         "Planazo Admin",
    "site_header":        "Planazo",
    "site_brand":         "💍 Planazo",
    "site_logo":          None,
    "login_logo":         None,
    "site_icon":          None,

    # Welcome text on login page
    "welcome_sign":       "Welcome to Planazo Admin",
    "copyright":          "Planazo Technologies · All rights reserved",

    # Search models in top search bar
    "search_model":       ["auth.User", "vendor.VendorWebsite", "invitation.CoupleWebsite"],

    # User info shown in top right
    "user_avatar":        None,

    # Top navigation links
    "topmenu_links": [
        { "name": "Home",        "url": "admin:index",            "permissions": ["auth.view_user"] },
        { "name": "Vendors",     "url": "admin:vendor_vendorwebsite_changelist" },
        { "name": "Couples",     "url": "admin:invitation_couplewebsite_changelist" },
        { "name": "View Site",   "url": "/",                      "new_window": True },
    ],

    # Left navigation: custom ordering and icons
    "show_sidebar":           True,
    "navigation_expanded":    True,
    "hide_apps":              [],
    "hide_models":            [],
    "order_with_respect_to":  [
        "account", "invitation", "vendor", "gift", "birthday", "payment", "auth",
    ],

    # ── App/Model icons (Font Awesome 5 free) ─────────────────────────────────
    "icons": {
        # Account
        "account.UserAccount":     "fas fa-user",
        "auth.Group":              "fas fa-users",
        # Invitation
        "invitation.CoupleWebsite":    "fas fa-ring",
        "invitation.WeddingVendor":    "fas fa-handshake",
        "invitation.InvitationRSVP":   "fas fa-envelope-open-text",
        "invitation.WeddingGalleryPhoto": "fas fa-images",
        "invitation.WeddingWish":      "fas fa-star",
        "invitation.WeddingEvent":     "fas fa-calendar-alt",
        "invitation.WeddingStory":     "fas fa-book-open",
        # Vendor
        "vendor.VendorWebsite":        "fas fa-store",
        "vendor.VendorPackage":        "fas fa-box-open",
        "vendor.VendorPortfolioImage": "fas fa-camera",
        "vendor.VendorEnquiry":        "fas fa-comment-dots",
        "vendor.VendorReview":         "fas fa-star-half-alt",
        "vendor.VendorFavorite":       "fas fa-heart",
        "vendor.SubscriptionPlan":     "fas fa-crown",
        "vendor.VendorSubscription":   "fas fa-credit-card",
        # Gift / Shop
        "gift.GiftSeller":             "fas fa-store-alt",
        "gift.GiftProduct":            "fas fa-gift",
        "gift.GiftOrder":              "fas fa-shopping-cart",
        # Birthday
        "birthday.BirthdayPage":       "fas fa-birthday-cake",
        "birthday.BirthdayRSVP":       "fas fa-check-circle",
        "birthday.BirthdayWish":       "fas fa-heart",
        # Payment
        "payment.UserSubscription":    "fas fa-wallet",
    },
    "default_icon_parents": "fas fa-folder",
    "default_icon_children": "fas fa-circle",

    # Branding colors
    "related_modal_active":     True,
    "custom_css":               None,
    "custom_js":                None,
    "use_google_fonts_cdn":     True,
    "show_ui_builder":          False,

    # Change view config
    "changeform_format":        "horizontal_tabs",
    "changeform_format_overrides": {
        "local_account.user": "collapsible",   # custom user model (was auth.user → wrong app label)
    },
    "language_chooser":         False,
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text":       False,
    "footer_small_text":       False,
    "body_small_text":         True,
    "brand_small_text":        False,
    "brand_colour":            "navbar-dark",
    "accent":                  "accent-pink",
    "navbar":                  "navbar-dark",
    "no_navbar_border":        False,
    "navbar_fixed":            True,
    "layout_boxed":            False,
    "footer_fixed":            False,
    "sidebar_fixed":           True,
    "sidebar":                 "sidebar-dark-pink",
    "sidebar_nav_small_text":  False,
    "sidebar_disable_expand":  False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style":  False,
    "theme":                   "default",
    "dark_mode_theme":         None,
    "button_classes": {
        "primary":   "btn-primary",
        "secondary": "btn-secondary",
        "info":      "btn-info",
        "warning":   "btn-warning",
        "danger":    "btn-danger",
        "success":   "btn-success",
    },
}

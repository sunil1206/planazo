from django.apps import AppConfig

class AccountConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.account"
    label = "local_account"   # avoids clash with allauth's built-in "account" app
    verbose_name = "Accounts"
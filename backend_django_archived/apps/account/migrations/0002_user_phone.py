from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Adds phone field to User model.
    Dependency uses 'local_account' label (not 'account') because the app
    sets label = 'local_account' in apps.py to avoid clash with allauth.
    """

    dependencies = [
        ("local_account", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="phone",
            field=models.CharField(
                blank=True,
                help_text="E.164 format, e.g. +919876543210",
                max_length=20,
                null=True,
                unique=True,
            ),
        ),
    ]

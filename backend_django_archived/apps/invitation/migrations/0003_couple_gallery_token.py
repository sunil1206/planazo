import secrets
from django.db import migrations, models


def generate_tokens(apps, schema_editor):
    """Generate unique tokens for all existing CoupleWebsite rows."""
    CoupleWebsite = apps.get_model("invitation", "CoupleWebsite")
    used = set()
    for site in CoupleWebsite.objects.all():
        token = secrets.token_hex(3).upper()
        while token in used:
            token = secrets.token_hex(3).upper()
        site.gallery_token = token
        site.save(update_fields=["gallery_token"])
        used.add(token)


class Migration(migrations.Migration):

    dependencies = [
        ("invitation", "0002_initial"),
    ]

    operations = [
        # Add as nullable first, then fill, then make unique
        migrations.AddField(
            model_name="couplewebsite",
            name="gallery_token",
            field=models.CharField(
                blank=True,
                null=True,
                help_text="Share this code with your photographer to link their photos",
                max_length=12,
            ),
        ),
        migrations.RunPython(generate_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="couplewebsite",
            name="gallery_token",
            field=models.CharField(
                blank=True,
                max_length=12,
                unique=True,
                help_text="Share this code with your photographer to link their photos",
            ),
        ),
    ]

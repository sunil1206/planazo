# Generated migration: add gallery_type to GalleryImage so we can separate
# invitation, public album, and private dashboard galleries cleanly.
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("gallery", "0002_add_uploaded_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="galleryimage",
            name="gallery_type",
            field=models.CharField(
                max_length=20,
                default="INVITATION",
                db_index=True,
                choices=[
                    ("INVITATION", "Invitation gallery (visible on the invitation page)"),
                    ("ALBUM",      "Public album (visible on the digital album page)"),
                    ("PRIVATE",    "Private (dashboard only - never public)"),
                ],
            ),
        ),
    ]

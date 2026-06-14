from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("invitation", "0003_couple_gallery_token"),
    ]

    operations = [
        # Add guests column to RSVP if not present
        migrations.AddField(
            model_name="invitationrsvp",
            name="guests",
            field=models.PositiveIntegerField(default=1),
            preserve_default=True,
        ),
        # New gallery photo table
        migrations.CreateModel(
            name="WeddingGalleryPhoto",
            fields=[
                ("id",            models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image",         models.ImageField(upload_to="wedding_gallery/")),
                ("thumbnail",     models.ImageField(blank=True, null=True, upload_to="wedding_gallery/thumbs/")),
                ("tag",           models.CharField(
                    choices=[
                        ("ceremony",  "Ceremony"),
                        ("reception", "Reception"),
                        ("portrait",  "Portrait"),
                        ("fun",       "Fun Moments"),
                        ("decor",     "Décor"),
                        ("other",     "Other"),
                    ],
                    default="other", max_length=20,
                )),
                ("caption",       models.CharField(blank=True, max_length=255)),
                ("uploader_name", models.CharField(blank=True, default="Guest", max_length=100)),
                ("is_approved",   models.BooleanField(default=True)),
                ("created_at",    models.DateTimeField(auto_now_add=True)),
                ("website",       models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="guest_photos",
                    to="invitation.couplewebsite",
                )),
            ],
            options={"db_table": "wedding_gallery_photos", "ordering": ["-created_at"]},
        ),
    ]

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("invitation", "0004_wedding_gallery_photo"),
        ("vendor",     "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WeddingVendor",
            fields=[
                ("id",           models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("service_note", models.CharField(blank=True, help_text="e.g. 'Bridal Photography'", max_length=255)),
                ("order",        models.PositiveIntegerField(default=0)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
                ("website",  models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="wedding_vendors", to="invitation.couplewebsite")),
                ("vendor",   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="wedding_bookings", to="vendor.vendorwebsite")),
            ],
            options={
                "db_table":       "wedding_vendors",
                "ordering":       ["order", "created_at"],
                "unique_together": {("website", "vendor")},
            },
        ),
    ]

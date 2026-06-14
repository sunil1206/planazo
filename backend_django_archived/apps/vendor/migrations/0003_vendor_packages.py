import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vendor", "0002_vendor_theme_categories"),
    ]

    operations = [
        migrations.CreateModel(
            name="VendorPackage",
            fields=[
                ("id",           models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",         models.CharField(max_length=100)),
                ("price",        models.DecimalField(decimal_places=2, help_text="Price in INR", max_digits=10)),
                ("description",  models.CharField(blank=True, max_length=500)),
                ("features",     models.JSONField(default=list, help_text="List of included feature strings")),
                ("max_hours",    models.PositiveIntegerField(blank=True, help_text="Hours of coverage / service", null=True)),
                ("delivery_days",models.PositiveIntegerField(blank=True, help_text="Delivery / turnaround days", null=True)),
                ("is_popular",   models.BooleanField(default=False, help_text="Highlight as most popular")),
                ("allows_custom",models.BooleanField(default=True, help_text="Client can request custom add-ons")),
                ("is_available", models.BooleanField(default=True)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
                ("vendor",       models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="packages",
                    to="vendor.vendorwebsite",
                )),
            ],
            options={"db_table": "vendor_packages", "ordering": ["price"]},
        ),
    ]

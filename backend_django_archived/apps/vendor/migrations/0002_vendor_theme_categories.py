import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("vendor", "0001_initial"),
    ]

    operations = [
        # New fields on VendorWebsite
        migrations.AddField(
            model_name="vendorwebsite",
            name="theme_color",
            field=models.CharField(default="#C9952A", help_text="Hex colour for portfolio accent", max_length=20),
        ),
        migrations.AddField(
            model_name="vendorwebsite",
            name="tagline",
            field=models.CharField(blank=True, help_text="Short catchphrase shown on portfolio header", max_length=255),
        ),
        migrations.AddField(
            model_name="vendorwebsite",
            name="cover_image",
            field=models.ImageField(blank=True, null=True, upload_to="vendor/cover/"),
        ),
        # New PortfolioCategory model
        migrations.CreateModel(
            name="PortfolioCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",  models.CharField(max_length=100)),
                ("emoji", models.CharField(blank=True, default="📸", max_length=10)),
                ("order", models.PositiveIntegerField(default=0)),
                ("vendor", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="portfolio_categories",
                    to="vendor.vendorwebsite",
                )),
            ],
            options={"db_table": "vendor_portfolio_categories", "ordering": ["order", "id"]},
        ),
        # Add category FK to VendorPortfolioImage
        migrations.AddField(
            model_name="vendorportfolioimage",
            name="category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="images",
                to="vendor.portfoliocategory",
            ),
        ),
    ]

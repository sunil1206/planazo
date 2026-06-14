"""
Migration: Add VendorCategory, VendorThemePreset models.
Add category_obj FK and theme_preset FK to VendorWebsite.
Add icon_image to PortfolioCategory.
Seed default categories and themes.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("vendor", "0005_vendor_favorite"),
    ]

    operations = [
        # ── VendorCategory ──────────────────────────────────────────────────────
        migrations.CreateModel(
            name="VendorCategory",
            fields=[
                ("id",          models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("key",         models.CharField(max_length=30, unique=True,
                                                 help_text="Uppercase slug, e.g. PHOTOGRAPHER")),
                ("name",        models.CharField(max_length=100)),
                ("icon_image",  models.ImageField(blank=True, null=True,
                                                  upload_to="vendor/category_icons/",
                                                  help_text="Small icon image (replaces emoji)")),
                ("description", models.TextField(blank=True)),
                ("order",       models.PositiveIntegerField(default=0)),
                ("is_active",   models.BooleanField(default=True)),
            ],
            options={"db_table": "vendor_categories",
                     "ordering": ["order", "name"],
                     "verbose_name": "Vendor Category",
                     "verbose_name_plural": "Vendor Categories"},
        ),

        # ── VendorThemePreset ───────────────────────────────────────────────────
        migrations.CreateModel(
            name="VendorThemePreset",
            fields=[
                ("id",            models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name",          models.CharField(max_length=100)),
                ("hex_color",     models.CharField(max_length=20,
                                                   help_text="Hex colour, e.g. #C9952A")),
                ("preview_image", models.ImageField(blank=True, null=True,
                                                    upload_to="vendor/theme_previews/")),
                ("order",         models.PositiveIntegerField(default=0)),
                ("is_active",     models.BooleanField(default=True)),
            ],
            options={"db_table": "vendor_theme_presets",
                     "ordering": ["order", "name"],
                     "verbose_name": "Theme Preset",
                     "verbose_name_plural": "Theme Presets"},
        ),

        # ── VendorWebsite: add category_obj FK ─────────────────────────────────
        migrations.AddField(
            model_name="vendorwebsite",
            name="category_obj",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="vendors",
                to="vendor.vendorcategory",
                help_text="Select from dynamic categories (preferred)",
            ),
        ),

        # ── VendorWebsite: add theme_preset FK ─────────────────────────────────
        migrations.AddField(
            model_name="vendorwebsite",
            name="theme_preset",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="vendors",
                to="vendor.vendorthemepreset",
                help_text="Portfolio colour theme (from dynamic presets)",
            ),
        ),

        # ── VendorWebsite: make category blank-able for legacy compat ──────────
        migrations.AlterField(
            model_name="vendorwebsite",
            name="category",
            field=models.CharField(
                max_length=20,
                blank=True,
                default="",
                choices=[
                    ("PHOTOGRAPHER", "Photographer"),
                    ("EVENT",        "Event Manager"),
                    ("DECOR",        "Decorator"),
                    ("CATERING",     "Caterer"),
                    ("MAKEUP",       "Makeup Artist"),
                    ("MUSIC",        "DJ / Music"),
                ],
            ),
        ),

        # ── VendorWebsite: update theme_color help_text ─────────────────────────
        migrations.AlterField(
            model_name="vendorwebsite",
            name="theme_color",
            field=models.CharField(
                max_length=20,
                default="#C9952A",
                help_text="Hex colour for portfolio accent (legacy; use theme_preset instead)",
            ),
        ),

        # ── PortfolioCategory: add icon_image, make emoji optional ─────────────
        migrations.AddField(
            model_name="portfoliocategory",
            name="icon_image",
            field=models.ImageField(
                blank=True, null=True,
                upload_to="vendor/portfolio_cat_icons/",
                help_text="Category icon image (replaces emoji)",
            ),
        ),
        migrations.AlterField(
            model_name="portfoliocategory",
            name="emoji",
            field=models.CharField(max_length=10, blank=True, default=""),
        ),

        # ── Seed default VendorCategories ────────────────────────────────────────
        migrations.RunSQL(
            sql="""
            INSERT INTO vendor_categories (key, name, description, "order", is_active)
            VALUES
              ('PHOTOGRAPHER', 'Photographer',  'Wedding & event photography', 1, TRUE),
              ('EVENT',        'Event Manager', 'Full event planning & coordination', 2, TRUE),
              ('DECOR',        'Decorator',     'Floral & venue decoration', 3, TRUE),
              ('CATERING',     'Caterer',       'Food & beverage catering', 4, TRUE),
              ('MAKEUP',       'Makeup Artist', 'Bridal & grooming makeup', 5, TRUE),
              ('MUSIC',        'DJ / Music',    'DJ, live music & sound', 6, TRUE)
            ON CONFLICT (key) DO NOTHING;
            """,
            reverse_sql="DELETE FROM vendor_categories WHERE key IN ('PHOTOGRAPHER','EVENT','DECOR','CATERING','MAKEUP','MUSIC');",
        ),

        # ── Seed default VendorThemePresets ─────────────────────────────────────
        migrations.RunSQL(
            sql="""
            INSERT INTO vendor_theme_presets (name, hex_color, "order", is_active)
            VALUES
              ('Gold Rose',       '#C9952A', 1, TRUE),
              ('Deep Navy',       '#1A2B4A', 2, TRUE),
              ('Forest Green',    '#2D6A4F', 3, TRUE),
              ('Royal Purple',    '#6B2FA0', 4, TRUE),
              ('Cinematic Dark',  '#1C1C1E', 5, TRUE)
            ON CONFLICT DO NOTHING;
            """,
            reverse_sql="DELETE FROM vendor_theme_presets;",
        ),
    ]

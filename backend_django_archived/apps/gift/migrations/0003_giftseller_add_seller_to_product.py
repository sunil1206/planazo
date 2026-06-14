from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("gift", "0002_seed_products"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GiftSeller",
            fields=[
                ("id",            models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("business_name", models.CharField(max_length=255)),
                ("description",   models.TextField(blank=True)),
                ("logo",          models.ImageField(blank=True, null=True, upload_to="gifts/sellers/")),
                ("phone",         models.CharField(blank=True, max_length=20)),
                ("email",         models.EmailField(blank=True)),
                ("gstin",         models.CharField(blank=True, max_length=20, verbose_name="GSTIN")),
                ("bank_account",  models.CharField(blank=True, max_length=30)),
                ("ifsc",          models.CharField(blank=True, max_length=12)),
                ("status",        models.CharField(choices=[("PENDING","Pending Review"),("APPROVED","Approved"),("REJECTED","Rejected")], default="PENDING", max_length=10)),
                ("commission_pct",models.DecimalField(decimal_places=2, default=10, max_digits=5)),
                ("created_at",    models.DateTimeField(auto_now_add=True)),
                ("user",          models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="seller_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "gift_sellers"},
        ),
        migrations.AddField(
            model_name="giftproduct",
            name="seller",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="products",
                to="gift.giftseller",
            ),
        ),
    ]

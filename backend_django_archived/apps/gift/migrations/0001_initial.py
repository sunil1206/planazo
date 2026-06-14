from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("invitation", "0002_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="GiftCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name",  models.CharField(max_length=100, unique=True)),
                ("emoji", models.CharField(default="🎁", max_length=10)),
            ],
            options={"db_table": "gift_categories", "ordering": ["name"],
                     "verbose_name_plural": "Gift Categories"},
        ),
        migrations.CreateModel(
            name="GiftProduct",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                               related_name="products", to="gift.giftcategory")),
                ("name",         models.CharField(max_length=255)),
                ("description",  models.TextField()),
                ("price",        models.DecimalField(decimal_places=2, max_digits=10)),
                ("image",        models.ImageField(blank=True, null=True, upload_to="gifts/products/")),
                ("is_available", models.BooleanField(default=True)),
                ("is_featured",  models.BooleanField(default=False)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "gift_products", "ordering": ["-is_featured", "price"]},
        ),
        migrations.CreateModel(
            name="GiftOrder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("product",  models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,
                                               related_name="orders", to="gift.giftproduct")),
                ("website",  models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                               related_name="gift_orders", to="invitation.couplewebsite")),
                ("sender_name",  models.CharField(max_length=255)),
                ("sender_email", models.EmailField()),
                ("sender_phone", models.CharField(blank=True, max_length=20)),
                ("message",      models.TextField(blank=True)),
                ("delivery_type", models.CharField(choices=[("COUPLE", "Deliver to Couple"), ("CUSTOM", "Custom address")],
                                                    default="COUPLE", max_length=10)),
                ("recipient_name", models.CharField(blank=True, max_length=255)),
                ("address_line1",  models.CharField(blank=True, max_length=255)),
                ("address_line2",  models.CharField(blank=True, max_length=255)),
                ("city",           models.CharField(blank=True, max_length=100)),
                ("state",          models.CharField(blank=True, max_length=100)),
                ("pincode",        models.CharField(blank=True, max_length=10)),
                ("country",        models.CharField(blank=True, default="India", max_length=100)),
                ("amount",               models.DecimalField(decimal_places=2, max_digits=10)),
                ("razorpay_order_id",    models.CharField(blank=True, max_length=100, null=True, unique=True)),
                ("razorpay_payment_id",  models.CharField(blank=True, max_length=100)),
                ("status",  models.CharField(
                    choices=[("PENDING","Pending"),("PAID","Paid"),("CONFIRMED","Confirmed"),
                             ("SHIPPED","Shipped"),("DELIVERED","Delivered"),("CANCELLED","Cancelled")],
                    default="PENDING", max_length=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "gift_orders", "ordering": ["-created_at"]},
        ),
    ]

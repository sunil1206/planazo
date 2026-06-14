"""
Migration: Add icon_image + order to GiftCategory.
Create ScheduledDelivery model.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("gift",       "0004_marketplace_cart_reviews"),
        ("invitation", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── GiftCategory: add icon_image & order fields ─────────────────────────
        migrations.AddField(
            model_name="giftcategory",
            name="icon_image",
            field=models.ImageField(
                blank=True, null=True,
                upload_to="gifts/category_icons/",
                help_text="Category icon image (replaces emoji)",
            ),
        ),
        migrations.AddField(
            model_name="giftcategory",
            name="order",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="giftcategory",
            name="emoji",
            field=models.CharField(max_length=10, default="", blank=True,
                                   help_text="Legacy emoji — use icon_image instead"),
        ),
        migrations.AlterModelOptions(
            name="giftcategory",
            options={"ordering": ["order", "name"], "verbose_name_plural": "Gift Categories"},
        ),

        # ── ScheduledDelivery model ─────────────────────────────────────────────
        migrations.CreateModel(
            name="ScheduledDelivery",
            fields=[
                ("id",           models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("delivery_type",models.CharField(
                    max_length=10,
                    choices=[("GIFT","Physical Gift"),("POSTCARD","Printed Postcard")],
                    default="GIFT",
                )),
                ("product_qty",  models.PositiveIntegerField(default=1)),
                ("postcard_message",  models.TextField(blank=True)),
                ("postcard_template", models.CharField(max_length=50, blank=True)),
                ("occasion",          models.CharField(max_length=100, blank=True)),
                ("scheduled_date",    models.DateField()),
                ("notes_for_team",    models.TextField(blank=True)),
                # Sender
                ("sender_name",         models.CharField(max_length=255)),
                ("sender_email",        models.EmailField()),
                ("sender_phone",        models.CharField(max_length=20, blank=True)),
                ("sender_address_line1",models.CharField(max_length=255, blank=True)),
                ("sender_address_line2",models.CharField(max_length=255, blank=True)),
                ("sender_city",         models.CharField(max_length=100, blank=True)),
                ("sender_state",        models.CharField(max_length=100, blank=True)),
                ("sender_pincode",      models.CharField(max_length=10,  blank=True)),
                # Recipient
                ("recipient_name",         models.CharField(max_length=255)),
                ("recipient_email",        models.EmailField(blank=True)),
                ("recipient_phone",        models.CharField(max_length=20, blank=True)),
                ("recipient_address_line1",models.CharField(max_length=255)),
                ("recipient_address_line2",models.CharField(max_length=255, blank=True)),
                ("recipient_city",         models.CharField(max_length=100)),
                ("recipient_state",        models.CharField(max_length=100)),
                ("recipient_pincode",      models.CharField(max_length=10)),
                ("recipient_country",      models.CharField(max_length=100, default="India")),
                # Payment
                ("amount",              models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ("payment_status",      models.CharField(
                    max_length=10,
                    choices=[("PENDING","Pending"),("PAID","Paid"),("REFUNDED","Refunded")],
                    default="PENDING",
                )),
                ("razorpay_order_id",   models.CharField(max_length=100, blank=True, null=True, unique=True)),
                ("razorpay_payment_id", models.CharField(max_length=100, blank=True)),
                # Fulfilment
                ("fulfilment_status",   models.CharField(
                    max_length=15,
                    choices=[
                        ("SCHEDULED",   "Scheduled"),
                        ("IN_PROGRESS", "In Progress"),
                        ("DISPATCHED",  "Dispatched"),
                        ("DELIVERED",   "Delivered"),
                        ("CANCELLED",   "Cancelled"),
                    ],
                    default="SCHEDULED",
                )),
                ("tracking_info",  models.TextField(blank=True)),
                ("dispatched_at",  models.DateTimeField(blank=True, null=True)),
                ("is_subscription",models.BooleanField(default=False)),
                ("created_at",     models.DateTimeField(auto_now_add=True)),
                ("updated_at",     models.DateTimeField(auto_now=True)),
                # FK fields
                ("user",    models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="scheduled_deliveries",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("product", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="scheduled_deliveries",
                    to="gift.giftproduct",
                )),
                ("website", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="scheduled_deliveries",
                    to="invitation.couplewebsite",
                )),
            ],
            options={
                "db_table": "gift_scheduled_deliveries",
                "ordering": ["scheduled_date", "-created_at"],
                "verbose_name": "Scheduled Delivery",
                "verbose_name_plural": "Scheduled Deliveries",
            },
        ),
    ]

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('gift', '0003_giftseller_add_seller_to_product'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # --- Upgrade GiftProduct ---
        migrations.AddField('giftproduct', 'slug',         models.SlugField(blank=True, max_length=300, unique=True, null=True)),
        migrations.AddField('giftproduct', 'short_desc',   models.CharField(blank=True, max_length=300)),
        migrations.AddField('giftproduct', 'compare_price',models.DecimalField(decimal_places=2, max_digits=10, null=True, blank=True)),
        migrations.AddField('giftproduct', 'stock',        models.PositiveIntegerField(default=100)),
        migrations.AddField('giftproduct', 'sku',          models.CharField(blank=True, max_length=50)),
        migrations.AddField('giftproduct', 'weight_grams', models.PositiveIntegerField(null=True, blank=True)),
        migrations.AddField('giftproduct', 'tags',         models.JSONField(default=list)),
        migrations.AddField('giftproduct', 'is_cod',       models.BooleanField(default=True)),
        migrations.AddField('giftproduct', 'updated_at',   models.DateTimeField(auto_now=True)),

        # --- ProductImage ---
        migrations.CreateModel(
            name='ProductImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('image', models.ImageField(upload_to='gifts/products/gallery/')),
                ('order', models.PositiveIntegerField(default=0)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='images', to='gift.giftproduct')),
            ],
            options={'db_table': 'gift_product_images', 'ordering': ['order']},
        ),

        # --- ProductVariant ---
        migrations.CreateModel(
            name='ProductVariant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('sku', models.CharField(blank=True, max_length=50)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10, null=True, blank=True)),
                ('stock', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='variants', to='gift.giftproduct')),
            ],
            options={'db_table': 'gift_product_variants'},
        ),

        # --- ProductReview ---
        migrations.CreateModel(
            name='ProductReview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('reviewer_name', models.CharField(blank=True, max_length=100)),
                ('rating', models.PositiveSmallIntegerField()),
                ('title', models.CharField(blank=True, max_length=200)),
                ('comment', models.TextField()),
                ('is_verified_purchase', models.BooleanField(default=False)),
                ('is_approved', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_reviews', to='gift.giftproduct')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'gift_product_reviews', 'ordering': ['-created_at']},
        ),

        # --- Cart ---
        migrations.CreateModel(
            name='Cart',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('session_key', models.CharField(blank=True, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='carts', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'gift_carts'},
        ),

        # --- CartItem ---
        migrations.CreateModel(
            name='CartItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('cart', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='gift.cart')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gift.giftproduct')),
                ('variant', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='gift.productvariant')),
            ],
            options={'db_table': 'gift_cart_items', 'unique_together': {('cart', 'product', 'variant')}},
        ),

        # --- MarketplaceOrder ---
        migrations.CreateModel(
            name='MarketplaceOrder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('buyer_name', models.CharField(max_length=200)),
                ('buyer_email', models.EmailField()),
                ('buyer_phone', models.CharField(blank=True, max_length=20)),
                ('address_line1', models.CharField(max_length=255)),
                ('address_line2', models.CharField(blank=True, max_length=255)),
                ('city', models.CharField(max_length=100)),
                ('state', models.CharField(max_length=100)),
                ('pincode', models.CharField(max_length=10)),
                ('country', models.CharField(default='India', max_length=100)),
                ('subtotal', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('shipping_charge', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('discount', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('total_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('razorpay_order_id', models.CharField(blank=True, max_length=100, null=True, unique=True)),
                ('razorpay_payment_id', models.CharField(blank=True, max_length=100)),
                ('razorpay_signature', models.CharField(blank=True, max_length=255)),
                ('status', models.CharField(choices=[('PENDING','Pending Payment'),('PAID','Payment Received'),('CONFIRMED','Order Confirmed'),('SHIPPED','Shipped'),('DELIVERED','Delivered'),('CANCELLED','Cancelled'),('REFUNDED','Refunded')], default='PENDING', max_length=10)),
                ('order_number', models.CharField(blank=True, max_length=20, unique=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='marketplace_orders', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'gift_marketplace_orders', 'ordering': ['-created_at']},
        ),

        # --- MarketplaceOrderItem ---
        migrations.CreateModel(
            name='MarketplaceOrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('product_name', models.CharField(max_length=255)),
                ('variant_name', models.CharField(blank=True, max_length=100)),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('line_total', models.DecimalField(decimal_places=2, max_digits=10)),
                ('item_status', models.CharField(choices=[('PENDING','Pending'),('SHIPPED','Shipped'),('DELIVERED','Delivered')], default='PENDING', max_length=10)),
                ('tracking_url', models.URLField(blank=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='gift.marketplaceorder')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='gift.giftproduct')),
                ('variant', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='gift.productvariant')),
                ('seller', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='gift.giftseller')),
            ],
            options={'db_table': 'gift_marketplace_order_items'},
        ),
    ]

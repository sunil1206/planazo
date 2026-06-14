from django.db import migrations, models
import django.db.models.deletion
import django.conf


class Migration(migrations.Migration):

    dependencies = [
        ('vendor', '0003_vendor_packages'),
        migrations.swappable_dependency(django.conf.settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SubscriptionPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tier', models.CharField(choices=[('FREE', 'Free'), ('PRO', 'Pro'), ('PREMIUM', 'Premium')], max_length=10, unique=True)),
                ('name', models.CharField(max_length=50)),
                ('price_monthly', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('price_yearly', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('max_packages', models.PositiveIntegerField(default=2, help_text='0 = unlimited')),
                ('max_portfolio_images', models.PositiveIntegerField(default=10, help_text='0 = unlimited')),
                ('featured_placement', models.BooleanField(default=False)),
                ('analytics_access', models.BooleanField(default=False)),
                ('enquiry_management', models.BooleanField(default=True)),
                ('custom_theme', models.BooleanField(default=False)),
                ('priority_support', models.BooleanField(default=False)),
                ('razorpay_plan_id', models.CharField(blank=True, help_text='Razorpay plan ID for recurring billing', max_length=100)),
                ('description', models.TextField(blank=True)),
                ('features_list', models.JSONField(default=list, help_text='Marketing bullet points')),
            ],
            options={'db_table': 'vendor_subscription_plans'},
        ),
        migrations.CreateModel(
            name='VendorSubscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('ACTIVE', 'Active'), ('EXPIRED', 'Expired'), ('CANCELLED', 'Cancelled'), ('TRIALING', 'Trialing')], default='ACTIVE', max_length=10)),
                ('is_yearly', models.BooleanField(default=False)),
                ('razorpay_subscription_id', models.CharField(blank=True, max_length=100)),
                ('razorpay_payment_id', models.CharField(blank=True, max_length=100)),
                ('current_period_start', models.DateTimeField(auto_now_add=True)),
                ('current_period_end', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('vendor', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='subscription', to='vendor.vendorwebsite')),
                ('plan', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='subscriptions', to='vendor.subscriptionplan')),
            ],
            options={'db_table': 'vendor_subscriptions'},
        ),
        # Seed the three default plans
        migrations.RunSQL(
            sql="""
            INSERT INTO vendor_subscription_plans (tier, name, price_monthly, price_yearly, max_packages, max_portfolio_images,
                featured_placement, analytics_access, enquiry_management, custom_theme, priority_support,
                razorpay_plan_id, description, features_list)
            VALUES
              ('FREE',    'Free',    0,    0,     2,  10, false, false, true,  false, false, '', 'Get started for free', '["Basic listing","2 packages","10 portfolio photos","Enquiry form"]'),
              ('PRO',     'Pro',     999,  9990,  10, 50, false, true,  true,  true,  false, '', 'For growing vendors', '["Everything in Free","10 packages","50 portfolio photos","Analytics dashboard","Custom theme color","Priority listing"]'),
              ('PREMIUM', 'Premium', 2499, 24990, 0,  0,  true,  true,  true,  true,  true,  '', 'Maximum visibility', '["Everything in Pro","Unlimited packages","Unlimited photos","Featured placement","Priority support","Verified badge","Top search ranking"]')
            ON CONFLICT (tier) DO NOTHING;
            """,
            reverse_sql="DELETE FROM vendor_subscription_plans WHERE tier IN ('FREE','PRO','PREMIUM');",
        ),
    ]

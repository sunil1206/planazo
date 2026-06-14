from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BirthdayPage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title",        models.CharField(max_length=200)),
                ("celebrant",    models.CharField(max_length=120)),
                ("slug",         models.SlugField(max_length=120, unique=True)),
                ("theme",        models.CharField(choices=[("star_gold","Star Gold"),("balloon_bash","Balloon Bash"),("floral_birthday","Floral Birthday"),("kids_party","Kids Party"),("cinematic_dark","Cinematic Dark")], default="star_gold", max_length=30)),
                ("date",         models.DateField(blank=True, null=True)),
                ("time",         models.TimeField(blank=True, null=True)),
                ("venue",        models.CharField(blank=True, max_length=300)),
                ("venue_map",    models.URLField(blank=True)),
                ("description",  models.TextField(blank=True)),
                ("thumbnail",    models.ImageField(blank=True, null=True, upload_to="birthday/thumbnails/")),
                ("is_published", models.BooleanField(default=False)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
                ("updated_at",   models.DateTimeField(auto_now=True)),
                ("owner",        models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="birthday_pages", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BirthdayEvent",
            fields=[
                ("id",          models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title",       models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("date",        models.DateField()),
                ("time",        models.TimeField(blank=True, null=True)),
                ("venue",       models.CharField(blank=True, max_length=300)),
                ("order",       models.PositiveIntegerField(default=0)),
                ("page",        models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="birthday.birthdaypage")),
            ],
            options={"ordering": ["order", "date"]},
        ),
        migrations.CreateModel(
            name="BirthdayStory",
            fields=[
                ("id",      models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("heading", models.CharField(max_length=200)),
                ("body",    models.TextField()),
                ("image",   models.ImageField(blank=True, null=True, upload_to="birthday/stories/")),
                ("order",   models.PositiveIntegerField(default=0)),
                ("page",    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="stories", to="birthday.birthdaypage")),
            ],
            options={"ordering": ["order"]},
        ),
        migrations.CreateModel(
            name="BirthdayWish",
            fields=[
                ("id",          models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",        models.CharField(max_length=120)),
                ("relation",    models.CharField(blank=True, max_length=100)),
                ("message",     models.TextField()),
                ("photo",       models.ImageField(blank=True, null=True, upload_to="birthday/wishes/")),
                ("is_approved", models.BooleanField(default=True)),
                ("created_at",  models.DateTimeField(auto_now_add=True)),
                ("page",        models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="wishes", to="birthday.birthdaypage")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BirthdayRSVP",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",       models.CharField(max_length=120)),
                ("phone",      models.CharField(blank=True, max_length=20)),
                ("email",      models.EmailField(blank=True)),
                ("guests",     models.PositiveSmallIntegerField(default=1)),
                ("meal_pref",  models.CharField(choices=[("VEG","Veg"),("NON_VEG","Non-Veg"),("VEGAN","Vegan")], default="VEG", max_length=10)),
                ("message",    models.TextField(blank=True)),
                ("attending",  models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("page",       models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="rsvps", to="birthday.birthdaypage")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BirthdayCountdown",
            fields=[
                ("id",          models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("target_date", models.DateTimeField()),
                ("label",       models.CharField(default="until the party!", max_length=100)),
                ("page",        models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="countdown", to="birthday.birthdaypage")),
            ],
        ),
    ]

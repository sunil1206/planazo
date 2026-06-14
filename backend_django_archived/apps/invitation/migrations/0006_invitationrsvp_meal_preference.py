from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("invitation", "0005_wedding_vendor"),
    ]

    operations = [
        migrations.AddField(
            model_name="invitationrsvp",
            name="meal_preference",
            field=models.CharField(
                blank=True,
                choices=[
                    ("VEG", "Vegetarian"),
                    ("NON_VEG", "Non-Vegetarian"),
                    ("VEGAN", "Vegan"),
                    ("JAIN", "Jain"),
                ],
                default="",
                max_length=20,
            ),
        ),
    ]

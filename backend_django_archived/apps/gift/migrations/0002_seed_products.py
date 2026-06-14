"""Seed gift categories and sample products."""
from django.db import migrations


CATEGORIES = [
    {"name": "Flowers",     "emoji": "🌸"},
    {"name": "Sweets",      "emoji": "🍬"},
    {"name": "Hampers",     "emoji": "🧺"},
    {"name": "Jewelry",     "emoji": "💍"},
    {"name": "Home Decor",  "emoji": "🏡"},
    {"name": "Experience",  "emoji": "✨"},
]

PRODUCTS = [
    # Flowers
    ("Bridal Rose Bouquet",       "50 premium red roses, beautifully arranged in a bridal style box with gold ribbon. Perfect for the special day.",                        1499, "Flowers", False, True),
    ("White Lily & Orchid Mix",   "Elegant white lilies and purple orchids — a symbol of purity and love for the newlyweds.",                                              1899, "Flowers", False, False),
    # Sweets
    ("Kaju Katli Gift Box",       "Premium 1 kg Kaju Katli from a heritage sweet shop, packed in a festive gold box with dried fruits.",                                   999,  "Sweets",  False, False),
    ("Chocolate Truffle Hamper",  "24 handcrafted Belgian chocolate truffles in a luxury wooden box — an indulgent wedding gift.",                                         1299, "Sweets",  False, False),
    # Hampers
    ("Wedding Luxury Hamper",     "A curated hamper with scented candles, bath salts, chocolates, and a personalised couple mug — the perfect surprise.",                  2999, "Hampers", True,  True),
    ("Honeymoon Starter Kit",     "Romantic gift set with champagne, luxury chocolates, scented candles, rose petals, and a love letter journal.",                         3499, "Hampers", True,  True),
    ("Dry Fruits & Nuts Box",     "Premium assortment of cashews, almonds, pistachios, and dates in a beautiful wooden gift box.",                                         1799, "Hampers", False, False),
    # Jewelry
    ("Silver Couple Bracelet Set","Matching 925 sterling silver bracelets with infinity symbol — a timeless symbol of togetherness.",                                      2499, "Jewelry", True,  False),
    ("Gold-Plated Mangalsutra",   "Traditional gold-plated mangalsutra with black beads, made with 22kt gold plating. Includes gift box.",                                4999, "Jewelry", False, False),
    # Home Decor
    ("Personalised Couple Frame", "Custom photo frame engraved with the couple's names and wedding date — a memory to cherish forever.",                                    799,  "Home Decor", False, False),
    ("Couple Coffee Mug Set",     "Set of 2 ceramic mugs with 'Mr & Mrs' design and personalised names. Microwave safe.",                                                  649,  "Home Decor", False, False),
    ("Brass Ganesha Idol",        "Auspicious brass Ganesha idol for the couple's new home — traditional, handcrafted, and blessed.",                                      1999, "Home Decor", False, False),
    # Experience
    ("Spa Day for Two",           "A full-day spa package for the couple — facials, massages, and aromatherapy at a partner spa in their city.",                           5999, "Experience", True, True),
    ("Candlelight Dinner Voucher","Romantic candlelight dinner for two at a partner restaurant — includes starter, main course, dessert, and mocktails.",                  3999, "Experience", True, False),
]


def seed_gifts(apps, schema_editor):
    GiftCategory = apps.get_model("gift", "GiftCategory")
    GiftProduct  = apps.get_model("gift", "GiftProduct")

    cat_map = {}
    for c in CATEGORIES:
        obj, _ = GiftCategory.objects.get_or_create(name=c["name"], defaults={"emoji": c["emoji"]})
        cat_map[c["name"]] = obj

    for name, desc, price, cat_name, featured, available in PRODUCTS:
        GiftProduct.objects.get_or_create(
            name=name,
            defaults={
                "description":  desc,
                "price":        price,
                "category":     cat_map[cat_name],
                "is_featured":  featured,
                "is_available": available,
            }
        )


class Migration(migrations.Migration):
    dependencies = [("gift", "0001_initial")]
    operations   = [migrations.RunPython(seed_gifts, migrations.RunPython.noop)]

import django_filters
from django.db.models import Min, Avg
from .models import VendorWebsite


class VendorFilter(django_filters.FilterSet):
    city         = django_filters.CharFilter(lookup_expr="icontains")
    category     = django_filters.ChoiceFilter(choices=VendorWebsite.CATEGORY_CHOICES)
    is_verified  = django_filters.BooleanFilter()
    min_price    = django_filters.NumberFilter(method="filter_min_price")
    max_price    = django_filters.NumberFilter(method="filter_max_price")
    min_rating   = django_filters.NumberFilter(method="filter_min_rating")
    featured     = django_filters.BooleanFilter(method="filter_featured")

    class Meta:
        model  = VendorWebsite
        fields = ["category", "city", "is_verified"]

    def filter_min_price(self, qs, name, value):
        ids = [v.id for v in qs if self._starting_price(v) is None or self._starting_price(v) >= value]
        return qs.filter(id__in=ids)

    def filter_max_price(self, qs, name, value):
        ids = [v.id for v in qs if self._starting_price(v) is None or self._starting_price(v) <= value]
        return qs.filter(id__in=ids)

    def filter_min_rating(self, qs, name, value):
        ids = [v.id for v in qs if v.avg_rating is not None and v.avg_rating >= value]
        return qs.filter(id__in=ids)

    def filter_featured(self, qs, name, value):
        if value:
            # Featured = vendors with PREMIUM or PRO subscription
            return qs.filter(subscription__plan__tier__in=["PREMIUM", "PRO"])
        return qs

    @staticmethod
    def _starting_price(vendor):
        pkg = vendor.packages.filter(is_available=True).order_by("price").first()
        return float(pkg.price) if pkg else None

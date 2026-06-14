"""django-filter classes for Product queries."""
import django_filters

from apps.products.models import Product


class ProductFilter(django_filters.FilterSet):
    """
    Supports:
      ?category=jewellery
      ?vendor=raviraj-creations
      ?min_price=100&max_price=5000
      ?in_stock=true
      ?featured=true
      ?customizable=true
      ?search=ring
    """
    category = django_filters.CharFilter(field_name="category__slug", lookup_expr="iexact")
    vendor = django_filters.CharFilter(field_name="vendor__slug", lookup_expr="iexact")
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    in_stock = django_filters.BooleanFilter(field_name="is_in_stock")
    featured = django_filters.BooleanFilter(field_name="is_featured")
    customizable = django_filters.BooleanFilter(field_name="is_customizable")
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = Product
        fields = ["category", "vendor", "min_price", "max_price", "in_stock", "featured", "customizable"]

    def filter_search(self, queryset, name, value):
        from django.db.models import Q
        return queryset.filter(
            Q(name__icontains=value)
            | Q(short_description__icontains=value)
            | Q(description__icontains=value)
            | Q(vendor__business_name__icontains=value)
        )

from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """Object-level: only the owner can write."""
    def has_object_permission(self, request, view, obj):
        return obj.account == request.user

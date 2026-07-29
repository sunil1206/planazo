"""Shared slowapi Limiter instance.

Lives in its own module (rather than inline in main.py) so router modules
can `from app.core.rate_limit import limiter` and decorate individual
endpoints without importing app.main (which would be a circular import —
main.py imports every router).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

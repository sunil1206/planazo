# Intentionally empty. app/main.py imports each router submodule directly
# (e.g. `from app.routers.auth import router as auth_router`) rather than
# through this package's namespace, so nothing in the running app depends on
# eagerly importing every router here. Keeping it empty means importing a
# single router module (e.g. in tests, or a script) doesn't force-load the
# entire dependency tree of every other router (redis, celery, boto3, etc).

"""
Test fixtures for the Planning Suite.

Deliberately builds a *minimal* FastAPI app (just the planning + vendors
routers) instead of importing app.main.app directly — the real app also
wires up SQLAdmin, Prometheus, a media static mount and a real Postgres
engine at import time, none of which are needed to exercise the Planning
Suite's routing/dependency/service/repository chain, and pulling them in
would make these tests depend on infrastructure (a live Postgres instance,
a writable /app/media path) that CI/local dev shouldn't need just to run
unit/API tests. Every dependency actually under test (get_current_user,
get_db, get_owned_event, the services, the repositories) is imported from
the real app modules — nothing here is a mock of our own code.

Uses an in-memory SQLite database (aiosqlite) via StaticPool so every
connection in a test shares the same in-memory DB, created via
Base.metadata.create_all from the real model definitions.
"""
from __future__ import annotations

import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest")
os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key-for-pytest")

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 — registers every table on Base.metadata
from app.database.base import Base, get_db
from app.core.security import create_access_token
from app.models.user import User
from app.models.invitation import CoupleWebsite, WeddingCountdown
from app.models.birthday import BirthdayPage, BirthdayCountdown
from app.models.custom_event import CustomEvent
from app.models.vendor import VendorWebsite
from app.routers.planning import router as planning_router
from app.routers.vendors import router as vendors_router
from app.middleware.error_handling import register_error_handlers

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False, autoflush=False)


def make_test_app() -> FastAPI:
    test_app = FastAPI()
    test_app.include_router(planning_router)
    test_app.include_router(vendors_router)
    register_error_handlers(test_app)
    return test_app


@pytest_asyncio.fixture
async def db_session():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session):
    test_app = make_test_app()

    async def _override_get_db():
        yield db_session

    test_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
def make_user(db_session):
    async def _make(email="user@test.com", role="USER", admin_role=None):
        user = User(email=email, password="!", full_name="Test User", role=role,
                     admin_role=admin_role, is_active=True)
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user
    return _make


@pytest_asyncio.fixture
def make_wedding(db_session):
    async def _make(owner: User, couple="Alice & Bob", event_date=None):
        w = CoupleWebsite(
            account_id=owner.id, couple=couple, slug=f"wedding-{owner.id}-{couple}".lower().replace(" ", "-"),
            gallery_token=f"tok{owner.id}{couple}"[:12],
        )
        db_session.add(w)
        await db_session.flush()
        if event_date:
            db_session.add(WeddingCountdown(website_id=w.id, event_date=event_date))
        await db_session.commit()
        await db_session.refresh(w)
        return w
    return _make


@pytest_asyncio.fixture
def make_birthday(db_session):
    async def _make(owner: User, title="My Birthday", event_date=None):
        b = BirthdayPage(
            owner_id=owner.id, title=title, slug=f"bday-{owner.id}-{title}".lower().replace(" ", "-"),
            honoree_name=title,
        )
        db_session.add(b)
        await db_session.flush()
        if event_date:
            db_session.add(BirthdayCountdown(page_id=b.id, event_date=event_date))
        await db_session.commit()
        await db_session.refresh(b)
        return b
    return _make


@pytest_asyncio.fixture
def make_custom_event(db_session):
    async def _make(owner: User, title="Goa Trip", event_type="Travel", **kwargs):
        c = CustomEvent(owner_id=owner.id, title=title, event_type=event_type, **kwargs)
        db_session.add(c)
        await db_session.commit()
        await db_session.refresh(c)
        return c
    return _make


@pytest_asyncio.fixture
def make_vendor(db_session):
    async def _make(email="vendor@test.com", title="Great Caterers", city="Mumbai", **kwargs):
        owner = User(email=email, password="!", full_name=title, role="VENDOR", is_active=True)
        db_session.add(owner)
        await db_session.flush()
        vendor = VendorWebsite(
            account_id=owner.id, title=title, slug=title.lower().replace(" ", "-") + f"-{owner.id}",
            city=city, **kwargs,
        )
        db_session.add(vendor)
        await db_session.commit()
        await db_session.refresh(vendor)
        return vendor
    return _make


def auth_headers(user: User) -> dict:
    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}

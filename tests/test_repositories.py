"""Repository-layer tests — CRUD against the real models/tables, no HTTP,
no service layer. Confirms BaseRepository + the four Planning Suite
repositories do what they say without any business-logic layer involved."""
import pytest

from app.repositories.planning_repository import (
    ChecklistRepository, BudgetRepository, GuestRepository, VendorBookingRepository,
)


@pytest.mark.asyncio
async def test_checklist_repository_crud(db_session, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    repo = ChecklistRepository(db_session)

    item = await repo.create(owner_id=owner.id, event_type="custom", event_id=event.id, title="Book venue")
    assert item.id is not None
    assert item.status == "PENDING"

    items = await repo.list_for_event("custom", event.id)
    assert len(items) == 1
    assert items[0].title == "Book venue"

    fetched = await repo.get_owned(item.id, owner.id)
    assert fetched is not None

    other_owner_fetch = await repo.get_owned(item.id, owner.id + 999)
    assert other_owner_fetch is None

    updated = await repo.update(item, status="DONE")
    assert updated.status == "DONE"

    count = await repo.count_for_event("custom", event.id)
    assert count == 1

    await repo.delete(item)
    items_after = await repo.list_for_event("custom", event.id)
    assert items_after == []


@pytest.mark.asyncio
async def test_budget_repository_crud(db_session, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    repo = BudgetRepository(db_session)

    item = await repo.create(
        owner_id=owner.id, event_type="custom", event_id=event.id,
        category="Venue", planned_amount=50000, spent_amount=20000,
    )
    assert float(item.planned_amount) == 50000
    assert float(item.spent_amount) == 20000

    items = await repo.list_for_event("custom", event.id)
    assert len(items) == 1


@pytest.mark.asyncio
async def test_guest_repository_crud(db_session, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    repo = GuestRepository(db_session)

    guest = await repo.create(
        owner_id=owner.id, event_type="custom", event_id=event.id,
        name="Priya Sharma", rsvp="ACCEPTED",
    )
    assert guest.rsvp == "ACCEPTED"
    guests = await repo.list_for_event("custom", event.id)
    assert len(guests) == 1


@pytest.mark.asyncio
async def test_vendor_booking_repository_crud(db_session, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    repo = VendorBookingRepository(db_session)

    booking = await repo.create(
        owner_id=owner.id, event_type="custom", event_id=event.id,
        vendor_name="Sunshine Caterers", price=100000, advance_paid=30000,
    )
    assert booking.remaining == 70000

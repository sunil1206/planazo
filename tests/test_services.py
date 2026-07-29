"""Service-layer tests: event resolution/ownership, cross-event-type
listing, dashboard stats aggregation, and validation-error surfacing."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.services.event_service import EventService
from app.services.planning_service import PlanningService
from app.utils.pagination import PageParams
from app.utils.validators import ValidationError


@pytest.mark.asyncio
async def test_resolve_wedding_and_custom_event(db_session, make_user, make_wedding, make_custom_event):
    owner = await make_user()
    wedding = await make_wedding(owner, event_date=datetime.now(timezone.utc) + timedelta(days=10))
    custom = await make_custom_event(owner)

    svc = EventService(db_session)
    ref_w = await svc.resolve("wedding", wedding.id)
    assert ref_w.event_type == "wedding"
    assert ref_w.title == wedding.couple
    assert ref_w.status == "UPCOMING"

    ref_c = await svc.resolve("custom", custom.id)
    assert ref_c.event_type == "custom"
    assert ref_c.title == custom.title


@pytest.mark.asyncio
async def test_resolve_unknown_event_type_is_400(db_session, make_user):
    svc = EventService(db_session)
    with pytest.raises(HTTPException) as exc:
        await svc.resolve("safari", 1)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_resolve_missing_event_is_404(db_session):
    svc = EventService(db_session)
    with pytest.raises(HTTPException) as exc:
        await svc.resolve("custom", 999999)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_resolve_owned_rejects_non_owner(db_session, make_user, make_custom_event):
    owner = await make_user(email="owner@test.com")
    intruder = await make_user(email="intruder@test.com")
    event = await make_custom_event(owner)

    svc = EventService(db_session)
    with pytest.raises(HTTPException) as exc:
        await svc.resolve_owned("custom", event.id, intruder.id)
    assert exc.value.status_code == 403

    ref = await svc.resolve_owned("custom", event.id, owner.id)
    assert ref.owner_id == owner.id


@pytest.mark.asyncio
async def test_list_events_spans_all_three_tables(db_session, make_user, make_wedding, make_birthday, make_custom_event):
    owner = await make_user()
    await make_wedding(owner, couple="Wedding One")
    await make_birthday(owner, title="Birthday One")
    await make_custom_event(owner, title="Custom One")

    svc = EventService(db_session)
    result = await svc.list_events(owner.id, params=PageParams(page=1, page_size=20))
    assert result["total"] == 3
    types_seen = {r.event_type for r in result["items"]}
    assert types_seen == {"wedding", "birthday", "custom"}


@pytest.mark.asyncio
async def test_list_events_search_filter(db_session, make_user, make_custom_event):
    owner = await make_user()
    await make_custom_event(owner, title="Goa Beach Trip")
    await make_custom_event(owner, title="Diwali Party")

    svc = EventService(db_session)
    result = await svc.list_events(owner.id, search="goa", params=PageParams(page=1, page_size=20))
    assert result["total"] == 1
    assert "Goa" in result["items"][0].title


@pytest.mark.asyncio
async def test_dashboard_stats_aggregation(db_session, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    planning = PlanningService(db_session)

    t1 = await planning.create_checklist_item("custom", event.id, owner.id, {"title": "Book DJ"})
    await planning.update_checklist_item(t1, {"status": "DONE"})
    await planning.create_checklist_item("custom", event.id, owner.id, {"title": "Book caterer"})

    await planning.create_budget_item("custom", event.id, owner.id,
                                       {"category": "Venue", "planned_amount": 50000, "spent_amount": 20000})

    await planning.create_guest("custom", event.id, owner.id, {"name": "A", "rsvp": "ACCEPTED"})
    await planning.create_guest("custom", event.id, owner.id, {"name": "B", "rsvp": "PENDING"})

    await planning.create_vendor_booking("custom", event.id, owner.id,
                                          {"vendor_name": "DJ Co", "booking_status": "CONFIRMED", "price": 10000})

    stats = await planning.dashboard_stats("custom", event.id)
    assert stats["total_tasks"] == 2
    assert stats["completed_tasks"] == 1
    assert stats["completion_percentage"] == 50.0
    assert stats["budget_total"] == 50000
    assert stats["budget_used"] == 20000
    assert stats["budget_remaining"] == 30000
    assert stats["guest_count"] == 2
    assert stats["accepted_guests"] == 1
    assert stats["pending_guests"] == 1
    assert stats["vendor_count"] == 1
    assert stats["confirmed_vendors"] == 1


@pytest.mark.asyncio
async def test_planning_service_rejects_invalid_guest_email(db_session, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    planning = PlanningService(db_session)

    with pytest.raises(ValidationError):
        await planning.create_guest("custom", event.id, owner.id, {"name": "X", "email": "not-an-email"})


@pytest.mark.asyncio
async def test_vendor_booking_advance_cannot_exceed_price(db_session, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    planning = PlanningService(db_session)

    with pytest.raises(ValidationError):
        await planning.create_vendor_booking(
            "custom", event.id, owner.id,
            {"vendor_name": "Overbooked Co", "price": 100, "advance_paid": 500},
        )

"""API-level tests through the real FastAPI routing + dependency chain
(JWT auth, ownership dependency, service, repository) — no mocking."""
import pytest

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_events_endpoint_requires_auth(client):
    resp = await client.get("/api/events/")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_events_endpoint_lists_owned_events(client, make_user, make_custom_event):
    owner = await make_user()
    await make_custom_event(owner, title="Ladakh Road Trip", event_type="Road Trip")

    resp = await client.get("/api/events/", headers=auth_headers(owner))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Ladakh Road Trip"
    assert body["items"][0]["event_type"] == "custom"


@pytest.mark.asyncio
async def test_dashboard_requires_ownership(client, make_user, make_custom_event):
    owner = await make_user(email="owner2@test.com")
    intruder = await make_user(email="intruder2@test.com")
    event = await make_custom_event(owner)

    ok = await client.get(f"/api/planning/custom/{event.id}/dashboard/", headers=auth_headers(owner))
    assert ok.status_code == 200
    assert ok.json()["event"]["id"] == event.id

    forbidden = await client.get(f"/api/planning/custom/{event.id}/dashboard/", headers=auth_headers(intruder))
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_dashboard_unknown_event_type_is_400(client, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    resp = await client.get(f"/api/planning/safari/{event.id}/dashboard/", headers=auth_headers(owner))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_checklist_full_crud_round_trip(client, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    base = f"/api/planning/custom/{event.id}/checklist/"
    headers = auth_headers(owner)

    created = await client.post(base, json={"title": "Book photographer", "priority": "HIGH"}, headers=headers)
    assert created.status_code == 201
    item_id = created.json()["id"]
    assert created.json()["priority"] == "HIGH"

    listed = await client.get(base, headers=headers)
    assert len(listed.json()) == 1

    updated = await client.put(f"{base}{item_id}/", json={"status": "DONE"}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["status"] == "DONE"
    assert updated.json()["completed_at"] is not None

    deleted = await client.delete(f"{base}{item_id}/", headers=headers)
    assert deleted.status_code == 204

    listed_after = await client.get(base, headers=headers)
    assert listed_after.json() == []


@pytest.mark.asyncio
async def test_checklist_item_scoped_to_its_own_event(client, make_user, make_custom_event):
    owner = await make_user()
    event_a = await make_custom_event(owner, title="Event A")
    event_b = await make_custom_event(owner, title="Event B")
    headers = auth_headers(owner)

    created = await client.post(
        f"/api/planning/custom/{event_a.id}/checklist/", json={"title": "A task"}, headers=headers
    )
    item_id = created.json()["id"]

    # Same owner, but the item belongs to event_a, not event_b — must 404, not leak across events.
    cross_event = await client.get(f"/api/planning/custom/{event_b.id}/checklist/{item_id}/", headers=headers)
    assert cross_event.status_code == 404


@pytest.mark.asyncio
async def test_budget_crud_and_remaining_computed(client, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    headers = auth_headers(owner)

    created = await client.post(
        f"/api/planning/custom/{event.id}/budget/",
        json={"category": "Catering", "planned_amount": 80000, "spent_amount": 30000},
        headers=headers,
    )
    assert created.status_code == 201
    body = created.json()
    assert body["remaining"] == 50000


@pytest.mark.asyncio
async def test_guest_crud_rejects_bad_email(client, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    headers = auth_headers(owner)

    bad = await client.post(
        f"/api/planning/custom/{event.id}/guests/", json={"name": "Bad Email Guest", "email": "nope"},
        headers=headers,
    )
    assert bad.status_code == 422

    good = await client.post(
        f"/api/planning/custom/{event.id}/guests/",
        json={"name": "Good Guest", "email": "guest@example.com", "rsvp": "ACCEPTED"},
        headers=headers,
    )
    assert good.status_code == 201

    summary = await client.get(f"/api/planning/custom/{event.id}/guests/summary/", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["accepted"] == 1
    assert summary.json()["total"] == 1


@pytest.mark.asyncio
async def test_vendor_booking_crud_and_advance_validation(client, make_user, make_custom_event):
    owner = await make_user()
    event = await make_custom_event(owner)
    headers = auth_headers(owner)

    over = await client.post(
        f"/api/planning/custom/{event.id}/vendor-bookings/",
        json={"vendor_name": "Overbooked Co", "price": 100, "advance_paid": 500},
        headers=headers,
    )
    assert over.status_code == 422

    ok = await client.post(
        f"/api/planning/custom/{event.id}/vendor-bookings/",
        json={"vendor_name": "Great Caterers", "price": 100000, "advance_paid": 40000, "booking_status": "CONFIRMED"},
        headers=headers,
    )
    assert ok.status_code == 201
    assert ok.json()["remaining"] == 60000

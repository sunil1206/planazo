"""Tests for the enhanced /api/vendors/search/ endpoint (Find Vendors module)."""
import pytest


@pytest.mark.asyncio
async def test_search_filters_by_city_and_verified(client, make_vendor):
    await make_vendor(email="v1@test.com", title="Mumbai Caterers", city="Mumbai", is_verified=True, is_active=True)
    await make_vendor(email="v2@test.com", title="Delhi Caterers", city="Delhi", is_verified=False, is_active=True)

    resp = await client.get("/api/vendors/search/", params={"city": "Mumbai"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Mumbai Caterers"

    resp2 = await client.get("/api/vendors/search/", params={"verified": "true"})
    assert resp2.json()["total"] == 1
    assert resp2.json()["items"][0]["is_verified"] is True


@pytest.mark.asyncio
async def test_search_excludes_inactive_vendors(client, make_vendor):
    await make_vendor(email="v3@test.com", title="Inactive Co", is_active=False)
    resp = await client.get("/api/vendors/search/")
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_search_pagination(client, make_vendor):
    for i in range(5):
        await make_vendor(email=f"v{i}@test.com", title=f"Vendor {i}", is_active=True)

    resp = await client.get("/api/vendors/search/", params={"page": 1, "page_size": 2})
    body = resp.json()
    assert body["total"] == 5
    assert len(body["items"]) == 2
    assert body["pages"] == 3

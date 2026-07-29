"""Business logic for the four Planning Suite modules (Checklist, Budget,
Guest List, Vendor Bookings) plus the per-event dashboard stats aggregation.

Routers depend on this service, never touch repositories or the DB session
directly — that's the whole point of the service layer the spec asked for.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.planning_repository import (
    ChecklistRepository, BudgetRepository, GuestRepository, VendorBookingRepository,
)
from app.utils.validators import (
    ValidationError, validate_required_str, validate_non_negative_amount,
    validate_email, validate_phone,
)


class PlanningService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.checklist = ChecklistRepository(db)
        self.budget = BudgetRepository(db)
        self.guests = GuestRepository(db)
        self.vendor_bookings = VendorBookingRepository(db)

    # ── Checklist ─────────────────────────────────────────────────────────────

    async def list_checklist(self, event_type: str, event_id: int):
        return await self.checklist.list_for_event(event_type, event_id, order_by=self.checklist.model.order)

    async def create_checklist_item(self, event_type: str, event_id: int, owner_id: int, data: dict):
        title = validate_required_str(data.get("title"), "title")
        return await self.checklist.create(
            owner_id=owner_id, event_type=event_type, event_id=event_id,
            title=title, description=data.get("description") or "",
            category=data.get("category") or "General",
            status=data.get("status") or "PENDING",
            priority=data.get("priority") or "MEDIUM",
            due_date=data.get("due_date"), order=data.get("order") or 0,
        )

    async def get_checklist_item_owned(self, item_id: int, owner_id: int):
        item = await self.checklist.get_owned(item_id, owner_id)
        if not item:
            raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Checklist item not found")
        return item

    async def update_checklist_item(self, item, data: dict):
        fields = {k: v for k, v in data.items() if v is not None}
        if fields.get("status") == "DONE" and item.status != "DONE":
            fields["completed_at"] = datetime.now(timezone.utc)
        elif "status" in fields and fields["status"] != "DONE":
            fields["completed_at"] = None
        return await self.checklist.update(item, **fields)

    async def delete_checklist_item(self, item) -> None:
        await self.checklist.delete(item)

    # ── Budget ────────────────────────────────────────────────────────────────

    async def list_budget(self, event_type: str, event_id: int):
        return await self.budget.list_for_event(event_type, event_id)

    async def create_budget_item(self, event_type: str, event_id: int, owner_id: int, data: dict):
        category = validate_required_str(data.get("category"), "category")
        planned = validate_non_negative_amount(data.get("planned_amount", 0), "planned_amount")
        spent = validate_non_negative_amount(data.get("spent_amount") or 0, "spent_amount")
        return await self.budget.create(
            owner_id=owner_id, event_type=event_type, event_id=event_id,
            category=category, title=data.get("title") or "",
            planned_amount=planned, spent_amount=spent, notes=data.get("notes") or "",
        )

    async def get_budget_item_owned(self, item_id: int, owner_id: int):
        item = await self.budget.get_owned(item_id, owner_id)
        if not item:
            raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Budget item not found")
        return item

    async def update_budget_item(self, item, data: dict):
        fields = {}
        if data.get("planned_amount") is not None:
            fields["planned_amount"] = validate_non_negative_amount(data["planned_amount"], "planned_amount")
        if data.get("spent_amount") is not None:
            fields["spent_amount"] = validate_non_negative_amount(data["spent_amount"], "spent_amount")
        for k in ("category", "title", "notes"):
            if data.get(k) is not None:
                fields[k] = data[k]
        return await self.budget.update(item, **fields)

    async def delete_budget_item(self, item) -> None:
        await self.budget.delete(item)

    # ── Guests ────────────────────────────────────────────────────────────────

    async def list_guests(self, event_type: str, event_id: int):
        return await self.guests.list_for_event(event_type, event_id)

    async def create_guest(self, event_type: str, event_id: int, owner_id: int, data: dict):
        name = validate_required_str(data.get("name"), "name")
        email = validate_email(data.get("email") or "")
        phone = validate_phone(data.get("phone") or "")
        return await self.guests.create(
            owner_id=owner_id, event_type=event_type, event_id=event_id,
            name=name, phone=phone, email=email,
            family=data.get("family") or "", side=data.get("side") or "",
            plus_one=bool(data.get("plus_one") or False),
            meal_preference=data.get("meal_preference") or "",
            rsvp=data.get("rsvp") or "PENDING", notes=data.get("notes") or "",
        )

    async def get_guest_owned(self, item_id: int, owner_id: int):
        item = await self.guests.get_owned(item_id, owner_id)
        if not item:
            raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Guest not found")
        return item

    async def update_guest(self, item, data: dict):
        fields = {k: v for k, v in data.items() if v is not None}
        if "email" in fields:
            fields["email"] = validate_email(fields["email"])
        if "phone" in fields:
            fields["phone"] = validate_phone(fields["phone"])
        return await self.guests.update(item, **fields)

    async def delete_guest(self, item) -> None:
        await self.guests.delete(item)

    async def guest_summary(self, event_type: str, event_id: int) -> dict:
        guests = await self.list_guests(event_type, event_id)
        return {
            "total": len(guests),
            "accepted": sum(1 for g in guests if g.rsvp == "ACCEPTED"),
            "declined": sum(1 for g in guests if g.rsvp == "DECLINED"),
            "pending": sum(1 for g in guests if g.rsvp == "PENDING"),
        }

    # ── Vendor bookings ───────────────────────────────────────────────────────

    async def list_vendor_bookings(self, event_type: str, event_id: int):
        return await self.vendor_bookings.list_for_event(event_type, event_id)

    async def create_vendor_booking(self, event_type: str, event_id: int, owner_id: int, data: dict):
        vendor_name = validate_required_str(data.get("vendor_name"), "vendor_name")
        price = validate_non_negative_amount(data.get("price", 0), "price")
        advance = validate_non_negative_amount(data.get("advance_paid") or 0, "advance_paid")
        if advance > price:
            raise ValidationError("advance_paid cannot exceed price")
        return await self.vendor_bookings.create(
            owner_id=owner_id, event_type=event_type, event_id=event_id,
            vendor_id=data.get("vendor_id"), vendor_name=vendor_name,
            category=data.get("category") or "", booking_status=data.get("booking_status") or "ENQUIRED",
            price=price, advance_paid=advance, notes=data.get("notes") or "",
        )

    async def get_vendor_booking_owned(self, item_id: int, owner_id: int):
        item = await self.vendor_bookings.get_owned(item_id, owner_id)
        if not item:
            raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Vendor booking not found")
        return item

    async def update_vendor_booking(self, item, data: dict):
        fields = {k: v for k, v in data.items() if v is not None}
        if "price" in fields:
            fields["price"] = validate_non_negative_amount(fields["price"], "price")
        if "advance_paid" in fields:
            fields["advance_paid"] = validate_non_negative_amount(fields["advance_paid"], "advance_paid")
        new_price = fields.get("price", item.price)
        new_advance = fields.get("advance_paid", item.advance_paid)
        if float(new_advance) > float(new_price):
            raise ValidationError("advance_paid cannot exceed price")
        return await self.vendor_bookings.update(item, **fields)

    async def delete_vendor_booking(self, item) -> None:
        await self.vendor_bookings.delete(item)

    # ── Dashboard ─────────────────────────────────────────────────────────────

    async def dashboard_stats(self, event_type: str, event_id: int) -> dict:
        checklist = await self.list_checklist(event_type, event_id)
        budget = await self.list_budget(event_type, event_id)
        guests = await self.list_guests(event_type, event_id)
        vendors = await self.list_vendor_bookings(event_type, event_id)

        total_tasks = len(checklist)
        completed_tasks = sum(1 for c in checklist if c.status == "DONE")
        completion_percentage = round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0.0

        budget_total = sum(float(b.planned_amount or 0) for b in budget)
        budget_used = sum(float(b.spent_amount or 0) for b in budget)

        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_percentage": completion_percentage,
            "budget_used": budget_used,
            "budget_total": budget_total,
            "budget_remaining": budget_total - budget_used,
            "guest_count": len(guests),
            "accepted_guests": sum(1 for g in guests if g.rsvp == "ACCEPTED"),
            "pending_guests": sum(1 for g in guests if g.rsvp == "PENDING"),
            "declined_guests": sum(1 for g in guests if g.rsvp == "DECLINED"),
            "vendor_count": len(vendors),
            "confirmed_vendors": sum(1 for v in vendors if v.booking_status == "CONFIRMED"),
        }

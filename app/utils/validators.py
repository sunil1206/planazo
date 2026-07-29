"""Shared validation helpers for the Planning Suite (and reusable elsewhere).

Kept dependency-free (no extra pip packages) so these can run in any context —
routers, services, or tests — without pulling in email-validator's DNS checks
(those are already used at the Pydantic EmailStr layer for account signup;
here we want a cheap, deterministic, offline check suitable for guest lists
that may contain typos the user wants to fix later, not hard-reject).
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Optional

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Loose international phone check: optional leading +, 7-15 digits, spaces/dashes allowed.
_PHONE_RE = re.compile(r"^\+?[0-9][0-9\s\-()]{5,18}[0-9]$")


class ValidationError(ValueError):
    """Raised by validators; routers/services translate this into HTTP 422."""


def validate_email(value: str, *, required: bool = False, field: str = "email") -> str:
    value = (value or "").strip()
    if not value:
        if required:
            raise ValidationError(f"{field} is required")
        return ""
    if not _EMAIL_RE.match(value):
        raise ValidationError(f"{field} is not a valid email address")
    return value


def validate_phone(value: str, *, required: bool = False, field: str = "phone") -> str:
    value = (value or "").strip()
    if not value:
        if required:
            raise ValidationError(f"{field} is required")
        return ""
    if not _PHONE_RE.match(value):
        raise ValidationError(f"{field} is not a valid phone number")
    return value


def validate_non_negative_amount(value, field: str = "amount") -> float:
    try:
        amount = float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{field} must be a number")
    if amount < 0:
        raise ValidationError(f"{field} cannot be negative")
    return amount


def validate_date_range(
    start: Optional[date], end: Optional[date],
    *, start_field: str = "start_date", end_field: str = "end_date",
) -> None:
    if start and end and end < start:
        raise ValidationError(f"{end_field} cannot be before {start_field}")


def validate_required_str(value: Optional[str], field: str) -> str:
    value = (value or "").strip()
    if not value:
        raise ValidationError(f"{field} is required")
    return value


def validate_event_type(value: str, allowed: tuple) -> str:
    value = (value or "").strip().lower()
    if value not in allowed:
        raise ValidationError(f"event_type must be one of {', '.join(allowed)}")
    return value

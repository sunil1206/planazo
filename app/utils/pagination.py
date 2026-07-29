"""Pagination helpers shared across Planning Suite endpoints."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, List, Sequence, TypeVar

from fastapi import Query

T = TypeVar("T")


@dataclass
class PageParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def page_params(
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
) -> PageParams:
    return PageParams(page=page, page_size=page_size)


def paginate(items: Sequence[T], total: int, params: PageParams) -> dict:
    pages = (total + params.page_size - 1) // params.page_size if params.page_size else 0
    return {
        "items": list(items),
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "pages": max(pages, 0),
    }

"""
Audit trail for admin-panel writes (SQLAdmin create/update/delete), populated
automatically via app/admin/views.py::AuditedModelView hooks — never written
to directly by feature code, so it can't be bypassed by forgetting to log.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id            = Column(Integer, primary_key=True)
    actor_id      = Column(Integer, ForeignKey("account_user.id", ondelete="SET NULL"), nullable=True, index=True)
    # Denormalized snapshot — stays meaningful even after the actor is deleted.
    actor_email   = Column(String(254), nullable=True)
    action        = Column(String(20), nullable=False)   # CREATE / UPDATE / DELETE
    resource_type = Column(String(100), nullable=False, index=True)
    resource_id   = Column(String(50), nullable=True, index=True)
    # UPDATE: {field: [old, new]}. CREATE/DELETE: full field snapshot.
    changes       = Column(JSON, nullable=True)
    ip_address    = Column(String(45), nullable=True)
    user_agent    = Column(String(500), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    actor = relationship("User")

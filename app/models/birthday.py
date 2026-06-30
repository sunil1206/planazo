from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Date
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


class BirthdayPage(Base):
    # Django auto-name (no db_table set): birthday_birthdaypage
    # VERIFY against live DB: SELECT tablename FROM pg_tables WHERE tablename LIKE 'birthday%';
    __tablename__ = "birthday_birthdaypage"

    id           = Column(Integer, primary_key=True, index=True)
    owner_id     = Column(Integer, ForeignKey("account_user.id", ondelete="CASCADE"), nullable=False)
    title        = Column(String(255), nullable=False)
    slug         = Column(String(150), unique=True, nullable=False, index=True)
    honoree_name = Column(String(255), nullable=False)
    honoree_image= Column(String(200), nullable=True)
    cover_image  = Column(String(200), nullable=True)
    theme        = Column(String(50), default="classic")
    theme_color  = Column(String(20), default="#FF6B6B")
    bio          = Column(Text, default="")
    is_published = Column(Boolean, default=False)
    views        = Column(Integer, default=0)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    owner     = relationship("User",            back_populates="birthday_pages")
    events    = relationship("BirthdayEvent",   back_populates="page", cascade="all, delete-orphan")
    stories   = relationship("BirthdayStory",   back_populates="page", cascade="all, delete-orphan")
    wishes    = relationship("BirthdayWish",    back_populates="page", cascade="all, delete-orphan")
    rsvps     = relationship("BirthdayRSVP",    back_populates="page", cascade="all, delete-orphan")
    countdown = relationship("BirthdayCountdown",back_populates="page", uselist=False, cascade="all, delete-orphan")


class BirthdayEvent(Base):
    __tablename__ = "birthday_birthdayevent"

    id            = Column(Integer, primary_key=True)
    page_id       = Column(Integer, ForeignKey("birthday_birthdaypage.id", ondelete="CASCADE"), nullable=False)
    title         = Column(String(255), nullable=False)
    image         = Column(String(200), nullable=True)
    date          = Column(DateTime(timezone=True), nullable=True)
    time          = Column(String(100), default="")
    desc          = Column(Text, default="")
    location_name = Column(String(255), default="")
    location_link = Column(String(200), nullable=True)
    order         = Column(Integer, default=0)

    page = relationship("BirthdayPage", back_populates="events")


class BirthdayStory(Base):
    __tablename__ = "birthday_birthdaystory"

    id      = Column(Integer, primary_key=True)
    page_id = Column(Integer, ForeignKey("birthday_birthdaypage.id", ondelete="CASCADE"), nullable=False)
    title   = Column(String(255), nullable=False)
    image   = Column(String(200), nullable=True)
    date    = Column(DateTime(timezone=True), nullable=True)
    desc    = Column(Text, default="")
    order   = Column(Integer, default=0)

    page = relationship("BirthdayPage", back_populates="stories")


class BirthdayWish(Base):
    __tablename__ = "birthday_birthdaywish"

    id                = Column(Integer, primary_key=True)
    page_id           = Column(Integer, ForeignKey("birthday_birthdaypage.id", ondelete="CASCADE"), nullable=False)
    name              = Column(String(255), nullable=False)
    relation_to_bday  = Column(String(255), default="")
    image             = Column(String(200), nullable=True)
    message           = Column(Text, nullable=False)
    verified          = Column(Boolean, default=False)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    page = relationship("BirthdayPage", back_populates="wishes")


class BirthdayRSVP(Base):
    __tablename__ = "birthday_birthdayrsvp"

    id              = Column(Integer, primary_key=True)
    page_id         = Column(Integer, ForeignKey("birthday_birthdaypage.id", ondelete="CASCADE"), nullable=False)
    name            = Column(String(255), nullable=False)
    phone           = Column(String(20), default="")
    email           = Column(String(254), default="")
    attendance      = Column(String(10), default="YES")
    guests          = Column(Integer, default=1)
    meal_preference = Column(String(20), default="")
    message         = Column(Text, default="")
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    page = relationship("BirthdayPage", back_populates="rsvps")


class BirthdayCountdown(Base):
    __tablename__ = "birthday_birthdaycountdown"

    id               = Column(Integer, primary_key=True)
    page_id          = Column(Integer, ForeignKey("birthday_birthdaypage.id", ondelete="CASCADE"), unique=True, nullable=False)
    heading          = Column(String(255), default="Countdown to the Big Day!")
    event_date       = Column(DateTime(timezone=True), nullable=False)
    background_image = Column(String(200), nullable=True)

    page = relationship("BirthdayPage", back_populates="countdown")

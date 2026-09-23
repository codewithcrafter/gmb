import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    google_connections = relationship("GoogleConnection", back_populates="user", cascade="all, delete-orphan")
    business_locations = relationship("BusinessLocation", back_populates="user", cascade="all, delete-orphan")


class GoogleConnection(Base):
    __tablename__ = "google_connections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    google_email = Column(String, nullable=True)
    access_token = Column(Text, nullable=False) # Encrypted
    refresh_token = Column(Text, nullable=True) # Encrypted
    token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="google_connections")



class BusinessLocation(Base):
    __tablename__ = "business_locations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(String, nullable=True)
    google_location_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    store_code = Column(String, nullable=True)
    primary_category = Column(String, nullable=True)
    additional_categories = Column(Text, nullable=True) # JSON array stored as text
    address = Column(Text, nullable=True)
    phone_number = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    average_rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    health_score = Column(Integer, nullable=True)
    rank_position = Column(String, nullable=True)
    is_selected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="business_locations")
    reviews = relationship("Review", back_populates="location", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="location", cascade="all, delete-orphan")
    media_items = relationship("MediaItem", back_populates="location", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    location_id = Column(String, ForeignKey("business_locations.id"), nullable=False, index=True)
    google_review_id = Column(String, unique=True, index=True, nullable=False)
    author_name = Column(String, nullable=False)
    author_avatar = Column(String, nullable=True)
    star_rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    create_time = Column(DateTime, default=datetime.utcnow)
    update_time = Column(DateTime, default=datetime.utcnow)
    review_reply = Column(Text, nullable=True)
    reply_time = Column(DateTime, nullable=True)

    location = relationship("BusinessLocation", back_populates="reviews")


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    location_id = Column(String, ForeignKey("business_locations.id"), nullable=False, index=True)
    google_post_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    post_type = Column(String, default="STANDARD")
    status = Column(String, default="PUBLISHED")
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, default=datetime.utcnow)
    views_count = Column(Integer, default=0)
    clicks_count = Column(Integer, default=0)
    cta_url = Column(String, nullable=True)

    location = relationship("BusinessLocation", back_populates="posts")


class MediaItem(Base):
    __tablename__ = "media_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    location_id = Column(String, ForeignKey("business_locations.id"), nullable=False, index=True)
    google_media_id = Column(String, nullable=True)
    media_format = Column(String, default="PHOTO") # PHOTO or VIDEO
    category = Column(String, default="EXTERIOR") # COVER, PROFILE, EXTERIOR, INTERIOR
    source_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    create_time = Column(DateTime, default=datetime.utcnow)

    location = relationship("BusinessLocation", back_populates="media_items")


class GoogleBusinessAccount(Base):
    __tablename__ = "google_business_accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    google_account_id = Column(String, nullable=False)
    account_name = Column(String, nullable=False)
    account_type = Column(String, default="PERSONAL")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="google_accounts")


class SelectedBusinessLocation(Base):
    __tablename__ = "selected_business_locations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(String, nullable=False)
    location_id = Column(String, nullable=False)
    location_name = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    primary_category = Column(String, nullable=True)
    verification_state = Column(String, default="VERIFIED")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="selected_location_records")


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    platform = Column(String, nullable=False) # facebook, instagram, linkedin
    platform_account_id = Column(String, nullable=False)
    account_name = Column(String, nullable=False)
    username = Column(String, nullable=True)
    access_token = Column(Text, nullable=False) # Encrypted
    refresh_token = Column(Text, nullable=True) # Encrypted
    token_expires_at = Column(DateTime, nullable=True)
    connected = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="social_accounts")


class OAuthState(Base):
    __tablename__ = "oauth_states"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    state = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    platform = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

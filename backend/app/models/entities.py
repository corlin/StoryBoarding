import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    avatar_url = Column(String(1024), nullable=True)
    oauth_provider = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    providers_config = relationship("UserProviderConfig", back_populates="user", cascade="all, delete-orphan", uselist=False)


class UserProviderConfig(Base):
    __tablename__ = "user_provider_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    llm_provider = Column(String(50), default="openai_compatible") # openai_compatible, anthropic_compatible
    llm_api_base = Column(String(512), default="https://api.openai.com/v1")
    llm_api_key = Column(String(512), nullable=True)
    llm_model = Column(String(100), default="gpt-4o")
    
    image_provider = Column(String(50), default="openai_dalle") # openai_dalle, stability, flux
    image_api_base = Column(String(512), nullable=True)
    image_api_key = Column(String(512), nullable=True)
    image_model = Column(String(100), default="dall-e-3")

    user = relationship("User", back_populates="providers_config")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="Untitled Project")
    story = Column(Text, nullable=True)
    creative_brief = Column(Text, nullable=True)
    style_config = Column(JSONB, nullable=True, default={})
    target_duration = Column(Float, default=30.0) # In seconds
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="projects")
    sequences = relationship("Sequence", back_populates="project", cascade="all, delete-orphan", order_by="Sequence.order")
    characters = relationship("Character", back_populates="project", cascade="all, delete-orphan")
    locations = relationship("Location", back_populates="project", cascade="all, delete-orphan")
    visual_style = relationship("VisualStyle", back_populates="project", cascade="all, delete-orphan", uselist=False)


class Character(Base):
    __tablename__ = "characters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    visual_description = Column(Text, nullable=True)
    reference_image_url = Column(String(1024), nullable=True)

    project = relationship("Project", back_populates="characters")


class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    visual_description = Column(Text, nullable=True)
    reference_image_url = Column(String(1024), nullable=True)

    project = relationship("Project", back_populates="locations")


class VisualStyle(Base):
    __tablename__ = "visual_styles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)
    style_name = Column(String(255), default="Standard Storyboard")
    style_description = Column(Text, nullable=True)
    reference_image_url = Column(String(1024), nullable=True)
    style_parameters = Column(JSONB, nullable=True, default={})

    project = relationship("Project", back_populates="visual_style")


class Sequence(Base):
    __tablename__ = "sequences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    order = Column(Integer, default=1, nullable=False)
    name = Column(String(255), default="Sequence 1")
    description = Column(Text, nullable=True)

    project = relationship("Project", back_populates="sequences")
    shots = relationship("Shot", back_populates="sequence", cascade="all, delete-orphan", order_by="Shot.order")


class Shot(Base):
    __tablename__ = "shots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sequence_id = Column(UUID(as_uuid=True), ForeignKey("sequences.id", ondelete="CASCADE"), nullable=False, index=True)
    order = Column(Integer, default=1, nullable=False)
    duration = Column(Float, default=2.5, nullable=False)
    shot_size = Column(String(50), default="medium_shot", nullable=False)
    camera_angle = Column(String(50), default="eye_level", nullable=False)
    camera_movement = Column(JSONB, default={"type": "static"})
    subject = Column(String(255), default="")
    action = Column(Text, default="")
    dialogue = Column(Text, nullable=True)
    composition = Column(JSONB, default={})
    character_direction = Column(String(50), default="static")
    narrative_function = Column(String(255), nullable=True)
    lighting = Column(String(255), nullable=True)
    audio = Column(JSONB, default={})
    emotion = Column(String(100), nullable=True)
    transition = Column(String(50), default="cut")
    notes = Column(Text, nullable=True)
    
    storyboard_image_url = Column(String(1024), nullable=True)
    image_prompt = Column(Text, nullable=True)
    video_prompt = Column(Text, nullable=True)
    continuity_data = Column(JSONB, default={})
    is_dirty = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sequence = relationship("Sequence", back_populates="shots")

import uuid
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    JSON,
    ForeignKey,
    Text,
    Boolean,
    Enum,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from db import Base


class AssetType(enum.Enum):
    post = "post"
    comment = "comment"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_attachment_id = Column(
        String(36), ForeignKey("attachments.id"), nullable=True
    )
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Unique constraints
    __table_args__ = (
        UniqueConstraint('username', name='uq_users_username'),
        UniqueConstraint('email', name='uq_users_email'),
    )

    # Relationship to collections
    collections = relationship("Collection", back_populates="user", cascade="all, delete-orphan")
    avatar = relationship("Attachment", foreign_keys=[avatar_attachment_id])
    # 新增关系
    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"


class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String(50), nullable=False)
    emoji = Column(String(10), nullable=True)  # Optional emoji for category
    knowledge_base_id = Column(String(36), nullable=True)  # Optional knowledge base ID

    # Unique constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_categories_user_name'),
    )

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"


class Collection(Base):
    __tablename__ = "collections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=True)
    tags = Column(String(255), nullable=True)  # splited by comma
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship to user
    user = relationship("User", back_populates="collections")
    category = relationship("Category")
    details = relationship(
        "CollectionDetail", back_populates="collection", cascade="all, delete-orphan"
    )
    # 新增关系
    posts = relationship("Post", back_populates="refer_collection", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Collection(id={self.id}, user_id={self.user_id}, category='{self.category}...')>"


class CollectionDetail(Base):
    __tablename__ = "collection_details"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collection_id = Column(String(36), ForeignKey("collections.id"), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Unique constraints
    __table_args__ = (
        UniqueConstraint('collection_id', 'key', name='uq_collection_details_collection_key'),
    )

    collection = relationship("Collection", back_populates="details")

    def __repr__(self):
        return f"<CollectionDetail(id={self.id}, collection_id={self.collection_id}, key='{self.key}')>"


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    url = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<Attachment(id={self.id}, url='{self.url}')>"


class CollectionAttachment(Base):
    __tablename__ = "collection_attachments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collection_id = Column(String(36), ForeignKey("collections.id"), nullable=False)
    attachment_id = Column(String(36), ForeignKey("attachments.id"), nullable=False)

    # Unique constraints
    __table_args__ = (
        UniqueConstraint('collection_id', 'attachment_id', name='uq_collection_attachments_collection_attachment'),
    )

    def __repr__(self):
        return f"<CollectionAttachment(attachment_id={self.id}, collection_id={self.collection_id}, attachment_id={self.attachment_id})>"


# 新的社区相关表结构


class Post(Base):
    __tablename__ = "posts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    refer_collection_id = Column(String(36), ForeignKey("collections.id"), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="posts")
    refer_collection = relationship("Collection", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship(
        "Like",
        foreign_keys="Like.asset_id",
        primaryjoin="and_(Post.id == Like.asset_id, Like.asset_type == 'post')",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Post(id={self.id}, post_id='{self.post_id}', user_id={self.user_id}, refer_collection_id={self.refer_collection_id})>"


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String(36), ForeignKey("posts.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")
    likes = relationship(
        "Like",
        foreign_keys="Like.asset_id",
        primaryjoin="and_(Comment.id == Like.asset_id, Like.asset_type == 'comment')",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Comment(id={self.id}, post_id={self.post_id}, user_id={self.user_id})>"


class Like(Base):
    __tablename__ = "likes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    asset_id = Column(String(36), nullable=False)  # post_id 或 comment_id
    asset_type = Column(Enum(AssetType), nullable=False)  # 'post' 或 'comment'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Unique constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'asset_id', 'asset_type', name='uq_likes_user_asset'),
    )

    # Relationships
    user = relationship("User", back_populates="likes")

    def __repr__(self):
        return f"<Like(id={self.id}, user_id={self.user_id}, asset_id={self.asset_id}, asset_type={self.asset_type})>"

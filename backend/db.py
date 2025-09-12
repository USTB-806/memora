from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from typing import AsyncGenerator

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./memora.db")

# Create async SQLAlchemy engine
engine = create_async_engine(DATABASE_URL, echo=False)  # Set to True for SQL query logging

# Create async SessionLocal class
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Create Base for declarative models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to get async database session.
    This function creates a new SQLAlchemy AsyncSession that will be used in a single request,
    and then close it once the request is finished.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables():
    """
    Create all tables in the database.
    This should be called when the application starts.
    """
    from model import Base  # Import here to avoid circular imports

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables():
    """
    Drop all tables in the database.
    Use with caution - this will delete all data!
    """
    from model import Base  # Import here to avoid circular imports

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def reset_database():
    """
    Drop and recreate all tables.
    Use with caution - this will delete all data!
    """
    await drop_tables()
    await create_tables()

"""
Alembic Migration Environment — Master Prompt V2.0
Configured for async SQLAlchemy with auto-detection of model changes
"""

import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine

from alembic import context
from config import settings
from database_new import Base
from models import User, Resume, Job, Application, VMSession, VMEvent, ChatMessage

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# set the sqlalchemy.url value, this is only used by the 'sqlalchemy' command
# to create migrations. For the applications, the URL comes from environment.
config.set_main_option("sqlalchemy.url", str(settings.DATABASE_URL))

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (non-connected)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with a database connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode (with connection)."""
    
    connectable = create_async_engine(
        str(settings.DATABASE_URL),
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


# Determine if we're running online or offline
if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())

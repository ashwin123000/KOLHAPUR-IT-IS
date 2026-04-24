"""vm assessment system

Revision ID: 002_vm_assessment_system
Revises: 001_initial_schema
Create Date: 2026-04-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "002_vm_assessment_system"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("repo_url", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("codebase_path", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("environment", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column("jobs", sa.Column("starter_code", sa.Text(), nullable=True))

    op.add_column("vm_sessions", sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("vm_sessions", sa.Column("container_name", sa.Text(), nullable=True))
    op.add_column("vm_sessions", sa.Column("vm_url", sa.Text(), nullable=True))
    op.add_column("vm_sessions", sa.Column("workspace_path", sa.Text(), nullable=True))
    op.add_column("vm_sessions", sa.Column("language", sa.String(length=50), nullable=False, server_default="python"))
    op.add_column("vm_sessions", sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.add_column("vm_sessions", sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("vm_sessions", sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_vm_sessions_project_id_jobs", "vm_sessions", "jobs", ["project_id"], ["id"])
    op.create_index("idx_vm_sessions_project_id", "vm_sessions", ["project_id"])

    op.create_table(
        "vm_submissions",
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("language", sa.String(length=50), nullable=False, server_default="python"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_vm_submissions_session_id", "vm_submissions", ["session_id"])

    op.create_table(
        "vm_questions",
        sa.Column("question_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("questions", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_vm_questions_session_id", "vm_questions", ["session_id"])

    op.create_table(
        "vm_answers",
        sa.Column("answer_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answers", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_vm_answers_session_id", "vm_answers", ["session_id"])

    op.create_table(
        "vm_results",
        sa.Column("result_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("llm_explanation_score", sa.Integer(), nullable=True),
        sa.Column("code_quality_score", sa.Integer(), nullable=True),
        sa.Column("execution_behavior_score", sa.Integer(), nullable=True),
        sa.Column("participation_score", sa.Integer(), nullable=True),
        sa.Column("rule_penalties", sa.Integer(), nullable=True),
        sa.Column("penalty_reasons", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("score >= 0 AND score <= 100", name="ck_vm_results_score"),
    )
    op.create_index("idx_vm_results_project_score", "vm_results", ["project_id", "score"])

    op.create_table(
        "vm_behavior",
        sa.Column("behavior_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("run_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("first_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_clean_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_edit_time_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("keypress_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("final_code_length_chars", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "vm_behavior_events",
        sa.Column("event_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("event_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_vm_behavior_events_session_id", "vm_behavior_events", ["session_id"])

    op.create_table(
        "vm_improvements",
        sa.Column("improvement_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vm_sessions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("improved_code", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("vm_improvements")
    op.drop_index("idx_vm_behavior_events_session_id", table_name="vm_behavior_events")
    op.drop_table("vm_behavior_events")
    op.drop_table("vm_behavior")
    op.drop_index("idx_vm_results_project_score", table_name="vm_results")
    op.drop_table("vm_results")
    op.drop_index("idx_vm_answers_session_id", table_name="vm_answers")
    op.drop_table("vm_answers")
    op.drop_index("idx_vm_questions_session_id", table_name="vm_questions")
    op.drop_table("vm_questions")
    op.drop_index("idx_vm_submissions_session_id", table_name="vm_submissions")
    op.drop_table("vm_submissions")
    op.drop_index("idx_vm_sessions_project_id", table_name="vm_sessions")
    op.drop_constraint("fk_vm_sessions_project_id_jobs", "vm_sessions", type_="foreignkey")
    op.drop_column("vm_sessions", "ended_at")
    op.drop_column("vm_sessions", "submitted_at")
    op.drop_column("vm_sessions", "last_activity_at")
    op.drop_column("vm_sessions", "language")
    op.drop_column("vm_sessions", "workspace_path")
    op.drop_column("vm_sessions", "vm_url")
    op.drop_column("vm_sessions", "container_name")
    op.drop_column("vm_sessions", "project_id")
    op.drop_column("jobs", "starter_code")
    op.drop_column("jobs", "environment")
    op.drop_column("jobs", "codebase_path")
    op.drop_column("jobs", "repo_url")

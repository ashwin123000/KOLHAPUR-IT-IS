"""Initial schema — Create all tables for AI Hiring OS

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-04-23

This migration creates all 7 core tables:
- users
- resumes  
- jobs
- applications
- vm_sessions
- vm_events
- chat_messages
"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.VARCHAR(320), nullable=False, unique=True),
        sa.Column('password_hash', sa.VARCHAR(255), nullable=False),
        sa.Column('full_name', sa.VARCHAR(100), nullable=True),
        sa.Column('role', sa.VARCHAR(50), nullable=False, server_default='candidate'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='False'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('idx_users_email', 'email'),
    )
    
    # Create resumes table
    op.create_table(
        'resumes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('file_name', sa.VARCHAR(255), nullable=False),
        sa.Column('raw_text', sa.Text(), nullable=False),
        sa.Column('name', sa.VARCHAR(100), nullable=True),
        sa.Column('email', sa.VARCHAR(320), nullable=True),
        sa.Column('phone', sa.VARCHAR(20), nullable=True),
        sa.Column('location', sa.VARCHAR(100), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('skills', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('experience', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('education', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('projects', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('certifications', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('skill_embedding', Vector(384), nullable=True),
        sa.Column('parse_status', sa.VARCHAR(50), nullable=False, server_default='pending'),
        sa.Column('parse_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.Index('idx_resumes_user_id', 'user_id'),
        sa.Index('idx_resumes_parse_status', 'parse_status'),
    )
    
    # Create jobs table
    op.create_table(
        'jobs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('recruiter_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.VARCHAR(255), nullable=False),
        sa.Column('company', sa.VARCHAR(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('requirements', sa.Text(), nullable=True),
        sa.Column('nice_to_have', sa.Text(), nullable=True),
        sa.Column('location', sa.VARCHAR(100), nullable=False),
        sa.Column('job_type', sa.VARCHAR(50), nullable=False),
        sa.Column('work_mode', sa.VARCHAR(50), nullable=False),
        sa.Column('salary_min', sa.Numeric(10, 2), nullable=True),
        sa.Column('salary_max', sa.Numeric(10, 2), nullable=True),
        sa.Column('required_skills', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('status', sa.VARCHAR(50), nullable=False, server_default='active'),
        sa.Column('has_vm_test', sa.Boolean(), nullable=False, server_default='False'),
        sa.Column('vm_test_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('jd_embedding', Vector(384), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['recruiter_id'], ['users.id'], ondelete='CASCADE'),
        sa.Index('idx_jobs_recruiter_id', 'recruiter_id'),
        sa.Index('idx_jobs_status', 'status'),
    )
    
    # Create applications table
    op.create_table(
        'applications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('resume_id', sa.UUID(), nullable=True),
        sa.Column('status', sa.VARCHAR(50), nullable=False, server_default='applied'),
        sa.Column('cover_letter', sa.Text(), nullable=True),
        sa.Column('answers', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('match_score', sa.Numeric(5, 2), nullable=True),
        sa.Column('matched_skills', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('missing_skills', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('match_insights', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('user_id', 'job_id', name='uq_user_job'),
        sa.Index('idx_applications_user_id', 'user_id'),
        sa.Index('idx_applications_job_id', 'job_id'),
        sa.Index('idx_applications_status', 'status'),
    )
    
    # Create vm_sessions table
    op.create_table(
        'vm_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('application_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('container_id', sa.VARCHAR(255), nullable=True),
        sa.Column('container_port', sa.Integer(), nullable=True),
        sa.Column('session_token', sa.VARCHAR(255), nullable=False, unique=True),
        sa.Column('status', sa.VARCHAR(50), nullable=False, server_default='pending'),
        sa.Column('current_question_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_questions', sa.Integer(), nullable=False),
        sa.Column('questions', sa.JSON(), nullable=False),
        sa.Column('answers', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('score', sa.Numeric(5, 2), nullable=True),
        sa.Column('max_score', sa.Numeric(5, 2), nullable=False),
        sa.Column('performance_summary', sa.JSON(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.Index('idx_vm_sessions_user_id', 'user_id'),
        sa.Index('idx_vm_sessions_status', 'status'),
    )
    
    # Create vm_events table (anti-cheat tracking)
    op.create_table(
        'vm_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('event_type', sa.VARCHAR(50), nullable=False),
        sa.Column('severity', sa.VARCHAR(50), nullable=False, server_default='low'),
        sa.Column('flagged', sa.Boolean(), nullable=False, server_default='False'),
        sa.Column('metadata', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['vm_sessions.id'], ondelete='CASCADE'),
        sa.Index('idx_vm_events_session_id', 'session_id'),
        sa.Index('idx_vm_events_flagged', 'flagged'),
    )
    
    # Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=True),
        sa.Column('session_id', sa.VARCHAR(255), nullable=True),
        sa.Column('role', sa.VARCHAR(50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='SET NULL'),
        sa.Index('idx_chat_messages_user_id', 'user_id'),
        sa.Index('idx_chat_messages_session_id', 'session_id'),
    )


def downgrade() -> None:
    op.drop_table('chat_messages')
    op.drop_table('vm_events')
    op.drop_table('vm_sessions')
    op.drop_table('applications')
    op.drop_table('jobs')
    op.drop_table('resumes')
    op.drop_table('users')
    op.execute('DROP EXTENSION IF EXISTS vector')

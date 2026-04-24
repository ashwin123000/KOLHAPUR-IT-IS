from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class VMProjectSummary(BaseModel):
    project_id: str
    title: str
    description: str
    required_skills: list[str] = Field(default_factory=list)
    environment: dict[str, Any] = Field(default_factory=dict)
    repo_url: str | None = None


class VMStartRequest(BaseModel):
    project_id: str


class VMStartResponse(BaseModel):
    session_id: str
    vm_url: str
    status: str
    project: VMProjectSummary


class VMRunRequest(BaseModel):
    session_id: str
    code: str = Field(min_length=1)
    language: str = Field(default="python", min_length=2)


class VMAutosaveRequest(BaseModel):
    session_id: str
    code: str


class VMRunResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: int


class VMSubmitRequest(BaseModel):
    session_id: str
    code: str = Field(min_length=1)
    language: str = Field(default="python", min_length=2)


class VMSubmitResponse(BaseModel):
    message: str
    submission_id: str


class VMQuestionItem(BaseModel):
    index: int
    type: Literal["tradeoff", "optimization", "edge_case"] | str
    line_reference: int | None = None
    code_snippet: str | None = None
    text: str


class VMQuestionsResponse(BaseModel):
    status: str
    questions: list[VMQuestionItem] | None = None


class VMAnswerItem(BaseModel):
    question_index: int
    answer: str = Field(min_length=1)


class VMAnswersRequest(BaseModel):
    session_id: str
    answers: list[VMAnswerItem]


class VMResultResponse(BaseModel):
    status: str
    score: int | None = None
    rank: int | None = None
    total: int | None = None
    reasoning: str | None = None
    evaluated_at: datetime | None = None
    project_id: str | None = None


class VMLeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    name: str
    score: int
    reasoning: str | None = None
    evaluated_at: datetime | None = None


class VMLeaderboardResponse(BaseModel):
    project_id: str
    total: int
    leaderboard: list[VMLeaderboardEntry]


class VMAnalyticsResponse(BaseModel):
    session_overview: dict[str, Any]
    timeline: list[dict[str, Any]]
    interpretation: str
    behavior_score: int


class VMImprovementResponse(BaseModel):
    status: str
    improved_code: str | None = None


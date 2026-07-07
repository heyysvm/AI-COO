"""Chat Pydantic v2 schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    role: str = Field(..., description="Role of the speaker: user, assistant, system")
    content: str = Field(..., description="Content of the message")
    agent: Optional[str] = Field(None, description="Active agent if processed by multi-agent system")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    response: str
    voice_summary: Optional[str] = None
    agent: Optional[str] = None
    reasoning: Optional[str] = None
    confidence: Optional[str] = None
    conversation_id: str


class InsightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    type: str = Field(..., description="Type of insight: financial, inventory, crm, marketing, operational")
    title: str
    description: str
    severity: str = Field(..., description="Severity level: low, medium, high, critical")
    agent: str
    created_at: datetime

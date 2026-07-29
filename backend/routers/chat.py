"""Thin proxy between the frontend chatbot and the AI service."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from services.ai_service import _chat_completion

router = APIRouter()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are SafeThali AI, a food safety assistant for Indian families, replying inside "
    "a narrow chat widget. "
    "You help with food adulteration detection, FSSAI violations, safe food buying tips, "
    "home tests, and seasonal food risks in Delhi. "
    "Keep responses short and practical — a few sentences or a short list, never long. "
    "Reply in PLAIN TEXT only: no markdown, no tables, no headings, no asterisks for bold. "
    "Use plain dashes for lists if needed. "
    "If asked in Hindi or English, respond in the same language."
)

MAX_HISTORY  = 10   # messages to keep in context (prevents token bloat)
MAX_USER_LEN = 500  # chars per message (blocks prompt-injection attempts)


class ChatMessage(BaseModel):
    role:    Literal["user", "assistant"]
    content: str = Field(..., max_length=1000)


class ChatRequest(BaseModel):
    message: str               = Field(..., min_length=1, max_length=MAX_USER_LEN)
    history: list[ChatMessage] = Field(default=[], max_length=MAX_HISTORY)


@router.post("/")
async def chat(req: ChatRequest):
    # History is assembled server-side so it always reflects the full conversation.
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in req.history[-(MAX_HISTORY):]:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": req.message})

    try:
        reply = await _chat_completion(messages, max_tokens=350, temperature=0.5, timeout=30)
    except RuntimeError as e:
        logger.warning("Chat AI failed: %s", e)
        raise HTTPException(503, "AI service temporarily unavailable")

    return {"reply": reply}

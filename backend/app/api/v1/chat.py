from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel
import httpx

from app.core.security import get_current_user
from app.services.chat_service import process_chat, get_chat_history, clear_chat_history
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessage
from app.core.config import settings

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "en-IN-winnie"


@router.post("/tts")
async def generate_tts(payload: TTSRequest):
    if not settings.MURF_API_KEY:
        return {"status": "fallback", "message": "Murf API Key not set. Falling back to browser speech synthesis."}
        
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "api-key": settings.MURF_API_KEY
            }
            data = {
                "voiceId": payload.voice_id,
                "text": payload.text,
                "format": "MP3",
                "sampleRate": 24000
            }
            response = await client.post("https://api.murf.ai/v1/speech/generate", json=data, headers=headers)
            if response.status_code != 200:
                return {"status": "fallback", "message": f"Murf API returned status {response.status_code}"}
            
            res_data = response.json()
            return {"status": "success", "audioUrl": res_data.get("audioUrl")}
    except Exception as e:
        return {"status": "fallback", "error": str(e), "message": "Failed to connect to Murf API."}



@router.post("/", response_model=ChatResponse)
async def chat_with_coo(
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no business associated. Please register or join a business first.",
        )

    try:
        response = await process_chat(
            message=payload.message,
            user_id=current_user["id"],
            business_id=business_id,
            conversation_id=payload.conversation_id,
        )
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running multi-agent COO check: {str(e)}",
        )


@router.get("/history", response_model=List[ChatMessage])
async def chat_history(
    current_user: dict = Depends(get_current_user),
):
    try:
        history = await get_chat_history(user_id=current_user["id"])
        return history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch conversation history: {str(e)}",
        )


@router.delete("/history")
async def clear_history(
    current_user: dict = Depends(get_current_user),
):
    try:
        await clear_chat_history(user_id=current_user["id"])
        return {"message": "Chat history cleared successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear conversation history: {str(e)}",
        )

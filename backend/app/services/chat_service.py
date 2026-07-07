from datetime import datetime, timezone
from bson import ObjectId
import structlog

from app.core.database import get_database
from app.agents.crew import AICOOCrew

logger = structlog.get_logger()


async def process_chat(
    message: str,
    user_id: str,
    business_id: str,
    conversation_id: str = None,
) -> dict:
    """Process a user query through the AI COO multi-agent system and log the exchange."""
    db = get_database()
    
    # 1. Fetch business context
    business_context = {}
    if business_id:
        business = await db.businesses.find_one({"_id": ObjectId(business_id)})
        if business:
            business_context = {
                "business_name": business.get("name", ""),
                "business_type": business.get("type", ""),
                "description": business.get("description", ""),
            }

    # If no conversation_id, generate one
    if not conversation_id:
        conversation_id = str(ObjectId())

    # 2. Run CrewAI process
    crew = AICOOCrew(business_id=business_id, business_context=business_context)
    result = await crew.process_query(message)

    # 3. Store conversation history in MongoDB
    chat_entry = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "business_id": business_id,
        "query": message,
        "response": result.get("response", ""),
        "voice_summary": result.get("voice_summary", ""),
        "agent": result.get("agent", "Supervisor"),
        "reasoning": result.get("reasoning", ""),
        "confidence": result.get("confidence", "Medium"),
        "created_at": datetime.now(timezone.utc),
    }
    await db.chat_history.insert_one(chat_entry)

    # Return response formatted for API
    return {
        "response": result.get("response", ""),
        "voice_summary": result.get("voice_summary", ""),
        "agent": result.get("agent", "Supervisor"),
        "reasoning": result.get("reasoning", ""),
        "confidence": result.get("confidence", "Medium"),
        "conversation_id": conversation_id,
    }


async def get_chat_history(user_id: str, conversation_id: str = None) -> list:
    """Retrieve chat logs from MongoDB for the current user."""
    db = get_database()
    query = {"user_id": user_id}
    if conversation_id:
        query["conversation_id"] = conversation_id

    cursor = db.chat_history.find(query).sort("created_at", 1)
    history = await cursor.to_list(length=100)

    formatted_history = []
    for h in history:
        # User message
        formatted_history.append(
            {
                "role": "user",
                "content": h.get("query", ""),
                "timestamp": h.get("created_at"),
            }
        )
        # Assistant reply
        formatted_history.append(
            {
                "role": "assistant",
                "content": h.get("response", ""),
                "agent": h.get("agent", ""),
                "timestamp": h.get("created_at"),
            }
        )

    return formatted_history


async def clear_chat_history(user_id: str) -> bool:
    """Delete all chat logs for a given user."""
    db = get_database()
    await db.chat_history.delete_many({"user_id": user_id})
    return True

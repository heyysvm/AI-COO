import structlog
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from app.core.config import settings

logger = structlog.get_logger()


def get_gemini_llm(model_name: str = "gemini/gemini-2.5-flash") -> ChatGoogleGenerativeAI:
    """Get the primary Gemini model with provider prefix for LiteLLM."""
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not set in environment.")
    # Strip prefix for LangChain's direct constructor to be safe
    raw_model = model_name.split("/")[-1]
    return ChatGoogleGenerativeAI(
        model=raw_model,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.2,
    )


def get_groq_llm(model_name: str = "groq/llama-3.3-70b-versatile") -> ChatGroq:
    """Get the Groq model with provider prefix for LiteLLM."""
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is not set in environment.")
    # Strip prefix for LangChain's direct constructor to be safe
    raw_model = model_name.split("/")[-1]
    return ChatGroq(
        model=raw_model,
        api_key=settings.GROQ_API_KEY,
        temperature=0.2,
    )


def get_llm_with_fallback(primary_model: str = "gemini-2.5-flash", fallback_model: str = "llama-3.3-70b-versatile"):
    """Get the primary LLM (configured to return Groq directly for stable multi-agent execution)."""
    if settings.GROQ_API_KEY:
        return get_groq_llm(fallback_model)
    return get_gemini_llm(primary_model)

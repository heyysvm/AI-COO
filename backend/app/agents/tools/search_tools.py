import structlog
from langchain_community.tools.tavily_search import TavilySearchResults
from crewai.tools import BaseTool

from app.core.config import settings

logger = structlog.get_logger()


class TavilySearchTool(BaseTool):
    name: str = "tavily_search_tool"
    description: str = "Performs an external web search using Tavily to research market trends, industry news, competitor strategies, or government policies."

    def _run(self, query: str) -> str:
        if not settings.TAVILY_API_KEY:
            return "Search tool error: Tavily API key is not configured in settings."

        try:
            search = TavilySearchResults(
                max_results=3,
                search_depth="advanced",
                tavily_api_key=settings.TAVILY_API_KEY,
            )
            results = search.invoke({"query": query})

            formatted_results = []
            for i, r in enumerate(results, 1):
                formatted_results.append(
                    f"[{i}] Content: {r.get('content')}\nSource URL: {r.get('url')}\n"
                )

            return (
                f"External search results for query '{query}':\n\n"
                + "\n".join(formatted_results)
            )
        except Exception as e:
            logger.error("Tavily search failed", error=str(e))
            return f"External search failed: {str(e)}"


# Export tool instance for backward compatibility
tavily_search_tool = TavilySearchTool()

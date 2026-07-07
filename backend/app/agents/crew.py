import structlog
from crewai import Agent, Task, Crew, Process, LLM

from app.core.config import settings
from langchain_groq import ChatGroq
from app.agents.tools.database_tools import (
    query_revenue_tool,
    query_expenses_tool,
    query_inventory_tool,
    query_customers_tool,
    query_orders_tool,
)
from app.agents.tools.search_tools import tavily_search_tool
from app.agents.tools.calculator_tools import (
    calculate_profit_margin,
    calculate_growth_rate,
    calculate_inventory_turnover,
)
from app.agents.prompts.supervisor import SUPERVISOR_PROMPT
from app.agents.prompts.finance import FINANCE_AGENT_PROMPT
from app.agents.prompts.inventory import INVENTORY_AGENT_PROMPT
from app.agents.prompts.crm import CRM_AGENT_PROMPT
from app.agents.prompts.analytics import ANALYTICS_AGENT_PROMPT
from app.agents.prompts.search import SEARCH_AGENT_PROMPT

logger = structlog.get_logger()


class AICOOCrew:
    def __init__(self, business_id: str, business_context: dict):
        self.business_id = business_id
        self.business_context = business_context
        # Use native CrewAI LLM for Groq to avoid LiteLLM parsing errors
        self.llm = LLM(
            model="groq/llama-3.3-70b-versatile",
            api_key=settings.GROQ_API_KEY,
            temperature=0.2
        )
        # Use LangChain ChatGroq for direct fallback execution
        self.fast_llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=settings.GROQ_API_KEY,
            temperature=0.2
        )

    def _create_agents(self):
        # Bind business_id to DB query tools
        # For simplicity, we define them and the agent will call them with self.business_id
        
        self.finance_agent = Agent(
            role="Finance Analyst",
            goal="Analyze financial transactions, cash flow, margins, and expense structures",
            backstory=FINANCE_AGENT_PROMPT,
            tools=[query_revenue_tool, query_expenses_tool, calculate_profit_margin, calculate_growth_rate],
            llm=self.llm,
            verbose=False,
        )

        self.inventory_agent = Agent(
            role="Inventory Manager",
            goal="Monitor stock levels, track SKU quantities, identify low stock, and manage reorders",
            backstory=INVENTORY_AGENT_PROMPT,
            tools=[query_inventory_tool, calculate_inventory_turnover],
            llm=self.llm,
            verbose=False,
        )

        self.crm_agent = Agent(
            role="CRM Specialist",
            goal="Understand customer segments, purchasing behaviors, VIPs, and churn risks",
            backstory=CRM_AGENT_PROMPT,
            tools=[query_customers_tool],
            llm=self.llm,
            verbose=False,
        )

        self.analytics_agent = Agent(
            role="Business Analyst",
            goal="Compute general business KPIs, analyze order fulfillment, status distributions, and patterns",
            backstory=ANALYTICS_AGENT_PROMPT,
            tools=[query_orders_tool, query_revenue_tool, query_customers_tool],
            llm=self.llm,
            verbose=False,
        )

        self.search_agent = Agent(
            role="Research Analyst",
            goal="Research market trends, competitor insights, and industry news via search",
            backstory=SEARCH_AGENT_PROMPT,
            tools=[tavily_search_tool],
            llm=self.llm,
            verbose=False,
        )

        # Supervisor COO Agent
        context_str = "\n".join([f"- {k}: {v}" for k, v in self.business_context.items()])
        supervisor_backstory = SUPERVISOR_PROMPT.format(
            business_context=context_str
        )
        self.supervisor_agent = Agent(
            role="AI Chief Operating Officer",
            goal="Coordinate agents, analyze business holistically, and recommend strategic improvements",
            backstory=supervisor_backstory,
            llm=self.llm,
            verbose=False,
        )

    def _classify_query(self, query: str) -> list[str]:
        query_lower = query.lower()
        needed = []
        if any(w in query_lower for w in ["finance", "revenue", "expense", "profit", "money", "cost", "margin", "cash"]):
            needed.append("finance")
        if any(w in query_lower for w in ["inventory", "stock", "product", "replenish", "sku", "qty", "reorder"]):
            needed.append("inventory")
        if any(w in query_lower for w in ["customer", "client", "vip", "spender", "segment", "crm", "buyer"]):
            needed.append("crm")
        if any(w in query_lower for w in ["order", "sale", "volume", "status", "cancel", "avg", "trend", "kpi"]):
            needed.append("analytics")
        if any(w in query_lower for w in ["market", "competitor", "news", "trend", "scheme", "search", "industry"]):
            needed.append("search")

        # Return empty list if no operational keywords match (general conversation or greeting)
        return list(set(needed))

    async def process_query(self, query: str) -> dict:
        self._create_agents()
        needed_domains = self._classify_query(query)
        logger.info("Classified query domains", query=query, domains=needed_domains)

        if not needed_domains:
            # Bypass database query and CrewAI for general greetings or non-data queries
            response = await self.fast_llm.ainvoke([
                ("system", "You are the AI Chief Operating Officer (AI COO). Reply to the user's greeting or general conversation in a friendly, conversational, and professional tone. Keep it brief, polite, and ask how you can help them manage their business today."),
                ("human", query)
            ])
            response_content = response.content
            return {
                "response": response_content,
                "voice_summary": response_content,  # Simple, conversational message directly playable
                "agent": "AI COO",
                "reasoning": "Responded to general greeting/conversation.",
                "confidence": "High",
            }

        try:
            summary_context = ""
            # 1. Gather tools data programmatically to feed into the fallback / context
            # This ensures even if CrewAI has issues, the final LLM response has perfect numbers.
            db_context = {}
            if "finance" in needed_domains:
                db_context["finance"] = query_revenue_tool.run(business_id=self.business_id) + "\n" + query_expenses_tool.run(business_id=self.business_id)
            if "inventory" in needed_domains:
                db_context["inventory"] = query_inventory_tool.run(business_id=self.business_id)
            if "crm" in needed_domains:
                db_context["crm"] = query_customers_tool.run(business_id=self.business_id)
            if "analytics" in needed_domains:
                db_context["analytics"] = query_orders_tool.run(business_id=self.business_id)
            if "search" in needed_domains:
                db_context["search"] = tavily_search_tool.run(query=query)

            # Assemble database summaries into context
            summary_context = "\n\n".join([f"### {domain.upper()} DATA:\n{data}" for domain, data in db_context.items()])

            # Try CrewAI Execution
            agents_list = []
            tasks_list = []

            # Supervisor task to coordinate
            supervisor_task = Task(
                description=(
                    f"Analyze the user's query: '{query}'.\n"
                    f"Delegate to appropriate agents if needed. Review the business database summaries below:\n"
                    f"{summary_context}\n"
                    "Provide a clean markdown report formatted with: Executive Summary, Detailed Analysis, Actionable COO Recommendations, and Confidence Score."
                ),
                expected_output="A structured markdown report covering summary, analysis, recommendations, and confidence score.",
                agent=self.supervisor_agent,
            )

            # Dynamic Crew creation
            crew_agents = [self.supervisor_agent]
            if "finance" in needed_domains:
                crew_agents.append(self.finance_agent)
            if "inventory" in needed_domains:
                crew_agents.append(self.inventory_agent)
            if "crm" in needed_domains:
                crew_agents.append(self.crm_agent)
            if "analytics" in needed_domains:
                crew_agents.append(self.analytics_agent)
            if "search" in needed_domains:
                crew_agents.append(self.search_agent)

            crew = Crew(
                agents=crew_agents,
                tasks=[supervisor_task],
                process=Process.sequential,  # Sequential is much faster & reliable for a hackathon
                verbose=False,
            )

            logger.info("Kicking off CrewAI operational analysis...")
            result = crew.kickoff(inputs={"query": query})
            
            # CrewAI returns a CrewOutput, convert to string
            result_str = str(result)
            active_agent = "Supervisor" if len(needed_domains) > 1 else f"{needed_domains[0].capitalize()} Agent"

            voice_summary = await self._generate_voice_summary(result_str)

            return {
                "response": result_str,
                "voice_summary": voice_summary,
                "agent": active_agent,
                "reasoning": f"Coordinated analysis between domains: {', '.join(needed_domains)}.",
                "confidence": "High",
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error("CrewAI execution error, falling back to direct LLM", error=str(e))
            # Safe Fallback: Direct call to Gemini using the prompt templates and DB data
            return await self._run_fallback_analysis(query, needed_domains, summary_context)

    async def _run_fallback_analysis(self, query: str, domains: list[str], summary_context: str) -> dict:
        """Fallback analyzer using a single structured prompt to Gemini with direct DB stats."""
        context_str = "\n".join([f"- {k}: {v}" for k, v in self.business_context.items()])
        system_prompt = (
            "You are the AI Chief Operating Officer (AI COO) - a trusted partner and operational leader for a small/medium business.\n"
            f"Business Profile Context:\n{context_str}\n\n"
            "Below is the current operational data fetched from the business database:\n"
            f"{summary_context}\n\n"
            "Analyze the user's query and reply in a warm, natural, and highly conversational tone.\n"
            "Talk like a normal, supportive human operational partner instead of a robot. "
            "Integrate database metrics and statistics naturally into your sentences to back up your points. "
            "Use headers and bold text to keep things organized, but let your language flow naturally. "
            "Ensure you address the user's question directly with clear operational recommendations and a confidence score at the end."
        )

        user_message = f"User Query: {query}"

        try:
            response = await self.fast_llm.ainvoke([
                ("system", system_prompt),
                ("human", user_message)
            ])
            
            active_agent = "Supervisor (Direct)" if len(domains) > 1 else f"{domains[0].capitalize()} Agent (Direct)"
            voice_summary = await self._generate_voice_summary(response.content)
            
            return {
                "response": response.content,
                "voice_summary": voice_summary,
                "agent": active_agent,
                "reasoning": f"Analyzed database statistics for: {', '.join(domains)}.",
                "confidence": "High (Direct DB Match)",
            }
        except Exception as ex:
            logger.error("All AI paths failed", error=str(ex))
            err_msg = (
                "### 📊 Business Health Executive Summary\n"
                "The AI COO is currently offline or experiencing rate limits. However, we have scanned your database metrics.\n\n"
                "### 🔍 Operational Analysis\n"
                f"We retrieved data for the following domains: {', '.join(domains)}.\n"
                "Your databases are connected, but we could not complete the multi-agent reasoning pass.\n\n"
                "### 💡 Actionable COO Recommendations\n"
                "1. Check your network connection.\n"
                "2. Verify your GEMINI_API_KEY in the `.env` settings.\n"
                "3. Ensure the databases contain seeded data."
            )
            return {
                "response": err_msg,
                "voice_summary": "I am experiencing network connectivity issues. I have loaded system diagnostics on your workspace.",
                "agent": "System Diagnostics",
                "reasoning": "Fallback diagnostics activated due to API error.",
                "confidence": "Low",
            }

    async def _generate_voice_summary(self, detailed_text: str) -> str:
        """Helper to generate a short, warm spoken voice summary of a detailed report."""
        try:
            prompt = (
                "You are the AI Chief Operating Officer (AI COO). Convert the following detailed business analysis response into a warm, natural, and highly conversational 1-2 sentence spoken summary. "
                "Write it exactly as a friendly human business partner would say it out loud to the owner. Do not use any markdown headers, tags, lists, or symbols. "
                "Speak in normal, clear, and familiar English (with a friendly Indian business tone). Keep it concise, natural, and under 40 words.\n\n"
                f"Detailed Response:\n{detailed_text}"
            )
            response = await self.fast_llm.ainvoke([("user", prompt)])
            return response.content.strip()
        except Exception as e:
            logger.error("Failed to generate voice summary", error=str(e))
            return "Here is the detailed business analysis report you requested. Let me know if you would like me to clarify any specifics!"

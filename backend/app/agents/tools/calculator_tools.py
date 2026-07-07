from crewai.tools import BaseTool


class CalculateProfitMargin(BaseTool):
    name: str = "calculate_profit_margin"
    description: str = "Calculates the gross/net profit margin percentage from revenue and cost."

    def _run(self, revenue: float, cost: float) -> str:
        if revenue <= 0:
            return "Profit margin: N/A (Revenue is 0 or negative)"
        profit = revenue - cost
        margin = (profit / revenue) * 100
        return f"Profit Margin calculation:\n- Revenue: {revenue:.2f}\n- Cost: {cost:.2f}\n- Profit: {profit:.2f}\n- Margin: {margin:.2f}%"


class CalculateGrowthRate(BaseTool):
    name: str = "calculate_growth_rate"
    description: str = "Calculates the growth rate percentage between current and previous metrics."

    def _run(self, current: float, previous: float) -> str:
        if previous <= 0:
            return "Growth rate: N/A (Previous value is 0 or negative)"
        growth = ((current - previous) / previous) * 100
        direction = "increase" if growth >= 0 else "decrease"
        return (
            f"Growth Rate calculation:\n"
            f"- Previous: {previous:.2f}\n"
            f"- Current: {current:.2f}\n"
            f"- Change: {growth:.2f}% {direction}"
        )


class CalculateInventoryTurnover(BaseTool):
    name: str = "calculate_inventory_turnover"
    description: str = "Calculates the inventory turnover ratio indicating how quickly stock is sold and replaced."

    def _run(self, cost_of_goods_sold: float, average_inventory: float) -> str:
        if average_inventory <= 0:
            return "Inventory turnover: N/A (Average inventory is 0 or negative)"
        ratio = cost_of_goods_sold / average_inventory
        days = 365 / ratio if ratio > 0 else float("inf")
        return (
            f"Inventory Turnover calculation:\n"
            f"- Cost of Goods Sold (COGS): {cost_of_goods_sold:.2f}\n"
            f"- Average Inventory Value: {average_inventory:.2f}\n"
            f"- Turnover Ratio: {ratio:.2f} times/year\n"
            f"- Average Days to Sell: {days:.1f} days"
        )


# Export tool instances for backward compatibility
calculate_profit_margin = CalculateProfitMargin()
calculate_growth_rate = CalculateGrowthRate()
calculate_inventory_turnover = CalculateInventoryTurnover()

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { formatCurrency } from "@/lib/utils";

interface ExpenseChartProps {
  data: { category: string; amount: number }[];
}

const COLORS = [
  "#6366f1", // rent - Indigo
  "#10b981", // supplies - Emerald
  "#f59e0b", // utilities - Amber
  "#ef4444", // salary - Red
  "#3b82f6", // marketing - Blue
  "#a855f7", // maintenance - Purple
  "#6b7280", // other - Gray
];

export const ExpenseChart: React.FC<ExpenseChartProps> = ({ data }) => {
  const totalExpenses = data.reduce((sum, item) => sum + item.amount, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / totalExpenses) * 100).toFixed(1);
      return (
        <div className="bg-surface/95 backdrop-blur-xl border border-border p-3 rounded-lg shadow-xl">
          <p className="text-xs text-text-secondary capitalize mb-1">
            {payload[0].name}
          </p>
          <p className="text-sm font-bold text-danger">
            {formatCurrency(payload[0].value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4 text-xs">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5 text-text-secondary">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span className="capitalize">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-text-secondary text-sm">
        No expense data available. Click "Seed Demo Data" to populate charts.
      </div>
    );
  }

  return (
    <div className="w-full h-[260px] flex flex-col justify-between">
      <div className="relative flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="amount"
              nameKey="category"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text inside Donut */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Total</p>
          <p className="text-base font-bold text-text-primary">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={50}>
        <PieChart>
          <Legend content={renderLegend} verticalAlign="bottom" />
          <Pie data={data} dataKey="amount" nameKey="category" opacity={0}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

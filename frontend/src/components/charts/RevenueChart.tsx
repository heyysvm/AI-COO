import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { formatCurrency } from "@/lib/utils";

interface RevenueChartProps {
  data: { name: string; revenue: number }[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const formatYAxis = (value: number) => {
    if (value >= 100000) return `${(value / 100000).toFixed(0)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface/95 backdrop-blur-xl border border-border p-3 rounded-lg shadow-xl">
          <p className="text-xs text-text-secondary mb-1">Monthly Revenue</p>
          <p className="text-sm font-bold text-accent">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-text-secondary text-sm">
        No sales data available. Click "Seed Demo Data" to populate charts.
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="var(--text-muted-color)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            stroke="var(--text-muted-color)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--accent-color)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

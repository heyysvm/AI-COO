import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface OrdersChartProps {
  data: { status: string; count: number }[];
}

const STATUS_COLORS: { [key: string]: string } = {
  delivered: "#22c55e",  // Success green
  pending: "#f59e0b",    // Warning amber
  processing: "#3b82f6", // Info blue
  confirmed: "#6366f1",  // Accent indigo
  cancelled: "#ef4444",  // Danger red
  shipped: "#a855f7",    // Purple
};

export const OrdersChart: React.FC<OrdersChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#12121a]/95 backdrop-blur-xl border border-white/5 p-3 rounded-lg shadow-xl">
          <p className="text-xs text-text-secondary capitalize mb-1">
            Status: {payload[0].payload.status}
          </p>
          <p className="text-sm font-bold text-text-primary">
            Orders: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-text-secondary text-sm">
        No orders records found. Seed data to populate charts.
      </div>
    );
  }

  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
          <XAxis
            dataKey="status"
            stroke="#555577"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
            dy={8}
          />
          <YAxis
            stroke="#555577"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.05)" }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={STATUS_COLORS[entry.status.toLowerCase()] || "#6366f1"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

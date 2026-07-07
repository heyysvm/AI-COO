import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  AlertTriangle,
  Lightbulb,
  Database,
  Loader2,
  Sparkles,
  Camera,
} from "lucide-react";
import toast from "react-hot-toast";

import PageWrapper from "@/components/shared/PageWrapper";
import StatCard from "@/components/shared/StatCard";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { ExpenseChart } from "@/components/charts/ExpenseChart";
import { formatCurrency, formatDate } from "@/lib/utils";
import api from "@/services/api";
import { useScanStore } from "@/store/scan.store";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } },
};

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const { uploadAndScan, scanning } = useScanStore();


  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch dashboard overview
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboardOverview"],
    queryFn: async () => {
      const res = await api.get("/dashboard/overview");
      return res.data;
    },
  });

  // Seed demo data mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      setSeeding(true);
      const res = await api.post("/seed/");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Demo business data seeded successfully!");
      setSeeding(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to seed demo data.");
      setSeeding(false);
    },
  });

  const handleSeed = () => {
    seedMutation.mutate();
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAndScan(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };


  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Generate real dynamic insights based on live stats
  const getDynamicInsights = (stats: any) => {
    if (!stats) return [];
    const res = [];

    if (stats.low_stock_count > 0) {
      res.push({
        title: "Stock Replenishment Needed",
        desc: `${stats.low_stock_count} critical item(s) are below reorder thresholds. Restock immediately to prevent stockouts.`,
        type: "inventory",
        severity: "high",
      });
    }

    if (stats.profit < 0) {
      res.push({
        title: "Overhead Cost Deficit",
        desc: `Total expenses exceed your revenue by ${formatCurrency(Math.abs(stats.profit))}. Review supplies/marketing overheads.`,
        type: "finance",
        severity: "high",
      });
    } else if (stats.total_revenue > 0) {
      const margin = ((stats.profit / stats.total_revenue) * 100).toFixed(1);
      res.push({
        title: "Healthy Profit Margins",
        desc: `Your business net profit margin is at ${margin}%. Overhead cost ratios are stable.`,
        type: "finance",
        severity: "low",
      });
    }

    if (stats.customer_segments?.at_risk > 0) {
      res.push({
        title: "Customer Churn Risk",
        desc: `${stats.customer_segments.at_risk} customer(s) are inactive (At-Risk). Launch a discount campaign to re-engage them.`,
        type: "crm",
        severity: "medium",
      });
    }

    if (stats.top_products && stats.top_products.length > 0) {
      res.push({
        title: "Top Performer Success",
        desc: `"${stats.top_products[0].name}" is your highest grossing item, driving ${formatCurrency(stats.top_products[0].revenue)} in total sales.`,
        type: "sales",
        severity: "low",
      });
    }

    return res;
  };

  const hasData = stats && stats.total_orders > 0;
  const insights = getDynamicInsights(stats);

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        {/* Top Header Row with Welcome text and seeder */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              COO Command Center
            </h1>
            <p className="text-text-secondary text-sm">
              Continuous multi-agent reasoning, analytics, and operational tracking
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <button
              onClick={handleScanClick}
              disabled={scanning}
              className="flex items-center gap-2 bg-accent/10 hover:bg-accent/25 border border-accent/20 hover:border-accent/40 text-accent font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer transition-all disabled:opacity-50"
            >
              {scanning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              Scan Document
            </button>

            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-text-secondary hover:text-text-primary font-semibold text-xs py-2 px-4 rounded-lg cursor-pointer transition-all disabled:opacity-50"
            >
              {seeding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
              Seed Demo Data
            </button>
          </div>
        </div>

        {/* Onboarding Seeder Banner */}
        {!hasData && (
          <div className="p-6 bg-gradient-to-r from-accent/15 via-[#a78bfa]/10 to-transparent border border-accent/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 glow-accent">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-warning animate-spin animate-duration-3000" /> Getting Started
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed max-w-xl">
                Your store database is currently empty! Seed it with realistic retail datasets (products, expenses, orders, and customer records) in one click to test the AI COO command center.
              </p>
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full md:w-auto bg-accent hover:bg-accent-hover text-white font-semibold text-xs py-3 px-6 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg"
            >
              {seeding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
              Seed Demo Database
            </button>
          </div>
        )}

        {/* KPI Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div variants={itemVariants}>
            <StatCard
              title="Total Revenue"
              value={stats?.total_revenue || 0}
              change={12.4}
              changeType="positive"
              icon={DollarSign}
              color="indigo"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Total Expenses"
              value={stats?.total_expenses || 0}
              change={4.2}
              changeType="negative"
              icon={TrendingUp}
              color="rose"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Completed Orders"
              value={stats?.total_orders || 0}
              change={8.7}
              changeType="positive"
              icon={ShoppingCart}
              color="blue"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Active Customers"
              value={stats?.total_customers || 0}
              change={15.2}
              changeType="positive"
              icon={Users}
              color="emerald"
            />
          </motion.div>
        </motion.div>

        {/* Charts & Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Area Chart */}
          <div className="lg:col-span-2 bg-surface/30 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                Revenue Growth Trend
              </h3>
              <span className="text-xs text-success flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +12.4% MoM
              </span>
            </div>
            <RevenueChart data={stats?.revenue_by_month || []} />
          </div>

          {/* AI COO Insights sidebar panel */}
          <div className="bg-surface/30 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-warning" /> AI COO Insights
            </h3>
            
            <div className="flex-1 flex flex-col gap-3">
              {hasData && insights.length > 0 ? (
                insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#0a0a0f]/50 border border-white/5 hover:border-white/10 rounded-xl flex gap-3 transition-all"
                  >
                    <span className="mt-0.5">
                      {insight.type === "inventory" ? (
                        <AlertTriangle className="w-4 h-4 text-danger animate-pulse" />
                      ) : (
                        <Lightbulb className="w-4 h-4 text-accent" />
                      )}
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold text-text-primary capitalize">
                        {insight.title}
                      </p>
                      <p className="text-[11px] leading-relaxed text-text-secondary">
                        {insight.desc}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <Lightbulb className="w-8 h-8 text-text-muted mb-2 animate-bounce" />
                  <p className="text-xs text-text-secondary font-medium">No active insights</p>
                  <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                    Seed demo data or run transactions to trigger multi-agent analysis.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders table */}
          <div className="lg:col-span-2 bg-surface/30 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              Recent Transactions
            </h3>
            
            {hasData ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-text-muted pb-3">
                      <th className="pb-3 font-semibold">Order</th>
                      <th className="pb-3 font-semibold">Customer</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold text-right">Amount</th>
                      <th className="pb-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_orders.map((order: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-[#0a0a0f]/20">
                        <td className="py-3 font-medium text-text-primary">
                          #{order.order_number.split("-")[1] || order.order_number}
                        </td>
                        <td className="py-3 text-text-secondary">{order.customer_name}</td>
                        <td className="py-3 text-text-muted">{formatDate(order.created_at)}</td>
                        <td className="py-3 text-right font-bold text-text-primary">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              order.status === "delivered"
                                ? "bg-success/15 text-success border border-success/20"
                                : order.status === "cancelled"
                                ? "bg-danger/15 text-danger border border-danger/20"
                                : "bg-warning/15 text-warning border border-warning/20"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-text-secondary text-xs">
                No orders recorded yet.
              </div>
            )}
          </div>

          {/* Expense breakdown chart & low stock list */}
          <div className="bg-surface/30 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              Expense Distribution
            </h3>
            <ExpenseChart data={stats?.expenses_by_category || []} />
          </div>
        </div>
      </div>

    </PageWrapper>
  );
};

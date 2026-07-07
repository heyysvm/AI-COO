import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import PageWrapper from "@/components/shared/PageWrapper";
import DataTable from "@/components/shared/DataTable";
import { formatCurrency, formatDate } from "@/lib/utils";
import api from "@/services/api";

export const Finance: React.FC = () => {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields
  const [expCategory, setExpCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState("");

  // Fetch expenses list
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", category],
    queryFn: async () => {
      const res = await api.get("/expenses/", { params: { category } });
      return res.data;
    },
  });

  // Fetch financial aggregates
  const { data: stats } = useQuery({
    queryKey: ["expensesSummary"],
    queryFn: async () => {
      const res = await api.get("/expenses/stats/summary");
      return res.data;
    },
  });

  // Add expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (newExpense: any) => {
      const res = await api.post("/expenses/", newExpense);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expensesSummary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardOverview"] });
      toast.success("Expense logged successfully!");
      setShowAddModal(false);
      // Reset form
      setExpCategory("other");
      setDescription("");
      setAmount("");
      setVendor("");
      setDate("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to log expense.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      toast.error("Description and Amount are required.");
      return;
    }

    addExpenseMutation.mutate({
      category: expCategory,
      description,
      amount: parseFloat(amount),
      vendor,
      date: date ? new Date(date).toISOString() : undefined,
    });
  };

  const columns = [
    { header: "Description", key: "description" },
    {
      header: "Category",
      key: "category",
      render: (item: any) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-white/5 border border-white/5">
          {item.category}
        </span>
      ),
    },
    {
      header: "Amount",
      key: "amount",
      render: (item: any) => (
        <span className="font-bold text-danger">-{formatCurrency(Number(item.amount))}</span>
      ),
    },
    { header: "Vendor/Recipient", key: "vendor" },
    {
      header: "Date",
      key: "date",
      render: (item: any) => formatDate(item.date),
    },
    { header: "Approved By", key: "approved_by" },
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        {/* Header Row */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Financial Registry
            </h1>
            <p className="text-text-secondary text-sm">
              Log expenditures, monitor COGS, operational overheads, and profit metrics
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2.5 px-4 rounded-lg cursor-pointer transition-all shadow-md hover:shadow-accent/15"
          >
            <Plus className="w-4 h-4" /> Log Expense
          </button>
        </div>

        {/* Aggregated Totals row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface/30 border border-white/5 p-5 rounded-2xl flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Total Logged Expenditures
            </span>
            <span className="text-2xl font-bold text-danger">
              {formatCurrency(stats?.total_expenses || 0)}
            </span>
          </div>

          <div className="bg-surface/30 border border-white/5 p-5 rounded-2xl flex flex-col gap-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Category Distribution Summaries
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {stats?.category_totals && Object.entries(stats.category_totals).length > 0 ? (
                Object.entries(stats.category_totals).map(([cat, amt]: any) => (
                  <span
                    key={cat}
                    className="text-[10px] font-bold capitalize bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-text-secondary"
                  >
                    {cat}: <span className="text-text-primary">{formatCurrency(amt)}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-text-muted">No expenses recorded yet.</span>
              )}
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Filter by:</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-surface/40 border border-white/5 rounded-lg text-xs text-text-primary py-1.5 px-3 outline-none"
          >
            <option value="">All Categories</option>
            <option value="rent">Rent</option>
            <option value="utilities">Utilities</option>
            <option value="salary">Salary</option>
            <option value="supplies">Supplies</option>
            <option value="marketing">Marketing</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={expenses}
          loading={isLoading}
          emptyMessage="No expenses records found."
        />

        {/* Log Expense Modal Dialog */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-base font-bold text-text-primary">Log New Expense</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-text-muted hover:text-text-secondary text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-text-secondary">Expense Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly Broadband Internet"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2.5 px-3 rounded-lg outline-none text-text-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Amount (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="1200"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2.5 px-3 rounded-lg outline-none text-text-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Category</label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2.5 px-3 rounded-lg outline-none text-text-primary"
                    >
                      <option value="rent">Rent</option>
                      <option value="utilities">Utilities</option>
                      <option value="salary">Salary</option>
                      <option value="supplies">Supplies</option>
                      <option value="marketing">Marketing</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Vendor Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Airtel Business"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2.5 px-3 rounded-lg outline-none text-text-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Billing Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2 px-3 rounded-lg outline-none text-text-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="bg-white/5 hover:bg-white/10 text-text-primary text-xs font-semibold py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2 px-4 rounded-lg cursor-pointer"
                  >
                    Log Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

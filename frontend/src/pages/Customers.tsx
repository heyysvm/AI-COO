import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import PageWrapper from "@/components/shared/PageWrapper";
import DataTable from "@/components/shared/DataTable";
import { formatCurrency, formatDate } from "@/lib/utils";
import api from "@/services/api";

export const Customers: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", search, segment],
    queryFn: async () => {
      const res = await api.get("/customers/", { params: { search, segment } });
      return res.data;
    },
  });

  // Fetch segment counts summary
  const { data: summary } = useQuery({
    queryKey: ["customersSummary"],
    queryFn: async () => {
      const res = await api.get("/customers/segments/summary");
      return res.data;
    },
  });

  // Create customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (newCustomer: any) => {
      const res = await api.post("/customers/", newCustomer);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customersSummary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardOverview"] });
      toast.success("Customer profile created successfully!");
      setShowAddModal(false);
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setNotes("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to create customer.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Customer name is required.");
      return;
    }

    addCustomerMutation.mutate({
      name,
      email,
      phone,
      address,
      notes,
    });
  };

  const columns = [
    { header: "Name", key: "name" },
    { header: "Email Address", key: "email" },
    { header: "Phone Number", key: "phone" },
    {
      header: "Segment Profile",
      key: "segment",
      render: (item: any) => {
        const val = item.segment;
        let colorClass = "bg-white/5 border-white/5 text-text-secondary";
        if (val === "vip") colorClass = "bg-warning/10 text-warning border-warning/15";
        else if (val === "regular") colorClass = "bg-accent/10 text-accent border-accent/15";
        else if (val === "new") colorClass = "bg-success/10 text-success border-success/15";
        else if (val === "at_risk") colorClass = "bg-danger/10 text-danger border-danger/15";

        return (
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border ${colorClass}`}>
            {val}
          </span>
        );
      },
    },
    {
      header: "Spent (INR)",
      key: "total_spent",
      render: (item: any) => (
        <span className="font-bold text-text-primary">{formatCurrency(Number(item.total_spent))}</span>
      ),
    },
    {
      header: "Orders Count",
      key: "total_orders",
      render: (item: any) => <span className="font-semibold">{item.total_orders}</span>,
    },
    {
      header: "Last Purchased",
      key: "last_interaction",
      render: (item: any) => (item.last_interaction ? formatDate(item.last_interaction) : "No purchases"),
    },
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              CRM Customer Base
            </h1>
            <p className="text-text-secondary text-sm">
              Manage client segments, track purchasing behaviors, and design loyalty channels
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2.5 px-4 rounded-lg cursor-pointer transition-all shadow-md hover:shadow-accent/15"
          >
            <UserPlus className="w-4 h-4" /> Add Customer
          </button>
        </div>

        {/* Customer Segment Summaries counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface/30 border border-white/5 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-success">New Segment</span>
            <span className="text-xl font-bold text-text-primary mt-1">{summary?.new || 0}</span>
          </div>
          <div className="bg-surface/30 border border-white/5 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Regular Segment</span>
            <span className="text-xl font-bold text-text-primary mt-1">{summary?.regular || 0}</span>
          </div>
          <div className="bg-surface/30 border border-white/5 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-warning">VIP Segment</span>
            <span className="text-xl font-bold text-text-primary mt-1">{summary?.vip || 0}</span>
          </div>
          <div className="bg-surface/30 border border-white/5 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-danger">At Risk Segment</span>
            <span className="text-xl font-bold text-text-primary mt-1">{summary?.at_risk || 0}</span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface/30 backdrop-blur-xl border border-white/5 focus:border-accent/40 text-xs text-text-primary pl-9 pr-4 py-2.5 rounded-lg outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Segment:</span>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="bg-surface/40 border border-white/5 rounded-lg text-xs text-text-primary py-1.5 px-3 outline-none"
            >
              <option value="">All Segments</option>
              <option value="new">New</option>
              <option value="regular">Regular</option>
              <option value="vip">VIP</option>
              <option value="at_risk">At Risk</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={customers}
          loading={isLoading}
          emptyMessage="No customer profiles logged."
        />

        {/* Add Customer Modal Dialog */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-base font-bold text-text-primary">Create Customer Profile</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-text-muted hover:text-text-secondary text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-text-secondary">Customer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Aarav Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2.5 px-3 rounded-lg outline-none text-text-primary"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-text-secondary">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2.5 px-3 rounded-lg outline-none text-text-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Phone Number</label>
                    <input
                      type="text"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2.5 px-3 rounded-lg outline-none text-text-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">City/State</label>
                    <input
                      type="text"
                      placeholder="Delhi, India"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2.5 px-3 rounded-lg outline-none text-text-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-text-secondary">Operational Notes</label>
                  <textarea
                    placeholder="Describe preferences, loyalties, or custom shipping guidelines..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-20 bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2.5 px-3 rounded-lg outline-none text-text-primary resize-none"
                  />
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
                    Save Profile
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

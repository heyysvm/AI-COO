import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

import PageWrapper from "@/components/shared/PageWrapper";
import DataTable from "@/components/shared/DataTable";
import { formatCurrency } from "@/lib/utils";
import api from "@/services/api";

export const Inventory: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reorderLevel, setReorderLevel] = useState("10");

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      const res = await api.get("/products/", { params: { search } });
      return res.data;
    },
  });

  // Fetch low-stock alert products
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["lowStockProducts"],
    queryFn: async () => {
      const res = await api.get("/products/low-stock");
      return res.data;
    },
  });

  // Create product mutation
  const addProductMutation = useMutation({
    mutationFn: async (newProduct: any) => {
      const res = await api.post("/products/", newProduct);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardOverview"] });
      queryClient.invalidateQueries({ queryKey: ["lowStockProducts"] });
      toast.success("Product successfully added to inventory!");
      setShowAddModal(false);
      // Reset form
      setName("");
      setSku("");
      setCategory("");
      setUnitPrice("");
      setCostPrice("");
      setQuantity("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to add product.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !unitPrice || !costPrice || !quantity) {
      toast.error("Please fill in all required fields.");
      return;
    }

    addProductMutation.mutate({
      name,
      sku,
      category,
      unit_price: parseFloat(unitPrice),
      cost_price: parseFloat(costPrice),
      quantity: parseInt(quantity),
      reorder_level: parseInt(reorderLevel),
    });
  };

  const columns = [
    { header: "Name", key: "name" },
    { header: "SKU", key: "sku" },
    { header: "Category", key: "category" },
    {
      header: "Sell Price",
      key: "unit_price",
      render: (item: any) => formatCurrency(Number(item.unit_price)),
    },
    {
      header: "Cost Price",
      key: "cost_price",
      render: (item: any) => formatCurrency(Number(item.cost_price)),
    },
    {
      header: "Stock Level",
      key: "quantity",
      render: (item: any) => {
        const val = item.quantity;
        return (
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full inline-block ${val <= item.reorder_level ? "bg-danger animate-pulse" : "bg-success"}`} />
            {val} {item.unit || "pcs"}
          </span>
        );
      },
    },
    {
      header: "Status",
      key: "quantity",
      render: (item: any) => {
        const val = item.quantity;
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
              val === 0
                ? "bg-danger/15 text-danger border border-danger/10"
                : val <= item.reorder_level
                ? "bg-warning/15 text-warning border border-warning/10"
                : "bg-success/15 text-success border border-success/10"
            }`}
          >
            {val === 0 ? "out of stock" : val <= item.reorder_level ? "low stock" : "in stock"}
          </span>
        );
      },
    },
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Inventory Log
            </h1>
            <p className="text-text-secondary text-sm">
              Manage stock levels, SKUs, sales and cost pricing parameters
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2.5 px-4 rounded-lg cursor-pointer transition-all shadow-md hover:shadow-accent/15"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Low Stock Banner Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-danger/10 border border-danger/25 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger mt-0.5 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-danger">Stock Alert warning</p>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                {lowStockItems.length} products have reached or fallen below minimum reorder levels. Restock soon to prevent supply disruption.
              </p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface/30 backdrop-blur-xl border border-white/5 focus:border-accent/40 text-xs text-text-primary pl-9 pr-4 py-2.5 rounded-lg outline-none transition-all"
          />
        </div>

        {/* Table data */}
        <DataTable
          columns={columns}
          data={products}
          loading={isLoading}
          emptyMessage="No products found in catalog. Add one or seed data."
        />

        {/* Add Product Modal Dialog */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-base font-bold text-text-primary">Add New Product</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-text-muted hover:text-text-secondary text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Product Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Olive Oil 1L"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2 px-3 rounded-lg outline-none text-text-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">SKU Code</label>
                    <input
                      type="text"
                      placeholder="e.g. OLI-OIL-01"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2 px-3 rounded-lg outline-none text-text-primary"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. grocery"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2 px-3 rounded-lg outline-none text-text-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Initial Quantity</label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2 px-3 rounded-lg outline-none text-text-primary"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Cost Price (COGS)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="200"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2 px-3 rounded-lg outline-none text-text-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Selling Price</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="280"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2 px-3 rounded-lg outline-none text-text-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary">Reorder Threshold</label>
                    <input
                      type="number"
                      value={reorderLevel}
                      onChange={(e) => setReorderLevel(e.target.value)}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2 px-3 rounded-lg outline-none text-text-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="bg-white/5 hover:bg-white/10 text-text-primary text-xs font-semibold py-2 px-4 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2 px-4 rounded-lg cursor-pointer"
                  >
                    Save Product
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

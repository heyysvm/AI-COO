import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import PageWrapper from "@/components/shared/PageWrapper";
import DataTable from "@/components/shared/DataTable";
import { formatCurrency, formatDate } from "@/lib/utils";
import api from "@/services/api";

export const Orders: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields for order creation
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const paymentMethod = "cash";
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");

  // Order Items
  const [orderItems, setOrderItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([]);

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: async () => {
      const res = await api.get("/orders/", { params: { status: statusFilter } });
      return res.data;
    },
  });

  // Fetch active products to choose from
  const { data: products = [] } = useQuery({
    queryKey: ["products-list-checkout"],
    queryFn: async () => {
      const res = await api.get("/products/");
      return res.data;
    },
  });

  // Fetch active customers to choose from
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list-checkout"],
    queryFn: async () => {
      const res = await api.get("/customers/");
      return res.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["ordersSummary"],
    queryFn: async () => {
      const res = await api.get("/orders/stats/summary");
      return res.data;
    },
  });

  // Create order mutation
  const addOrderMutation = useMutation({
    mutationFn: async (newOrder: any) => {
      const res = await api.post("/orders/", newOrder);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersSummary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardOverview"] });
      queryClient.invalidateQueries({ queryKey: ["products-list-checkout"] });
      toast.success("Order registered successfully!");
      setShowAddModal(false);
      // Reset
      setCustomerId("");
      setCustomerName("");
      setOrderItems([]);
      setDiscount("0");
      setTax("0");
      setNotes("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Order submission failed.");
    },
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, payment_status }: any) => {
      const res = await api.patch(`/orders/${id}`, { status, payment_status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersSummary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardOverview"] });
      toast.success("Order status updated successfully!");
    },
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      toast.error("Please add at least one product item to the order.");
      return;
    }

    addOrderMutation.mutate({
      customer_id: customerId || undefined,
      customer_name: customerId ? undefined : customerName || "Walk-in Customer",
      items: orderItems,
      discount: parseFloat(discount),
      tax: parseFloat(tax),
      payment_method: paymentMethod,
      notes,
    });
  };

  const handleAddItem = (productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    if (!product) return;

    // Check if item already added
    const existing = orderItems.find((item) => item.product_id === productId);
    if (existing) {
      setOrderItems(
        orderItems.map((item) =>
          item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        { product_id: productId, quantity: 1, unit_price: product.unit_price },
      ]);
    }
  };

  const handleRemoveItem = (productId: string) => {
    setOrderItems(orderItems.filter((item) => item.product_id !== productId));
  };

  const columns = [
    { header: "Order ID", key: "order_number" },
    { header: "Customer Name", key: "customer_name" },
    {
      header: "Total",
      key: "total_amount",
      render: (item: any) => <span className="font-bold">{formatCurrency(Number(item.total_amount))}</span>,
    },
    {
      header: "Checkout Status",
      key: "status",
      render: (item: any) => {
        const val = item.status;
        let color = "bg-warning/15 text-warning border-warning/10";
        if (val === "delivered") color = "bg-success/15 text-success border-success/10";
        else if (val === "cancelled") color = "bg-danger/15 text-danger border-danger/10";

        return (
          <select
            value={val}
            onChange={(e) => updateStatusMutation.mutate({ id: item.id, status: e.target.value })}
            className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full border ${color} outline-none cursor-pointer`}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        );
      },
    },
    {
      header: "Payment",
      key: "payment_status",
      render: (item: any) => {
        const val = item.payment_status;
        let color = "bg-warning/15 text-warning border-warning/10";
        if (val === "paid") color = "bg-success/15 text-success border-success/10";
        else if (val === "refunded") color = "bg-danger/15 text-danger border-danger/10";

        return (
          <select
            value={val}
            onChange={(e) => updateStatusMutation.mutate({ id: item.id, payment_status: e.target.value })}
            className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full border ${color} outline-none cursor-pointer`}
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="refunded">Refunded</option>
          </select>
        );
      },
    },
    { header: "Payment Method", key: "payment_method" },
    {
      header: "Order Date",
      key: "created_at",
      render: (item: any) => formatDate(item.created_at),
    },
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6">
        {/* Header section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Order Registry
            </h1>
            <p className="text-text-secondary text-sm">
              Log transactions, track shipping states, and update invoice payment properties
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2.5 px-4 rounded-lg cursor-pointer transition-all shadow-md hover:shadow-accent/15"
          >
            <Plus className="w-4 h-4" /> Create Order
          </button>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface/30 border border-white/5 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Total Orders</span>
            <span className="text-xl font-bold text-text-primary mt-1">{stats?.total_orders || 0}</span>
          </div>
          <div className="bg-surface/30 border border-white/5 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-success">Total Revenue</span>
            <span className="text-xl font-bold text-success mt-1">{formatCurrency(stats?.total_revenue || 0)}</span>
          </div>
          <div className="bg-surface/30 border border-white/5 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Average Order Value</span>
            <span className="text-xl font-bold text-text-primary mt-1">{formatCurrency(stats?.avg_order_value || 0)}</span>
          </div>
          <div className="bg-surface/30 border border-white/5 p-4 rounded-2xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-warning">Pending Shipments</span>
            <span className="text-xl font-bold text-text-primary mt-1">{stats?.status_counts?.pending || 0}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Fulfillment:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface/40 border border-white/5 rounded-lg text-xs text-text-primary py-1.5 px-3 outline-none"
          >
            <option value="">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table list */}
        <DataTable
          columns={columns}
          data={orders}
          loading={isLoading}
          emptyMessage="No orders registered."
        />

        {/* Create Order Checkout Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-base font-bold text-text-primary">Create Order (POS)</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-text-muted hover:text-text-secondary text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5 h-[480px]">
                {/* Product Selection List (Left Column) */}
                <div className="p-5 flex flex-col gap-4 overflow-y-auto">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Product Catalog</h4>
                  
                  <div className="flex flex-col gap-2">
                    {products.map((p: any) => (
                      <div
                        key={p.id}
                        onClick={() => handleAddItem(p.id)}
                        className="p-3 bg-[#0a0a0f]/60 hover:bg-surface border border-white/5 rounded-xl flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold text-text-primary">{p.name}</p>
                          <p className="text-[10px] text-text-secondary mt-0.5">SKU: {p.sku} | Qty: {p.quantity}</p>
                        </div>
                        <span className="text-xs font-bold text-accent">{formatCurrency(p.unit_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkout Basket & Details (Right Column) */}
                <form onSubmit={handleCreateOrder} className="p-5 flex flex-col gap-4 overflow-y-auto">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Order Items</h4>

                  {/* Basket list */}
                  <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[140px] pr-1">
                    {orderItems.length > 0 ? (
                      orderItems.map((item) => {
                        const prod = products.find((p: any) => p.id === item.product_id);
                        return (
                          <div
                            key={item.product_id}
                            className="p-2 bg-[#0a0a0f]/30 border border-white/5 rounded-lg flex justify-between items-center text-xs"
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-semibold text-text-primary truncate">{prod?.name}</p>
                              <p className="text-[10px] text-text-secondary mt-0.5">
                                {item.quantity} x {formatCurrency(item.unit_price)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.product_id)}
                              className="text-danger hover:underline text-[10px] ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-text-muted text-xs">
                        Basket is empty. Select products on the left.
                      </div>
                    )}
                  </div>

                  {/* Customer details */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block">Customer</label>
                    <select
                      value={customerId}
                      onChange={(e) => {
                        setCustomerId(e.target.value);
                        if (e.target.value) setCustomerName("");
                      }}
                      className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2 px-3 rounded-lg outline-none text-text-primary"
                    >
                      <option value="">Walk-in Customer</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.segment})
                        </option>
                      ))}
                    </select>

                    {!customerId && (
                      <input
                        type="text"
                        placeholder="Guest Customer Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-2 px-3 rounded-lg outline-none text-text-primary mt-1"
                      />
                    )}
                  </div>

                  {/* Checkout calculations */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block">Discount</label>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-1.5 px-3 rounded-lg outline-none text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block">GST Tax</label>
                      <input
                        type="number"
                        value={tax}
                        onChange={(e) => setTax(e.target.value)}
                        className="w-full bg-[#0a0a0f] border border-border focus:border-accent/40 text-xs py-1.5 px-3 rounded-lg outline-none text-text-primary"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-white/5 mt-auto">
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
                      Checkout Order
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

import React, { useState, useEffect } from "react";
import { X, Check, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/services/api";
import { PRODUCT_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/constants";

interface ScanVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanType: "product" | "customer" | "order" | "expense";
  extractedData: any;
  onSuccess: () => void;
}

export const ScanVerificationModal: React.FC<ScanVerificationModalProps> = ({
  isOpen,
  onClose,
  scanType,
  extractedData,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Form states
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    unit_price: 0,
    cost_price: 0,
    quantity: 0,
    reorder_level: 10,
  });

  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    segment: "new",
    notes: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    category: "Supplies",
    description: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    vendor: "",
  });

  const [orderForm, setOrderForm] = useState<{
    customer_id: string;
    customer_name: string;
    items: {
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
    }[];
    notes: string;
  }>({
    customer_id: "",
    customer_name: "",
    items: [],
    notes: "",
  });

  // Fetch helper lists on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchHelpers = async () => {
      try {
        if (scanType === "order") {
          const [prodRes, custRes] = await Promise.all([
            api.get("/products/"),
            api.get("/customers/"),
          ]);
          setProducts(prodRes.data);
          setCustomers(custRes.data);
        }
      } catch (err) {
        console.error("Failed to load helper data", err);
      }
    };
    fetchHelpers();
  }, [isOpen, scanType]);

  // Pre-populate forms based on extracted OCR data
  useEffect(() => {
    if (!isOpen || !extractedData) return;

    if (scanType === "product") {
      setProductForm({
        name: extractedData.name || "",
        sku: extractedData.sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
        category: extractedData.category || PRODUCT_CATEGORIES[0],
        description: extractedData.description || "",
        unit_price: extractedData.price || extractedData.unit_price || 0,
        cost_price: extractedData.cost || extractedData.cost_price || 0,
        quantity: extractedData.quantity || 0,
        reorder_level: extractedData.reorder_level || 10,
      });
    } else if (scanType === "customer") {
      setCustomerForm({
        name: extractedData.name || "",
        email: extractedData.email || "",
        phone: extractedData.phone || "",
        address: extractedData.address || "",
        segment: (extractedData.segment || "new").toLowerCase(),
        notes: extractedData.notes || "Added via smart scanner",
      });
    } else if (scanType === "expense") {
      setExpenseForm({
        category: extractedData.category || "Supplies",
        description: extractedData.description || "Scanned expense receipt",
        amount: extractedData.amount || 0,
        date: extractedData.date || new Date().toISOString().split("T")[0],
        vendor: extractedData.vendor || "",
      });
    } else if (scanType === "order") {
      // Map scanned items to database product IDs
      const rawItems = extractedData.products || [];
      const mappedItems = rawItems.map((ri: any) => {
        // Simple name matcher
        const matchedProduct = products.find((p) =>
          p.name.toLowerCase().includes((ri.product_name || "").toLowerCase())
        );
        return {
          product_id: matchedProduct?.id || "",
          product_name: matchedProduct?.name || ri.product_name || "",
          quantity: ri.quantity || 1,
          unit_price: ri.price || ri.unit_price || 0,
        };
      });

      // Simple customer matcher
      const matchedCustomer = customers.find((c) =>
        c.name.toLowerCase().includes((extractedData.customer_name || "").toLowerCase())
      );

      setOrderForm({
        customer_id: matchedCustomer?.id || "",
        customer_name: extractedData.customer_name || "",
        items: mappedItems,
        notes: extractedData.notes || "Order processed via invoice OCR scanner",
      });
    }
  }, [isOpen, extractedData, scanType, products, customers]);

  if (!isOpen) return null;

  // Handle Form submissions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (scanType === "product") {
        await api.post("/products/", productForm);
        toast.success("Product added successfully!");
      } else if (scanType === "customer") {
        await api.post("/customers/", customerForm);
        toast.success("Customer added successfully!");
      } else if (scanType === "expense") {
        await api.post("/expenses/", expenseForm);
        toast.success("Expense log added successfully!");
      } else if (scanType === "order") {
        // Validate that all items have matched product IDs
        const missingProductIds = orderForm.items.some((it) => !it.product_id);
        if (missingProductIds) {
          toast.error("Please match all items to existing products in the dropdown.");
          setLoading(false);
          return;
        }
        await api.post("/orders/", orderForm);
        toast.success("Order processed successfully!");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to add scanned entity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface/50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
            <h3 className="text-sm font-bold text-text-primary capitalize">
              Confirm Scanned {scanType} Data
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover border border-transparent hover:border-border rounded-lg text-text-secondary hover:text-text-primary transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-[11px] text-text-secondary leading-relaxed bg-accent/5 border border-accent/15 p-3 rounded-xl">
            Gemini has automatically classified this document and pre-filled the data fields below. Please verify and edit them for precision.
          </p>

          {/* Product Fields */}
          {scanType === "product" && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3 rounded-xl outline-none"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Unit Selling Price (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={productForm.unit_price}
                    onChange={(e) => setProductForm({ ...productForm, unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Cost Price (INR)</label>
                  <input
                    type="number"
                    step="0.01;0"
                    min="0"
                    required
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm({ ...productForm, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Available Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.quantity}
                    onChange={(e) => setProductForm({ ...productForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Reorder Threshold</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.reorder_level}
                    onChange={(e) => setProductForm({ ...productForm, reorder_level: parseInt(e.target.value) || 10 })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Product Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Customer Fields */}
          {scanType === "customer" && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Category Segment</label>
                  <select
                    value={customerForm.segment}
                    onChange={(e) => setCustomerForm({ ...customerForm, segment: e.target.value })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3 rounded-xl outline-none"
                  >
                    <option value="new">New Customer</option>
                    <option value="regular">Regular Buyer</option>
                    <option value="vip">VIP Buyer</option>
                    <option value="at_risk">At Risk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Street Address</label>
                  <input
                    type="text"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Special Notes / Bio</label>
                <textarea
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Expense Fields */}
          {scanType === "expense" && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Expense Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3 rounded-xl outline-none"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Amount Spent (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Supplier / Vendor</label>
                  <input
                    type="text"
                    value={expenseForm.vendor}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Expense Description</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Order Fields */}
          {scanType === "order" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Customer Selection</label>
                  <select
                    value={orderForm.customer_id}
                    onChange={(e) => {
                      const selected = customers.find((c) => c.id === e.target.value);
                      setOrderForm({
                        ...orderForm,
                        customer_id: e.target.value,
                        customer_name: selected?.name || "",
                      });
                    }}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3 rounded-xl outline-none"
                  >
                    <option value="">Select Existing Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Extracted Customer Name</label>
                  <input
                    type="text"
                    required
                    value={orderForm.customer_name}
                    onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                    className="w-full bg-background border border-border focus:border-accent/40 text-xs text-text-primary py-2.5 px-3.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Scanned Items List</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setOrderForm({
                        ...orderForm,
                        items: [
                          ...orderForm.items,
                          { product_id: "", product_name: "", quantity: 1, unit_price: 0 },
                        ],
                      })
                    }
                    className="flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/5 border border-accent/15 py-1 px-2.5 rounded-lg hover:bg-accent/10 transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                {orderForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface/50 border border-border rounded-xl flex flex-col md:flex-row gap-3 items-end"
                  >
                    <div className="flex-1 w-full">
                      <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">DB Product Match</label>
                      <select
                        required
                        value={item.product_id}
                        onChange={(e) => {
                          const matched = products.find((p) => p.id === e.target.value);
                          const updated = [...orderForm.items];
                          updated[idx] = {
                            ...updated[idx],
                            product_id: e.target.value,
                            product_name: matched?.name || "",
                            unit_price: matched?.unit_price || 0,
                          };
                          setOrderForm({ ...orderForm, items: updated });
                        }}
                        className="w-full bg-background border border-border text-[10px] text-text-primary py-1.5 px-2 rounded-lg outline-none"
                      >
                        <option value="">-- Match Database Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-20">
                      <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...orderForm.items];
                          updated[idx].quantity = parseInt(e.target.value) || 1;
                          setOrderForm({ ...orderForm, items: updated });
                        }}
                        className="w-full bg-background border border-border text-[10px] text-text-primary py-1.5 px-2 rounded-lg outline-none text-center"
                      />
                    </div>

                    <div className="w-24">
                      <label className="block text-[9px] font-bold text-text-muted uppercase mb-1">Price (INR)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={item.unit_price}
                        onChange={(e) => {
                          const updated = [...orderForm.items];
                          updated[idx].unit_price = parseFloat(e.target.value) || 0;
                          setOrderForm({ ...orderForm, items: updated });
                        }}
                        className="w-full bg-background border border-border text-[10px] text-text-primary py-1.5 px-2 rounded-lg outline-none text-center"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = orderForm.items.filter((_, i) => i !== idx);
                        setOrderForm({ ...orderForm, items: updated });
                      }}
                      className="p-2 border border-danger/10 hover:border-danger/30 text-danger bg-danger/5 hover:bg-danger/10 rounded-lg cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Subtotal calculation */}
                <div className="flex justify-between items-center pt-2 text-xs font-bold text-text-primary">
                  <span>Calculated Order Value:</span>
                  <span className="text-accent">
                    {(() => {
                      const total = orderForm.items.reduce(
                        (sum, item) => sum + item.quantity * item.unit_price,
                        0
                      );
                      return new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(total);
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer actions */}
        <div className="p-4 border-t border-border bg-surface/50 flex justify-end gap-3.5">
          <button
            type="button"
            onClick={onClose}
            className="bg-background border border-border hover:bg-surface-hover hover:border-text-muted text-text-primary font-semibold text-xs py-2.5 px-5 rounded-xl cursor-pointer transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white font-semibold text-xs py-2.5 px-5 rounded-xl cursor-pointer transition-all shadow-md disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Confirm & Save to Database
          </button>
        </div>
      </div>
    </div>
  );
};

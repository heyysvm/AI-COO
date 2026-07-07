// ─── Auth ───────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  business_name: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: string
  email: string
  full_name: string
  business_name: string
  role: string
  business_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Products ───────────────────────────────────────────
export interface Product {
  id: string
  name: string
  sku: string
  category: string
  description: string
  price: number
  cost_price: number
  quantity: number
  reorder_level: number
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateProductRequest {
  name: string
  sku: string
  category: string
  description?: string
  price: number
  cost_price?: number
  quantity: number
  reorder_level: number
  unit?: string
}

// ─── Customers ──────────────────────────────────────────
export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  segment: string
  total_spent: number
  total_orders: number
  last_interaction: string
  address: string
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateCustomerRequest {
  name: string
  email: string
  phone?: string
  segment?: string
  address?: string
  notes?: string
}

export interface CustomerSegmentSummary {
  segment: string
  count: number
  total_spent: number
}

// ─── Orders ─────────────────────────────────────────────
export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total: number
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  customer_name: string
  items: OrderItem[]
  total_amount: number
  status: string
  payment_status: string
  payment_method: string
  notes: string
  created_at: string
  updated_at: string
}

export interface CreateOrderRequest {
  customer_id: string
  items: {
    product_id: string
    quantity: number
    unit_price: number
  }[]
  payment_method?: string
  notes?: string
}

export interface OrderStatsSummary {
  total_orders: number
  total_revenue: number
  pending_orders: number
  processing_orders: number
  shipped_orders: number
  delivered_orders: number
  cancelled_orders: number
  average_order_value: number
}

// ─── Expenses ───────────────────────────────────────────
export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  vendor: string
  payment_method: string
  receipt_url: string
  notes: string
  is_recurring: boolean
  created_at: string
  updated_at: string
}

export interface CreateExpenseRequest {
  description: string
  amount: number
  category: string
  date?: string
  vendor?: string
  payment_method?: string
  notes?: string
  is_recurring?: boolean
}

export interface ExpenseStatsSummary {
  total_expenses: number
  this_month: number
  last_month: number
  by_category: { category: string; amount: number }[]
  monthly_trend: { month: string; amount: number }[]
}

// ─── Dashboard ──────────────────────────────────────────
export interface RevenueByMonth {
  month: string
  revenue: number
  expenses: number
}

export interface TopProduct {
  name: string
  revenue: number
  quantity_sold: number
}

export interface DashboardOverview {
  total_revenue: number
  total_expenses: number
  total_orders: number
  total_customers: number
  profit: number
  low_stock_count: number
  recent_orders: Order[]
  recent_expenses: Expense[]
  revenue_by_month: RevenueByMonth[]
  expenses_by_category: { category: string; amount: number }[]
  top_products: TopProduct[]
  customer_segments: CustomerSegmentSummary[]
  revenue_change: number
  expense_change: number
  order_change: number
  customer_change: number
}

// ─── Chat ───────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  reasoning?: string
  confidence?: number
  conversation_id: string
  timestamp: string
}

export interface ChatRequest {
  message: string
  conversation_id?: string
}

export interface ChatResponse {
  response: string
  agent: string
  reasoning: string
  confidence: number
  conversation_id: string
}

// ─── Generic ────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiError {
  detail: string
  status_code: number
}

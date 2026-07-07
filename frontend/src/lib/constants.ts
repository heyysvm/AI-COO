import {
  LayoutDashboard,
  Package,
  DollarSign,
  Users,
  ShoppingCart,
  MessageSquare,
  Settings,
  Mic,
  type LucideIcon,
} from 'lucide-react'

export const API_BASE_URL = '/api/v1'

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  INVENTORY: '/inventory',
  FINANCE: '/finance',
  CUSTOMERS: '/customers',
  ORDERS: '/orders',
  CHAT: '/chat',
  VOICE: '/voice-agent',
  SETTINGS: '/settings',
} as const

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Inventory', path: ROUTES.INVENTORY, icon: Package },
  { label: 'Finance', path: ROUTES.FINANCE, icon: DollarSign },
  { label: 'Customers', path: ROUTES.CUSTOMERS, icon: Users },
  { label: 'Orders', path: ROUTES.ORDERS, icon: ShoppingCart },
  { label: 'AI Chat', path: ROUTES.CHAT, icon: MessageSquare },
  { label: 'Voice COO', path: ROUTES.VOICE, icon: Mic },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
]

export const ROUTE_TITLES: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.INVENTORY]: 'Inventory Management',
  [ROUTES.FINANCE]: 'Financial Overview',
  [ROUTES.CUSTOMERS]: 'Customer Management',
  [ROUTES.ORDERS]: 'Order Management',
  [ROUTES.CHAT]: 'AI Assistant',
  [ROUTES.VOICE]: 'Voice Command Centre',
  [ROUTES.SETTINGS]: 'Settings',
}

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const

export const CUSTOMER_SEGMENTS = {
  VIP: 'VIP',
  REGULAR: 'Regular',
  NEW: 'New',
  AT_RISK: 'At Risk',
} as const

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Salaries',
  'Marketing',
  'Utilities',
  'Supplies',
  'Technology',
  'Travel',
  'Insurance',
  'Miscellaneous',
] as const

export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Food & Beverage',
  'Home & Garden',
  'Health & Beauty',
  'Sports',
  'Books',
  'Toys',
  'Automotive',
  'Other',
] as const

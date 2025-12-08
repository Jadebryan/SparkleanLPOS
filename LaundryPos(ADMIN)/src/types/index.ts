// User Types
export interface User {
  id: string
  username: string
  role: 'admin' | 'staff'
  name: string
}

// Order Types
export type OrderStatus = 'Pending' | 'In Progress' | 'Ready for Pickup' | 'Completed'
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partial'

export interface OrderItem {
  service: string
  quantity: string
  discount: string
  status: OrderStatus
  amount?: number
}

export interface Order {
  id: string
  date: string
  customer: string
  customerPhone?: string
  payment: PaymentStatus
  total: string
  items: OrderItem[]
  pickupDate?: string
  deliveryDate?: string
  notes?: string
  discount?: string
  paid?: number
  balance?: string
  change?: number
  creditedBy?: string
  isArchived?: boolean
  isDraft?: boolean
  isCompleted?: boolean
  scheduledDeleteAt?: string | null
  convertedOrderId?: string | null
  stationId?: string
  pointsEarned?: number
  pointsUsed?: number
  voucherId?: any
  voucherCode?: string
  voucherName?: string
  voucherType?: 'percentage' | 'fixed' | ''
  voucherAmountApplied?: number
  voucherMinPurchase?: number
  lastEditedBy?: {
    _id?: string
    username?: string
    email?: string
    fullName?: string
  }
  lastEditedAt?: string | Date
}

// Customer Types
export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  totalOrders: number
  totalSpent: number
  lastOrder: string
  points?: number
  isArchived?: boolean
  avatar?: string
  stationId?: string
}

// Employee Types
export type EmployeeStatus = 'Active' | 'Inactive'

export interface Employee {
  id: string
  name: string
  employeeId: string
  position: string
  department: string
  status: EmployeeStatus
  hireDate: string
  avatar?: string
  stationId?: string
}

// Service Types
export type ServiceCategory = 'Washing' | 'Dry Cleaning' | 'Ironing' | 'Special'
export type ServiceUnit = 'item' | 'kg' | 'flat'

export interface Service {
  id: string
  name: string
  category: ServiceCategory
  price: number
  unit: ServiceUnit
  isActive: boolean
  isPopular?: boolean
}

// Expense Types
export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected' | 'Appealed'
export type ExpenseCategory = 'Supplies' | 'Utilities' | 'Maintenance' | 'Salaries' | 'Other'

export interface ExpenseReceipt {
  image: string
  uploadedAt: string
}

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory
  description: string
  amount: number
  requestedBy: string
  status: ExpenseStatus
  approvedBy?: string
  receipt?: string
  images?: string[]
  receipts?: ExpenseReceipt[]
  stationId?: string
  adminFeedback?: string
  appealReason?: string
  appealedAt?: string
  appealImages?: string[]
}

// Report Types
export type ReportType = 'Orders' | 'Expenses' | 'Customers' | 'Revenue' | 'Employee' | 'Inventory'
export type ExportFormat = 'Excel' | 'PDF' | 'CSV'

export interface Report {
  id: string
  type: ReportType
  dateFrom: string
  dateTo: string
  generatedDate: string
  generatedBy: string
}

// Dashboard Stats
export interface DashboardStats {
  ordersToday: number
  revenueToday: number
  pendingOrders: number
  totalCustomers: number
}

// Station Types
export interface Station {
  _id?: string
  id?: string
  stationId: string
  name: string
  address?: string
  phone?: string
  isActive: boolean
  isArchived?: boolean
  notes?: string
}

// Backup Types
export interface Backup {
  name: string
  path: string
  timestamp: string
  database: string
  size: number
  sizeFormatted: string
}

export interface BackupStats {
  totalBackups: number
  totalSize: string
  oldestBackup: string | null
  newestBackup: string | null
  retentionDays: number
  backupDir: string
}

// Audit Log Types
export interface AuditLog {
  _id: string
  type: 'user_action' | 'system_event' | 'security_event'
  action: string
  userId?: string
  userEmail?: string
  userRole?: 'admin' | 'staff'
  resource?: string
  resourceId?: string
  method?: string
  endpoint?: string
  ipAddress?: string
  userAgent?: string
  details?: Record<string, any>
  status: 'success' | 'failure' | 'error'
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface AuditLogStats {
  totalLogs: number
  byType: {
    userActions: number
    systemEvents: number
    securityEvents: number
  }
  topActions: Array<{ _id: string; count: number }>
  topUsers: Array<{
    userId: string
    email?: string
    username?: string
    count: number
  }>
}


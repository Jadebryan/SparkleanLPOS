/**
 * Helper functions for direct data exports
 * Used by management pages (OrderManagement, CustomerManagement, etc.)
 */

import { ReportService } from './reportService'
import { ReportType, ExportFormat, DateRange } from './types'

/**
 * Export orders directly (from OrderManagement page)
 */
export async function exportOrdersDirect(
  orders: any[],
  format: ExportFormat,
  filename?: string,
  user?: { username?: string; role?: string }
): Promise<void> {
  if (!orders || orders.length === 0) {
    throw new Error('No orders to export')
  }

  // Calculate summary
  const summary = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => {
      const totalStr = order.total || '₱0'
      const numStr = totalStr.replace(/[₱,]/g, '')
      return sum + (parseFloat(numStr) || 0)
    }, 0).toFixed(2),
    paidOrders: orders.filter(o => o.payment === 'Paid').length,
    unpaidOrders: orders.filter(o => o.payment === 'Unpaid').length,
    partialOrders: orders.filter(o => o.payment === 'Partial').length
  }

  // Use current date range (all time for direct exports)
  const today = new Date().toISOString().split('T')[0]
  const dateRange: DateRange = { from: today, to: today }

  const result = await ReportService.generateReport(
    'orders',
    orders,
    summary,
    dateRange,
    user || { username: 'System', role: 'admin' },
    format,
    { filename }
  )

  if (!result.success) {
    throw new Error(result.error || 'Failed to export orders')
  }
}

/**
 * Export customers directly (from CustomerManagement page)
 */
export async function exportCustomersDirect(
  customers: any[],
  format: ExportFormat,
  filename?: string,
  user?: { username?: string; role?: string }
): Promise<void> {
  if (!customers || customers.length === 0) {
    throw new Error('No customers to export')
  }

  // Calculate summary
  const summary = {
    totalCustomers: customers.length,
    totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
    totalOrders: customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0),
    averageOrderValue: customers.length > 0
      ? (customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / 
         customers.reduce((sum, c) => sum + (c.totalOrders || 0), 1)).toFixed(2)
      : '0.00'
  }

  const today = new Date().toISOString().split('T')[0]
  const dateRange: DateRange = { from: today, to: today }

  const result = await ReportService.generateReport(
    'customers',
    customers,
    summary,
    dateRange,
    user || { username: 'System', role: 'admin' },
    format,
    { filename }
  )

  if (!result.success) {
    throw new Error(result.error || 'Failed to export customers')
  }
}

/**
 * Export employees directly (from EmployeeManagement page)
 */
export async function exportEmployeesDirect(
  employees: any[],
  format: ExportFormat,
  filename?: string,
  user?: { username?: string; role?: string }
): Promise<void> {
  if (!employees || employees.length === 0) {
    throw new Error('No employees to export')
  }

  // Calculate summary
  const summary = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'Active').length,
    inactiveEmployees: employees.filter(e => e.status === 'Inactive').length,
    totalRevenue: employees.reduce((sum, e) => sum + (parseFloat(e.totalRevenue) || 0), 0),
    totalOrdersProcessed: employees.reduce((sum, e) => sum + (e.ordersProcessed || 0), 0)
  }

  const today = new Date().toISOString().split('T')[0]
  const dateRange: DateRange = { from: today, to: today }

  const result = await ReportService.generateReport(
    'employee',
    employees,
    summary,
    dateRange,
    user || { username: 'System', role: 'admin' },
    format,
    { filename }
  )

  if (!result.success) {
    throw new Error(result.error || 'Failed to export employees')
  }
}


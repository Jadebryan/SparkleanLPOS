/**
 * Orders Report Formatter
 */

import { BaseFormatter } from './baseFormatter'

export class OrdersFormatter extends BaseFormatter {
  protected formatData(data: any, summary: any): any[] {
    if (!data || !Array.isArray(data)) return []
    
    return data.map((order: any) => ({
      'Order ID': order.id || order._id || '',
      Date: order.date || order.createdAt || '',
      Customer: order.customer || order.customerName || '',
      Payment: order.payment || order.paymentStatus || '',
      Total: this.formatCurrencyForExport(order.total),
      'Paid Amount': this.formatCurrencyForExport(order.paid || 0),
      Balance: this.formatCurrencyForExport(order.balance || 0),
      Services: this.formatServices(order.items),
      Status: this.formatItemStatuses(order.items),
      'Created By': this.formatStaffName(order.createdBy || order.createdByName || order.staffName),
      'Last Updated By': this.formatStaffName(order.lastEditedBy || order.updatedBy || order.lastUpdatedBy),
      Notes: order.notes || ''
    }))
  }

  protected getDefaultHeaders(): string[] {
    return [
      'Order ID',
      'Date',
      'Customer',
      'Payment',
      'Total',
      'Paid Amount',
      'Balance',
      'Services',
      'Status',
      'Created By',
      'Last Updated By',
      'Notes'
    ]
  }

  protected getSummaryFields(): string[] {
    return ['totalOrders', 'totalRevenue', 'paidOrders', 'unpaidOrders', 'partialOrders']
  }

  private formatServices(items: any[]): string {
    if (!Array.isArray(items) || items.length === 0) return ''
    return items.map((item: any) => `${item.service} (${item.quantity || 1})`).join('; ')
  }

  private formatItemStatuses(items: any[]): string {
    if (!Array.isArray(items) || items.length === 0) return ''
    return items.map((item: any) => item.status || '').join('; ')
  }

  private formatStaffName(staff: any): string {
    if (!staff) return ''
    if (typeof staff === 'string') return staff
    return staff.fullName || staff.name || staff.username || staff.email || ''
  }
}


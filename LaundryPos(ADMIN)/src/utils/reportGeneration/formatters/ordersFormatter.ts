/**
 * Orders Report Formatter
 */

import { BaseFormatter } from './baseFormatter'

export class OrdersFormatter extends BaseFormatter {
  protected formatData(data: any, summary: any): any[] {
    if (!data || !Array.isArray(data)) return []
    
    return data.map((order: any) => ({
      'Order ID': order.id || order._id || '',
      Date: order.date || '',
      Customer: order.customer || order.customerName || '',
      Payment: order.payment || order.paymentStatus || '',
      Total: this.formatCurrencyForExport(order.total),
      'Paid Amount': this.formatCurrencyForExport(order.paid || 0),
      Balance: this.formatCurrencyForExport(order.balance || 0),
      Services: this.formatServices(order.items),
      Status: this.formatItemStatuses(order.items),
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
}


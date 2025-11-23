/**
 * Revenue Report Formatter
 */

import { BaseFormatter } from './baseFormatter'

export class RevenueFormatter extends BaseFormatter {
  protected formatData(data: any, summary: any): any[] {
    if (!data || !Array.isArray(data)) return []
    
    return data.map((day: any) => ({
      Date: day.date || '',
      Revenue: this.formatCurrencyForExport(day.revenue || 0),
      Expenses: this.formatCurrencyForExport(day.expenses || 0),
      Profit: this.formatCurrencyForExport(day.profit || 0),
      Orders: day.orders || 0
    }))
  }

  protected getDefaultHeaders(): string[] {
    return [
      'Date',
      'Revenue',
      'Expenses',
      'Profit',
      'Orders'
    ]
  }

  protected getSummaryFields(): string[] {
    return ['totalRevenue', 'totalExpenses', 'netProfit', 'totalOrders']
  }
}


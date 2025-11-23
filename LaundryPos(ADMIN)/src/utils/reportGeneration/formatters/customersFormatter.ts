/**
 * Customers Report Formatter
 */

import { BaseFormatter } from './baseFormatter'

export class CustomersFormatter extends BaseFormatter {
  protected formatData(data: any, summary: any): any[] {
    if (!data || !Array.isArray(data)) return []
    
    return data.map((customer: any) => ({
      Name: customer.name || '',
      Email: customer.email || '',
      Phone: customer.phone || '',
      'Total Orders': customer.totalOrders || 0,
      'Total Spent': this.formatCurrencyForExport(customer.totalSpent || 0),
      'Last Order': customer.lastOrder || 'Never',
      'Average Order Value': this.formatCurrencyForExport(
        customer.totalOrders > 0 
          ? (customer.totalSpent / customer.totalOrders) 
          : 0
      )
    }))
  }

  protected getDefaultHeaders(): string[] {
    return [
      'Name',
      'Email',
      'Phone',
      'Total Orders',
      'Total Spent',
      'Last Order',
      'Average Order Value'
    ]
  }

  protected getSummaryFields(): string[] {
    return ['totalCustomers', 'totalRevenue', 'averageOrderValue']
  }
}


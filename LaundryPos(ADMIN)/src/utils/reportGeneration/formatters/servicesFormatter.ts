/**
 * Services Report Formatter
 */

import { BaseFormatter } from './baseFormatter'

export class ServicesFormatter extends BaseFormatter {
  protected formatData(data: any, summary: any): any[] {
    if (!data || !Array.isArray(data)) return []
    
    return data.map((service: any) => ({
      Name: service.name || '',
      Category: service.category || '',
      Price: this.formatCurrencyForExport(service.price || 0),
      Unit: service.unit || '',
      'Usage Count': service.usageCount || 0,
      'Total Revenue': this.formatCurrencyForExport(service.totalRevenue || 0),
      'Is Popular': service.isPopular ? 'Yes' : 'No',
      'Is Active': service.isActive !== false ? 'Yes' : 'No'
    }))
  }

  protected getDefaultHeaders(): string[] {
    return [
      'Name',
      'Category',
      'Price',
      'Unit',
      'Usage Count',
      'Total Revenue',
      'Is Popular',
      'Is Active'
    ]
  }

  protected getSummaryFields(): string[] {
    return ['totalServices', 'totalRevenue', 'activeServices', 'popularServices']
  }
}


/**
 * Sales per Branch Report Formatter
 */

import { BaseFormatter } from './baseFormatter'

export class SalesPerBranchFormatter extends BaseFormatter {
  protected formatData(data: any, summary: any): any[] {
    if (!data || !Array.isArray(data)) return []
    
    return data.map((branch: any) => ({
      'Branch ID': branch.stationId || '',
      'Branch Name': branch.stationName || '',
      'Total Revenue': this.formatCurrencyForExport(branch.totalRevenue || 0),
      'Total Orders': branch.totalOrders || 0,
      'Paid Orders': branch.paidOrders || 0,
      'Unpaid Orders': branch.unpaidOrders || 0,
      'Partial Orders': branch.partialOrders || 0
    }))
  }

  protected getDefaultHeaders(): string[] {
    return [
      'Branch ID',
      'Branch Name',
      'Total Revenue',
      'Total Orders',
      'Paid Orders',
      'Unpaid Orders',
      'Partial Orders'
    ]
  }

  protected getSummaryFields(): string[] {
    return ['totalBranches', 'totalRevenue', 'totalOrders', 'averageRevenuePerBranch']
  }
}


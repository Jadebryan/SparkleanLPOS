/**
 * Cashflow per Branch Report Formatter
 */

import { BaseFormatter } from './baseFormatter'

export class CashflowPerBranchFormatter extends BaseFormatter {
  protected formatData(data: any, summary: any): any[] {
    if (!data || !Array.isArray(data)) return []
    
    return data.map((branch: any) => ({
      'Branch ID': branch.stationId || '',
      'Branch Name': branch.stationName || '',
      Revenue: this.formatCurrencyForExport(branch.revenue || 0),
      Expenses: this.formatCurrencyForExport(branch.expenses || 0),
      'Net Cashflow': this.formatCurrencyForExport(branch.netCashflow || 0)
    }))
  }

  protected getDefaultHeaders(): string[] {
    return [
      'Branch ID',
      'Branch Name',
      'Revenue',
      'Expenses',
      'Net Cashflow'
    ]
  }

  protected getSummaryFields(): string[] {
    return ['totalBranches', 'totalRevenue', 'totalExpenses', 'netCashflow']
  }
}


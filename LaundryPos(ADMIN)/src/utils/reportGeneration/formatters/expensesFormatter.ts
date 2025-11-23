/**
 * Expenses Report Formatter
 */

import { BaseFormatter } from './baseFormatter'

export class ExpensesFormatter extends BaseFormatter {
  protected formatData(data: any, summary: any): any[] {
    if (!data || !Array.isArray(data)) return []
    
    return data.map((expense: any) => ({
      Date: expense.date || '',
      Category: expense.category || '',
      Description: expense.description || '',
      Amount: this.formatCurrencyForExport(expense.amount || 0),
      Status: expense.status || '',
      'Requested By': expense.requestedBy || expense.requestedByName || '',
      'Approved By': expense.approvedBy || expense.approvedByName || 'N/A'
    }))
  }

  protected getDefaultHeaders(): string[] {
    return [
      'Date',
      'Category',
      'Description',
      'Amount',
      'Status',
      'Requested By',
      'Approved By'
    ]
  }

  protected getSummaryFields(): string[] {
    return ['totalExpenses', 'totalAmount', 'approvedExpenses', 'pendingExpenses']
  }
}


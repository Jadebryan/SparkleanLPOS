/**
 * Employee Report Formatter
 */

import { BaseFormatter } from './baseFormatter'

export class EmployeeFormatter extends BaseFormatter {
  protected formatData(data: any, summary: any): any[] {
    if (!data || !Array.isArray(data)) return []
    
    return data.map((employee: any) => ({
      Name: employee.name || '',
      'Employee ID': employee.employeeId || '',
      Position: employee.position || '',
      Department: employee.department || '',
      'Orders Processed': employee.ordersProcessed || 0,
      'Total Revenue': this.formatCurrencyForExport(employee.totalRevenue || 0),
      'Account Status': employee.accountStatus || '',
      'Last Login': employee.lastLogin || 'Never',
      Attendance: employee.attendance ? `${employee.attendance}%` : 'N/A'
    }))
  }

  protected getDefaultHeaders(): string[] {
    return [
      'Name',
      'Employee ID',
      'Position',
      'Department',
      'Orders Processed',
      'Total Revenue',
      'Account Status',
      'Last Login',
      'Attendance'
    ]
  }

  protected getSummaryFields(): string[] {
    return ['totalEmployees', 'activeEmployees', 'totalRevenue', 'averageOrdersPerEmployee']
  }
}


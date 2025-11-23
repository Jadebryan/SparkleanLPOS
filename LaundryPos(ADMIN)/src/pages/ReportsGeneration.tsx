import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiDownload, FiCalendar, FiFileText, FiX, FiCheck, FiBarChart2, FiPieChart, FiTrendingUp, FiUsers, FiPackage, FiDollarSign, FiArchive, FiEye } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import { reportAPI } from '../utils/api'
import { useUser } from '../context/UserContext'
import { 
  exportToCSV, 
  exportToExcel, 
  exportToPDF,
  exportDataToCSV,
  exportDataToExcel,
  exportDataToPDF,
  previewDataAsPDF
} from '../utils/exportUtils'
import { exportReport, previewReport } from '../utils/reportGeneration/compatibility'
import { ReportType, ExportFormat } from '../utils/reportGeneration/types'
import './ReportsGeneration.css'

interface ReportType {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  color: 'blue' | 'orange' | 'green' | 'purple' | 'pink' | 'cyan'
}

interface GeneratedReport {
  id: string
  type: string
  name: string
  dateRange: string
  generatedDate: string
  format: string
}

interface ReportMeta {
  trackingId: string
  generatedBy: string
  digitalSignature: string
  dateRange: string
}

const reportTypes: ReportType[] = [
  {
    id: 'orders',
    icon: <FiBarChart2 size={32} />,
    title: 'Orders Report',
    description: 'Comprehensive order history, status, payments, and delivery dates',
    color: 'orange'
  },
  {
    id: 'revenue',
    icon: <span style={{fontSize: '32px', fontWeight: 'bold'}}>₱</span>,
    title: 'Revenue Report',
    description: 'Financial overview including revenue, expenses, and profit margins',
    color: 'green'
  },
  {
    id: 'customers',
    icon: <FiUsers size={32} />,
    title: 'Customers Report',
    description: 'Customer analytics, spending patterns, and retention metrics',
    color: 'purple'
  },
  {
    id: 'expenses',
    icon: <FiTrendingUp size={32} />,
    title: 'Expenses Report',
    description: 'Business expenses categorized by type and approval status',
    color: 'pink'
  },
  {
    id: 'services',
    icon: <FiPieChart size={32} />,
    title: 'Services Report',
    description: 'Service performance, popularity, and revenue breakdown',
    color: 'cyan'
  },
  {
    id: 'employee',
    icon: <FiPackage size={32} />,
    title: 'Employee Report',
    description: 'Staff performance metrics and activity tracking',
    color: 'blue'
  },
  {
    id: 'sales-per-branch',
    icon: <FiBarChart2 size={32} />,
    title: 'Sales per Branch',
    description: 'Sales performance and revenue breakdown by branch location',
    color: 'orange'
  },
  {
    id: 'cashflow-per-branch',
    icon: <FiDollarSign size={32} />,
    title: 'Cashflow per Branch',
    description: 'Complete cashflow analysis including revenue and expenses per branch',
    color: 'green'
  },
]

const ReportsGeneration: React.FC = () => {
  const { user } = useUser()
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exportFormat, setExportFormat] = useState('PDF')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [generatedReportData, setGeneratedReportData] = useState<any>(null)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [showExcelCsvPreview, setShowExcelCsvPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [recentReports, setRecentReports] = useState<Array<{
    id: string
    reportId: string
    reportTitle: string
    dateFrom: string
    dateTo: string
    generatedAt: string
    data: any
    meta?: ReportMeta
  }>>([])
  const [activeReportMeta, setActiveReportMeta] = useState<ReportMeta | null>(null)

  // Load recent reports from localStorage on mount
  useEffect(() => {
    try {
      const savedReports = localStorage.getItem('recentReports')
      if (savedReports) {
        const parsed = JSON.parse(savedReports)
        // Filter out reports older than 30 days to prevent localStorage bloat
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const filtered = parsed.filter((report: any) => {
          const reportDate = new Date(report.generatedAt)
          return reportDate >= thirtyDaysAgo
        })
        if (filtered.length !== parsed.length) {
          // Update localStorage if we filtered out old reports
          localStorage.setItem('recentReports', JSON.stringify(filtered))
        }
        setRecentReports(filtered)
      }
    } catch (error) {
      console.error('Error loading recent reports from localStorage:', error)
      // Clear corrupted data
      localStorage.removeItem('recentReports')
    }
  }, [])

  // Save recent reports to localStorage whenever they change
  useEffect(() => {
    try {
      if (recentReports.length > 0) {
        localStorage.setItem('recentReports', JSON.stringify(recentReports))
      } else {
        // Remove from localStorage if empty
        localStorage.removeItem('recentReports')
      }
    } catch (error) {
      console.error('Error saving recent reports to localStorage:', error)
      // If localStorage is full, try to remove oldest reports
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        const trimmed = recentReports.slice(0, 5) // Keep only 5 most recent
        try {
          localStorage.setItem('recentReports', JSON.stringify(trimmed))
          setRecentReports(trimmed)
          toast.error('Storage limit reached. Only showing 5 most recent reports.')
        } catch (e) {
          console.error('Failed to save trimmed reports:', e)
        }
      }
    }
  }, [recentReports])

  const createReportMeta = (rangeLabel: string): ReportMeta => {
    const actor = user?.username ? `${user.username}${user.role ? ` (${user.role})` : ''}` : 'Sparklean Admin'
    const timestamp = new Date().toLocaleString()
    return {
      trackingId: `SPKLN-${Date.now().toString(36).toUpperCase()}`,
      generatedBy: actor,
      digitalSignature: `Digitally signed by ${actor} on ${timestamp}`,
      dateRange: rangeLabel
    }
  }

  const getPdfMeta = (rangeLabel?: string) => {
    if (activeReportMeta) return activeReportMeta
    const fallbackRange = rangeLabel || `${dateFrom} → ${dateTo}`
    const fallbackMeta = createReportMeta(fallbackRange)
    setActiveReportMeta(fallbackMeta)
    return fallbackMeta
  }

  const handleGenerateReport = async (reportId: string) => {
    if (!dateFrom || !dateTo) {
      toast.error('Please select date range first')
      return
    }

    setIsGenerating(true)
    setSelectedReport(reportId)

    try {
      // Call API to generate report
      const reportData = await reportAPI.generate(reportId, dateFrom, dateTo)
      setGeneratedReportData(reportData)
      const rangeLabel = `${dateFrom} → ${dateTo}`
      const meta = createReportMeta(rangeLabel)
      setActiveReportMeta(meta)
      
      // Add to recent reports
      const reportTitle = reportTypes.find(r => r.id === reportId)?.title || 'Report'
      const newReport = {
        id: `${reportId}-${Date.now()}`,
        reportId: reportId,
        reportTitle: reportTitle,
        dateFrom: dateFrom,
        dateTo: dateTo,
        generatedAt: new Date().toISOString(),
        data: reportData,
        meta
      }
      
      setRecentReports(prev => {
        // Add new report at the beginning and limit to last 10
        const updated = [newReport, ...prev.filter(r => r.id !== newReport.id)]
        return updated.slice(0, 10)
      })
      
      setIsGenerating(false)
      toast.success(`${reportTitle} generated successfully!`)
      setShowPreview(true)
    } catch (error: any) {
      console.error('Error generating report:', error)
      setIsGenerating(false)
      toast.error(error.message || 'Failed to generate report')
    }
  }
  
  const handleLoadRecentReport = (report: typeof recentReports[0]) => {
    setSelectedReport(report.reportId)
    setDateFrom(report.dateFrom)
    setDateTo(report.dateTo)
    setGeneratedReportData(report.data)
    if (report.meta) {
      setActiveReportMeta(report.meta)
    } else {
      setActiveReportMeta(createReportMeta(`${report.dateFrom} → ${report.dateTo}`))
    }
    setShowPreview(true)
  }

  const generatePdfPreview = async (): Promise<string> => {
    if (!generatedReportData || !selectedReport) {
      throw new Error('No report data available')
    }

    // Try new system first
    try {
      return await previewReport(
        selectedReport as ReportType,
        generatedReportData,
        dateFrom,
        dateTo,
        'PDF' as ExportFormat,
        { username: user?.username, role: user?.role }
      )
    } catch (error: any) {
      // Fallback to old system
      console.warn('New preview system failed, using fallback:', error)
    }

    // Fallback to old system
    const reportTitle = reportTypes.find(r => r.id === selectedReport)?.title || 'Report'
    const dateRangeStr = `${dateFrom}_to_${dateTo}`
    const filename = `${reportTitle.replace(/\s+/g, '_')}_${dateRangeStr}`
    const pdfMeta = getPdfMeta(`${dateFrom} → ${dateTo}`)

    // Helper to replace ₱ with PHP for Excel compatibility
    const formatCurrency = (value: string | number) => {
      if (typeof value === 'string' && value.includes('₱')) {
        return value.replace('₱', 'PHP ')
      }
      if (typeof value === 'number') {
        return `PHP ${value.toFixed(2)}`
      }
      return typeof value === 'string' ? value : `PHP ${(parseFloat(String(value)) || 0).toFixed(2)}`
    }

    // Transform report data based on type (same logic as handleDownload)
    switch (selectedReport) {
      case 'orders':
        if (!generatedReportData.orders || generatedReportData.orders.length === 0) {
          throw new Error('No orders data to export')
        }
        
        const ordersForExport = generatedReportData.orders.map((o: any) => ({
          'Order ID': o.id,
          Date: o.date,
          Customer: o.customer,
          'Customer Phone': o.customerPhone || '',
          Payment: o.payment,
          Total: formatCurrency(o.total),
          Paid: typeof o.paid === 'number' ? `PHP ${o.paid.toFixed(2)}` : formatCurrency(o.paid || 0),
          Balance: formatCurrency(o.balance || 0),
          Services: (Array.isArray(o.items) ? o.items : []).map((item: any) => `${item.service} (${item.quantity})`).join('; '),
          Status: (Array.isArray(o.items) ? o.items : []).map((item: any) => item.status).join('; '),
          Notes: o.notes || ''
        }))
        
        return await previewDataAsPDF(ordersForExport, generatedReportData.summary, 'Orders Report', pdfMeta)

      case 'customers':
        const customersForExport = generatedReportData.allCustomers || generatedReportData.topCustomers || []
        if (customersForExport.length === 0) {
          throw new Error('No customers data to export')
        }
        
        const customerData = customersForExport.map((c: any) => ({
          Name: c.name || '',
          Email: c.email || '',
          Phone: c.phone || '',
          'Total Orders': c.totalOrders || 0,
          'Total Spent': typeof c.totalSpent === 'string' && c.totalSpent.includes('₱')
            ? c.totalSpent.replace('₱', 'PHP ')
            : `PHP ${(parseFloat(c.totalSpent) || 0).toFixed(2)}`,
          'Last Order': c.lastOrder || 'Never'
        }))
        
        return await previewDataAsPDF(customerData, generatedReportData.summary, 'Customers Report', pdfMeta)

      case 'expenses':
        const expensesForExport = generatedReportData.expenses || []
        if (expensesForExport.length === 0) {
          throw new Error('No expenses data to export')
        }
        
        const expenseData = expensesForExport.map((e: any) => ({
          Date: e.date || '',
          Category: e.category || '',
          Description: e.description || '',
          Amount: `PHP ${(e.amount || 0).toFixed(2)}`,
          Status: e.status || '',
          'Requested By': e.requestedBy || '',
          'Approved By': e.approvedBy || 'N/A'
        }))
        
        return await previewDataAsPDF(expenseData, generatedReportData.summary, 'Expenses Report', pdfMeta)

      case 'services':
        const servicesForExport = generatedReportData.services || []
        if (servicesForExport.length === 0) {
          throw new Error('No services data to export')
        }
        
        const serviceData = servicesForExport.map((s: any) => ({
          Name: s.name || '',
          Category: s.category || '',
          Price: `PHP ${(s.price || 0).toFixed(2)}`,
          Unit: s.unit || '',
          'Usage Count': s.usageCount || 0,
          'Total Revenue': `PHP ${(parseFloat(s.totalRevenue) || 0).toFixed(2)}`,
          'Is Popular': s.isPopular ? 'Yes' : 'No',
          'Is Active': s.isActive ? 'Yes' : 'No'
        }))
        
        return await previewDataAsPDF(serviceData, generatedReportData.summary, 'Services Report', pdfMeta)

      case 'employee':
        const employeesForExport = generatedReportData.employees || []
        if (employeesForExport.length === 0) {
          throw new Error('No employees data to export')
        }
        
        const employeeData = employeesForExport.map((e: any) => ({
          Name: e.name || '',
          'Employee ID': e.employeeId || '',
          Position: e.position || '',
          Department: e.department || '',
          'Orders Processed': e.ordersProcessed || 0,
          'Total Revenue': `PHP ${(parseFloat(e.totalRevenue) || 0).toFixed(2)}`,
          'Account Status': e.accountStatus || '',
          'Last Login': e.lastLogin || 'Never',
          Attendance: e.attendance ? `${e.attendance}%` : 'N/A'
        }))
        
        return await previewDataAsPDF(employeeData, generatedReportData.summary, 'Employee Report', pdfMeta)

      case 'revenue':
        const revenueData: any[] = []
        
        if (generatedReportData.dailyBreakdown && Array.isArray(generatedReportData.dailyBreakdown)) {
          generatedReportData.dailyBreakdown.forEach((day: any) => {
            revenueData.push({
              Date: day.date || '',
              Revenue: `PHP ${(parseFloat(day.revenue) || 0).toFixed(2)}`,
              Expenses: `PHP ${(parseFloat(day.expenses) || 0).toFixed(2)}`,
              Profit: `PHP ${(parseFloat(day.profit) || 0).toFixed(2)}`,
              Orders: day.orders || 0
            })
          })
        }
        
        return await previewDataAsPDF(revenueData, generatedReportData.summary, 'Revenue Report', pdfMeta)

      case 'sales-per-branch':
        const salesPerBranchData: any[] = []
        
        if (generatedReportData.branches && Array.isArray(generatedReportData.branches)) {
          generatedReportData.branches.forEach((branch: any) => {
            salesPerBranchData.push({
              'Branch ID': branch.stationId || '',
              'Branch Name': branch.stationName || '',
              'Total Revenue': `PHP ${(parseFloat(branch.totalRevenue) || 0).toFixed(2)}`,
              'Total Orders': branch.totalOrders || 0,
              'Paid Orders': branch.paidOrders || 0,
              'Unpaid Orders': branch.unpaidOrders || 0,
              'Partial Orders': branch.partialOrders || 0
            })
          })
        }
        
        return await previewDataAsPDF(salesPerBranchData, generatedReportData.summary, 'Sales per Branch Report', pdfMeta)

      case 'cashflow-per-branch':
        const cashflowPerBranchData: any[] = []
        
        if (generatedReportData.branches && Array.isArray(generatedReportData.branches)) {
          generatedReportData.branches.forEach((branch: any) => {
            cashflowPerBranchData.push({
              'Branch ID': branch.stationId || '',
              'Branch Name': branch.stationName || '',
              'Revenue': `PHP ${(parseFloat(branch.revenue) || 0).toFixed(2)}`,
              'Expenses': `PHP ${(parseFloat(branch.expenses) || 0).toFixed(2)}`,
              'Net Cashflow': `PHP ${(parseFloat(branch.netCashflow) || 0).toFixed(2)}`
            })
          })
        }
        
        return await previewDataAsPDF(cashflowPerBranchData, generatedReportData.summary, 'Cashflow per Branch Report', pdfMeta)

      default:
        throw new Error('Unsupported report type for preview')
    }
  }

  const prepareDataForPreview = () => {
    if (!generatedReportData || !selectedReport) {
      return null
    }

    try {
      // Helper to replace ₱ with PHP for Excel compatibility
      const formatCurrency = (value: string | number) => {
        if (typeof value === 'string' && value.includes('₱')) {
          return value.replace('₱', 'PHP ')
        }
        if (typeof value === 'number') {
          return `PHP ${value.toFixed(2)}`
        }
        return typeof value === 'string' ? value : `PHP ${(parseFloat(String(value)) || 0).toFixed(2)}`
      }

      // Transform report data based on type (same as handleDownload)
      switch (selectedReport) {
        case 'orders':
          if (!generatedReportData.orders || generatedReportData.orders.length === 0) {
            return null
          }
          
          const ordersForPreview = generatedReportData.orders.map((o: any) => ({
            'Order ID': o.id,
            'Date': o.date,
            'Customer': o.customer,
            'Customer Phone': o.customerPhone || '',
            'Payment': o.payment,
            'Total': formatCurrency(o.total),
            'Paid': typeof o.paid === 'number' ? `PHP ${o.paid.toFixed(2)}` : formatCurrency(o.paid || 0),
            'Balance': formatCurrency(o.balance || 0),
            'Services': (Array.isArray(o.items) ? o.items : []).map((item: any) => `${item.service} (${item.quantity})`).join('; '),
            'Status': (Array.isArray(o.items) ? o.items : []).map((item: any) => item.status).join('; '),
            'Notes': o.notes || ''
          }))
          
          return {
            headers: ['Order ID', 'Date', 'Customer', 'Customer Phone', 'Payment', 'Total', 'Paid', 'Balance', 'Services', 'Status', 'Notes'],
            data: ordersForPreview
          }

        case 'customers':
          const customersForPreview = generatedReportData.allCustomers || generatedReportData.topCustomers || []
          if (customersForPreview.length === 0) {
            return null
          }
          
          const customerData = customersForPreview.map((c: any) => ({
            'Name': c.name || '',
            'Email': c.email || '',
            'Phone': c.phone || '',
            'Total Orders': c.totalOrders || 0,
            'Total Spent': typeof c.totalSpent === 'string' && c.totalSpent.includes('₱')
              ? c.totalSpent.replace('₱', 'PHP ')
              : `PHP ${(parseFloat(c.totalSpent) || 0).toFixed(2)}`,
            'Last Order': c.lastOrder || 'Never'
          }))
          
          return {
            headers: ['Name', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Last Order'],
            data: customerData
          }

        case 'expenses':
          const expensesForPreview = generatedReportData.expenses || []
          if (expensesForPreview.length === 0) {
            return null
          }
          
          const expenseData = expensesForPreview.map((e: any) => ({
            'Date': e.date || '',
            'Category': e.category || '',
            'Description': e.description || '',
            'Amount': `PHP ${(e.amount || 0).toFixed(2)}`,
            'Status': e.status || '',
            'Requested By': e.requestedBy || '',
            'Approved By': e.approvedBy || 'N/A'
          }))
          
          return {
            headers: ['Date', 'Category', 'Description', 'Amount', 'Status', 'Requested By', 'Approved By'],
            data: expenseData
          }

        case 'services':
          const servicesForPreview = generatedReportData.services || []
          if (servicesForPreview.length === 0) {
            return null
          }
          
          const serviceData = servicesForPreview.map((s: any) => ({
            'Name': s.name || '',
            'Category': s.category || '',
            'Price': `PHP ${(s.price || 0).toFixed(2)}`,
            'Unit': s.unit || '',
            'Usage Count': s.usageCount || 0,
            'Total Revenue': `PHP ${(parseFloat(s.totalRevenue) || 0).toFixed(2)}`,
            'Is Popular': s.isPopular ? 'Yes' : 'No',
            'Is Active': s.isActive ? 'Yes' : 'No'
          }))
          
          return {
            headers: ['Name', 'Category', 'Price', 'Unit', 'Usage Count', 'Total Revenue', 'Is Popular', 'Is Active'],
            data: serviceData
          }

        case 'employee':
          const employeesForPreview = generatedReportData.employees || []
          if (employeesForPreview.length === 0) {
            return null
          }
          
          const employeeData = employeesForPreview.map((e: any) => ({
            'Name': e.name || '',
            'Employee ID': e.employeeId || '',
            'Position': e.position || '',
            'Department': e.department || '',
            'Orders Processed': e.ordersProcessed || 0,
            'Total Revenue': `PHP ${(parseFloat(e.totalRevenue) || 0).toFixed(2)}`,
            'Account Status': e.accountStatus || '',
            'Last Login': e.lastLogin || 'Never',
            'Attendance': e.attendance ? `${e.attendance}%` : 'N/A'
          }))
          
          return {
            headers: ['Name', 'Employee ID', 'Position', 'Department', 'Orders Processed', 'Total Revenue', 'Account Status', 'Last Login', 'Attendance'],
            data: employeeData
          }

        case 'revenue':
          const revenueDataForPreview: any[] = []
          
          if (generatedReportData.dailyBreakdown && Array.isArray(generatedReportData.dailyBreakdown)) {
            generatedReportData.dailyBreakdown.forEach((day: any) => {
              revenueDataForPreview.push({
                'Date': day.date || '',
                'Revenue': `PHP ${(parseFloat(day.revenue) || 0).toFixed(2)}`,
                'Expenses': `PHP ${(parseFloat(day.expenses) || 0).toFixed(2)}`,
                'Profit': `PHP ${(parseFloat(day.profit) || 0).toFixed(2)}`,
                'Orders': day.orders || 0
              })
            })
          }
          
          if (revenueDataForPreview.length === 0) {
            return null
          }
          
          return {
            headers: ['Date', 'Revenue', 'Expenses', 'Profit', 'Orders'],
            data: revenueDataForPreview
          }

        case 'sales-per-branch':
          const salesPerBranchForPreview: any[] = []
          
          if (generatedReportData.branches && Array.isArray(generatedReportData.branches)) {
            generatedReportData.branches.forEach((branch: any) => {
              salesPerBranchForPreview.push({
                'Branch ID': branch.stationId || '',
                'Branch Name': branch.stationName || '',
                'Total Revenue': `PHP ${(parseFloat(branch.totalRevenue) || 0).toFixed(2)}`,
                'Total Orders': branch.totalOrders || 0,
                'Paid Orders': branch.paidOrders || 0,
                'Unpaid Orders': branch.unpaidOrders || 0,
                'Partial Orders': branch.partialOrders || 0
              })
            })
          }
          
          if (salesPerBranchForPreview.length === 0) {
            return null
          }
          
          return {
            headers: ['Branch ID', 'Branch Name', 'Total Revenue', 'Total Orders', 'Paid Orders', 'Unpaid Orders', 'Partial Orders'],
            data: salesPerBranchForPreview
          }

        case 'cashflow-per-branch':
          const cashflowPerBranchForPreview: any[] = []
          
          if (generatedReportData.branches && Array.isArray(generatedReportData.branches)) {
            generatedReportData.branches.forEach((branch: any) => {
              cashflowPerBranchForPreview.push({
                'Branch ID': branch.stationId || '',
                'Branch Name': branch.stationName || '',
                'Revenue': `PHP ${(parseFloat(branch.revenue) || 0).toFixed(2)}`,
                'Expenses': `PHP ${(parseFloat(branch.expenses) || 0).toFixed(2)}`,
                'Net Cashflow': `PHP ${(parseFloat(branch.netCashflow) || 0).toFixed(2)}`
              })
            })
          }
          
          if (cashflowPerBranchForPreview.length === 0) {
            return null
          }
          
          return {
            headers: ['Branch ID', 'Branch Name', 'Revenue', 'Expenses', 'Net Cashflow'],
            data: cashflowPerBranchForPreview
          }

        default:
          return null
      }
    } catch (error) {
      console.error('Error preparing preview data:', error)
      return null
    }
  }

  const handlePreviewExcelCsv = () => {
    const previewResult = prepareDataForPreview()
    if (!previewResult) {
      toast.error('No data available for preview')
      return
    }
    
    setPreviewHeaders(previewResult.headers)
    setPreviewData(previewResult.data)
    setShowExcelCsvPreview(true)
  }

  const handleDownload = async () => {
    if (!generatedReportData || !selectedReport) {
      toast.error('No report data available')
      return
    }

    try {
      const reportTitle = reportTypes.find(r => r.id === selectedReport)?.title || 'Report'
      const dateRangeStr = `${dateFrom}_to_${dateTo}`
      const filename = `${reportTitle.replace(/\s+/g, '_')}_${dateRangeStr}`

      // Use new report generation system
      try {
        await exportReport(
          selectedReport as ReportType,
          generatedReportData,
          dateFrom,
          dateTo,
          exportFormat as ExportFormat,
          { username: user?.username, role: user?.role },
          filename
        )
        toast.success(`Report downloaded as ${exportFormat}!`)
        return
      } catch (newSystemError: any) {
        // Fallback to old system if new system fails
        console.warn('New report system failed, using fallback:', newSystemError)
      }

      // Fallback to old system
      const pdfMeta = getPdfMeta(`${dateFrom} → ${dateTo}`)

      // Transform report data based on type
      switch (selectedReport) {
        case 'orders':
          if (!generatedReportData.orders || generatedReportData.orders.length === 0) {
            toast.error('No orders data to export')
            return
          }
          
          // Helper to replace ₱ with PHP for Excel compatibility
          const formatCurrency = (value: string | number) => {
            if (typeof value === 'string' && value.includes('₱')) {
              return value.replace('₱', 'PHP ')
            }
            if (typeof value === 'number') {
              return `PHP ${value.toFixed(2)}`
            }
            return typeof value === 'string' ? value : `PHP ${(parseFloat(String(value)) || 0).toFixed(2)}`
          }
          
          // For CSV/Excel we want the original order objects so that
          // the export utilities can compute Services/Status from items
          const originalOrders = generatedReportData.orders
          
          if (exportFormat === 'CSV') {
            exportToCSV(originalOrders as any, filename)
          } else if (exportFormat === 'Excel') {
            exportToExcel(originalOrders as any, filename)
          } else if (exportFormat === 'PDF') {
            const ordersForPdf = originalOrders.map((o: any) => ({
              'Order ID': o.id,
              Date: o.date,
              Customer: o.customer,
              Payment: o.payment,
              Total: typeof o.total === 'string' && o.total.includes('₱')
                ? o.total.replace('₱', 'PHP ')
                : `PHP ${(parseFloat(String(o.total).replace(/[₱,]/g, '')) || 0).toFixed(2)}`,
              'Paid Amount': typeof o.paid === 'number' ? `PHP ${o.paid.toFixed(2)}` : 'PHP 0.00',
              Balance: typeof o.balance === 'string' && o.balance.includes('₱')
                ? o.balance.replace('₱', 'PHP ')
                : `PHP ${(parseFloat(String(o.balance || '0').replace(/[₱,]/g, '')) || 0).toFixed(2)}`,
              Services: (Array.isArray(o.items) ? o.items : []).map((item: any) => `${item.service} (${item.quantity})`).join('; '),
              Status: (Array.isArray(o.items) ? o.items : []).map((item: any) => item.status).join('; '),
              Notes: o.notes || ''
            }))
            await exportDataToPDF(ordersForPdf, generatedReportData.summary, 'Orders Report', filename, true, pdfMeta)
          }
          break

        case 'customers':
          const customersForExport = generatedReportData.allCustomers || generatedReportData.topCustomers || []
          if (customersForExport.length === 0) {
            toast.error('No customers data to export')
            return
          }
          
          const customerHeaders = ['Name', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Last Order']
          const customerData = customersForExport.map((c: any) => ({
            Name: c.name || '',
            Email: c.email || '',
            Phone: c.phone || '',
            'Total Orders': c.totalOrders || 0,
            'Total Spent': typeof c.totalSpent === 'string' && c.totalSpent.includes('₱')
              ? c.totalSpent.replace('₱', 'PHP ')
              : `PHP ${(parseFloat(c.totalSpent) || 0).toFixed(2)}`,
            'Last Order': c.lastOrder || 'Never'
          }))
          
          if (exportFormat === 'CSV') {
            exportDataToCSV(customerData, customerHeaders, filename)
          } else if (exportFormat === 'Excel') {
            exportDataToExcel(customerData, customerHeaders, filename)
          } else if (exportFormat === 'PDF') {
            await exportDataToPDF(customerData, generatedReportData.summary, 'Customers Report', filename, true, pdfMeta)
          }
          break

        case 'expenses':
          const expensesForExport = generatedReportData.expenses || []
          if (expensesForExport.length === 0) {
            toast.error('No expenses data to export')
            return
          }
          
          const expenseHeaders = ['Date', 'Category', 'Description', 'Amount', 'Status', 'Requested By', 'Approved By']
          const expenseData = expensesForExport.map((e: any) => ({
            Date: e.date || '',
            Category: e.category || '',
            Description: e.description || '',
            Amount: `PHP ${(e.amount || 0).toFixed(2)}`,
            Status: e.status || '',
            'Requested By': e.requestedBy || '',
            'Approved By': e.approvedBy || 'N/A'
          }))
          
          if (exportFormat === 'CSV') {
            exportDataToCSV(expenseData, expenseHeaders, filename)
          } else if (exportFormat === 'Excel') {
            exportDataToExcel(expenseData, expenseHeaders, filename)
          } else if (exportFormat === 'PDF') {
            await exportDataToPDF(expenseData, generatedReportData.summary, 'Expenses Report', filename, true, pdfMeta)
          }
          break

        case 'services':
          const servicesForExport = generatedReportData.services || []
          if (servicesForExport.length === 0) {
            toast.error('No services data to export')
            return
          }
          
          const serviceHeaders = ['Name', 'Category', 'Price', 'Unit', 'Usage Count', 'Total Revenue', 'Is Popular', 'Is Active']
          const serviceData = servicesForExport.map((s: any) => ({
            Name: s.name || '',
            Category: s.category || '',
            Price: `PHP ${(s.price || 0).toFixed(2)}`,
            Unit: s.unit || '',
            'Usage Count': s.usageCount || 0,
            'Total Revenue': `PHP ${(parseFloat(s.totalRevenue) || 0).toFixed(2)}`,
            'Is Popular': s.isPopular ? 'Yes' : 'No',
            'Is Active': s.isActive ? 'Yes' : 'No'
          }))
          
          if (exportFormat === 'CSV') {
            exportDataToCSV(serviceData, serviceHeaders, filename)
          } else if (exportFormat === 'Excel') {
            exportDataToExcel(serviceData, serviceHeaders, filename)
          } else if (exportFormat === 'PDF') {
            await exportDataToPDF(serviceData, generatedReportData.summary, 'Services Report', filename, true, pdfMeta)
          }
          break

        case 'employee':
          const employeesForExport = generatedReportData.employees || []
          if (employeesForExport.length === 0) {
            toast.error('No employees data to export')
            return
          }
          
          const employeeHeaders = ['Name', 'Employee ID', 'Position', 'Department', 'Orders Processed', 'Total Revenue', 'Account Status', 'Last Login', 'Attendance']
          const employeeData = employeesForExport.map((e: any) => ({
            Name: e.name || '',
            'Employee ID': e.employeeId || '',
            Position: e.position || '',
            Department: e.department || '',
            'Orders Processed': e.ordersProcessed || 0,
            'Total Revenue': `PHP ${(parseFloat(e.totalRevenue) || 0).toFixed(2)}`,
            'Account Status': e.accountStatus || '',
            'Last Login': e.lastLogin || 'Never',
            Attendance: e.attendance ? `${e.attendance}%` : 'N/A'
          }))
          
          if (exportFormat === 'CSV') {
            exportDataToCSV(employeeData, employeeHeaders, filename)
          } else if (exportFormat === 'Excel') {
            exportDataToExcel(employeeData, employeeHeaders, filename)
          } else if (exportFormat === 'PDF') {
            await exportDataToPDF(employeeData, generatedReportData.summary, 'Employee Report', filename, true, pdfMeta)
          }
          break

        case 'revenue':
          // Revenue report - export summary and daily breakdown
          const revenueData: any[] = []
          
          // Add daily breakdown if available
          if (generatedReportData.dailyBreakdown && Array.isArray(generatedReportData.dailyBreakdown)) {
            generatedReportData.dailyBreakdown.forEach((day: any) => {
              revenueData.push({
                Date: day.date || '',
                Revenue: `PHP ${(parseFloat(day.revenue) || 0).toFixed(2)}`,
                Expenses: `PHP ${(parseFloat(day.expenses) || 0).toFixed(2)}`,
                Profit: `PHP ${(parseFloat(day.profit) || 0).toFixed(2)}`,
                Orders: day.orders || 0
              })
            })
          }
          
          if (exportFormat === 'CSV' && revenueData.length > 0) {
            exportDataToCSV(revenueData, ['Date', 'Revenue', 'Expenses', 'Profit', 'Orders'], filename)
          } else if (exportFormat === 'Excel' && revenueData.length > 0) {
            exportDataToExcel(revenueData, ['Date', 'Revenue', 'Expenses', 'Profit', 'Orders'], filename)
          } else if (exportFormat === 'PDF') {
            await exportDataToPDF(revenueData, generatedReportData.summary, 'Revenue Report', filename, true, pdfMeta)
          }
          break

        case 'sales-per-branch':
          const salesPerBranchExport: any[] = []
          
          if (generatedReportData.branches && Array.isArray(generatedReportData.branches)) {
            generatedReportData.branches.forEach((branch: any) => {
              salesPerBranchExport.push({
                'Branch ID': branch.stationId || '',
                'Branch Name': branch.stationName || '',
                'Total Revenue': `PHP ${(parseFloat(branch.totalRevenue) || 0).toFixed(2)}`,
                'Total Orders': branch.totalOrders || 0,
                'Paid Orders': branch.paidOrders || 0,
                'Unpaid Orders': branch.unpaidOrders || 0,
                'Partial Orders': branch.partialOrders || 0
              })
            })
          }
          
          if (salesPerBranchExport.length === 0) {
            toast.error('No sales data to export')
            return
          }
          
          const salesHeaders = ['Branch ID', 'Branch Name', 'Total Revenue', 'Total Orders', 'Paid Orders', 'Unpaid Orders', 'Partial Orders']
          
          if (exportFormat === 'CSV') {
            exportDataToCSV(salesPerBranchExport, salesHeaders, filename)
          } else if (exportFormat === 'Excel') {
            exportDataToExcel(salesPerBranchExport, salesHeaders, filename)
          } else if (exportFormat === 'PDF') {
            await exportDataToPDF(salesPerBranchExport, generatedReportData.summary, 'Sales per Branch Report', filename, true, pdfMeta)
          }
          break

        case 'cashflow-per-branch':
          const cashflowPerBranchExport: any[] = []
          
          if (generatedReportData.branches && Array.isArray(generatedReportData.branches)) {
            generatedReportData.branches.forEach((branch: any) => {
              cashflowPerBranchExport.push({
                'Branch ID': branch.stationId || '',
                'Branch Name': branch.stationName || '',
                'Revenue': `PHP ${(parseFloat(branch.revenue) || 0).toFixed(2)}`,
                'Expenses': `PHP ${(parseFloat(branch.expenses) || 0).toFixed(2)}`,
                'Net Cashflow': `PHP ${(parseFloat(branch.netCashflow) || 0).toFixed(2)}`
              })
            })
          }
          
          if (cashflowPerBranchExport.length === 0) {
            toast.error('No cashflow data to export')
            return
          }
          
          const cashflowHeaders = ['Branch ID', 'Branch Name', 'Revenue', 'Expenses', 'Net Cashflow']
          
          if (exportFormat === 'CSV') {
            exportDataToCSV(cashflowPerBranchExport, cashflowHeaders, filename)
          } else if (exportFormat === 'Excel') {
            exportDataToExcel(cashflowPerBranchExport, cashflowHeaders, filename)
          } else if (exportFormat === 'PDF') {
            await exportDataToPDF(cashflowPerBranchExport, generatedReportData.summary, 'Cashflow per Branch Report', filename, true, pdfMeta)
          }
          break
      }

      toast.success(`Report downloaded as ${exportFormat}!`)
    } catch (error: any) {
      console.error('Error downloading report:', error)
      if (error.message && error.message.includes('Text file created')) {
        toast.error('PDF generation failed. Text file created instead.')
      } else {
        toast.error(error.message || 'Failed to download report')
      }
    }
  }

  const handleQuickGenerate = (period: 'today' | 'week' | 'month') => {
    const today = new Date()
    const from = new Date()
    
    switch (period) {
      case 'today':
        setDateFrom(today.toISOString().split('T')[0])
        setDateTo(today.toISOString().split('T')[0])
        break
      case 'week':
        from.setDate(today.getDate() - 7)
        setDateFrom(from.toISOString().split('T')[0])
        setDateTo(today.toISOString().split('T')[0])
        break
      case 'month':
        from.setMonth(today.getMonth() - 1)
        setDateFrom(from.toISOString().split('T')[0])
        setDateTo(today.toISOString().split('T')[0])
        break
    }
    toast.success(`Date range set to ${period}`)
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="reports-management-wrapper"
      >
        {/* Header */}
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">📈 Reports Generation</h1>
            <p className="page-subtitle">Generate business analytics and insights</p>
          </div>
        </div>

        {/* Report Configuration */}
        <div className="report-config-card">
          <h3 className="config-title">⚙️ Report Configuration</h3>
          <div className="config-grid">
            <div className="config-group">
              <label><FiCalendar size={14} /> Date From</label>
              <input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="config-group">
              <label><FiCalendar size={14} /> Date To</label>
              <input 
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="config-group">
              <label><FiFileText size={14} /> Export Format</label>
              <select 
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="PDF">PDF (.pdf)</option>
                <option value="Excel">Excel (.xlsx)</option>
                <option value="CSV">CSV (.csv)</option>
              </select>
            </div>
          </div>

          <div className="quick-date-buttons">
            <span className="quick-label">Quick Select:</span>
            <button className="quick-btn" onClick={() => handleQuickGenerate('today')}>
              Today
            </button>
            <button className="quick-btn" onClick={() => handleQuickGenerate('week')}>
              Last 7 Days
            </button>
            <button className="quick-btn" onClick={() => handleQuickGenerate('month')}>
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Report Types Grid */}
        <div className="reports-section">
          <h3 className="section-title-reports">📊 Available Reports</h3>
          <div className="reports-grid">
            {reportTypes.map((report, index) => (
              <motion.div
                key={report.id}
                className={`report-type-card ${report.color}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -6, scale: 1.02 }}
              >
                <div className="report-card-icon">
                  {report.icon}
                </div>
                <h4 className="report-card-title">{report.title}</h4>
                <p className="report-card-description">{report.description}</p>
                
                <Button 
                  onClick={() => handleGenerateReport(report.id)}
                  className="generate-btn"
                  disabled={isGenerating}
                >
                  {isGenerating && selectedReport === report.id ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FiDownload />
                      <span>Generate</span>
                    </>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="recent-reports-section">
          <h3 className="section-title-reports">📚 Recent Reports</h3>
          <div className="recent-reports-list">
            {recentReports.length > 0 ? (
              recentReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  className="recent-report-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 4 }}
                  onClick={() => handleLoadRecentReport(report)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="report-item-icon">
                    <FiFileText size={24} />
                  </div>
                  <div className="report-item-info">
                    <h4 className="report-item-name">
                      {report.reportTitle} - {new Date(report.generatedAt).toLocaleDateString()}
                    </h4>
                    <div className="report-item-meta">
                      <span><FiCalendar size={12} /> {report.dateFrom} → {report.dateTo}</span>
                      <span>•</span>
                      <span><FiFileText size={12} /> {new Date(report.generatedAt).toLocaleTimeString()}</span>
                      {report.meta?.trackingId && (
                        <>
                          <span>•</span>
                          <span><FiArchive size={12} /> {report.meta.trackingId}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="report-item-actions">
                    <button 
                      className="btn-icon-small" 
                      title="View Report"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLoadRecentReport(report)
                      }}
                    >
                      <FiFileText />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="empty-reports-message">
                <FiFileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>No reports generated yet</p>
                <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '8px' }}>
                  Generate a report to see it here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preview Modal */}
        <AnimatePresence>
          {showPreview && selectedReport && (
            <div className="modal-overlay" onClick={() => setShowPreview(false)}>
              <motion.div
                className="modal-preview"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header success">
                  <div className="modal-title-container">
                    <div className="success-badge">
                      <FiCheck />
                    </div>
                    <div>
                      <h3 className="modal-title">Report Ready</h3>
                      <p className="modal-subtitle">Generated successfully</p>
                    </div>
                  </div>
                  <button className="btn-icon" onClick={() => setShowPreview(false)}>
                    <FiX />
                  </button>
                </div>

                <div className="modal-body preview-body">
                  <div className="preview-summary">
                    <h2 className="preview-title">{reportTypes.find(r => r.id === selectedReport)?.title}</h2>
                    <ul className="preview-meta">
                      <li><span className="meta-label">Date Range</span><span className="meta-value">{dateFrom} → {dateTo}</span></li>
                      <li><span className="meta-label">Format</span><span className="meta-badge">{exportFormat}</span></li>
                    </ul>
                  </div>

                  {generatedReportData && generatedReportData.summary && (
                    <div className="report-summary-preview">
                      <h4 className="summary-title">📊 Summary</h4>
                      <div className="summary-grid">
                        {Object.entries(generatedReportData.summary).map(([key, value]: [string, any]) => {
                          // Format the key for display
                          const formattedKey = key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .trim()
                          
                          // Format values appropriately
                          let formattedValue = value
                          if (typeof value === 'number') {
                            if (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('profit') || key.toLowerCase().includes('expense') || key.toLowerCase().includes('spent')) {
                              formattedValue = `₱${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            } else if (key.toLowerCase().includes('margin') || key.toLowerCase().includes('percentage') || key.toLowerCase().includes('attendance')) {
                              formattedValue = `${parseFloat(value).toFixed(2)}%`
                            } else {
                              formattedValue = value.toLocaleString()
                            }
                          }
                          
                          return (
                            <div key={key} className="summary-item">
                              <span className="summary-label">{formattedKey}</span>
                              <span className="summary-value">{formattedValue}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="download-actions">
                    {exportFormat === 'PDF' && (
                      <Button 
                        variant="secondary" 
                        onClick={async () => {
                          try {
                            setIsGenerating(true)
                            const pdfUrl = await generatePdfPreview()
                            setPdfPreviewUrl(pdfUrl)
                            setShowPdfPreview(true)
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to generate PDF preview')
                          } finally {
                            setIsGenerating(false)
                          }
                        }}
                        className="action-preview"
                        disabled={isGenerating}
                      >
                        <FiFileText /> Preview PDF
                      </Button>
                    )}
                    {(exportFormat === 'Excel' || exportFormat === 'CSV') && (
                      <Button 
                        variant="secondary" 
                        onClick={handlePreviewExcelCsv}
                        className="action-preview"
                      >
                        <FiEye /> Preview {exportFormat}
                      </Button>
                    )}
                    <Button onClick={handleDownload} className="action-primary" disabled={isGenerating}>
                      <FiDownload /> Download
                    </Button>
                    <Button variant="secondary" onClick={() => {
                      setShowPreview(false)
                      setGeneratedReportData(null)
                      if (pdfPreviewUrl) {
                        URL.revokeObjectURL(pdfPreviewUrl)
                        setPdfPreviewUrl(null)
                      }
                    }} className="action-secondary">
                      Close
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* PDF Preview Modal */}
        <AnimatePresence>
          {showPdfPreview && pdfPreviewUrl && (
            <div className="modal-overlay pdf-preview-overlay" onClick={() => {
              setShowPdfPreview(false)
              URL.revokeObjectURL(pdfPreviewUrl)
              setPdfPreviewUrl(null)
            }}>
              <motion.div
                className="modal-pdf-preview"
                initial={{ scale: 0.9, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 className="modal-title">PDF Preview</h3>
                  <div className="modal-header-actions">
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await handleDownload()
                          setShowPdfPreview(false)
                          setShowPreview(false)
                          if (pdfPreviewUrl) {
                            URL.revokeObjectURL(pdfPreviewUrl)
                            setPdfPreviewUrl(null)
                          }
                        } catch (error: any) {
                          toast.error(error.message || 'Failed to download')
                        }
                      }}
                    >
                      <FiDownload /> Download
                    </Button>
                    <button className="btn-icon" onClick={() => {
                      setShowPdfPreview(false)
                      URL.revokeObjectURL(pdfPreviewUrl)
                      setPdfPreviewUrl(null)
                    }}>
                      <FiX />
                    </button>
                  </div>
                </div>
                
                <div className="pdf-preview-container">
                  <iframe
                    src={pdfPreviewUrl}
                    className="pdf-preview-iframe"
                    title="PDF Preview"
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Excel/CSV Preview Modal */}
        <AnimatePresence>
          {showExcelCsvPreview && (
            <div className="modal-overlay" onClick={() => setShowExcelCsvPreview(false)}>
              <motion.div
                className="modal-large"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
              >
                <div className="modal-header">
                  <h3 className="modal-title">
                    Preview {exportFormat} Export ({previewData.length} rows)
                  </h3>
                  <button className="btn-icon" onClick={() => setShowExcelCsvPreview(false)}>
                    <FiX />
                  </button>
                </div>
                
                <div className="modal-body" style={{ overflow: 'auto', flex: 1, padding: '20px' }}>
                  <div className="preview-table-container" style={{ overflowX: 'auto', border: '1px solid var(--color-gray-300)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: 'var(--color-white)' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 1 }}>
                          {previewHeaders.map((header, idx) => (
                            <th 
                              key={idx}
                              style={{ 
                                padding: '12px', 
                                textAlign: 'left', 
                                border: '1px solid #ddd', 
                                fontWeight: 'bold',
                                fontSize: '13px',
                                color: '#333',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                            {previewHeaders.map((header, idx) => {
                              const cellValue = row[header] || ''
                              return (
                                <td 
                                  key={idx}
                                  style={{ 
                                    padding: '10px', 
                                    border: '1px solid #ddd',
                                    fontSize: '13px',
                                    color: '#555',
                                    maxWidth: '300px',
                                    wordBreak: 'break-word'
                                  }}
                                  title={typeof cellValue === 'string' && cellValue.length > 50 ? String(cellValue) : ''}
                                >
                                  {typeof cellValue === 'string' && cellValue.length > 100 
                                    ? `${cellValue.substring(0, 100)}...` 
                                    : String(cellValue)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {previewData.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      <FiFileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                      <p>No data available for preview</p>
                    </div>
                  )}
                </div>
                
                <div className="modal-footer">
                  <Button variant="secondary" onClick={() => setShowExcelCsvPreview(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setShowExcelCsvPreview(false)
                    handleDownload()
                  }}>
                    <FiDownload /> Export {exportFormat}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  )
}

export default ReportsGeneration

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPlus, FiEdit2, FiArchive, FiEye, FiX, FiCheck, FiXCircle, FiClock, FiDollarSign, FiCalendar, FiUser, FiFileText, FiEyeOff, FiRotateCcw, FiImage, FiFolder, FiRotateCw, FiMessageSquare, FiMapPin, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import ViewToggle, { ViewMode } from '../components/ViewToggle'
import { TableSkeleton, CardSkeleton } from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import { FilterChips } from '../components/FilterChip'
import { Expense } from '../types'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { expenseAPI } from '../utils/api'
import './ExpenseManagement.css'

const ExpenseManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('All Categories')
  const [filterStatus, setFilterStatus] = useState('All Status')
  const [filterStation, setFilterStation] = useState('All Stations')
  const [sortBy, setSortBy] = useState<'category' | 'station' | 'date'>('date')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('expenses-view-mode')
    return (saved === 'cards' || saved === 'list') ? saved : 'cards'
  })
  
  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('expenses-view-mode', viewMode)
  }, [viewMode])
  const [showArchived, setShowArchived] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    expense: Expense | null
    action: 'approve' | 'reject' | null
  }>({ isOpen: false, expense: null, action: null })
  const [feedbackDialog, setFeedbackDialog] = useState<{
    isOpen: boolean
    expense: Expense | null
    feedback: string
  }>({ isOpen: false, expense: null, feedback: '' })
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  
  // Expenses page stats visibility state
  const [hiddenSections, setHiddenSections] = useState<{
    stats: boolean
  }>(() => {
    const saved = localStorage.getItem('expenses-hidden-sections')
    return saved ? JSON.parse(saved) : {
      stats: false
    }
  })

  // Hidden categories state
  const [hiddenCategories, setHiddenCategories] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('expenses-hidden-categories')
    return saved ? JSON.parse(saved) : {}
  })

  // Keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 'f',
      ctrl: true,
      callback: () => {
        searchInputRef.current?.focus()
      }
    }
  ])

  // Save hidden sections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('expenses-hidden-sections', JSON.stringify(hiddenSections))
  }, [hiddenSections])

  // Save hidden categories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('expenses-hidden-categories', JSON.stringify(hiddenCategories))
  }, [hiddenCategories])

  const fetchExpenses = useCallback(async () => {
      setIsLoading(true)
      try {
        const data = await expenseAPI.getAll({ 
          category: filterCategory !== 'All Categories' ? filterCategory : undefined,
          status: filterStatus !== 'All Status' ? filterStatus : undefined,
          showArchived 
        })
        // Map backend data to frontend Expense interface
        const mappedExpenses: Expense[] = data.map((e: any) => {
          // Debug: Log receipts for troubleshooting
          if (e.receipts && e.receipts.length > 0) {
            console.log(`[Expense ${e._id || e.id}] Receipts found:`, e.receipts.length, e.receipts)
          }
          return {
            id: e._id || e.id,
            date: new Date(e.date).toLocaleDateString(),
            category: e.category,
            description: e.description,
            amount: e.amount,
            requestedBy: e.requestedBy?.username || e.requestedBy || 'Unknown',
            status: e.status,
            approvedBy: e.approvedBy?.username || e.approvedBy,
            receipt: e.receipt,
            images: e.images || [],
            receipts: e.receipts || [],
            isArchived: e.isArchived || false,
            stationId: e.stationId || e.requestedBy?.stationId || null,
            adminFeedback: e.adminFeedback || '',
            appealReason: e.appealReason || '',
            appealedAt: e.appealedAt || '',
            appealImages: e.appealImages || []
          }
        })
        setExpenses(mappedExpenses)
      } catch (error: any) {
        console.error('Error fetching expenses:', error)
        toast.error('Failed to load expenses')
      } finally {
        setIsLoading(false)
      }
  }, [filterCategory, filterStatus, showArchived])

  // Fetch on filters change
  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // Keyboard navigation for image viewer
  useEffect(() => {
    if (!imageViewerOpen || !selectedExpense) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const imagesCount = selectedExpense.images?.length || 0
      const receiptsCount = selectedExpense.receipts?.length || 0
      const appealImagesCount = selectedExpense.appealImages?.length || 0
      const totalImages = imagesCount + receiptsCount + appealImagesCount

      if (e.key === 'Escape') {
        setImageViewerOpen(false)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedImageIndex(prev => prev > 0 ? prev - 1 : totalImages - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedImageIndex(prev => prev < totalImages - 1 ? prev + 1 : 0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageViewerOpen, selectedExpense])

  // Live updates: refetch on relevant notification events via SSE
  useEffect(() => {
    try {
      const user = localStorage.getItem('user')
      const token = user ? (JSON.parse(user)?.token || '') : ''
      if (!token) return
      const baseUrl = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:5000/api'
      const es = new EventSource(`${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`)
      es.onmessage = (evt) => {
        try {
          const notif = JSON.parse(evt.data)
          // Trigger refresh on expense-related events
          const t = (notif?.type || '').toLowerCase()
          const title = (notif?.title || '').toLowerCase()
          if (
            t === 'expense' ||
            title.includes('expense') ||
            title.includes('receipt') ||
            title.includes('appeal')
          ) {
            // Clear cache before refreshing to ensure fresh data
            try {
              const cacheKeys = Object.keys(localStorage).filter(key => 
                key.includes('expenses') || key.includes('api_expenses')
              )
              cacheKeys.forEach(key => {
                // Remove both prefixed and non-prefixed cache keys
                localStorage.removeItem(key)
                localStorage.removeItem(`laundry_cache_${key}`)
              })
            } catch (e) {
              console.error('Error clearing cache:', e)
            }
            fetchExpenses()
          }
        } catch {}
      }
      es.onerror = () => { try { es.close() } catch {} }
      return () => { try { es.close() } catch {} }
    } catch {}
  }, [fetchExpenses])

  const toggleSection = (section: keyof typeof hiddenSections) => {
    setHiddenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const resetAllSections = () => {
    setHiddenSections({
      stats: false
    })
    setHiddenCategories({})
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      // Clear cache for expenses to ensure fresh data
      try {
        const cacheKeys = Object.keys(localStorage).filter(key => 
          key.includes('expenses') || key.includes('api_expenses')
        )
        cacheKeys.forEach(key => {
          // Remove both prefixed and non-prefixed cache keys
          localStorage.removeItem(key)
          localStorage.removeItem(`laundry_cache_${key}`)
        })
      } catch (e) {
        console.error('Error clearing cache:', e)
      }
      const data = await expenseAPI.getAll({ 
        category: filterCategory !== 'All Categories' ? filterCategory : undefined,
        status: filterStatus !== 'All Status' ? filterStatus : undefined,
        showArchived 
      })
      // Map backend data to frontend Expense interface
      const mappedExpenses: Expense[] = data.map((e: any) => ({
        id: e._id || e.id,
        date: new Date(e.date).toLocaleDateString(),
        category: e.category,
        description: e.description,
        amount: e.amount,
        requestedBy: e.requestedBy?.username || e.requestedBy || 'Unknown',
        status: e.status,
        approvedBy: e.approvedBy?.username || e.approvedBy,
        receipt: e.receipt,
        images: e.images || [],
        receipts: e.receipts || [],
        isArchived: e.isArchived || false,
        stationId: e.stationId || e.requestedBy?.stationId || null,
        adminFeedback: e.adminFeedback || '',
        appealReason: e.appealReason || '',
        appealedAt: e.appealedAt || '',
        appealImages: e.appealImages || []
      }))
      setExpenses(mappedExpenses)
      toast.success('Expenses refreshed successfully')
    } catch (error: any) {
      console.error('Error refreshing expenses:', error)
      toast.error('Failed to refresh expenses')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCategory = (category: string) => {
    setHiddenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }


  const openModal = (expense: Expense) => {
    setSelectedExpense(expense)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedExpense(null)
  }

  const handleApprove = (expense: Expense) => {
    setConfirmDialog({ isOpen: true, expense, action: 'approve' })
  }

  const handleReject = (expense: Expense) => {
    setConfirmDialog({ isOpen: true, expense, action: 'reject' })
  }

  const handleArchive = async (expenseId: string) => {
    try {
      await expenseAPI.archive(expenseId)
      setExpenses(expenses.map(e => e.id === expenseId ? { ...e, isArchived: true } : e))
      toast.success('Expense archived')
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive expense')
    }
  }

  const handleUnarchive = async (expenseId: string) => {
    try {
      await expenseAPI.unarchive(expenseId)
      setExpenses(expenses.map(e => e.id === expenseId ? { ...e, isArchived: false } : e))
      toast.success('Expense unarchived')
    } catch (error: any) {
      toast.error(error.message || 'Failed to unarchive expense')
    }
  }

  const confirmAction = async () => {
    if (confirmDialog.expense && confirmDialog.action) {
      try {
        const feedback = feedbackDialog.expense?.id === confirmDialog.expense.id && feedbackDialog.feedback.trim() ? feedbackDialog.feedback : ''
        
        // Require feedback when rejecting
        if (confirmDialog.action === 'reject' && !feedback) {
          toast.error('Feedback is required when rejecting an expense request')
          return
        }
        
        if (confirmDialog.action === 'approve') {
          await expenseAPI.approve(confirmDialog.expense.id, feedback ? { adminFeedback: feedback } : undefined)
          setExpenses(expenses.map(e => 
            e.id === confirmDialog.expense!.id 
              ? { ...e, status: 'Approved' as const, adminFeedback: feedback || e.adminFeedback }
              : e
          ))
          toast.success('Expense approved' + (feedback ? ' with feedback' : ''))
        } else if (confirmDialog.action === 'reject') {
          await expenseAPI.reject(confirmDialog.expense.id, { rejectionReason: feedback, adminFeedback: feedback })
          setExpenses(expenses.map(e => 
            e.id === confirmDialog.expense!.id 
              ? { ...e, status: 'Rejected' as const, adminFeedback: feedback, appealReason: '', appealedAt: '' }
              : e
          ))
          toast.success('Expense rejected with feedback')
        }
        setConfirmDialog({ isOpen: false, expense: null, action: null })
        setFeedbackDialog({ isOpen: false, expense: null, feedback: '' })
        closeModal()
      } catch (error: any) {
        toast.error(error.message || `Failed to ${confirmDialog.action} expense`)
      }
    }
  }

  const handleAddFeedback = (expense: Expense) => {
    setFeedbackDialog({ isOpen: true, expense, feedback: expense.adminFeedback || '' })
  }

  const saveFeedback = async () => {
    if (!feedbackDialog.expense || !feedbackDialog.feedback.trim()) {
      toast.error('Please enter feedback')
      return
    }

    try {
      await expenseAPI.addFeedback(feedbackDialog.expense.id, feedbackDialog.feedback)
      setExpenses(expenses.map(e => 
        e.id === feedbackDialog.expense!.id 
          ? { ...e, adminFeedback: feedbackDialog.feedback }
          : e
      ))
      toast.success('Feedback added successfully')
      setFeedbackDialog({ isOpen: false, expense: null, feedback: '' })
    } catch (error: any) {
      toast.error(error.message || 'Failed to add feedback')
    }
  }


  const filteredExpenses = expenses.filter(expense => {
    if (!showArchived && expense.isArchived) return false
    if (showArchived && !expense.isArchived) return false
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.requestedBy.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'All Categories' || expense.category === filterCategory
    const matchesStatus = filterStatus === 'All Status' || expense.status === filterStatus
    const matchesStation = filterStation === 'All Stations' || expense.stationId === filterStation || (!expense.stationId && filterStation === 'None')
    return matchesSearch && matchesCategory && matchesStatus && matchesStation
  })

  // Get unique stations
  const stations = Array.from(new Set(expenses.map(e => e.stationId).filter(Boolean))).sort()

  // Always group expenses by category first
  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    const key = expense.category
    if (!acc[key]) acc[key] = []
    acc[key].push(expense)
    return acc
  }, {} as Record<string, Expense[]>)

  // Sort expenses within each category - Priority: Pending/Appealed first, then by date
  const sortedExpensesByCategory: Record<string, Expense[]> = {}
  Object.keys(expensesByCategory).forEach(category => {
    sortedExpensesByCategory[category] = [...expensesByCategory[category]].sort((a, b) => {
      // Priority: Pending and Appealed first
      const priorityOrder: Record<string, number> = { 'Pending': 0, 'Appealed': 1, 'Approved': 2, 'Rejected': 3 }
      const priorityA = priorityOrder[a.status] ?? 4
      const priorityB = priorityOrder[b.status] ?? 4
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      
      if (sortBy === 'station') {
        const stationA = a.stationId || 'None'
        const stationB = b.stationId || 'None'
        return stationA.localeCompare(stationB) || new Date(b.date).getTime() - new Date(a.date).getTime()
      } else {
        // Default: sort by date (newest first)
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
    })
  })

  // Get sorted category list
  const categories = Object.keys(sortedExpensesByCategory).sort()

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'status-approved'
      case 'Rejected':
        return 'status-rejected'
      case 'Appealed':
        return 'status-appealed'
      default:
        return 'status-pending'
    }
  }

  // Calculate stats
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const pendingAmount = expenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0)
  const approvedAmount = expenses.filter(e => e.status === 'Approved').reduce((sum, e) => sum + e.amount, 0)
  const totalRequests = expenses.length

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="expenses-management-wrapper"
      >
        {/* Header */}
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">💸 Expense Management</h1>
            <p className="page-subtitle">Track and approve business expenses</p>
          </div>
          <div className="header-actions">
            <div className="dashboard-controls">
              <button 
                className="control-btn"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh expenses"
              >
                <FiRotateCw style={{ 
                  animation: isLoading ? 'spin 1s linear infinite' : 'none',
                  display: 'inline-block'
                }} />
              </button>
              <button 
                className={`control-btn ${hiddenSections.stats ? 'active' : ''}`}
                onClick={() => toggleSection('stats')}
                title={hiddenSections.stats ? 'Show stats' : 'Hide stats'}
              >
                {hiddenSections.stats ? <FiEyeOff /> : <FiEye />}
                <span>Stats</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {!hiddenSections.stats && (
          <motion.div 
            className="expenses-stats-grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
          <motion.div 
            className="stat-card-small blue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <div className="stat-icon-small"><span style={{fontSize: '20px', fontWeight: 'bold'}}>₱</span></div>
            <div>
              <div className="stat-number-small">₱{totalExpenses.toLocaleString()}</div>
              <div className="stat-label-small">Total This Month</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small orange"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="stat-icon-small"><FiClock /></div>
            <div>
              <div className="stat-number-small">₱{pendingAmount.toLocaleString()}</div>
              <div className="stat-label-small">Pending Approval</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small green"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="stat-icon-small"><FiCheck /></div>
            <div>
              <div className="stat-number-small">₱{approvedAmount.toLocaleString()}</div>
              <div className="stat-label-small">Approved</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small purple"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-icon-small">📋</div>
            <div>
              <div className="stat-number-small">{totalRequests}</div>
              <div className="stat-label-small">Total Requests</div>
            </div>
          </motion.div>
          </motion.div>
        )}


        {/* Expenses Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="expenses-content"
        >
              {/* Quick Status Filters */}
              <div className="quick-status-filters">
                <button
                  className={`status-filter-chip ${filterStatus === 'All Status' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('All Status')}
                  aria-label="Show all statuses"
                >
                  All
                </button>
                <button
                  className={`status-filter-chip pending ${filterStatus === 'Pending' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('Pending')}
                  aria-label="Filter pending expenses"
                >
                  <FiClock size={14} />
                  Pending ({expenses.filter(e => e.status === 'Pending' && !e.isArchived).length})
                </button>
                <button
                  className={`status-filter-chip appealed ${filterStatus === 'Appealed' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('Appealed')}
                  aria-label="Filter appealed expenses"
                >
                  <FiMessageSquare size={14} />
                  Appealed ({expenses.filter(e => e.status === 'Appealed' && !e.isArchived).length})
                </button>
                <button
                  className={`status-filter-chip approved ${filterStatus === 'Approved' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('Approved')}
                  aria-label="Filter approved expenses"
                >
                  <FiCheck size={14} />
                  Approved ({expenses.filter(e => e.status === 'Approved' && !e.isArchived).length})
                </button>
                <button
                  className={`status-filter-chip rejected ${filterStatus === 'Rejected' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('Rejected')}
                  aria-label="Filter rejected expenses"
                >
                  <FiXCircle size={14} />
                  Rejected ({expenses.filter(e => e.status === 'Rejected' && !e.isArchived).length})
                </button>
              </div>

              {/* Active Filters Display */}
              {(filterCategory !== 'All Categories' || filterStatus !== 'All Status' || filterStation !== 'All Stations' || searchTerm) && (
                <div style={{ marginBottom: '12px' }}>
                  <FilterChips
                    filters={[
                      filterCategory !== 'All Categories' && { label: filterCategory, value: 'category' },
                      filterStatus !== 'All Status' && { label: filterStatus, value: 'status' },
                      filterStation !== 'All Stations' && { label: filterStation, value: 'station' },
                      searchTerm && { label: `"${searchTerm}"`, value: 'search' }
                    ].filter(Boolean) as Array<{ label: string; value: string }>}
                    onRemove={(value: string) => {
                      if (value === 'category') setFilterCategory('All Categories')
                      else if (value === 'status') setFilterStatus('All Status')
                      else if (value === 'station') setFilterStation('All Stations')
                      else if (value === 'search') setSearchTerm('')
                    }}
                    onClearAll={() => {
                      setFilterCategory('All Categories')
                      setFilterStatus('All Status')
                      setFilterStation('All Stations')
                      setSearchTerm('')
                    }}
                  />
                </div>
              )}

              {/* Search and Filters */}
              <div className="search-filter-bar">
                <div className="search-box-large">
                  <FiSearch className="search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search expenses"
                  />
                  {searchTerm && (
                    <button className="clear-search" onClick={() => setSearchTerm('')} aria-label="Clear search">
                      <FiX />
                    </button>
                  )}
                </div>

                <div className="filter-controls">
                  <select
                    className="filter-select"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option>All Categories</option>
                    <option>Supplies</option>
                    <option>Utilities</option>
                    <option>Maintenance</option>
                    <option>Salaries</option>
                    <option>Other</option>
                  </select>

                  <select
                    className="filter-select"
                    value={filterStation}
                    onChange={(e) => setFilterStation(e.target.value)}
                  >
                    <option>All Stations</option>
                    {stations.map(station => (
                      <option key={station} value={station}>{station}</option>
                    ))}
                    <option value="None">No Station</option>
                  </select>

                  <select
                    className="filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'category' | 'station' | 'date')}
                  >
                    <option value="date">Sort by Date</option>
                    <option value="category">Sort by Category</option>
                    <option value="station">Sort by Station</option>
                  </select>
                  
                  <ViewToggle
                    currentView={viewMode}
                    onViewChange={setViewMode}
                    className="view-toggle-expenses"
                  />
                  
                  <button
                    className={`archive-toggle-btn ${showArchived ? 'active' : ''}`}
                    onClick={() => setShowArchived(!showArchived)}
                    title={showArchived ? 'Show Active' : 'Show Archived'}
                  >
                    <FiFolder size={16} />
                    <span>{showArchived ? 'Archived' : 'Active'}</span>
                  </button>
                </div>
              </div>

              {/* Expenses Display */}
              <div className={`expenses-container ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
                {isLoading ? (
                  viewMode === 'cards' ? (
                    <CardSkeleton count={6} />
                  ) : (
                    <TableSkeleton rows={5} columns={7} />
                  )
                ) : categories.length === 0 ? (
                  <EmptyState
                    icon={<FiDollarSign />}
                    title={searchTerm ? 'No expenses found' : showArchived ? 'No archived expenses' : 'No expenses yet'}
                    description={
                      searchTerm
                        ? 'Try adjusting your search criteria to find expenses.'
                        : showArchived
                        ? 'You don\'t have any archived expenses.'
                        : 'Start by creating your first expense request.'
                    }
                    type={searchTerm ? 'no-results' : 'empty'}
                  />
                ) : viewMode === 'cards' ? (
                  <div className="expenses-by-category">
                    {categories.map((category) => (
                      <div key={category} className="expense-category-group">
                        <div className="category-header">
                          <h3 className="category-title">{category}</h3>
                          <div className="category-header-right">
                            <span className="category-count">{sortedExpensesByCategory[category].length} {sortedExpensesByCategory[category].length === 1 ? 'request' : 'requests'}</span>
                            <button
                              className="category-toggle-btn"
                              onClick={() => toggleCategory(category)}
                              title={hiddenCategories[category] ? 'Show category' : 'Hide category'}
                            >
                              {hiddenCategories[category] ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                          </div>
                        </div>
                        {!hiddenCategories[category] && (
                        <div className="expenses-grid">
                          {sortedExpensesByCategory[category].map((expense, index) => (
                            <motion.div
                              key={expense.id}
                              className={`expense-card ${expense.status.toLowerCase()} ${expense.isArchived ? 'archived' : ''}`}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ y: -4 }}
                            >
                              <div className="expense-card-header">
                                <div className="expense-date">
                                  <FiCalendar size={14} />
                                  <span>{expense.date}</span>
                                </div>
                                <span className={`status-badge ${getStatusBadgeClass(expense.status)}`}>
                                  {expense.status}
                                </span>
                              </div>

                              {(expense.images && expense.images.length > 0) || (expense.receipts && expense.receipts.length > 0) ? (
                                <div className="expense-proof-section">
                              {expense.images && expense.images.length > 0 && (
                                <div 
                                  className="expense-images-preview"
                                  onClick={() => {
                                    setSelectedExpense(expense)
                                    setSelectedImageIndex(0)
                                    setImageViewerOpen(true)
                                  }}
                                      style={{ marginBottom: '8px' }}
                                >
                                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Initial Proof</div>
                                  <img 
                                    src={expense.images[0]} 
                                    alt={expense.description}
                                    className="expense-preview-image"
                                  />
                                  {expense.images.length > 1 && (
                                    <div className="expense-images-count">
                                      <FiImage size={12} />
                                      <span>+{expense.images.length - 1}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                                  {expense.receipts && expense.receipts.length > 0 && (
                                    <div 
                                      className="expense-images-preview"
                                      onClick={() => {
                                        setSelectedExpense(expense)
                                        setSelectedImageIndex(expense.images?.length || 0)
                                        setImageViewerOpen(true)
                                      }}
                                    >
                                      <div style={{ fontSize: '11px', color: '#2563EB', marginBottom: '4px', fontWeight: '600' }}>
                                        Receipt ({expense.receipts.length}) • {new Date(expense.receipts[0].uploadedAt).toLocaleDateString()}
                                      </div>
                                      <img 
                                        src={expense.receipts[0].image} 
                                        alt="Receipt"
                                        className="expense-preview-image"
                                      />
                                      {expense.receipts.length > 1 && (
                                        <div className="expense-images-count">
                                          <FiImage size={12} />
                                          <span>+{expense.receipts.length - 1}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : null}

                              <div className="expense-card-body">
                                <div className="expense-amount">₱{expense.amount.toLocaleString()}</div>
                                <div className="expense-category-badge">{expense.category}</div>
                                <p className="expense-description">{expense.description}</p>
                                
                                <div className="expense-requester">
                                  <FiUser size={14} />
                                  <span>Added by {expense.requestedBy}</span>
                                </div>
                                {expense.stationId && (
                                  <div className="expense-station" style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FiMapPin size={12} />
                                    <span>Station: {expense.stationId}</span>
                                  </div>
                                )}
                                {expense.appealReason && (
                                  <div className="expense-appeal" style={{ marginTop: '12px', padding: '8px', backgroundColor: '#DBEAFE', borderRadius: '6px', fontSize: '12px', border: '1px solid #3B82F6' }}>
                                    <div style={{ fontWeight: '600', color: '#1E40AF', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span>📢 Appeal Submitted</span>
                                      {expense.appealedAt && (
                                        <span style={{ fontSize: '10px', opacity: 0.8 }}>
                                          • {new Date(expense.appealedAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ color: '#1E3A8A', marginBottom: expense.appealImages && expense.appealImages.length > 0 ? '8px' : '0' }}>
                                      {expense.appealReason}
                                    </div>
                                    {expense.appealImages && expense.appealImages.length > 0 && (
                                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {expense.appealImages.map((img, idx) => (
                                          <img
                                            key={idx}
                                            src={img}
                                            alt={`Appeal image ${idx + 1}`}
                                            style={{
                                              width: '60px',
                                              height: '60px',
                                              objectFit: 'cover',
                                              borderRadius: '6px',
                                              border: '1px solid #3B82F6',
                                              cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                              setSelectedExpense(expense)
                                              const imagesCount = expense.images?.length || 0
                                              const receiptsCount = expense.receipts?.length || 0
                                              setSelectedImageIndex(imagesCount + receiptsCount + idx)
                                              setImageViewerOpen(true)
                                            }}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {expense.adminFeedback && (
                                  <div className="expense-feedback" style={{ marginTop: '12px', padding: '8px', backgroundColor: '#FEF3C7', borderRadius: '6px', fontSize: '12px' }}>
                                    <div style={{ fontWeight: '600', color: '#92400E', marginBottom: '4px' }}>Admin Feedback:</div>
                                    <div style={{ color: '#78350F' }}>{expense.adminFeedback}</div>
                                  </div>
                                )}
                              </div>

                              <div className="expense-card-footer">
                                <button
                                  className="btn-icon-small"
                                  onClick={() => openModal(expense)}
                                  title="View Details"
                                >
                                  <FiEye />
                                </button>
                                <button
                                  className="btn-icon-small"
                                  onClick={() => handleAddFeedback(expense)}
                                  title="Add/Edit Feedback"
                                  style={{ color: '#2563EB' }}
                                >
                                  <FiMessageSquare />
                                </button>
                                {(expense.status === 'Pending' || expense.status === 'Appealed') && (
                                  <>
                                    <button
                                      className="btn-icon-small approve"
                                      onClick={() => {
                                        setFeedbackDialog({ isOpen: true, expense, feedback: expense.adminFeedback || '' })
                                        setTimeout(() => setConfirmDialog({ isOpen: true, expense, action: 'approve' }), 100)
                                      }}
                                      title="Approve"
                                    >
                                      <FiCheck />
                                    </button>
                                    <button
                                      className="btn-icon-small reject"
                                      onClick={() => {
                                        setFeedbackDialog({ isOpen: true, expense, feedback: expense.adminFeedback || '' })
                                        setTimeout(() => setConfirmDialog({ isOpen: true, expense, action: 'reject' }), 100)
                                      }}
                                      title="Reject"
                                    >
                                      <FiXCircle />
                                    </button>
                                  </>
                                )}
                                <button
                                  className={`btn-icon-small ${showArchived ? 'restore' : 'delete'}`}
                                  onClick={() => showArchived ? handleUnarchive(expense.id) : handleArchive(expense.id)}
                                  title={showArchived ? 'Unarchive' : 'Archive'}
                                >
                                  {showArchived ? <FiRotateCw /> : <FiArchive />}
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="expenses-by-category">
                    {categories.map((category) => (
                      <div key={category} className="expense-category-group">
                        <div className="category-header">
                          <h3 className="category-title">{category}</h3>
                          <div className="category-header-right">
                            <span className="category-count">{sortedExpensesByCategory[category].length} {sortedExpensesByCategory[category].length === 1 ? 'request' : 'requests'}</span>
                            <button
                              className="category-toggle-btn"
                              onClick={() => toggleCategory(category)}
                              title={hiddenCategories[category] ? 'Show category' : 'Hide category'}
                            >
                              {hiddenCategories[category] ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                          </div>
                        </div>
                        {!hiddenCategories[category] && (
                        <div className="expenses-list">
                          <div className="list-header">
                            <div className="list-header-cell">Expense</div>
                            <div className="list-header-cell">Images</div>
                            <div className="list-header-cell">Amount</div>
                            <div className="list-header-cell">Date</div>
                            <div className="list-header-cell">Requested By</div>
                            <div className="list-header-cell">Status</div>
                            <div className="list-header-cell">Actions</div>
                          </div>
                          {sortedExpensesByCategory[category].map((expense, index) => (
                            <motion.div
                              key={expense.id}
                              className={`expense-list-item ${expense.status.toLowerCase()} ${expense.isArchived ? 'archived' : ''}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ backgroundColor: 'var(--color-gray-50)' }}
                            >
                              <div className="list-cell expense-info">
                                <div className="expense-icon-small">
                                  <span style={{fontSize: '16px', fontWeight: 'bold'}}>₱</span>
                                </div>
                                <div>
                                  <div className="expense-description-list">{expense.description}</div>
                                </div>
                              </div>
                              
                              <div className="list-cell">
                                {(expense.images && expense.images.length > 0) || (expense.receipts && expense.receipts.length > 0) ? (
                                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                    {expense.images && expense.images.length > 0 && (
                                  <div 
                                    className="expense-image-thumbnail-wrapper"
                                    onClick={() => {
                                      setSelectedExpense(expense)
                                      setSelectedImageIndex(0)
                                      setImageViewerOpen(true)
                                    }}
                                  >
                                    <img 
                                      src={expense.images[0]} 
                                      alt={expense.description}
                                      className="expense-image-thumbnail"
                                    />
                                    {expense.images.length > 1 && (
                                      <div className="expense-thumbnail-badge">
                                        +{expense.images.length - 1}
                                          </div>
                                        )}
                                        <span style={{ fontSize: '9px', color: '#6B7280', marginTop: '2px', display: 'block', textAlign: 'center' }}>Proof</span>
                                      </div>
                                    )}
                                    {expense.receipts && expense.receipts.length > 0 && (
                                      <div 
                                        className="expense-image-thumbnail-wrapper"
                                        onClick={() => {
                                          setSelectedExpense(expense)
                                          setSelectedImageIndex(expense.images?.length || 0)
                                          setImageViewerOpen(true)
                                        }}
                                        style={{ borderColor: '#2563EB', borderWidth: '2px' }}
                                      >
                                        <img 
                                          src={expense.receipts[0].image} 
                                          alt="Receipt"
                                          className="expense-image-thumbnail"
                                        />
                                        {expense.receipts.length > 1 && (
                                          <div className="expense-thumbnail-badge" style={{ backgroundColor: '#2563EB' }}>
                                            +{expense.receipts.length - 1}
                                          </div>
                                        )}
                                        <span style={{ fontSize: '9px', color: '#2563EB', marginTop: '2px', display: 'block', textAlign: 'center', fontWeight: '600' }}>
                                          Receipt • {new Date(expense.receipts[0].uploadedAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="no-image-placeholder">No image</span>
                                )}
                              </div>
                              
                              <div className="list-cell">
                                <span className="expense-amount-list">₱{expense.amount.toLocaleString()}</span>
                              </div>
                              
                              <div className="list-cell">
                                <span className="expense-date-list">{expense.date}</span>
                              </div>
                              
                              <div className="list-cell">
                                <span className="expense-requester-list">{expense.requestedBy}</span>
                              </div>
                              
                              <div className="list-cell">
                                <span className={`status-badge-list ${getStatusBadgeClass(expense.status)}`}>
                                  {expense.status}
                                </span>
                              </div>
                              
                              <div className="list-cell actions-cell">
                                <div className="action-buttons-row">
                                  <button
                                    className="btn-icon-small"
                                    onClick={() => openModal(expense)}
                                    title="View Details"
                                  >
                                    <FiEye />
                                  </button>
                                  {expense.status === 'Pending' && (
                                    <>
                                      <button
                                        className="btn-icon-small approve"
                                        onClick={() => handleApprove(expense)}
                                        title="Approve"
                                      >
                                        <FiCheck />
                                      </button>
                                      <button
                                        className="btn-icon-small reject"
                                        onClick={() => handleReject(expense)}
                                        title="Reject"
                                      >
                                        <FiXCircle />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    className="btn-icon-small delete"
                                    onClick={() => handleArchive(expense.id)}
                                    title="Archive"
                                  >
                                    <FiArchive />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
        </motion.div>

        {/* Expense Details Modal */}
        <AnimatePresence>
          {isModalOpen && selectedExpense && (
            <div className="modal-overlay" onClick={closeModal}>
              <motion.div
                className="modal-large"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 className="modal-title">Expense Details</h3>
                  <button className="btn-icon" onClick={closeModal}>
                    <FiX />
                  </button>
                </div>
                
                <div className="modal-body">
                  <div className="expense-modal-header">
                    <div className="expense-amount-large">
                      ₱{selectedExpense.amount.toLocaleString()}
                    </div>
                    <span className={`status-badge-large ${getStatusBadgeClass(selectedExpense.status)}`}>
                      {selectedExpense.status}
                    </span>
                  </div>

                  <div className="details-grid-2">
                    <div className="detail-card">
                      <label>Category</label>
                      <div className="detail-value">{selectedExpense.category}</div>
                    </div>
                    <div className="detail-card">
                      <label>Date</label>
                      <div className="detail-value">
                        <FiCalendar size={16} /> {selectedExpense.date}
                      </div>
                    </div>
                    <div className="detail-card">
                      <label>Added By</label>
                      <div className="detail-value">
                        <FiUser size={16} /> {selectedExpense.requestedBy}
                      </div>
                    </div>
                    {selectedExpense.status === 'Approved' && (
                    <div className="detail-card">
                      <label>Approved By</label>
                      <div className="detail-value">
                          <FiUser size={16} /> {selectedExpense.approvedBy || 'N/A'}
                      </div>
                    </div>
                    )}
                    {selectedExpense.status === 'Appealed' && selectedExpense.appealReason && (
                      <div className="detail-card">
                        <label>Appeal Reason</label>
                        <div className="detail-value" style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                          {selectedExpense.appealReason}
                        </div>
                      </div>
                    )}
                  </div>

                  {((selectedExpense.images && selectedExpense.images.length > 0) || (selectedExpense.receipts && selectedExpense.receipts.length > 0) || (selectedExpense.appealImages && selectedExpense.appealImages.length > 0)) && (
                    <div className="expense-images-section">
                      <h4>Proof Images & Receipts</h4>
                      
                      {selectedExpense.images && selectedExpense.images.length > 0 && (
                        <>
                          <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280', marginBottom: '12px', marginTop: '0' }}>
                            Initial Proof Images
                          </h5>
                      <div className="expense-images-gallery">
                        {selectedExpense.images.map((image, index) => (
                          <div 
                                key={`proof-${index}`}
                            className="expense-image-item"
                            onClick={() => {
                              setSelectedImageIndex(index)
                              setImageViewerOpen(true)
                            }}
                          >
                            <img 
                              src={image} 
                                  alt={`Proof ${index + 1}`}
                                  className="expense-gallery-image"
                                />
                                <div className="image-overlay">
                                  <FiEye size={20} />
                                </div>
                                <div style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '10px', color: '#6B7280', backgroundColor: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '4px' }}>
                                  Proof
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {selectedExpense.receipts && selectedExpense.receipts.length > 0 && (
                        <>
                          <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#2563EB', marginBottom: '12px', marginTop: selectedExpense.images && selectedExpense.images.length > 0 ? '20px' : '0' }}>
                            Purchase Receipts ({selectedExpense.receipts.length})
                          </h5>
                          <div className="expense-images-gallery">
                            {selectedExpense.receipts.map((receipt, index) => (
                              <div 
                                key={`receipt-${index}`}
                                className="expense-image-item"
                                onClick={() => {
                                  setSelectedImageIndex((selectedExpense.images?.length || 0) + index)
                                  setImageViewerOpen(true)
                                }}
                                style={{ border: '2px solid #2563EB' }}
                              >
                                <img 
                                  src={receipt.image} 
                              alt={`Receipt ${index + 1}`}
                              className="expense-gallery-image"
                            />
                            <div className="image-overlay">
                              <FiEye size={20} />
                            </div>
                                <div style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '10px', color: '#2563EB', backgroundColor: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                  Receipt • {new Date(receipt.uploadedAt).toLocaleDateString()}
                                </div>
                          </div>
                        ))}
                      </div>
                        </>
                      )}

                      {selectedExpense.appealImages && selectedExpense.appealImages.length > 0 && (
                        <>
                          <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#3B82F6', marginBottom: '12px', marginTop: ((selectedExpense.images && selectedExpense.images.length > 0) || (selectedExpense.receipts && selectedExpense.receipts.length > 0)) ? '20px' : '0' }}>
                            Appeal Supporting Images ({selectedExpense.appealImages.length})
                          </h5>
                          <div className="expense-images-gallery">
                            {selectedExpense.appealImages.map((image, index) => {
                              const offsetIndex = (selectedExpense.images?.length || 0) + (selectedExpense.receipts?.length || 0) + index;
                              return (
                                <div 
                                  key={`appeal-${index}`}
                                  className="expense-image-item"
                                  onClick={() => {
                                    setSelectedImageIndex(offsetIndex)
                                    setImageViewerOpen(true)
                                  }}
                                  style={{ border: '2px solid #3B82F6' }}
                                >
                                  <img 
                                    src={image} 
                                    alt={`Appeal image ${index + 1}`}
                                    className="expense-gallery-image"
                                  />
                                  <div className="image-overlay">
                                    <FiEye size={20} />
                                  </div>
                                  <div style={{ position: 'absolute', bottom: '4px', left: '4px', fontSize: '10px', color: '#3B82F6', backgroundColor: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                    Appeal
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="description-section">
                    <h4>Description</h4>
                    <p className="expense-description-full">{selectedExpense.description}</p>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <Button variant="secondary" onClick={closeModal}>
                    Close
                  </Button>
                  {(selectedExpense.status === 'Pending' || selectedExpense.status === 'Appealed') && (
                    <>
                      <Button variant="secondary" onClick={() => handleReject(selectedExpense)}>
                        <FiXCircle /> Reject
                      </Button>
                      <Button onClick={() => handleApprove(selectedExpense)}>
                        <FiCheck /> Approve
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Image Viewer Modal */}
        <AnimatePresence>
          {imageViewerOpen && selectedExpense && ((selectedExpense.images && selectedExpense.images.length > 0) || (selectedExpense.receipts && selectedExpense.receipts.length > 0) || (selectedExpense.appealImages && selectedExpense.appealImages.length > 0)) && (
            <div className="modal-overlay" onClick={() => setImageViewerOpen(false)}>
              <motion.div
                className="image-viewer-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="image-viewer-header">
                  <h3>
                    {(() => {
                      const imagesCount = selectedExpense.images?.length || 0
                      const receiptsCount = selectedExpense.receipts?.length || 0
                      const appealImagesCount = selectedExpense.appealImages?.length || 0
                      const totalImages = imagesCount + receiptsCount + appealImagesCount
                      
                      if (selectedImageIndex < imagesCount) {
                        return `Proof Image ${selectedImageIndex + 1} of ${imagesCount}`
                      } else if (selectedImageIndex < imagesCount + receiptsCount) {
                        const receiptIndex = selectedImageIndex - imagesCount
                        const receipt = selectedExpense.receipts?.[receiptIndex]
                        return `Receipt ${receiptIndex + 1} of ${receiptsCount} • Uploaded: ${receipt ? new Date(receipt.uploadedAt).toLocaleString() : 'N/A'}`
                      } else {
                        const appealIndex = selectedImageIndex - imagesCount - receiptsCount
                        return `Appeal Image ${appealIndex + 1} of ${appealImagesCount}`
                      }
                    })()}
                  </h3>
                  <button className="btn-icon" onClick={() => setImageViewerOpen(false)}>
                    <FiX />
                  </button>
                </div>
                <div className="image-viewer-body">
                  {(() => {
                    const imagesCount = selectedExpense.images?.length || 0
                    const receiptsCount = selectedExpense.receipts?.length || 0
                    const appealImagesCount = selectedExpense.appealImages?.length || 0
                    const totalImages = imagesCount + receiptsCount + appealImagesCount
                    
                    return (
                      <div className="image-viewer-main-container">
                        {totalImages > 1 && (
                          <button
                            className="image-nav-arrow image-nav-arrow-left"
                            onClick={() => setSelectedImageIndex(prev => prev > 0 ? prev - 1 : totalImages - 1)}
                            aria-label="Previous image"
                          >
                            <FiChevronLeft size={24} />
                          </button>
                        )}
                        <img 
                          src={(() => {
                            if (selectedImageIndex < imagesCount) {
                              return selectedExpense.images?.[selectedImageIndex] || ''
                            } else if (selectedImageIndex < imagesCount + receiptsCount) {
                              const receiptIndex = selectedImageIndex - imagesCount
                              return selectedExpense.receipts?.[receiptIndex]?.image || ''
                            } else {
                              const appealIndex = selectedImageIndex - imagesCount - receiptsCount
                              return selectedExpense.appealImages?.[appealIndex] || ''
                            }
                          })()} 
                          alt={`Image ${selectedImageIndex + 1}`}
                          className="image-viewer-main-image"
                        />
                        {totalImages > 1 && (
                          <button
                            className="image-nav-arrow image-nav-arrow-right"
                            onClick={() => setSelectedImageIndex(prev => prev < totalImages - 1 ? prev + 1 : 0)}
                            aria-label="Next image"
                          >
                            <FiChevronRight size={24} />
                          </button>
                        )}
                      </div>
                    )
                  })()}
                  {(() => {
                    const imagesCount = selectedExpense.images?.length || 0
                    const receiptsCount = selectedExpense.receipts?.length || 0
                    const appealImagesCount = selectedExpense.appealImages?.length || 0
                    const totalImages = imagesCount + receiptsCount + appealImagesCount
                    return totalImages > 1 && (
                    <div className="image-viewer-controls">
                      <button 
                        className="image-nav-btn"
                          onClick={() => {
                            setSelectedImageIndex(prev => prev > 0 ? prev - 1 : totalImages - 1)
                          }}
                          disabled={totalImages === 1}
                      >
                        ← Previous
                      </button>
                      <div className="image-thumbnails-row">
                          {selectedExpense.images?.map((img, idx) => (
                            <div key={`proof-${idx}`} style={{ position: 'relative' }}>
                          <img
                            src={img}
                                alt={`Proof ${idx + 1}`}
                            className={`image-thumbnail ${idx === selectedImageIndex ? 'active' : ''}`}
                            onClick={() => setSelectedImageIndex(idx)}
                          />
                              <span style={{ fontSize: '9px', position: 'absolute', bottom: '-16px', left: '50%', transform: 'translateX(-50%)', color: '#6B7280' }}>Proof</span>
                            </div>
                          ))}
                          {selectedExpense.receipts?.map((receipt, idx) => {
                            const displayIdx = imagesCount + idx
                            return (
                              <div key={`receipt-${idx}`} style={{ position: 'relative' }}>
                                <img
                                  src={receipt.image}
                                  alt={`Receipt ${idx + 1}`}
                                  className={`image-thumbnail ${displayIdx === selectedImageIndex ? 'active' : ''}`}
                                  onClick={() => setSelectedImageIndex(displayIdx)}
                                  style={{ borderColor: displayIdx === selectedImageIndex ? '#2563EB' : '#D1D5DB' }}
                                />
                                <span style={{ fontSize: '9px', position: 'absolute', bottom: '-16px', left: '50%', transform: 'translateX(-50%)', color: '#2563EB', fontWeight: '600' }}>
                                  {new Date(receipt.uploadedAt).toLocaleDateString()}
                                </span>
                              </div>
                            )
                          })}
                          {selectedExpense.appealImages?.map((img, idx) => {
                            const displayIdx = imagesCount + receiptsCount + idx
                            return (
                              <div key={`appeal-${idx}`} style={{ position: 'relative' }}>
                                <img
                                  src={img}
                                  alt={`Appeal ${idx + 1}`}
                                  className={`image-thumbnail ${displayIdx === selectedImageIndex ? 'active' : ''}`}
                                  onClick={() => setSelectedImageIndex(displayIdx)}
                                  style={{ borderColor: displayIdx === selectedImageIndex ? '#3B82F6' : '#D1D5DB' }}
                                />
                                <span style={{ fontSize: '9px', position: 'absolute', bottom: '-16px', left: '50%', transform: 'translateX(-50%)', color: '#3B82F6', fontWeight: '600' }}>
                                  Appeal
                                </span>
                              </div>
                            )
                          })}
                      </div>
                      <button 
                        className="image-nav-btn"
                          onClick={() => {
                            setSelectedImageIndex(prev => prev < totalImages - 1 ? prev + 1 : 0)
                          }}
                          disabled={totalImages === 1}
                      >
                        Next →
                      </button>
                    </div>
                    )
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.action === 'approve' ? 'Approve Expense?' : 'Reject Expense?'}
          message={
            confirmDialog.action === 'approve'
              ? `Are you sure you want to approve this expense of ₱${confirmDialog.expense?.amount.toLocaleString()}?`
              : `Are you sure you want to reject this expense?`
          }
          confirmLabel={confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
          cancelLabel="Cancel"
          type={confirmDialog.action === 'reject' ? 'danger' : 'info'}
          onConfirm={confirmAction}
          onCancel={() => {
            setConfirmDialog({ isOpen: false, expense: null, action: null })
            setFeedbackDialog({ isOpen: false, expense: null, feedback: '' })
          }}
        />

        {/* Feedback Dialog */}
        <AnimatePresence>
          {feedbackDialog.isOpen && (
            <motion.div
              className="confirm-dialog-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!confirmDialog.isOpen) {
                  setFeedbackDialog({ isOpen: false, expense: null, feedback: '' })
                }
              }}
            >
              <motion.div
                className="confirm-dialog"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '500px' }}
              >
                <h3 className="confirm-dialog-title">Add Feedback</h3>
                <textarea
                  value={feedbackDialog.feedback}
                  onChange={(e) => setFeedbackDialog({ ...feedbackDialog, feedback: e.target.value })}
                  placeholder="Enter your feedback..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    marginTop: '12px',
                    marginBottom: '16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <div className="confirm-dialog-actions">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      if (!confirmDialog.isOpen) {
                        setFeedbackDialog({ isOpen: false, expense: null, feedback: '' })
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (confirmDialog.isOpen) {
                        confirmAction()
                      } else {
                        saveFeedback()
                      }
                    }}
                  >
                    {confirmDialog.isOpen ? (confirmDialog.action === 'approve' ? 'Approve with Feedback' : 'Reject with Feedback') : 'Save Feedback'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  )
}

export default ExpenseManagement

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiSearch, FiFilter, FiDownload, FiEdit2, FiArchive, FiEye, FiX, FiFileText, FiChevronDown, FiFolder, FiRotateCw, FiSave, FiCheckCircle, FiClock, FiPrinter, FiLock, FiPackage, FiPlus } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import { TableSkeleton } from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import { FilterChips } from '../components/FilterChip'
import ErrorState from '../components/ErrorState'
import CreateOrderModal from '../components/CreateOrderModal'
import { Order } from '../types'
import { exportToCSV, exportToExcel, exportToPDF, getExportFilename } from '../utils/exportUtils'
import { exportOrdersDirect } from '../utils/reportGeneration/helpers'
import { ExportFormat } from '../utils/reportGeneration/types'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { usePermissions } from '../hooks/usePermissions'
import { orderAPI, stationAPI } from '../utils/api'
import { offlineQueue } from '../utils/offlineQueue'
import './OrderManagement.css'

const OrderManagement: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPayment, setFilterPayment] = useState('All')
  const [filterStation, setFilterStation] = useState('All')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterStatus, setFilterStatus] = useState('All Status')
  const [stations, setStations] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [showDrafts, setShowDrafts] = useState(false)
  const [finalPaidInput, setFinalPaidInput] = useState<string>('')
  const [partialPaidInput, setPartialPaidInput] = useState<string>('')
  const [originalPayment, setOriginalPayment] = useState<string>('')
  const [originalPaid, setOriginalPaid] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize] = useState<number>(5)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false)
  const [draftOrderIdForModal, setDraftOrderIdForModal] = useState<string | null>(null)
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [lockStatus, setLockStatus] = useState<{ isLocked: boolean; lockedBy?: { name: string; email?: string }; isLockedByMe?: boolean } | null>(null)
  const [orderLocks, setOrderLocks] = useState<Record<string, { isLocked: boolean; lockedBy?: { name: string; email?: string }; isLockedByMe?: boolean }>>({})
  const lockCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { hasPermission } = usePermissions()
  const canArchiveOrders = hasPermission('orders', 'archive')
  const canUnarchiveOrders = hasPermission('orders', 'unarchive')

  // Keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 'f',
      ctrl: true,
      callback: () => {
        searchInputRef.current?.focus()
      }
    },
    {
      key: 'a',
      ctrl: true,
      callback: () => {
        toggleSelectAll()
      }
    }
  ])

  // Helper function to extract pending orders from offline queue
  const getQueuedOrders = (): Order[] => {
    const queue = offlineQueue.getQueue()
    const pendingOrderCreations = queue.filter(
      action => 
        action.endpoint === '/orders' && 
        action.method === 'POST' && 
        (action.status === 'pending' || action.status === 'processing')
    )
    
    return pendingOrderCreations.map(action => {
      const orderData = action.body || {}
      const orderDate = new Date(action.timestamp)
      
      // Calculate totals from items
      const items = orderData.items || []
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
      
      // Calculate discount amount (simplified - actual discount would come from backend)
      const discountStr = orderData.discount || '0%'
      const discountMatch = discountStr.match(/(\d+(?:\.\d+)?)/)
      let discountAmount = 0
      if (discountMatch) {
        if (discountStr.includes('%')) {
          discountAmount = subtotal * (parseFloat(discountMatch[1]) / 100)
        } else {
          discountAmount = parseFloat(discountMatch[1])
        }
      }
      
      const total = subtotal - discountAmount
      const paid = orderData.paid || 0
      const balance = total - paid
      const change = balance < 0 ? Math.abs(balance) : 0
      
      // Determine payment status
      let paymentStatus: 'Paid' | 'Unpaid' | 'Partial' = 'Unpaid'
      if (paid >= total && total > 0) {
        paymentStatus = 'Paid'
      } else if (paid > 0) {
        paymentStatus = 'Partial'
      }
      
      return {
        id: `queued-${action.id}`, // Temporary ID for queued orders
        date: orderDate.toLocaleDateString(),
        createdAt: orderDate.toISOString(),
        customer: orderData.customer || 'Unknown',
        customerPhone: orderData.customerPhone || '',
        payment: paymentStatus,
        total: `₱${total.toFixed(2)}`,
        items: items,
        discount: discountStr,
        paid: paid,
        balance: `₱${Math.max(0, balance).toFixed(2)}`,
        change: change,
        pickupDate: orderData.pickupDate ? new Date(orderData.pickupDate).toLocaleDateString() : undefined,
        deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate).toLocaleDateString() : undefined,
        notes: orderData.notes || '',
        isArchived: false,
        isDraft: false,
        isCompleted: false,
        scheduledDeleteAt: null,
        convertedOrderId: null,
        stationId: orderData.stationId || '',
        isQueued: true, // Flag to identify queued orders
        queueId: action.id // Store queue ID for reference
      } as Order & { isQueued?: boolean; queueId?: string }
    })
  }

  // Fetch stations function (extracted for reuse)
  const fetchStations = async (showToast = false) => {
      try {
        const data = await stationAPI.getAll({ showArchived: false })
        const activeStations = (data || []).filter((s: any) => s.isArchived !== true && s.isActive !== false)
        setStations(activeStations)
      if (showToast) {
        toast.success('Stations refreshed successfully')
      }
      } catch (error) {
        console.error('Error fetching stations:', error)
      if (showToast) {
        toast.error('Failed to refresh stations')
      }
    }
  }

  // Fetch orders function (extracted for reuse)
  const fetchOrders = async (showToast = false) => {
      setIsLoading(true)
      try {
        const data = await orderAPI.getAll({ 
          payment: filterPayment !== 'All' ? filterPayment : undefined,
          showArchived: showDrafts ? false : showArchived, // Don't show archived when viewing drafts
          showDrafts 
        })
        // Map backend data to frontend Order interface
        const mappedOrders: Order[] = data.map((o: any) => ({
          id: o.id,
          date: new Date(o.date).toLocaleDateString(),
          // Preserve original creation datetime for timestamp display
          ...( { createdAt: o.date } as any ),
          customer: o.customer,
          customerPhone: o.customerPhone || '',
          payment: o.payment,
          total: o.total,
          items: o.items || [],
          discount: o.discount || '0%',
          paid: o.paid || 0,
          balance: o.balance || '₱0.00',
          change: o.change || 0,
          pickupDate: o.pickupDate ? new Date(o.pickupDate).toLocaleDateString() : undefined,
          deliveryDate: o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : undefined,
          notes: o.notes || '',
          isArchived: o.isArchived || false,
          isDraft: o.isDraft || false,
          isCompleted: o.isCompleted || false,
          scheduledDeleteAt: o.scheduledDeleteAt ? new Date(o.scheduledDeleteAt).toISOString() : null,
          convertedOrderId: o.convertedOrderId || null,
          stationId: o.stationId || '',
          lastEditedBy: o.lastEditedBy || undefined,
          lastEditedAt: o.lastEditedAt ? new Date(o.lastEditedAt) : undefined
        }))
        
        // Merge with queued orders (pending sync)
        const queuedOrders = getQueuedOrders()
        const allOrders = [...mappedOrders, ...queuedOrders]
        
        // Sort by date (newest first), with queued orders at the top
        allOrders.sort((a, b) => {
          const aIsQueued = (a as any).isQueued ? 1 : 0
          const bIsQueued = (b as any).isQueued ? 1 : 0
          if (aIsQueued !== bIsQueued) {
            return bIsQueued - aIsQueued // Queued orders first
          }
          const aDate = new Date((a as any).createdAt || a.date)
          const bDate = new Date((b as any).createdAt || b.date)
          return bDate.getTime() - aDate.getTime()
        })
        
        setOrders(allOrders)
      if (showToast) {
        toast.success('Orders refreshed successfully')
      }
      } catch (error: any) {
        console.error('Error fetching orders:', error)
      setError(error)
        // If offline, still show queued orders
        if (!navigator.onLine) {
          const queuedOrders = getQueuedOrders()
          if (queuedOrders.length > 0) {
            setOrders(queuedOrders)
          setError(null)
            toast('Showing queued orders (offline mode)', { icon: '📦' })
          } else {
            toast.error('No orders available offline')
          }
        } else {
        toast.error('Failed to load orders')
        }
      } finally {
        setIsLoading(false)
      }
    }

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchOrders(true), // Shows "Orders refreshed successfully"
        fetchStations(false) // Silently refresh stations without showing toast
      ])
    } finally {
      setIsRefreshing(false)
    }
  }

  // Fetch stations for filter
  useEffect(() => {
    fetchStations()
  }, [])

  // Check URL for draft parameter on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const draftId = searchParams.get('draft')
    if (draftId) {
      setDraftOrderIdForModal(draftId)
      setIsCreateOrderModalOpen(true)
      // Clean up URL
      navigate('/orders', { replace: true })
    }
  }, [location.search, navigate])

  // Fetch orders from API
  useEffect(() => {
    fetchOrders()
    
    // Subscribe to queue changes to update when orders are synced
    const unsubscribe = offlineQueue.subscribe(() => {
      // Refresh orders when queue changes
      fetchOrders()
    })
    
    return () => {
      unsubscribe()
    }
  }, [filterPayment, showArchived, showDrafts, filterStation])

  // Check lock status for all orders periodically
  useEffect(() => {
    const checkAllLocks = async () => {
      if (orders.length === 0) return
      
      const lockPromises = orders.map(async (order) => {
        try {
          const response = await orderAPI.checkEditLock(order.id)
          return { orderId: order.id, lockInfo: response }
        } catch (error) {
          return { orderId: order.id, lockInfo: { isLocked: false } }
        }
      })
      
      const results = await Promise.all(lockPromises)
      const locksMap: Record<string, any> = {}
      results.forEach(({ orderId, lockInfo }) => {
        locksMap[orderId] = lockInfo
      })
      setOrderLocks(locksMap)
    }

    // Check immediately
    checkAllLocks()
    
    // Then check every 3 seconds
    const interval = setInterval(checkAllLocks, 3000)
    
    return () => clearInterval(interval)
  }, [orders])

  // Cleanup lock polling on unmount
  useEffect(() => {
    return () => {
      stopLockStatusPolling()
    }
  }, [])

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false)
      }
    }

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportDropdown])

  // Reset to first page whenever filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterPayment, showArchived, showDrafts, filterStation, filterDateFrom, filterDateTo, filterStatus])
  
  // Clear all filters handler
  const handleClearAllFilters = () => {
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterStatus('All Status')
    setFilterPayment('All')
    setFilterStation('All')
    setSearchTerm('')
  }

  const openModal = async (order: Order) => {
    setSelectedOrder({ ...order })
    setIsModalOpen(true)
    setIsEditMode(false)
    setOriginalPayment(order.payment)
    setOriginalPaid(order.paid || 0)
    
    // Check lock status when opening modal and start polling immediately
    try {
      await checkLockStatus(order.id)
      // Start polling immediately when modal opens (for real-time updates)
      startLockStatusPolling(order.id)
    } catch (error) {
      console.error('Failed to check lock status:', error)
    }
  }

  const closeModal = async () => {
    // Release edit lock if in edit mode
    if (isEditMode && selectedOrder) {
      try {
        await orderAPI.releaseEditLock(selectedOrder.id)
      } catch (err) {
        console.error('Failed to release lock:', err)
      }
    }
    stopLockStatusPolling()
    
    setIsModalOpen(false)
    setSelectedOrder(null)
    setIsEditMode(false)
    setLockStatus(null)
  }

  // Start polling lock status
  const startLockStatusPolling = (orderId: string) => {
    // Clear any existing interval
    stopLockStatusPolling()
    
    // Check immediately
    checkLockStatus(orderId)
    
    // Then check every 2 seconds
    lockCheckIntervalRef.current = setInterval(() => {
      checkLockStatus(orderId)
    }, 2000)
  }

  // Stop polling lock status
  const stopLockStatusPolling = () => {
    if (lockCheckIntervalRef.current) {
      clearInterval(lockCheckIntervalRef.current)
      lockCheckIntervalRef.current = null
    }
  }

  // Check lock status
  const checkLockStatus = async (orderId: string) => {
    try {
      const response = await orderAPI.checkEditLock(orderId)
      // Update lock status - if not locked, set to null to hide indicator
      if (response.isLocked) {
        setLockStatus({
          isLocked: response.isLocked,
          lockedBy: response.lockedBy,
          isLockedByMe: response.isLockedByMe
        })
      } else {
        // Lock released - clear status
        setLockStatus(null)
      }
    } catch (error) {
      console.error('Failed to check lock status:', error)
    }
  }

  const handleUpdate = async () => {
    if (!selectedOrder) return
    
    // Check if order is completed and locked
    if ((selectedOrder as any)?.isCompleted) {
      toast.error('This order has been marked as completed and cannot be edited.')
      return
    }

    try {
      // Acquire edit lock before entering edit mode
      await orderAPI.acquireEditLock(selectedOrder.id)
      setIsEditMode(true)
      // Start checking lock status periodically
      startLockStatusPolling(selectedOrder.id)
    } catch (error: any) {
      console.error('Failed to acquire edit lock:', error)
      if (error.message?.includes('currently being edited')) {
        toast.error(error.message || 'This order is currently being edited by another user.')
      } else {
        toast.error('Failed to acquire edit lock. Please try again.')
      }
    }
  }

  const handleSave = async () => {
    if (!selectedOrder) return

    setIsLoading(true)
    
    try {
      // Validate payment when marking as Paid
      const totalAmountNum = parseFloat(String(selectedOrder.total).replace(/[^\d.]/g, '')) || 0
      let effectivePaid = selectedOrder.paid !== undefined ? selectedOrder.paid : 0
      if (isEditMode && selectedOrder.payment === 'Paid' && originalPayment !== 'Paid') {
        const finalNum = parseFloat(finalPaidInput || '0') || 0
        effectivePaid = originalPaid + finalNum
        if (effectivePaid < totalAmountNum) {
          toast.error('Cannot mark as Paid: amount paid is less than total.')
          setIsLoading(false)
          return
        }
      }
      // Prepare the data to send to the backend
      const updateData: any = {
        payment: selectedOrder.payment,
        notes: selectedOrder.notes || '',
        items: selectedOrder.items.map(item => ({
          service: item.service,
          quantity: item.quantity,
          amount: item.amount || 0,
          status: item.status || 'Pending'
        }))
      }

      // Calculate paid amount
      if (selectedOrder.payment === 'Paid') {
        if (originalPayment !== 'Paid') {
          updateData.paid = effectivePaid
          updateData.change = Math.max(0, effectivePaid - totalAmountNum)
        } else {
          // Already paid: keep existing amounts
          updateData.paid = originalPaid
        }
      } else if (selectedOrder.payment === 'Partial') {
        const addNum = parseFloat(partialPaidInput || '0') || 0
        const newPaid = Math.max(0, originalPaid + addNum)
        if (newPaid >= totalAmountNum) {
          toast.error('Partial payment cannot fully pay the order. Choose Paid instead.')
          setIsLoading(false)
          return
        }
        updateData.paid = newPaid
      } else if (selectedOrder.paid !== undefined) {
        updateData.paid = selectedOrder.paid
      } else {
        const balanceAmount = parseFloat(String(selectedOrder.balance || '₱0.00').replace(/[^\d.]/g, '')) || 0
        updateData.paid = Math.max(0, totalAmountNum - balanceAmount)
      }

      // Call the API to update the order in the database
      const response = await orderAPI.update(selectedOrder.id, updateData)
      
      // The API returns the updated order data
      // Backend returns either { success: true, order: {...} } or { success: true, data: {...} }
      const updatedOrder = response.order || response.data || response

      // Update local state with the response from the server (which includes recalculated totals)
      if (updatedOrder) {
        const mappedOrder: Order = {
          id: updatedOrder.id,
          date: new Date(updatedOrder.date).toLocaleDateString(),
          ...( { createdAt: updatedOrder.date } as any ),
          customer: updatedOrder.customer,
          customerPhone: updatedOrder.customerPhone || '',
          payment: updatedOrder.payment,
          total: updatedOrder.total,
          items: updatedOrder.items || [],
          discount: updatedOrder.discount || '0%',
          paid: updatedOrder.paid || 0,
          balance: updatedOrder.balance || '₱0.00',
          change: updatedOrder.change || 0,
          pickupDate: updatedOrder.pickupDate ? new Date(updatedOrder.pickupDate).toLocaleDateString() : undefined,
          deliveryDate: updatedOrder.deliveryDate ? new Date(updatedOrder.deliveryDate).toLocaleDateString() : undefined,
          notes: updatedOrder.notes || '',
          isArchived: updatedOrder.isArchived || false,
          isDraft: updatedOrder.isDraft || false,
          isCompleted: updatedOrder.isCompleted || false,
          stationId: updatedOrder.stationId || '',
          lastEditedBy: updatedOrder.lastEditedBy || undefined,
          lastEditedAt: updatedOrder.lastEditedAt ? new Date(updatedOrder.lastEditedAt) : undefined
        }
        setOrders(orders.map(o => o.id === selectedOrder.id ? mappedOrder : o))
        
        // Update selectedOrder in modal to reflect completed status and other changes
        setSelectedOrder({ ...selectedOrder, ...mappedOrder, isCompleted: updatedOrder.isCompleted || false } as any)
      } else {
        // Fallback to local update if response format is unexpected
        setOrders(orders.map(o => o.id === selectedOrder.id ? selectedOrder : o))
      }

      setIsEditMode(false)
      
      // Release edit lock after saving
      if (selectedOrder) {
        try {
          await orderAPI.releaseEditLock(selectedOrder.id)
        } catch (err) {
          console.error('Failed to release lock:', err)
        }
      }
      stopLockStatusPolling()
      
      toast.success('Order updated successfully!')
      
      // Don't close modal if order is completed - let user see the lock message
      if (!updatedOrder?.isCompleted) {
        closeModal()
      }
    } catch (error: any) {
      console.error('Error updating order:', error)
      toast.error(error.message || 'Failed to update order. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleArchive = async (orderId: string) => {
    if (!canArchiveOrders) {
      toast.error("You don't have permission to archive orders")
      return
    }
    try {
      await orderAPI.archive(orderId)
      setOrders(orders.map(o => o.id === orderId ? { ...o, isArchived: true } : o))
      toast.success('Order archived')
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive order')
    }
  }

  const handleUnarchive = async (orderId: string) => {
    if (!canUnarchiveOrders) {
      toast.error("You don't have permission to unarchive orders")
      return
    }
    try {
      await orderAPI.unarchive(orderId)
      setOrders(orders.map(o => o.id === orderId ? { ...o, isArchived: false } : o))
      toast.success('Order unarchived')
    } catch (error: any) {
      toast.error(error.message || 'Failed to unarchive order')
    }
  }

  const handleMarkDraftAsCompleted = async (orderId: string) => {
    try {
      const response = await orderAPI.markDraftAsCompleted(orderId)
      setOrders(orders.map(o => o.id === orderId ? { ...o, isCompleted: true, convertedOrderId: response.convertedOrderId } : o))
      toast.success(`Draft marked as completed (Order: ${response.convertedOrderId})`, { duration: 3000 })
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark draft as completed')
    }
  }

  const handleScheduleDraftDeletion = async (orderId: string) => {
    try {
      const response = await orderAPI.scheduleDraftDeletion(orderId)
      const deleteDate = response.scheduledDeleteAt ? new Date(response.scheduledDeleteAt).toLocaleDateString() : 'in 30 days'
      setOrders(orders.map(o => o.id === orderId ? { ...o, scheduledDeleteAt: response.scheduledDeleteAt } : o))
      toast.success(`Draft scheduled for deletion on ${deleteDate}`, { duration: 4000 })
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule draft deletion')
    }
  }

  const handleBulkArchive = async () => {
    if (!canArchiveOrders) {
      toast.error("You don't have permission to archive orders")
      return
    }
    if (selectedOrders.length === 0) {
      toast.error('No orders selected')
      return
    }
    try {
      await Promise.all(selectedOrders.map(id => orderAPI.archive(id)))
      setOrders(orders.map(o => selectedOrders.includes(o.id) ? { ...o, isArchived: true } : o))
      const archivedCount = selectedOrders.length
      setSelectedOrders([])
      toast.success(`${archivedCount} order${archivedCount === 1 ? '' : 's'} archived`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive orders')
    }
  }

  const handleBulkUnarchive = async () => {
    if (!canUnarchiveOrders) {
      toast.error("You don't have permission to unarchive orders")
      return
    }
    if (selectedOrders.length === 0) {
      toast.error('No orders selected')
      return
    }
    try {
      await Promise.all(selectedOrders.map(id => orderAPI.unarchive(id)))
      setOrders(orders.map(o => selectedOrders.includes(o.id) ? { ...o, isArchived: false } : o))
      const unarchivedCount = selectedOrders.length
      setSelectedOrders([])
      toast.success(`${unarchivedCount} order${unarchivedCount === 1 ? '' : 's'} unarchived`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to unarchive orders')
    }
  }

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map(o => o.id))
    }
  }

  const getPaymentBadgeClass = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'order-status-badge order-status-paid'
      case 'Partial':
        return 'order-status-badge order-status-partial'
      default:
        return 'order-status-badge order-status-unpaid'
    }
  }

  const filteredOrders = orders.filter(order => {
    // Draft filtering - if showDrafts is true, only show drafts
    if (showDrafts && !(order as any).isDraft) return false
    if (!showDrafts && (order as any).isDraft) return false
    
    // Archive filtering (only when not viewing drafts)
    if (!showDrafts) {
      if (!showArchived && order.isArchived) return false
      if (showArchived && !order.isArchived) return false
    }
    
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPayment = filterPayment === 'All' || order.payment === filterPayment
    const matchesStation = filterStation === 'All' || 
                          order.stationId === filterStation ||
                          (filterStation === 'No Station' && !order.stationId)
    
    // Date filtering
    let matchesDate = true
    if (filterDateFrom || filterDateTo) {
      // Use createdAt if available (original date), otherwise parse the formatted date string
      const orderDateRaw = (order as any).createdAt || (order as any).date
      let orderDate: Date
      if (orderDateRaw instanceof Date) {
        orderDate = orderDateRaw
      } else if (typeof orderDateRaw === 'string') {
        // Try to parse the date string
        orderDate = new Date(orderDateRaw)
        // If parsing failed, try to parse the formatted date (MM/DD/YYYY)
        if (isNaN(orderDate.getTime())) {
          const parts = orderDateRaw.split('/')
          if (parts.length === 3) {
            orderDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]))
          } else {
            orderDate = new Date(orderDateRaw)
          }
        }
      } else {
        orderDate = new Date(orderDateRaw)
      }
      
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom)
        fromDate.setHours(0, 0, 0, 0)
        const orderDateStart = new Date(orderDate)
        orderDateStart.setHours(0, 0, 0, 0)
        if (orderDateStart < fromDate) matchesDate = false
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo)
        toDate.setHours(23, 59, 59, 999)
        if (orderDate > toDate) matchesDate = false
      }
    }
    
    // Status filtering (check if any item in the order matches the status)
    let matchesStatus = true
    if (filterStatus !== 'All Status') {
      const orderItems = order.items || []
      if (filterStatus === 'Pending') {
        matchesStatus = orderItems.some((item: any) => (item.status || 'Pending') === 'Pending')
      } else if (filterStatus === 'In Progress') {
        matchesStatus = orderItems.some((item: any) => (item.status || 'Pending') === 'In Progress')
      } else if (filterStatus === 'Completed') {
        matchesStatus = orderItems.some((item: any) => (item.status || 'Pending') === 'Completed') || (order as any).isCompleted
      }
    }
    
    return matchesSearch && matchesPayment && matchesStation && matchesDate && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = (safeCurrentPage - 1) * pageSize
  const pagedOrders = filteredOrders.slice(pageStart, pageStart + pageSize)

  const renderPageNumbers = () => {
    const pages: number[] = []
    const maxButtons = 5
    let start = Math.max(1, safeCurrentPage - 2)
    let end = Math.min(totalPages, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    for (let p = start; p <= end; p++) pages.push(p)
    return (
      <>
        {pages.map(p => (
          <button
            key={p}
            className={`pagination-btn ${p === safeCurrentPage ? 'active' : ''}`}
            onClick={() => setCurrentPage(p)}
          >
            {p}
          </button>
        ))}
      </>
    )
  }

  // Print receipt function
  const handlePrintReceipt = async (order: Order) => {
    try {
      // Fetch station information - check multiple possible locations for stationId
      let stationInfo = null
      const orderStationId = (order as any).stationId || null
      
      if (orderStationId) {
        try {
          const stations = await stationAPI.getAll({ showArchived: false })
          const stationsArray = Array.isArray(stations) ? stations : (stations.data || stations || [])
          const stationIdToMatch = String(orderStationId).toUpperCase().trim()
          stationInfo = stationsArray.find((s: any) => {
            const stationStationId = String(s.stationId || '').toUpperCase().trim()
            const stationId = String(s._id || s.id || '').toUpperCase().trim()
            return stationStationId === stationIdToMatch || stationId === stationIdToMatch
          })
          if (stationInfo) {
            console.log('Admin receipt - Station found:', stationInfo)
          } else {
            console.warn('Admin receipt - Station not found for stationId:', orderStationId)
          }
        } catch (stationError) {
          console.warn('Admin receipt - Could not fetch station info:', stationError)
        }
      }
      
      // Calculate subtotal from items
      const subtotal = order.items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
      
      // Calculate discount amount
      let discountAmount = 0
      let discountCode = order.discount || '0%'
      if (order.discount && order.discount !== '0%') {
        const discountMatch = String(order.discount).match(/(\d+(?:\.\d+)?)/)
        if (discountMatch && String(order.discount).includes('%')) {
          discountAmount = subtotal * (parseFloat(discountMatch[1]) / 100)
          discountCode = `${discountMatch[1]}%`
        } else if (discountMatch) {
          discountAmount = parseFloat(discountMatch[1])
          discountCode = `₱${discountMatch[1]}`
        }
      }
      
      const total = subtotal - discountAmount
      const paid = typeof (order as any).paid === 'number' 
        ? (order as any).paid 
        : parseFloat(String((order as any).paid || '0').replace(/[^\d.]/g, '')) || 0
      const balance = total - paid
      const change = balance < 0 ? Math.abs(balance) : 0
      const balanceDue = balance > 0 ? balance : 0
      
      // Format dates
      const orderDate = new Date(order.date || Date.now())
      const formattedDate = orderDate.toLocaleDateString()
      const formattedTime = orderDate.toLocaleTimeString()
      
      // Generate service items HTML
      const serviceItems = order.items.map((item: any) => `
        <div class="service-item">
          <span class="service-name">${item.service} (${item.quantity})</span>
          <span class="service-price">₱${Number(item.amount || 0).toFixed(2)}</span>
        </div>
      `).join('')

      const receiptContent = `
        <div class="order-receipt">
          <div class="receipt-header">
            <div class="company-info">
              <div class="company-logo">
                <svg width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#60A5FA" />
                      <stop offset="100%" stop-color="#2563EB" />
                    </linearGradient>
                    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#E0F2FE" />
                      <stop offset="100%" stop-color="#BFDBFE" />
                    </linearGradient>
                  </defs>
                  <rect x="4" y="6" width="56" height="48" rx="14" fill="url(#bg)" />
                  <g transform="translate(14,14)">
                    <rect x="0" y="0" width="36" height="30" rx="6" fill="#F8FAFC" />
                    <rect x="0.75" y="0.75" width="34.5" height="28.5" rx="5.25" stroke="#94A3B8" stroke-width="1.5" fill="none" />
                    <circle cx="6" cy="6" r="2" fill="#F59E0B" />
                    <circle cx="12" cy="6" r="2" fill="#F59E0B" fill-opacity="0.6" />
                    <circle cx="20" cy="18" r="9.5" fill="url(#glass)" stroke="#60A5FA" stroke-width="2" />
                    <circle cx="20" cy="18" r="6.5" fill="#E8F1FF" fill-opacity="0.6" />
                    <circle cx="18" cy="17" r="1.2" fill="#0F172A" />
                    <circle cx="22" cy="17" r="1.2" fill="#0F172A" />
                    <path d="M17 20c1.2 1 3.8 1 5 0" stroke="#0F172A" stroke-width="1.5" stroke-linecap="round" />
                  </g>
                  <g fill="#E0F2FE">
                    <circle cx="15" cy="14" r="3" />
                    <circle cx="22" cy="10" r="2" />
                    <circle cx="50" cy="12" r="2.4" />
                    <circle cx="48" cy="50" r="2.8" />
                  </g>
                </svg>
              </div>
              <div class="company-details">
                <h2>Sparklean Laundry Shop${stationInfo?.name ? ` - ${stationInfo.name}` : ''}</h2>
                <p>${stationInfo?.address || '123 Laundry Street, Clean City'}</p>
                <p>${stationInfo?.phone ? `Phone: ${stationInfo.phone}` : 'Phone: +63 912 345 6789'}</p>
              </div>
            </div>
            <div class="receipt-info">
              <h3>ORDER RECEIPT</h3>
              <p>Date: ${formattedDate}</p>
              <p>Time: ${formattedTime}</p>
            </div>
          </div>

          <div class="receipt-content">
            <div class="customer-section">
              <h4>Customer</h4>
              <p><strong>${order.customer}</strong></p>
              <p>${order.customerPhone || 'N/A'}</p>
            </div>

            <div class="service-section">
              <h4>Service Details</h4>
              ${serviceItems}
            </div>

            <div class="payment-section">
              <div class="payment-row">
                <span>Subtotal:</span>
                <span>₱${subtotal.toFixed(2)}</span>
              </div>
              ${discountAmount > 0 ? `
                <div class="payment-row">
                  <span>Discount${discountCode ? ` (${discountCode})` : ''}:</span>
                  <span>-₱${discountAmount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="payment-row total">
                <span>Total:</span>
                <span>₱${total.toFixed(2)}</span>
              </div>
              <div class="payment-row">
                <span>Paid:</span>
                <span>₱${paid.toFixed(2)}</span>
              </div>
              ${change > 0 ? `
                <div class="payment-row change">
                  <span>Change Due:</span>
                  <span>₱${change.toFixed(2)}</span>
                </div>
              ` : balanceDue > 0 ? `
                <div class="payment-row balance">
                  <span>Balance Due:</span>
                  <span>₱${balanceDue.toFixed(2)}</span>
                </div>
              ` : `
                <div class="payment-row paid">
                  <span>Status:</span>
                  <span>Fully Paid ✓</span>
                </div>
              `}
            </div>

            <div class="status-section">
              <p><strong>Status:</strong> ${order.payment}</p>
              ${order.pickupDate ? `<p><strong>Pickup:</strong> ${order.pickupDate}</p>` : ''}
              ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
            </div>
          </div>

          <div class="receipt-footer">
            <p>Thank you for your business!</p>
            <p>Keep this receipt for your records</p>
          </div>
        </div>
      `

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            <title>Receipt Preview - Sparklean Laundry Shop</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: 'Arial', sans-serif;
                background: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                min-height: 100vh;
              }
              .preview-container {
                background: var(--color-white);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                padding: 20px;
                max-width: 400px;
              }
              .preview-header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #007bff;
              }
              .preview-title {
                font-size: 18px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
              }
              .preview-subtitle {
                font-size: 14px;
                color: #666;
                margin-bottom: 15px;
              }
              .print-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-bottom: 20px;
              }
              .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                transition: all 0.2s ease;
              }
              .btn-primary {
                background: #007bff;
                color: white;
              }
              .btn-primary:hover {
                background: #0056b3;
              }
              .receipt-preview {
                border: 2px solid #000;
                background: var(--color-white);
                transform: scale(0.8);
                transform-origin: top center;
                margin: 0 auto;
              }
              .order-receipt {
                width: 80mm;
                padding: 5mm;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.2;
                box-sizing: border-box;
              }
              .receipt-header {
                text-align: center;
                margin-bottom: 5mm;
                padding-bottom: 3mm;
                border-bottom: 1px dashed #000;
              }
              .company-info {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: 3mm;
              }
              .company-logo {
                margin-bottom: 2mm;
              }
              .company-details h2 {
                font-size: 14px;
                font-weight: bold;
                margin: 0 0 1mm 0;
              }
              .company-details p {
                font-size: 10px;
                margin: 0;
              }
              .receipt-info h3 {
                font-size: 16px;
                font-weight: bold;
                margin: 2mm 0;
              }
              .receipt-info p {
                font-size: 10px;
                margin: 0;
              }
              .receipt-content {
                margin-bottom: 5mm;
              }
              .customer-section, .service-section, .payment-section, .status-section {
                margin-bottom: 3mm;
              }
              .customer-section h4, .service-section h4 {
                font-size: 11px;
                font-weight: bold;
                margin: 0 0 1mm 0;
                text-transform: uppercase;
              }
              .customer-section p {
                font-size: 10px;
                margin: 0;
              }
              .service-item {
                display: flex;
                justify-content: space-between;
                padding: 1mm 0;
                border-bottom: 1px dotted #000;
              }
              .service-name {
                font-size: 10px;
              }
              .service-price {
                font-size: 10px;
                font-weight: bold;
              }
              .payment-row {
                display: flex;
                justify-content: space-between;
                padding: 0.5mm 0;
                font-size: 10px;
              }
              .payment-row.total {
                font-weight: bold;
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
                padding: 1mm 0;
                margin: 1mm 0;
              }
              .payment-row.balance {
                font-weight: bold;
                background: #f0f0f0;
                padding: 1mm;
                margin-top: 1mm;
              }
              .payment-row.change {
                font-weight: bold;
                background: #d1fae5;
                padding: 1mm;
                margin-top: 1mm;
                color: #059669;
              }
              .payment-row.paid {
                font-weight: bold;
                background: #d1fae5;
                padding: 1mm;
                margin-top: 1mm;
                color: #059669;
              }
              .status-section p {
                font-size: 9px;
                margin: 0.5mm 0;
              }
              .receipt-footer {
                text-align: center;
                padding-top: 3mm;
                border-top: 1px dashed #000;
              }
              .receipt-footer p {
                font-size: 9px;
                margin: 0.5mm 0;
              }
              @media print {
                .no-print { display: none !important; }
                body { background: #FFFFFF; padding: 0; }
                .preview-container { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="preview-container no-print">
              <div class="preview-header">
                <div class="preview-title">🖨️ Receipt Preview</div>
                <div class="preview-subtitle">This is how your receipt will look when printed</div>
                <div class="print-buttons">
                  <button class="btn btn-primary" onclick="printReceipt()">🖨️ Print Now</button>
                </div>
              </div>
            </div>
            <div class="receipt-preview">
              ${receiptContent}
            </div>
            <script>
              function printReceipt() {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  const receiptContent = document.querySelector('.receipt-preview').innerHTML;
                  printWindow.document.write(\`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Receipt</title>
                      <style>
                        @page {
                          size: 80mm 200mm;
                          margin: 0;
                        }
                        body {
                          margin: 0;
                          padding: 0;
                          font-family: 'Courier New', monospace;
                          font-size: 12px;
                          line-height: 1.2;
                          width: 80mm;
                        }
                        .order-receipt {
                          width: 80mm;
                          padding: 5mm;
                          box-sizing: border-box;
                        }
                        .receipt-header {
                          text-align: center;
                          margin-bottom: 5mm;
                          padding-bottom: 3mm;
                          border-bottom: 1px dashed #000;
                        }
                        .company-info {
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          margin-bottom: 3mm;
                        }
                        .company-logo {
                          margin-bottom: 2mm;
                        }
                        .company-details h2 {
                          font-size: 14px;
                          font-weight: bold;
                          margin: 0 0 1mm 0;
                        }
                        .company-details p {
                          font-size: 10px;
                          margin: 0;
                        }
                        .receipt-info h3 {
                          font-size: 16px;
                          font-weight: bold;
                          margin: 2mm 0;
                        }
                        .receipt-info p {
                          font-size: 10px;
                          margin: 0;
                        }
                        .receipt-content {
                          margin-bottom: 5mm;
                        }
                        .customer-section, .service-section, .payment-section, .status-section {
                          margin-bottom: 3mm;
                        }
                        .customer-section h4, .service-section h4 {
                          font-size: 11px;
                          font-weight: bold;
                          margin: 0 0 1mm 0;
                          text-transform: uppercase;
                        }
                        .customer-section p {
                          font-size: 10px;
                          margin: 0;
                        }
                        .service-item {
                          display: flex;
                          justify-content: space-between;
                          padding: 1mm 0;
                          border-bottom: 1px dotted #000;
                        }
                        .service-name {
                          font-size: 10px;
                        }
                        .service-price {
                          font-size: 10px;
                          font-weight: bold;
                        }
                        .payment-row {
                          display: flex;
                          justify-content: space-between;
                          padding: 0.5mm 0;
                          font-size: 10px;
                        }
                        .payment-row.total {
                          font-weight: bold;
                          border-top: 1px solid #000;
                          border-bottom: 1px solid #000;
                          padding: 1mm 0;
                          margin: 1mm 0;
                        }
                        .payment-row.balance {
                          font-weight: bold;
                          background: #f0f0f0;
                          padding: 1mm;
                          margin-top: 1mm;
                        }
                        .payment-row.change {
                          font-weight: bold;
                          background: #d1fae5;
                          padding: 1mm;
                          margin-top: 1mm;
                          color: #059669;
                        }
                        .payment-row.paid {
                          font-weight: bold;
                          background: #d1fae5;
                          padding: 1mm;
                          margin-top: 1mm;
                          color: #059669;
                        }
                        .status-section p {
                          font-size: 9px;
                          margin: 0.5mm 0;
                        }
                        .receipt-footer {
                          text-align: center;
                          padding-top: 3mm;
                          border-top: 1px dashed #000;
                        }
                        .receipt-footer p {
                          font-size: 9px;
                          margin: 0.5mm 0;
                        }
                      </style>
                    </head>
                    <body>
                      \${receiptContent}
                    </body>
                    </html>
                  \`);
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                  printWindow.close();
                }
              }
            </script>
          </body>
        </html>
      `

      // Open preview window
      const preview = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes')
      if (!preview) {
        toast.error('Please allow popups to print receipts')
        return
      }

      preview.document.write(html)
      preview.document.close()
      preview.focus()
      
      toast.success('Receipt preview opened')
    } catch (error: any) {
      console.error('Error printing receipt:', error)
      toast.error('Failed to print receipt: ' + (error.message || 'Unknown error'))
    }
  }

  // Export functions
  const handleExport = async (format: 'CSV' | 'Excel' | 'PDF') => {
    const ordersToExport = selectedOrders.length > 0 
      ? orders.filter(order => selectedOrders.includes(order.id))
      : filteredOrders

    if (ordersToExport.length === 0) {
      toast.error('No orders to export')
      return
    }

    // Build filename with station name if filter is active
    let filenamePrefix = 'orders'
    if (filterStation !== 'All' && !selectedOrders.length) {
      const selectedStation = stations.find(s => (s.stationId || s._id || s.id) === filterStation)
      const stationName = selectedStation?.name || selectedStation?.stationName || filterStation
      // Sanitize station name for filename (remove special characters)
      const sanitizedStationName = stationName.replace(/[^a-zA-Z0-9]/g, '_')
      filenamePrefix = `${sanitizedStationName}_orders`
    }
    const filename = getExportFilename(filenamePrefix)
    
    try {
      // Try new system first
      try {
        await exportOrdersDirect(ordersToExport, format as ExportFormat, filename)
        const exportType = selectedOrders.length > 0 ? 'selected' : 'filtered'
        toast.success(`${ordersToExport.length} ${exportType} orders exported as ${format}`)
        setShowExportDropdown(false)
        return
      } catch (newSystemError: any) {
        // Fallback to old system
        console.warn('New export system failed, using fallback:', newSystemError)
      }

      // Fallback to old system
      switch (format) {
        case 'CSV':
          exportToCSV(ordersToExport, filename)
          break
        case 'Excel':
          exportToExcel(ordersToExport, filename)
          break
        case 'PDF':
          await exportToPDF(ordersToExport, filename)
          break
      }
      
      const exportType = selectedOrders.length > 0 ? 'selected' : 'filtered'
      toast.success(`${ordersToExport.length} ${exportType} orders exported as ${format}`)
      setShowExportDropdown(false)
    } catch (error) {
      toast.error('Export failed. Please try again.')
      console.error('Export error:', error)
    }
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="order-management-wrapper"
      >
        {/* Header */}
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">📋 {showDrafts ? 'Draft Orders' : 'Order Management'}</h1>
            <p className="page-subtitle">
              {showDrafts ? 'View and manage draft orders' : 'View and manage all orders'}
            </p>
          </div>
          <div className="header-actions">
            {selectedOrders.length > 0 && (
              <motion.div 
                className="bulk-actions"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <span className="selected-count">{selectedOrders.length} selected</span>
                {!showDrafts && (
                  <>
                    {showArchived
                      ? (canUnarchiveOrders && (
                        <Button variant="secondary" onClick={handleBulkUnarchive}>
                          <FiRotateCw />
                          Unarchive
                        </Button>
                      ))
                      : (canArchiveOrders && (
                        <Button variant="secondary" onClick={handleBulkArchive}>
                          <FiArchive />
                          Archive
                        </Button>
                      ))}
                  </>
                )}
                {showDrafts && (
                  <Button variant="secondary" onClick={async () => {
                    if (selectedOrders.length === 0) {
                      toast.error('No drafts selected')
                      return
                    }
                    try {
                      await Promise.all(selectedOrders.map(id => orderAPI.delete(id)))
                      setOrders(orders.filter(o => !selectedOrders.includes(o.id)))
                      const deletedCount = selectedOrders.length
                      setSelectedOrders([])
                      toast.success(`${deletedCount} draft${deletedCount === 1 ? '' : 's'} deleted`)
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to delete drafts')
                    }
                  }}>
                    <FiX /> Delete Selected
                  </Button>
                )}
              </motion.div>
            )}
            <Button 
              variant="icon" 
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              ariaLabel="Refresh data"
              title="Refresh data"
            >
              <FiRotateCw style={{ 
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                display: 'inline-block'
              }} />
            </Button>
            <div className="export-dropdown" ref={exportDropdownRef}>
              <Button onClick={() => setShowExportDropdown(!showExportDropdown)}>
                <FiDownload /> Export <FiChevronDown />
              </Button>
              {showExportDropdown && (
                <motion.div 
                  className="export-dropdown-menu"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="export-header">
                    <span>Export {selectedOrders.length > 0 ? 'Selected' : 'Filtered'} Orders</span>
                    <small>{selectedOrders.length > 0 ? selectedOrders.length : filteredOrders.length} orders</small>
                  </div>
                  <div className="export-options">
                    <button onClick={() => handleExport('CSV')} className="export-option">
                      <FiFileText /> CSV Format
                    </button>
                    <button onClick={() => handleExport('Excel')} className="export-option">
                      <FiFileText /> Excel Format
                    </button>
                    <button onClick={() => handleExport('PDF')} className="export-option">
                      <FiFileText /> PDF Format
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
            {!showDrafts && (
              <Button 
                variant="primary"
                onClick={() => {
                  setDraftOrderIdForModal(null)
                  setIsCreateOrderModalOpen(true)
                }}
                style={{ marginLeft: '8px' }}
              >
                <FiPlus /> Create Order
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="search-filter-bar">
          <div className="search-box-large">
            <FiSearch className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by order ID or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <FiX />
              </button>
            )}
          </div>

          <div className="filter-actions">
            <select
              className="filter-select"
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
              title="Filter by Station/Branch"
            >
              <option value="All">All Stations</option>
              <option value="No Station">No Station</option>
              {stations.map((station: any) => {
                const stationId = station.stationId || station._id || station.id
                const stationName = station.name || stationId
                return (
                  <option key={stationId} value={stationId}>
                    {stationName} ({stationId})
                  </option>
                )
              })}
            </select>
            <select
              className="filter-select"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            >
              <option>All Payments</option>
              <option>Paid</option>
              <option>Unpaid</option>
              <option>Partial</option>
            </select>
            <button
              className={`archive-toggle-btn drafts-toggle ${showDrafts ? 'active' : ''}`}
              onClick={() => {
                setShowDrafts(!showDrafts)
                if (!showDrafts) {
                  setShowArchived(false) // Turn off archived when viewing drafts
                  setSelectedOrders([]) // Clear selections when switching views
                }
              }}
              title={showDrafts ? 'Show All Orders' : 'Show Drafts Only'}
            >
              <FiSave size={16} />
              <span>{showDrafts ? 'All Orders' : 'Drafts'}</span>
            </button>
            {!showDrafts && (
              <button
                className={`archive-toggle-btn ${showArchived ? 'active' : ''}`}
                onClick={() => setShowArchived(!showArchived)}
                title={showArchived ? 'Show Active' : 'Show Archived'}
              >
                <FiFolder size={16} />
                <span>{showArchived ? 'Archived' : 'Active'}</span>
              </button>
            )}
            <button 
              className={`filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <FiFilter /> Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters (Collapsible) */}
        {showFilters && (
          <motion.div
            className="advanced-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="filter-grid">
              <div className="filter-group">
                <label>Date From</label>
                <input 
                  type="date" 
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Date To</label>
                <input 
                  type="date" 
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option>All Status</option>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </div>
              <div className="filter-group filter-group-button">
                <Button variant="secondary" onClick={handleClearAllFilters}>Clear All</Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filter Chips */}
        {(filterPayment !== 'All' || filterStation !== 'All' || filterStatus !== 'All Status' || filterDateFrom || filterDateTo || searchTerm) && (
          <FilterChips
            filters={[
              ...(filterPayment !== 'All' ? [{
                label: `Payment: ${filterPayment}`,
                value: 'payment',
                variant: 'primary' as const
              }] : []),
              ...(filterStation !== 'All' ? [{
                label: `Station: ${stations.find(s => (s.stationId || s._id || s.id) === filterStation)?.name || filterStation}`,
                value: 'station',
                variant: 'primary' as const
              }] : []),
              ...(filterStatus !== 'All Status' ? [{
                label: `Status: ${filterStatus}`,
                value: 'status',
                variant: 'default' as const
              }] : []),
              ...(filterDateFrom || filterDateTo ? [{
                label: `Date: ${filterDateFrom || '...'} to ${filterDateTo || '...'}`,
                value: 'date',
                variant: 'default' as const
              }] : []),
              ...(searchTerm ? [{
                label: `Search: "${searchTerm}"`,
                value: 'search',
                variant: 'default' as const
              }] : [])
            ]}
            onRemove={(value) => {
              if (value === 'payment') setFilterPayment('All')
              if (value === 'station') setFilterStation('All')
              if (value === 'status') setFilterStatus('All Status')
              if (value === 'date') {
                setFilterDateFrom('')
                setFilterDateTo('')
              }
              if (value === 'search') setSearchTerm('')
            }}
            onClearAll={handleClearAllFilters}
          />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState
            title="Failed to load orders"
            message={error.message || 'An error occurred while loading orders. Please try again.'}
            error={error}
            onRetry={() => {
              setError(null)
              fetchOrders()
            }}
            variant="network"
          />
        )}

        {/* Orders Table */}
        {!error && (
        <div className="orders-table-container">
          <div className="table-header-info">
            <div className="table-count">
              <span className="count-label">Showing</span>
              <span className="count-number">{filteredOrders.length}</span>
              <span className="count-label">
              {showDrafts 
                  ? (filteredOrders.length === 1 ? 'draft' : 'drafts')
                  : (filteredOrders.length === 1 ? 'order' : 'orders')
              }
                {filterStation !== 'All' && !showDrafts && ` in ${stations.find(s => (s.stationId || s._id || s.id) === filterStation)?.name || filterStation}`}
              </span>
            </div>
            <div className="table-actions">
              <label className="select-all-label">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                  onChange={toggleSelectAll}
                />
                Select All
              </label>
            </div>
          </div>

            {isLoading ? (
              <TableSkeleton rows={5} columns={8} />
            ) : filteredOrders.length === 0 ? (
              <EmptyState
                icon={<FiPackage />}
                title={showDrafts ? 'No drafts found' : searchTerm || filterPayment !== 'All' || filterStation !== 'All' || filterStatus !== 'All Status' || filterDateFrom || filterDateTo ? 'No orders found' : 'No orders yet'}
                description={
                  showDrafts
                    ? 'You don\'t have any draft orders. Create a new order to get started.'
                    : searchTerm || filterPayment !== 'All' || filterStation !== 'All' || filterStatus !== 'All Status' || filterDateFrom || filterDateTo
                    ? 'Try adjusting your search or filter criteria to find orders.'
                    : 'Start by creating your first order to begin managing your laundry business.'
                }
                actionLabel={showDrafts ? undefined : (searchTerm || filterPayment !== 'All' || filterStation !== 'All' || filterStatus !== 'All Status' || filterDateFrom || filterDateTo) ? undefined : 'Create Order'}
                onAction={showDrafts ? undefined : (searchTerm || filterPayment !== 'All' || filterStation !== 'All' || filterStatus !== 'All Status' || filterDateFrom || filterDateTo) ? undefined : () => {
                  setDraftOrderIdForModal(null)
                  setIsCreateOrderModalOpen(true)
                }}
                type={searchTerm || filterPayment !== 'All' || filterStation !== 'All' || filterStatus !== 'All Status' || filterDateFrom || filterDateTo ? 'no-results' : 'empty'}
              />
            ) : (
              <>
          <div className="table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Station</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`${selectedOrders.includes(order.id) ? 'selected' : ''} ${order.isArchived ? 'archived' : ''} ${(order as any).isDraft ? 'draft' : ''} ${(order as any).isQueued ? 'queued' : ''}`}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="order-id">
                          {order.id}
                          {(order as any).isQueued && (
                            <span className="queued-badge" title="Pending Sync - Will be uploaded when online" style={{ 
                              background: '#FEF3C7', 
                              color: '#92400E', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '10px', 
                              fontWeight: '600',
                              marginLeft: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <FiClock size={12} />
                              Queued
                            </span>
                          )}
                          {(order as any).isDraft && (
                            <span className="draft-badge" title="Draft Order">📝</span>
                          )}
                          {(order as any).isCompleted && (
                            <span className="completed-badge" title={`Draft Completed - Order: ${(order as any).convertedOrderId || 'N/A'}`}>
                              <FiCheckCircle size={14} />
                            </span>
                          )}
                          {(order as any).convertedOrderId && !(order as any).isCompleted && (
                            <span className="converted-badge" title={`Converted to Order: ${(order as any).convertedOrderId}`}>
                              🔗
                            </span>
                          )}
                        </span>
                        {(order as any).convertedOrderId && (
                          <div className="converted-order-info">
                            → Order: {(order as any).convertedOrderId}
                          </div>
                        )}
                        {(order as any).scheduledDeleteAt && (
                          <div className="scheduled-deletion-info">
                            <FiClock size={12} />
                            <span>Deletes: {new Date((order as any).scheduledDeleteAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{order.date}</td>
                    <td>
                      <div className="customer-cell">
                        <div className="customer-avatar">
                          {order.customer.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <span className="customer-name">{order.customer}</span>
                      </div>
                    </td>
                    <td>
                      <span className="stat-value" style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '13px',
                        color: order.stationId ? '#2563EB' : '#6B7280'
                      }}>
                        {order.stationId || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span className={getPaymentBadgeClass(order.payment)}>
                        {order.payment}
                      </span>
                        {order.payment === 'Paid' && (
                          <span style={{ 
                            fontSize: '11px', 
                            color: order.change && order.change > 0 ? '#059669' : '#6B7280', 
                            fontWeight: '500',
                            marginTop: '2px'
                          }}>
                            Change: ₱{(order.change || 0).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="amount">{order.total}</span>
                    </td>
                    <td>
                      <div className="action-buttons-row">
                        <button
                          className="btn-icon-small"
                          onClick={() => openModal(order)}
                          title="View Details"
                        >
                          <FiEye />
                        </button>
                        {order.id?.includes('DRAFT') || (order as any).isDraft ? (
                          <>
                            {!(order as any).isCompleted && (
                              <button
                                className="btn-icon-small edit"
                                onClick={() => {
                                  setDraftOrderIdForModal(order.id)
                                  setIsCreateOrderModalOpen(true)
                                }}
                                title="Continue Draft"
                              >
                                <FiEdit2 />
                              </button>
                            )}
                            {(order as any).convertedOrderId && !(order as any).isCompleted && (
                              <button
                                className="btn-icon-small completed"
                                onClick={() => handleMarkDraftAsCompleted(order.id)}
                                title="Mark as Completed"
                              >
                                <FiCheckCircle />
                              </button>
                            )}
                            {!(order as any).convertedOrderId && (
                              <button
                                className="btn-icon-small"
                                disabled
                                title="Mark as Completed (only available after order is created)"
                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                              >
                                <FiCheckCircle />
                              </button>
                            )}
                            {!(order as any).scheduledDeleteAt && (
                              <button
                                className="btn-icon-small archive"
                                onClick={() => handleScheduleDraftDeletion(order.id)}
                                title="Schedule Deletion (30 days)"
                              >
                                <FiArchive />
                              </button>
                            )}
                            {(order as any).scheduledDeleteAt && (
                              <button
                                className="btn-icon-small delete"
                                onClick={() => {}}
                                title={`Scheduled for deletion on ${new Date((order as any).scheduledDeleteAt).toLocaleDateString()}`}
                                disabled
                              >
                                <FiClock />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-icon-small edit"
                              onClick={async () => {
                                // Check if order is locked
                                const lockInfo = orderLocks[order.id]
                                if (lockInfo?.isLocked && !lockInfo?.isLockedByMe) {
                                  toast.error(`This order is being edited by ${lockInfo.lockedBy?.name || 'another user'}`)
                                  return
                                }
                                
                                // Try to acquire lock before opening edit mode
                                try {
                                  await orderAPI.acquireEditLock(order.id)
                                  openModal(order)
                                  setTimeout(() => setIsEditMode(true), 100)
                                } catch (error: any) {
                                  if (error.message?.includes('currently being edited')) {
                                    toast.error(error.message || 'This order is currently being edited by another user.')
                                  } else {
                                    toast.error('Failed to acquire edit lock. Please try again.')
                                  }
                                }
                              }}
                              disabled={orderLocks[order.id]?.isLocked && !orderLocks[order.id]?.isLockedByMe}
                              title={orderLocks[order.id]?.isLocked && !orderLocks[order.id]?.isLockedByMe 
                                ? `This order is being edited by ${orderLocks[order.id].lockedBy?.name || 'another user'}` 
                                : 'Edit'}
                              style={orderLocks[order.id]?.isLocked && !orderLocks[order.id]?.isLockedByMe 
                                ? { opacity: 0.4, cursor: 'not-allowed' } 
                                : {}}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="btn-icon-small invoice"
                              onClick={() => navigate(`/invoice/${encodeURIComponent(order.id)}`)}
                              title="View Invoice"
                            >
                              <FiFileText />
                            </button>
                            <button
                              className="btn-icon-small"
                              onClick={() => handlePrintReceipt(order)}
                              title="Print Receipt"
                            >
                              <FiPrinter />
                            </button>
                            {((showArchived && canUnarchiveOrders) || (!showArchived && canArchiveOrders)) && (
                              <button
                                className={`btn-icon-small ${showArchived ? 'restore' : 'delete'}`}
                                onClick={() => showArchived ? handleUnarchive(order.id) : handleArchive(order.id)}
                                title={showArchived ? 'Unarchive' : 'Archive'}
                              >
                                {showArchived ? <FiRotateCw /> : <FiArchive />}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
                  {filteredOrders.length > pageSize && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              aria-label="Previous Page"
            >
              ‹
            </button>
            {renderPageNumbers()}
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              aria-label="Next Page"
            >
              ›
            </button>
          </div>
                  )}
                </>
              )}
        </div>
        )}

        {/* Order Details Modal */}
        {isModalOpen && selectedOrder && (
          <div className="modal-overlay" onClick={closeModal}>
            <motion.div
              className="modal-large"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">Order Details - {selectedOrder.id}</h3>
                <button className="btn-icon" onClick={closeModal}>
                  <FiX />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="details-grid-2">
                  <div className="detail-card">
                    <label>Order ID</label>
                    <div className="detail-value">{selectedOrder.id}</div>
                  </div>
                  <div className="detail-card">
                    <label>Order Date</label>
                    <div className="detail-value">
                      {selectedOrder.date}
                      {(() => {
                        const src = (selectedOrder as any).createdAt || selectedOrder.date
                        try {
                          const t = new Date(src)
                          return ` • ${t.toLocaleTimeString()}`
                        } catch {
                          return ''
                        }
                      })()}
                    </div>
                  </div>
                  <div className="detail-card">
                    <label>Customer Name</label>
                    <div className="detail-value">{selectedOrder.customer}</div>
                  </div>
                  <div className="detail-card">
                    <label>Total Amount</label>
                    <div className="detail-value amount">{selectedOrder.total}</div>
                  </div>
                  <div className="detail-card">
                    <label>Payment Status</label>
                    <select
                      disabled={
                        !isEditMode ||
                        (selectedOrder as any)?.isCompleted ||
                        selectedOrder.payment === 'Paid' ||
                        (lockStatus?.isLocked && !lockStatus?.isLockedByMe)
                      }
                      value={selectedOrder.payment}
                      onChange={(e) => {
                        const newPayment = e.target.value as any
                        setSelectedOrder({ ...selectedOrder, payment: newPayment })
                        if (newPayment !== 'Paid') setFinalPaidInput('')
                        if (newPayment !== 'Partial') setPartialPaidInput('')
                      }}
                    >
                      <option>Paid</option>
                      <option>Unpaid</option>
                      <option>Partial</option>
                    </select>
                    {((selectedOrder as any)?.isCompleted || selectedOrder.payment === 'Paid') && (
                      <div style={{ 
                        marginTop: '8px',
                        padding: '8px 12px', 
                        backgroundColor: '#FEF3C7', 
                        border: '1px solid #F59E0B', 
                        borderRadius: '6px',
                        color: '#92400E',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FiLock size={14} />
                        <span>
                          {(selectedOrder as any)?.isCompleted
                            ? 'This order is completed and locked from editing'
                            : selectedOrder.payment === 'Paid'
                            ? 'This order is paid and locked from editing'
                            : ''}
                        </span>
                  </div>
                    )}
                  </div>
                  {isEditMode && selectedOrder.payment === 'Paid' && originalPayment !== 'Paid' && !(selectedOrder as any)?.isCompleted && (
                    <div className="detail-card">
                      <label>Final Payment</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={finalPaidInput}
                        onChange={(e) => {
                          setFinalPaidInput(e.target.value)
                        }}
                        placeholder="0.00"
                        disabled={(selectedOrder as any)?.isCompleted}
                      />
                      <div style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>
                        {(() => {
                          const totalNum = parseFloat(String(selectedOrder.total).replace(/[^\d.]/g, '')) || 0
                          const finalNum = parseFloat(finalPaidInput || '0') || 0
                          const effective = originalPaid + finalNum
                          const diff = effective - totalNum
                          return `Previous Paid: ₱${originalPaid.toFixed(2)} • Final Payment: ₱${finalNum.toFixed(2)} • Total Paid: ₱${effective.toFixed(2)}${diff > 0 ? ` • Change: ₱${diff.toFixed(2)}` : diff < 0 ? ` • Remaining: ₱${Math.abs(diff).toFixed(2)}` : ' • Fully paid'}`
                        })()}
                      </div>
                    </div>
                  )}
                  {isEditMode && selectedOrder.payment === 'Partial' && !(selectedOrder as any)?.isCompleted && (
                    <div className="detail-card">
                      <label>Partial Payment</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={partialPaidInput}
                        onChange={(e) => setPartialPaidInput(e.target.value)}
                        placeholder="0.00"
                        disabled={(selectedOrder as any)?.isCompleted || (lockStatus?.isLocked && !lockStatus?.isLockedByMe)}
                      />
                      <div style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>
                        {(() => {
                          const totalNum = parseFloat(String(selectedOrder.total).replace(/[^\d.]/g, '')) || 0
                          const addNum = parseFloat(partialPaidInput || '0') || 0
                          const effective = originalPaid + addNum
                          const remaining = Math.max(0, totalNum - effective)
                          return `Previously Paid: ₱${originalPaid.toFixed(2)} • This Payment: ₱${addNum.toFixed(2)} • New Total Paid: ₱${effective.toFixed(2)} • Remaining: ₱${remaining.toFixed(2)}`
                        })()}
                      </div>
                    </div>
                  )}
                  <div className="detail-card">
                    <label>Paid Amount</label>
                    <div className="detail-value amount">₱{selectedOrder.paid?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div className="detail-card">
                    <label>Balance</label>
                    <div className="detail-value">{(() => {
                      // Calculate balance: total - paidAmount
                      const totalNum = parseFloat(String(selectedOrder.total).replace(/[^\d.]/g, '')) || 0
                      const paidAmount = selectedOrder.paid || 0
                      const calculatedBalance = Math.max(0, totalNum - paidAmount)
                      
                      // If order is paid, balance should be 0
                      if (selectedOrder.payment === 'Paid') {
                        return '₱0.00'
                      }
                      
                      // Otherwise show calculated balance
                      return `₱${calculatedBalance.toFixed(2)}`
                    })()}</div>
                  </div>
                  {selectedOrder.payment === 'Paid' && (
                    <div className="detail-card">
                      <label>Change</label>
                      <div className="detail-value" style={{ color: (selectedOrder.change || 0) > 0 ? '#059669' : '#6B7280', fontWeight: '700' }}>
                        ₱{(selectedOrder.change || 0).toFixed(2)}
                      </div>
                    </div>
                  )}
                  <div className="detail-card">
                    <label>Order Status</label>
                    <select
                      disabled={!isEditMode || (selectedOrder as any)?.isCompleted || (lockStatus?.isLocked && !lockStatus?.isLockedByMe)}
                      value={selectedOrder.items[0]?.status || 'Pending'}
                      onChange={(e) => {
                        const newItems = selectedOrder.items.map(item => ({ ...item, status: e.target.value as any }))
                        setSelectedOrder({ ...selectedOrder, items: newItems })
                      }}
                    >
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Ready for Pickup</option>
                      <option>Completed</option>
                    </select>
                    {(selectedOrder as any)?.isCompleted && (
                      <div style={{ 
                        marginTop: '8px',
                        padding: '8px 12px', 
                        backgroundColor: '#FEF3C7', 
                        border: '1px solid #F59E0B', 
                        borderRadius: '6px',
                        color: '#92400E',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FiLock size={14} />
                        <span>This order is completed and locked from editing</span>
                      </div>
                    )}
                  </div>
                  {selectedOrder.stationId && (
                    <div className="detail-card">
                      <label>Station/Branch</label>
                      <div className="detail-value highlight-blue" style={{ fontFamily: 'monospace' }}>
                        {selectedOrder.stationId}
                      </div>
                    </div>
                  )}
                </div>

                {/* Last Edited Information */}
                {selectedOrder.lastEditedBy && selectedOrder.lastEditedAt && (
                  <div className="edit-tracking-info" style={{
                    marginTop: '20px',
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-gray-100, #f5f5f5)',
                    borderRadius: 'var(--radius-md, 8px)',
                    fontSize: '13px',
                    color: 'var(--color-gray-600, #666)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiEdit2 size={14} />
                      <span>
                        Last edited by <strong>{selectedOrder.lastEditedBy.fullName || selectedOrder.lastEditedBy.username || 'Unknown User'}</strong> on{' '}
                        {new Date(selectedOrder.lastEditedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="items-section">
                  <h4>Order Items</h4>
                  <div className="items-list">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="item-row">
                        <div className="item-info">
                          <span className="item-service">{item.service}</span>
                          <span className="item-qty">{item.quantity}</span>
                        </div>
                        <span className={`order-status-badge order-status-${item.status.toLowerCase().replace(/ /g, '-')}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Lock Status Indicator - Above Action Buttons */}
              {lockStatus?.isLocked && !lockStatus?.isLockedByMe && (
                <div style={{
                  padding: '10px 16px',
                  backgroundColor: '#FEE2E2',
                  borderTop: '1px solid #DC2626',
                  borderBottom: '1px solid #DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: 'auto'
                }}>
                  <FiLock size={16} style={{ color: '#991B1B', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#991B1B', fontWeight: '600' }}>
                      Locked by <strong>{lockStatus.lockedBy?.name || 'another user'}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '2px' }}>
                      You cannot edit until they finish
                    </div>
                  </div>
                </div>
              )}
              {lockStatus?.isLockedByMe && isEditMode && (
                <div style={{
                  padding: '10px 16px',
                  backgroundColor: '#D1FAE5',
                  borderTop: '1px solid #059669',
                  borderBottom: '1px solid #059669',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: 'auto'
                }}>
                  <FiEdit2 size={16} style={{ color: '#065F46', flexShrink: 0 }} />
                  <div style={{ fontSize: '13px', color: '#065F46', fontWeight: '600' }}>
                    You are editing this order
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <Button variant="secondary" onClick={closeModal}>
                  Close
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    closeModal()
                    navigate(`/invoice/${encodeURIComponent(selectedOrder.id)}`)
                  }}
                >
                  <FiFileText /> View Invoice
                </Button>
                {!isEditMode && !(selectedOrder as any)?.isCompleted && (
                  <Button 
                    variant="secondary" 
                    onClick={handleUpdate}
                    disabled={lockStatus?.isLocked && !lockStatus?.isLockedByMe}
                    title={lockStatus?.isLocked && !lockStatus?.isLockedByMe 
                      ? `This order is being edited by ${lockStatus.lockedBy?.name || 'another user'}` 
                      : 'Edit order'}
                    style={lockStatus?.isLocked && !lockStatus?.isLockedByMe 
                      ? { opacity: 0.4, cursor: 'not-allowed' } 
                      : {}}
                  >
                    <FiEdit2 /> Edit
                  </Button>
                )}
                {isEditMode && (
                  <Button onClick={handleSave} disabled={isLoading || (lockStatus?.isLocked && !lockStatus?.isLockedByMe)}>
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiEdit2 /> Save Changes
                      </>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Create Order Modal */}
        <CreateOrderModal
          isOpen={isCreateOrderModalOpen}
          onClose={() => {
            setIsCreateOrderModalOpen(false)
            setDraftOrderIdForModal(null)
          }}
          onOrderCreated={() => {
            fetchOrders()
          }}
          draftOrderId={draftOrderIdForModal}
        />
      </motion.div>
    </Layout>
  )
}

export default OrderManagement

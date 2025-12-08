import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiUserPlus, FiEdit2, FiArchive, FiEye, FiMail, FiPhone, FiShoppingBag, FiX, FiDownload, FiEyeOff, FiChevronDown, FiFileText, FiFolder, FiRotateCw, FiUsers } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import Button from '../components/Button'
import AddCustomerModal from '../components/AddCustomerModalBasic'
import EditCustomerModal from '../components/EditCustomerModal'
import ViewToggle, { ViewMode } from '../components/ViewToggle'
import { TableSkeleton, CardSkeleton } from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import { FilterChips } from '../components/FilterChip'
import { Customer } from '../types'
import { exportCustomersToCSV, exportCustomersToExcel, exportCustomersToPDF, getExportFilename } from '../utils/exportUtils'
import { exportCustomersDirect } from '../utils/reportGeneration/helpers'
import { ExportFormat } from '../utils/reportGeneration/types'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { usePermissions } from '../hooks/usePermissions'
import { customerAPI, stationAPI } from '../utils/api'
import './CustomerManagement.css'

type CustomerWithBranches = Customer & { _allBranchRecords?: Customer[], _branchIds?: string[] }

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerWithBranches[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBranches | null>(null)
  const [recentOrders, setRecentOrders] = useState<Array<{ id: string; date: string; amount: string; service: string }>>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStation, setFilterStation] = useState('All')
  const [stations, setStations] = useState<any[]>([])
  const [sortBy, setSortBy] = useState('name-asc')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('customers-view-mode')
    return (saved === 'cards' || saved === 'list') ? saved : 'cards'
  })
  
  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('customers-view-mode', viewMode)
  }, [viewMode])
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const { hasPermission } = usePermissions()
  const canArchiveCustomers = hasPermission('customers', 'archive')
  const canUnarchiveCustomers = hasPermission('customers', 'unarchive')
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 'n',
      ctrl: true,
      shift: true,
      callback: () => {
        openAddModal()
      }
    },
    {
      key: 'f',
      ctrl: true,
      callback: () => {
        searchInputRef.current?.focus()
      }
    }
  ])
  
  // Customer page stats visibility state
  const [hiddenSections, setHiddenSections] = useState<{
    stats: boolean
  }>(() => {
    const saved = localStorage.getItem('customer-hidden-sections')
    return saved ? JSON.parse(saved) : {
      stats: false
    }
  })

  // Save hidden sections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customer-hidden-sections', JSON.stringify(hiddenSections))
  }, [hiddenSections])

  // Fetch stations for filter
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const data = await stationAPI.getAll()
        const activeStations = data.filter((s: any) => s.isArchived !== true && s.isActive !== false)
        setStations(activeStations)
      } catch (error) {
        console.error('Error fetching stations:', error)
      }
    }
    fetchStations()
  }, [])

  // Group customers by phone number to prevent duplicates
  const groupCustomersByPhone = (customerList: Customer[]): CustomerWithBranches[] => {
    const phoneGroups = new Map<string, Customer[]>()
    
    // Group customers by normalized phone number
    customerList.forEach(customer => {
      const normalizedPhone = (customer.phone || '').replace(/\D/g, '')
      if (!phoneGroups.has(normalizedPhone)) {
        phoneGroups.set(normalizedPhone, [])
      }
      phoneGroups.get(normalizedPhone)!.push(customer)
    })
    
    // For each group, create a single representative customer with aggregated data
    const grouped: CustomerWithBranches[] = []
    phoneGroups.forEach((group) => {
      if (group.length === 0) return
      
      // Use the first customer as the base (usually the oldest or primary)
      const base = group[0]
      
      // Aggregate stats across all branches
      const aggregated: CustomerWithBranches = {
        ...base,
        totalOrders: group.reduce((sum, c) => sum + (c.totalOrders || 0), 0),
        totalSpent: group.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
        points: group[0].points || 0, // Points are shared, so use first one
        lastOrder: group.reduce((latest, c) => {
          const cDate = c.lastOrder && c.lastOrder !== 'No orders yet' 
            ? new Date(c.lastOrder).getTime() 
            : 0
          const latestDate = latest && latest !== 'No orders yet'
            ? new Date(latest).getTime()
            : 0
          return cDate > latestDate ? c.lastOrder : latest
        }, base.lastOrder || 'No orders yet'),
        // Store all branch records for reference
        _allBranchRecords: group,
        _branchIds: group.map(c => c.stationId).filter(Boolean) as string[]
      }
      
      grouped.push(aggregated)
    })
    
    return grouped
  }

  // Fetch customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true)
      try {
        const data = await customerAPI.getAll({ showArchived })
        // Map backend data to frontend Customer interface
        const mappedCustomers: Customer[] = data.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          email: c.email || '',
          phone: c.phone,
          totalOrders: c.totalOrders || 0,
          totalSpent: c.totalSpent || 0,
          points: c.points || 0,
          lastOrder: c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : 'No orders yet',
          stationId: c.stationId || '',
          isArchived: c.isArchived || false
        }))
        
        // Group customers by phone number to prevent duplicates
        const groupedCustomers = groupCustomersByPhone(mappedCustomers)
        setCustomers(groupedCustomers)
      } catch (error: any) {
        console.error('Error fetching customers:', error)
        toast.error('Failed to load customers')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomers()
  }, [showArchived])

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

  const toggleSection = (section: keyof typeof hiddenSections) => {
    setHiddenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const data = await customerAPI.getAll({ showArchived })
      // Map backend data to frontend Customer interface
      const mappedCustomers: Customer[] = data.map((c: any) => ({
        id: c._id || c.id,
        name: c.name,
        email: c.email || '',
        phone: c.phone,
        totalOrders: c.totalOrders || 0,
        totalSpent: c.totalSpent || 0,
        points: c.points || 0,
        lastOrder: c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : 'No orders yet',
        stationId: c.stationId || '',
        isArchived: c.isArchived || false
      }))
      
      // Group customers by phone number to prevent duplicates
      const groupedCustomers = groupCustomersByPhone(mappedCustomers)
      setCustomers(groupedCustomers)
      toast.success('Customers refreshed successfully')
    } catch (error: any) {
      console.error('Error refreshing customers:', error)
      toast.error('Failed to refresh customers')
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const openModal = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsModalOpen(true)
    fetchRecentOrders(customer).catch(() => setRecentOrders([]))
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedCustomer(null)
    setRecentOrders([])
  }

  const fetchRecentOrders = async (customer: Customer) => {
    try {
      const params: any = { search: customer.name }
      const data = await (await import('../utils/api')).orderAPI.getAll(params)
      const orders = Array.isArray(data) ? data : (Array.isArray((data as any).data) ? (data as any).data : [])
      const filtered = orders
        .filter((o: any) => {
          const nameMatch = (o.customer || '').toLowerCase().trim() === customer.name.toLowerCase().trim()
          const phoneMatch = (o.customerPhone || '').replace(/\D/g,'') === (customer.phone || '').replace(/\D/g,'')
          const idMatch = o.customerId && (o.customerId === customer.id)
          return nameMatch || phoneMatch || idMatch
        })
        .sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
        .slice(0, 5)
        .map((o: any) => ({
          id: o.id || o.orderId || o._id,
          date: new Date(o.date || o.createdAt).toLocaleDateString(),
          amount: typeof o.total === 'string' ? o.total : `₱${(parseFloat(String(o.total || 0)) || 0).toFixed(2)}`,
          service: o.items && o.items.length ? o.items[0].service : 'Laundry Service'
        }))
      setRecentOrders(filtered)
    } catch (e) {
      console.error('Failed to load recent orders:', e)
      setRecentOrders([])
    }
  }

  const openAddModal = () => {
    console.log('openAddModal called')
    setIsAddModalOpen(true)
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
  }

  const handleCustomerAdded = () => {
    // Refetch to ensure data is in sync and properly grouped
    const fetchCustomers = async () => {
      try {
        const data = await customerAPI.getAll({ showArchived })
        const mappedCustomers: Customer[] = data.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          email: c.email || '',
          phone: c.phone,
          totalOrders: c.totalOrders || 0,
          totalSpent: c.totalSpent || 0,
          points: c.points || 0,
          lastOrder: c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : 'No orders yet',
          stationId: c.stationId || '',
          isArchived: c.isArchived || false
        }))
        // Group customers by phone number to prevent duplicates
        const groupedCustomers = groupCustomersByPhone(mappedCustomers)
        setCustomers(groupedCustomers)
      } catch (error) {
        console.error('Error refetching customers:', error)
      }
    }
    fetchCustomers()
  }

  const openEditModal = (customer: Customer) => {
    setCustomerToEdit(customer)
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setCustomerToEdit(null)
  }

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c))
  }

  const handleArchive = async (customerId: string) => {
    if (!canArchiveCustomers) {
      toast.error("You don't have permission to archive customers")
      return
    }
    try {
      await customerAPI.archive(customerId)
      if (showArchived) {
        // If viewing archived, update the flag
        setCustomers(customers.map(c => c.id === customerId ? { ...c, isArchived: true } : c))
      } else {
        // If viewing active, remove from list immediately
        setCustomers(customers.filter(c => c.id !== customerId))
      }
      toast.success('Customer archived')
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive customer')
    }
  }

  const handleUnarchive = async (customerId: string) => {
    if (!canUnarchiveCustomers) {
      toast.error("You don't have permission to unarchive customers")
      return
    }
    try {
      await customerAPI.unarchive(customerId)
      if (showArchived) {
        // If viewing archived, remove from list immediately
        setCustomers(customers.filter(c => c.id !== customerId))
      } else {
        // If viewing active, update the flag
        setCustomers(customers.map(c => c.id === customerId ? { ...c, isArchived: false } : c))
      }
      toast.success('Customer unarchived')
    } catch (error: any) {
      toast.error(error.message || 'Failed to unarchive customer')
    }
  }

  const filteredCustomers = customers.filter(customer => {
    // Filter by search term
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           customer.phone.includes(searchTerm)
    
    // Filter by station - check if customer exists in the selected station
    let matchesStation = true
    if (filterStation !== 'All') {
      const customerWithBranches = customer as CustomerWithBranches
      // Check if the primary stationId matches
      if (customer.stationId === filterStation) {
        matchesStation = true
      } 
      // Check if any of the branch IDs match the filter
      else if (customerWithBranches._branchIds && customerWithBranches._branchIds.length > 0) {
        matchesStation = customerWithBranches._branchIds.includes(filterStation)
      }
      // Also check all branch records if available (fallback)
      else if (customerWithBranches._allBranchRecords && customerWithBranches._allBranchRecords.length > 0) {
        matchesStation = customerWithBranches._allBranchRecords.some(
          (branchRecord: Customer) => branchRecord.stationId === filterStation
        )
      } else {
        matchesStation = false
      }
    }
    
    return matchesSearch && matchesStation
  })

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name)
      case 'name-desc':
        return b.name.localeCompare(a.name)
      case 'orders':
        return b.totalOrders - a.totalOrders
      case 'spent':
        return b.totalSpent - a.totalSpent
      default:
        return 0
    }
  })

  // Export functions
  const handleExport = async (format: 'CSV' | 'Excel' | 'PDF') => {
    const customersToExport = sortedCustomers

    if (customersToExport.length === 0) {
      toast.error('No customers to export')
      return
    }

    const filename = getExportFilename('customers')
    
    try {
      // Try new system first
      try {
        await exportCustomersDirect(customersToExport, format as ExportFormat, filename)
        toast.success(`${customersToExport.length} customers exported as ${format}`)
        setShowExportDropdown(false)
        return
      } catch (newSystemError: any) {
        // Fallback to old system
        console.warn('New export system failed, using fallback:', newSystemError)
      }

      // Fallback to old system
      switch (format) {
        case 'CSV':
          exportCustomersToCSV(customersToExport, filename)
          break
        case 'Excel':
          exportCustomersToExcel(customersToExport, filename)
          break
        case 'PDF':
          exportCustomersToPDF(customersToExport, filename)
          break
      }
      
      toast.success(`${customersToExport.length} customers exported as ${format}`)
      setShowExportDropdown(false)
    } catch (error) {
      toast.error('Export failed. Please try again.')
      console.error('Export error:', error)
    }
  }

  // Calculate stats
  const totalCustomers = customers.length
  const newThisMonth = 24 // Mock data
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
  const totalOrdersForAvg = customers.reduce((sum, c) => sum + c.totalOrders, 0)
  const avgOrderValue = totalOrdersForAvg > 0 ? totalRevenue / totalOrdersForAvg : 0

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="customer-management-wrapper"
      >
        {/* Header */}
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">👥 Customer Management</h1>
            <p className="page-subtitle">Manage customer information and relationships</p>
          </div>
          <div className="header-actions">
            <div className="dashboard-controls">
              <button 
                className="control-btn"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh customers"
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
                    <span>Export Customer Data</span>
                    <small>{sortedCustomers.length} customers</small>
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
            <Button 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Add Customer button clicked')
                openAddModal()
              }}
              style={{ position: 'relative', zIndex: 1001, cursor: 'pointer' }}
            >
              <FiUserPlus /> Add Customer
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {!hiddenSections.stats && (
          <motion.div 
            className="customer-stats-grid"
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
            <div className="stat-icon-small"><FiShoppingBag /></div>
            <div>
              <div className="stat-number-small">{totalCustomers}</div>
              <div className="stat-label-small">Total Customers</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small orange"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="stat-icon-small">📅</div>
            <div>
              <div className="stat-number-small">{newThisMonth}</div>
              <div className="stat-label-small">New This Month</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small green"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="stat-icon-small">💰</div>
            <div>
              <div className="stat-number-small">₱{totalRevenue.toLocaleString()}</div>
              <div className="stat-label-small">Total Revenue</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small purple"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-icon-small">📊</div>
            <div>
              <div className="stat-number-small">₱{Math.round(avgOrderValue)}</div>
              <div className="stat-label-small">Avg. Order Value</div>
            </div>
          </motion.div>
          </motion.div>
        )}

        {/* Search and Sort */}
        <div className="search-filter-bar">
          <div className="search-box-large">
            <FiSearch className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <FiX />
              </button>
            )}
          </div>

          <div className="filter-controls">
            <select
              className="filter-select"
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
            >
              <option value="All">All Stations</option>
              {stations.map((s) => {
                const id = s.stationId || s._id || s.id
                const label = s.name ? `${s.name} (${s.stationId || id})` : (s.stationId || id)
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                )
              })}
            </select>
            
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="orders">Most Orders</option>
              <option value="spent">Highest Spending</option>
            </select>
            
            <ViewToggle
              currentView={viewMode}
              onViewChange={setViewMode}
              className="view-toggle-customers"
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

        {/* Filter Chips */}
        {(filterStation !== 'All' || searchTerm) && (
          <FilterChips
            filters={[
              ...(filterStation !== 'All' ? [{
                label: `Station: ${stations.find(s => (s.stationId || s._id || s.id) === filterStation)?.name || filterStation}`,
                value: 'station',
                variant: 'primary' as const
              }] : []),
              ...(searchTerm ? [{
                label: `Search: "${searchTerm}"`,
                value: 'search',
                variant: 'default' as const
              }] : [])
            ]}
            onRemove={(value) => {
              if (value === 'station') setFilterStation('All')
              if (value === 'search') setSearchTerm('')
            }}
            onClearAll={() => {
              setFilterStation('All')
              setSearchTerm('')
            }}
          />
        )}

        {/* Customers Display */}
        <div className={`customers-container ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
          {isLoading ? (
            viewMode === 'cards' ? (
              <CardSkeleton count={6} />
            ) : (
              <TableSkeleton rows={5} columns={7} />
            )
          ) : sortedCustomers.length === 0 ? (
            <EmptyState
              icon={<FiUsers />}
              title={searchTerm || filterStation !== 'All' ? 'No customers found' : 'No customers yet'}
              description={
                searchTerm || filterStation !== 'All'
                  ? 'Try adjusting your search or filter criteria to find customers.'
                  : 'Start by adding your first customer to the system.'
              }
              actionLabel={searchTerm || filterStation !== 'All' ? undefined : 'Add Customer'}
              onAction={searchTerm || filterStation !== 'All' ? undefined : openAddModal}
              type={searchTerm || filterStation !== 'All' ? 'no-results' : 'empty'}
            />
          ) : viewMode === 'cards' ? (
            <div className="customers-grid">
              <AnimatePresence mode="popLayout">
                {sortedCustomers.map((customer, index) => (
                  <motion.div
                    key={customer.id}
                    className={`customer-card ${customer.isArchived ? 'archived' : ''}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ y: -4 }}
                    layout
                  >
                  <div className="customer-card-header">
                    <div className="customer-avatar-large">
                      {getInitials(customer.name)}
                    </div>
                    <div className="customer-card-actions">
                      <button
                        className="btn-icon-small"
                        onClick={() => openModal(customer)}
                        title="View Details"
                        aria-label={`View details for ${customer.name}`}
                      >
                        <FiEye />
                      </button>
                      <button
                        className="btn-icon-small edit"
                        onClick={() => openEditModal(customer)}
                        title="Edit"
                        aria-label={`Edit customer ${customer.name}`}
                      >
                        <FiEdit2 />
                      </button>
                      {((showArchived && canUnarchiveCustomers) || (!showArchived && canArchiveCustomers)) && (
                        <button
                          className={`btn-icon-small ${showArchived ? 'restore' : 'delete'}`}
                          onClick={() => showArchived ? handleUnarchive(customer.id) : handleArchive(customer.id)}
                          title={showArchived ? 'Unarchive' : 'Archive'}
                          aria-label={showArchived ? `Unarchive customer ${customer.name}` : `Archive customer ${customer.name}`}
                        >
                          {showArchived ? <FiRotateCw /> : <FiArchive />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="customer-card-body">
                    <h3 className="customer-name-large">{customer.name}</h3>
                    <div className="customer-contact">
                      <div className="contact-item">
                        <FiMail size={14} />
                        <span>{customer.email}</span>
                      </div>
                      <div className="contact-item">
                        <FiPhone size={14} />
                        <span>{customer.phone}</span>
                      </div>
                      {customer.stationId && (
                        <div className="contact-item" style={{ color: 'var(--color-primary-orange)', fontFamily: 'monospace', fontSize: '12px' }}>
                          <span>📍 {customer.stationId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="customer-card-footer">
                    <div className="customer-stat">
                      <div className="stat-value-small">{customer.totalOrders}</div>
                      <div className="stat-label-tiny">Orders</div>
                    </div>
                    <div className="customer-stat">
                      <div className="stat-value-small primary">₱{customer.totalSpent.toLocaleString()}</div>
                      <div className="stat-label-tiny">Spent</div>
                    </div>
                    <div className="customer-stat">
                      <div className="stat-value-small">{customer.lastOrder}</div>
                      <div className="stat-label-tiny">Last Order</div>
                    </div>
                  </div>
                </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="customers-table-container">
              <div className="table-header-info">
                <div className="table-count">
                  <span className="count-label">Showing</span>
                  <span className="count-number">{sortedCustomers.length}</span>
                  <span className="count-label">
                    {sortedCustomers.length === 1 ? 'customer' : 'customers'}
                    {filterStation !== 'All' && ` in ${stations.find(s => (s.stationId || s._id || s.id) === filterStation)?.name || filterStation}`}
                  </span>
                </div>
              </div>
              <div className="table-wrapper">
                <table className="customers-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Station</th>
                      <th>Orders</th>
                      <th>Total Spent</th>
                      <th>Last Order</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {sortedCustomers.length > 0 && sortedCustomers.map((customer, index) => (
                        <motion.tr
                          key={customer.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20, height: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                          className="customer-row"
                        >
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar">
                      {getInitials(customer.name)}
                    </div>
                            <span className="customer-name">{customer.name}</span>
                    </div>
                        </td>
                        <td>
                          <div className="contact-info">
                            <div className="contact-item">
                      <FiMail size={12} />
                      <span>{customer.email}</span>
                    </div>
                            <div className="contact-item">
                      <FiPhone size={12} />
                      <span>{customer.phone}</span>
                    </div>
                  </div>
                        </td>
                        <td>
                          <span className="stat-value" style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '11px',
                            color: customer.stationId ? 'var(--color-primary-orange)' : '#6B7280'
                          }}>
                            {customer.stationId || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className="stat-value">{customer.totalOrders}</span>
                        </td>
                        <td>
                          <span className="stat-value primary">₱{customer.totalSpent.toLocaleString()}</span>
                        </td>
                        <td>
                          <span className="stat-value">{customer.lastOrder}</span>
                        </td>
                        <td>
                    <div className="action-buttons-row">
                      <button
                        className="btn-icon-small"
                        onClick={() => openModal(customer)}
                        title="View Details"
                        aria-label={`View details for ${customer.name}`}
                      >
                        <FiEye />
                      </button>
                      <button
                        className="btn-icon-small edit"
                        onClick={() => openEditModal(customer)}
                        title="Edit"
                        aria-label={`Edit customer ${customer.name}`}
                      >
                        <FiEdit2 />
                      </button>
                      {((showArchived && canUnarchiveCustomers) || (!showArchived && canArchiveCustomers)) && (
                        <button
                          className={`btn-icon-small ${showArchived ? 'restore' : 'delete'}`}
                          onClick={() => showArchived ? handleUnarchive(customer.id) : handleArchive(customer.id)}
                          title={showArchived ? 'Unarchive' : 'Archive'}
                          aria-label={showArchived ? `Unarchive customer ${customer.name}` : `Archive customer ${customer.name}`}
                        >
                          {showArchived ? <FiRotateCw /> : <FiArchive />}
                        </button>
                      )}
                    </div>
                        </td>
                      </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                  </div>
            </div>
          )}
        </div>

        {/* Customer Details Modal */}
        <AnimatePresence>
          {isModalOpen && selectedCustomer && (
            <div className="modal-overlay">
              <motion.div
                className="modal-large"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 className="modal-title">Customer Details</h3>
                  <button className="btn-icon" onClick={closeModal}>
                    <FiX />
                  </button>
                </div>
                
                <div className="modal-body">
                  <div className="customer-details-header">
                    <div className="customer-avatar-large">
                      {getInitials(selectedCustomer.name)}
                    </div>
                    <div>
                      <h2 className="customer-name-modal">{selectedCustomer.name}</h2>
                      <p className="customer-email-modal">{selectedCustomer.email}</p>
                    </div>
                  </div>

                  <div className="details-grid-2">
                    <div className="detail-card">
                      <label>Email Address</label>
                      <div className="detail-value">
                        <FiMail size={16} /> {selectedCustomer.email}
                      </div>
                    </div>
                    <div className="detail-card">
                      <label>Phone Number</label>
                      <div className="detail-value">
                        <FiPhone size={16} /> {selectedCustomer.phone}
                      </div>
                    </div>
                    <div className="detail-card">
                      <label>Total Orders</label>
                      <div className="detail-value highlight-blue">{selectedCustomer.totalOrders}</div>
                    </div>
                    <div className="detail-card">
                      <label>Total Spent</label>
                      <div className="detail-value highlight-orange">₱{selectedCustomer.totalSpent.toLocaleString()}</div>
                    </div>
                    <div className="detail-card">
                      <label>Points Accumulated</label>
                      <div className="detail-value highlight-blue" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{selectedCustomer.points || 0} points</span>
                        <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '4px' }}>(1 point = ₱1 discount)</span>
                      </div>
                    </div>
                    <div className="detail-card">
                      <label>Last Order</label>
                      <div className="detail-value">{selectedCustomer.lastOrder}</div>
                    </div>
                    <div className="detail-card">
                      <label>Customer Since</label>
                      <div className="detail-value">Jan 15, 2024</div>
                    </div>
                    {selectedCustomer.stationId && (
                      <div className="detail-card">
                        <label>Station/Branch</label>
                        <div className="detail-value highlight-blue" style={{ fontFamily: 'monospace' }}>
                          {selectedCustomer.stationId}
                        </div>
                      </div>
                    )}
                    {((selectedCustomer as CustomerWithBranches)._branchIds && (selectedCustomer as CustomerWithBranches)._branchIds!.length > 1) && (
                      <div className="detail-card">
                        <label>Also Added to Branches</label>
                        <div className="detail-value" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {(selectedCustomer as CustomerWithBranches)._branchIds!
                            .filter((bid: string) => bid !== selectedCustomer.stationId)
                            .map((branchId: string, idx: number) => {
                              const station = stations.find(s => (s.stationId || s._id || s.id) === branchId)
                              return (
                                <span 
                                  key={idx}
                                  style={{
                                    display: 'inline-block',
                                    padding: '4px 10px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    fontFamily: 'monospace'
                                  }}
                                >
                                  {station?.name || branchId}
                                </span>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Per-Branch Breakdown - Show when customer exists in multiple branches */}
                  {((selectedCustomer as CustomerWithBranches)._allBranchRecords && 
                    (selectedCustomer as CustomerWithBranches)._allBranchRecords!.length > 1) && (
                    <div className="branch-breakdown-section" style={{ marginTop: '24px', marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                        Per-Branch Statistics
                      </h4>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '12px' 
                      }}>
                        {((selectedCustomer as CustomerWithBranches)._allBranchRecords || []).map((branchRecord, idx) => {
                          const branchStation = stations.find(s => (s.stationId || s._id || s.id) === branchRecord.stationId)
                          return (
                            <div 
                              key={idx}
                              style={{
                                backgroundColor: '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                padding: '16px'
                              }}
                            >
                              <div style={{ 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                color: '#111827',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span style={{ 
                                  display: 'inline-block',
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#3B82F6'
                                }}></span>
                                {branchStation?.name || branchRecord.stationId || 'Unknown Branch'}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Orders:</span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                                    {branchRecord.totalOrders || 0}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Total Spent:</span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                    ₱{(branchRecord.totalSpent || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Last Order:</span>
                                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                                    {branchRecord.lastOrder || 'No orders yet'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="recent-activity">
                    <h4>Recent Order History</h4>
                    <div className="activity-list">
                      {recentOrders.length === 0 ? (
                        <div className="activity-item">
                          <div className="activity-details">No recent orders found.</div>
                        </div>
                      ) : (
                        recentOrders.map((o, idx) => (
                          <div className="activity-item" key={idx}>
                            <div className="activity-date">{o.date}</div>
                            <div className="activity-details">
                              <strong>#{o.id}</strong> - {o.service}
                              <span className="activity-amount">{o.amount}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <Button variant="secondary" onClick={closeModal}>
                    Close
                  </Button>
                  <Button onClick={() => openEditModal(selectedCustomer)}>
                    <FiEdit2 /> Edit Customer
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Customer Modal */}
        <AddCustomerModal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          onCustomerAdded={handleCustomerAdded}
          existingCustomers={customers}
        />

        {/* Edit Customer Modal */}
        <EditCustomerModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onCustomerUpdated={handleCustomerUpdated}
          customer={customerToEdit}
          existingCustomers={customers}
        />
      </motion.div>
    </Layout>
  )
}

export default CustomerManagement
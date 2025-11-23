import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPlus, FiEdit2, FiArchive, FiToggleLeft, FiToggleRight, FiX, FiPercent, FiCalendar, FiTag, FiEye, FiEyeOff, FiRotateCcw, FiFolder, FiRotateCw, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import { TableSkeleton, CardSkeleton } from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import ViewToggle, { ViewMode } from '../components/ViewToggle'
import AddDiscountModal from '../components/AddDiscountModal'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { discountAPI } from '../utils/api'
import './DiscountsManagement.css'

interface Discount {
  id: string
  code: string
  name: string
  type: 'percentage' | 'fixed'
  value: number
  minPurchase: number
  validFrom: string
  validUntil: string
  isActive: boolean
  usageCount: number
  maxUsage: number
  isArchived?: boolean
}

const DiscountsManagement: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('All Status')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('discounts-view-mode')
    return (saved === 'cards' || saved === 'list') ? saved : 'cards'
  })
  
  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('discounts-view-mode', viewMode)
  }, [viewMode])
  const [showArchived, setShowArchived] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    discount: Discount | null
    action: 'activate' | 'deactivate' | 'reset' | null
  }>({ isOpen: false, discount: null, action: null })
  
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
  
  // Discounts page stats visibility state
  const [hiddenSections, setHiddenSections] = useState<{
    stats: boolean
  }>(() => {
    const saved = localStorage.getItem('discounts-hidden-sections')
    return saved ? JSON.parse(saved) : {
      stats: false
    }
  })

  // Save hidden sections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('discounts-hidden-sections', JSON.stringify(hiddenSections))
  }, [hiddenSections])

  // Fetch discounts from API
  useEffect(() => {
    const fetchDiscounts = async () => {
      setIsLoading(true)
      try {
        const data = await discountAPI.getAll({ showArchived })
        // Map backend data to frontend Discount interface
        const mappedDiscounts: Discount[] = data.map((d: any) => ({
          id: d._id || d.id,
          code: d.code,
          name: d.name,
          type: d.type,
          value: d.value,
          minPurchase: d.minPurchase || 0,
          validFrom: d.validFrom ? new Date(d.validFrom).toLocaleDateString() : '',
          validUntil: d.validUntil ? new Date(d.validUntil).toLocaleDateString() : '',
          isActive: d.isActive !== false,
          usageCount: d.usageCount || 0,
          maxUsage: d.maxUsage || 0,
          isArchived: d.isArchived || false
        }))
        setDiscounts(mappedDiscounts)
      } catch (error: any) {
        console.error('Error fetching discounts:', error)
        toast.error('Failed to load discounts')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDiscounts()
  }, [showArchived])

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
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const data = await discountAPI.getAll({ showArchived })
      // Map backend data to frontend Discount interface
      const mappedDiscounts: Discount[] = data.map((d: any) => ({
        id: d._id || d.id,
        code: d.code,
        name: d.name,
        type: d.type,
        value: d.value,
        minPurchase: d.minPurchase || 0,
        validFrom: d.validFrom ? new Date(d.validFrom).toLocaleDateString() : '',
        validUntil: d.validUntil ? new Date(d.validUntil).toLocaleDateString() : '',
        isActive: d.isActive !== false,
        usageCount: d.usageCount || 0,
        maxUsage: d.maxUsage || 0,
        isArchived: d.isArchived || false
      }))
      setDiscounts(mappedDiscounts)
      toast.success('Discounts refreshed successfully')
    } catch (error: any) {
      console.error('Error refreshing discounts:', error)
      toast.error('Failed to refresh discounts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = (discount: Discount) => {
    const action = discount.isActive ? 'deactivate' : 'activate'
    setConfirmDialog({ isOpen: true, discount, action })
  }

  const handleResetUsage = (discount: Discount) => {
    setConfirmDialog({ isOpen: true, discount, action: 'reset' })
  }

  const confirmAction = async () => {
    if (!confirmDialog.discount || !confirmDialog.action) return

    try {
      if (confirmDialog.action === 'reset') {
        const response = await discountAPI.resetUsage(confirmDialog.discount.id)
        const updatedUsage = response?.data?.usageCount ?? 0
        setDiscounts(discounts.map(disc => 
          disc.id === confirmDialog.discount!.id 
            ? { ...disc, usageCount: updatedUsage }
            : disc
        ))
        toast.success(response?.message || 'Discount usage counter reset!')
      } else {
        const newIsActive = confirmDialog.action === 'activate'
        const response = await discountAPI.update(confirmDialog.discount.id, { isActive: newIsActive })
        setDiscounts(discounts.map(disc => 
          disc.id === confirmDialog.discount!.id 
            ? { ...disc, isActive: newIsActive }
            : disc
        ))
        toast.success(response?.message || `Discount ${confirmDialog.action === 'activate' ? 'activated' : 'deactivated'}!`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete the action')
    } finally {
      setConfirmDialog({ isOpen: false, discount: null, action: null })
    }
  }

  const handleArchive = async (discountId: string, discountName: string) => {
    try {
      await discountAPI.archive(discountId)
    setDiscounts(discounts.map(d => d.id === discountId ? { ...d, isArchived: true } : d))
    toast.success(`${discountName} archived`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive discount')
    }
  }

  const handleUnarchive = async (discountId: string, discountName: string) => {
    try {
      await discountAPI.unarchive(discountId)
      setDiscounts(discounts.map(d => d.id === discountId ? { ...d, isArchived: false } : d))
      toast.success(`${discountName} unarchived`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to unarchive discount')
    }
  }

  const openModal = (discount: Discount) => {
    setSelectedDiscount({ ...discount })
    setIsModalOpen(true)
    setIsEditMode(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedDiscount(null)
    setIsEditMode(false)
  }

  const openAddModal = () => {
    setIsAddModalOpen(true)
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
  }

  const handleDiscountAdded = async (newDiscount: Discount) => {
    // Refresh the list from API to ensure consistency
    try {
      const data = await discountAPI.getAll({ showArchived })
      const mappedDiscounts: Discount[] = data.map((d: any) => ({
        id: d._id || d.id,
        code: d.code,
        name: d.name,
        type: d.type,
        value: d.value,
        minPurchase: d.minPurchase || 0,
        validFrom: d.validFrom ? new Date(d.validFrom).toLocaleDateString() : '',
        validUntil: d.validUntil ? new Date(d.validUntil).toLocaleDateString() : '',
        isActive: d.isActive !== false,
        usageCount: d.usageCount || 0,
        maxUsage: d.maxUsage || 0,
        isArchived: d.isArchived || false
      }))
      setDiscounts(mappedDiscounts)
    } catch (error) {
      // If refresh fails, still add the discount locally as fallback
      console.error('Error refreshing discounts after add:', error)
    setDiscounts(prev => [...prev, newDiscount])
    }
  }

  const handleSave = async () => {
    if (!selectedDiscount) return

    setIsLoading(true)
    
    try {
      // Parse dates from display format to ISO format
      let validFromValue: string | undefined
      let validUntilValue: string | undefined
      
      try {
        if (selectedDiscount.validFrom) {
          const fromDate = new Date(selectedDiscount.validFrom)
          if (!isNaN(fromDate.getTime())) {
            validFromValue = fromDate.toISOString()
          }
        }
        if (selectedDiscount.validUntil) {
          const untilDate = new Date(selectedDiscount.validUntil)
          if (!isNaN(untilDate.getTime())) {
            validUntilValue = untilDate.toISOString()
          }
        }
      } catch (error) {
        console.error('Error parsing dates:', error)
      }

      // Prepare the data to send to the backend
      const updateData: any = {
        code: selectedDiscount.code,
        name: selectedDiscount.name,
        type: selectedDiscount.type,
        value: selectedDiscount.value,
        minPurchase: selectedDiscount.minPurchase || 0,
        maxUsage: selectedDiscount.maxUsage || 0,
        isActive: selectedDiscount.isActive !== false
      }

      // Add dates if they were parsed successfully
      if (validFromValue) {
        updateData.validFrom = validFromValue
      }
      if (validUntilValue) {
        updateData.validUntil = validUntilValue
      }

      // Call the API to update the discount in the database
      const response = await discountAPI.update(selectedDiscount.id, updateData)
      
      // Get the updated discount data from response
      const updatedDiscountData = response.data || response

      // Map the response to frontend Discount interface
      const updatedDiscount: Discount = {
        id: updatedDiscountData._id || updatedDiscountData.id || selectedDiscount.id,
        code: updatedDiscountData.code || selectedDiscount.code,
        name: updatedDiscountData.name || selectedDiscount.name,
        type: updatedDiscountData.type || selectedDiscount.type,
        value: updatedDiscountData.value || selectedDiscount.value,
        minPurchase: updatedDiscountData.minPurchase || selectedDiscount.minPurchase || 0,
        validFrom: updatedDiscountData.validFrom 
          ? new Date(updatedDiscountData.validFrom).toLocaleDateString()
          : selectedDiscount.validFrom,
        validUntil: updatedDiscountData.validUntil 
          ? new Date(updatedDiscountData.validUntil).toLocaleDateString()
          : selectedDiscount.validUntil,
        isActive: updatedDiscountData.isActive !== false,
        usageCount: updatedDiscountData.usageCount || selectedDiscount.usageCount || 0,
        maxUsage: updatedDiscountData.maxUsage || selectedDiscount.maxUsage || 0,
        isArchived: updatedDiscountData.isArchived || selectedDiscount.isArchived || false
      }

      // Update local state with the server response
      setDiscounts(discounts.map(d => d.id === selectedDiscount.id ? updatedDiscount : d))
      
      setIsEditMode(false)
      toast.success('Discount updated successfully!')
      closeModal()
    } catch (error: any) {
      console.error('Error updating discount:', error)
      toast.error(error.message || 'Failed to update discount. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredDiscounts = discounts.filter(discount => {
    if (!showArchived && discount.isArchived) return false
    if (showArchived && !discount.isArchived) return false
    const matchesSearch = discount.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discount.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'All Status' || 
                         (filterStatus === 'Active' && discount.isActive) ||
                         (filterStatus === 'Inactive' && !discount.isActive)
    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const totalDiscounts = discounts.length
  const activeDiscounts = discounts.filter(d => d.isActive).length
  const totalUsages = discounts.reduce((sum, d) => sum + d.usageCount, 0)
  const avgDiscount = Math.round(discounts.reduce((sum, d) => sum + (d.type === 'percentage' ? d.value : 0), 0) / discounts.filter(d => d.type === 'percentage').length)

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="discounts-management-wrapper"
      >
        {/* Header */}
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">💰 Discount Management</h1>
            <p className="page-subtitle">Manage discount codes and promotions</p>
          </div>
          <div className="header-actions">
            <div className="dashboard-controls">
              <button 
                className="control-btn"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh discounts"
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
            <Button onClick={openAddModal}>
              <FiPlus /> Create Discount
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {!hiddenSections.stats && (
          <motion.div 
            className="discounts-stats-grid"
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
            <div className="stat-icon-small"><FiTag /></div>
            <div>
              <div className="stat-number-small">{totalDiscounts}</div>
              <div className="stat-label-small">Total Discounts</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small green"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="stat-icon-small">✅</div>
            <div>
              <div className="stat-number-small">{activeDiscounts}</div>
              <div className="stat-label-small">Active Discounts</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small orange"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="stat-icon-small">📊</div>
            <div>
              <div className="stat-number-small">{totalUsages}</div>
              <div className="stat-label-small">Total Uses</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small purple"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-icon-small"><FiPercent /></div>
            <div>
              <div className="stat-number-small">{avgDiscount}%</div>
              <div className="stat-label-small">Avg. Discount</div>
            </div>
          </motion.div>
          </motion.div>
        )}

        {/* Search and Filters */}
        <div className="search-filter-bar">
          <div className="search-box-large">
            <FiSearch className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by code or name..."
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            
            <ViewToggle
              currentView={viewMode}
              onViewChange={setViewMode}
              className="view-toggle-discounts"
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

        {/* Discounts Display */}
        <div className={`discounts-container ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
          {isLoading ? (
            viewMode === 'cards' ? (
              <CardSkeleton count={6} />
            ) : (
              <TableSkeleton rows={5} columns={8} />
            )
          ) : filteredDiscounts.length === 0 ? (
            <EmptyState
              icon={<FiPercent />}
              title={searchTerm ? 'No discounts found' : showArchived ? 'No archived discounts' : 'No discounts yet'}
              description={
                searchTerm
                  ? 'Try adjusting your search criteria to find discounts.'
                  : showArchived
                  ? 'You don\'t have any archived discounts.'
                  : 'Start by creating your first discount code.'
              }
              actionLabel={searchTerm ? undefined : (showArchived ? undefined : 'Create Discount')}
              onAction={searchTerm ? undefined : (showArchived ? undefined : () => setIsAddModalOpen(true))}
              type={searchTerm ? 'no-results' : 'empty'}
            />
          ) : viewMode === 'cards' ? (
            <div className="discounts-grid">
              {filteredDiscounts.map((discount, index) => (
                <motion.div
                  key={discount.id}
                  className={`discount-card ${!discount.isActive ? 'inactive' : ''} ${discount.isArchived ? 'archived' : ''}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  {/* Status Badge */}
                  <div className={`discount-status-badge-top ${discount.isActive ? 'active' : 'inactive'}`}>
                    {discount.isActive ? 'Active' : 'Inactive'}
                  </div>

                  <div className="discount-card-header">
                    <div className="discount-icon">
                      {discount.type === 'percentage' ? <FiPercent size={32} /> : <span style={{fontSize: '32px', fontWeight: 'bold'}}>₱</span>}
                    </div>
                    <div className="discount-value-display">
                      {discount.type === 'percentage' ? `${discount.value}%` : `₱${discount.value}`}
                      <span className="discount-type">{discount.type === 'percentage' ? 'OFF' : 'DISCOUNT'}</span>
                    </div>
                  </div>

                  <div className="discount-card-body">
                    <div className="discount-code-badge">{discount.code}</div>
                    <h3 className="discount-name-large">{discount.name}</h3>
                    
                    <div className="discount-info-grid">
                      <div className="info-row">
                        <span style={{fontSize: '14px', fontWeight: 'bold'}}>₱</span>
                        <span>Min: ₱{discount.minPurchase || 'None'}</span>
                      </div>
                      <div className="info-row">
                        <FiCalendar size={14} />
                        <span>Until: {discount.validUntil}</span>
                      </div>
                      <div className="info-row">
                        <FiTag size={14} />
                        <span>{discount.usageCount}/{discount.maxUsage || '∞'} uses</span>
                      </div>
                    </div>

                    {/* Usage Progress Bar */}
                    {discount.maxUsage > 0 && (
                      <div className="usage-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${(discount.usageCount / discount.maxUsage) * 100}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">
                          {Math.round((discount.usageCount / discount.maxUsage) * 100)}% used
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="discount-card-footer">
                    <button
                      className="btn-icon-small"
                      onClick={() => openModal(discount)}
                      title="View Details"
                    >
                      <FiTag />
                    </button>
                    <button
                      className="btn-icon-small edit"
                      onClick={() => {
                        openModal(discount)
                        setIsEditMode(true)
                      }}
                      title="Edit"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className={`btn-toggle ${discount.isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(discount)}
                      title={discount.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {discount.isActive ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                    </button>
                    <button
                      className="btn-icon-small"
                      onClick={() => handleResetUsage(discount)}
                      title="Reset Usage Counter"
                    >
                      <FiRefreshCw />
                    </button>
                    <button
                      className={`btn-icon-small ${showArchived ? 'restore' : 'delete'}`}
                      onClick={() => showArchived ? handleUnarchive(discount.id, discount.name) : handleArchive(discount.id, discount.name)}
                      title={showArchived ? 'Unarchive' : 'Archive'}
                    >
                      {showArchived ? <FiRotateCw /> : <FiArchive />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="discounts-table-container">
              <div className="table-wrapper">
                <table className="discounts-table">
                  <thead>
                    <tr>
                      <th>Discount</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Min Purchase</th>
                      <th>Valid Until</th>
                      <th>Usage</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDiscounts.map((discount, index) => (
                      <motion.tr
                        key={discount.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`discount-row ${!discount.isActive ? 'inactive' : ''}`}
                      >
                        <td>
                          <div className="discount-cell">
                            <div className="discount-icon">
                              {discount.type === 'percentage' ? <FiPercent size={16} /> : <span style={{fontSize: '16px', fontWeight: 'bold'}}>₱</span>}
                            </div>
                            <div>
                              <div className="discount-code">{discount.code}</div>
                              <div className="discount-name">{discount.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="discount-type">{discount.type === 'percentage' ? 'Percentage' : 'Fixed'}</span>
                        </td>
                        <td>
                          <span className="discount-value">
                            {discount.type === 'percentage' ? `${discount.value}%` : `₱${discount.value}`}
                          </span>
                        </td>
                        <td>
                          <span className="min-purchase">₱{discount.minPurchase || 'None'}</span>
                        </td>
                        <td>
                          <span className="valid-until">{discount.validUntil}</span>
                        </td>
                        <td>
                          <span className="usage">{discount.usageCount}/{discount.maxUsage || '∞'}</span>
                        </td>
                        <td>
                          <span className={`discount-status-badge ${discount.isActive ? 'active' : 'inactive'}`}>
                            {discount.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-row">
                            <button
                              className="btn-icon-small"
                              onClick={() => openModal(discount)}
                              title="View Details"
                            >
                              <FiTag />
                            </button>
                            <button
                              className="btn-icon-small edit"
                              onClick={() => {
                                openModal(discount)
                                setIsEditMode(true)
                              }}
                              title="Edit"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className={`btn-toggle-small ${discount.isActive ? 'active' : 'inactive'}`}
                              onClick={() => handleToggleStatus(discount)}
                              title={discount.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {discount.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                            </button>
                      <button
                        className="btn-icon-small"
                        onClick={() => handleResetUsage(discount)}
                        title="Reset Usage Counter"
                      >
                        <FiRefreshCw />
                      </button>
                            <button
                              className="btn-icon-small delete"
                              onClick={() => handleArchive(discount.id, discount.name)}
                              title="Archive"
                            >
                              <FiArchive />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Discount Details Modal */}
        <AnimatePresence>
          {isModalOpen && selectedDiscount && (
            <div className="modal-overlay" onClick={closeModal}>
              <motion.div
                className="modal-large"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 className="modal-title">Discount Details</h3>
                  <button className="btn-icon" onClick={closeModal}>
                    <FiX />
                  </button>
                </div>
                
                <div className="modal-body">
                  <div className="discount-modal-header">
                    <div className="discount-icon-modal">
                      {selectedDiscount.type === 'percentage' ? <FiPercent size={32} /> : <span style={{fontSize: '32px', fontWeight: 'bold'}}>₱</span>}
                    </div>
                    <div>
                      <h2 className="discount-name-modal">{selectedDiscount.name}</h2>
                      <p className="discount-code-modal">Code: {selectedDiscount.code}</p>
                      <span className={`discount-status-badge-modal ${selectedDiscount.isActive ? 'active' : 'inactive'}`}>
                        {selectedDiscount.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="details-grid-2">
                    <div className="detail-card">
                      <label>Discount Code</label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={selectedDiscount.code}
                          onChange={(e) => setSelectedDiscount({ ...selectedDiscount, code: e.target.value.toUpperCase() })}
                        />
                      ) : (
                        <div className="detail-value code">{selectedDiscount.code}</div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Discount Name</label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={selectedDiscount.name}
                          onChange={(e) => setSelectedDiscount({ ...selectedDiscount, name: e.target.value })}
                        />
                      ) : (
                        <div className="detail-value">{selectedDiscount.name}</div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Type</label>
                      {isEditMode ? (
                        <select
                          value={selectedDiscount.type}
                          onChange={(e) => setSelectedDiscount({ ...selectedDiscount, type: e.target.value as any })}
                        >
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed Amount</option>
                        </select>
                      ) : (
                        <div className="detail-value">
                          {selectedDiscount.type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                        </div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Value</label>
                      {isEditMode ? (
                        <input
                          type="number"
                          value={selectedDiscount.value}
                          onChange={(e) => setSelectedDiscount({ ...selectedDiscount, value: parseFloat(e.target.value) || 0 })}
                        />
                      ) : (
                        <div className="detail-value highlight-orange">
                          {selectedDiscount.type === 'percentage' ? `${selectedDiscount.value}%` : `₱${selectedDiscount.value}`}
                        </div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Minimum Purchase</label>
                      {isEditMode ? (
                        <input
                          type="number"
                          value={selectedDiscount.minPurchase}
                          onChange={(e) => setSelectedDiscount({ ...selectedDiscount, minPurchase: parseFloat(e.target.value) || 0 })}
                        />
                      ) : (
                        <div className="detail-value">₱{selectedDiscount.minPurchase || 'None'}</div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Max Usage</label>
                      <div className="detail-value">{selectedDiscount.maxUsage || 'Unlimited'}</div>
                    </div>
                    <div className="detail-card">
                      <label>Valid From</label>
                      <div className="detail-value">{selectedDiscount.validFrom}</div>
                    </div>
                    <div className="detail-card">
                      <label>Valid Until</label>
                      <div className="detail-value">{selectedDiscount.validUntil}</div>
                    </div>
                  </div>

                  <div className="usage-stats-section">
                    <h4>Usage Statistics</h4>
                    <div className="usage-stats-grid">
                      <div className="usage-stat">
                        <div className="usage-number">{selectedDiscount.usageCount}</div>
                        <div className="usage-label">Times Used</div>
                      </div>
                      <div className="usage-stat">
                        <div className="usage-number">{selectedDiscount.maxUsage || '∞'}</div>
                        <div className="usage-label">Max Usage</div>
                      </div>
                      <div className="usage-stat">
                        <div className="usage-number">
                          {selectedDiscount.maxUsage > 0 ? selectedDiscount.maxUsage - selectedDiscount.usageCount : '∞'}
                        </div>
                        <div className="usage-label">Remaining</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <Button variant="secondary" onClick={closeModal}>
                    Close
                  </Button>
                  {!isEditMode && (
                    <Button onClick={() => setIsEditMode(true)}>
                      <FiEdit2 /> Edit
                    </Button>
                  )}
                  {isEditMode && (
                    <Button onClick={handleSave} disabled={isLoading}>
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
        </AnimatePresence>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={
            confirmDialog.action === 'activate'
              ? 'Activate Discount?'
              : confirmDialog.action === 'reset'
                ? 'Reset Usage Counter?'
                : 'Deactivate Discount?'
          }
          message={
            confirmDialog.action === 'activate'
              ? `Are you sure you want to activate "${confirmDialog.discount?.code}"? Customers will be able to use this discount.`
              : confirmDialog.action === 'reset'
                ? `Reset usage counter for "${confirmDialog.discount?.code}"? This sets used count back to zero.`
                : `Are you sure you want to deactivate "${confirmDialog.discount?.code}"? Customers will not be able to use this discount.`
          }
          confirmLabel={
            confirmDialog.action === 'activate'
              ? 'Activate'
              : confirmDialog.action === 'reset'
                ? 'Reset'
                : 'Deactivate'
          }
          cancelLabel="Cancel"
          type={confirmDialog.action === 'deactivate' ? 'warning' : 'info'}
          onConfirm={confirmAction}
          onCancel={() => setConfirmDialog({ isOpen: false, discount: null, action: null })}
        />

        {/* Add Discount Modal */}
        <AddDiscountModal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          onDiscountAdded={handleDiscountAdded}
          existingDiscounts={discounts}
        />
      </motion.div>
    </Layout>
  )
}

export default DiscountsManagement


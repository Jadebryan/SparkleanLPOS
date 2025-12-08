import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPlus, FiEdit2, FiArchive, FiToggleLeft, FiToggleRight, FiX, FiTag, FiCalendar, FiEye, FiEyeOff, FiRefreshCw, FiRotateCw } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import { TableSkeleton, CardSkeleton } from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import ViewToggle, { ViewMode } from '../components/ViewToggle'
import AddVoucherModal from '../components/AddVoucherModal'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { voucherAPI } from '../utils/api'
import './DiscountsManagement.css' // Reuse discount styles

interface Voucher {
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
  isMonthly: boolean
  monthlyLimitPerCustomer: number
  pointsRequired: number
  applicableBranches: string[]
  isArchived?: boolean
}

const VouchersManagement: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('All Status')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('vouchers-view-mode')
    return (saved === 'cards' || saved === 'list') ? saved : 'cards'
  })
  
  useEffect(() => {
    localStorage.setItem('vouchers-view-mode', viewMode)
  }, [viewMode])
  
  const [showArchived, setShowArchived] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    voucher: Voucher | null
    action: 'activate' | 'deactivate' | null
  }>({ isOpen: false, voucher: null, action: null })
  
  useKeyboardShortcut([
    {
      key: 'f',
      ctrl: true,
      callback: () => {
        searchInputRef.current?.focus()
      }
    }
  ])
  
  const [hiddenSections, setHiddenSections] = useState<{
    stats: boolean
  }>(() => {
    const saved = localStorage.getItem('vouchers-hidden-sections')
    return saved ? JSON.parse(saved) : {
      stats: false
    }
  })

  useEffect(() => {
    localStorage.setItem('vouchers-hidden-sections', JSON.stringify(hiddenSections))
  }, [hiddenSections])

  useEffect(() => {
    const fetchVouchers = async () => {
      setIsLoading(true)
      try {
        const data = await voucherAPI.getAll({ showArchived })
        const mappedVouchers: Voucher[] = data.map((v: any) => ({
          id: v._id || v.id,
          code: v.code,
          name: v.name,
          type: v.type,
          value: v.value,
          minPurchase: v.minPurchase || 0,
          validFrom: v.validFrom ? new Date(v.validFrom).toLocaleDateString() : '',
          validUntil: v.validUntil ? new Date(v.validUntil).toLocaleDateString() : '',
          isActive: v.isActive !== false,
          usageCount: v.usageCount || 0,
          maxUsage: v.maxUsage || 0,
          isMonthly: v.isMonthly || false,
          monthlyLimitPerCustomer: v.monthlyLimitPerCustomer || 1,
          pointsRequired: v.pointsRequired || 0,
          applicableBranches: v.applicableBranches || [],
          isArchived: v.isArchived || false
        }))
        setVouchers(mappedVouchers)
      } catch (error: any) {
        console.error('Error fetching vouchers:', error)
        toast.error('Failed to load vouchers')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVouchers()
  }, [showArchived])

  const toggleSection = (section: keyof typeof hiddenSections) => {
    setHiddenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const data = await voucherAPI.getAll({ showArchived })
      const mappedVouchers: Voucher[] = data.map((v: any) => ({
        id: v._id || v.id,
        code: v.code,
        name: v.name,
        type: v.type,
        value: v.value,
        minPurchase: v.minPurchase || 0,
        validFrom: v.validFrom ? new Date(v.validFrom).toLocaleDateString() : '',
        validUntil: v.validUntil ? new Date(v.validUntil).toLocaleDateString() : '',
        isActive: v.isActive !== false,
        usageCount: v.usageCount || 0,
        maxUsage: v.maxUsage || 0,
        isMonthly: v.isMonthly || false,
        monthlyLimitPerCustomer: v.monthlyLimitPerCustomer || 1,
        pointsRequired: v.pointsRequired || 0,
        applicableBranches: v.applicableBranches || [],
        isArchived: v.isArchived || false
      }))
      setVouchers(mappedVouchers)
      toast.success('Vouchers refreshed successfully')
    } catch (error: any) {
      console.error('Error refreshing vouchers:', error)
      toast.error('Failed to refresh vouchers')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = (voucher: Voucher) => {
    const action = voucher.isActive ? 'deactivate' : 'activate'
    setConfirmDialog({ isOpen: true, voucher, action })
  }

  const confirmAction = async () => {
    if (!confirmDialog.voucher || !confirmDialog.action) return

    try {
      const newIsActive = confirmDialog.action === 'activate'
      await voucherAPI.update(confirmDialog.voucher.id, { isActive: newIsActive })
      setVouchers(vouchers.map(v => 
        v.id === confirmDialog.voucher!.id 
          ? { ...v, isActive: newIsActive }
          : v
      ))
      toast.success(`Voucher ${confirmDialog.action === 'activate' ? 'activated' : 'deactivated'}!`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete the action')
    } finally {
      setConfirmDialog({ isOpen: false, voucher: null, action: null })
    }
  }

  const handleArchive = async (voucherId: string, voucherName: string) => {
    try {
      await voucherAPI.archive(voucherId)
      // Refresh the list to get updated data from server
      const data = await voucherAPI.getAll({ showArchived })
      const mappedVouchers: Voucher[] = data.map((v: any) => ({
        id: v._id || v.id,
        code: v.code,
        name: v.name,
        type: v.type,
        value: v.value,
        minPurchase: v.minPurchase || 0,
        validFrom: v.validFrom ? new Date(v.validFrom).toLocaleDateString() : '',
        validUntil: v.validUntil ? new Date(v.validUntil).toLocaleDateString() : '',
        isActive: v.isActive !== false,
        usageCount: v.usageCount || 0,
        maxUsage: v.maxUsage || 0,
        isMonthly: v.isMonthly || false,
        monthlyLimitPerCustomer: v.monthlyLimitPerCustomer || 1,
        pointsRequired: v.pointsRequired || 0,
        applicableBranches: v.applicableBranches || [],
        isArchived: v.isArchived || false
      }))
      setVouchers(mappedVouchers)
      toast.success(`${voucherName} archived`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive voucher')
    }
  }

  const handleUnarchive = async (voucherId: string, voucherName: string) => {
    try {
      await voucherAPI.unarchive(voucherId)
      // Refresh the list to get updated data from server
      const data = await voucherAPI.getAll({ showArchived })
      const mappedVouchers: Voucher[] = data.map((v: any) => ({
        id: v._id || v.id,
        code: v.code,
        name: v.name,
        type: v.type,
        value: v.value,
        minPurchase: v.minPurchase || 0,
        validFrom: v.validFrom ? new Date(v.validFrom).toLocaleDateString() : '',
        validUntil: v.validUntil ? new Date(v.validUntil).toLocaleDateString() : '',
        isActive: v.isActive !== false,
        usageCount: v.usageCount || 0,
        maxUsage: v.maxUsage || 0,
        isMonthly: v.isMonthly || false,
        monthlyLimitPerCustomer: v.monthlyLimitPerCustomer || 1,
        pointsRequired: v.pointsRequired || 0,
        applicableBranches: v.applicableBranches || [],
        isArchived: v.isArchived || false
      }))
      setVouchers(mappedVouchers)
      toast.success(`${voucherName} unarchived`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to unarchive voucher')
    }
  }

  const openAddModal = () => {
    setIsAddModalOpen(true)
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
  }

  const handleVoucherAdded = async (newVoucher: Voucher) => {
    try {
      const data = await voucherAPI.getAll({ showArchived })
      const mappedVouchers: Voucher[] = data.map((v: any) => ({
        id: v._id || v.id,
        code: v.code,
        name: v.name,
        type: v.type,
        value: v.value,
        minPurchase: v.minPurchase || 0,
        validFrom: v.validFrom ? new Date(v.validFrom).toLocaleDateString() : '',
        validUntil: v.validUntil ? new Date(v.validUntil).toLocaleDateString() : '',
        isActive: v.isActive !== false,
        usageCount: v.usageCount || 0,
        maxUsage: v.maxUsage || 0,
        isMonthly: v.isMonthly || false,
        monthlyLimitPerCustomer: v.monthlyLimitPerCustomer || 1,
        pointsRequired: v.pointsRequired || 0,
        applicableBranches: v.applicableBranches || [],
        isArchived: v.isArchived || false
      }))
      setVouchers(mappedVouchers)
    } catch (error) {
      console.error('Error refreshing vouchers after add:', error)
      setVouchers(prev => [...prev, newVoucher])
    }
  }

  const filteredVouchers = vouchers.filter(voucher => {
    if (!showArchived && voucher.isArchived) return false
    if (showArchived && !voucher.isArchived) return false
    const matchesSearch = voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voucher.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'All Status' || 
                         (filterStatus === 'Active' && voucher.isActive) ||
                         (filterStatus === 'Inactive' && !voucher.isActive)
    return matchesSearch && matchesStatus
  })

  const totalVouchers = vouchers.length
  const activeVouchers = vouchers.filter(v => v.isActive).length
  const totalUsages = vouchers.reduce((sum, v) => sum + v.usageCount, 0)
  const monthlyVouchers = vouchers.filter(v => v.isMonthly).length

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="discounts-management-wrapper"
      >
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">🎫 Voucher Management</h1>
            <p className="page-subtitle">Manage monthly vouchers and promotions</p>
          </div>
          <div className="header-actions">
            <div className="dashboard-controls">
              <button 
                className="control-btn"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh vouchers"
              >
                <FiRefreshCw style={{ 
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
              <FiPlus /> Create Voucher
            </Button>
          </div>
        </div>

        {!hiddenSections.stats && (
          <motion.div 
            className="discounts-stats-grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div className="stat-card-small blue">
              <div className="stat-icon-small"><FiTag /></div>
              <div>
                <div className="stat-number-small">{totalVouchers}</div>
                <div className="stat-label-small">Total Vouchers</div>
              </div>
            </motion.div>

            <motion.div className="stat-card-small green">
              <div className="stat-icon-small">✅</div>
              <div>
                <div className="stat-number-small">{activeVouchers}</div>
                <div className="stat-label-small">Active Vouchers</div>
              </div>
            </motion.div>

            <motion.div className="stat-card-small orange">
              <div className="stat-icon-small">📊</div>
              <div>
                <div className="stat-number-small">{totalUsages}</div>
                <div className="stat-label-small">Total Uses</div>
              </div>
            </motion.div>

            <motion.div className="stat-card-small purple">
              <div className="stat-icon-small"><FiCalendar /></div>
              <div>
                <div className="stat-number-small">{monthlyVouchers}</div>
                <div className="stat-label-small">Monthly Vouchers</div>
              </div>
            </motion.div>
          </motion.div>
        )}

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
            
            <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
            
            <button
              className={`filter-btn ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(!showArchived)}
            >
              <FiArchive />
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
          </div>
        </div>

        {isLoading ? (
          viewMode === 'cards' ? <CardSkeleton count={6} /> : <TableSkeleton />
        ) : filteredVouchers.length === 0 ? (
          <EmptyState
            icon={<FiTag />}
            title="No vouchers found"
            message={searchTerm || filterStatus !== 'All Status' || showArchived
              ? "Try adjusting your search or filters"
              : "Create your first voucher to get started"}
            action={!searchTerm && filterStatus === 'All Status' && !showArchived ? {
              label: "Create Voucher",
              onClick: openAddModal
            } : undefined}
          />
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="discounts-grid">
                {filteredVouchers.map((voucher, index) => (
                  <motion.div
                    key={voucher.id}
                    className={`discount-card ${!voucher.isActive ? 'inactive' : ''} ${voucher.isArchived ? 'archived' : ''}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                  >
                    {/* Status Badge */}
                    <div className={`discount-status-badge-top ${voucher.isActive ? 'active' : 'inactive'}`}>
                      {voucher.isActive ? 'Active' : 'Inactive'}
                    </div>

                    <div className="discount-card-header">
                      <div className="discount-icon">
                        <FiTag size={32} />
                      </div>
                      <div className="discount-value-display">
                        {voucher.type === 'percentage' ? `${voucher.value}%` : `₱${voucher.value}`}
                        <span className="discount-type">{voucher.type === 'percentage' ? 'OFF' : 'DISCOUNT'}</span>
                      </div>
                    </div>
                    <div className="discount-card-body">
                      <div className="discount-code-badge">{voucher.code}</div>
                      <h3 className="discount-name-large">{voucher.name}</h3>
                      
                      <div className="discount-info-grid">
                        {voucher.minPurchase > 0 && (
                          <div className="info-row">
                            <span style={{fontSize: '14px', fontWeight: 'bold'}}>₱</span>
                            <span>Min: ₱{voucher.minPurchase}</span>
                          </div>
                        )}
                        <div className="info-row">
                          <FiCalendar size={14} />
                          <span>Until: {voucher.validUntil || 'No Expiry'}</span>
                        </div>
                        <div className="info-row">
                          <FiTag size={14} />
                          <span>{voucher.usageCount}/{voucher.maxUsage || '∞'} uses</span>
                        </div>
                        {voucher.isMonthly && (
                          <div className="info-row">
                            <FiCalendar size={14} />
                            <span>Monthly: {voucher.monthlyLimitPerCustomer}/month</span>
                          </div>
                        )}
                        {voucher.pointsRequired > 0 && (
                          <div className="info-row">
                            <span style={{fontSize: '14px', fontWeight: 'bold'}}>⭐</span>
                            <span>Points: {voucher.pointsRequired}</span>
                          </div>
                        )}
                      </div>

                      {/* Usage Progress Bar */}
                      {voucher.maxUsage > 0 && (
                        <div className="usage-progress">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${(voucher.usageCount / voucher.maxUsage) * 100}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {Math.round((voucher.usageCount / voucher.maxUsage) * 100)}% used
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="discount-card-footer">
                      <button
                        className={`btn-toggle ${voucher.isActive ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(voucher)}
                        title={voucher.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {voucher.isActive ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                      </button>
                      <button
                        className={`btn-icon-small ${showArchived ? 'restore' : 'delete'}`}
                        onClick={() => showArchived ? handleUnarchive(voucher.id, voucher.name) : handleArchive(voucher.id, voucher.name)}
                        title={showArchived ? 'Unarchive' : 'Archive'}
                      >
                        {showArchived ? <FiRefreshCw size={16} /> : <FiArchive size={16} />}
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
                        <th>Voucher</th>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Monthly</th>
                        <th>Usage</th>
                        <th>Valid Until</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVouchers.map((voucher, index) => (
                        <motion.tr
                          key={voucher.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`discount-row ${!voucher.isActive ? 'inactive' : ''}`}
                        >
                          <td>
                            <div className="discount-cell">
                              <div className="discount-icon">
                                <FiTag size={16} />
                              </div>
                              <div>
                                <div className="discount-code">{voucher.code}</div>
                                <div className="discount-name">{voucher.name}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="discount-type">{voucher.type === 'percentage' ? 'Percentage' : 'Fixed'}</span>
                          </td>
                          <td>
                            <span className="discount-value">
                              {voucher.type === 'percentage' ? `${voucher.value}%` : `₱${voucher.value}`}
                            </span>
                          </td>
                          <td>
                            <span>{voucher.isMonthly ? `Yes (${voucher.monthlyLimitPerCustomer}/mo)` : 'No'}</span>
                          </td>
                          <td>
                            <span className="usage">{voucher.usageCount} / {voucher.maxUsage || '∞'}</span>
                          </td>
                          <td>
                            <span className="valid-until">{voucher.validUntil || 'No Expiry'}</span>
                          </td>
                          <td>
                            <span className={`discount-status-badge ${voucher.isActive ? 'active' : 'inactive'}`}>
                              {voucher.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        <td>
                          <div className="action-buttons-row">
                            <button
                              className={`btn-toggle-small ${voucher.isActive ? 'active' : 'inactive'}`}
                              onClick={() => handleToggleStatus(voucher)}
                              title={voucher.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {voucher.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                            </button>
                            <button
                              className={`btn-icon-small ${showArchived ? 'restore' : 'delete'}`}
                              onClick={() => showArchived ? handleUnarchive(voucher.id, voucher.name) : handleArchive(voucher.id, voucher.name)}
                              title={showArchived ? 'Unarchive' : 'Archive'}
                            >
                              {showArchived ? <FiRefreshCw size={16} /> : <FiArchive size={16} />}
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
          </>
        )}

        <AddVoucherModal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          onVoucherAdded={handleVoucherAdded}
          existingVouchers={vouchers}
        />

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onCancel={() => setConfirmDialog({ isOpen: false, voucher: null, action: null })}
          onConfirm={confirmAction}
          title={
            confirmDialog.action === 'activate'
              ? 'Activate Voucher'
              : 'Deactivate Voucher'
          }
          message={
            confirmDialog.action === 'activate'
              ? `Are you sure you want to activate "${confirmDialog.voucher?.name}"?`
              : `Are you sure you want to deactivate "${confirmDialog.voucher?.name}"?`
          }
          confirmLabel={confirmDialog.action === 'activate' ? 'Activate' : 'Deactivate'}
          type="info"
        />
      </motion.div>
    </Layout>
  )
}

export default VouchersManagement


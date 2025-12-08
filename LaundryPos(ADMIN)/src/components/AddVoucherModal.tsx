import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiSave, FiPlus, FiTag, FiCalendar } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Button from './Button'
import { voucherAPI, stationAPI } from '../utils/api'
import './AddDiscountModal.css' // Reuse discount modal styles

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
}

interface AddVoucherModalProps {
  isOpen: boolean
  onClose: () => void
  onVoucherAdded: (voucher: Voucher) => void
  existingVouchers: Voucher[]
  title?: string
  subtitle?: string
}

const AddVoucherModal: React.FC<AddVoucherModalProps> = ({
  isOpen,
  onClose,
  onVoucherAdded,
  existingVouchers,
  title = "Create New Voucher",
  subtitle = "Set up a new voucher for your customers"
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [stations, setStations] = useState<any[]>([])
  const [newVoucher, setNewVoucher] = useState({
    code: '',
    name: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    minPurchase: 0,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    isActive: true,
    maxUsage: 0,
    isMonthly: false,
    monthlyLimitPerCustomer: 1,
    pointsRequired: 0,
    applicableBranches: [] as string[],
    description: ''
  })

  useEffect(() => {
    if (isOpen) {
      // Fetch stations for branch selection
      stationAPI.getAll().then(data => {
        setStations(Array.isArray(data) ? data : [])
      }).catch(err => {
        console.error('Error fetching stations:', err)
      })
    }
  }, [isOpen])

  const voucherTypes = [
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'fixed', label: 'Fixed Amount (₱)' }
  ]

  const generateVoucherCode = () => {
    const adjectives = ['MONTHLY', 'BONUS', 'SPECIAL', 'VIP', 'PROMO', 'REWARD', 'SAVE', 'DEAL']
    const nouns = ['VOUCHER', 'OFFER', 'DISCOUNT', 'CASH', 'GIFT', 'PRIZE', 'COUPON', 'DEAL']
    const numbers = Math.floor(Math.random() * 100)
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    
    return `${adjective}${noun}${numbers}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newVoucher.code || !newVoucher.name || newVoucher.value <= 0) {
      toast.error('Please fill in all required fields with valid values')
      return
    }

    // Check if code exists locally
    const codeExists = existingVouchers.some(voucher => 
      voucher.code.toLowerCase() === newVoucher.code.toLowerCase()
    )
    if (codeExists) {
      toast.error('A voucher with this code already exists')
      return
    }

    // Backend requires validUntil
    let validUntilValue = newVoucher.validUntil
    if (!validUntilValue) {
      const farFutureDate = new Date(newVoucher.validFrom)
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 10)
      validUntilValue = farFutureDate.toISOString().split('T')[0]
    }

    if (new Date(validUntilValue) <= new Date(newVoucher.validFrom)) {
      toast.error('End date must be after start date')
      return
    }

    if (newVoucher.type === 'percentage' && newVoucher.value > 100) {
      toast.error('Percentage voucher cannot exceed 100%')
      return
    }

    setIsLoading(true)
    
    try {
      const voucherData = {
        code: newVoucher.code.toUpperCase(),
        name: newVoucher.name,
        type: newVoucher.type,
        value: newVoucher.value,
        minPurchase: newVoucher.minPurchase || 0,
        validFrom: new Date(newVoucher.validFrom).toISOString(),
        validUntil: new Date(validUntilValue).toISOString(),
        maxUsage: newVoucher.maxUsage || 0,
        isActive: newVoucher.isActive,
        isMonthly: newVoucher.isMonthly,
        monthlyLimitPerCustomer: newVoucher.monthlyLimitPerCustomer || 1,
        pointsRequired: newVoucher.pointsRequired || 0,
        applicableBranches: newVoucher.applicableBranches,
        description: newVoucher.description || ''
      }

      const response = await voucherAPI.create(voucherData)
      const voucherResponse = response?.data || response
      
      const createdVoucher: Voucher = {
        id: voucherResponse._id || voucherResponse.id,
        code: voucherResponse.code,
        name: voucherResponse.name,
        type: voucherResponse.type,
        value: voucherResponse.value,
        minPurchase: voucherResponse.minPurchase || 0,
        validFrom: voucherResponse.validFrom ? new Date(voucherResponse.validFrom).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : new Date(newVoucher.validFrom).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        validUntil: voucherResponse.validUntil ? new Date(voucherResponse.validUntil).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'No Expiry',
        isActive: voucherResponse.isActive !== false,
        usageCount: voucherResponse.usageCount || 0,
        maxUsage: voucherResponse.maxUsage || 0,
        isMonthly: voucherResponse.isMonthly || false,
        monthlyLimitPerCustomer: voucherResponse.monthlyLimitPerCustomer || 1,
        pointsRequired: voucherResponse.pointsRequired || 0,
        applicableBranches: voucherResponse.applicableBranches || []
      }

      onVoucherAdded(createdVoucher)
      
      setNewVoucher({
        code: '',
        name: '',
        type: 'percentage',
        value: 0,
        minPurchase: 0,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        isActive: true,
        maxUsage: 0,
        isMonthly: false,
        monthlyLimitPerCustomer: 1,
        pointsRequired: 0,
        applicableBranches: [],
        description: ''
      })
      
      toast.success('Voucher created successfully!')
      onClose()
    } catch (error: any) {
      console.error('Error creating voucher:', error)
      const errorMessage = error.message || error.response?.data?.message || 'Failed to create voucher. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean | string[]) => {
    setNewVoucher(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleGenerateCode = () => {
    const newCode = generateVoucherCode()
    handleInputChange('code', newCode)
  }

  const handleBranchToggle = (stationId: string) => {
    setNewVoucher(prev => {
      const branches = prev.applicableBranches.includes(stationId)
        ? prev.applicableBranches.filter(id => id !== stationId)
        : [...prev.applicableBranches, stationId]
      return { ...prev, applicableBranches: branches }
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="add-discount-modal-container"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="add-discount-modal-header">
              <div className="add-discount-modal-title-section">
                <FiTag className="add-discount-modal-icon" />
                <div>
                  <h3 className="add-discount-modal-title">{title}</h3>
                  {subtitle && <p className="add-discount-modal-subtitle">{subtitle}</p>}
                </div>
              </div>
              <button className="add-discount-modal-close" onClick={onClose}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="add-discount-modal-form">
              <div className="add-discount-form-grid">
                <div className="add-discount-form-group">
                  <label htmlFor="voucher-code">Voucher Code *</label>
                  <div className="add-discount-code-wrapper">
                    <input
                      type="text"
                      id="voucher-code"
                      placeholder="e.g., MONTHLY10"
                      value={newVoucher.code}
                      onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                      required
                      autoFocus
                      autoComplete="off"
                      className="add-discount-code-input"
                    />
                    <button
                      type="button"
                      className="add-discount-generate-btn"
                      onClick={handleGenerateCode}
                      title="Generate random code"
                    >
                      <FiPlus size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="voucher-name">Voucher Name *</label>
                  <input
                    type="text"
                    id="voucher-name"
                    placeholder="e.g., Monthly Welcome Voucher"
                    value={newVoucher.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="voucher-type">Voucher Type *</label>
                  <select
                    id="voucher-type"
                    value={newVoucher.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    required
                  >
                    {voucherTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="voucher-value">Voucher Value * ({newVoucher.type === 'percentage' ? '%' : '₱'})</label>
                  <input
                    type="number"
                    id="voucher-value"
                    placeholder={newVoucher.type === 'percentage' ? '10' : '50'}
                    min="0"
                    max={newVoucher.type === 'percentage' ? '100' : undefined}
                    step={newVoucher.type === 'percentage' ? '1' : '0.01'}
                    value={newVoucher.value || ''}
                    onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="min-purchase">Minimum Purchase (₱)</label>
                  <input
                    type="number"
                    id="min-purchase"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={newVoucher.minPurchase || ''}
                    onChange={(e) => handleInputChange('minPurchase', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="max-usage">Max Usage (0 = unlimited)</label>
                  <input
                    type="number"
                    id="max-usage"
                    placeholder="0"
                    min="0"
                    value={newVoucher.maxUsage || ''}
                    onChange={(e) => handleInputChange('maxUsage', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="valid-from">Valid From *</label>
                  <input
                    type="date"
                    id="valid-from"
                    value={newVoucher.validFrom}
                    onChange={(e) => handleInputChange('validFrom', e.target.value)}
                    required
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="valid-until">Valid Until (optional)</label>
                  <input
                    type="date"
                    id="valid-until"
                    value={newVoucher.validUntil}
                    onChange={(e) => handleInputChange('validUntil', e.target.value)}
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="is-monthly" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="is-monthly"
                      checked={newVoucher.isMonthly}
                      onChange={(e) => handleInputChange('isMonthly', e.target.checked)}
                    />
                    Monthly Voucher (one per customer per month)
                  </label>
                </div>

                {newVoucher.isMonthly && (
                  <div className="add-discount-form-group">
                    <label htmlFor="monthly-limit">Monthly Limit Per Customer</label>
                    <input
                      type="number"
                      id="monthly-limit"
                      placeholder="1"
                      min="1"
                      value={newVoucher.monthlyLimitPerCustomer || 1}
                      onChange={(e) => handleInputChange('monthlyLimitPerCustomer', parseInt(e.target.value) || 1)}
                    />
                  </div>
                )}

                <div className="add-discount-form-group">
                  <label htmlFor="points-required">Points Required (0 = no points needed)</label>
                  <input
                    type="number"
                    id="points-required"
                    placeholder="0"
                    min="0"
                    value={newVoucher.pointsRequired || ''}
                    onChange={(e) => handleInputChange('pointsRequired', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="add-discount-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Applicable Branches (leave empty for all branches)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {stations.map(station => (
                      <label key={station._id || station.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newVoucher.applicableBranches.includes(station._id || station.id)}
                          onChange={() => handleBranchToggle(station._id || station.id)}
                        />
                        {station.name || station.stationName || 'Unnamed Station'}
                      </label>
                    ))}
                    {stations.length === 0 && <span style={{ color: '#666', fontSize: '14px' }}>No stations available</span>}
                  </div>
                </div>

                <div className="add-discount-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    placeholder="Optional description"
                    value={newVoucher.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="voucher-status">Status</label>
                  <select
                    id="voucher-status"
                    value={newVoucher.isActive ? 'Active' : 'Inactive'}
                    onChange={(e) => handleInputChange('isActive', e.target.value === 'Active')}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="add-discount-form-note">
                <p>💡 <strong>Note:</strong> Monthly vouchers can only be used once per customer per month. Leave "Valid Until" empty to set expiration to 10 years from start date.</p>
              </div>

              <div className="add-discount-modal-footer">
                <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="spinner"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FiSave />
                      Create Voucher
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AddVoucherModal


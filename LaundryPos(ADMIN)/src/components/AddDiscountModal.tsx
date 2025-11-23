import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiSave, FiPlus, FiTag } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Button from './Button'
import { discountAPI } from '../utils/api'
import './AddDiscountModal.css'

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
}

interface AddDiscountModalProps {
  isOpen: boolean
  onClose: () => void
  onDiscountAdded: (discount: Discount) => void
  existingDiscounts: Discount[]
  title?: string
  subtitle?: string
}

const AddDiscountModal: React.FC<AddDiscountModalProps> = ({
  isOpen,
  onClose,
  onDiscountAdded,
  existingDiscounts,
  title = "Create New Discount",
  subtitle = "Set up a new discount code for your customers"
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [newDiscount, setNewDiscount] = useState({
    code: '',
    name: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    minPurchase: 0,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    isActive: true,
    maxUsage: 0
  })

  const discountTypes = [
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'fixed', label: 'Fixed Amount (₱)' }
  ]

  const generateDiscountCode = () => {
    const adjectives = ['SUPER', 'MEGA', 'ULTRA', 'PREMIUM', 'VIP', 'SPECIAL', 'BONUS', 'EXTRA']
    const nouns = ['SAVE', 'DEAL', 'OFF', 'DISCOUNT', 'PROMO', 'SALE', 'CASH', 'REWARD']
    const numbers = Math.floor(Math.random() * 100)
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    
    return `${adjective}${noun}${numbers}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newDiscount.code || !newDiscount.name || newDiscount.value <= 0) {
      toast.error('Please fill in all required fields with valid values')
      return
    }

    // Check if code exists locally (backend will also check, but this provides immediate feedback)
    const codeExists = existingDiscounts.some(discount => 
      discount.code.toLowerCase() === newDiscount.code.toLowerCase()
    )
    if (codeExists) {
      toast.error('A discount with this code already exists')
      return
    }

    // Backend requires validUntil, so if empty, set it to a far future date (e.g., 10 years from validFrom)
    let validUntilValue = newDiscount.validUntil
    if (!validUntilValue) {
      const farFutureDate = new Date(newDiscount.validFrom)
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 10)
      validUntilValue = farFutureDate.toISOString().split('T')[0]
    }

    if (new Date(validUntilValue) <= new Date(newDiscount.validFrom)) {
      toast.error('End date must be after start date')
      return
    }

    if (newDiscount.type === 'percentage' && newDiscount.value > 100) {
      toast.error('Percentage discount cannot exceed 100%')
      return
    }

    setIsLoading(true)
    
    try {
      // Prepare data for API (backend expects ISO date strings)
      const discountData = {
        code: newDiscount.code.toUpperCase(),
        name: newDiscount.name,
        type: newDiscount.type,
        value: newDiscount.value,
        minPurchase: newDiscount.minPurchase || 0,
        validFrom: new Date(newDiscount.validFrom).toISOString(),
        validUntil: new Date(validUntilValue).toISOString(),
        maxUsage: newDiscount.maxUsage || 0,
        isActive: newDiscount.isActive
      }

      // Call the API to create the discount
      const response = await discountAPI.create(discountData)
      
      // Handle different response formats (response.data or response directly)
      const discountResponse = response?.data || response
      
      // Map backend response to frontend Discount interface
      const createdDiscount: Discount = {
        id: discountResponse._id || discountResponse.id,
        code: discountResponse.code,
        name: discountResponse.name,
        type: discountResponse.type,
        value: discountResponse.value,
        minPurchase: discountResponse.minPurchase || 0,
        validFrom: discountResponse.validFrom ? new Date(discountResponse.validFrom).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : new Date(newDiscount.validFrom).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        validUntil: discountResponse.validUntil ? new Date(discountResponse.validUntil).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'No Expiry',
        isActive: discountResponse.isActive !== false,
        usageCount: discountResponse.usageCount || 0,
        maxUsage: discountResponse.maxUsage || 0
      }

      // Call the callback with the created discount
      onDiscountAdded(createdDiscount)
      
      // Reset form
      setNewDiscount({
        code: '',
        name: '',
        type: 'percentage',
        value: 0,
        minPurchase: 0,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        isActive: true,
        maxUsage: 0
      })
      
      toast.success('Discount created successfully!')
      onClose()
    } catch (error: any) {
      console.error('Error creating discount:', error)
      const errorMessage = error.message || error.response?.data?.message || 'Failed to create discount. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setNewDiscount(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleGenerateCode = () => {
    const newCode = generateDiscountCode()
    handleInputChange('code', newCode)
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
                  <label htmlFor="discount-code">Discount Code *</label>
                  <div className="add-discount-code-wrapper">
                    <input
                      type="text"
                      id="discount-code"
                      name="discount-code"
                      placeholder="e.g., WELCOME10"
                      value={newDiscount.code}
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
                  <label htmlFor="discount-name">Discount Name *</label>
                  <input
                    type="text"
                    id="discount-name"
                    placeholder="e.g., Welcome Discount"
                    value={newDiscount.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="discount-type">Discount Type *</label>
                  <select
                    id="discount-type"
                    value={newDiscount.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    required
                  >
                    {discountTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="discount-value">Discount Value * ({newDiscount.type === 'percentage' ? '%' : '₱'})</label>
                  <input
                    type="number"
                    id="discount-value"
                    placeholder={newDiscount.type === 'percentage' ? '10' : '50'}
                    min="0"
                    max={newDiscount.type === 'percentage' ? '100' : undefined}
                    step={newDiscount.type === 'percentage' ? '1' : '0.01'}
                    value={newDiscount.value || ''}
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
                    value={newDiscount.minPurchase || ''}
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
                    value={newDiscount.maxUsage || ''}
                    onChange={(e) => handleInputChange('maxUsage', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="valid-from">Valid From *</label>
                  <input
                    type="date"
                    id="valid-from"
                    value={newDiscount.validFrom}
                    onChange={(e) => handleInputChange('validFrom', e.target.value)}
                    required
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="valid-until">Valid Until (optional - defaults to 10 years if empty)</label>
                  <input
                    type="date"
                    id="valid-until"
                    value={newDiscount.validUntil}
                    onChange={(e) => handleInputChange('validUntil', e.target.value)}
                  />
                </div>

                <div className="add-discount-form-group">
                  <label htmlFor="discount-status">Status</label>
                  <select
                    id="discount-status"
                    value={newDiscount.isActive ? 'Active' : 'Inactive'}
                    onChange={(e) => handleInputChange('isActive', e.target.value === 'Active')}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="add-discount-form-note">
                <p>💡 <strong>Note:</strong> Discount codes are automatically converted to uppercase. Leave "Valid Until" empty to set expiration to 10 years from start date.</p>
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
                      Create Discount
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

export default AddDiscountModal

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPlus, FiEdit2, FiArchive, FiToggleLeft, FiToggleRight, FiX, FiStar, FiPackage, FiEye, FiEyeOff, FiFolder, FiRotateCw } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import { TableSkeleton, CardSkeleton } from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import { FilterChips } from '../components/FilterChip'
import ErrorState from '../components/ErrorState'
import ConfirmDialog from '../components/ConfirmDialog'
import ViewToggle, { ViewMode } from '../components/ViewToggle'
import AddServiceModal from '../components/AddServiceModal'
import { Service } from '../types'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { serviceAPI } from '../utils/api'
import './ServicesManagement.css'

const ServicesManagement: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('All Categories')
  const [filterStatus, setFilterStatus] = useState('All Status')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('services-view-mode')
    return (saved === 'cards' || saved === 'list') ? saved : 'cards'
  })
  
  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('services-view-mode', viewMode)
  }, [viewMode])
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    service: Service | null
    action: 'activate' | 'deactivate' | null
  }>({ isOpen: false, service: null, action: null })
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 's',
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
  
  // Services page stats visibility state
  const [hiddenSections, setHiddenSections] = useState<{
    stats: boolean
  }>(() => {
    const saved = localStorage.getItem('services-hidden-sections')
    return saved ? JSON.parse(saved) : {
      stats: false
    }
  })

  // Save hidden sections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('services-hidden-sections', JSON.stringify(hiddenSections))
  }, [hiddenSections])

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true)
      try {
        const data = await serviceAPI.getAll({ 
          category: filterCategory !== 'All Categories' ? filterCategory : undefined,
          showArchived 
        })
        // Map backend data to frontend Service interface
        const mappedServices: Service[] = data.map((s: any) => ({
          id: s._id || s.id,
          name: s.name,
          category: s.category,
          price: s.price,
          unit: s.unit,
          description: s.description || '',
          isActive: s.isActive !== false,
          isPopular: s.isPopular || false,
          isArchived: s.isArchived || false
        }))
        setServices(mappedServices)
      } catch (error: any) {
        console.error('Error fetching services:', error)
        setError(error)
        toast.error('Failed to load services')
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [filterCategory, showArchived])

  const toggleSection = (section: keyof typeof hiddenSections) => {
    setHiddenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // (Removed unused resetAllSections)

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const data = await serviceAPI.getAll({ 
        category: filterCategory !== 'All Categories' ? filterCategory : undefined,
        showArchived 
      })
      // Map backend data to frontend Service interface
      const mappedServices: Service[] = data.map((s: any) => ({
        id: s._id || s.id,
        name: s.name,
        category: s.category,
        price: s.price,
        unit: s.unit,
        description: s.description || '',
        isActive: s.isActive !== false,
        isPopular: s.isPopular || false,
        isArchived: s.isArchived || false
      }))
      setServices(mappedServices)
      toast.success('Services refreshed successfully')
    } catch (error: any) {
      console.error('Error refreshing services:', error)
      toast.error('Failed to refresh services')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = (service: Service) => {
    const action = service.isActive ? 'deactivate' : 'activate'
    setConfirmDialog({ isOpen: true, service, action })
  }

  const confirmToggleStatus = async () => {
    if (confirmDialog.service) {
      try {
        const newIsActive = !confirmDialog.service.isActive
        await serviceAPI.update(confirmDialog.service.id, { isActive: newIsActive })
        setServices(services.map(svc => 
          svc.id === confirmDialog.service!.id 
            ? { ...svc, isActive: newIsActive }
            : svc
        ))
        toast.success(`Service ${confirmDialog.action === 'activate' ? 'activated' : 'deactivated'}!`)
        setConfirmDialog({ isOpen: false, service: null, action: null })
      } catch (error: any) {
        toast.error(error.message || 'Failed to update service status')
      }
    }
  }

  const handleArchive = async (serviceId: string, serviceName: string) => {
    try {
      await serviceAPI.archive(serviceId)
    setServices(services.map(s => s.id === serviceId ? { ...s, isArchived: true } : s))
    toast.success(`${serviceName} archived`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive service')
    }
  }

  const handleUnarchive = async (serviceId: string, serviceName: string) => {
    try {
      await serviceAPI.unarchive(serviceId)
      setServices(services.map(s => s.id === serviceId ? { ...s, isArchived: false } : s))
      toast.success(`${serviceName} unarchived`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to unarchive service')
    }
  }

  const togglePopular = (serviceId: string) => {
    setServices(services.map(svc =>
      svc.id === serviceId ? { ...svc, isPopular: !svc.isPopular } : svc
    ))
    toast.success('Updated!')
  }

  const openModal = (service: Service) => {
    setSelectedService({ ...service })
    setIsModalOpen(true)
    setIsEditMode(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedService(null)
    setIsEditMode(false)
  }

  const openAddModal = () => {
    setIsAddModalOpen(true)
  }

  const closeAddModal = () => {
    setIsAddModalOpen(false)
  }

  const handleServiceAdded = async (newService: Service) => {
    // Refresh the list from API to ensure consistency
    try {
      const data = await serviceAPI.getAll({ showArchived })
      // Map backend data to frontend Service interface
      const mappedServices: Service[] = data.map((s: any) => ({
        id: s._id || s.id,
        name: s.name,
        category: s.category,
        price: s.price,
        unit: s.unit,
        isActive: s.isActive !== false,
        isPopular: s.isPopular || false,
        isArchived: s.isArchived || false
      }))
      setServices(mappedServices)
    } catch (error) {
      // If refresh fails, still add the service locally as fallback
      console.error('Error refreshing services after add:', error)
    setServices(prev => [...prev, newService])
    }
  }

  const handleSave = async () => {
    if (!selectedService) return

    setIsLoading(true)
    
    try {
      // Prepare the data to send to the backend
      const updateData: any = {
        name: selectedService.name,
        category: selectedService.category,
        price: selectedService.price,
        unit: selectedService.unit,
        description: (selectedService as any).description || '',
        isActive: selectedService.isActive !== false,
        isPopular: selectedService.isPopular || false
      }

      // Call the API to update the service in the database
      const response = await serviceAPI.update(selectedService.id, updateData)
      
      // Get the updated service data from response
      const updatedServiceData = response.data || response

      // Map the response to frontend Service interface
      const updatedService: Service = {
        id: updatedServiceData._id || updatedServiceData.id || selectedService.id,
        name: updatedServiceData.name || selectedService.name,
        category: updatedServiceData.category || selectedService.category,
        price: updatedServiceData.price || selectedService.price,
        unit: updatedServiceData.unit || selectedService.unit,
        isActive: updatedServiceData.isActive !== false,
        isPopular: updatedServiceData.isPopular || false
      }

      // Update local state with the server response
      setServices(services.map(s => s.id === selectedService.id ? updatedService : s))
      
      setIsEditMode(false)
      toast.success('Service updated successfully!')
      closeModal()
    } catch (error: any) {
      console.error('Error updating service:', error)
      toast.error(error.message || 'Failed to update service. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredServices = services.filter(service => {
    if (!showArchived && (service as any).isArchived) return false
    if (showArchived && !(service as any).isArchived) return false
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'All Categories' || service.category === filterCategory
    const matchesStatus = filterStatus === 'All Status' || 
                         (filterStatus === 'Active' && service.isActive) ||
                         (filterStatus === 'Inactive' && !service.isActive)
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Calculate stats
  const totalServices = services.length
  const activeServices = services.filter(s => s.isActive).length
  const popularServices = services.filter(s => s.isPopular).length
  const avgPrice = Math.round(services.reduce((sum, s) => sum + s.price, 0) / services.length)

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="services-management-wrapper"
      >
        {/* Header */}
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">🧺 Services Management</h1>
            <p className="page-subtitle">Manage laundry services and pricing</p>
          </div>
          <div className="header-actions">
            <div className="dashboard-controls">
              <button 
                className="control-btn"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh services"
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
              <FiPlus /> Add New Service
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {!hiddenSections.stats && (
          <motion.div 
            className="services-stats-grid"
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
            <div className="stat-icon-small"><FiPackage /></div>
            <div>
              <div className="stat-number-small">{totalServices}</div>
              <div className="stat-label-small">Total Services</div>
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
              <div className="stat-number-small">{activeServices}</div>
              <div className="stat-label-small">Active Services</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small orange"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="stat-icon-small"><FiStar /></div>
            <div>
              <div className="stat-number-small">{popularServices}</div>
              <div className="stat-label-small">Popular Services</div>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card-small purple"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="stat-icon-small"><span style={{fontSize: '20px', fontWeight: 'bold'}}>₱</span></div>
            <div>
              <div className="stat-number-small">₱{avgPrice}</div>
              <div className="stat-label-small">Avg. Price</div>
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
              placeholder="Search services..."
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option>All Categories</option>
              <option>Washing</option>
              <option>Dry Cleaning</option>
              <option>Ironing</option>
              <option>Special</option>
            </select>

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
              className="view-toggle-services"
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
        {(filterCategory !== 'All Categories' || filterStatus !== 'All Status' || searchTerm) && (
          <FilterChips
            filters={
              [
                ...(filterCategory !== 'All Categories'
                  ? [{ label: `Category: ${filterCategory}`, value: 'category' }]
                  : []),
                ...(filterStatus !== 'All Status'
                  ? [{ label: `Status: ${filterStatus}`, value: 'status' }]
                  : []),
                ...(searchTerm
                  ? [{ label: `Search: "${searchTerm}"`, value: 'search' }]
                  : []),
              ] as Array<{ label: string; value: string }>
            }
            onRemove={(value) => {
              if (value === 'category') setFilterCategory('All Categories')
              if (value === 'status') setFilterStatus('All Status')
              if (value === 'search') setSearchTerm('')
            }}
            onClearAll={() => {
              setFilterCategory('All Categories')
              setFilterStatus('All Status')
              setSearchTerm('')
            }}
          />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState
            title="Failed to load services"
            message={error.message || 'An error occurred while loading services. Please try again.'}
            error={error}
            onRetry={() => {
              setError(null)
              const fetchServices = async () => {
                setIsLoading(true)
                try {
                  const data = await serviceAPI.getAll({ 
                    category: filterCategory !== 'All Categories' ? filterCategory : undefined,
                    showArchived 
                  })
                  const mappedServices: Service[] = data.map((s: any) => ({
                    id: s._id || s.id,
                    name: s.name,
                    category: s.category,
                    price: s.price,
                    unit: s.unit,
                    description: s.description || '',
                    isActive: s.isActive !== false,
                    isPopular: s.isPopular || false,
                    isArchived: s.isArchived || false
                  }))
                  setServices(mappedServices)
                } catch (err: any) {
                  setError(err)
                  toast.error('Failed to load services')
                } finally {
                  setIsLoading(false)
                }
              }
              fetchServices()
            }}
            variant="network"
          />
        )}

        {/* Services Display */}
        {!error && (
          <div className={`services-container ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
            {isLoading ? (
              viewMode === 'cards' ? (
                <CardSkeleton count={6} />
              ) : (
                <TableSkeleton rows={5} columns={7} />
              )
            ) : filteredServices.length === 0 ? (
              <EmptyState
                icon={<FiPackage />}
                title={searchTerm || filterCategory !== 'All' || filterStatus !== 'All Status' ? 'No services found' : 'No services yet'}
                description={
                  searchTerm || filterCategory !== 'All' || filterStatus !== 'All Status'
                    ? 'Try adjusting your search or filter criteria to find services.'
                    : 'Start by adding your first service to the system.'
                }
                actionLabel={searchTerm || filterCategory !== 'All' || filterStatus !== 'All Status' ? undefined : 'Add Service'}
                onAction={searchTerm || filterCategory !== 'All' || filterStatus !== 'All Status' ? undefined : () => setIsAddModalOpen(true)}
                type={searchTerm || filterCategory !== 'All' || filterStatus !== 'All Status' ? 'no-results' : 'empty'}
              />
            ) : viewMode === 'cards' ? (
              <div className="services-grid">
                {filteredServices.map((service, index) => (
                <motion.div
                  key={service.id}
                  className={`service-card ${!service.isActive ? 'inactive' : ''} ${(service as any).isArchived ? 'archived' : ''}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  {/* Popular Badge */}
                  {service.isPopular && (
                    <div className="popular-badge-top">
                      <FiStar size={12} /> Popular
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={`service-status-badge-top ${service.isActive ? 'active' : 'inactive'}`}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </div>

                  <div className="service-card-header">
                    <div className="service-icon-large">🧺</div>
                    <div className="service-price-large">
                      ₱{service.price}
                      <span className="price-unit">/{service.unit}</span>
                    </div>
                  </div>

                  <div className="service-card-body">
                    <h3 className="service-name-large">{service.name}</h3>
                    <div className="service-category-badge">{service.category}</div>
                    
                    <div className="service-details-row">
                      <div className="detail-item">
                        <span className="detail-label">Unit</span>
                        <span className="detail-value">{service.unit}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Price</span>
                        <span className="detail-value">₱{service.price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="service-card-footer">
                    <button
                      className="btn-icon-small"
                      onClick={() => openModal(service)}
                      title="View Details"
                    >
                      <FiPackage />
                    </button>
                    <button
                      className="btn-icon-small edit"
                      onClick={() => {
                        openModal(service)
                        setIsEditMode(true)
                      }}
                      title="Edit"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className="btn-icon-small star"
                      onClick={() => togglePopular(service.id)}
                      title={service.isPopular ? 'Remove from Popular' : 'Mark as Popular'}
                    >
                      <FiStar fill={service.isPopular ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className={`btn-toggle ${service.isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(service)}
                      title={service.isActive ? 'Deactivate Service' : 'Activate Service'}
                    >
                      {service.isActive ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                    </button>
                    <button
                      className={`btn-icon-small ${showArchived ? 'restore' : 'delete'}`}
                      onClick={() => showArchived ? handleUnarchive(service.id, service.name) : handleArchive(service.id, service.name)}
                      title={showArchived ? 'Unarchive' : 'Archive'}
                    >
                      {showArchived ? <FiRotateCw /> : <FiArchive />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            ) : (
              <div className="services-table-container">
                <div className="table-wrapper">
                  <table className="services-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Unit</th>
                        <th>Status</th>
                        <th>Popular</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServices.map((service, index) => (
                      <motion.tr
                        key={service.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`service-row ${!service.isActive ? 'inactive' : ''}`}
                      >
                        <td>
                          <div className="service-cell">
                            <div className="service-icon">🧺</div>
                            <span className="service-name">{service.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="service-category">{service.category}</span>
                        </td>
                        <td>
                          <span className="service-price">₱{service.price}</span>
                        </td>
                        <td>
                          <span className="service-unit">{service.unit}</span>
                        </td>
                        <td>
                          <span className={`service-status-badge ${service.isActive ? 'active' : 'inactive'}`}>
                            {service.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <span className={`popular-badge ${service.isPopular ? 'popular' : 'not-popular'}`}>
                            {service.isPopular ? '⭐ Popular' : 'No'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-row">
                            <button
                              className="btn-icon-small"
                              onClick={() => openModal(service)}
                              title="View Details"
                            >
                              <FiPackage />
                            </button>
                            <button
                              className="btn-icon-small edit"
                              onClick={() => {
                                openModal(service)
                                setIsEditMode(true)
                              }}
                              title="Edit"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="btn-icon-small star"
                              onClick={() => togglePopular(service.id)}
                              title={service.isPopular ? 'Remove from Popular' : 'Mark as Popular'}
                            >
                              <FiStar fill={service.isPopular ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              className={`btn-toggle-small ${service.isActive ? 'active' : 'inactive'}`}
                              onClick={() => handleToggleStatus(service)}
                              title={service.isActive ? 'Deactivate Service' : 'Activate Service'}
                            >
                              {service.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                            </button>
                            <button
                              className="btn-icon-small delete"
                              onClick={() => handleArchive(service.id, service.name)}
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
          )}

        {/* Service Details Modal */}
        <AnimatePresence>
          {isModalOpen && selectedService && (
            <div className="modal-overlay" onClick={closeModal}>
              <motion.div
                className="modal-large"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 className="modal-title">Service Details</h3>
                  <button className="btn-icon" onClick={closeModal}>
                    <FiX />
                  </button>
                </div>
                
                <div className="modal-body">
                  <div className="service-modal-header">
                    <div className="service-icon-modal">🧺</div>
                    <div>
                      <h2 className="service-name-modal">{selectedService.name}</h2>
                      <p className="service-category-modal">{selectedService.category}</p>
                      {selectedService.isPopular && (
                        <span className="popular-badge-modal">
                          <FiStar size={12} /> Popular Service
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="details-grid-2">
                    <div className="detail-card">
                      <label>Service Name</label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={selectedService.name}
                          onChange={(e) => setSelectedService({ ...selectedService, name: e.target.value })}
                        />
                      ) : (
                        <div className="detail-value">{selectedService.name}</div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Category</label>
                      {isEditMode ? (
                        <select
                          value={selectedService.category}
                          onChange={(e) => setSelectedService({ ...selectedService, category: e.target.value as any })}
                        >
                          <option>Washing</option>
                          <option>Dry Cleaning</option>
                          <option>Ironing</option>
                          <option>Special</option>
                        </select>
                      ) : (
                        <div className="detail-value">{selectedService.category}</div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Price</label>
                      {isEditMode ? (
                        <input
                          type="number"
                          value={selectedService.price}
                          onChange={(e) => setSelectedService({ ...selectedService, price: parseFloat(e.target.value) || 0 })}
                        />
                      ) : (
                        <div className="detail-value highlight-orange">₱{selectedService.price}</div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Unit</label>
                      {isEditMode ? (
                        <select
                          value={selectedService.unit}
                          onChange={(e) => setSelectedService({ ...selectedService, unit: e.target.value as any })}
                        >
                          <option value="item">Per Item</option>
                          <option value="kg">Per Kg</option>
                          <option value="flat">Flat Rate</option>
                        </select>
                      ) : (
                        <div className="detail-value">{selectedService.unit}</div>
                      )}
                    </div>
                    <div className="detail-card">
                      <label>Status</label>
                      <div className={`detail-value ${selectedService.isActive ? 'active' : 'inactive'}`}>
                        {selectedService.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="detail-card">
                      <label>Popular</label>
                      <div className="detail-value">
                        {selectedService.isPopular ? '⭐ Yes' : 'No'}
                      </div>
                    </div>
                  </div>

                  <div className="pricing-info">
                    <h4>Pricing Information</h4>
                    <p className="pricing-display">
                      ₱{selectedService.price} per {selectedService.unit}
                      {selectedService.unit === 'kg' && ' (Minimum 2kg)'}
                      {selectedService.unit === 'item' && ' (Per piece)'}
                      {selectedService.unit === 'flat' && ' (Fixed price)'}
                    </p>
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
                          <FiEdit2 />
                          Save Changes
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
          title={confirmDialog.action === 'activate' ? 'Activate Service?' : 'Deactivate Service?'}
          message={
            confirmDialog.action === 'activate'
              ? `Are you sure you want to activate "${confirmDialog.service?.name}"? It will be available for orders.`
              : `Are you sure you want to deactivate "${confirmDialog.service?.name}"? It will not be available for new orders.`
          }
          confirmLabel={confirmDialog.action === 'activate' ? 'Activate' : 'Deactivate'}
          cancelLabel="Cancel"
          type={confirmDialog.action === 'deactivate' ? 'warning' : 'info'}
          onConfirm={confirmToggleStatus}
          onCancel={() => setConfirmDialog({ isOpen: false, service: null, action: null })}
        />

        {/* Add Service Modal */}
        <AddServiceModal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          onServiceAdded={handleServiceAdded}
          existingServices={services}
        />
      </motion.div>
    </Layout>
  )
}

export default ServicesManagement

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiMapPin, FiEdit2, FiArchive, FiEye, FiX, FiPlus, FiRotateCcw, FiSave, FiTrash2, FiHash, FiPhone, FiFileText } from 'react-icons/fi'
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
import { Station } from '../types'
import { stationAPI } from '../utils/api'
import './StationManagement.css'

const StationManagement: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('stations-view-mode')
    return (saved === 'cards' || saved === 'list') ? saved : 'cards'
  })
  
  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('stations-view-mode', viewMode)
  }, [viewMode])
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [mapStation, setMapStation] = useState<Station | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    station: Station | null
    action: 'archive' | 'unarchive' | 'delete' | null
  }>({ isOpen: false, station: null, action: null })
  const [newStation, setNewStation] = useState({
    stationId: '',
    name: '',
    address: '',
    phone: '',
    notes: ''
  })

  // Generate next Station ID (e.g., BRANCH-001, BRANCH-002)
  const generateStationId = () => {
    const prefix = 'BRANCH-'
    const last = stations
      .filter(s => (s as any).stationId && (s as any).stationId.startsWith(prefix))
      .sort((a: any, b: any) => {
        const aNum = parseInt(String(a.stationId).split('-')[1]) || 0
        const bNum = parseInt(String(b.stationId).split('-')[1]) || 0
        return bNum - aNum
      })[0] as any | undefined
    if (last && last.stationId) {
      const lastNum = parseInt(String(last.stationId).split('-')[1]) || 0
      return `${prefix}${String(lastNum + 1).padStart(3, '0')}`
    }
    return `${prefix}001`
  }

  // Fetch stations from API
  useEffect(() => {
    const fetchStations = async () => {
      setIsLoading(true)
      try {
        const data = await stationAPI.getAll({ showArchived })
        setStations(data)
      } catch (error: any) {
        setError(error)
        toast.error(error.message || 'Failed to load stations')
      } finally {
        setIsLoading(false)
      }
    }
    fetchStations()
  }, [showArchived])

  // Filter stations by search term
  const filteredStations = stations.filter(station =>
    station.stationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (station.address && station.address.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const openModal = (station: Station) => {
    setSelectedStation({ 
      ...station,
      address: station.address ?? '',
      phone: station.phone ?? '',
      notes: station.notes ?? ''
    })
    setIsModalOpen(true)
    setIsEditMode(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedStation(null)
    setIsEditMode(false)
  }

  const handleUpdate = () => {
    setIsEditMode(true)
  }

  const handleSave = async () => {
    if (!selectedStation) return

    setIsLoading(true)
    try {
      // Use the latest state value to ensure we have the most recent changes
      const stationToSave = selectedStation
      const stationId = stationToSave._id || stationToSave.id
      
      if (!stationId) {
        toast.error('Station ID is missing')
        setIsLoading(false)
        return
      }

      await stationAPI.update(stationId, {
        stationId: stationToSave.stationId || '',
        name: stationToSave.name || '',
        address: stationToSave.address ?? '', // Use nullish coalescing to handle null/undefined
        phone: stationToSave.phone ?? '',
        notes: stationToSave.notes ?? '',
        isActive: stationToSave.isActive !== false
      })
      toast.success('Station updated successfully')
      closeModal()
      // Refresh stations
      const data = await stationAPI.getAll({ showArchived })
      const mappedStations: Station[] = data.map((s: any) => ({
        _id: s._id,
        id: s._id,
        stationId: s.stationId,
        name: s.name,
        address: s.address || '',
        phone: s.phone || '',
        isActive: s.isActive !== false,
        isArchived: s.isArchived || false,
        notes: s.notes || ''
      }))
      setStations(mappedStations)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update station')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddStation = async () => {
    if (!newStation.stationId || !newStation.name) {
      toast.error('Station ID and name are required')
      return
    }

    setIsLoading(true)
    try {
      await stationAPI.create(newStation)
      toast.success('Station created successfully')
      setIsAddModalOpen(false)
      setNewStation({ stationId: '', name: '', address: '', phone: '', notes: '' })
      // Refresh stations
      const data = await stationAPI.getAll({ showArchived })
      const mappedStations: Station[] = data.map((s: any) => ({
        _id: s._id,
        id: s._id,
        stationId: s.stationId,
        name: s.name,
        address: s.address || '',
        phone: s.phone || '',
        isActive: s.isActive !== false,
        isArchived: s.isArchived || false,
        notes: s.notes || ''
      }))
      setStations(mappedStations)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create station')
    } finally {
      setIsLoading(false)
    }
  }

  const handleArchive = async (station: Station) => {
    setIsLoading(true)
    try {
      await stationAPI.archive(station._id || station.id || '')
      toast.success('Station archived successfully')
      // Refresh stations
      const data = await stationAPI.getAll({ showArchived })
      const mappedStations: Station[] = data.map((s: any) => ({
        _id: s._id,
        id: s._id,
        stationId: s.stationId,
        name: s.name,
        address: s.address || '',
        phone: s.phone || '',
        isActive: s.isActive !== false,
        isArchived: s.isArchived || false,
        notes: s.notes || ''
      }))
      setStations(mappedStations)
      setConfirmDialog({ isOpen: false, station: null, action: null })
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive station')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnarchive = async (station: Station) => {
    setIsLoading(true)
    try {
      await stationAPI.unarchive(station._id || station.id || '')
      toast.success('Station unarchived successfully')
      // Refresh stations
      const data = await stationAPI.getAll({ showArchived })
      const mappedStations: Station[] = data.map((s: any) => ({
        _id: s._id,
        id: s._id,
        stationId: s.stationId,
        name: s.name,
        address: s.address || '',
        phone: s.phone || '',
        isActive: s.isActive !== false,
        isArchived: s.isArchived || false,
        notes: s.notes || ''
      }))
      setStations(mappedStations)
      setConfirmDialog({ isOpen: false, station: null, action: null })
    } catch (error: any) {
      toast.error(error.message || 'Failed to unarchive station')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (station: Station) => {
    setIsLoading(true)
    try {
      await stationAPI.delete(station._id || station.id || '')
      toast.success('Station deleted successfully')
      // Refresh stations
      const data = await stationAPI.getAll({ showArchived })
      const mappedStations: Station[] = data.map((s: any) => ({
        _id: s._id,
        id: s._id,
        stationId: s.stationId,
        name: s.name,
        address: s.address || '',
        phone: s.phone || '',
        isActive: s.isActive !== false,
        isArchived: s.isArchived || false,
        notes: s.notes || ''
      }))
      setStations(mappedStations)
      setConfirmDialog({ isOpen: false, station: null, action: null })
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete station')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <div className="station-management-wrapper">
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">Station Management</h1>
            <p className="page-subtitle">Manage branches and stations</p>
          </div>
          <div className="header-actions">
            <ViewToggle
              currentView={viewMode}
              onViewChange={setViewMode}
            />
            <button
              className={`control-btn ${showArchived ? 'active' : ''}`}
              onClick={() => setShowArchived(!showArchived)}
            >
              <FiArchive />
              {showArchived ? 'Show Active' : 'Show Archived'}
            </button>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <FiPlus />
              Add Station
            </Button>
          </div>
        </div>

        <div className="search-filter-bar">
          <div className="search-box-large">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by ID, name, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <FiX />
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        {searchTerm && (
          <FilterChips
            filters={[{
              label: `Search: "${searchTerm}"`,
              value: 'search',
              variant: 'default' as const
            }]}
            onRemove={() => setSearchTerm('')}
            showClearAll={false}
          />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState
            title="Failed to load stations"
            message={error.message || 'An error occurred while loading stations. Please try again.'}
            error={error}
            onRetry={() => {
              setError(null)
              const fetchStations = async () => {
                setIsLoading(true)
                try {
                  const data = await stationAPI.getAll({ showArchived })
                  setStations(data)
                } catch (err: any) {
                  setError(err)
                  toast.error(err.message || 'Failed to load stations')
                } finally {
                  setIsLoading(false)
                }
              }
              fetchStations()
            }}
            variant="network"
          />
        )}

        {/* Stations Display */}
        {!error && (
          <div className="stations-grid-container">
            {isLoading ? (
              viewMode === 'cards' ? (
                <CardSkeleton count={6} />
              ) : (
                <TableSkeleton rows={5} columns={6} />
              )
            ) : filteredStations.length === 0 ? (
              <EmptyState
                icon={<FiMapPin />}
                title={searchTerm ? 'No stations found' : showArchived ? 'No archived stations' : 'No stations yet'}
                description={
                  searchTerm
                    ? 'Try adjusting your search criteria to find stations.'
                    : showArchived
                    ? 'You don\'t have any archived stations.'
                    : 'Start by adding your first station to the system.'
                }
                actionLabel={searchTerm ? undefined : (showArchived ? undefined : 'Add Station')}
                onAction={searchTerm ? undefined : (showArchived ? undefined : () => setIsAddModalOpen(true))}
                type={searchTerm ? 'no-results' : 'empty'}
              />
            ) : viewMode === 'cards' ? (
              <div className="stations-grid">
                {filteredStations.map((station) => (
                  <motion.div
                    key={station._id || station.id}
                    className={`station-card ${!station.isActive ? 'inactive' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => openModal(station)}
                  >
                    <div className="station-card-header">
                      <div className="station-icon-large">
                        <FiMapPin />
                      </div>
                      <div className={`station-status-badge-top ${station.isActive ? 'active' : 'inactive'}`}>
                        {station.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="station-card-body">
                      <h3 className="station-id">{station.stationId}</h3>
                      <h4 className="station-name">{station.name}</h4>
                      {station.address && (
                        <p className="station-address">{station.address}</p>
                      )}
                      {station.phone && (
                        <p className="station-phone">{station.phone}</p>
                      )}
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      className="control-btn"
                      onClick={(e) => { e.stopPropagation(); setMapStation(station); setIsMapOpen(true) }}
                      title="View on Map"
                    >
                      <FiMapPin /> View Map
                    </button>
                  </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="stations-list">
                <div className="list-header">
                  <div className="list-header-cell">Station ID</div>
                  <div className="list-header-cell">Name</div>
                  <div className="list-header-cell">Address</div>
                  <div className="list-header-cell">Phone</div>
                  <div className="list-header-cell">Status</div>
                  <div className="list-header-cell">Actions</div>
                </div>
                {filteredStations.map((station, idx) => (
                  <motion.div
                    key={station._id || station.id}
                    className={`station-list-item ${!station.isActive ? 'inactive' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  >
                    <div className="list-cell mono">{station.stationId}</div>
                    <div className="list-cell">{station.name}</div>
                    <div className="list-cell ellipsis">{station.address || '-'}</div>
                    <div className="list-cell">{station.phone || '-'}</div>
                    <div className="list-cell">
                      <span className={`station-status-badge-list ${station.isActive ? 'active' : 'inactive'}`}>
                        {station.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="list-cell actions">
                      <div className="action-buttons-row">
                        <button
                          className="btn-icon-small"
                          onClick={() => openModal(station)}
                          title="View Details"
                        >
                          <FiEye />
                        </button>
                        <button
                          className="btn-icon-small"
                          onClick={() => { 
                            setSelectedStation({ 
                              ...station,
                              address: station.address ?? '',
                              phone: station.phone ?? '',
                              notes: station.notes ?? ''
                            }); 
                            setIsModalOpen(true); 
                            setIsEditMode(true) 
                          }}
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>
                      <button
                        className="btn-icon-small"
                        onClick={() => { setMapStation(station); setIsMapOpen(true) }}
                        title="View on Map"
                      >
                        <FiMapPin />
                      </button>
                        <button
                          className={`btn-icon-small ${station.isArchived ? 'restore' : 'delete'}`}
                          onClick={() => station.isArchived ? handleUnarchive(station) : setConfirmDialog({ isOpen: true, station, action: 'archive' })}
                          title={station.isArchived ? 'Unarchive' : 'Archive'}
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
          )}

        {/* View/Edit Modal */}
        <AnimatePresence>
          {isModalOpen && selectedStation && (
            <div className="modal-overlay" onClick={closeModal}>
              <motion.div
                className="modal-large"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 className="modal-title">Station Details</h3>
                  <button className="btn-icon" onClick={closeModal}>
                    <FiX />
                  </button>
                </div>

                {isEditMode ? (
                  <div className="modal-body">
                    <div className="modal-form">
                      <div className="form-group">
                        <label>Station ID</label>
                        <input
                          type="text"
                          value={selectedStation.stationId}
                          onChange={(e) => setSelectedStation(prev => prev ? { ...prev, stationId: e.target.value.toUpperCase() } : null)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={selectedStation.name}
                          onChange={(e) => setSelectedStation(prev => prev ? { ...prev, name: e.target.value } : null)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Address</label>
                        <textarea
                          value={selectedStation.address || ''}
                          onChange={(e) => setSelectedStation(prev => prev ? { ...prev, address: e.target.value } : null)}
                          rows={3}
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone</label>
                        <input
                          type="text"
                          value={selectedStation.phone || ''}
                          onChange={(e) => setSelectedStation(prev => prev ? { ...prev, phone: e.target.value } : null)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Notes</label>
                        <textarea
                          value={selectedStation.notes || ''}
                          onChange={(e) => setSelectedStation(prev => prev ? { ...prev, notes: e.target.value } : null)}
                          rows={3}
                        />
                      </div>
                      <div className="form-group">
                        <label>Status</label>
                        <select
                          value={selectedStation.isActive ? 'Active' : 'Inactive'}
                          onChange={(e) => setSelectedStation(prev => prev ? { ...prev, isActive: e.target.value === 'Active' } : null)}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <Button variant="secondary" onClick={() => setIsEditMode(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isLoading}>
                        <FiSave />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="modal-body">
                    {selectedStation.address && (
                      <div className="station-details-header">
                        <div className="station-map-preview">
                          <iframe
                            title="Station Location"
                            width="100%"
                            height="100%"
                            style={{ border: 0, borderRadius: '8px' }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.google.com/maps?q=${encodeURIComponent(selectedStation.address)}&output=embed`}
                          />
                        </div>
                      </div>
                    )}

                    <div className="details-grid-2">
                      <div className="detail-card">
                        <label>Station ID</label>
                        <div className="detail-value highlight-blue" style={{ fontFamily: 'monospace' }}>
                          {selectedStation.stationId}
                        </div>
                      </div>
                      <div className="detail-card">
                        <label>Name</label>
                        <div className="detail-value">{selectedStation.name}</div>
                      </div>
                      {selectedStation.address && (
                        <div className="detail-card">
                          <label>Address</label>
                          <div className="detail-value">
                            <FiMapPin size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            {selectedStation.address}
                          </div>
                        </div>
                      )}
                      {selectedStation.phone && (
                        <div className="detail-card">
                          <label>Phone</label>
                          <div className="detail-value">
                            <FiPhone size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            {selectedStation.phone}
                          </div>
                        </div>
                      )}
                      <div className="detail-card">
                        <label>Status</label>
                        <div className={`station-status-badge ${selectedStation.isActive ? 'active' : 'inactive'}`}>
                          {selectedStation.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      {selectedStation.notes && (
                        <div className="detail-card" style={{ gridColumn: '1 / -1' }}>
                          <label>Notes</label>
                          <div className="detail-value">
                            <FiFileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            {selectedStation.notes}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="modal-footer">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (selectedStation.isArchived) {
                            setConfirmDialog({ isOpen: true, station: selectedStation, action: 'unarchive' })
                          } else {
                            setConfirmDialog({ isOpen: true, station: selectedStation, action: 'archive' })
                          }
                        }}
                      >
                        <FiArchive />
                        {selectedStation.isArchived ? 'Unarchive' : 'Archive'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setConfirmDialog({ isOpen: true, station: selectedStation, action: 'delete' })}
                      >
                        <FiTrash2 />
                        Delete
                      </Button>
                      <Button onClick={handleUpdate}>
                        <FiEdit2 />
                        Edit
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Map Modal */}
        <AnimatePresence>
          {isMapOpen && mapStation && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsMapOpen(false); setMapStation(null) }}
            >
              <motion.div
                className="modal-large"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}
              >
                <div className="modal-header">
                  <div>
                    <h3 className="modal-title">{mapStation.name}</h3>
                    <p className="modal-subtitle">{mapStation.address || 'No address provided'}</p>
                  </div>
                  <button className="btn-icon" onClick={() => { setIsMapOpen(false); setMapStation(null) }}>
                    <FiX />
                  </button>
                </div>
                <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-gray-200)' }}>
                  <iframe
                    title="Station Location"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapStation.address || mapStation.name)}&output=embed`}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Station Modal */}
        <AnimatePresence>
          {isAddModalOpen && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
            >
              <motion.div
                className="modal-large"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 className="modal-title">Add New Branch</h3>
                  <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                    <FiX />
                  </button>
                </div>
                <div className="modal-form">
                  <div className="form-group">
                    <label>
                      <FiHash style={{ marginRight: 6 }} /> Station ID *
                      <button
                        type="button"
                        className="auto-generate-btn"
                        onClick={() => {
                          const id = generateStationId()
                          setNewStation({ ...newStation, stationId: id })
                          toast.success(`Generated ID: ${id}`)
                        }}
                        title="Auto-generate ID"
                        style={{ marginLeft: 'auto' }}
                      >
                        Auto
                      </button>
                    </label>
                    <input
                      type="text"
                      value={newStation.stationId}
                      onChange={(e) => setNewStation({ ...newStation, stationId: e.target.value.toUpperCase() })}
                      placeholder="BRANCH-001"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newStation.name}
                      onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                      placeholder="Main Branch"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      value={newStation.address}
                      onChange={(e) => setNewStation({ ...newStation, address: e.target.value })}
                      placeholder="123 Main Street, City Center"
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={newStation.phone}
                      onChange={(e) => setNewStation({ ...newStation, phone: e.target.value })}
                      placeholder="+63 2 1234 5678"
                    />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={newStation.notes}
                      onChange={(e) => setNewStation({ ...newStation, notes: e.target.value })}
                      placeholder="Additional details..."
                      rows={2}
                    />
                  </div>

                  <div className="form-actions">
                    <Button
                      onClick={async () => {
                        if (!newStation.stationId || !newStation.name) {
                          toast.error('Station ID and Name are required')
                          return
                        }
                        try {
                          const payload = {
                            stationId: newStation.stationId.toUpperCase().trim(),
                            name: newStation.name.trim(),
                            address: newStation.address.trim(),
                            phone: newStation.phone.trim(),
                            notes: newStation.notes.trim()
                          }
                          const created = await stationAPI.create(payload)
                          setStations([created, ...stations])
                          toast.success('Branch created')
                          setIsAddModalOpen(false)
                          setNewStation({ stationId: '', name: '', address: '', phone: '', notes: '' })
                        } catch (e: any) {
                          toast.error(e.message || 'Failed to create branch')
                        }
                      }}
                    >
                      <FiSave /> Save Branch
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, station: null, action: null })}
          onConfirm={() => {
            if (!confirmDialog.station) return
            if (confirmDialog.action === 'archive') {
              handleArchive(confirmDialog.station)
            } else if (confirmDialog.action === 'unarchive') {
              handleUnarchive(confirmDialog.station)
            } else if (confirmDialog.action === 'delete') {
              handleDelete(confirmDialog.station)
            }
          }}
          title={
            confirmDialog.action === 'delete'
              ? 'Delete Station?'
              : confirmDialog.action === 'archive'
              ? 'Archive Station?'
              : 'Unarchive Station?'
          }
          message={
            confirmDialog.action === 'delete'
              ? `Are you sure you want to permanently delete "${confirmDialog.station?.name}"? This action cannot be undone.`
              : confirmDialog.action === 'archive'
              ? `Are you sure you want to archive "${confirmDialog.station?.name}"? It will be hidden from active lists.`
              : `Are you sure you want to unarchive "${confirmDialog.station?.name}"? It will be visible in active lists.`
          }
        />
      </div>
    </Layout>
  )
}

export default StationManagement


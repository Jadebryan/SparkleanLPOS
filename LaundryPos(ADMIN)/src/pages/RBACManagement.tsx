import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FiRefreshCw,
  FiShield,
  FiCheck,
  FiX,
  FiUsers,
  FiCalendar,
  FiEdit2,
  FiSearch,
  FiGrid,
  FiEye,
  FiEyeOff
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import ConfirmDialog from '../components/ConfirmDialog'
import { useUser } from '../context/UserContext'
import { rbacAPI } from '../utils/api'
import './RBACManagement.css'

interface Permission {
  resource: string
  actions: string[]
}

interface RolePermission {
  role: string
  permissions: Permission[]
  description?: string
  updatedAt?: string
  updatedBy?: {
    username: string
    email: string
  }
}

const RBACManagement: React.FC = () => {
  const { user } = useUser()
  const navigate = useNavigate()
  const [roles, setRoles] = useState<RolePermission[]>([])
  const [availableResources, setAvailableResources] = useState<Record<string, string[]>>({})
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [originalPermissions, setOriginalPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false)
  const [permissionSearch, setPermissionSearch] = useState('')
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState<'enable' | 'disable' | null>(null)
  const [bulkResource, setBulkResource] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showStats, setShowStats] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('rbac-show-stats')
    return saved ? JSON.parse(saved) : true
  })

  useEffect(() => {
    localStorage.setItem('rbac-show-stats', JSON.stringify(showStats))
  }, [showStats])

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [resourcesResponse, rolesResponse] = await Promise.all([
        rbacAPI.getAvailableResources(),
        rbacAPI.getAllRolePermissions()
      ])
      
      const resourcesData = resourcesResponse?.data || resourcesResponse || {}
      const rolesData = rolesResponse?.data || rolesResponse || []
      
      setAvailableResources(resourcesData)
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch (error: any) {
      console.error('Error loading RBAC data:', error)
      toast.error(error.message || 'Failed to load RBAC data')
      setAvailableResources({})
      setRoles([])
    } finally {
      setIsLoading(false)
    }
  }

  const clonePermissions = (perms: Permission[]) =>
    perms.map(p => ({
      resource: p.resource,
      actions: [...p.actions].sort()
    }))

  const normalizePermissions = (perms: Permission[]) =>
    clonePermissions(perms).sort((a, b) => a.resource.localeCompare(b.resource))

  const arePermissionsEqual = (a: Permission[], b: Permission[]) =>
    JSON.stringify(normalizePermissions(a)) === JSON.stringify(normalizePermissions(b))

  const loadRolePermissions = async (role: string) => {
    try {
      setIsPermissionsLoading(true)
      const roleResponse = await rbacAPI.getRolePermission(role)
      const roleData = roleResponse?.data || roleResponse || {}
      const perms = Array.isArray(roleData.permissions) ? roleData.permissions : []
      const normalized = normalizePermissions(perms)
      setPermissions(clonePermissions(normalized))
      setOriginalPermissions(clonePermissions(normalized))
      setHasChanges(false)
    } catch (error: any) {
      console.error('Error loading role permissions:', error)
      toast.error(error.message || 'Failed to load role permissions')
      setPermissions([])
      setOriginalPermissions([])
      setHasChanges(false)
    } finally {
      setIsPermissionsLoading(false)
    }
  }

  const openEditModal = async (role: string) => {
    setSelectedRole(role)
    setPermissionSearch('')
    setIsEditModalOpen(true)
    await loadRolePermissions(role)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedRole(null)
    setPermissions([])
    setOriginalPermissions([])
    setPermissionSearch('')
    setShowResetDialog(false)
    setShowBulkDialog(false)
    setBulkResource(null)
    setBulkAction(null)
    setHasChanges(false)
    setIsUpdatingPermissions(false)
  }

  const getRoleDisplayName = useCallback((role: string) => {
    if (!role) return 'Role'
    return role.charAt(0).toUpperCase() + role.slice(1)
  }, [])

  const getResourceDisplayName = useCallback((resource: string) => {
    return resource
      .split(/(?=[A-Z])/)
      .join(' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }, [])

  const formatDate = (value?: string) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleString()
    } catch {
      return value
    }
  }

  const selectedRoleMeta = useMemo(() => {
    if (!selectedRole) return null
    return roles.find(r => r.role === selectedRole) || null
  }, [roles, selectedRole])

  const totalResources = useMemo(
    () => Object.keys(availableResources).length,
    [availableResources]
  )

  const totalActions = useMemo(
    () => Object.values(availableResources).reduce((sum, actions) => sum + actions.length, 0),
    [availableResources]
  )

  const permissionSummary = (role: RolePermission) => {
    const resourceCount = role.permissions?.length || 0
    const actionCount =
      role.permissions?.reduce((sum, perm) => sum + perm.actions.length, 0) || 0
    return `${actionCount} actions • ${resourceCount} resources`
  }

  const filteredResources = useMemo(() => {
    const entries = Object.entries(availableResources)
    if (!permissionSearch.trim()) return entries
    const term = permissionSearch.toLowerCase()
    return entries.filter(([resource]) =>
      getResourceDisplayName(resource).toLowerCase().includes(term)
    )
  }, [availableResources, permissionSearch, getResourceDisplayName])

  const hasPermission = (resource: string, action: string): boolean => {
    const resourcePerm = permissions.find(p => p.resource === resource)
    return resourcePerm ? resourcePerm.actions.includes(action) : false
  }

  const togglePermission = (resource: string, action: string) => {
    if (!selectedRole) return

    const currentHasPerm = hasPermission(resource, action)
    
    const updatedPermissions = [...permissions]
    const resourceIndex = updatedPermissions.findIndex(p => p.resource === resource)
    
    if (resourceIndex === -1) {
      updatedPermissions.push({ resource, actions: [action] })
    } else {
      const resourcePerm = updatedPermissions[resourceIndex]
      const actionIndex = resourcePerm.actions.indexOf(action)
      
      if (actionIndex === -1) {
        resourcePerm.actions.push(action)
      } else {
        resourcePerm.actions.splice(actionIndex, 1)
        if (resourcePerm.actions.length === 0) {
          updatedPermissions.splice(resourceIndex, 1)
        }
      }
    }
    
    setPermissions(updatedPermissions)
    setHasChanges(!arePermissionsEqual(updatedPermissions, originalPermissions))
  }

  const handleResetClick = () => {
    if (!selectedRole) return
    setShowResetDialog(true)
  }

  const handleBulkToggleResource = (resource: string) => {
    if (!selectedRole) return
    const resourcePerm = permissions.find(p => p.resource === resource)
    const resourceActions = availableResources[resource] || []
    const allEnabled = resourceActions.every(action => resourcePerm?.actions.includes(action))
    
    setBulkResource(resource)
    setBulkAction(allEnabled ? 'disable' : 'enable')
    setShowBulkDialog(true)
  }

  const handleBulkToggleAll = () => {
    if (!selectedRole) return
    const allResources = Object.keys(availableResources)
    const allEnabled = allResources.every(resource => {
      const resourcePerm = permissions.find(p => p.resource === resource)
      const resourceActions = availableResources[resource] || []
      return resourceActions.every(action => resourcePerm?.actions.includes(action))
    })
    
    setBulkResource(null)
    setBulkAction(allEnabled ? 'disable' : 'enable')
    setShowBulkDialog(true)
  }

  const handleBulkConfirm = () => {
    if (!selectedRole) return
    setShowBulkDialog(false)
    
      let updatedPermissions: Permission[] = [...permissions]
      
      if (bulkResource) {
        const resourceActions = availableResources[bulkResource] || []
        const resourceIndex = updatedPermissions.findIndex(p => p.resource === bulkResource)
        
        if (bulkAction === 'enable') {
          if (resourceIndex === -1) {
            updatedPermissions.push({
              resource: bulkResource,
              actions: [...resourceActions]
            })
          } else {
            updatedPermissions[resourceIndex].actions = [...resourceActions]
          }
      } else if (resourceIndex !== -1) {
            updatedPermissions.splice(resourceIndex, 1)
        }
      } else {
        if (bulkAction === 'enable') {
          updatedPermissions = Object.entries(availableResources).map(([resource, actions]) => ({
            resource,
            actions: [...actions]
          }))
        } else {
          updatedPermissions = []
        }
      }
      
    setPermissions(updatedPermissions)
    setHasChanges(!arePermissionsEqual(updatedPermissions, originalPermissions))
      setBulkResource(null)
      setBulkAction(null)
  }

  const handleResetConfirm = async () => {
    if (!selectedRole) return
    setShowResetDialog(false)
    
    try {
      setIsSaving(true)
      await rbacAPI.resetRolePermission(selectedRole)
      const { clearPermissionsCache } = await import('../hooks/usePermissions')
      clearPermissionsCache()
      await loadRolePermissions(selectedRole)
      await loadData()
      toast.success('Permissions reset to default successfully!', {
        duration: 2000,
        icon: '✅'
      })
    } catch (error: any) {
      console.error('Error resetting permissions:', error)
      toast.error(error.message || 'Failed to reset permissions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdatePermissions = async () => {
    if (!selectedRole || !hasChanges) return
    try {
      setIsUpdatingPermissions(true)
      await rbacAPI.updateRolePermission(selectedRole, permissions)
      const { clearPermissionsCache } = await import('../hooks/usePermissions')
      clearPermissionsCache()
      setOriginalPermissions(clonePermissions(permissions))
      setHasChanges(false)
      setRoles(prev =>
        prev.map(role =>
          role.role === selectedRole ? { ...role, permissions: permissions } : role
        )
      )
      toast.success('Permissions updated successfully. Refreshing...')
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error: any) {
      console.error('Error updating permissions:', error)
      toast.error(error.message || 'Failed to update permissions')
    } finally {
      setIsUpdatingPermissions(false)
    }
  }

  const handleCancelChanges = () => {
    if (!selectedRole) return
    setPermissions(clonePermissions(originalPermissions))
    setHasChanges(false)
    closeEditModal()
  }

  const handleInitialize = async () => {
    try {
      setIsSaving(true)
      await rbacAPI.initializeRBAC()
      toast.success('RBAC initialized successfully!')
      await loadData()
    } catch (error: any) {
      console.error('Error initializing RBAC:', error)
      toast.error(error.message || 'Failed to initialize RBAC')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !user) {
    return (
      <Layout>
        <div className="rbac-loading">
          <LoadingSpinner />
          <p>Loading RBAC permissions...</p>
        </div>
      </Layout>
    )
  }

  if (user.role !== 'admin') {
    return (
      <Layout>
        <div className="rbac-loading">
          <p>Access denied. Admin only.</p>
        </div>
      </Layout>
    )
  }

  if (!availableResources || Object.keys(availableResources).length === 0) {
    return (
      <Layout>
        <div className="rbac-loading">
          <LoadingSpinner />
          <p>Loading RBAC resources...</p>
        </div>
      </Layout>
    )
  }

  const areAllPermissionsEnabled = selectedRole
    ? Object.entries(availableResources).every(([resource, actions]) => {
        const resourcePerm = permissions.find(p => p.resource === resource)
        return actions.every(action => resourcePerm?.actions.includes(action))
      })
    : false

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rbac-management-wrapper"
      >
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">
              <FiShield size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
              Role-Based Access Control
            </h1>
            <p className="page-subtitle">
              Centralize role permissions in a table-first workflow. Click edit to adjust rules.
            </p>
          </div>
          <div className="header-actions">
            <button
              className={`rbac-toggle-btn ${showStats ? '' : 'active'}`}
              onClick={() => setShowStats(prev => !prev)}
              title={showStats ? 'Hide stats cards' : 'Show stats cards'}
            >
              {showStats ? <FiEye size={16} /> : <FiEyeOff size={16} />}
              <span>Stats</span>
            </button>
            <Button variant="primary" onClick={handleInitialize} disabled={isSaving}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <motion.div
                  animate={{ rotate: isSaving ? 360 : 0 }}
                  transition={{ 
                    rotate: { 
                      duration: 1, 
                      repeat: isSaving ? Infinity : 0, 
                      ease: "linear" 
                    } 
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  <FiRefreshCw />
                </motion.div>
                <span>{isSaving ? 'Initializing...' : 'Initialize RBAC'}</span>
              </span>
            </Button>
          </div>
        </div>

        {showStats && (
          <div className="rbac-stats-row">
            <div className="rbac-stat-card blue">
              <div className="stat-icon">
                <FiShield />
              </div>
              <div>
                <div className="stat-label">Roles</div>
                <div className="stat-value">{roles.length}</div>
              </div>
            </div>
            <div className="rbac-stat-card purple">
              <div className="stat-icon">
                <FiGrid />
              </div>
              <div>
                <div className="stat-label">Resources</div>
                <div className="stat-value">{totalResources}</div>
              </div>
            </div>
            <div className="rbac-stat-card green">
              <div className="stat-icon">
                <FiCheck />
              </div>
              <div>
                <div className="stat-label">Actions</div>
                <div className="stat-value">{totalActions}</div>
              </div>
            </div>
          </div>
        )}

        <div className="rbac-table-card">
          <div className="rbac-table-header">
              <div>
              <h3>Roles & Permission Sets</h3>
              <p>Track who can access what. Use the edit button to update permissions.</p>
            </div>
            <div className="table-meta-chip">{roles.length} active roles</div>
          </div>

          <div className="table-wrapper-scroll">
            <table className="rbac-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Description</th>
                  <th>Permissions</th>
                  <th>Last Updated</th>
                  <th style={{ width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      No roles found. Initialize RBAC to load defaults.
                    </td>
                  </tr>
                )}
                {roles.map(role => (
                  <tr key={role.role}>
                    <td>
                      <div className="role-cell">
                        <span className={`role-chip ${role.role}`}>
                          {getRoleDisplayName(role.role)}
                        </span>
                        <small>
                          {role.role === 'admin' ? 'Full system access' : 'Operational access'}
                        </small>
                      </div>
                    </td>
                    <td>
                      {role.description || 'Custom permission set for this role.'}
                    </td>
                    <td>
                      <div className="permission-summary">
                        <span>{permissionSummary(role)}</span>
                        <div className="resource-badges">
                          {(role.permissions || []).map(resource => (
                            <span key={resource.resource} className="resource-badge">
                              <span className="resource-name">
                                {getResourceDisplayName(resource.resource)}
                              </span>
                              <span className="resource-actions-list">
                                {(resource.actions && resource.actions.length > 0)
                                  ? resource.actions.join(', ')
                                  : 'No actions'}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="updated-meta">
                        <FiCalendar size={14} />
                        <span>{formatDate(role.updatedAt)}</span>
                      </div>
                      {role.updatedBy?.username && (
                        <div className="updated-meta">
                          <FiUsers size={14} />
                          <span>{role.updatedBy.username}</span>
              </div>
                      )}
                    </td>
                    <td>
              <Button
                variant="secondary"
                        onClick={() => openEditModal(role.role)}
                        style={{ width: '100%' }}
              >
                        <FiEdit2 /> Edit
              </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rbac-info-box">
          <h4>ℹ️ RBAC Tips</h4>
          <ul>
            <li>Use the table to review every role before editing.</li>
            <li>
              Edits happen inside the modal so the main table always stays visible in the
              background.
            </li>
            <li>
              Enable/disable entire columns with the top controls to speed up permission
              changes.
            </li>
          </ul>
        </div>

        <AnimatePresence>
          {isEditModalOpen && selectedRole && (
            <motion.div
              className="rbac-modal-overlay"
              onClick={closeEditModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="rbac-modal"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="rbac-modal-header">
                  <div>
                    <span className="modal-label">Editing</span>
                    <h2>{getRoleDisplayName(selectedRole)}</h2>
                    <p>Toggle permissions per resource. Save to apply changes.</p>
                  </div>
                  <button className="modal-close" onClick={closeEditModal}>
                    <FiX size={20} />
                  </button>
                </div>

                <div className="modal-toolbar">
                  <div className="role-meta">
                    <span>
                      <FiUsers /> {selectedRoleMeta?.updatedBy?.username || 'System'}
                    </span>
                    <span>
                      <FiCalendar /> {formatDate(selectedRoleMeta?.updatedAt)}
                    </span>
                  </div>
                  <div className="modal-actions">
                    <div className="modal-search">
                      <FiSearch size={16} />
                      <input
                        placeholder="Search resources..."
                        value={permissionSearch}
                        onChange={e => setPermissionSearch(e.target.value)}
                      />
                    </div>
                    <Button variant="secondary" onClick={handleResetClick} disabled={isSaving}>
                      <FiRefreshCw /> Reset defaults
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkToggleAll}
                      disabled={isSaving || isPermissionsLoading}
                    >
                      {areAllPermissionsEnabled ? (
                  <>
                          <FiX /> Disable all
                  </>
                ) : (
                  <>
                          <FiCheck /> Enable all
                  </>
                )}
              </Button>
              </div>
            </div>

                {isPermissionsLoading ? (
                  <div className="modal-loading">
                    <LoadingSpinner />
                  </div>
                ) : filteredResources.length === 0 ? (
                  <div className="empty-filter-state">
                    <p>No resources match “{permissionSearch}”.</p>
          </div>
                ) : (
                  <div className="permissions-matrix-grid">
                    {filteredResources.map(([resource, actions]) => (
              <div key={resource} className="permission-resource-card">
                <div className="resource-header">
                  <div className="resource-info">
                    <h4>{getResourceDisplayName(resource)}</h4>
                    <span className="resource-actions-count">
                              <span>
                                {permissions.find(p => p.resource === resource)?.actions.length ||
                                  0}{' '}
                                / {actions.length} actions
                        </span>
                    </span>
                  </div>
                  <button
                    className="bulk-toggle-resource-btn"
                    onClick={() => handleBulkToggleResource(resource)}
                            disabled={isSaving || isUpdatingPermissions}
                  >
                    {actions.every(action => {
                      const resourcePerm = permissions.find(p => p.resource === resource)
                      return resourcePerm?.actions.includes(action)
                    }) ? (
                      <>
                        <FiX size={14} /> Disable All
                      </>
                    ) : (
                      <>
                        <FiCheck size={14} /> Enable All
                      </>
                    )}
                  </button>
                </div>
                <div className="resource-actions">
                  {actions.map(action => {
                    const hasPerm = hasPermission(resource, action)
                    return (
                      <label
                        key={action}
                                className={`permission-toggle ${hasPerm ? 'checked' : ''}`}
                      >
                        <span className="action-label">{action}</span>
                        <input
                          type="checkbox"
                          checked={hasPerm}
                          onChange={() => togglePermission(resource, action)}
                                  disabled={isSaving || isUpdatingPermissions}
                        />
                                <span className="toggle-slider" />
                      </label>
                    )
                  })}
                </div>
              </div>
                    ))}
              </div>
            )}

                <div className="modal-footer">
                  <div>
                    {hasChanges && (
                      <span className="unsaved-indicator">Unsaved changes</span>
                    )}
                  </div>
                  <div className="footer-buttons">
                    <Button
                      variant="secondary"
                      onClick={handleCancelChanges}
                      disabled={isUpdatingPermissions}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleUpdatePermissions}
                      disabled={!hasChanges || isUpdatingPermissions}
                    >
                      {isUpdatingPermissions ? 'Updating…' : 'Update Permissions'}
                    </Button>
          </div>
        </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ConfirmDialog
          isOpen={showResetDialog}
          title={`Reset ${getRoleDisplayName(selectedRole || '')} permissions?`}
          message="This will restore the default access matrix for this role."
          confirmLabel="Reset to Default"
          cancelLabel="Cancel"
          type="warning"
          onConfirm={handleResetConfirm}
          onCancel={() => setShowResetDialog(false)}
        />

        <ConfirmDialog
          isOpen={showBulkDialog}
          title={
            bulkAction === 'enable'
              ? 'Enable all selected permissions?'
              : 'Disable all selected permissions?'
          }
          message={
            bulkResource
              ? `${bulkAction === 'enable' ? 'Grant' : 'Revoke'} every action for ${getResourceDisplayName(
                  bulkResource
                )}. Remember to press Update Permissions to apply the change.`
              : `${bulkAction === 'enable' ? 'Grant' : 'Revoke'} every action for all resources in this role. Remember to press Update Permissions to apply the change.`
          }
          confirmLabel="Apply"
          cancelLabel="Cancel"
          type={bulkAction === 'enable' ? 'info' : 'warning'}
          onConfirm={handleBulkConfirm}
          onCancel={() => {
            setShowBulkDialog(false)
            setBulkResource(null)
            setBulkAction(null)
          }}
        />
      </motion.div>
    </Layout>
  )
}

export default RBACManagement


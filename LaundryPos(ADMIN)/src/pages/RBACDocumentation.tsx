import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiEdit2, FiX, FiPlus, FiSearch } from 'react-icons/fi'
import Layout from '../components/Layout'
import Button from '../components/Button'
import LoadingSpinner from '../components/LoadingSpinner'
import { rbacAPI } from '../utils/api'
import './RBACDocumentation.css'

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

const RBACDocumentation: React.FC = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [roles, setRoles] = useState<RolePermission[]>([])
  const [availableResources, setAvailableResources] = useState<Record<string, string[]>>({})
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

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
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleDisplayName = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  const getPermissionType = (permissions: Permission[]): string => {
    if (permissions.length === 0) return 'No Access'
    
    const allResources = Object.keys(availableResources)
    const hasFullAccess = allResources.every(resource => {
      const resourcePerm = permissions.find(p => p.resource === resource)
      const resourceActions = availableResources[resource] || []
      return resourceActions.every(action => resourcePerm?.actions.includes(action))
    })
    
    if (hasFullAccess) return 'Read-Write'
    
    const hasAnyWrite = permissions.some(perm => 
      perm.actions.some(action => ['create', 'update', 'delete'].includes(action))
    )
    
    return hasAnyWrite ? 'Read-Write' : 'Read-Only'
  }

  const getFeatures = (permissions: Permission[]): string => {
    if (permissions.length === 0) return 'None'
    
    const resourceNames = permissions.map(perm => {
      const displayName = perm.resource
        .split(/(?=[A-Z])/)
        .join(' ')
        .replace(/\b\w/g, l => l.toUpperCase())
      return displayName
    })
    
    return resourceNames.join(', ')
  }

  const filteredRoles = roles.filter(role =>
    role.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getRoleDisplayName(role.role).toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
          <LoadingSpinner />
          <p>Loading RBAC roles...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rbac-doc-page-wrapper"
      >
        {/* Header */}
        <div className="rbac-doc-header-section">
          <div className="rbac-doc-header-left">
            <h1 className="rbac-doc-title">RBAC Roles</h1>
            <Button
              variant="primary"
              onClick={() => navigate('/rbac')}
              style={{ marginTop: '12px' }}
            >
              <FiPlus /> Add
            </Button>
          </div>
          <div className="rbac-doc-header-right">
            <div className="rbac-doc-search">
              <FiSearch size={18} />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="rbac-doc-rows-count">
              {filteredRoles.length} Rows
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rbac-doc-table-wrapper">
          <table className="rbac-doc-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Edit</th>
                <th>Role</th>
                <th>Permission</th>
                <th>Features</th>
                <th style={{ width: '60px' }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    No roles found
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role, index) => (
                  <motion.tr
                    key={role.role}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td>
                      <button
                        className="rbac-doc-edit-btn"
                        onClick={() => navigate(`/rbac?role=${role.role}`)}
                        title="Edit Role"
                      >
                        <FiEdit2 size={16} />
                      </button>
                    </td>
                    <td>
                      <div className="rbac-doc-role-name">
                        {getRoleDisplayName(role.role)}
                      </div>
                    </td>
                    <td>
                      <span className={`rbac-doc-permission-badge ${getPermissionType(role.permissions).toLowerCase().replace(' ', '-')}`}>
                        {getPermissionType(role.permissions)}
                      </span>
                    </td>
                    <td>
                      <div className="rbac-doc-features">
                        {getFeatures(role.permissions)}
                      </div>
                    </td>
                    <td>
                      <button
                        className="rbac-doc-delete-btn"
                        onClick={() => {
                          // Delete functionality can be added here
                          console.log('Delete role:', role.role)
                        }}
                        title="Delete Role"
                        disabled={role.role === 'admin'} // Prevent deleting admin role
                      >
                        <FiX size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="rbac-doc-footer">
          <Button variant="secondary" onClick={() => navigate('/rbac')}>
            <FiArrowLeft /> Close
          </Button>
        </div>
      </motion.div>
    </Layout>
  )
}

export default RBACDocumentation

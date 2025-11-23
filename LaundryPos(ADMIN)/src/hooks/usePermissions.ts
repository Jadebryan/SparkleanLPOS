import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { rbacAPI } from '../utils/api'

interface Permission {
  resource: string
  actions: string[]
}

interface RolePermission {
  role: string
  permissions: Permission[]
}

// Cache permissions to avoid repeated API calls
let permissionsCache: Record<string, Permission[]> | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const usePermissions = () => {
  const { user } = useUser()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!user) {
      setPermissions([])
      setIsLoading(false)
      setHasError(false)
      return
    }

    // Check cache
    const now = Date.now()
    if (permissionsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      const cachedPerms = permissionsCache[user.role] || []
      setPermissions(cachedPerms)
      setIsLoading(false)
      setHasError(false)
      return
    }

    // Fetch permissions with timeout
    const loadPermissions = async () => {
      try {
        setIsLoading(true)
        setHasError(false)
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Permission load timeout')), 10000)
        )
        
        const roleDataPromise = rbacAPI.getRolePermission(user.role)
        const roleData = await Promise.race([roleDataPromise, timeoutPromise]) as any
        
        const perms = roleData?.permissions || roleData?.data?.permissions || []
        
        // Update cache
        permissionsCache = {
          ...permissionsCache,
          [user.role]: perms
        }
        cacheTimestamp = now
        
        setPermissions(perms)
        setHasError(false)
      } catch (error) {
        console.error('Error loading permissions:', error)
        setHasError(true)
        // On error, try to use cached permissions if available
        if (permissionsCache && permissionsCache[user.role]) {
          setPermissions(permissionsCache[user.role])
          setHasError(false)
        } else {
          // If no cache and error, set empty permissions (will block access)
          setPermissions([])
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPermissions()
  }, [user])

  // Check if user has permission for a resource and action
  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false

    // If permissions haven't loaded yet, return false to show loading
    if (isLoading) {
      return false
    }

    const resourcePerm = permissions.find(p => p.resource === resource)
    if (!resourcePerm) return false

    return resourcePerm.actions.includes(action)
  }

  // Check if user has any of the specified permissions
  const hasAnyPermission = (checks: Array<{ resource: string; action: string }>): boolean => {
    return checks.some(check => hasPermission(check.resource, check.action))
  }

  // Check if user has all of the specified permissions
  const hasAllPermissions = (checks: Array<{ resource: string; action: string }>): boolean => {
    return checks.every(check => hasPermission(check.resource, check.action))
  }

  // Clear permissions cache (useful after permission updates)
  const clearCache = () => {
    permissionsCache = null
    cacheTimestamp = 0
  }

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    hasError,
    clearCache
  }
}

// Export function to clear cache (for use after permission updates)
export const clearPermissionsCache = () => {
  permissionsCache = null
  cacheTimestamp = 0
}


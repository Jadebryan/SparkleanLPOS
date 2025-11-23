import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

type Permission = {
  resource: string
  actions: string[]
}

let cachedPermissions: Permission[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadPermissions = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const now = Date.now()
        if (cachedPermissions && now - cacheTimestamp < CACHE_DURATION) {
          if (isMounted) {
            setPermissions(cachedPermissions)
            setIsLoading(false)
          }
          return
        }

        const response: any = await api.get('/rbac/me')
        const payload = response?.data || response
        const perms = payload?.permissions || payload?.data?.permissions || []

        if (!isMounted) return

        cachedPermissions = perms
        cacheTimestamp = now
        setPermissions(perms)
      } catch (err: any) {
        console.error('Failed to load permissions:', err)
        if (isMounted) {
          setError(err?.message || 'Failed to load permissions')
          setPermissions([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadPermissions()

    return () => {
      isMounted = false
    }
  }, [])

  const hasPermission = (resource: string, action: string): boolean => {
    if (!permissions.length) return false
    const resourcePerm = permissions.find(p => p.resource === resource)
    if (!resourcePerm) return false
    return resourcePerm.actions.includes(action)
  }

  return {
    permissions,
    isLoading,
    error,
    hasPermission,
  }
}

export const clearPermissionsCache = () => {
  cachedPermissions = null
  cacheTimestamp = 0
}


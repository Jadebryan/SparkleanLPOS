import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../utils/api'

interface User {
  id?: string
  username: string
  email: string
  role: 'admin' | 'staff'
  fullName?: string
  token?: string
}

interface UserContextType {
  user: User | null
  login: (username: string, email: string, role: 'admin' | 'staff', fullName?: string, token?: string, id?: string) => void
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
      // Trigger cache preload after login
      if (navigator.onLine) {
        import('../utils/cacheManager').then(({ cacheManager }) => {
          cacheManager.preloadCriticalData().catch(err => {
            console.error('Failed to preload critical data:', err)
          })
        })
      }
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  const login = (username: string, email: string, role: 'admin' | 'staff', fullName?: string, token?: string, id?: string) => {
    setUser({ id, username, email, role, fullName, token })
  }

  const logout = async () => {
    try {
      // Call logout API to log the audit event
      await authAPI.logout().catch(err => {
        // Log error but continue with logout even if API fails
        console.error('Logout API error (continuing with local logout):', err)
      })
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error)
    } finally {
      // Always clear local state
      setUser(null)
    }
  }

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}


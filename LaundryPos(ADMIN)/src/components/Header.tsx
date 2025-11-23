import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSun, FiSearch, FiBell, FiMonitor, FiChevronDown, FiShoppingBag, FiCreditCard, FiClock, FiSettings, FiUsers, FiBox, FiFileText, FiUser, FiLogOut } from 'react-icons/fi'
import { useTheme } from '../context/ThemeContext'
import { useUser } from '../context/UserContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import KeyboardShortcuts from './KeyboardShortcuts'
import BrandIcon from './BrandIcon'
import { Order, Customer, Service } from '../types'
import toast from 'react-hot-toast'
import { notificationAPI, orderAPI, customerAPI, serviceAPI } from '../utils/api'
import './Header.css'

interface Notification {
  id: string
  type: 'order' | 'payment' | 'reminder' | 'system' | 'expense'
  title: string
  message: string
  time: string
  unread: boolean
  relatedId?: string | null
}

interface HeaderProps {
  username?: string
  role?: 'admin' | 'staff'
}

const Header: React.FC<HeaderProps> = ({ username = 'Admin', role = 'admin' }) => {
  const initial = username.charAt(0).toUpperCase()
  const { theme, setTheme, cycleTheme } = useTheme()
  const { logout } = useUser()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Live search state (replaces mock data)
  const [searching, setSearching] = useState(false)
  const [apiOrders, setApiOrders] = useState<Order[]>([])
  const [apiCustomers, setApiCustomers] = useState<Customer[]>([])
  const [apiServices, setApiServices] = useState<Service[]>([])

  // Fetch from APIs when searchQuery changes (debounced)
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setApiOrders([]); setApiCustomers([]); setApiServices([]); setSearching(false)
      return
    }
    setSearching(true)
    const handle = setTimeout(async () => {
      try {
        const [ordersRes, customersRes, servicesRes] = await Promise.all([
          orderAPI.getAll({ search: q, showArchived: false }),
          customerAPI.getAll({ search: q, showArchived: false }),
          serviceAPI.getAll({ search: q, showArchived: false })
        ])
        // Helper to parse numbers from strings like "₱1,234.56"
        const parseAmount = (val: any): number => {
          if (typeof val === 'number' && isFinite(val)) return val
          if (typeof val === 'string') {
            const cleaned = val.replace(/[^0-9.\-]/g, '')
            const num = parseFloat(cleaned)
            return isNaN(num) ? 0 : num
          }
          return 0
        }
        // Normalize data to UI models
        const mappedOrders: Order[] = (ordersRes || []).slice(0, 5).map((o: any) => {
          const totalNum = (() => {
            if (o.totalFee !== undefined) return parseAmount(o.totalFee)
            if (o.total !== undefined) return parseAmount(o.total)
            return 0
          })()
          return {
            id: o.orderId || o.id || o._id || '#ORD',
            date: o.date || o.createDate || o.createdAt ? new Date(o.date || o.createDate || o.createdAt).toLocaleDateString() : '',
            customer: o.customer || o.customerName || 'Customer',
            payment: (o.payment || o.feeStatus || 'Unpaid') as any,
            total: `₱${totalNum.toFixed(2)}`,
            items: o.items || []
          }
        })
        const mappedCustomers: Customer[] = (customersRes || []).slice(0, 5).map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          totalOrders: c.totalOrders || c.ordersCount || 0,
          totalSpent: c.totalSpent || c.spent || 0,
          lastOrder: c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : undefined,
        }))
        const mappedServices: Service[] = (servicesRes || []).slice(0, 5).map((s: any) => ({
          id: s._id || s.id,
          name: s.name,
          category: s.category || 'Service',
          price: typeof s.price === 'number' ? s.price : parseAmount(s.price),
          unit: (s.unit || 'item') as any,
          isActive: s.isActive,
        }))
        setApiOrders(mappedOrders)
        setApiCustomers(mappedCustomers)
        setApiServices(mappedServices)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [searchQuery])

  const mockOrders: Order[] = [
    { id: '#ORD-2024-001', date: 'Dec 15, 2024', customer: 'John Smith', payment: 'Unpaid', total: '₱150.00', items: [] },
    { id: '#ORD-2024-002', date: 'Dec 15, 2024', customer: 'Maria Garcia', payment: 'Partial', total: '₱300.00', items: [] },
    { id: '#ORD-2024-003', date: 'Dec 14, 2024', customer: 'Robert Johnson', payment: 'Paid', total: '₱175.00', items: [] },
    { id: '#ORD-2024-004', date: 'Dec 13, 2024', customer: 'Sarah Wilson', payment: 'Paid', total: '₱195.00', items: [] },
  ]

  const mockCustomers: Customer[] = [
    { id: '1', name: 'John Smith', email: 'john.smith@email.com', phone: '+63 912 345 6789', totalOrders: 12, totalSpent: 3240, lastOrder: 'Dec 15, 2024' },
    { id: '2', name: 'Maria Garcia', email: 'maria.garcia@email.com', phone: '+63 923 456 7890', totalOrders: 8, totalSpent: 2100, lastOrder: 'Dec 15, 2024' },
    { id: '3', name: 'Robert Johnson', email: 'robert.j@email.com', phone: '+63 934 567 8901', totalOrders: 15, totalSpent: 4500, lastOrder: 'Dec 14, 2024' },
    { id: '4', name: 'Sarah Wilson', email: 'sarah.wilson@email.com', phone: '+63 945 678 9012', totalOrders: 6, totalSpent: 1800, lastOrder: 'Dec 13, 2024' },
  ]

  const mockServices: Service[] = [
    { id: '1', name: 'Wash & Fold', category: 'Washing', price: 25, unit: 'kg', isActive: true, isPopular: true },
    { id: '2', name: 'Dry Cleaning', category: 'Dry Cleaning', price: 150, unit: 'item', isActive: true, isPopular: true },
    { id: '3', name: 'Ironing', category: 'Ironing', price: 15, unit: 'item', isActive: true },
    { id: '4', name: 'Express Service', category: 'Special', price: 50, unit: 'flat', isActive: true },
  ]

  // Fetch notifications
  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user')
    if (!user) {
      // User not logged in, don't fetch notifications
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const fetchNotifications = async () => {
      // Double-check user is still logged in before fetching
      const currentUser = localStorage.getItem('user')
      if (!currentUser) {
        setNotifications([])
        setUnreadCount(0)
        return
      }

      setIsLoadingNotifications(true)
      try {
        const data = await notificationAPI.getAll(false)
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      } catch (error: any) {
        // Only log non-auth errors (401/403 are expected when logged out)
        if (error.message && !error.message.includes('Authentication') && !error.message.includes('401') && !error.message.includes('403')) {
          console.error('Error fetching notifications:', error)
        }
        // Set empty notifications on error
        setNotifications([])
        setUnreadCount(0)
      } finally {
        setIsLoadingNotifications(false)
      }
    }

    fetchNotifications()
    // Refresh notifications every 30 seconds (only when logged in)
    const interval = setInterval(fetchNotifications, 30000)
    // Live updates via SSE (only when logged in)
    let eventSource: EventSource | null = null
    try {
      const currentUser = localStorage.getItem('user')
      const token = currentUser ? (JSON.parse(currentUser)?.token || '') : ''
      if (token) {
        const streamUrl = `${(import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'}/notifications/stream?token=${encodeURIComponent(token)}`
        eventSource = new EventSource(streamUrl)
        eventSource.onmessage = (evt) => {
          try {
            const notif = JSON.parse(evt.data)
            setNotifications(prev => [{ ...notif }, ...prev])
            setUnreadCount(prev => prev + (notif?.unread ? 1 : 0))
          } catch {}
        }
        eventSource.onerror = () => {
          // Close broken stream
          if (eventSource) {
            try { eventSource.close() } catch {}
            eventSource = null
          }
        }
      }
    } catch (error) {
      console.error('Error setting up notification stream:', error)
    }

    // Cleanup function
    return () => {
      clearInterval(interval)
      if (eventSource) {
        try {
          eventSource.close()
        } catch {}
      }
    }
  }, [])

  const themeOptions = [
    { value: 'light', label: 'Light', icon: FiSun },
    { value: 'dim', label: 'Dim', icon: FiMonitor }
  ]

  const currentTheme = themeOptions.find(option => option.value === theme)

  // Search results
  const searchResults = {
    orders: apiOrders,
    customers: apiCustomers,
    services: apiServices,
  }

  const allResults = [
    ...searchResults.orders.map((o) => ({ type: 'order', data: o })),
    ...searchResults.customers.map((c) => ({ type: 'customer', data: c })),
    ...searchResults.services.map((s) => ({ type: 'service', data: s })),
  ]

  const hasResults = allResults.length > 0 && searchQuery.trim().length > 0

  // Handle result selection
  const handleResultSelect = (result: { type: string; data: any }) => {
    if (result.type === 'order') {
      navigate('/orders')
    } else if (result.type === 'customer') {
      navigate('/customers')
    } else if (result.type === 'service') {
      navigate('/services')
    }
    setSearchOpen(false)
    setSearchQuery('')
    setSelectedIndex(0)
  }

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (searchOpen && !target.closest('.search-dropdown')) {
        setSearchOpen(false)
        setSearchQuery('')
      }
      if (userMenuOpen && !target.closest('.user-menu-dropdown')) {
        setUserMenuOpen(false)
      }
    }

    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      searchInputRef.current?.focus()
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [searchOpen, userMenuOpen])

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully!')
    setUserMenuOpen(false)
    setTimeout(() => {
      navigate('/login')
    }, 500)
  }

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Keyboard navigation in search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && allResults.length > 0) {
      e.preventDefault()
      handleResultSelect(allResults[selectedIndex])
    } else if (e.key === 'Escape') {
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  // Set up keyboard shortcuts for theme switching and search
  useKeyboardShortcut([
    {
      key: '1',
      ctrl: true,
      callback: () => {
        console.log('Switching to Light mode')
        setTheme('light')
      }
    },
    {
      key: '2',
      ctrl: true,
      callback: () => {
        console.log('Switching to Dim mode')
        setTheme('dim')
      }
    },
    {
      key: 'k',
      ctrl: true,
      callback: () => {
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
    }
  ])
  
  return (
    <div className="header">
      <div className="header-surface">
        <div className="header-left">
          <div className="logo">
            <BrandIcon size={22} />
            <div className="logo-text">
              <span className="brand-part-1">Sparklean</span>
              <span className="brand-part-2">Laundry Shop</span>
              <span className="brand-part-3">{role === 'admin' ? 'Admin' : 'Staff'}</span>
            </div>
          </div>
        </div>
        
        <div className="header-right">
        {/* Global Search */}
        <div className="search-dropdown">
          <button 
            className="icon-btn" 
            data-tooltip="Search (Ctrl+K)"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <FiSearch />
          </button>

          <AnimatePresence>
            {searchOpen && (
              <motion.div 
                className="search-panel"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                 <div className="search-header">
                   <input
                     ref={searchInputRef}
                     type="text"
                     placeholder="Search orders, customers, services..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     onKeyDown={handleSearchKeyDown}
                     className="search-input"
                   />
                   {searchQuery && (
                     <button 
                       className="search-clear-btn"
                       onClick={() => {
                         setSearchQuery('')
                         searchInputRef.current?.focus()
                       }}
                     >
                       ×
                     </button>
                   )}
                 </div>
                
                <div className="search-suggestions">
                  {hasResults ? (
                    <>
                      {searchResults.orders.length > 0 && (
                        <div className="suggestion-category">
                          <h4><FiShoppingBag /> Orders ({searchResults.orders.length})</h4>
                          {searchResults.orders.map((order) => {
                            const resultIndex = allResults.findIndex(r => r.type === 'order' && r.data.id === order.id)
                            return (
                              <div
                                key={order.id}
                                className={`suggestion-item ${resultIndex === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleResultSelect({ type: 'order', data: order })}
                              >
                                <div className="suggestion-item-main">
                                  <span className="suggestion-title">{order.id}</span>
                                  <span className="suggestion-subtitle">{order.customer}</span>
                                </div>
                                <span className="suggestion-meta">{order.total}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {searchResults.customers.length > 0 && (
                        <div className="suggestion-category">
                          <h4><FiUsers /> Customers ({searchResults.customers.length})</h4>
                          {searchResults.customers.map((customer) => {
                            const resultIndex = allResults.findIndex(r => r.type === 'customer' && r.data.id === customer.id)
                            return (
                              <div
                                key={customer.id}
                                className={`suggestion-item ${resultIndex === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleResultSelect({ type: 'customer', data: customer })}
                              >
                                <div className="suggestion-item-main">
                                  <span className="suggestion-title">{customer.name}</span>
                                  <span className="suggestion-subtitle">{customer.email}</span>
                                </div>
                                <span className="suggestion-meta">{customer.totalOrders} orders</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {searchResults.services.length > 0 && (
                        <div className="suggestion-category">
                          <h4><FiBox /> Services ({searchResults.services.length})</h4>
                          {searchResults.services.map((service) => {
                            const resultIndex = allResults.findIndex(r => r.type === 'service' && r.data.id === service.id)
                            return (
                              <div
                                key={service.id}
                                className={`suggestion-item ${resultIndex === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleResultSelect({ type: 'service', data: service })}
                              >
                                <div className="suggestion-item-main">
                                  <span className="suggestion-title">{service.name}</span>
                                  <span className="suggestion-subtitle">{service.category}</span>
                                </div>
                                <span className="suggestion-meta">₱{service.price}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  ) : searchQuery.trim().length > 0 ? (
                    <div className="search-no-results">
                      <FiFileText />
                      <p>No results found for "{searchQuery}"</p>
                    </div>
                  ) : (
                    <>
                      <div className="suggestion-category">
                        <h4 className="no-icon">Quick Actions</h4>
                        <div 
                          className="suggestion-item"
                          onClick={() => {
                            navigate('/orders')
                            setSearchOpen(false)
                          }}
                        >
                          <FiCreditCard /> Create New Order
                        </div>
                        <div 
                          className="suggestion-item"
                          onClick={() => {
                            navigate('/reports')
                            setSearchOpen(false)
                          }}
                        >
                          <FiFileText /> View Reports
                        </div>
                        <div 
                          className="suggestion-item"
                          onClick={() => {
                            navigate('/services')
                            setSearchOpen(false)
                          }}
                        >
                          <FiBox /> Manage Services
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <div className="notification-dropdown">
          <button 
            className="icon-btn" 
            data-tooltip="Notifications"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
          <FiBell />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div 
                className="notification-panel"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="notification-header">
                  <h4>Notifications</h4>
                  <span className="notification-count">{unreadCount} unread</span>
                </div>
                
                <div className="notification-list">
                  {isLoadingNotifications ? (
                    <div className="notification-loading">
                      <div>Loading notifications...</div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                      <div>No notifications</div>
                      <div className="notification-empty-text">You're all caught up!</div>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`notification-item ${notification.unread ? 'unread' : ''}`}
                        onClick={async () => {
                          if (notification.unread) {
                            try {
                              await notificationAPI.markAsRead(notification.id)
                              setNotifications(notifications.map(n => 
                                n.id === notification.id ? { ...n, unread: false } : n
                              ))
                              setUnreadCount(Math.max(0, unreadCount - 1))
                            } catch (error: any) {
                              console.error('Error marking notification as read:', error)
                            }
                          }
                          // Navigate based on notification type
                          if (notification.relatedId) {
                            if (notification.type === 'order') {
                              navigate(`/orders`)
                            } else if (notification.type === 'expense') {
                              navigate(`/expenses`)
                            }
                          }
                        }}
                      >
                        <div className="notification-icon">
                          {notification.type === 'order' && <FiShoppingBag />}
                          {notification.type === 'payment' && <FiCreditCard />}
                          {notification.type === 'reminder' && <FiClock />}
                          {notification.type === 'system' && <FiSettings />}
                          {notification.type === 'expense' && <FiFileText />}
                        </div>
                        <div className="notification-content">
                          <div className="notification-title">{notification.title}</div>
                          <div className="notification-message">{notification.message}</div>
                          <div className="notification-time">{notification.time}</div>
                        </div>
                        {notification.unread && <div className="unread-dot"></div>}
                      </div>
                    ))
                  )}
                </div>
                
                <div className="notification-footer">
                  <button 
                    className="mark-all-read"
                    onClick={async () => {
                      try {
                        await notificationAPI.markAllAsRead()
                        setNotifications(notifications.map(n => ({ ...n, unread: false })))
                        setUnreadCount(0)
                        toast.success('All notifications marked as read')
                      } catch (error: any) {
                        console.error('Error marking all as read:', error)
                        toast.error('Failed to mark all as read')
                      }
                    }}
                  >
                    Mark all as read
                  </button>
                  <button className="view-all" onClick={() => navigate('/orders')}>
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Selector */}
        <div className="theme-selector">
        <button 
          className="icon-btn theme-toggle" 
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            data-tooltip="Theme Options"
        >
            {currentTheme && <currentTheme.icon />}
            <FiChevronDown className="dropdown-arrow" />
        </button>
          
          <AnimatePresence>
            {themeDropdownOpen && (
              <motion.div 
                className="theme-dropdown"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {themeOptions.map((option) => {
                  const IconComponent = option.icon
                  return (
                    <button
                      key={option.value}
                      className={`theme-option ${theme === option.value ? 'active' : ''}`}
                      onClick={() => {
                        setTheme(option.value as 'light' | 'dim' | 'dark')
                        setThemeDropdownOpen(false)
                      }}
                    >
                      <IconComponent />
                      <span>{option.label}</span>
                      {theme === option.value && <div className="checkmark">✓</div>}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard Shortcuts */}
        <KeyboardShortcuts />

        {/* User Info */}
        <div className="user-menu-dropdown" ref={userMenuRef}>
          <div 
            className="user-info"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <span className="username">Welcome, {username}</span>
            <div className="user-avatar">{initial}</div>
          </div>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                className="user-menu-panel"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="user-menu-header">
                  <div className="user-menu-avatar">{initial}</div>
                  <div className="user-menu-info">
                    <div className="user-menu-name">{username}</div>
                    <div className="user-menu-role">{role === 'admin' ? 'Administrator' : 'Staff'}</div>
                  </div>
                </div>
                <div className="user-menu-divider"></div>
                <div className="user-menu-items">
                  <button
                    className="user-menu-item"
                    onClick={() => {
                      navigate('/settings')
                      setUserMenuOpen(false)
                    }}
                  >
                    <FiSettings /> Settings
                  </button>
                  <div className="user-menu-divider"></div>
                  <button
                    className="user-menu-item logout"
                    onClick={handleLogout}
                  >
                    <FiLogOut /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>

    </div>
  )
}

export default Header


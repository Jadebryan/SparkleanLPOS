import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiMenu, FiX, FiLogOut, FiHome, FiCreditCard, FiBox, FiList, 
  FiPercent, FiBarChart2, FiSettings, FiFlag, FiHelpCircle, FiUsers, FiUser, FiFileText, FiMapPin, FiShield, FiTag
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useUser } from '../context/UserContext'
import { useTheme } from '../context/ThemeContext'
import { usePermissions } from '../hooks/usePermissions'
import './Sidebar.css'

const Sidebar: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const navigate = useNavigate()
  const { logout } = useUser()
  const { sidebarCollapsed, toggleSidebar } = useTheme()
  const { hasPermission } = usePermissions()

  // Define menu items with their required permissions
  const allMenuItems = [
    { path: '/dashboard', icon: <FiHome />, label: 'Dashboard', resource: 'dashboard', action: 'read' },
    { path: '/orders', icon: <FiList />, label: 'Manage Orders', resource: 'orders', action: 'read' },
    { path: '/customers', icon: <FiUsers />, label: 'Customers', resource: 'customers', action: 'read' },
    { path: '/employees', icon: <FiUser />, label: 'Employees', resource: 'employees', action: 'read' },
    { path: '/stations', icon: <FiMapPin />, label: 'Stations', resource: 'stations', action: 'read' },
    { path: '/services', icon: <FiBox />, label: 'Services', resource: 'services', action: 'read' },
    { path: '/discounts', icon: <FiPercent />, label: 'Discounts', resource: 'discounts', action: 'read' },
    { path: '/vouchers', icon: <FiTag />, label: 'Vouchers', resource: 'discounts', action: 'read' },
    { path: '/expenses', icon: <span style={{fontSize: '18px', fontWeight: 'bold'}}>₱</span>, label: 'Expenses', resource: 'expenses', action: 'read' },
    { path: '/reports', icon: <FiBarChart2 />, label: 'Reports', resource: 'reports', action: 'read' },
    { path: '/rbac', icon: <FiShield />, label: 'RBAC', resource: 'rbac', action: 'read' },
  ]

  // Filter menu items based on permissions
  const menuItems = allMenuItems.filter(item => 
    hasPermission(item.resource, item.action)
  )

  const generalItems = [
    { path: '/settings', icon: <FiSettings />, label: 'Settings', onClick: undefined as any },
    { path: '/feedback', icon: <FiFlag />, label: 'Feedback', onClick: undefined as any },
    { path: '/help', icon: <FiHelpCircle />, label: 'Help', onClick: undefined as any },
    { path: '#logout', icon: <FiLogOut />, label: 'Logout', onClick: undefined as any, isLogout: true },
  ]

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully!')
    setTimeout(() => {
      navigate('/login')
    }, 500)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <FiX /> : <FiMenu />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        className={`sidebar ${isMobileOpen ? 'mobile-open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
        initial={false}
        animate={{
          x: isMobileOpen ? 0 : '-100%',
          width: sidebarCollapsed ? 60 : 250
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Sidebar Header with Toggle */}
        <div className="sidebar-header">
          <button 
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FiMenu />
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">{!sidebarCollapsed && 'Menu'}</div>
          {menuItems.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="icon">{item.icon}</span>
                {!sidebarCollapsed && item.label}
              </NavLink>
            </motion.div>
          ))}
        </div>

        <div className="nav-section">
          <div className="nav-section-title">{!sidebarCollapsed && 'Generals'}</div>
          {generalItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.04 }}
            >
              {item.path.startsWith('#') ? (
                <button
                  className={`nav-item ${item.isLogout ? 'logout-item' : 'as-button'}`}
                  onClick={() => {
                    setIsMobileOpen(false)
                    if (item.isLogout) {
                      handleLogout()
                    } else {
                      item.onClick && item.onClick()
                    }
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="icon">{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsMobileOpen(false)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="icon">{item.icon}</span>
                  {!sidebarCollapsed && item.label}
                </NavLink>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  )
}

export default Sidebar


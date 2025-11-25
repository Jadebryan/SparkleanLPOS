import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiTrendingUp, FiTrendingDown, FiUsers, FiPackage, FiClock, FiActivity, FiAlertCircle, FiEye, FiEyeOff, FiRotateCcw, FiSettings, FiX, FiMove, FiGrid } from 'react-icons/fi'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts'
import { useUser } from '../context/UserContext'
import { useTheme } from '../context/ThemeContext'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { dashboardAPI } from '../utils/api'
import toast from 'react-hot-toast'
import './Dashboard.css'

interface StatCardProps {
  icon: React.ReactNode
  number: string | number
  label: string
  trend?: number
  comparison?: {
    value: number | string
    label: string
    isPositive?: boolean
  }
  variant?: 'blue' | 'orange' | 'green' | 'purple'
  delay?: number
  onClick?: () => void
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  number, 
  label, 
  trend, 
  comparison,
  variant = 'blue', 
  delay = 0, 
  onClick 
}) => (
  <motion.div 
    className={`stat-card ${variant} card-hover ${onClick ? 'clickable' : ''}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    onClick={onClick}
  >
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <motion.div 
        className="stat-number"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay + 0.2, duration: 0.5 }}
      >
        {number}
      </motion.div>
      <div className="stat-label">{label}</div>
      {trend !== undefined && (
        <div className={`stat-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
          {trend >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
          <span>{Math.abs(trend)}% from yesterday</span>
        </div>
      )}
      {comparison && (
        <div className={`stat-comparison ${comparison.isPositive !== false ? 'positive' : 'negative'}`}>
          <span className="stat-comparison-label">{comparison.label}:</span>
          <span className="stat-comparison-value">{comparison.value}</span>
        </div>
      )}
    </div>
  </motion.div>
)

interface ActivityItem {
  id: string
  type: 'order' | 'payment' | 'customer'
  message: string
  time: string
  icon: React.ReactNode
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useUser()
  const { theme } = useTheme()
  const isLowLightTheme = theme === 'dim'
  const [timeRange, setTimeRange] = useState('today')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    stats: { orders: 0, revenue: 0, pending: 0, customers: 0 },
    trends: { orders: 0, revenue: 0, pending: 0, customers: 0 },
    orderStatus: [],
    revenueTrend: [],
    recentActivity: [],
    pendingExpenses: 0
  })
  
  // Dashboard section visibility state
  const [hiddenSections, setHiddenSections] = useState<{
    stats: boolean
    charts: boolean
    quickActions: boolean
    activity: boolean
  }>(() => {
    const saved = localStorage.getItem('dashboard-hidden-sections')
    return saved ? JSON.parse(saved) : {
      stats: false,
      charts: false,
      quickActions: false,
      activity: false
    }
  })

  // Individual stat card visibility
  const [visibleStats, setVisibleStats] = useState<{
    orders: boolean
    revenue: boolean
    pending: boolean
    customers: boolean
  }>(() => {
    const saved = localStorage.getItem('dashboard-visible-stats')
    return saved ? JSON.parse(saved) : {
      orders: true,
      revenue: true,
      pending: true,
      customers: true
    }
  })

  // Stat card order
  const [statOrder, setStatOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard-stat-order')
    return saved ? JSON.parse(saved) : ['orders', 'revenue', 'pending', 'customers']
  })

  // Customization modal state
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Save hidden sections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dashboard-hidden-sections', JSON.stringify(hiddenSections))
  }, [hiddenSections])

  // Save visible stats to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-visible-stats', JSON.stringify(visibleStats))
  }, [visibleStats])

  // Save stat order to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-stat-order', JSON.stringify(statOrder))
  }, [statOrder])

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Check if user is logged in before making request
      const savedUser = localStorage.getItem('user')
      if (!savedUser) {
        console.warn('No user found, redirecting to login')
        navigate('/login')
        return
      }

      setIsLoading(true)
      try {
        const data = await dashboardAPI.getStats(timeRange)
        // Ensure data structure is valid
        if (data && typeof data === 'object') {
          setDashboardData({
            stats: data.stats || { orders: 0, revenue: 0, pending: 0, customers: 0 },
            trends: data.trends || { orders: 0, revenue: 0, pending: 0, customers: 0 },
            orderStatus: data.orderStatus || [],
            revenueTrend: data.revenueTrend || [],
            recentActivity: data.recentActivity || [],
            pendingExpenses: data.pendingExpenses || 0
          })
        } else {
          throw new Error('Invalid data format received')
        }
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error)
        const errorMessage = error.message || 'Failed to load dashboard data'
        
        // Only show error if it's not an auth error (auth errors are handled by apiRequest)
        if (!errorMessage.includes('Authentication') && !errorMessage.includes('token')) {
          toast.error(errorMessage)
        }
        
        // Set default/empty data on error
        setDashboardData({
          stats: { orders: 0, revenue: 0, pending: 0, customers: 0 },
          trends: { orders: 0, revenue: 0, pending: 0, customers: 0 },
          orderStatus: [],
          revenueTrend: [],
          recentActivity: [],
          pendingExpenses: 0
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [timeRange, navigate])

  const toggleSection = (section: keyof typeof hiddenSections) => {
    setHiddenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const resetAllSections = () => {
    setHiddenSections({
      stats: false,
      charts: false,
      quickActions: false,
      activity: false
    })
    setVisibleStats({
      orders: true,
      revenue: true,
      pending: true,
      customers: true
    })
    setStatOrder(['orders', 'revenue', 'pending', 'customers'])
    toast.success('Dashboard reset to default')
  }

  const toggleStatVisibility = (stat: keyof typeof visibleStats) => {
    setVisibleStats(prev => ({
      ...prev,
      [stat]: !prev[stat]
    }))
  }

  const handleDragStart = (e: React.DragEvent, statId: string) => {
    setIsDragging(statId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, statId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(statId)
  }

  const handleDragLeave = () => {
    setDragOver(null)
  }

  const handleDrop = (e: React.DragEvent, targetStatId: string) => {
    e.preventDefault()
    if (!isDragging || isDragging === targetStatId) {
      setIsDragging(null)
      setDragOver(null)
      return
    }

    const newOrder = [...statOrder]
    const dragIndex = newOrder.indexOf(isDragging)
    const targetIndex = newOrder.indexOf(targetStatId)

    newOrder.splice(dragIndex, 1)
    newOrder.splice(targetIndex, 0, isDragging)

    setStatOrder(newOrder)
    setIsDragging(null)
    setDragOver(null)
    toast.success('Widget order updated')
  }

  const handleDragEnd = () => {
    setIsDragging(null)
    setDragOver(null)
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return '🌅 Good Morning'
    if (hour < 18) return '☀️ Good Afternoon'
    return '🌙 Good Evening'
  }

  // Map order status data with colors
  const orderStatusData = dashboardData.orderStatus.map((status: { name: string; value: number }) => {
    let color = isLowLightTheme ? '#4B5563' : '#E5E7EB'
    if (status.name === 'Pending') {
      color = isLowLightTheme ? '#9A3412' : '#FED7AA'
    } else if (status.name === 'In Progress') {
      color = isLowLightTheme ? '#1E3A8A' : '#DBEAFE'
    } else if (status.name === 'Completed') {
      color = isLowLightTheme ? '#064E3B' : '#D1FAE5'
    }
    return { ...status, color }
  })

  // Map recent activity with icons
  const recentActivity: ActivityItem[] = dashboardData.recentActivity.slice(0, 5).map((activity: any) => ({
    id: activity.id,
    type: activity.type,
    message: activity.message,
    time: activity.time,
    icon: activity.type === 'order' ? <FiPackage /> : <FiUsers />
  }))

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="page-header-compact">
          <div>
            <h1 className="page-title">📊 Dashboard</h1>
            <p className="page-subtitle">
              {getGreeting()}, {user?.username || 'Admin'}! Today is {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="header-actions">
            <div className="dashboard-controls">
              <button 
                className="control-btn customize-btn"
                onClick={() => setShowCustomizeModal(true)}
                title="Customize dashboard"
              >
                <FiSettings />
                <span>Customize</span>
              </button>
              <button 
                className="control-btn"
                onClick={resetAllSections}
                title="Reset to default"
              >
                <FiRotateCcw />
              </button>
              <button 
                className={`control-btn ${hiddenSections.stats ? 'active' : ''}`}
                onClick={() => toggleSection('stats')}
                title={hiddenSections.stats ? 'Show stats' : 'Hide stats'}
              >
                {hiddenSections.stats ? <FiEyeOff /> : <FiEye />}
                <span>Stats</span>
              </button>
              <button 
                className={`control-btn ${hiddenSections.charts ? 'active' : ''}`}
                onClick={() => toggleSection('charts')}
                title={hiddenSections.charts ? 'Show charts' : 'Hide charts'}
              >
                {hiddenSections.charts ? <FiEyeOff /> : <FiEye />}
                <span>Charts</span>
              </button>
              <button 
                className={`control-btn ${hiddenSections.quickActions ? 'active' : ''}`}
                onClick={() => toggleSection('quickActions')}
                title={hiddenSections.quickActions ? 'Show quick actions' : 'Hide quick actions'}
              >
                {hiddenSections.quickActions ? <FiEyeOff /> : <FiEye />}
                <span>Actions</span>
              </button>
              <button 
                className={`control-btn ${hiddenSections.activity ? 'active' : ''}`}
                onClick={() => toggleSection('activity')}
                title={hiddenSections.activity ? 'Show activity' : 'Hide activity'}
              >
                {hiddenSections.activity ? <FiEyeOff /> : <FiEye />}
                <span>Activity</span>
              </button>
            </div>
            <select 
              className="time-range-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
        
        {/* Stats Grid */}
        {!hiddenSections.stats && (
          <motion.div 
            className="stats-grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
          {statOrder.map((statId, index) => {
            if (!visibleStats[statId as keyof typeof visibleStats]) return null

            // Calculate comparison values (vs previous period)
            const getComparisonLabel = () => {
              switch (timeRange) {
                case 'today': return 'vs Yesterday'
                case 'week': return 'vs Last Week'
                case 'month': return 'vs Last Month'
                case 'year': return 'vs Last Year'
                default: return 'vs Previous'
              }
            }

            const statConfig = {
              orders: {
                icon: <FiPackage />,
                number: isLoading ? '...' : dashboardData.stats.orders,
                label: timeRange === 'today' ? 'Orders Today' : `Orders (${timeRange})`,
                trend: dashboardData.trends.orders,
                comparison: !isLoading ? {
                  label: getComparisonLabel(),
                  value: dashboardData.trends.orders >= 0 
                    ? `+${dashboardData.trends.orders}%` 
                    : `${dashboardData.trends.orders}%`,
                  isPositive: dashboardData.trends.orders >= 0
                } : undefined,
                variant: 'blue' as const,
                onClick: () => navigate('/orders')
              },
              revenue: {
                icon: <span style={{fontSize: '18px', fontWeight: 'bold'}}>₱</span>,
                number: isLoading ? '...' : `₱${dashboardData.stats.revenue.toLocaleString()}`,
                label: timeRange === 'today' ? 'Revenue Today' : `Revenue (${timeRange})`,
                trend: dashboardData.trends.revenue,
                comparison: !isLoading ? {
                  label: getComparisonLabel(),
                  value: dashboardData.trends.revenue >= 0 
                    ? `+${dashboardData.trends.revenue}%` 
                    : `${dashboardData.trends.revenue}%`,
                  isPositive: dashboardData.trends.revenue >= 0
                } : undefined,
                variant: 'orange' as const,
                onClick: () => navigate('/reports')
              },
              pending: {
                icon: <FiClock />,
                number: isLoading ? '...' : dashboardData.stats.pending,
                label: 'Pending Orders',
                trend: dashboardData.trends.pending,
                variant: 'purple' as const,
                onClick: () => navigate('/orders')
              },
              customers: {
                icon: <FiUsers />,
                number: isLoading ? '...' : dashboardData.stats.customers,
                label: 'Total Customers',
                trend: dashboardData.trends.customers,
                comparison: !isLoading ? {
                  label: getComparisonLabel(),
                  value: dashboardData.trends.customers >= 0 
                    ? `+${dashboardData.trends.customers}%` 
                    : `${dashboardData.trends.customers}%`,
                  isPositive: dashboardData.trends.customers >= 0
                } : undefined,
                variant: 'green' as const,
                onClick: () => navigate('/customers')
              }
            }[statId]

            if (!statConfig) return null

            return (
              <motion.div
                key={statId}
                draggable
                onDragStart={(e) => handleDragStart(e, statId)}
                onDragOver={(e) => handleDragOver(e, statId)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, statId)}
                onDragEnd={handleDragEnd}
                className={`stat-card-wrapper ${isDragging === statId ? 'dragging' : ''} ${dragOver === statId ? 'drag-over' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <StatCard 
                  icon={statConfig.icon}
                  number={statConfig.number}
                  label={statConfig.label}
                  trend={statConfig.trend}
                  variant={statConfig.variant}
                  delay={index * 0.1}
                  onClick={statConfig.onClick}
                />
              </motion.div>
            )
          })}
          </motion.div>
        )}

        {/* Charts Grid */}
        {!hiddenSections.charts && (
          <motion.div 
            className="charts-grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
          <motion.div 
            className="chart-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="chart-header">
              <div>
                <h3>📈 Revenue Trend</h3>
                <p className="chart-subtitle">Daily revenue vs target</p>
              </div>
              <span className="chart-period">Last 7 days</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={isLoading ? [] : dashboardData.revenueTrend}>
                <XAxis dataKey="name" stroke={isLowLightTheme ? '#9CA3AF' : '#6B7280'} />
                <YAxis stroke={isLowLightTheme ? '#9CA3AF' : '#6B7280'} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isLowLightTheme ? '#374151' : 'white',
                    border: isLowLightTheme ? '1px solid #4B5563' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    color: isLowLightTheme ? '#F9FAFB' : '#374151'
                  }}
                />
                <Bar dataKey="target" fill={isLowLightTheme ? '#4B5563' : '#E5E7EB'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="value" fill="var(--color-primary-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color" style={{ background: 'var(--color-primary-blue)' }}></div>
                <span>Actual Revenue</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: isLowLightTheme ? '#4B5563' : '#E5E7EB' }}></div>
                <span>Target</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="chart-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <div className="chart-header">
              <div>
                <h3>🥧 Order Distribution</h3>
                <p className="chart-subtitle">By status</p>
              </div>
              <span className="chart-period">Current</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isLowLightTheme ? '#374151' : 'white',
                    border: isLowLightTheme ? '1px solid #4B5563' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    color: isLowLightTheme ? '#F9FAFB' : '#374151'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {orderStatusData.map((item, index) => (
                <div key={index} className="legend-item">
                  <div className="legend-color" style={{ background: item.color }}></div>
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
          </motion.div>
        )}

        {/* Two Column Layout */}
        <div className="dashboard-two-column">
          {/* Left Column - Quick Actions & Recent Orders */}
          <div className="dashboard-left-col">
            {!hiddenSections.quickActions && (
              <motion.div 
                className="quick-actions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
              <div className="section-header">
                <h2 className="section-title">⚡ Quick Actions</h2>
                <p className="section-subtitle">Common tasks</p>
              </div>
              <div className="action-buttons-grid">
                <motion.div
                  className="action-card primary"
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate('/orders')}
                >
                  <div className="action-icon">➕</div>
                  <div className="action-content">
                    <div className="action-title">New Order</div>
                    <div className="action-desc">Create order</div>
                  </div>
                </motion.div>

                <motion.div
                  className="action-card secondary"
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate('/customers')}
                >
                  <div className="action-icon">👥</div>
                  <div className="action-content">
                    <div className="action-title">Add Customer</div>
                    <div className="action-desc">Register new</div>
                  </div>
                </motion.div>

                <motion.div
                  className="action-card primary"
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate('/services')}
                >
                  <div className="action-icon">🧺</div>
                  <div className="action-content">
                    <div className="action-title">Services</div>
                    <div className="action-desc">Manage pricing</div>
                  </div>
                </motion.div>

                <motion.div
                  className="action-card secondary"
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate('/reports')}
                >
                  <div className="action-icon">📈</div>
                  <div className="action-content">
                    <div className="action-title">Reports</div>
                    <div className="action-desc">Analytics</div>
                  </div>
                </motion.div>
              </div>
              </motion.div>
            )}

            {/* Pending Tasks Alert */}
            <motion.div 
              className="alert-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              <div className="alert-icon">
                <FiAlertCircle />
              </div>
              <div className="alert-content">
                <h4 className="alert-title">Attention Required</h4>
                <p className="alert-message">
                  You have {dashboardData.stats.pending} pending orders
                  {user?.role === 'admin' && dashboardData.pendingExpenses > 0 && ` and ${dashboardData.pendingExpenses} expense approval${dashboardData.pendingExpenses > 1 ? 's' : ''} waiting`}
                </p>
              </div>
              <Button onClick={() => navigate('/orders')}>
                Review →
              </Button>
            </motion.div>
          </div>

          {/* Right Column - Activity Feed */}
          <div className="dashboard-right-col">
            {!hiddenSections.activity && (
              <motion.div 
                className="activity-feed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
              <div className="section-header">
                <h2 className="section-title">
                  <FiActivity /> Recent Activity
                </h2>
                <button className="view-all-link" onClick={() => navigate('/orders')}>
                  View All →
                </button>
              </div>

              <div className="activity-timeline">
                {isLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-gray-500)' }}>
                    Loading activity...
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-gray-500)' }}>
                    No recent activity
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      className="activity-item"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                    >
                      <div className={`activity-icon-wrapper ${activity.type}`}>
                        {activity.icon}
                      </div>
                      <div className="activity-details">
                        <p className="activity-message">{activity.message}</p>
                        <span className="activity-time">{activity.time}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Customization Modal */}
        {showCustomizeModal && (
          <motion.div
            className="customize-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCustomizeModal(false)}
          >
            <motion.div
              className="customize-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="customize-modal-header">
                <h2>
                  <FiGrid /> Customize Dashboard
                </h2>
                <button
                  className="close-btn"
                  onClick={() => setShowCustomizeModal(false)}
                >
                  <FiX />
                </button>
              </div>

              <div className="customize-modal-content">
                {/* Stat Cards Visibility */}
                <div className="customize-section">
                  <h3>Stat Cards</h3>
                  <p className="section-description">Toggle visibility of individual stat cards</p>
                  <div className="stat-toggle-list">
                    {(['orders', 'revenue', 'pending', 'customers'] as const).map((stat) => (
                      <div key={stat} className="stat-toggle-item">
                        <label className="stat-toggle-label">
                          <input
                            type="checkbox"
                            checked={visibleStats[stat]}
                            onChange={() => toggleStatVisibility(stat)}
                          />
                          <span className="stat-toggle-name">
                            {stat === 'orders' && '📦 Orders'}
                            {stat === 'revenue' && '💰 Revenue'}
                            {stat === 'pending' && '⏰ Pending Orders'}
                            {stat === 'customers' && '👥 Customers'}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stat Cards Reordering */}
                <div className="customize-section">
                  <h3>Widget Order</h3>
                  <p className="section-description">Drag and drop to reorder stat cards</p>
                  <div className="stat-order-list">
                    {statOrder.map((statId) => (
                      <div
                        key={statId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, statId)}
                        onDragOver={(e) => handleDragOver(e, statId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, statId)}
                        onDragEnd={handleDragEnd}
                        className={`stat-order-item ${isDragging === statId ? 'dragging' : ''} ${dragOver === statId ? 'drag-over' : ''}`}
                      >
                        <FiMove className="drag-handle" />
                        <span className="stat-order-name">
                          {statId === 'orders' && '📦 Orders'}
                          {statId === 'revenue' && '💰 Revenue'}
                          {statId === 'pending' && '⏰ Pending Orders'}
                          {statId === 'customers' && '👥 Customers'}
                        </span>
                        <button
                          className="toggle-visibility-btn"
                          onClick={() => toggleStatVisibility(statId as keyof typeof visibleStats)}
                          title={visibleStats[statId as keyof typeof visibleStats] ? 'Hide' : 'Show'}
                        >
                          {visibleStats[statId as keyof typeof visibleStats] ? <FiEye /> : <FiEyeOff />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section Visibility */}
                <div className="customize-section">
                  <h3>Dashboard Sections</h3>
                  <p className="section-description">Show or hide entire sections</p>
                  <div className="section-toggle-list">
                    {([
                      { key: 'stats', label: '📊 Statistics Cards' },
                      { key: 'charts', label: '📈 Charts' },
                      { key: 'quickActions', label: '⚡ Quick Actions' },
                      { key: 'activity', label: '📋 Recent Activity' }
                    ] as const).map(({ key, label }) => (
                      <div key={key} className="section-toggle-item">
                        <label className="section-toggle-label">
                          <input
                            type="checkbox"
                            checked={!hiddenSections[key as keyof typeof hiddenSections]}
                            onChange={() => toggleSection(key as keyof typeof hiddenSections)}
                          />
                          <span>{label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="customize-modal-footer">
                <Button onClick={() => setShowCustomizeModal(false)}>
                  Done
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </Layout>
  )
}

export default Dashboard

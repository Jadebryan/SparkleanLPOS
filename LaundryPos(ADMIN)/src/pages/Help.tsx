import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiSearch, FiChevronDown, FiChevronRight, FiHelpCircle, FiBook, 
  FiMessageCircle, FiMail, FiPhone, FiClock, FiStar, FiExternalLink,
  FiPlay, FiDownload, FiUsers, FiSettings, FiCreditCard, FiBarChart2,
  FiPercent, FiBox, FiList, FiUser, FiFileText, FiCommand
} from 'react-icons/fi'
import './Help.css'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
}

interface HelpSection {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  items: FAQItem[]
}

const Help: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <FiPlay />,
      description: 'Learn the basics of using Sparklean Laundry POS',
      items: [
        {
          id: 'first-login',
          question: 'How do I log in for the first time?',
          answer: 'Use the admin credentials provided by your system administrator. If you need access, contact sparklean@example.com with your full name and role.',
          category: 'getting-started',
          tags: ['login', 'access', 'first-time']
        },
        {
          id: 'dashboard-overview',
          question: 'What can I see on the dashboard?',
          answer: 'The dashboard shows key metrics including total orders, revenue, active customers, and recent activity. Click on any stat card to navigate to the relevant section. You can customize the dashboard by clicking the "Customize" button to reorder widgets, toggle visibility, and personalize your layout preferences.',
          category: 'getting-started',
          tags: ['dashboard', 'overview', 'metrics', 'customization']
        },
        {
          id: 'dashboard-customization',
          question: 'How do I customize my dashboard?',
          answer: 'Click the "Customize" button on the dashboard to open the customization modal. You can drag and drop stat cards to reorder them, toggle individual widgets on/off, and your preferences will be saved automatically. This allows you to create a personalized dashboard layout.',
          category: 'getting-started',
          tags: ['dashboard', 'customize', 'widgets', 'layout']
        },
        {
          id: 'theme-switching',
          question: 'How do I change the theme?',
          answer: 'Click the theme toggle in the header or use keyboard shortcuts: Ctrl+1 (Light) or Ctrl+2 (Dim).',
          category: 'getting-started',
          tags: ['theme', 'appearance', 'keyboard-shortcuts']
        },
        {
          id: 'font-customization',
          question: 'Can I customize the font style?',
          answer: 'Yes! Go to Settings → Appearance to choose from a variety of font styles. The font previews show exactly how each font will look, and your selection will be applied throughout the application.',
          category: 'getting-started',
          tags: ['font', 'appearance', 'settings', 'customization']
        }
      ]
    },
    {
      id: 'orders',
      title: 'Order Management',
      icon: <FiList />,
      description: 'Everything about creating and managing orders',
      items: [
        {
          id: 'create-order',
          question: 'How do I create a new order?',
          answer: 'Go to "Create Order" from the sidebar or use Ctrl+N. Select the customer (or add a new one), choose a branch/station, add services (popular services are shown first with a 🔥 badge), apply discounts if needed, and process payment. The system will automatically assign the customer to the selected branch.',
          category: 'orders',
          tags: ['create', 'new-order', 'customer', 'services', 'branch', 'station']
        },
        {
          id: 'popular-services',
          question: 'What are popular services?',
          answer: 'Popular services are marked with a 🔥 badge and appear at the top of the service list when creating orders. This helps you quickly access frequently used services. Services can be marked as popular in Services Management.',
          category: 'orders',
          tags: ['services', 'popular', 'badge', 'sorting']
        },
        {
          id: 'discount-filtering',
          question: 'Why don\'t I see all discounts when creating an order?',
          answer: 'The system automatically hides discounts that don\'t meet the minimum purchase requirement based on your current order subtotal. Only applicable discounts are shown in the dropdown to prevent errors and confusion.',
          category: 'orders',
          tags: ['discounts', 'filtering', 'minimum-purchase', 'applicable']
        },
        {
          id: 'order-status',
          question: 'How do I update order status?',
          answer: 'In Order Management, click on any order to view details. Use the status dropdown to change from Pending → Processing → Ready → Completed. When you mark an order as "Completed" and save, it becomes locked and cannot be edited. The same applies to orders marked as "Paid" in the payment status field.',
          category: 'orders',
          tags: ['status', 'update', 'workflow', 'locked', 'completed', 'paid']
        },
        {
          id: 'order-locking',
          question: 'Why can\'t I edit a completed or paid order?',
          answer: 'Completed orders and paid orders are automatically locked to prevent accidental changes. Once you save an order with "Completed" status or "Paid" payment status, it becomes read-only. This ensures data integrity and prevents modifications to finalized transactions.',
          category: 'orders',
          tags: ['locked', 'completed', 'paid', 'editing', 'protection']
        },
        {
          id: 'order-notifications',
          question: 'Do customers get notified when order status changes?',
          answer: 'Yes! When you update an order status to "In Progress" or "Completed", the system automatically sends SMS and email notifications to the customer\'s registered phone number and email address. Make sure SMS and email services are properly configured in your settings.',
          category: 'orders',
          tags: ['notifications', 'sms', 'email', 'status-updates', 'customer-communication']
        },
        {
          id: 'invoice-email',
          question: 'How do I send an invoice to a customer via email?',
          answer: 'On the invoice page, click the "Email" button to send the invoice directly to the customer\'s email address. The system will generate and send a formatted invoice email with all order details, station information, and payment breakdown.',
          category: 'orders',
          tags: ['invoice', 'email', 'send', 'customer']
        },
        {
          id: 'order-search',
          question: 'How do I find a specific order?',
          answer: 'Use the search bar in Order Management to search by order ID, customer name, or phone number. You can filter by payment status, station/branch, date range, and order status. The counter at the top shows how many orders match your current filters.',
          category: 'orders',
          tags: ['search', 'find', 'filter', 'station', 'date-range', 'counter']
        },
        {
          id: 'order-filters',
          question: 'What filters are available for orders?',
          answer: 'Order Management includes multiple filters: Payment Status (All/Paid/Unpaid/Partial), Station/Branch (All Stations or specific branch), Date Range (from/to dates), and Order Status (All/Pending/In Progress/Completed). Use the "Clear All" button to reset all filters.',
          category: 'orders',
          tags: ['filters', 'payment', 'station', 'date', 'status', 'clear']
        },
        {
          id: 'view-mode-persistence',
          question: 'Does the grid/list view setting persist?',
          answer: 'Yes! Your preferred view mode (grid or list) is automatically saved and will be remembered when you revisit any management page. This applies to Orders, Customers, Employees, Services, Stations, Discounts, and Expenses.',
          category: 'orders',
          tags: ['view-mode', 'grid', 'list', 'persistence', 'preferences']
        }
      ]
    },
    {
      id: 'customers',
      title: 'Customer Management',
      icon: <FiUsers />,
      description: 'Managing customer information and history',
      items: [
        {
          id: 'add-customer',
          question: 'How do I add a new customer?',
          answer: 'Go to Customer Management and click "Add Customer". Fill in the required information including name, phone, email (optional), and select a branch/station from the dropdown. When adding a customer during order creation, the name and phone fields are automatically pre-filled. The system will auto-generate a customer ID.',
          category: 'customers',
          tags: ['add', 'new-customer', 'registration', 'branch', 'station', 'pre-filled']
        },
        {
          id: 'customer-station-assignment',
          question: 'How are customers assigned to branches/stations?',
          answer: 'When creating a customer, you must select a branch/station from the dropdown. This ensures customers are properly associated with the correct location. When adding customers during order creation, they are automatically assigned to the order\'s selected branch.',
          category: 'customers',
          tags: ['station', 'branch', 'assignment', 'location']
        },
        {
          id: 'customer-history',
          question: 'How do I view customer order history?',
          answer: 'Click on any customer in Customer Management to open their details modal. You can see all their past orders, total spending, and contact information.',
          category: 'customers',
          tags: ['history', 'orders', 'details']
        },
        {
          id: 'customer-station-filter',
          question: 'How do I filter customers by branch/station?',
          answer: 'In Customer Management, use the "All Stations" dropdown filter at the top to view customers from a specific branch. The counter at the top of the table shows how many customers match your current filters, including the selected station.',
          category: 'customers',
          tags: ['filter', 'station', 'branch', 'counter']
        }
      ]
    },
    {
      id: 'services',
      title: 'Services & Pricing',
      icon: <FiBox />,
      description: 'Managing laundry services and pricing',
      items: [
        {
          id: 'add-service',
          question: 'How do I add a new service?',
          answer: 'Go to Services Management and click "Add Service". Define the service name, category, pricing, and processing time. You can mark services as popular - popular services will appear at the top of the service list when creating orders and display a 🔥 badge.',
          category: 'services',
          tags: ['add', 'new-service', 'pricing', 'categories', 'popular', 'badge']
        },
        {
          id: 'update-pricing',
          question: 'How do I update service pricing?',
          answer: 'In Services Management, click on any service to edit details. Update the price and save changes. The new pricing will apply to all future orders.',
          category: 'services',
          tags: ['pricing', 'update', 'edit']
        }
      ]
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      icon: <FiBarChart2 />,
      description: 'Generating reports and viewing analytics',
      items: [
        {
          id: 'generate-report',
          question: 'How do I generate a sales report?',
          answer: 'Go to Reports Generation, select the report type (Sales, Customer, Service), choose date range, and click "Generate Report". You can export as PDF or Excel.',
          category: 'reports',
          tags: ['generate', 'sales', 'export', 'pdf']
        },
        {
          id: 'report-scheduling',
          question: 'Can I schedule automatic reports?',
          answer: 'Currently, reports are generated on-demand. Future updates will include automatic daily/weekly/monthly report generation and email delivery.',
          category: 'reports',
          tags: ['schedule', 'automatic', 'email']
        }
      ]
    },
    {
      id: 'employees',
      title: 'Employee Management',
      icon: <FiUser />,
      description: 'Managing staff and employee information',
      items: [
        {
          id: 'employee-station-filter',
          question: 'How do I filter employees by branch/station?',
          answer: 'In Employee Management, use the "All Stations" dropdown filter to view employees from a specific branch. The counter at the top of the table shows how many employees match your current filters.',
          category: 'employees',
          tags: ['filter', 'station', 'branch', 'counter']
        },
        {
          id: 'employee-count',
          question: 'What does the employee count show?',
          answer: 'The count at the top of the employee table shows the number of employees currently displayed based on your active filters (status, station, search term). It updates automatically as you change filters.',
          category: 'employees',
          tags: ['count', 'counter', 'filter', 'display']
        }
      ]
    },
    {
      id: 'settings',
      title: 'Settings & Preferences',
      icon: <FiSettings />,
      description: 'Customizing your experience and system settings',
      items: [
        {
          id: 'password-strength',
          question: 'How does password strength checking work?',
          answer: 'When resetting your password, the system checks if it meets strong password requirements (length, complexity). A "Suggest Password" button is available to generate a secure password automatically. The strength indicator shows if your password is weak, medium, or strong.',
          category: 'settings',
          tags: ['password', 'security', 'strength', 'reset', 'suggest']
        },
        {
          id: 'username-login',
          question: 'Can I log in with my username?',
          answer: 'Yes! Staff members can log in using either their email address or username. Simply enter either one in the login field - the system will recognize both formats.',
          category: 'settings',
          tags: ['login', 'username', 'email', 'authentication']
        },
        {
          id: 'station-address',
          question: 'Where is the station/branch address used?',
          answer: 'Station addresses are automatically displayed on invoices, receipts, and print summaries. Make sure to set up your station addresses in Station Management so they appear correctly on all customer-facing documents.',
          category: 'settings',
          tags: ['station', 'address', 'invoice', 'receipt', 'location']
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications & Communication',
      icon: <FiMessageCircle />,
      description: 'SMS, email, and system notifications',
      items: [
        {
          id: 'order-status-notifications',
          question: 'How do order status notifications work?',
          answer: 'When you update an order status to "In Progress" or "Completed", the system automatically sends SMS and email notifications to the customer. SMS requires Twilio configuration, and email uses Gmail SMTP. Both services must be properly configured in your environment variables.',
          category: 'notifications',
          tags: ['sms', 'email', 'order-status', 'twilio', 'notifications']
        },
        {
          id: 'notification-setup',
          question: 'How do I set up SMS and email notifications?',
          answer: 'Configure your Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) for SMS, and Gmail credentials (GMAIL_USER, GMAIL_APP_PASSWORD) for email in your .env file. Refer to the SMS_EMAIL_SETUP.md documentation for detailed setup instructions.',
          category: 'notifications',
          tags: ['setup', 'configuration', 'twilio', 'gmail', 'sms', 'email']
        },
        {
          id: 'invoice-email-notification',
          question: 'Can I email invoices to customers?',
          answer: 'Yes! On the invoice page, click the "Email" button to send a formatted invoice directly to the customer\'s email address. The invoice includes all order details, station information, and payment breakdown.',
          category: 'notifications',
          tags: ['invoice', 'email', 'send', 'customer', 'notification']
        }
      ]
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      icon: <FiCommand />,
      description: 'Speed up your workflow with keyboard shortcuts',
      items: [
        {
          id: 'shortcuts-list',
          question: 'What keyboard shortcuts are available?',
          answer: 'Press Ctrl+/ to see all available shortcuts. Key shortcuts include: Ctrl+K (search), Ctrl+N (new order), Ctrl+1/2/3 (themes), and many more for navigation and actions.',
          category: 'keyboard-shortcuts',
          tags: ['shortcuts', 'keyboard', 'productivity']
        }
      ]
    }
  ]

  const allFAQs = helpSections.flatMap(section => section.items)
  
  const filteredFAQs = allFAQs.filter(faq => {
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const categories = [
    { id: 'all', name: 'All Topics', icon: <FiHelpCircle /> },
    { id: 'getting-started', name: 'Getting Started', icon: <FiPlay /> },
    { id: 'orders', name: 'Orders', icon: <FiList /> },
    { id: 'customers', name: 'Customers', icon: <FiUsers /> },
    { id: 'services', name: 'Services', icon: <FiBox /> },
    { id: 'employees', name: 'Employees', icon: <FiUser /> },
    { id: 'reports', name: 'Reports', icon: <FiBarChart2 /> },
    { id: 'settings', name: 'Settings', icon: <FiSettings /> },
    { id: 'notifications', name: 'Notifications', icon: <FiMessageCircle /> },
    { id: 'keyboard-shortcuts', name: 'Shortcuts', icon: <FiCommand /> }
  ]

  return (
    <div className="help-page">
      <div className="help-header">
        <div className="help-title">
          <FiHelpCircle className="help-icon" />
          <h1>Help Center</h1>
        </div>
        <p className="help-subtitle">
          Find answers to common questions and learn how to use Sparklean Laundry POS effectively
        </p>
      </div>

      <div className="help-search-section">
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="help-content">
        <div className="help-sidebar">
          <h3>Categories</h3>
          <div className="category-list">
            {categories.map(category => (
              <button
                key={category.id}
                className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon}
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          <div className="quick-links">
            <h3>Quick Links</h3>
            <div className="quick-link-item">
              <FiMessageCircle />
              <span>Contact Support</span>
            </div>
            <div className="quick-link-item">
              <FiBook />
              <span>User Manual</span>
            </div>
            <div className="quick-link-item">
              <FiDownload />
              <span>Download Guide</span>
            </div>
          </div>
        </div>

        <div className="help-main">
          {searchQuery && (
            <div className="search-results-header">
              <h2>Search Results</h2>
              <p>{filteredFAQs.length} result{filteredFAQs.length !== 1 ? 's' : ''} found for "{searchQuery}"</p>
            </div>
          )}

          {!searchQuery && selectedCategory === 'all' && (
            <div className="help-sections">
              {helpSections.map(section => (
                <motion.div
                  key={section.id}
                  className="help-section-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="section-header">
                    <div className="section-icon">{section.icon}</div>
                    <div className="section-info">
                      <h3>{section.title}</h3>
                      <p>{section.description}</p>
                    </div>
                  </div>
                  <div className="section-items">
                    {section.items.slice(0, 3).map(item => (
                      <div key={item.id} className="section-item">
                        <span className="item-question">{item.question}</span>
                      </div>
                    ))}
                    {section.items.length > 3 && (
                      <div className="section-more">
                        +{section.items.length - 3} more questions
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="faq-list">
            {filteredFAQs.map(faq => (
              <motion.div
                key={faq.id}
                className="faq-item"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  className="faq-question"
                  onClick={() => toggleExpanded(faq.id)}
                >
                  <span>{faq.question}</span>
                  {expandedItems.has(faq.id) ? <FiChevronDown /> : <FiChevronRight />}
                </button>
                <AnimatePresence>
                  {expandedItems.has(faq.id) && (
                    <motion.div
                      className="faq-answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p>{faq.answer}</p>
                      <div className="faq-tags">
                        {faq.tags.map(tag => (
                          <span key={tag} className="faq-tag">{tag}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {filteredFAQs.length === 0 && (
            <div className="no-results">
              <FiHelpCircle />
              <h3>No results found</h3>
              <p>Try adjusting your search terms or browse by category</p>
            </div>
          )}
        </div>
      </div>

      <div className="help-footer">
        <div className="contact-section">
          <h3>Still need help?</h3>
          <p>Our support team is here to assist you</p>
          <div className="contact-methods">
            <div className="contact-method">
              <FiMail />
              <div>
                <strong>Email Support</strong>
                <a href="mailto:bryanjadesalahag@gmail.com">bryanjadesalahag@gmail.com</a>
              </div>
            </div>
            <div className="contact-method">
              <FiPhone />
              <div>
                <strong>Phone Support</strong>
                <a href="tel:09750543087">0975 054 3087</a>
              </div>
            </div>
            <div className="contact-method">
              <FiClock />
              <div>
                <strong>Support Hours</strong>
                <span>Mon-Fri 8AM-6PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Help

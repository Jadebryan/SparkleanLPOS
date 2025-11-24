import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlobalStyles from "../styles/GlobalStyle";
import ModernSidebar from './components/ModernSidebar';
import Header from './components/Header';
import { useColors } from '@/app/theme/useColors';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

interface HelpSection {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  items: FAQItem[];
}

export default function Help() {
  const dynamicColors = useColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: 'play-outline',
      description: 'Learn the basics of using the Laundry POS system',
      items: [
        {
          id: 'first-login',
          question: 'How do I log in?',
          answer: 'Use your username and password provided by your administrator. If you forgot your password, contact your station manager.',
          category: 'getting-started',
          tags: ['login', 'access', 'password']
        },
        {
          id: 'dashboard-overview',
          question: 'What can I see on the home page?',
          answer: 'The home page shows your order list. You can view all orders, create new orders, manage customers, and submit expense requests. The app supports both portrait and landscape orientations - simply rotate your device to switch views.',
          category: 'getting-started',
          tags: ['dashboard', 'overview', 'home', 'orientation']
        },
        {
          id: 'toast-notifications',
          question: 'What are toast notifications?',
          answer: 'Toast notifications are non-intrusive messages that appear at the top of the screen to confirm actions like color palette changes, successful operations, or errors. They automatically disappear after a few seconds and don\'t block your workflow.',
          category: 'getting-started',
          tags: ['notifications', 'toast', 'feedback', 'messages']
        },
      ]
    },
    {
      id: 'orders',
      title: 'Order Management',
      icon: 'list-outline',
      description: 'Creating and managing customer orders',
      items: [
        {
          id: 'create-order',
          question: 'How do I create a new order?',
          answer: 'Click "Add Order" from the sidebar or use the floating action button. Select or add a customer, choose services, set quantities, apply discounts if needed, and process payment. You can save orders as drafts to complete later.',
          category: 'orders',
          tags: ['create', 'new-order', 'customer', 'services', 'draft']
        },
        {
          id: 'add-customer-during-order',
          question: 'Can I add a new customer while creating an order?',
          answer: 'Yes! When creating an order, if the customer doesn\'t exist, you can click "Add Customer" to create them on the spot. The customer will be automatically added and selected for the current order.',
          category: 'orders',
          tags: ['customer', 'add', 'create', 'during-order']
        },
        {
          id: 'order-payment',
          question: 'How do I handle payments and change?',
          answer: 'Enter the amount paid by the customer. If the amount exceeds the total, the system will calculate the change and ask for confirmation. Always verify the change amount before completing the transaction.',
          category: 'orders',
          tags: ['payment', 'change', 'cash', 'transaction', 'verification']
        },
        {
          id: 'order-status',
          question: 'How do I update order status?',
          answer: 'Go to Order List, click on any order to view details. You can update the payment status (Unpaid/Paid/Partial) and order status (Pending → Processing → Ready → Completed). Changes are saved automatically.',
          category: 'orders',
          tags: ['status', 'update', 'workflow', 'payment-status']
        },
        {
          id: 'edit-order',
          question: 'Can I edit an order after creating it?',
          answer: 'Yes, you can edit orders by clicking on them in the Order List. However, completed or paid orders are locked and cannot be edited to maintain data integrity.',
          category: 'orders',
          tags: ['edit', 'update', 'locked', 'completed', 'paid']
        },
        {
          id: 'print-receipt',
          question: 'How do I print a receipt?',
          answer: 'After creating an order, click "Print Summary" to generate and print a receipt. You can also print receipts from the order details view. The receipt includes all order details, customer information, and payment breakdown.',
          category: 'orders',
          tags: ['print', 'receipt', 'summary', 'details']
        },
        {
          id: 'order-search',
          question: 'How do I find a specific order?',
          answer: 'Use the search bar in Order List to search by order ID, customer name, or phone number. You can also filter by status (Pending, Processing, Ready, Completed) and payment status (Paid, Unpaid, Partial).',
          category: 'orders',
          tags: ['search', 'find', 'filter', 'status', 'payment']
        },
        {
          id: 'order-view-modes',
          question: 'Can I switch between different views?',
          answer: 'Yes! The Order List supports both grid view (card layout) and list view (table layout). Use the view toggle button in the header to switch between views. Your preference is saved automatically.',
          category: 'orders',
          tags: ['view-mode', 'grid', 'list', 'toggle', 'preference']
        },
        {
          id: 'order-stats',
          question: 'What statistics are shown on the order page?',
          answer: 'The order page displays summary statistics including total orders, pending orders, completed orders, and total revenue. You can hide/show these stats using the eye icon toggle in the header.',
          category: 'orders',
          tags: ['stats', 'summary', 'orders', 'revenue', 'toggle']
        },
      ]
    },
    {
      id: 'customers',
      title: 'Customer Management',
      icon: 'people-outline',
      description: 'Managing customer information',
      items: [
        {
          id: 'add-customer',
          question: 'How do I add a new customer?',
          answer: 'Go to Customer Management and click "Add Customer". Fill in the customer name, phone number, and email (optional). The system will automatically assign a customer ID. Customers are automatically assigned to your station.',
          category: 'customers',
          tags: ['add', 'new-customer', 'registration', 'station']
        },
        {
          id: 'view-customer',
          question: 'How do I view customer details?',
          answer: 'In Customer Management, click on any customer to view their full details including order history, total orders, total spent, and contact information. You can see all their past transactions.',
          category: 'customers',
          tags: ['view', 'details', 'history', 'transactions']
        },
        {
          id: 'edit-customer',
          question: 'Can I edit customer information?',
          answer: 'Yes, click on a customer to view details, then click "Edit Customer" to update their name, phone, or email. Note: You cannot delete customers - only admins have that permission. Customer ID cannot be changed.',
          category: 'customers',
          tags: ['edit', 'update', 'information', 'permissions']
        },
        {
          id: 'search-customers',
          question: 'How do I search for a customer?',
          answer: 'Use the search bar in Customer Management to search by customer name, phone number, or customer ID. The search works in real-time and filters customers as you type.',
          category: 'customers',
          tags: ['search', 'filter', 'name', 'phone', 'id']
        },
        {
          id: 'customer-view-modes',
          question: 'Can I switch between grid and list view for customers?',
          answer: 'Yes! Use the view toggle button in the header to switch between grid view (card layout) and list view (table layout). Your preference is automatically saved.',
          category: 'customers',
          tags: ['view-mode', 'grid', 'list', 'toggle']
        },
      ]
    },
    {
      id: 'expenses',
      title: 'Expense Requests',
      icon: 'receipt-outline',
      description: 'Submitting and tracking expense requests',
      items: [
        {
          id: 'submit-expense',
          question: 'How do I submit an expense request?',
          answer: 'Go to Requests, click "Add Request" (or use the floating action button). Select a category (Supplies, Utilities, Maintenance, Salaries, or Other), enter the amount and description, and attach proof images. Submit the request and wait for admin approval.',
          category: 'expenses',
          tags: ['submit', 'request', 'proof', 'image', 'category', 'fab']
        },
        {
          id: 'expense-categories',
          question: 'What expense categories are available?',
          answer: 'You can choose from five categories: Supplies (office supplies, cleaning materials), Utilities (electricity, water, internet), Maintenance (repairs, equipment), Salaries (staff payments), and Other (miscellaneous expenses).',
          category: 'expenses',
          tags: ['categories', 'supplies', 'utilities', 'maintenance', 'salaries']
        },
        {
          id: 'upload-proof',
          question: 'How do I attach proof images?',
          answer: 'When submitting an expense, you can attach multiple proof images by tapping the image upload area. These images help admins verify your expense request. You can take photos directly or select from your gallery.',
          category: 'expenses',
          tags: ['proof', 'images', 'upload', 'camera', 'gallery']
        },
        {
          id: 'upload-receipt',
          question: 'How do I upload receipts after approval?',
          answer: 'Once your expense is approved, you can upload purchase receipts by clicking "Upload Receipt" on the approved expense card. Receipts are separate from initial proof images and are used for final verification.',
          category: 'expenses',
          tags: ['receipt', 'upload', 'approved', 'verification']
        },
        {
          id: 'appeal-expense',
          question: 'Can I appeal a rejected expense?',
          answer: 'Yes, if your expense is rejected, you can click "Appeal This Decision" to provide additional information, an appeal reason, and supporting images. The admin will review your appeal and make a final decision.',
          category: 'expenses',
          tags: ['appeal', 'rejected', 'review', 'supporting-documents']
        },
        {
          id: 'expense-status',
          question: 'What do the expense statuses mean?',
          answer: 'Pending: Waiting for admin review. Approved: Request approved, you can now upload receipts. Rejected: Request denied (you can appeal if needed). Appealed: Your appeal is being reviewed by admin.',
          category: 'expenses',
          tags: ['status', 'pending', 'approved', 'rejected', 'appealed']
        },
        {
          id: 'view-modes',
          question: 'Can I switch between grid and list view?',
          answer: 'Yes! Use the view toggle button in the header to switch between grid view (card layout) and list view (compact table layout). Your preference is automatically saved and remembered for next time.',
          category: 'expenses',
          tags: ['view-mode', 'grid', 'list', 'toggle', 'preference']
        },
        {
          id: 'search-expenses',
          question: 'How do I search for specific expenses?',
          answer: 'Use the search bar at the top to search by description, category, or amount. The search works in real-time and filters your expenses as you type.',
          category: 'expenses',
          tags: ['search', 'filter', 'description', 'category', 'amount']
        },
        {
          id: 'filter-by-status',
          question: 'How do I filter expenses by status?',
          answer: 'Use the status filter buttons (All, Pending, Approved, Rejected, Appealed) at the top. Each button shows the count of expenses in that status. Click any button to filter expenses accordingly.',
          category: 'expenses',
          tags: ['filter', 'status', 'buttons', 'count']
        },
        {
          id: 'expense-stats',
          question: 'What do the summary cards show?',
          answer: 'The summary cards display key statistics: Pending requests count, Approved requests count, Rejected requests count, and Total Approved Amount. You can hide/show these stats using the eye icon toggle in the header.',
          category: 'expenses',
          tags: ['stats', 'summary', 'cards', 'pending', 'approved', 'rejected', 'total']
        },
        {
          id: 'refresh-expenses',
          question: 'How do I refresh the expense list?',
          answer: 'Click the refresh button (circular arrow icon) in the header to reload all expenses from the server. The button shows a spinning animation while refreshing.',
          category: 'expenses',
          tags: ['refresh', 'reload', 'sync', 'update']
        },
        {
          id: 'admin-feedback',
          question: 'How do I see admin feedback?',
          answer: 'When an expense is approved or rejected, admin feedback (if provided) is displayed on the expense card. For rejected expenses, you\'ll see the reason for rejection, which can help you when appealing.',
          category: 'expenses',
          tags: ['feedback', 'admin', 'comments', 'rejection-reason']
        },
      ]
    },
    {
      id: 'account',
      title: 'Account & Settings',
      icon: 'settings-outline',
      description: 'Managing your account settings',
      items: [
        {
          id: 'color-palette',
          question: 'How do I change the app colors?',
          answer: 'Go to Settings → Appearance tab to access the color palette selector. Choose from 6 different color palettes: Default (Sparklean Blue & Orange), Ocean Breeze, Forest Green, Royal Purple, Sunset Orange, and Midnight Blue. Your selection is applied immediately across the entire app, including buttons, icons, and all UI elements. Changes are saved automatically.',
          category: 'account',
          tags: ['color-palette', 'appearance', 'customization', 'colors', 'themes']
        },
        {
          id: 'app-orientation',
          question: 'Can I rotate the app to landscape mode?',
          answer: 'Yes! The app supports both portrait and landscape orientations. Simply rotate your device and the app will automatically adjust. This is especially useful when viewing order lists or customer details on tablets.',
          category: 'account',
          tags: ['orientation', 'landscape', 'portrait', 'rotation', 'tablet']
        },
        {
          id: 'update-profile',
          question: 'How do I update my profile?',
          answer: 'Go to Settings → Profile tab. You can update your username and email. Your station ID and employee ID cannot be changed and are managed by administrators.',
          category: 'account',
          tags: ['profile', 'update', 'settings', 'station-id']
        },
        {
          id: 'change-password',
          question: 'How do I change my password?',
          answer: 'Go to Settings → Security tab. Enter your current password, then your new password (at least 6 characters), and confirm it. Click "Update Password" to save. Make sure to use a strong password for security.',
          category: 'account',
          tags: ['password', 'security', 'change', 'strong-password']
        },
        {
          id: 'view-station-info',
          question: 'Can I see my station information?',
          answer: 'Yes, your station ID and station name are displayed in your profile settings. This information is assigned by administrators and cannot be changed by staff members.',
          category: 'account',
          tags: ['station', 'information', 'profile', 'view']
        },
      ]
    },
    {
      id: 'offline',
      title: 'Offline Mode & Sync',
      icon: 'cloud-offline-outline',
      description: 'Working offline and syncing data',
      items: [
        {
          id: 'offline-indicator',
          question: 'What does the offline indicator mean?',
          answer: 'The red banner at the top indicates you\'re offline. When offline, you can still view cached data and perform actions. All actions are queued and will sync automatically when you reconnect to the internet.',
          category: 'offline',
          tags: ['offline', 'indicator', 'sync', 'queue']
        },
        {
          id: 'offline-queue',
          question: 'How does the offline queue work?',
          answer: 'When you perform actions while offline (like creating orders or submitting expenses), they are saved in a queue. Once you reconnect, the system automatically syncs all queued actions to the server.',
          category: 'offline',
          tags: ['queue', 'sync', 'automatic', 'reconnect']
        },
        {
          id: 'view-queue',
          question: 'Can I see what\'s in the sync queue?',
          answer: 'Yes, click on the offline indicator banner to expand it and see all pending actions in the sync queue. You can see how many actions are waiting to be synced.',
          category: 'offline',
          tags: ['queue', 'view', 'pending', 'sync']
        },
      ]
    },
  ];

  const allFAQs = helpSections.flatMap(section => section.items);

  const filteredFAQs = allFAQs.filter(faq => {
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const categories = [
    { id: 'all', name: 'All Topics', icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap },
    { id: 'getting-started', name: 'Getting Started', icon: 'play-outline' as keyof typeof Ionicons.glyphMap },
    { id: 'orders', name: 'Orders', icon: 'list-outline' as keyof typeof Ionicons.glyphMap },
    { id: 'customers', name: 'Customers', icon: 'people-outline' as keyof typeof Ionicons.glyphMap },
    { id: 'expenses', name: 'Expenses', icon: 'receipt-outline' as keyof typeof Ionicons.glyphMap },
    { id: 'account', name: 'Account', icon: 'settings-outline' as keyof typeof Ionicons.glyphMap },
    { id: 'offline', name: 'Offline Mode', icon: 'cloud-offline-outline' as keyof typeof Ionicons.glyphMap },
  ];

  return (
    <View style={GlobalStyles.mainLayout}>
      <ModernSidebar />
      <View style={GlobalStyles.mainContent}>
        <Header title="Help Center" />

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Ionicons name="help-circle" size={32} color={dynamicColors.primary[500]} />
              <Text style={styles.title}>Help Center</Text>
            </View>
            <Text style={styles.subtitle}>
              Find answers to common questions and learn how to use the system
            </Text>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search help articles..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.content}>
            {/* Sidebar */}
            <View style={styles.sidebar}>
              <Text style={styles.sidebarTitle}>Categories</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      selectedCategory === category.id && styles.categoryItemActive
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Ionicons
                      name={category.icon}
                      size={20}
                      color={selectedCategory === category.id ? dynamicColors.primary[500] : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === category.id && styles.categoryTextActive
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              {searchQuery && (
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>Search Results</Text>
                  <Text style={styles.resultsCount}>
                    {filteredFAQs.length} result{filteredFAQs.length !== 1 ? 's' : ''} found
                  </Text>
                </View>
              )}

              {!searchQuery && selectedCategory === 'all' && (
                <View style={styles.sectionsContainer}>
                  {helpSections.map(section => (
                    <View key={section.id} style={styles.sectionCard}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconContainer}>
                          <Ionicons name={section.icon} size={24} color={dynamicColors.primary[500]} />
                        </View>
                        <View style={styles.sectionInfo}>
                          <Text style={styles.sectionTitle}>{section.title}</Text>
                          <Text style={styles.sectionDescription}>{section.description}</Text>
                        </View>
                      </View>
                      <View style={styles.sectionItems}>
                        {section.items.slice(0, 3).map(item => (
                          <View key={item.id} style={styles.sectionItem}>
                            <Text style={styles.sectionItemText}>{item.question}</Text>
                          </View>
                        ))}
                        {section.items.length > 3 && (
                          <Text style={styles.sectionMore}>
                            +{section.items.length - 3} more questions
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* FAQ List */}
              <View style={styles.faqList}>
                {filteredFAQs.map(faq => (
                  <View key={faq.id} style={styles.faqItem}>
                    <TouchableOpacity
                      style={styles.faqQuestion}
                      onPress={() => toggleExpanded(faq.id)}
                    >
                      <Text style={styles.faqQuestionText}>{faq.question}</Text>
                      <Ionicons
                        name={expandedItems.has(faq.id) ? 'chevron-down' : 'chevron-forward'}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                    {expandedItems.has(faq.id) && (
                      <View style={styles.faqAnswer}>
                        <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                        <View style={styles.faqTags}>
                          {faq.tags.map(tag => (
                            <View key={tag} style={styles.faqTag}>
                              <Text style={styles.faqTagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {filteredFAQs.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="help-circle-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.noResultsTitle}>No results found</Text>
                  <Text style={styles.noResultsText}>
                    Try adjusting your search terms or browse by category
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>Still need help?</Text>
            <Text style={styles.footerText}>Contact your station manager or administrator</Text>
            <View style={styles.contactMethods}>
              <View style={styles.contactMethod}>
                <Ionicons name="mail-outline" size={20} color={dynamicColors.primary[500]} />
                <View>
                  <Text style={styles.contactLabel}>Email Support</Text>
                  <Text style={styles.contactValue}>labubbles@example.com</Text>
                </View>
              </View>
              <View style={styles.contactMethod}>
                <Ionicons name="call-outline" size={20} color={dynamicColors.primary[500]} />
                <View>
                  <Text style={styles.contactLabel}>Phone Support</Text>
                  <Text style={styles.contactValue}>+63 912 345 6789</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 44,
    fontFamily: 'Poppins_400Regular',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    gap: 12,
  },
  searchIcon: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Poppins_400Regular',
  },
  content: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  sidebar: {
    width: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    maxHeight: 600,
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  categoryItemActive: {
    backgroundColor: '#EFF6FF',
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  categoryTextActive: {
    // color: '#2563EB', // Now using dynamic color via inline style
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  mainContent: {
    flex: 1,
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  sectionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  sectionItems: {
    gap: 8,
  },
  sectionItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionItemText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Poppins_400Regular',
  },
  sectionMore: {
    fontSize: 12,
    // color: '#2563EB', // Now using dynamic color via inline style
    marginTop: 4,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: 'Poppins_400Regular',
  },
  faqTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  faqTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  faqTagText: {
    fontSize: 12,
    // color: '#2563EB', // Now using dynamic color via inline style
    fontFamily: 'Poppins_400Regular',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  contactMethods: {
    gap: 12,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: '#6B7280',
  },
});

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlobalStyles from "../styles/GlobalStyle";
import ModernSidebar from './components/ModernSidebar';
import Header from './components/Header';

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
          answer: 'The home page shows your order list. You can view all orders, create new orders, manage customers, and submit expense requests.',
          category: 'getting-started',
          tags: ['dashboard', 'overview', 'home']
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
          answer: 'Click "Add Order" from the sidebar. Select or add a customer, choose services, set quantities, apply discounts if needed, and process payment. You can save orders as drafts to complete later.',
          category: 'orders',
          tags: ['create', 'new-order', 'customer', 'services']
        },
        {
          id: 'order-payment',
          question: 'How do I handle payments and change?',
          answer: 'Enter the amount paid by the customer. If the amount exceeds the total, the system will calculate the change and ask for confirmation. Always verify the change amount before completing the transaction.',
          category: 'orders',
          tags: ['payment', 'change', 'cash', 'transaction']
        },
        {
          id: 'order-status',
          question: 'How do I update order status?',
          answer: 'Go to Order List, click on any order to view details. You can update the payment status and order status (Pending → Processing → Ready → Completed).',
          category: 'orders',
          tags: ['status', 'update', 'workflow']
        },
        {
          id: 'print-receipt',
          question: 'How do I print a receipt?',
          answer: 'After creating an order, click "Print Summary" to generate and print a receipt. You can also print receipts from the order details view.',
          category: 'orders',
          tags: ['print', 'receipt', 'summary']
        },
        {
          id: 'order-search',
          question: 'How do I find a specific order?',
          answer: 'Use the search bar in Order List to search by order ID, customer name, or phone number. You can also filter by status and date range.',
          category: 'orders',
          tags: ['search', 'find', 'filter']
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
          answer: 'Go to Customer Management and click "Add Customer". Fill in the customer name, phone number, and email (optional). The system will automatically assign a customer ID.',
          category: 'customers',
          tags: ['add', 'new-customer', 'registration']
        },
        {
          id: 'view-customer',
          question: 'How do I view customer details?',
          answer: 'In Customer Management, click on any customer to view their full details including order history, total orders, and total spent.',
          category: 'customers',
          tags: ['view', 'details', 'history']
        },
        {
          id: 'edit-customer',
          question: 'Can I edit customer information?',
          answer: 'Yes, click on a customer to view details, then click "Edit Customer" to update their name, phone, or email. Note: You cannot delete or archive customers - only admins have that permission.',
          category: 'customers',
          tags: ['edit', 'update', 'information']
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
          answer: 'Go to Requests, click "Add Request". Select a category, enter the amount and description, and attach proof images. Submit the request and wait for admin approval.',
          category: 'expenses',
          tags: ['submit', 'request', 'proof', 'image']
        },
        {
          id: 'upload-receipt',
          question: 'How do I upload receipts after approval?',
          answer: 'Once your expense is approved, you can upload purchase receipts by clicking "Upload Receipt" on the approved expense card. Receipts are separate from initial proof images.',
          category: 'expenses',
          tags: ['receipt', 'upload', 'approved']
        },
        {
          id: 'appeal-expense',
          question: 'Can I appeal a rejected expense?',
          answer: 'Yes, if your expense is rejected, you can click "Appeal This Decision" to provide additional information and supporting images. The admin will review your appeal.',
          category: 'expenses',
          tags: ['appeal', 'rejected', 'review']
        },
        {
          id: 'expense-status',
          question: 'What do the expense statuses mean?',
          answer: 'Pending: Waiting for admin review. Approved: Request approved, you can upload receipts. Rejected: Request denied (you can appeal). Appealed: Your appeal is being reviewed.',
          category: 'expenses',
          tags: ['status', 'pending', 'approved', 'rejected']
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
          id: 'update-profile',
          question: 'How do I update my profile?',
          answer: 'Go to Settings → Profile tab. You can update your username and email. Your station ID cannot be changed and is managed by administrators.',
          category: 'account',
          tags: ['profile', 'update', 'settings']
        },
        {
          id: 'change-password',
          question: 'How do I change my password?',
          answer: 'Go to Settings → Security tab. Enter your current password, then your new password (at least 6 characters), and confirm it. Click "Update Password" to save.',
          category: 'account',
          tags: ['password', 'security', 'change']
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
              <Ionicons name="help-circle" size={32} color="#2563EB" />
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
                      color={selectedCategory === category.id ? '#2563EB' : '#6B7280'}
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
                          <Ionicons name={section.icon} size={24} color="#2563EB" />
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
                <Ionicons name="mail-outline" size={20} color="#2563EB" />
                <View>
                  <Text style={styles.contactLabel}>Email Support</Text>
                  <Text style={styles.contactValue}>labubbles@example.com</Text>
                </View>
              </View>
              <View style={styles.contactMethod}>
                <Ionicons name="call-outline" size={20} color="#2563EB" />
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
    color: '#2563EB',
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
    color: '#2563EB',
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
    color: '#2563EB',
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

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RouteLiteral =
  | '/home/orderList'
  | '/home/addOrder'
  | '/home/customer'
  | '/home/request'
  | '/home/settings'
  | '/home/help';

interface NavItem {
  icon: keyof typeof Ionicons.glyphMap;
  route: RouteLiteral;
  label: string;
}

interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isLogout: boolean;
  onPress: () => void;
}

const NavItemComponent: React.FC<NavItemComponentProps> = ({ item, isActive, isLogout, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <View
      style={styles.navItemWrapper}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <TouchableOpacity
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.navIconContainer, isActive && styles.navIconContainerActive]}>
          <Ionicons
            name={item.icon}
            size={22}
            color={isActive ? '#FFFFFF' : '#6B7280'}
          />
        </View>
      </TouchableOpacity>
      
      {/* Hover Tooltip */}
      {hovered && (
        <View style={[styles.tooltip, isLogout && styles.tooltipLogout]}>
          <Text style={[styles.tooltipText, isLogout && styles.tooltipTextLogout]}>
            {item.label}
          </Text>
        </View>
      )}
    </View>
  );
};

const ModernSidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems: NavItem[] = [
    { icon: 'list-outline', route: '/home/orderList', label: 'Orders' },
    { icon: 'add-circle-outline', route: '/home/addOrder', label: 'Add Order' },
    { icon: 'people-outline', route: '/home/customer', label: 'Customers' },
    { icon: 'document-text-outline', route: '/home/request', label: 'Requests' },
  ];

  const generalItems: NavItem[] = [
    { icon: 'settings-outline', route: '/home/settings', label: 'Settings' },
    { icon: 'help-circle-outline', route: '/home/help', label: 'Help' },
    { icon: 'log-out-outline', route: '/home/orderList', label: 'Logout' },
  ];

  const handleNavigation = (route: RouteLiteral, isLogout: boolean = false) => {
    if (isLogout) {
      setShowLogoutModal(true);
      return;
    }
    router.push(route);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'userToken', 'user']);
      setShowLogoutModal(false);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutModal(false);
      router.replace('/login');
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };


  return (
    <View style={styles.sidebar}>
      {/* Sidebar Header */}
      <View style={styles.sidebarHeader}>
        {/* Logo removed - using icon-only sidebar design */}
      </View>

      {/* Navigation Sections */}
      <ScrollView style={styles.navSections} showsVerticalScrollIndicator={false}>
        {/* Menu Section */}
        <View style={styles.navSection}>
          {menuItems.map((item) => {
            const isActive = pathname === item.route;
            return (
              <NavItemComponent
                key={item.route}
                item={item}
                isActive={isActive}
                isLogout={false}
                onPress={() => handleNavigation(item.route, false)}
              />
            );
          })}
        </View>

        {/* General Section */}
        <View style={styles.navSection}>
          {generalItems.slice(0, -1).map((item) => {
            const isActive = pathname === item.route;
            return (
              <NavItemComponent
                key={item.route}
                item={item}
                isActive={isActive}
                isLogout={false}
                onPress={() => handleNavigation(item.route, false)}
              />
            );
          })}
          <NavItemComponent
            key={generalItems[generalItems.length - 1].route}
            item={generalItems[generalItems.length - 1]}
            isActive={false}
            isLogout={true}
            onPress={() => handleNavigation(generalItems[generalItems.length - 1].route, true)}
          />
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelLogout}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelLogout}
        >
          <View style={styles.logoutModal} onStartShouldSetResponder={() => true}>
            <View style={styles.logoutModalHeader}>
              <Ionicons name="log-out-outline" size={24} color="#DC2626" />
              <Text style={styles.logoutModalTitle}>Logout</Text>
            </View>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={styles.logoutModalCancelButton}
                onPress={handleCancelLogout}
              >
                <Text style={styles.logoutModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutModalConfirmButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutModalConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 70,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingTop: 12,
    paddingBottom: 24,
    height: '100%',
  },
  sidebarHeader: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    marginBottom: 0,
    alignItems: 'center',
    minHeight: 0,
  },
  navSections: {
    flex: 1,
    paddingTop: 4,
  },
  navSection: {
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  navItemWrapper: {
    position: 'relative',
    marginVertical: 2,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginVertical: 2,
    borderRadius: 10,
    minHeight: 44,
    width: '100%',
  },
  navItemActive: {
    backgroundColor: 'transparent',
  },
  navIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconContainerActive: {
    backgroundColor: '#2563EB',
  },
  tooltip: {
    position: 'absolute',
    left: 78,
    top: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipLogout: {
    backgroundColor: '#DC2626',
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  tooltipTextLogout: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  logoutModalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  logoutModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  logoutModalConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  logoutModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ModernSidebar;


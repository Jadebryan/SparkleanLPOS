import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView, Animated, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import BrandIcon from '../../components/BrandIcon';
import { api } from '@/utils/api';
import { API_BASE_URL } from '@/constants/api';
import { colors, typography, spacing, borderRadius, tabletUtils } from '@/app/theme/designSystem';

interface HeaderProps {
  title?: string;
  showPageTitle?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, showPageTitle = true }) => {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; username?: string; role?: string; _id?: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userButtonLayout, setUserButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const userButtonRef = useRef<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [notificationButtonLayout, setNotificationButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const notificationButtonRef = useRef<any>(null);
  const [refreshingNotifications, setRefreshingNotifications] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  
  // Animation values
  const badgeScale = useRef(new Animated.Value(1)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;
  const notificationOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('user');
        if (jsonValue) setUser(JSON.parse(jsonValue));
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch notifications
  const fetchNotifications = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshingNotifications(true);
    }
    try {
      const response = await api.get('/notifications?limit=20');
      // Handle different response formats
      let newNotifications: any[] = [];
      let newUnreadCount = 0;
      
      if (response && typeof response === 'object') {
        if (response.success && response.data) {
          newNotifications = response.data.notifications || [];
          newUnreadCount = response.data.unreadCount || 0;
        } else if (response.notifications) {
          // Direct format
          newNotifications = response.notifications || [];
          newUnreadCount = response.unreadCount || 0;
        } else if (Array.isArray(response)) {
          // Array format
          newNotifications = response || [];
          newUnreadCount = response.filter((n: any) => !n.isRead || n.unread).length;
        }
      }
      
      // Animate badge if new unread notifications
      if (newUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
        Animated.sequence([
          Animated.timing(badgeScale, {
            toValue: 1.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(badgeScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
      
      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
      setPreviousUnreadCount(newUnreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (showRefresh) {
        setRefreshingNotifications(false);
      }
    }
  };

  // Pulse animation for badge when there are unread notifications
  useEffect(() => {
    if (unreadCount > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(badgePulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      badgePulse.setValue(1);
    }
  }, [unreadCount, badgePulse]);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(false), 30000);
    return () => clearInterval(interval);
  }, []);

  // Animate notification panel when opening
  useEffect(() => {
    if (notificationMenuOpen) {
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      notificationOpacity.setValue(0);
    }
  }, [notificationMenuOpen, notificationOpacity]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      // Call logout API to log the audit event
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      if (token) {
        try {
          await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (apiError) {
          // Log error but continue with logout even if API fails
          console.error('Logout API error (continuing with local logout):', apiError);
        }
      }
      
      // Clear local storage
      await AsyncStorage.multiRemove(['token', 'userToken', 'user']);
      setShowLogoutModal(false);
      setUserMenuOpen(false);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutModal(false);
      setUserMenuOpen(false);
      // Still navigate to login even if there's an error
      router.replace('/login');
    }
  };

  const handleLogoutClick = () => {
    setUserMenuOpen(false);
    setShowLogoutModal(true);
  };

  // Auto logout on inactivity with 60s warning
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);

  useEffect(() => {
    const IDLE_MS = 15 * 60 * 1000;
    const WARNING_MS = 60 * 1000;
    let lastActivity = Date.now();
    let pollInterval: any;
    let countdownInterval: any;
    let warned = false;

    const reset = () => {
      lastActivity = Date.now();
      if (warned) {
        warned = false;
        setShowIdleWarning(false);
        setIdleCountdown(60);
        if (countdownInterval) clearInterval(countdownInterval);
      }
    };

    // Web-specific events when running on web
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', reset);
      window.addEventListener('keydown', reset);
      window.addEventListener('click', reset);
      window.addEventListener('scroll', reset);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reset(); });
    }

    pollInterval = setInterval(async () => {
      const token = (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('userToken'));
      if (!token) return;
      const elapsed = Date.now() - lastActivity;

      if (!warned && elapsed >= IDLE_MS - WARNING_MS && elapsed < IDLE_MS) {
        warned = true;
        setShowIdleWarning(true);
        const remaining = Math.ceil((IDLE_MS - elapsed) / 1000);
        setIdleCountdown(remaining);
        countdownInterval = setInterval(() => {
          setIdleCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
            }
            return Math.max(prev - 1, 0);
          });
        }, 1000);
      }

      if (elapsed >= IDLE_MS) {
        clearInterval(pollInterval);
        if (countdownInterval) clearInterval(countdownInterval);
        await AsyncStorage.multiRemove(['token', 'userToken', 'user']);
        router.replace('/login');
      }
    }, 30000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (countdownInterval) clearInterval(countdownInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', reset);
        window.removeEventListener('keydown', reset);
        window.removeEventListener('click', reset);
        window.removeEventListener('scroll', reset);
      }
    };
  }, [router]);

  const handleStayLoggedIn = () => {
    setShowIdleWarning(false);
    setIdleCountdown(60);
  };

  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerSurface}>
        {/* Left: Logo & Title */}
        <View style={styles.headerLeft}>
          <BrandIcon size={28} />
          <View style={styles.logoText}>
            <Text style={styles.brandPart1}>Sparklean</Text>
            <Text style={styles.brandPart2}>Laundry Shop</Text>
            <Text style={styles.brandPart3}>Staff</Text>
          </View>
          {showPageTitle && title && (
            <View style={styles.pageTitleContainer}>
              <Text style={styles.pageTitle}>{title}</Text>
            </View>
          )}
        </View>

        {/* Right: Notifications & User Menu */}
        <View style={styles.headerRight}>
          {/* Notification Bell */}
          <TouchableOpacity
            ref={notificationButtonRef}
            style={styles.notificationButton}
            onPress={() => {
              if (notificationButtonRef.current) {
                notificationButtonRef.current.measure((fx: number, fy: number, fwidth: number, fheight: number, px: number, py: number) => {
                  setNotificationButtonLayout({ x: px, y: py, width: fwidth, height: fheight });
                  setNotificationMenuOpen(!notificationMenuOpen);
                });
              } else {
                setNotificationMenuOpen(!notificationMenuOpen);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
              size={22} 
              color={unreadCount > 0 ? "#2563EB" : "#374151"} 
            />
            {unreadCount > 0 && (
              <Animated.View 
                style={[
                  styles.notificationBadge,
                  {
                    transform: [
                      { scale: Animated.multiply(badgeScale, badgePulse) }
                    ]
                  }
                ]}
              >
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>

          {/* User Menu */}
          <TouchableOpacity
            ref={userButtonRef}
            style={styles.userInfo}
            onPress={() => {
              if (userButtonRef.current) {
                userButtonRef.current.measure((fx: number, fy: number, fwidth: number, fheight: number, px: number, py: number) => {
                  setUserButtonLayout({ x: px, y: py, width: fwidth, height: fheight });
                  setUserMenuOpen(!userMenuOpen);
                });
              } else {
                setUserMenuOpen(!userMenuOpen);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.welcomeText}>Welcome, {user?.name || 'Staff'}</Text>
            <View style={styles.userAvatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification Dropdown */}
      <Modal
        visible={notificationMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNotificationMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNotificationMenuOpen(false)}
        >
          <View 
            style={[
              styles.notificationMenuWrapper,
              {
                position: 'absolute',
                top: notificationButtonLayout.y > 0 ? notificationButtonLayout.y + notificationButtonLayout.height + 8 : 60,
                right: notificationButtonLayout.x > 0 && typeof window !== 'undefined' 
                  ? window.innerWidth - notificationButtonLayout.x - notificationButtonLayout.width 
                  : 16,
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Animated.View 
              style={[
                styles.notificationMenuPanel,
                {
                  opacity: notificationOpacity,
                  transform: [{
                    scale: notificationOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1]
                    })
                  }]
                }
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.notificationMenuHeader}>
                <View style={styles.notificationMenuTitleRow}>
                  <Text style={styles.notificationMenuTitle}>Notifications</Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadCountBadge}>
                      <Text style={styles.unreadCountText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead} style={styles.markAllReadButton}>
                    <Text style={styles.markAllReadText}>Mark all as read</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <ScrollView 
                style={styles.notificationList} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshingNotifications}
                    onRefresh={() => fetchNotifications(true)}
                    tintColor="#2563EB"
                    colors={["#2563EB"]}
                  />
                }
              >
                {notifications.length === 0 ? (
                  <View style={styles.emptyNotifications}>
                    <Ionicons name="notifications-off-outline" size={56} color="#D1D5DB" />
                    <Text style={styles.emptyNotificationsText}>No notifications</Text>
                    <Text style={styles.emptyNotificationsSubtext}>You're all caught up!</Text>
                  </View>
                ) : (
                  notifications.map((notification, index) => {
                    const getNotificationIcon = () => {
                      switch (notification.type) {
                        case 'order':
                          return 'receipt-outline';
                        case 'payment':
                          return 'card-outline';
                        case 'expense':
                          return 'cash-outline';
                        case 'reminder':
                          return 'time-outline';
                        default:
                          return 'information-circle-outline';
                      }
                    };

                    const getNotificationColor = () => {
                      switch (notification.type) {
                        case 'order':
                          return '#2563EB';
                        case 'payment':
                          return '#10B981';
                        case 'expense':
                          return '#F59E0B';
                        case 'reminder':
                          return '#8B5CF6';
                        default:
                          return '#6B7280';
                      }
                    };

                    return (
                      <TouchableOpacity
                        key={notification.id}
                        style={[
                          styles.notificationItem,
                          !notification.unread && styles.notificationItemRead,
                          index === 0 && styles.notificationItemFirst
                        ]}
                        onPress={() => {
                          if (notification.unread) {
                            markAsRead(notification.id);
                          }
                          setNotificationMenuOpen(false);
                          if (notification.relatedId && notification.type === 'order') {
                            router.push(`/home/orderList`);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.notificationIconContainer, { backgroundColor: `${getNotificationColor()}15` }]}>
                          <Ionicons 
                            name={getNotificationIcon()} 
                            size={20} 
                            color={getNotificationColor()} 
                          />
                        </View>
                        <View style={styles.notificationContent}>
                          <View style={styles.notificationHeader}>
                            <Text style={styles.notificationTitle}>{notification.title}</Text>
                            {notification.unread && <View style={[styles.unreadDot, { backgroundColor: getNotificationColor() }]} />}
                          </View>
                          <Text style={styles.notificationMessage}>{notification.message}</Text>
                          <Text style={styles.notificationTime}>{notification.time}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* User Menu Dropdown */}
      <Modal
        visible={userMenuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUserMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUserMenuOpen(false)}
        >
          <View 
            style={[
              styles.userMenuWrapper,
              {
                position: 'absolute',
                top: userButtonLayout.y > 0 ? userButtonLayout.y + userButtonLayout.height + 8 : 60,
                right: userButtonLayout.x > 0 && typeof window !== 'undefined' 
                  ? window.innerWidth - userButtonLayout.x - userButtonLayout.width 
                  : 16,
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.userMenuPanel} onStartShouldSetResponder={() => true}>
            <View style={styles.userMenuHeader}>
              <View style={styles.userMenuAvatar}>
                <Text style={styles.userMenuAvatarText}>{initial}</Text>
              </View>
              <View style={styles.userMenuInfo}>
                <Text style={styles.userMenuName}>{user?.name || 'Staff User'}</Text>
                <Text style={styles.userMenuRole}>Staff Member</Text>
              </View>
            </View>

            <View style={styles.userMenuDivider} />

            <View style={styles.userMenuItems}>
              <TouchableOpacity
                style={styles.userMenuItem}
                onPress={() => {
                  setUserMenuOpen(false);
                  router.push('/home/settings');
                }}
              >
                <Ionicons name="settings-outline" size={18} color="#374151" />
                <Text style={styles.userMenuItemText}>Settings</Text>
              </TouchableOpacity>

              <View style={styles.userMenuDivider} />

              <TouchableOpacity
                style={[styles.userMenuItem, styles.logoutItem]}
                onPress={() => {
                  setUserMenuOpen(false);
                  handleLogoutClick();
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                <Text style={[styles.userMenuItemText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <TouchableOpacity
          style={styles.logoutModalOverlay}
          activeOpacity={1}
          onPress={() => setShowLogoutModal(false)}
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
                onPress={() => setShowLogoutModal(false)}
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

      <Modal visible={showIdleWarning} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 320, backgroundColor: 'white', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>You will be logged out soon</Text>
            <Text style={{ color: '#374151' }}>No activity detected. You will be logged out in <Text style={{ fontWeight: '700' }}>{idleCountdown}</Text> seconds.</Text>
            <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable onPress={handleStayLoggedIn} style={{ backgroundColor: '#2563EB', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Stay Logged In</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = {
  headerContainer: {
    height: 70,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    flex: 1,
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  logoText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandPart1: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    fontFamily: 'Poppins_700Bold',
  },
  brandPart2: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F97316',
    fontFamily: 'Poppins_600SemiBold',
  },
  brandPart3: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'Poppins_500Medium',
  },
  pageTitleContainer: {
    marginLeft: 16,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    fontFamily: 'Poppins_600SemiBold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Poppins_500Medium',
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Poppins_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  userMenuWrapper: {
    alignItems: 'flex-end',
  },
  userMenuPanel: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 8,
    overflow: 'hidden',
  },
  userMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userMenuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMenuAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  userMenuInfo: {
    flex: 1,
  },
  userMenuName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  userMenuRole: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
  },
  userMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  userMenuItems: {
    paddingVertical: 4,
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userMenuItemText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Poppins_400Regular',
  },
  logoutItem: {},
  logoutText: {
    color: '#DC2626',
  },
  logoutModalOverlay: {
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
    fontFamily: 'Poppins_700Bold',
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_600SemiBold',
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
    fontFamily: 'Poppins_600SemiBold',
  },
  notificationMenuWrapper: {
    alignItems: 'flex-end',
  },
  notificationMenuPanel: {
    width: 380,
    maxHeight: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationMenuHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  notificationMenuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notificationMenuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  unreadCountBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  markAllReadButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
  },
  markAllReadText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  notificationList: {
    maxHeight: 420,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  notificationItemFirst: {
    borderTopWidth: 0,
  },
  notificationItemRead: {
    backgroundColor: '#FAFBFC',
    opacity: 0.85,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
    lineHeight: 20,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
    marginTop: 4,
    flexShrink: 0,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Poppins_400Regular',
  },
  emptyNotifications: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptyNotificationsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 6,
    fontFamily: 'Poppins_400Regular',
  },
};

export default Header;


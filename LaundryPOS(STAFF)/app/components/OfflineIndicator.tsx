// Offline indicator component for Staff app
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '@/hooks/useOffline';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIDE_STORAGE_KEY = 'offline_indicator_hidden';

const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, queueCount, syncQueue, clearQueue } = useOffline();
  const [isHidden, setIsHidden] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [wasOffline, setWasOffline] = useState(!isOnline);
  const [showRestoredNotification, setShowRestoredNotification] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const notificationOpacity = useRef(new Animated.Value(0)).current;

  // Spin animation for sync icon
  useEffect(() => {
    if (isSyncing) {
      const spin = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinValue.setValue(0);
    }
  }, [isSyncing, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Detect when connection is restored and show notification
  useEffect(() => {
    if (wasOffline && isOnline) {
      // Connection just restored
      setShowRestoredNotification(true);
      Animated.sequence([
        Animated.timing(notificationOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(notificationOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowRestoredNotification(false);
      });
      setWasOffline(false);
    } else if (!isOnline) {
      setWasOffline(true);
    }
  }, [isOnline, wasOffline, notificationOpacity]);

  // Load hide state from storage
  useEffect(() => {
    const loadHideState = async () => {
      try {
        const hidden = await AsyncStorage.getItem(HIDE_STORAGE_KEY);
        setIsHidden(hidden === 'true');
      } catch (error) {
        console.error('Failed to load hide state:', error);
      }
    };
    loadHideState();
  }, []);

  // Reset hidden state when going online (so it shows when going offline again)
  useEffect(() => {
    if (isOnline && queueCount === 0) {
      setIsHidden(false);
      AsyncStorage.removeItem(HIDE_STORAGE_KEY).catch(() => {});
    }
  }, [isOnline, queueCount]);

  const handleHide = async () => {
    setIsHidden(true);
    try {
      await AsyncStorage.setItem(HIDE_STORAGE_KEY, 'true');
    } catch (error) {
      console.error('Failed to save hide state:', error);
    }
  };

  const handleShow = async () => {
    setIsHidden(false);
    try {
      await AsyncStorage.removeItem(HIDE_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to remove hide state:', error);
    }
  };

  const handleClearQueue = () => {
    Alert.alert(
      'Clear Queue',
      'Are you sure you want to clear all pending actions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearQueue();
          },
        },
      ]
    );
  };

  if (isOnline && queueCount === 0) {
    return null; // Don't show anything when online and no queue
  }

  // If hidden, show a small unobtrusive indicator in the corner
  if (isHidden) {
    return (
      <TouchableOpacity
        style={styles.miniIndicator}
        onPress={handleShow}
        activeOpacity={0.7}
      >
        <Ionicons name={isOnline ? "cloud-done" : "cloud-offline"} size={16} color="#FFFFFF" />
        {queueCount > 0 && (
          <View style={styles.miniCount}>
            <Text style={styles.miniCountText}>{queueCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <>
      {/* Connection restored notification */}
      {showRestoredNotification && (
        <Animated.View
          style={[
            styles.restoredNotification,
            {
              opacity: notificationOpacity,
              transform: [
                {
                  translateY: notificationOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.restoredNotificationText}>
            {queueCount > 0
              ? `Connection restored! Syncing ${queueCount} pending action${queueCount !== 1 ? 's' : ''}...`
              : 'Connection restored!'}
          </Text>
        </Animated.View>
      )}
      <View style={styles.container}>
      {!isOnline ? (
        <View style={[styles.banner, styles.offlineBanner]}>
          <Ionicons name="cloud-offline" size={18} color="#FFFFFF" />
          {!isCollapsed && (
            <>
              <Text style={styles.text}>You're offline. Changes will be synced when connection is restored.</Text>
              {queueCount > 0 && (
                <Text style={styles.queueText}>({queueCount} pending)</Text>
              )}
            </>
          )}
          {isCollapsed && queueCount > 0 && (
            <Text style={styles.queueText}>{queueCount} pending</Text>
          )}
          <TouchableOpacity
            onPress={() => setIsCollapsed(!isCollapsed)}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isCollapsed ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleHide}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : queueCount > 0 ? (
        <View style={[styles.banner, styles.syncBanner]}>
          {isSyncing ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="sync" size={18} color="#FFFFFF" />
            </Animated.View>
          ) : (
            <Ionicons name="cloud-done" size={18} color="#FFFFFF" />
          )}
          {!isCollapsed && (
            <>
              <Text style={styles.text}>
                {isSyncing ? `Syncing ${queueCount} pending action${queueCount !== 1 ? 's' : ''}...` : `${queueCount} pending sync`}
              </Text>
              {!isSyncing && (
                <TouchableOpacity onPress={syncQueue} style={styles.syncButton}>
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {isCollapsed && (
            <Text style={styles.text}>{queueCount} syncing...</Text>
          )}
          <TouchableOpacity
            onPress={() => setIsCollapsed(!isCollapsed)}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isCollapsed ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleHide}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : null}
      {!isCollapsed && queueCount > 0 && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={syncQueue}
            style={styles.actionButton}
            disabled={isSyncing}
          >
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearQueue}
            style={[styles.actionButton, styles.dangerButton]}
          >
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 9999,
    maxWidth: 350,
    minWidth: 200,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  offlineBanner: {
    backgroundColor: '#EF4444',
  },
  syncBanner: {
    backgroundColor: '#3B82F6',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },
  queueText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.9,
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  iconButton: {
    padding: 4,
    marginLeft: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  miniIndicator: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 6,
    zIndex: 9999,
  },
  miniCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  miniCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  restoredNotification: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 10,
    zIndex: 10000,
  },
  restoredNotificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export default OfflineIndicator;

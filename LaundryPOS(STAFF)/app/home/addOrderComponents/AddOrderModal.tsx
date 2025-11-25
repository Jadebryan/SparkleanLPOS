import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import AddOrderForm from './addOrderForm';
import { useColors } from '@/app/theme/useColors';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
  draftOrderId?: string | null;
  tabId?: string; // When provided, modal is used in tab system
}

const AddOrderModal: React.FC<AddOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  draftOrderId = null,
  tabId,
}) => {
  const dynamicColors = useColors();
  
  if (!isOpen) return null;

  const isTabMode = !!tabId;

  const modalContent = (
    <View style={[styles.modalContainer, isTabMode && styles.tabModalContainer]}>
      {!isTabMode && (
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <Ionicons name="create-outline" size={28} color={dynamicColors.primary[500]} style={{ marginRight: 12 }} />
            <View>
              <Text style={[styles.modalTitle, { color: dynamicColors.primary[500] }]}>Create New Order</Text>
              <Text style={styles.modalSubtitle}>Process new customer request</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.modalContent}>
        <AddOrderForm 
          isModal={true}
          onOrderCreated={() => {
            if (onOrderCreated) {
              onOrderCreated();
            }
          }}
          onClose={onClose}
          draftOrderId={draftOrderId}
        />
      </View>
    </View>
  );

  if (isTabMode) {
    // In tab mode, render without Modal wrapper and overlay
    return (
      <View style={styles.tabModalWrapper}>
        {modalContent}
      </View>
    );
  }

  // Standard modal mode
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {modalContent}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabModalWrapper: {
    position: 'absolute',
    top: 70, // Space for tab bar
    left: '2.5%',
    right: '2.5%',
    bottom: '2.5%',
    zIndex: 10000,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 1400,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        maxHeight: '95vh',
      },
    }),
  },
  tabModalContainer: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
});

export default AddOrderModal;


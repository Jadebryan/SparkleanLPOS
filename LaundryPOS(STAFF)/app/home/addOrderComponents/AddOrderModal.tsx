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

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
  draftOrderId?: string | null;
}

const AddOrderModal: React.FC<AddOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  draftOrderId = null
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Ionicons name="create-outline" size={28} color="#111827" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.modalTitle}>Create New Order</Text>
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
  modalContainer: {
    width: '95%',
    maxWidth: 1400,
    height: '95%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        maxHeight: '95vh',
      },
    }),
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


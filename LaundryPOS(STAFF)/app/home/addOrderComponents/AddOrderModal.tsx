import React, { useEffect, useRef } from "react";
import AddOrderForm from './addOrderForm';
import DraggableModal from '@/components/ui/DraggableModal';
import { useModalTabs } from '@/app/context/ModalTabContext';

interface AddOrderModalProps {
  tabId: string;
  onOrderCreated?: () => void;
}

const AddOrderModal: React.FC<AddOrderModalProps> = ({
  tabId,
  onOrderCreated,
}) => {
  const { 
    isTabActive, 
    isTabMinimized, 
    minimizeTab, 
    closeTab, 
    getTabData,
    updateTabData 
  } = useModalTabs();
  
  const isActive = isTabActive(tabId);
  const isMinimized = isTabMinimized(tabId);
  const formDataRef = useRef<any>(null);

  // Get initial data for this tab
  const tabData = getTabData(tabId);
  const draftOrderId = tabData?.draftId || null;
  const formData = tabData?.formData || null;

  const handleMinimize = () => {
    // Save current form state before minimizing
    if (formDataRef.current) {
      updateTabData(tabId, formDataRef.current);
    }
    minimizeTab(tabId, formDataRef.current || {});
  };

  const handleClose = () => {
    closeTab(tabId);
  };

  const handleFormDataChange = (data: any) => {
    formDataRef.current = data;
    // Auto-save form data to tab state
    updateTabData(tabId, data);
  };

  // Keep form mounted even when minimized to preserve state
  const shouldRenderModal = isActive || isMinimized;
  
  if (!shouldRenderModal) return null;

  return (
    <DraggableModal
      visible={isActive && !isMinimized}
      onClose={handleClose}
      onMinimize={handleMinimize}
      title="Create New Order"
      subtitle="Process new customer request"
      icon="create-outline"
      minimized={isMinimized}
    >
      <AddOrderForm 
        key={tabId} // Force remount when tabId changes to ensure clean state
        isModal={true}
        tabId={tabId}
        onOrderCreated={() => {
          if (onOrderCreated) {
            onOrderCreated();
          }
          handleClose(); // Close tab after order created
        }}
        onClose={handleClose}
        draftOrderId={draftOrderId}
        onDataChange={handleFormDataChange}
        initialData={formData}
      />
    </DraggableModal>
  );
};

export default AddOrderModal;


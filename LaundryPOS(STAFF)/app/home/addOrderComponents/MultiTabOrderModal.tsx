import React from 'react';
import { 
  View, 
  StyleSheet, 
} from 'react-native';
import DraggableModalTab from './DraggableModalTab';
import AddOrderModal from './AddOrderModal';

export interface OrderModalTab {
  id: string;
  title: string;
  draftOrderId?: string | null;
  position: { x: number; y: number };
  isMinimized: boolean;
  zIndex: number;
}

interface MultiTabOrderModalProps {
  tabs: OrderModalTab[];
  onTabClose: (id: string) => void;
  onTabMinimize: (id: string) => void;
  onTabMaximize: (id: string) => void;
  onTabDrag: (id: string, x: number, y: number) => void;
  onTabActivate: (id: string) => void;
  activeTabId: string | null;
  onOrderCreated?: (tabId: string) => void;
}

const MultiTabOrderModal: React.FC<MultiTabOrderModalProps> = ({
  tabs,
  onTabClose,
  onTabMinimize,
  onTabMaximize,
  onTabDrag,
  onTabActivate,
  activeTabId,
  onOrderCreated,
}) => {
  if (tabs.length === 0) return null;

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <>
      {/* Tab Bar - Always visible when tabs exist */}
      <View style={styles.tabsContainer} pointerEvents="box-none">
        {tabs.map((tab, index) => (
          <DraggableModalTab
            key={tab.id}
            id={tab.id}
            title={tab.title}
            isActive={tab.id === activeTabId}
            isMinimized={tab.isMinimized}
            onPress={() => onTabActivate(tab.id)}
            onClose={() => onTabClose(tab.id)}
            onMinimize={() => onTabMinimize(tab.id)}
            onMaximize={() => onTabMaximize(tab.id)}
            onDrag={onTabDrag}
            position={tab.position}
            zIndex={tab.zIndex}
          />
        ))}
      </View>

      {/* Active Modal - Only show if active tab is not minimized */}
      {activeTab && !activeTab.isMinimized && (
        <AddOrderModal
          isOpen={true}
          onClose={() => onTabClose(activeTab.id)}
          onOrderCreated={() => {
            if (onOrderCreated) {
              onOrderCreated(activeTab.id);
            }
          }}
          draftOrderId={activeTab.draftOrderId}
          tabId={activeTab.id}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});

export default MultiTabOrderModal;


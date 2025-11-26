import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import ChatHead from './ChatHead';
import { MinimizedModal } from './ModalTabBar';
import { useModalTabs } from '@/app/context/ModalTabContext';

interface ChatHeadBarProps {
  minimizedModals: MinimizedModal[];
}

const ChatHeadBar: React.FC<ChatHeadBarProps> = ({ minimizedModals }) => {
  const { restoreTab, closeTab, isTabActive } = useModalTabs();

  // Calculate positions for chat heads (stack them vertically on the right)
  const getChatHeadPosition = (index: number) => {
    const baseY = 100;
    const spacing = 70;
    return {
      x: undefined, // Will use default from ChatHead
      y: baseY + (index * spacing),
    };
  };

  // Only show chat heads for tabs that are minimized (not active)
  const minimizedOnly = minimizedModals.filter(modal => !isTabActive(modal.id));

  if (minimizedOnly.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {minimizedOnly.map((modal, index) => {
        const position = getChatHeadPosition(index);
        const tabNumber = index + 1;

        return (
          <ChatHead
            key={modal.id}
            id={modal.id}
            title={modal.title}
            icon={modal.icon}
            number={tabNumber}
            isActive={false}
            initialPosition={position}
            onPress={() => {
              restoreTab(modal.id);
              modal.onRestore();
            }}
            onClose={() => {
              closeTab(modal.id);
              modal.onClose();
            }}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    pointerEvents: 'box-none',
  },
});

export default ChatHeadBar;


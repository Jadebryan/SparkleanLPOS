import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '@/app/theme/designSystem';
import { useFadeIn } from './animations';
import { Animated } from 'react-native';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: string;
  keywords: string[];
  onPress: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  commands: Command[];
  isVisible: boolean;
  onClose: () => void;
  triggerKey?: string; // Keyboard shortcut to open (e.g., 'k')
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  commands,
  isVisible,
  onClose,
  triggerKey = 'k',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useFadeIn(200);

  // Keyboard shortcut handler
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && filteredCommands.length > 0) {
        filteredCommands[selectedIndex]?.onPress();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      }
    };

    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isVisible, selectedIndex, onClose]);

  // Global keyboard shortcut to open palette
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === triggerKey) {
        e.preventDefault();
        if (!isVisible) {
          // Open palette - this should be handled by parent
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, [triggerKey, isVisible]);

  // Focus input when modal opens
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isVisible]);

  const filteredCommands = commands.filter((cmd) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(query) ||
      cmd.description?.toLowerCase().includes(query) ||
      cmd.keywords.some((kw) => kw.toLowerCase().includes(query)) ||
      cmd.category.toLowerCase().includes(query)
    );
  });

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const renderCommand = ({ item, index }: { item: Command; index: number }) => (
    <TouchableOpacity
      style={[
        styles.commandItem,
        index === selectedIndex && styles.commandItemSelected,
      ]}
      onPress={() => {
        item.onPress();
        onClose();
      }}
      onMouseEnter={() => setSelectedIndex(index)}
    >
      <View style={[styles.commandIcon, { backgroundColor: `${colors.primary[500]}15` }]}>
        <Ionicons name={item.icon} size={20} color={colors.primary[500]} />
      </View>
      <View style={styles.commandContent}>
        <Text style={styles.commandLabel}>{item.label}</Text>
        {item.description && (
          <Text style={styles.commandDescription}>{item.description}</Text>
        )}
      </View>
      {item.shortcut && (
        <View style={styles.shortcutBadge}>
          <Text style={styles.shortcutText}>{item.shortcut}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[styles.overlay, { opacity: fadeAnim }]}
        onStartShouldSetResponder={() => true}
        onResponderRelease={onClose}
      >
        <Animated.View
          style={[styles.container, { opacity: fadeAnim }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Ionicons name="search-outline" size={20} color={colors.text.secondary} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type a command or search..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {filteredCommands.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.gray[300]} />
              <Text style={styles.emptyText}>No commands found</Text>
              <Text style={styles.emptySubtext}>
                Try a different search term
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredCommands}
              renderItem={renderCommand}
              keyExtractor={(item) => item.id}
              style={styles.commandList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={styles.footer}>
            <View style={styles.footerHint}>
              <Ionicons name="arrow-up" size={14} color={colors.text.tertiary} />
              <Ionicons name="arrow-down" size={14} color={colors.text.tertiary} />
              <Text style={styles.footerText}>Navigate</Text>
            </View>
            <View style={styles.footerHint}>
              <Text style={styles.footerText}>↵</Text>
              <Text style={styles.footerText}>Select</Text>
            </View>
            <View style={styles.footerHint}>
              <Text style={styles.footerText}>Esc</Text>
              <Text style={styles.footerText}>Close</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    ...shadows.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    padding: 0,
  },
  commandList: {
    maxHeight: 400,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  commandItemSelected: {
    backgroundColor: colors.primary[50],
  },
  commandIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commandContent: {
    flex: 1,
  },
  commandLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  commandDescription: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  shortcutBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.sm,
  },
  shortcutText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  emptyState: {
    padding: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.h4,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 11,
  },
});


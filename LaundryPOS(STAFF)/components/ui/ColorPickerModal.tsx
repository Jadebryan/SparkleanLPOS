import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

interface ColorPickerModalProps {
  visible: boolean;
  title: string;
  color: string;
  savedColors?: string[];
  onClose: () => void;
  onSelect: (color: string) => void;
}

const PRESET_COLORS = [
  '#2563EB', '#F97316', '#059669', '#7C3AED', '#DC2626', '#14B8A6',
  '#F59E0B', '#0EA5E9', '#F43F5E', '#10B981', '#EC4899', '#1E3A8A',
  '#FB923C', '#0F766E', '#9333EA', '#EF4444', '#06B6D4', '#A855F7',
];

const normalizeHexInput = (value: string) => {
  const cleaned = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
  return `#${cleaned.toUpperCase()}`;
};

const isValidHex = (value: string) => /^#[0-9A-F]{6}$/.test(value);

const hexToRgb = (hex: string) => {
  const normalized = normalizeHexInput(hex);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return { r, g, b };
};

const rgbToHex = (r: number, g: number, b: number) => {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`.toUpperCase();
};

const adjustLightness = (hex: string, percentage: number) => {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + percentage / 100;
  const nr = Math.min(255, Math.max(0, Math.round(r * factor)));
  const ng = Math.min(255, Math.max(0, Math.round(g * factor)));
  const nb = Math.min(255, Math.max(0, Math.round(b * factor)));
  return rgbToHex(nr, ng, nb);
};

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  visible,
  title,
  color,
  savedColors = [],
  onClose,
  onSelect,
}) => {
  const [baseColor, setBaseColor] = useState(color);
  const [lightness, setLightness] = useState(0);

  useEffect(() => {
    if (visible) {
      setBaseColor(color);
      setLightness(0);
    }
  }, [color, visible]);

  const displayColor = useMemo(() => {
    if (!isValidHex(baseColor)) return '#2563EB';
    return adjustLightness(baseColor, lightness);
  }, [baseColor, lightness]);

  const handleSave = () => {
    onSelect(displayColor);
  };

  const handlePresetSelect = (preset: string) => {
    setBaseColor(preset);
    setLightness(0);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Use presets, adjust brightness, or type a HEX code.</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close color picker">
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewRow}>
            <View style={[styles.previewSwatch, { backgroundColor: displayColor }]} />
            <View style={styles.hexInputContainer}>
              <Text style={styles.hexLabel}>HEX</Text>
              <TextInput
                style={styles.hexInput}
                value={baseColor}
                onChangeText={(value) => setBaseColor(normalizeHexInput(value))}
                maxLength={7}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.sliderSection}>
            <Text style={styles.sliderLabel}>Brightness</Text>
            <Slider
              minimumValue={-40}
              maximumValue={40}
              value={lightness}
              minimumTrackTintColor="#2563EB"
              maximumTrackTintColor="#D1D5DB"
              thumbTintColor="#2563EB"
              onValueChange={setLightness}
            />
            <View style={styles.sliderScale}>
              <Text style={styles.sliderScaleText}>Darker</Text>
              <Text style={styles.sliderScaleText}>Lighter</Text>
            </View>
          </View>

  <Text style={styles.sectionHeading}>Quick colors</Text>
          <View style={styles.presetGrid}>
            {PRESET_COLORS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetSwatch,
                  { backgroundColor: preset },
                  preset.toUpperCase() === baseColor.toUpperCase() && styles.presetSwatchActive,
                ]}
                onPress={() => handlePresetSelect(preset)}
              />
            ))}
          </View>

          {savedColors.length > 0 && (
            <View style={styles.savedColorsSection}>
              <Text style={styles.savedLabel}>Saved colors</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedColorsRow}>
                {savedColors.map((saved) => (
                  <TouchableOpacity
                    key={saved}
                    style={[styles.savedColorSwatch, { backgroundColor: saved }]}
                    onPress={() => handlePresetSelect(saved)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton, !isValidHex(baseColor) && styles.disabledButton]}
              onPress={handleSave}
              disabled={!isValidHex(baseColor)}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>Use color</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  previewSwatch: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hexInputContainer: {
    flex: 1,
  },
  hexLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  hexInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#111827',
  },
  sliderSection: {
    gap: 6,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  sliderScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderScaleText: {
    fontSize: 11,
    color: '#6B7280',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetSwatch: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetSwatchActive: {
    borderColor: '#2563EB',
  },
  savedColorsSection: {
    gap: 8,
  },
  savedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  savedColorsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  savedColorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
});

export default ColorPickerModal;


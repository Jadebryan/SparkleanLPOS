import React from 'react'
import Svg, { Defs, LinearGradient, Stop, Rect, G, Circle, Path } from 'react-native-svg'
import { useColors } from '@/app/theme/useColors'

type Props = { size?: number }

export default function BrandIcon({ size = 22 }: Props) {
  const dynamicColors = useColors()
  const s = size
  return (
    <Svg width={s} height={s} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#60A5FA" />
          <Stop offset="100%" stopColor={dynamicColors.primary[500]} />
        </LinearGradient>
        <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#E0F2FE" />
          <Stop offset="100%" stopColor="#BFDBFE" />
        </LinearGradient>
      </Defs>

      <Rect x={4} y={6} width={56} height={48} rx={14} fill="url(#bg)" />

      <G transform="translate(14,14)">
        <Rect x={0} y={0} width={36} height={30} rx={6} fill="#F8FAFC" />
        <Rect x={0.75} y={0.75} width={34.5} height={28.5} rx={5.25} stroke="#94A3B8" strokeWidth={1.5} fill="none" />
        <Circle cx={6} cy={6} r={2} fill="#F59E0B" />
        <Circle cx={12} cy={6} r={2} fill="#F59E0B" opacity={0.6} />
        <Circle cx={20} cy={18} r={9.5} fill="url(#glass)" stroke="#60A5FA" strokeWidth={2} />
        <Circle cx={20} cy={18} r={6.5} fill="#E8F1FF" opacity={0.6} />
        <Circle cx={18} cy={17} r={1.2} fill="#0F172A" />
        <Circle cx={22} cy={17} r={1.2} fill="#0F172A" />
        <Path d="M17 20c1.2 1 3.8 1 5 0" stroke="#0F172A" strokeWidth={1.5} strokeLinecap="round" />
      </G>

      <G fill="#E0F2FE">
        <Circle cx={15} cy={14} r={3} />
        <Circle cx={22} cy={10} r={2} />
        <Circle cx={50} cy={12} r={2.4} />
        <Circle cx={48} cy={50} r={2.8} />
      </G>
    </Svg>
  )
}



import React from 'react'

interface BrandIconProps {
  size?: number
}

const BrandIcon: React.FC<BrandIconProps> = ({ size = 22 }) => {
  const s = size
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Rounded badge background (sky blue gradient like signage) */}
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#BFDBFE" />
        </linearGradient>
      </defs>

      <rect x="4" y="6" width="56" height="48" rx="14" fill="url(#bg)" />

      {/* Washing machine body */}
      <g transform="translate(14,14)">
        <rect x="0" y="0" width="36" height="30" rx="6" fill="#F8FAFC" />
        <rect x="0.75" y="0.75" width="34.5" height="28.5" rx="5.25" stroke="#94A3B8" strokeWidth="1.5" />

        {/* Control knobs */}
        <circle cx="6" cy="6" r="2" fill="#F59E0B" />
        <circle cx="12" cy="6" r="2" fill="#F59E0B" opacity="0.6" />

        {/* Door */}
        <circle cx="20" cy="18" r="9.5" fill="url(#glass)" stroke="#60A5FA" strokeWidth="2" />
        <circle cx="20" cy="18" r="6.5" fill="#E8F1FF" opacity="0.6" />

        {/* Friendly face */}
        <circle cx="18" cy="17" r="1.2" fill="#0F172A" />
        <circle cx="22" cy="17" r="1.2" fill="#0F172A" />
        <path d="M17 20c1.2 1 3.8 1 5 0" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Bubbles around badge */}
      <g fill="#E0F2FE">
        <circle cx="15" cy="14" r="3" />
        <circle cx="22" cy="10" r="2" />
        <circle cx="50" cy="12" r="2.4" />
        <circle cx="48" cy="50" r="2.8" />
      </g>
    </svg>
  )
}

export default BrandIcon



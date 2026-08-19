import React from 'react'

export const ANIMAL_AVATARS = [
  {
    id: 'owl',
    name: 'Lingora Owl',
    emoji: '🦉',
    bg: 'bg-[#13752f]',
    gradient: 'from-[#17852f] to-[#0a4e18]',
    border: 'border-[#4ade80]',
    ring: 'ring-[#13752f]/20',
    desc: 'Wise & Focused',
  },
  {
    id: 'fox',
    name: 'Witty Fox',
    emoji: '🦊',
    bg: 'bg-[#1b4325]',
    gradient: 'from-[#245832] to-[#102b18]',
    border: 'border-[#82be90]',
    ring: 'ring-[#1b4325]/20',
    desc: 'Quick & Sharp',
  },
  {
    id: 'panda',
    name: 'Zen Panda',
    emoji: '🐼',
    bg: 'bg-[#0f5223]',
    gradient: 'from-[#146b2e] to-[#0a3818]',
    border: 'border-[#6ee7b7]',
    ring: 'ring-[#0f5223]/20',
    desc: 'Calm & Steady',
  },
  {
    id: 'koala',
    name: 'Chill Koala',
    emoji: '🐨',
    bg: 'bg-[#2b593f]',
    gradient: 'from-[#3a7554] to-[#1f422e]',
    border: 'border-[#a3e635]',
    ring: 'ring-[#2b593f]/20',
    desc: 'Relaxed Learner',
  },
  {
    id: 'lion',
    name: 'Brave Lion',
    emoji: '🦁',
    bg: 'bg-[#137c31]',
    gradient: 'from-[#1eb047] to-[#0f6126]',
    border: 'border-[#86efac]',
    ring: 'ring-[#137c31]/20',
    desc: 'Bold & Ambitious',
  },
  {
    id: 'bunny',
    name: 'Swift Bunny',
    emoji: '🐰',
    bg: 'bg-[#356b46]',
    gradient: 'from-[#448759] to-[#254d32]',
    border: 'border-[#bbf7d0]',
    ring: 'ring-[#356b46]/20',
    desc: 'Fast & Curious',
  },
  {
    id: 'cat',
    name: 'Clever Cat',
    emoji: '🐱',
    bg: 'bg-[#1f3f27]',
    gradient: 'from-[#2d5c39] to-[#122617]',
    border: 'border-[#82be90]',
    ring: 'ring-[#1f3f27]/20',
    desc: 'Agile & Intuitive',
  },
  {
    id: 'bear',
    name: 'Mighty Bear',
    emoji: '🐻',
    bg: 'bg-[#0b3b18]',
    gradient: 'from-[#125424] to-[#06240d]',
    border: 'border-[#4ade80]',
    ring: 'ring-[#0b3b18]/20',
    desc: 'Strong & Persistent',
  },
  {
    id: 'penguin',
    name: 'Smart Penguin',
    emoji: '🐧',
    bg: 'bg-[#188038]',
    gradient: 'from-[#22a44b] to-[#105926]',
    border: 'border-[#a7f3d0]',
    ring: 'ring-[#188038]/20',
    desc: 'Polished & Sharp',
  },
  {
    id: 'tiger',
    name: 'Striver Tiger',
    emoji: '🐯',
    bg: 'bg-[#214e2c]',
    gradient: 'from-[#2c693b] to-[#16361e]',
    border: 'border-[#82be90]',
    ring: 'ring-[#214e2c]/20',
    desc: 'Energetic & Driven',
  },
]

export function getAvatarInfo(avatarId) {
  const found = ANIMAL_AVATARS.find((a) => a.id === avatarId)
  return found || ANIMAL_AVATARS[0] // default to owl
}

export default function AnimalAvatar({
  avatarId = 'owl',
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showBadge = false,
}) {
  const avatar = getAvatarInfo(avatarId)

  const sizeClasses = {
    sm: 'size-9 text-lg',
    md: 'size-11 text-2xl',
    lg: 'size-16 text-3xl',
    xl: 'size-24 text-5xl',
  }[size] || 'size-11 text-2xl'

  return (
    <div
      className={`relative grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${avatar.gradient} font-bold text-white shadow-md border ${avatar.border} ${className || sizeClasses}`}
      title={avatar.name}
    >
      {/* Decorative inner glow ring */}
      <span className="pointer-events-none absolute inset-0.5 rounded-[14px] border border-white/20" />

      {/* Animal Emoji / Vector Icon */}
      <span className="relative z-10 select-none transform transition-transform hover:scale-110">
        {avatar.emoji}
      </span>

      {showBadge && (
        <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-white text-[10px] shadow-sm">
          ✨
        </span>
      )}
    </div>
  )
}

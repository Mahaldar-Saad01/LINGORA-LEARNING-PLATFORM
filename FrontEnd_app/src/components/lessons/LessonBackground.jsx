import React from 'react'
import aiAvatar from '../../assets/images/ai_avatar.png'

const LANGUAGE_GLYPHS = {
  hindi: ['क', 'म', 'न', 'र'],
  telugu: ['అ', 'క', 'మ', 'న'],
  japanese: ['あ', 'か', 'め', 'の'],
  german: ['Ä', 'Ö', 'Ü', 'ß'],
  spanish: ['ñ', 'á', 'é', '¿'],
  french: ['é', 'è', 'à', 'ç'],
  english: ['A', 'B', 'C', 'D'],
  tamil: ['அ', 'க', 'ம', 'ந'],
  kannada: ['ಅ', 'ಕ', 'ಮ', 'ನ'],
  malayalam: ['അ', 'ക', 'മ', 'ന'],
  bengali: ['ক', 'ম', 'ন', 'র'],
  marathi: ['क', 'म', 'न', 'र'],
  gujarati: ['ક', 'મ', 'ન', 'ર'],
  punjabi: ['ਕ', 'ਮ', 'ਨ', 'ਰ'],
  mandarin: ['文', '学', '字', '道'],
  chinese: ['文', '学', '字', '道'],
  korean: ['한', '글', '말', '글'],
  arabic: ['ا', 'ب', 'ت', 'ث'],
  russian: ['А', 'Б', 'В', 'Г'],
  default: ['क', 'म', 'न', 'र'],
}

function getLanguageKey(lang) {
  if (!lang) return 'default'
  const normalized = String(lang).toLowerCase().trim()
  for (const key of Object.keys(LANGUAGE_GLYPHS)) {
    if (normalized.includes(key)) return key
  }
  if (normalized.includes('hi')) return 'hindi'
  if (normalized.includes('te')) return 'telugu'
  if (normalized.includes('ja')) return 'japanese'
  if (normalized.includes('de')) return 'german'
  if (normalized.includes('es')) return 'spanish'
  if (normalized.includes('fr')) return 'french'
  return 'default'
}

export default function LessonBackground({ language = 'hindi' }) {
  const langKey = getLanguageKey(language)
  const glyphs = LANGUAGE_GLYPHS[langKey] || LANGUAGE_GLYPHS.default

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
    >
      {/* Base warmth background overlay */}
      <div className="absolute inset-0 bg-[#f8faf6]" />

      {/* Large Organic SVG Blobs */}
      {/* Top-Left Blob (Primary Lingora Green ~5% Opacity) */}
      <svg
        className="absolute -left-24 -top-24 size-[480px] opacity-[0.05] sm:size-[620px] lg:size-[780px] motion-safe:animate-[blob-float-slow_22s_ease-in-out_infinite] motion-reduce:animate-none"
        viewBox="0 0 500 500"
        fill="#0f6f25"
      >
        <path d="M410,290Q370,330,340,380Q310,430,250,440Q190,450,140,410Q90,370,60,310Q30,250,60,190Q90,130,140,90Q190,50,250,60Q310,70,360,110Q410,150,425,200Q440,250,410,290Z" />
      </svg>

      {/* Bottom-Right Blob (Secondary Green ~5% Opacity) */}
      <svg
        className="absolute -bottom-32 -right-32 size-[520px] opacity-[0.05] sm:size-[680px] lg:size-[850px] motion-safe:animate-[blob-float-alt_26s_ease-in-out_infinite] motion-reduce:animate-none"
        viewBox="0 0 500 500"
        fill="#1d8a35"
      >
        <path d="M420,310Q380,370,320,410Q260,450,190,430Q120,410,75,350Q30,290,45,220Q60,150,115,100Q170,50,240,65Q310,80,370,125Q430,170,445,240Q460,310,420,310Z" />
      </svg>

      {/* Faint Language Characters (Outer Viewport, Opacity ~2.8%) */}
      <div className="absolute inset-0 font-serif text-[#0f6f25] opacity-[0.028]">
        {/* Upper Left */}
        <span className="absolute top-[8%] left-[4%] text-7xl font-bold lg:text-9xl">
          {glyphs[0]}
        </span>
        {/* Upper Right */}
        <span className="absolute top-[12%] right-[5%] text-7xl font-bold lg:text-9xl">
          {glyphs[1]}
        </span>
        {/* Middle Left */}
        <span className="hidden md:block absolute top-[48%] left-[3%] text-8xl font-bold lg:text-[10rem]">
          {glyphs[2]}
        </span>
        {/* Lower Left / Middle */}
        <span className="hidden md:block absolute bottom-[14%] left-[18%] text-7xl font-bold lg:text-9xl">
          {glyphs[3]}
        </span>
      </div>

      {/* Botanical Leaves & Stems (~18% Opacity) */}
      {/* Left Stem & Leaves */}
      <svg
        className="absolute left-2 top-1/4 h-72 w-24 opacity-20 sm:left-6 sm:h-96 sm:w-32 lg:left-10 lg:h-[480px] lg:w-40 motion-safe:animate-[leaf-sway-left_12s_ease-in-out_infinite] motion-reduce:animate-none"
        viewBox="0 0 100 300"
        fill="none"
        stroke="#0f6f25"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M 20 290 Q 70 150 15 10" />
        <path
          d="M 45 200 C 75 180 85 205 60 225 C 40 220 40 205 45 200 Z"
          fill="#0f6f25"
          fillOpacity="0.35"
        />
        <path
          d="M 32 100 C 65 75 75 100 50 120 C 35 115 30 105 32 100 Z"
          fill="#0f6f25"
          fillOpacity="0.35"
        />
      </svg>

      {/* Right Stem & Leaves (Mirrored) */}
      <svg
        className="absolute right-2 top-1/3 h-72 w-24 opacity-20 sm:right-6 sm:h-96 sm:w-32 lg:right-10 lg:h-[480px] lg:w-40 motion-safe:animate-[leaf-sway-right_14s_ease-in-out_infinite] motion-reduce:animate-none"
        viewBox="0 0 100 300"
        fill="none"
        stroke="#0f6f25"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M 80 290 Q 30 160 85 10" />
        <path
          d="M 55 180 C 25 160 15 185 40 205 C 60 200 60 185 55 180 Z"
          fill="#0f6f25"
          fillOpacity="0.35"
        />
        <path
          d="M 68 80 C 35 55 25 80 50 100 C 65 95 70 85 68 80 Z"
          fill="#0f6f25"
          fillOpacity="0.35"
        />
      </svg>

      {/* Learning Journey Dashed Path (Hidden on Mobile) */}
      <svg
        className="hidden lg:block absolute inset-0 size-full opacity-20"
        preserveAspectRatio="none"
        viewBox="0 0 1200 800"
      >
        <path
          d="M 60 180 Q 250 80 450 220 T 850 380 T 1140 620"
          fill="none"
          stroke="#0f6f25"
          strokeWidth="3.5"
          strokeDasharray="8 12"
          strokeLinecap="round"
        />
        <circle cx="180" cy="130" r="7" fill="none" stroke="#0f6f25" strokeWidth="3" />
        <circle cx="450" cy="220" r="8" fill="#0f6f25" />
        <circle cx="700" cy="310" r="7" fill="none" stroke="#0f6f25" strokeWidth="3" />
        <circle cx="980" cy="500" r="8" fill="#0f6f25" />
      </svg>

      {/* Subtle Decorative Rings (Lower-Right Side) */}
      <div className="hidden sm:block absolute bottom-12 right-12 lg:right-24 size-48 lg:size-64 opacity-15">
        <div className="relative size-full">
          <div className="absolute inset-0 rounded-full border border-[#0f6f25] motion-safe:animate-[ring-pulse_8s_ease-in-out_infinite] motion-reduce:animate-none" />
          <div className="absolute inset-4 rounded-full border border-[#0f6f25] motion-safe:animate-[ring-pulse_8s_ease-in-out_infinite_2s] motion-reduce:animate-none" />
        </div>
      </div>

      {/* Lingora Rabbit / AI Avatar (Lower-Left Side) */}
      <div className="hidden md:block absolute bottom-16 left-6 lg:left-12 z-0 w-36 lg:w-44 motion-safe:animate-[avatar-float-gentle_7s_ease-in-out_infinite] motion-reduce:animate-none">
        <img
          src={aiAvatar}
          alt="Lingora Companion"
          className="w-full object-contain filter drop-shadow-[0_12px_24px_rgba(15,111,37,0.18)] opacity-90"
        />
      </div>

      {/* Inline Keyframe Styles */}
      <style>{`
        @keyframes blob-float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 20px) scale(1.05); }
        }
        @keyframes blob-float-alt {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, -30px) scale(1.04); }
        }
        @keyframes leaf-sway-left {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(3deg) translateY(-6px); }
        }
        @keyframes leaf-sway-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-3deg) translateY(-8px); }
        }
        @keyframes avatar-float-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}

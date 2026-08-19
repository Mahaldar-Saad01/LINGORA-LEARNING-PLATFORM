import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import aiAvatar from '../assets/images/ai_avatar.png'
import { streamTutorChat } from '../services/tutorApi'

export default function FloatingAITutor() {
  const navigate = useNavigate()
  const location = useLocation()

  // Normalize path
  const currentPath = (location.pathname || '').toLowerCase().replace(/\/+$/, '') || '/'

  // Check if excluded pages or tutor pages
  const isExcludedPage = ['/', '/login', '/register', '/assessment'].includes(currentPath)
  const isTutorPage = currentPath === '/tutor' || currentPath === '/ai-tutor'

  // Check if currently inside a lesson
  const isLessonActive = currentPath.startsWith('/lessons/') || currentPath === '/lessons'

  // Helper to verify if the user is registered and logged in
  const isRegisteredUser = () => {
    try {
      const token = localStorage.getItem('accessToken')
      const userStr = localStorage.getItem('currentUser')
      if (!token || !userStr) return false
      const user = JSON.parse(userStr)
      return Boolean(user && (user.id || user.email || user.name))
    } catch {
      return false
    }
  }

  const isAuthed = isRegisteredUser()

  // Position state for Floating Avatar Button (defaults to right edge, 65% down screen)
  const [avatarPos, setAvatarPos] = useState(() => {
    const saved = localStorage.getItem('ai_tutor_floating_pos')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    const initialX = typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 85) : 300
    const initialY = typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.65) : 400
    return { x: initialX, y: initialY }
  })

  // Position state for Draggable Doubt Clarification Window
  const [windowPos, setWindowPos] = useState(() => {
    const saved = localStorage.getItem('ai_tutor_window_pos')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    const initialX = typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 410) : 100
    const initialY = typeof window !== 'undefined' ? Math.max(10, window.innerHeight - 560) : 100
    return { x: initialX, y: initialY }
  })

  // Avatar Button Dragging & Tooltip State
  const [isAvatarDragging, setIsAvatarDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const avatarDragStartRef = useRef({ x: 0, y: 0 })
  const initialAvatarPosRef = useRef({ x: 0, y: 0 })
  const hasAvatarMovedRef = useRef(false)

  // Doubt Clarification Window Dragging State
  const [isWindowDragging, setIsWindowDragging] = useState(false)
  const windowDragStartRef = useRef({ x: 0, y: 0 })
  const initialWindowPosRef = useRef({ x: 0, y: 0 })

  // Compact Popup State
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hi! Need quick help with your lesson? Ask me any doubt about grammar, vocabulary, or pronunciation! 💡',
    },
  ])

  const chatEndRef = useRef(null)

  // Auto-scroll compact chat
  useEffect(() => {
    if (isPopupOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isPopupOpen])

  // Clamp Avatar Position within viewport bounds
  const clampAvatarPosition = (x, y) => {
    const size = 64
    const maxX = Math.max(10, window.innerWidth - size - 10)
    const maxY = Math.max(10, window.innerHeight - size - 10)
    return {
      x: Math.max(10, Math.min(x, maxX)),
      y: Math.max(10, Math.min(y, maxY)),
    }
  }

  // Clamp Window Position within viewport bounds
  const clampWindowPosition = (x, y) => {
    const width = 380
    const height = 490
    const maxX = Math.max(10, window.innerWidth - width - 10)
    const maxY = Math.max(10, window.innerHeight - height - 10)
    return {
      x: Math.max(10, Math.min(x, maxX)),
      y: Math.max(10, Math.min(y, maxY)),
    }
  }

  // Handle Avatar Drag Start
  const handleAvatarStart = (clientX, clientY) => {
    setIsAvatarDragging(true)
    hasAvatarMovedRef.current = false
    avatarDragStartRef.current = { x: clientX, y: clientY }
    initialAvatarPosRef.current = { ...avatarPos }
  }

  const onAvatarMouseDown = (e) => {
    if (e.button !== 0) return
    handleAvatarStart(e.clientX, e.clientY)
  }

  const onAvatarTouchStart = (e) => {
    if (e.touches.length === 1) {
      handleAvatarStart(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  // Handle Avatar Drag Move & Release
  useEffect(() => {
    const handleAvatarMove = (clientX, clientY) => {
      if (!isAvatarDragging) return

      const deltaX = clientX - avatarDragStartRef.current.x
      const deltaY = clientY - avatarDragStartRef.current.y

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasAvatarMovedRef.current = true
      }

      const newPos = clampAvatarPosition(
        initialAvatarPosRef.current.x + deltaX,
        initialAvatarPosRef.current.y + deltaY
      )

      setAvatarPos(newPos)
    }

    const onMouseMove = (e) => handleAvatarMove(e.clientX, e.clientY)
    const onTouchMove = (e) => {
      if (e.touches.length === 1) {
        handleAvatarMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleEnd = () => {
      if (isAvatarDragging) {
        setIsAvatarDragging(false)
        localStorage.setItem('ai_tutor_floating_pos', JSON.stringify(avatarPos))
      }
    }

    if (isAvatarDragging) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isAvatarDragging, avatarPos])

  // Handle Window Drag Start
  const handleWindowStart = (clientX, clientY) => {
    setIsWindowDragging(true)
    windowDragStartRef.current = { x: clientX, y: clientY }
    initialWindowPosRef.current = { ...windowPos }
  }

  const onWindowMouseDown = (e) => {
    if (e.button !== 0) return
    handleWindowStart(e.clientX, e.clientY)
  }

  const onWindowTouchStart = (e) => {
    if (e.touches.length === 1) {
      handleWindowStart(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  // Handle Window Drag Move & Release
  useEffect(() => {
    const handleWindowMove = (clientX, clientY) => {
      if (!isWindowDragging) return

      const deltaX = clientX - windowDragStartRef.current.x
      const deltaY = clientY - windowDragStartRef.current.y

      const newPos = clampWindowPosition(
        initialWindowPosRef.current.x + deltaX,
        initialWindowPosRef.current.y + deltaY
      )

      setWindowPos(newPos)
    }

    const onMouseMove = (e) => handleWindowMove(e.clientX, e.clientY)
    const onTouchMove = (e) => {
      if (e.touches.length === 1) {
        handleWindowMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleEnd = () => {
      if (isWindowDragging) {
        setIsWindowDragging(false)
        localStorage.setItem('ai_tutor_window_pos', JSON.stringify(windowPos))
      }
    }

    if (isWindowDragging) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isWindowDragging, windowPos])

  // Handle Avatar Button Click
  const handleAvatarClick = (e) => {
    if (hasAvatarMovedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (isLessonActive) {
      // Open doubt clarification window & hide floating avatar
      setIsPopupOpen(true)
    } else {
      // Redirect to full AI Tutor page outside lessons
      navigate('/tutor')
    }
  }

  const [conversationId, setConversationId] = useState(null)

  // Handle sending doubt message
  const handleSendMessage = async (textToSend) => {
    const promptText = (textToSend || inputMessage).trim()
    if (!promptText || isStreaming) return

    const userMsgId = Date.now().toString()
    const aiMsgId = (Date.now() + 1).toString()

    const userMsg = { id: userMsgId, sender: 'user', text: promptText }
    const initialAiMsg = { id: aiMsgId, sender: 'ai', text: '...' }

    setMessages((prev) => [...prev, userMsg, initialAiMsg])
    setInputMessage('')
    setIsStreaming(true)

    let accumulatedText = ''

    try {
      await streamTutorChat(
        { conversationId, message: promptText },
        {
          onMeta: (meta) => {
            if (meta && meta.conversation_id) {
              setConversationId(meta.conversation_id)
            }
          },
          onChunk: (chunk) => {
            accumulatedText += chunk
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId ? { ...msg, text: accumulatedText } : msg
              )
            )
          },
          onDone: () => {
            setIsStreaming(false)
          },
          onError: (err) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? { ...msg, text: `Sorry, I ran into an error: ${err.message || 'Could not answer doubt.'}` }
                  : msg
              )
            )
            setIsStreaming(false)
          },
        }
      )
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: 'I am currently unable to connect. Please check your network.' }
            : msg
        )
      )
      setIsStreaming(false)
    }
  }

  if (isExcludedPage || isTutorPage || !isAuthed) return null

  return (
    <>
      {/* FLOATING AVATAR BUTTON (Hidden when Doubt Clarification Popup is Open) */}
      {!isPopupOpen && (
        <div
          style={{
            position: 'fixed',
            left: `${avatarPos.x}px`,
            top: `${avatarPos.y}px`,
            zIndex: 9999,
            touchAction: 'none',
          }}
          className="group select-none"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Tooltip */}
          {(showTooltip || isAvatarDragging) && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-[#0f6f25]/30 bg-[#102b18] px-3.5 py-1 text-xs font-bold text-white shadow-xl pointer-events-none transition-all">
              {isLessonActive ? 'Ask Doubt Clarification 💡' : 'Ask Lingora AI Tutor 🪄'}
            </div>
          )}

          {/* Glow Aura */}
          <span className="absolute inset-0 rounded-full bg-[#22c55e]/30 blur-md animate-pulse" />

          {/* Draggable Button */}
          <button
            type="button"
            onMouseDown={onAvatarMouseDown}
            onTouchStart={onAvatarTouchStart}
            onClick={handleAvatarClick}
            className={`relative grid size-16 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-[#17852f] to-[#0a4e18] shadow-[0_10px_30px_rgba(15,111,37,0.4)] transition-transform ${
              isAvatarDragging ? 'scale-110 cursor-grabbing' : 'cursor-grab hover:scale-105 active:scale-95'
            }`}
            title={isLessonActive ? 'Click to open Doubt Clarification' : 'Click to open AI Tutor'}
          >
            <div className="size-12 overflow-hidden rounded-full bg-[#102b18]/60 p-1 flex items-center justify-center">
              <img
                src={aiAvatar}
                alt="AI Tutor Avatar"
                className="size-full object-contain pointer-events-none"
              />
            </div>

            {/* Live Indicator Dot */}
            <span className="absolute bottom-0 right-0 grid size-4 place-items-center rounded-full border-2 border-white bg-[#22c55e]">
              <span className="size-1.5 rounded-full bg-white animate-ping" />
            </span>
          </button>
        </div>
      )}

      {/* DRAGGABLE DOUBT CLARIFICATION WINDOW (Shows when isPopupOpen is True) */}
      {isLessonActive && isPopupOpen && (
        <div
          style={{
            position: 'fixed',
            left: `${windowPos.x}px`,
            top: `${windowPos.y}px`,
            zIndex: 10000,
            touchAction: 'none',
          }}
          className="w-[340px] sm:w-[380px] h-[490px] rounded-[24px] border border-[#dce8dd] bg-white shadow-[0_25px_60px_rgba(16,43,24,0.3)] flex flex-col overflow-hidden animate-fade-in"
        >
          {/* DRAGGABLE HEADER BAR */}
          <div
            onMouseDown={onWindowMouseDown}
            onTouchStart={onWindowTouchStart}
            className={`flex items-center justify-between bg-gradient-to-r from-[#17852f] to-[#0a4e18] px-4 py-3 text-white select-none ${
              isWindowDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            title="Drag header to move window"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-white/70 text-base">drag_indicator</span>
              <div className="grid size-8 place-items-center rounded-lg bg-white/15 backdrop-blur">
                <img src={aiAvatar} alt="AI" className="size-6 object-contain pointer-events-none" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-tight">Doubt Clarification</h3>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#bce5c3]">
                  <span className="size-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  Lesson Assistant
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => navigate('/tutor')}
                className="grid size-8 place-items-center rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
                title="Expand to full AI Tutor page"
              >
                <span className="material-symbols-outlined text-lg">open_in_new</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPopupOpen(false)}
                className="grid size-8 place-items-center rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
                title="Close window & restore avatar button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Doubt Chips */}
          <div className="flex items-center gap-2 overflow-x-auto bg-[#f4f7f4] px-3 py-2 border-b border-[#e5eee6] scrollbar-none">
            {[
              '❓ Explain grammar rule',
              '📝 Give example sentence',
              '🗣️ Pronunciation tip',
              '🌐 Translate phrase',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="shrink-0 rounded-full border border-[#cfe2ce] bg-white px-2.5 py-1 text-[11px] font-bold text-[#137c31] transition hover:bg-[#eef7f0] hover:border-[#137c31]"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f7faf8]">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user'
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  {!isUser && (
                    <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[#137c31] text-white">
                      <img src={aiAvatar} alt="AI" className="size-5 object-contain" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#137c31] text-white rounded-br-none shadow-sm font-medium'
                        : 'bg-white text-[#102b18] border border-[#dce8dd] rounded-bl-none shadow-sm'
                    }`}
                  >
                    {isUser ? msg.text : <FormatMessageText text={msg.text} />}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2 border-t border-[#e5eee6] bg-white p-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask any doubt about this lesson..."
              className="flex-1 rounded-xl border border-[#dce8dd] bg-[#f7faf8] px-3.5 py-2 text-xs font-medium text-[#102b18] outline-none transition placeholder:text-[#809085] focus:border-[#137c31] focus:bg-white"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isStreaming}
              className="grid size-9 place-items-center rounded-xl bg-[#137c31] text-white transition hover:bg-[#0f6528] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <span className="material-symbols-outlined text-base">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function FormatMessageText({ text }) {
  if (!text) return null

  const lines = text.split('\n')

  return (
    <div className="space-y-1 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="h-1" />

        // Header 3 (### Title)
        if (trimmed.startsWith('###')) {
          const headerText = trimmed.replace(/^###\s*/, '')
          return (
            <h4 key={idx} className="mt-2.5 mb-1 text-[12px] font-black text-[#0f6f25] border-b border-[#e5eee6] pb-0.5">
              {headerText}
            </h4>
          )
        }

        // Header 2 (## Title)
        if (trimmed.startsWith('##')) {
          const headerText = trimmed.replace(/^##\s*/, '')
          return (
            <h3 key={idx} className="mt-3 mb-1 text-[13px] font-black text-[#102b18]">
              {headerText}
            </h3>
          )
        }

        // Bullet point (- item or * item)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletText = trimmed.replace(/^[-*]\s*/, '')
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 my-0.5">
              <span className="text-[#0f6f25] font-bold">•</span>
              <span>{parseInlineFormatting(bulletText)}</span>
            </div>
          )
        }

        // Numbered list (1. item)
        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s*(.*)/)
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 my-0.5">
              <span className="font-bold text-[#0f6f25]">{match[1]}</span>
              <span>{parseInlineFormatting(match[2])}</span>
            </div>
          )
        }

        // Blockquote (> text)
        if (trimmed.startsWith('>')) {
          const quoteText = trimmed.replace(/^>\s*/, '')
          return (
            <blockquote key={idx} className="my-1 rounded-lg border-l-2 border-[#0f6f25] bg-[#eef7f0] p-2 text-[11px] font-medium text-[#102b18]">
              {parseInlineFormatting(quoteText)}
            </blockquote>
          )
        }

        return <p key={idx}>{parseInlineFormatting(trimmed)}</p>
      })}
    </div>
  )
}

function parseInlineFormatting(str) {
  if (!str) return ''
  const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-[#102b18]">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-[#2c3e30]">{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-[#eef4f0] px-1 py-0.5 font-mono text-[11px] text-[#0f6f25]">{part.slice(1, -1)}</code>
    }
    return part
  })
}

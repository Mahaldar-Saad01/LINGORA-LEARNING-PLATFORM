import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import aiAvatar from '../assets/images/ai_avatar.png'
import AnimatedBackgroundPaths from '../components/AnimatedBackgroundpaths'
import EnergyIndicator from '../components/energy/EnergyIndicator'
import {
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
  getTutorStats,
  streamTutorChat,
} from '../services/tutorApi'

function SimpleMarkdown({ content }) {
  if (!content) return null

  // Process text lines into styled elements
  const lines = content.split('\n')
  const elements = []

  let inCodeBlock = false
  let codeBlockLines = []

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div
            key={`code-${index}`}
            className="my-3 overflow-x-auto rounded-xl bg-[#1e293b] p-4 text-xs font-mono text-emerald-300 shadow-inner"
          >
            <pre>{codeBlockLines.join('\n')}</pre>
          </div>
        )
        codeBlockLines = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      return
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={index} className="mt-4 mb-2 text-base font-bold text-[#0f6f25]">
          {parseInline(line.replace('### ', ''))}
        </h4>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={index} className="mt-5 mb-2 text-lg font-extrabold text-[#0f6f25]">
          {parseInline(line.replace('## ', ''))}
        </h3>
      )
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={index}
          className="my-2 border-l-4 border-[#0f6f25] bg-[#edf7ee] px-4 py-2 italic text-[#264a2c] rounded-r-xl"
        >
          {parseInline(line.replace('> ', ''))}
        </blockquote>
      )
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <li key={index} className="ml-5 list-disc my-1 text-sm leading-relaxed text-[#2a382b]">
          {parseInline(line.trim().replace(/^[-*]\s+/, ''))}
        </li>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={index} className="h-2" />)
    } else {
      elements.push(
        <p key={index} className="my-1 text-sm leading-relaxed text-[#1c291e]">
          {parseInline(line)}
        </p>
      )
    }
  })

  return <div className="space-y-0.5">{elements}</div>
}

function parseInline(text) {
  const parts = []
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-[#0a4d1a]">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-[#1d5c2b]">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-[#e2f0e4] px-1.5 py-0.5 text-xs font-mono font-semibold text-[#0d591e]"
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}

export default function TutorPage() {
  const hasAccessToken = Boolean(localStorage.getItem('accessToken'))

  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [stats, setStats] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [speakingId, setSpeakingId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  // Initial data load
  useEffect(() => {
    let active = true

    getConversations()
      .then((data) => {
        if (!active) return
        const list = Array.isArray(data) ? data : data.results || []
        setConversations(list)
        if (list.length > 0) {
          setActiveConversationId(list[0].id)
        }
      })
      .catch(() => { })

    getTutorStats()
      .then((data) => {
        if (active) setStats(data)
      })
      .catch(() => { })

    return () => {
      active = false
    }
  }, [])

  // Load message history when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }

    let active = true
    getConversation(activeConversationId)
      .then((data) => {
        if (active && data) {
          setMessages(data.messages || [])
        }
      })
      .catch(() => { })

    return () => {
      active = false
    }
  }, [activeConversationId])

  const handleNewConversation = async () => {
    try {
      const newConv = await createConversation('New Conversation')
      setConversations((prev) => [newConv, ...prev])
      setActiveConversationId(newConv.id)
      setMessages([])
      setSidebarOpen(false)
    } catch (err) {
      console.error('Failed to create new conversation', err)
    }
  }

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation()
    try {
      await deleteConversation(id)
      const updated = conversations.filter((c) => c.id !== id)
      setConversations(updated)
      if (activeConversationId === id) {
        if (updated.length > 0) {
          setActiveConversationId(updated[0].id)
        } else {
          setActiveConversationId(null)
          setMessages([])
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation', err)
    }
  }

  const handleSendMessage = (textToSend = null) => {
    const prompt = (textToSend || inputMessage).trim()
    if (!prompt || isStreaming) return

    setInputMessage('')
    setIsStreaming(true)
    setStreamingText('')

    // Add user message optimistically
    const tempUserMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    abortControllerRef.current = new AbortController()

    let currentConversationId = activeConversationId
    let accumulatedText = ''

    streamTutorChat(
      {
        conversationId: currentConversationId,
        message: prompt,
      },
      {
        onMeta: (meta) => {
          if (meta.conversation_id) {
            currentConversationId = meta.conversation_id
            setActiveConversationId(meta.conversation_id)
            setConversations((prev) => {
              const exists = prev.some((c) => c.id === meta.conversation_id)
              if (!exists) {
                return [{ id: meta.conversation_id, title: meta.title }, ...prev]
              }
              return prev.map((c) =>
                c.id === meta.conversation_id ? { ...c, title: meta.title } : c
              )
            })
          }
        },
        onChunk: (chunk) => {
          accumulatedText += chunk
          setStreamingText(accumulatedText)
        },
        onDone: (donePayload) => {
          const finalContent = donePayload.full_text || accumulatedText
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              sender: 'assistant',
              content: finalContent,
              created_at: new Date().toISOString(),
            },
          ])
          setStreamingText('')
          setIsStreaming(false)
          // Refresh stats count
          getTutorStats().then(setStats).catch(() => { })
        },
        onError: (err) => {
          console.error('Stream error:', err)
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              sender: 'assistant',
              content: `⚠️ Sorry, I encountered an issue connecting to Gemini: ${err.message}`,
              created_at: new Date().toISOString(),
            },
          ])
          setStreamingText('')
          setIsStreaming(false)
        },
        signal: abortControllerRef.current.signal,
      }
    )
  }

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      if (streamingText) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            content: streamingText,
            created_at: new Date().toISOString(),
          },
        ])
      }
      setStreamingText('')
      setIsStreaming(false)
    }
  }

  const handleCopy = (msgId, content) => {
    navigator.clipboard.writeText(content)
    setCopiedId(msgId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handlePronounce = (msgId, content) => {
    if (!('speechSynthesis' in window)) return

    if (speakingId === msgId) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }

    window.speechSynthesis.cancel()

    // Strip markdown tags for clean speech
    const cleanText = content
      .replace(/[*#_`>]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')

    const utterance = new SpeechSynthesisUtterance(cleanText)
    if (stats?.target_language) {
      const langLower = stats.target_language.toLowerCase()
      if (langLower.includes('spanish')) utterance.lang = 'es-ES'
      else if (langLower.includes('french')) utterance.lang = 'fr-FR'
      else if (langLower.includes('german')) utterance.lang = 'de-DE'
      else if (langLower.includes('italian')) utterance.lang = 'it-IT'
      else utterance.lang = 'en-US'
    }

    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)

    setSpeakingId(msgId)
    window.speechSynthesis.speak(utterance)
  }

  const handleExplainSimpler = () => {
    handleSendMessage('Can you explain that simpler with basic step-by-step examples?')
  }

  const quickPrompts = stats?.quick_prompts || [
    'Explain recent grammar mistakes',
    'Practice conversational Spanish',
    'Review today\'s key vocabulary',
    'Give me a 5-minute quiz on verb tenses',
    'Explain how to order food naturally',
  ]

  if (!hasAccessToken) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#f4fbf5] text-[#101010] overflow-hidden font-sans">
      <AnimatedBackgroundPaths />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#dce7da] bg-white/95 px-4 backdrop-blur-md lg:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="grid size-10 place-items-center rounded-xl border border-[#d3e3d1] text-[#0f6f25] lg:hidden hover:bg-[#edf7ee]"
            aria-label="Toggle Menu"
          >
            <span className="material-symbols-outlined text-xl">
              {sidebarOpen ? 'close' : 'menu'}
            </span>
          </button>

          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-xl font-black tracking-tight text-[#0f6f25]"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-[#0f6f25] text-white shadow-sm">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
            </span>
            lingora <span className="hidden sm:inline font-semibold text-[#305234]">AI Tutor</span>
          </Link>
        </div>

        {/* Header Right */}
        <div className="flex items-center gap-3">
          <EnergyIndicator />

          <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#cbe3cf] bg-[#edf7ee] px-3.5 py-1 text-xs font-bold text-[#0f6f25]">
            <span className="size-2 rounded-full bg-[#22c55e] animate-pulse" />
            Gemini 1.5 Powered
          </span>

          <Link
            to="/dashboard"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#cfe2ce] bg-white px-4 text-xs font-bold text-[#244429] transition hover:bg-[#f0f8f1] hover:border-[#0f6f25]"
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="relative flex flex-1 overflow-hidden z-10">
        {/* Left Sidebar Panel */}
        <aside
          className={`absolute inset-y-0 left-0 z-20 flex w-80 flex-col border-r border-[#dbe6d9] bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
            }`}
        >
          {/* New Chat Button */}
          <div className="p-4 border-b border-[#e6efe5]">
            <button
              onClick={handleNewConversation}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f6f25] py-3 px-4 text-sm font-bold text-white shadow-md shadow-[#0f6f25]/20 transition hover:bg-[#0c5c1f] hover:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              New Chat Session
            </button>
          </div>

          {/* Sidebar Content Scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Learner Context Card */}
            {stats && (
              <div className="rounded-2xl border border-[#d6e7d4] bg-gradient-to-br from-[#edf7ee] to-[#f4faf5] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f6f25]">
                    Learner Profile
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#b45309] bg-[#fffbeb] px-2 py-0.5 rounded-full border border-[#fef3c7]">
                    <span className="material-symbols-outlined text-xs">local_fire_department</span>
                    {stats.streak}d streak
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-[#2b3a2c]">
                  <div className="flex justify-between">
                    <span className="text-[#647565]">Target Language:</span>
                    <strong className="font-bold text-[#0f6f25] capitalize">{stats.target_language}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#647565]">Level:</span>
                    <strong className="font-bold text-[#204022] capitalize">{stats.language_level}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#647565]">Messages sent:</span>
                    <strong className="font-semibold text-[#204022]">{stats.total_messages}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Prompt Topics */}
            <div>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#617362] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#0f6f25]">lightbulb</span>
                Quick Topics
              </h3>
              <div className="space-y-1.5">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleSendMessage(prompt)
                      setSidebarOpen(false)
                    }}
                    className="w-full text-left rounded-xl border border-[#e2ece0] bg-[#fafdfa] px-3 py-2.5 text-xs font-medium text-[#213823] transition hover:border-[#0f6f25] hover:bg-[#edf7ee] hover:text-[#0f6f25]"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Conversations List */}
            <div>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#617362] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#0f6f25]">history</span>
                Recent Conversations
              </h3>

              {conversations.length === 0 ? (
                <p className="text-xs text-[#7d8c7e] italic py-2">No chat history yet.</p>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => {
                    const isActive = conv.id === activeConversationId
                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setActiveConversationId(conv.id)
                          setSidebarOpen(false)
                        }}
                        className={`group relative flex items-center justify-between cursor-pointer rounded-xl px-3 py-2.5 text-xs transition ${isActive
                          ? 'bg-[#0f6f25] font-bold text-white shadow-sm'
                          : 'text-[#2b3a2c] hover:bg-[#f0f7f1]'
                          }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-6">
                          <span
                            className={`material-symbols-outlined text-base ${isActive ? 'text-white' : 'text-[#0f6f25]'
                              }`}
                          >
                            chat_bubble_outline
                          </span>
                          <span className="truncate">{conv.title}</span>
                        </div>

                        <button
                          onClick={(e) => handleDeleteConversation(e, conv.id)}
                          className={`opacity-0 group-hover:opacity-100 transition p-1 hover:text-red-500 ${isActive ? 'text-white/80 hover:text-white' : 'text-[#7d8c7e]'
                            }`}
                          title="Delete session"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Sidebar Overlay backdrop for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-10 bg-black/30 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Main Interactive Chat Area */}
        <section className="flex flex-1 flex-col overflow-hidden bg-[#f4fbf5]">
          {/* Active Chat Header */}
          <div className="flex h-14 items-center justify-between border-b border-[#dce6db] bg-white/70 px-6 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative size-9 overflow-hidden rounded-full bg-[#0f6f25]/10 border border-[#0f6f25]/20 p-0.5">
                <img src={aiAvatar} alt="AI Avatar" className="size-full object-cover" />
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-[#22c55e] border-2 border-white" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#132616]">Lingora AI Language Tutor</h2>
                <p className="text-[11px] font-medium text-[#5c6e5e]">
                  Interactive Practice & Instant Correction
                </p>
              </div>
            </div>

            {isStreaming && (
              <button
                onClick={handleStopStream}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100"
              >
                <span className="material-symbols-outlined text-sm">stop_circle</span>
                Stop Generating
              </button>
            )}
          </div>

          {/* Messages Stream List */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
            {messages.length === 0 && !isStreaming ? (
              <div className="mx-auto my-12 max-w-xl text-center space-y-6">
                <div className="inline-flex size-20 items-center justify-center rounded-3xl bg-[#edf7ee] border border-[#cce4d0] shadow-sm">
                  <img src={aiAvatar} alt="AI Avatar" className="size-14 object-contain" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-[#0f6f25]">
                    Welcome to Lingora AI Tutor!
                  </h3>
                  <p className="text-sm text-[#576958] leading-relaxed max-w-md mx-auto">
                    I am your 24/7 personal language tutor. Ask me grammar questions, practice
                    conversations, or click one of the quick start topics below!
                  </p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 text-left pt-2">
                  {quickPrompts.slice(0, 4).map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(topic)}
                      className="group rounded-2xl border border-[#d6e5d4] bg-white p-4 text-xs font-semibold text-[#1f3321] shadow-xs transition hover:border-[#0f6f25] hover:shadow-md hover:bg-[#fafdfa]"
                    >
                      <span className="block font-bold text-[#0f6f25] mb-1 group-hover:translate-x-0.5 transition-transform">
                        💬 {topic}
                      </span>
                      <span className="text-[11px] text-[#697a6a]">
                        Click to practice with instant feedback
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender === 'user'
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isUser && (
                      <div className="shrink-0 size-9 overflow-hidden rounded-xl bg-[#0f6f25] p-1 shadow-sm mt-0.5">
                        <img src={aiAvatar} alt="AI" className="size-full object-contain" />
                      </div>
                    )}

                    <div
                      className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm shadow-xs ${isUser
                        ? 'bg-[#0f6f25] text-white rounded-tr-xs'
                        : 'bg-white border border-[#dce7da] text-[#1a2b1c] rounded-tl-xs'
                        }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed font-medium">
                          {msg.content}
                        </p>
                      ) : (
                        <div>
                          <SimpleMarkdown content={msg.content} />

                          {/* Message Action Buttons */}
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#edf2ec] pt-2 text-xs text-[#526353]">
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-[#edf7ee] hover:text-[#0f6f25]"
                              title="Copy response"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {copiedId === msg.id ? 'check' : 'content_copy'}
                              </span>
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>

                            <button
                              onClick={() => handlePronounce(msg.id, msg.content)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 transition ${speakingId === msg.id
                                ? 'bg-[#0f6f25] text-white'
                                : 'hover:bg-[#edf7ee] hover:text-[#0f6f25]'
                                }`}
                              title="Pronounce response"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {speakingId === msg.id ? 'volume_up' : 'volume_mute'}
                              </span>
                              <span>{speakingId === msg.id ? 'Speaking...' : 'Pronounce'}</span>
                            </button>

                            <button
                              onClick={handleExplainSimpler}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-[#edf7ee] hover:text-[#0f6f25]"
                              title="Request a simpler explanation"
                            >
                              <span className="material-symbols-outlined text-sm">help_outline</span>
                              <span>Explain simpler</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* Real-time Streaming message placeholder */}
            {isStreaming && (
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-9 overflow-hidden rounded-xl bg-[#0f6f25] p-1 shadow-sm mt-0.5">
                  <img src={aiAvatar} alt="AI" className="size-full object-contain animate-pulse" />
                </div>
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-white border border-[#dce7da] p-4 text-sm text-[#1a2b1c] rounded-tl-xs shadow-xs">
                  {streamingText ? (
                    <SimpleMarkdown content={streamingText} />
                  ) : (
                    <div className="flex items-center gap-1.5 py-1 text-[#0f6f25]">
                      <span className="size-2 rounded-full bg-[#0f6f25] animate-bounce" />
                      <span className="size-2 rounded-full bg-[#0f6f25] animate-bounce [animation-delay:0.2s]" />
                      <span className="size-2 rounded-full bg-[#0f6f25] animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="border-t border-[#dce6db] bg-white p-3 lg:p-4 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="mx-auto flex max-w-4xl items-center gap-2 rounded-2xl border border-[#cbe0ca] bg-[#f9fdfa] px-4 py-2 shadow-sm focus-within:border-[#0f6f25] focus-within:ring-2 focus-within:ring-[#0f6f25]/20"
            >
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Ask your AI Tutor anything or practice target language..."
                rows={1}
                className="flex-1 resize-none bg-transparent py-1.5 text-sm text-[#142616] placeholder-[#7e9180] focus:outline-none max-h-32"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming}
                className="grid size-10 place-items-center rounded-xl bg-[#0f6f25] text-white transition hover:bg-[#0c5c1f] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0"
              >
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            </form>

            <div className="mt-2 text-center text-[11px] text-[#718573]">
              Press <kbd className="rounded bg-[#e8f2e9] px-1 font-mono text-[10px]">Enter</kbd> to send, <kbd className="rounded bg-[#e8f2e9] px-1 font-mono text-[10px]">Shift + Enter</kbd> for new line.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

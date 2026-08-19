import { useCallback, useEffect, useRef, useState } from 'react'

const LANGUAGE_CODES = {
  english: 'en-US', hindi: 'hi-IN', telugu: 'te-IN', german: 'de-DE',
  en: 'en-US', hi: 'hi-IN', te: 'te-IN', de: 'de-DE',
  french: 'fr-FR', spanish: 'es-ES', italian: 'it-IT', portuguese: 'pt-PT',
  tamil: 'ta-IN', kannada: 'kn-IN', malayalam: 'ml-IN', marathi: 'mr-IN',
  bengali: 'bn-IN', gujarati: 'gu-IN', punjabi: 'pa-IN', urdu: 'ur-IN',
  japanese: 'ja-JP', korean: 'ko-KR', chinese: 'zh-CN', arabic: 'ar-SA',
  russian: 'ru-RU',
  fr: 'fr-FR', es: 'es-ES', it: 'it-IT', pt: 'pt-PT',
  ta: 'ta-IN', kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', bn: 'bn-IN',
  gu: 'gu-IN', pa: 'pa-IN', ur: 'ur-IN', ja: 'ja-JP', ko: 'ko-KR',
  zh: 'zh-CN', ar: 'ar-SA', ru: 'ru-RU',
  'en-us': 'en-US', 'en-in': 'en-IN', 'hi-in': 'hi-IN',
  'te-in': 'te-IN', 'de-de': 'de-DE', 'ja-jp': 'ja-JP',
}

const GERMAN_WORDS = new Set([
  'aber', 'auf', 'aus', 'bei', 'bitte', 'das', 'der', 'die', 'ein', 'eine',
  'für', 'gut', 'hallo', 'haus', 'ist', 'ja', 'kein', 'mit', 'nicht', 'oder',
  'schön', 'schule', 'und', 'von', 'was', 'wasser', 'wie', 'wir', 'wo', 'zu',
])

const HINDI_VOWELS = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
}

const HINDI_MATRAS = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
}

const HINDI_CONSONANTS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
}

export function transliterateHindi(text) {
  const characters = [...String(text || '').normalize('NFC')]
  let result = ''
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index]
    const consonant = HINDI_CONSONANTS[character]
    if (consonant) {
      const next = characters[index + 1]
      if (next === '्') {
        result += consonant
        index += 1
      } else if (HINDI_MATRAS[next]) {
        result += consonant + HINDI_MATRAS[next]
        index += 1
      } else {
        result += consonant + 'a'
      }
      continue
    }
    result += HINDI_VOWELS[character]
      || HINDI_MATRAS[character]
      || ({ 'ं': 'n', 'ँ': 'n', 'ः': 'h', '़': '' }[character] ?? character)
  }
  return result.replace(/a(?=\s|[.,!?;:]|$)/g, '').replace(/\s+/g, ' ').trim()
}

export function getSpeechLanguage(language) {
  if (!language) return 'en-US'
  const value = String(language).trim()
  return LANGUAGE_CODES[value.toLowerCase()]
    || (/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})+$/i.test(value) ? value : 'en-US')
}

export function cleanSpeechText(value) {
  if (!value) return ''
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*_`#~|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectScript(character) {
  const codePoint = character?.codePointAt(0)
  if (codePoint >= 0x0900 && codePoint <= 0x097f) return 'hi-IN'
  if (codePoint >= 0x0c00 && codePoint <= 0x0c7f) return 'te-IN'
  if (/\p{Script=Latin}/u.test(character || '')) return 'latin'
  return 'neutral'
}

function getLatinLanguage(token, { targetLanguage, explanationLanguage, latinLanguage } = {}) {
  if (latinLanguage) return getSpeechLanguage(latinLanguage)
  const target = getSpeechLanguage(targetLanguage)
  const explanation = getSpeechLanguage(explanationLanguage)
  if (target === explanation) return target
  if (target.toLowerCase().startsWith('de')) {
    const word = token.toLocaleLowerCase('de-DE').replace(/[^\p{L}]/gu, '')
    if (/[äöüß]/i.test(token) || GERMAN_WORDS.has(word)) return 'de-DE'
  }
  return explanation.toLowerCase().startsWith('de') ? 'de-DE' : 'en-IN'
}

export function splitTextByLanguage(text, languageHints = {}) {
  const cleaned = cleanSpeechText(text)
  if (!cleaned) return []

  const rawParts = cleaned.match(/[\p{Script=Devanagari}]+|[\p{Script=Telugu}]+|[\p{Script=Latin}]+|[^\p{L}]+/gu) || []
  const segments = []
  let pendingNeutral = ''

  rawParts.forEach((part) => {
    const script = detectScript([...part].find((character) => detectScript(character) !== 'neutral'))
    if (script === 'neutral') {
      if (segments.length) segments[segments.length - 1].text += part
      else pendingNeutral += part
      return
    }

    const lang = script === 'latin' ? getLatinLanguage(part, languageHints) : script
    const value = pendingNeutral + part
    pendingNeutral = ''
    const previous = segments[segments.length - 1]
    if (previous?.lang === lang) previous.text += value
    else segments.push({ text: value, lang })
  })

  if (pendingNeutral) {
    if (segments.length) segments[segments.length - 1].text += pendingNeutral
    else segments.push({ text: pendingNeutral, lang: getSpeechLanguage(languageHints.explanationLanguage) })
  }
  return segments.map((segment) => ({ ...segment, text: segment.text.trim() })).filter((segment) => segment.text)
}

export function findBestVoice(languageCode, voices) {
  const wanted = getSpeechLanguage(languageCode).toLowerCase()
  const base = wanted.split('-')[0]
  return voices.find((voice) => voice.lang.toLowerCase() === wanted)
    || voices.find((voice) => voice.lang.toLowerCase().split('-')[0] === base)
    || null
}

export function prepareSegmentForAvailableVoices(segment, voices = []) {
  const requestedLanguage = getSpeechLanguage(segment.lang || segment.language)
  const matchingVoice = findBestVoice(requestedLanguage, voices)

  // Web Speech relies on voices installed by the browser/OS. When Hindi is not
  // installed, asking an English voice to read Devanagari commonly produces
  // silence. Transliterate it and deliberately use an Indian English voice so
  // the learner still hears an understandable Hinglish pronunciation.
  if (requestedLanguage.toLowerCase().startsWith('hi') && !matchingVoice) {
    const fallbackLanguage = 'en-IN'
    return {
      language: fallbackLanguage,
      text: transliterateHindi(cleanSpeechText(segment.text)),
      voice: findBestVoice(fallbackLanguage, voices),
    }
  }

  return {
    language: requestedLanguage,
    text: cleanSpeechText(segment.text),
    voice: matchingVoice,
  }
}

export default function useSpeechSynthesis() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window
  const [isSpeaking, setIsSpeaking] = useState(false)
  const runRef = useRef(0)
  const voicesRef = useRef([])
  const mountedRef = useRef(true)
  const settleRef = useRef(null)

  const stop = useCallback(() => {
    runRef.current += 1
    if (supported) window.speechSynthesis.cancel()
    settleRef.current?.resolve()
    settleRef.current = null
    if (mountedRef.current) setIsSpeaking(false)
  }, [supported])

  useEffect(() => {
    mountedRef.current = true
    if (!supported) return undefined
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      voicesRef.current = availableVoices
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      mountedRef.current = false
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      window.speechSynthesis.cancel()
      runRef.current += 1
      settleRef.current?.resolve()
      settleRef.current = null
    }
  }, [supported])

  const speakSegmentsSequentially = useCallback((segments) => {
    if (!supported) return Promise.reject(new Error('Speech playback is not supported in this browser.'))
    stop()
    const queue = segments.filter((segment) => cleanSpeechText(segment.text))
    if (!queue.length) return Promise.resolve()

    const runId = runRef.current
    setIsSpeaking(true)
    return new Promise((resolve, reject) => {
      settleRef.current = { resolve, reject }
      const finish = (error) => {
        if (settleRef.current) settleRef.current = null
        if (mountedRef.current && runRef.current === runId) setIsSpeaking(false)
        if (error) reject(error)
        else resolve()
      }
      const play = (index) => {
        if (runRef.current !== runId) return
        if (index >= queue.length) {
          finish()
          return
        }
        const segment = queue[index]
        const availableVoices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices()
        const prepared = prepareSegmentForAvailableVoices(segment, availableVoices)
        if (!prepared.text) {
          play(index + 1)
          return
        }
        const utterance = new SpeechSynthesisUtterance(prepared.text)
        utterance.lang = prepared.language
        utterance.rate = Number(segment.rate) || 1
        utterance.pitch = 1
        utterance.volume = 1
        if (prepared.voice) utterance.voice = prepared.voice
        utterance.onend = () => {
          if (runRef.current === runId) window.setTimeout(() => play(index + 1), segment.pauseAfter ?? 180)
        }
        utterance.onerror = (event) => {
          if (runRef.current !== runId || ['canceled', 'interrupted'].includes(event.error)) {
            finish()
            return
          }
          finish(new Error(`Speech playback failed: ${event.error || 'unknown error'}`))
        }
        window.speechSynthesis.speak(utterance)
      }
      play(0)
    })
  }, [stop, supported])

  const speakMultilingualText = useCallback((text, languageHints = {}) => (
    speakSegmentsSequentially(splitTextByLanguage(text, languageHints))
  ), [speakSegmentsSequentially])

  const speak = useCallback((items) => {
    const queue = (Array.isArray(items) ? items : [items]).flatMap((item) => {
      const entry = typeof item === 'string' ? { text: item } : item
      const segments = splitTextByLanguage(entry.text, entry.languageHints || {
        targetLanguage: entry.targetLanguage || entry.language,
        explanationLanguage: entry.explanationLanguage || entry.language,
        latinLanguage: entry.latinLanguage,
      })
      return segments.map((segment, index) => ({
        ...segment,
        rate: entry.rate,
        pauseAfter: index === segments.length - 1 ? entry.pauseAfter : 120,
      }))
    })
    return speakSegmentsSequentially(queue)
  }, [speakSegmentsSequentially])

  return {
    isSpeaking, speak, speakMultilingualText, speakSegmentsSequentially,
    stop, cancel: stop, supported,
  }
}

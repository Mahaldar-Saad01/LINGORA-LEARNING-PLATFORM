import { useState } from 'react'
import { getSpeechLanguage } from '../../../hooks/useSpeechSynthesis'
import AudioButton from '../AudioButton'
import ActivityFrame from './ActivityFrame'

export default function MatchingWordsActivity(props) {
  const { activity, answerState = {}, onAnswerChange, isSubmitted, lesson, speech } = props
  const content = activity?.content ?? {}
  const left = Array.isArray(content.left_items) ? content.left_items : []
  const right = Array.isArray(content.right_items) ? content.right_items : []
  const pairs = Array.isArray(answerState.pairs) ? answerState.pairs : []
  const [active, setActive] = useState(null)
  const targetLanguage = getSpeechLanguage(lesson?.audio_locale || lesson?.target_language_code)
  const explanationLanguage = getSpeechLanguage(lesson?.explanation_language_code)
  const pairedLeftIds = new Set(pairs.map((pair) => pair.left_id))
  const pairedRightIds = new Set(pairs.map((pair) => pair.right_id))

  const speak = (text, language) => {
    if (text && speech?.supported) speech.speak({ text, language })
  }

  const match = (rightId) => {
    if (!active || isSubmitted) return
    onAnswerChange({
      pairs: [...pairs.filter((pair) => pair.left_id !== active && pair.right_id !== rightId), { left_id: active, right_id: rightId }],
    })
    setActive(null)
  }

  const remove = (leftId) => {
    if (!isSubmitted) onAnswerChange({ pairs: pairs.filter((pair) => pair.left_id !== leftId) })
  }

  return <ActivityFrame {...props}>
    <div className="mx-auto mt-7 max-w-5xl rounded-[28px] border border-[#dce8d9] bg-gradient-to-b from-white to-[#f4faf3] p-5 shadow-[0_18px_45px_rgba(32,86,45,0.08)] sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-[#eaf6e9] px-5 py-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[.16em] text-[#2e7d32]">Build the pairs</p>
          <p className="mt-1 text-[#4d5d4d]">{active ? 'Now choose its matching meaning.' : 'Choose a word, then choose its meaning.'}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-4 py-2 font-black text-[#0f6f25] shadow-sm">{pairs.length}/{left.length} linked</span>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-5">
        <div className="space-y-3">
          <h3 className="mb-4 text-center text-sm font-black uppercase tracking-widest text-[#586958]">Words</h3>
          {left.map((item, index) => {
            const selected = active === item.id
            const matched = pairedLeftIds.has(item.id)
            const stateClass = selected
              ? 'scale-[1.02] border-[#2e7d32] bg-[#effaef] shadow-[0_8px_20px_rgba(46,125,50,.16)]'
              : matched ? 'border-[#7a69c7] bg-[#f3f0ff]' : 'border-[#d5dfd2] bg-white hover:-translate-y-0.5 hover:border-[#8eb58d] hover:shadow-md'
            return <div className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-3 transition-all ${stateClass}`} key={item.id}>
              <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black ${matched ? 'bg-[#7a69c7] text-white' : selected ? 'bg-[#2e7d32] text-white' : 'bg-[#edf2eb] text-[#526052]'}`}>{matched ? '✓' : index + 1}</span>
              <button className="min-w-0 flex-1 p-1 text-left text-xl font-bold" disabled={isSubmitted} onClick={() => matched ? remove(item.id) : setActive(item.id)} type="button">
                {item.text}
                {item.transliteration && <small className="mt-1 block text-sm font-medium italic text-[#667166]">{item.transliteration}</small>}
              </button>
              <AudioButton label={`Hear ${item.text}`} onClick={() => speak(item.text, targetLanguage)} size="small" />
            </div>
          })}
        </div>

        <div className="hidden items-center md:flex">
          <div className={`grid size-12 place-items-center rounded-full border-2 text-2xl font-black transition ${active ? 'animate-pulse border-[#2e7d32] bg-[#2e7d32] text-white' : 'border-[#cfdacf] bg-white text-[#8b988b]'}`}>↔</div>
        </div>

        <div className="space-y-3">
          <h3 className="mb-4 text-center text-sm font-black uppercase tracking-widest text-[#586958]">Meanings</h3>
          {right.map((item) => {
            const optionText = item.meaning || ''
            const matched = pairedRightIds.has(item.id)
            return <div className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-3 transition-all ${matched ? 'border-[#7a69c7] bg-[#f3f0ff]' : active ? 'border-[#b8d5b7] bg-white hover:-translate-y-0.5 hover:border-[#2e7d32] hover:shadow-md' : 'border-[#d5dfd2] bg-white'}`} key={item.id}>
              <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black ${matched ? 'bg-[#7a69c7] text-white' : 'bg-[#edf2eb] text-[#526052]'}`}>{matched ? '✓' : '?'}</span>
              <button className="min-w-0 flex-1 p-1 text-left text-xl font-bold" disabled={isSubmitted || matched || !active} onClick={() => match(item.id)} type="button">
                {item.item_type === 'image'
                  ? (item.image_url ? <img alt={optionText || 'Match option'} className="mx-auto max-h-24" src={item.image_url} /> : <span aria-label="Image unavailable">🖼️</span>)
                  : optionText}
              </button>
              {optionText && <AudioButton label={`Hear ${optionText}`} onClick={() => speak(optionText, explanationLanguage)} size="small" />}
            </div>
          })}
        </div>
      </div>

      {pairs.length > 0 && <div className="mt-7 border-t border-[#d8e5d5] pt-6">
        <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-[#586958]">Your links</h3>
        <div className="flex flex-wrap gap-3">
          {pairs.map((pair) => {
            const leftItem = left.find((item) => item.id === pair.left_id)
            const rightItem = right.find((item) => item.id === pair.right_id)
            return <div className="inline-flex items-center gap-2 rounded-full border border-[#cfc6f5] bg-[#f3f0ff] py-2 pl-4 pr-2 font-bold text-[#45378e]" key={`${pair.left_id}-${pair.right_id}`}>
              <span>{leftItem?.text}</span><span aria-hidden="true">↔</span><span>{rightItem?.meaning}</span>
              {!isSubmitted && <button aria-label={`Remove match for ${leftItem?.text}`} className="grid size-7 place-items-center rounded-full bg-white text-[#6b5bb5] hover:bg-[#e4defb]" onClick={() => remove(pair.left_id)} type="button">×</button>}
            </div>
          })}
        </div>
      </div>}
    </div>
  </ActivityFrame>
}

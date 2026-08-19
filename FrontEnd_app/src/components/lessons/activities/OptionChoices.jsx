import AudioButton from '../AudioButton'
export default function OptionChoices({ disabled, language, lesson, options, selectedId, onSelect, speech }) {
  const speak = (event, text) => {
    event.stopPropagation()
    speech?.speak({
      text,
      language: language || lesson?.audio_locale || lesson?.target_language_code,
    })
  }
  return <div className="mt-8 grid gap-4 md:grid-cols-2">{options.map((option, index) => <article className={`flex min-h-24 items-center gap-3 rounded-2xl border-2 bg-white px-4 py-4 shadow-[0_8px_22px_rgba(28,67,39,0.06)] transition hover:-translate-y-0.5 hover:border-[#2e7d32] ${selectedId === option.id ? 'border-[#2e7d32] ring-4 ring-[#2e7d32]/10' : 'border-[#cbd6c6]'}`} key={option.id ?? option.text ?? index}><button className="flex min-w-0 flex-1 items-center gap-4 text-left" disabled={disabled} onClick={() => onSelect(option.id)} type="button"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#e4efff] text-lg">{index + 1}</span><span className="min-w-0"><strong className="block text-xl font-bold" dir="auto">{option.text ?? ''}</strong>{option.transliteration && <small className="mt-1 block font-normal italic">{option.transliteration}</small>}</span></button><AudioButton label={`Speak option ${index + 1}`} onClick={(event) => speak(event, option.text ?? '')} size="compact" /></article>)}</div>
}

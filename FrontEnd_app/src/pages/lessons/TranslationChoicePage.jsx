import AudioButton from '../../components/lessons/AudioButton'
import ChoiceActivity from '../../components/lessons/ChoiceActivity'

export default function TranslationChoicePage({ activity, onSubmit, onNext }) {
  const phrase = activity.prompt_text || activity.text || activity.title
  return <ChoiceActivity activity={activity} onNext={onNext} onSubmit={onSubmit}><div className="text-center"><h1 className="text-3xl font-black">{activity.title}</h1><p className="mt-3 text-lg text-[#475047]">{activity.instruction}</p><div className="mx-auto mt-9 max-w-2xl rounded-2xl bg-white p-9 shadow-sm"><p className="text-4xl font-black text-[#0f6f25]">{phrase}</p>{activity.transliteration && <p className="mt-3 italic">{activity.transliteration}</p>}<div className="mt-5"><AudioButton size="small" onClick={() => activity.speech.speak({ text: phrase, language: activity.language.audio_locale })} /></div></div></div></ChoiceActivity>
}

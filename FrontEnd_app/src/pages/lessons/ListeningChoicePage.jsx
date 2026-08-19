import AudioButton from '../../components/lessons/AudioButton'
import ChoiceActivity from '../../components/lessons/ChoiceActivity'

export default function ListeningChoicePage({ activity, onSubmit, onNext }) {
  const play = () => activity.speech.speak({ text: activity.audio?.text || activity.prompt_text || activity.title, language: activity.audio?.locale || activity.language.audio_locale })
  return <ChoiceActivity activity={activity} onNext={onNext} onSubmit={onSubmit}><div className="text-center"><h1 className="text-3xl font-black sm:text-4xl">{activity.title}</h1><p className="mt-3 text-lg text-[#475047]">{activity.instruction}</p><div className="my-14"><AudioButton isSpeaking={activity.speech.isSpeaking} onClick={play} /></div>{activity.transliteration && <p className="text-lg italic text-[#667066]">{activity.transliteration}</p>}</div></ChoiceActivity>
}

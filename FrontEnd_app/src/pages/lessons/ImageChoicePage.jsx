import ChoiceActivity from '../../components/lessons/ChoiceActivity'

export default function ImageChoicePage({ activity, onSubmit, onNext }) {
  const imageOptions = (activity.options || []).map((option) => typeof option === 'object' ? option : { text: option, value: option })
  return 
  <ChoiceActivity activity={{ ...activity, options: imageOptions }} onNext={onNext} onSubmit={onSubmit}>
    <div className="text-center">
      <h1 className="text-4xl font-black">{activity.title}</h1>
      <p className="mt-3 text-lg">{activity.instruction}</p>
      {
      activity.images?.[0] && 
      <img alt="Activity reference" className="mx-auto mt-8 max-h-64 rounded-2xl object-cover" src={activity.images[0]} />
      }
    </div>
      </ChoiceActivity>
}

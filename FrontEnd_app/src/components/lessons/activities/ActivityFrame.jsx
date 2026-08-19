import ActivityFeedback from '../ActivityFeedback'
import LessonHeader from '../LessonHeader'

export default function ActivityFrame({ activity, children, feedback, isCorrect }) {
  return <><LessonHeader activity={activity} />{children}<ActivityFeedback feedback={feedback} isCorrect={isCorrect} /></>
}

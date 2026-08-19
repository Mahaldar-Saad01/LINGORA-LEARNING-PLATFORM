import FillInTheBlankActivity from './activities/FillInTheBlankActivity'
import LessonOverviewActivity from './activities/LessonOverviewActivity'
import ListenAndSelectActivity from './activities/ListenAndSelectActivity'
import MatchingWordsActivity from './activities/MatchingWordsActivity'
import SentenceCompletionActivity from './activities/SentenceCompletionActivity'
import SpeakingPracticeActivity from './activities/SpeakingPracticeActivity'
import TranslateSentenceActivity from './activities/TranslateSentenceActivity'
import WordArrangementActivity from './activities/WordArrangementActivity'
import UnsupportedActivityPage from './UnsupportedActivityPage'
const COMPONENTS={lesson_overview:LessonOverviewActivity,fill_in_the_blank:FillInTheBlankActivity,listen_and_select:ListenAndSelectActivity,sentence_completion:SentenceCompletionActivity,matching_words:MatchingWordsActivity,word_arrangement:WordArrangementActivity,speaking_practice:SpeakingPracticeActivity,translate_sentence:TranslateSentenceActivity}
export default function ActivityRenderer(props){const Component=COMPONENTS[props.activity?.activity_type];return Component?<Component key={props.activity?.id} {...props}/>:<UnsupportedActivityPage activity={props.activity} onNext={props.onNext}/>}

import ImageChoicePage from '../../pages/lessons/ImageChoicePage'
import LessonOverviewPage from '../../pages/lessons/LessonOverviewPage'
import ListeningChoicePage from '../../pages/lessons/ListeningChoicePage'
import MatchingPage from '../../pages/lessons/MatchingPage'
import ReadingComprehensionPage from '../../pages/lessons/ReadingComprehensionPage'
import SentenceCompletionPage from '../../pages/lessons/SentenceCompletionPage'
import SpeakingPracticePage from '../../pages/lessons/SpeakingPracticePage'
import TranslationChoicePage from '../../pages/lessons/TranslationChoicePage'
import WordArrangementPage from '../../pages/lessons/WordArrangementPage'
import WritingPracticePage from '../../pages/lessons/WritingPracticePage'

const activityRegistry = new Map([
  ['lesson_overview', LessonOverviewPage], ['listening_choice', ListeningChoicePage],
  ['translation_choice', TranslationChoicePage], ['sentence_completion', SentenceCompletionPage],
  ['matching', MatchingPage], ['word_arrangement', WordArrangementPage],
  ['speaking_practice', SpeakingPracticePage], ['image_choice', ImageChoicePage],
  ['reading_comprehension', ReadingComprehensionPage], ['writing_practice', WritingPracticePage],
])

export const getActivityComponent = (activityType) => activityRegistry.get(activityType)
export const registerActivityType = (activityType, component) => activityRegistry.set(activityType, component)

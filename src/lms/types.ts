export type LmsLessonContentType = 'video' | 'reading' | 'embed' | 'quiz'

export type LmsQuizOption = {
  id: string
  text: string
  correct?: boolean
}

export type LmsQuizQuestion = {
  id: string
  text?: string
  options: LmsQuizOption[]
}

export type LmsQuiz = {
  question?: string
  options?: LmsQuizOption[]
  questions?: LmsQuizQuestion[]
}

export type LmsLesson = {
  id: string
  title: string
  type: LmsLessonContentType
  body?: string
  videoUrl?: string
  embedUrl?: string
  quiz?: LmsQuiz
  owuiWorkflowRef?: string
  payload?: Record<string, unknown>
}

export type LmsModule = {
  id: string
  title: string
  lessons: LmsLesson[]
}

export type LmsCourse = {
  id: string
  title: string
  description?: string
  bannerUrl?: string
  modules: LmsModule[]
  updatedAt: string
}

export type LmsCourseSummary = {
  id: string
  title: string
  description?: string
  progress: number
  updatedAt: string
}

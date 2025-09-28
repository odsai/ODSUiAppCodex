import type { LmsCourse, LmsCourseSummary } from './types'

export const SAMPLE_COURSE_ALIAS_IDS = ['course-101', 'course-201', 'course-305'] as const

export const SAMPLE_COURSE: LmsCourse = {
  id: 'course-odsai-sample',
  title: 'ODSAiStudio: Design with AI – Starter Course',
  description: 'A hands-on introduction to ODSAiStudio tools and workflows using AI.',
  updatedAt: new Date().toISOString(),
  modules: [
    {
      id: 'm1',
      title: 'Getting Started',
      lessons: [
        { id: 'm1l1', title: 'Welcome', type: 'reading', body: 'Welcome to the course! This short lesson orients you to the LMS.' },
        { id: 'm1l2', title: 'What is ODSAiStudio?', type: 'video', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
      ],
    },
    {
      id: 'm2',
      title: 'Tools Overview',
      lessons: [
        { id: 'm2l1', title: 'Open WebUI Tour', type: 'embed', embedUrl: 'https://openwebui.com' },
        {
          id: 'm2l2',
          title: 'Prompt Basics Quiz',
          type: 'quiz',
          quiz: {
            question: 'Which of these are good prompt design practices?',
            options: [
              { id: 'a', text: 'Be specific with constraints', correct: true },
              { id: 'b', text: 'Use ambiguous language' },
              { id: 'c', text: 'Provide examples', correct: true },
              { id: 'd', text: 'Ignore model limitations' },
            ],
          },
        },
      ],
    },
    {
      id: 'm3',
      title: 'Apply and Reflect',
      lessons: [
        { id: 'm3l1', title: 'Mini Project', type: 'reading', body: 'Create a small concept using any of the tools and reflect on the process.' },
      ],
    },
  ],
}

export const SAMPLE_COURSE_SUMMARIES: LmsCourseSummary[] = [
  {
    id: SAMPLE_COURSE_ALIAS_IDS[0],
    title: 'Intro to ODSAi',
    description: 'Onboarding to ODSAiStudio tools and workflows.',
    progress: 0.35,
    updatedAt: SAMPLE_COURSE.updatedAt,
  },
  {
    id: SAMPLE_COURSE_ALIAS_IDS[1],
    title: 'RAG Fundamentals',
    description: 'Retrieval-Augmented Generation basics and patterns.',
    progress: 0.6,
    updatedAt: SAMPLE_COURSE.updatedAt,
  },
  {
    id: SAMPLE_COURSE_ALIAS_IDS[2],
    title: 'Prompt Engineering',
    description: 'Designing robust prompt chains for real products.',
    progress: 0.1,
    updatedAt: SAMPLE_COURSE.updatedAt,
  },
]

export const SAMPLE_COURSE_MAP: Record<string, LmsCourse> = SAMPLE_COURSE_ALIAS_IDS.reduce(
  (acc, alias) => ({ ...acc, [alias]: SAMPLE_COURSE }),
  { [SAMPLE_COURSE.id]: SAMPLE_COURSE },
)


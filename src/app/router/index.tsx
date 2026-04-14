import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layout/AppLayout'
import { HomePage } from '../../pages/home/HomePage'
import { ProjectNewPage } from '../../pages/project-new/ProjectNewPage'
import { IdeaPage } from '../../pages/idea/IdeaPage'
import { ResearchPage } from '../../pages/research/ResearchPage'
import { SpecPage } from '../../pages/spec/SpecPage'
import { ArchitecturePage } from '../../pages/architecture/ArchitecturePage'
import { PromptLoopPage } from '../../pages/prompt-loop/PromptLoopPage'
import { HistoryPage } from '../../pages/history/HistoryPage'
import { BlogPage } from '../../pages/blog/BlogPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'project/new', element: <ProjectNewPage /> },
      { path: 'idea', element: <IdeaPage /> },
      { path: 'research', element: <ResearchPage /> },
      { path: 'spec', element: <SpecPage /> },
      { path: 'architecture', element: <ArchitecturePage /> },
      { path: 'prompt-loop', element: <PromptLoopPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'blog', element: <BlogPage /> },
    ],
  },
])

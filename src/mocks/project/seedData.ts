import type {
  Project,
  IdeaDraft,
  ResearchBrief,
  SpecPack,
  ArchitectureDraft,
  PromptIteration,
  ImportedResearchArtifact,
  ResearchRun,
} from '../../shared/types'

// ─── Mock project ─────────────────────────────────────────────────────────────

export const mockProject: Project = {
  id: 'proj-001',
  name: 'TaskFlow — AI-assisted project manager',
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-07T08:30:00Z',
  status: 'active',
  currentStage: 'research',
}

// ─── Mock idea ────────────────────────────────────────────────────────────────

export const mockIdeaDraft: IdeaDraft = {
  title: 'TaskFlow — AI-assisted project manager',
  rawIdea:
    'A project management tool where AI helps break down goals into tasks, writes subtask descriptions, and suggests next actions based on what is overdue or blocked.',
  targetUser: 'Solo developers and small teams who manage work across multiple projects',
  problem:
    'Most PM tools require too much manual structure. People skip planning and end up with vague todos that block progress.',
  constraints:
    'Must work offline. Should not require account creation to try it. Mobile-friendly.',
  notes: 'Inspired by Linear + Notion but much simpler. Think 20% of features, 80% of value.',
}

// ─── Mock research brief ──────────────────────────────────────────────────────

export const mockResearchBrief: ResearchBrief = {
  problemSummary:
    'Solo developers and small teams struggle to maintain structured task management. Existing tools are either too heavy (Jira, Notion) or too simple (plain notes). There is a gap for a lightweight tool that uses AI to reduce the friction of structuring work.',
  targetUsers: [
    'Solo developers managing side projects',
    'Small engineering teams (2–8 people)',
    'Freelancers juggling multiple client projects',
    'Technical founders building the first version of a product',
  ],
  valueHypothesis:
    'By automating task breakdown and next-action suggestions, TaskFlow reduces planning overhead by 60–80%, making it practical to maintain structured work even during high-velocity development.',
  competitorNotes:
    'Linear: strong dev focus, lacks AI planning. Notion: flexible but slow for task management. Todoist: simple but no project context. ClickUp: feature overload. No clear winner in the lightweight AI-native PM space.',
  risks: [
    'AI suggestions may be irrelevant without enough project context',
    'Users may not trust AI-generated subtasks without ability to easily override',
    'Offline-first architecture adds complexity for sync',
    'Market is crowded — positioning must be sharp',
  ],
  opportunities: [
    'First-mover advantage in lightweight AI-native PM tools',
    'Strong developer-to-developer word of mouth potential',
    'Natural integration point with Claude Code workflows',
    'Low barrier to trial if no account required',
  ],
  recommendedMVP:
    'A single-user task manager with: project + goal creation, AI-generated task breakdowns, next-action suggestions, and a simple kanban-style view. No collaboration, no billing, no accounts in V1.',
  openQuestions: [
    'What is the right AI trigger — on-demand or automatic?',
    'Should task hierarchy be unlimited or capped at 2 levels?',
    'How do we handle context handoff when switching between projects?',
    'What is the minimum viable offline experience?',
  ],
  sourcesNote: 'Research generated via mock provider. Replace with real Perplexity run in Phase 2.',
  sourceIds: ['src-001', 'src-002'],
  briefSource: 'generated',
}

// ─── Mock spec pack ───────────────────────────────────────────────────────────

export const mockSpecPack: SpecPack = {
  productSummary:
    'TaskFlow is a lightweight, AI-native project manager for solo developers and small teams. It reduces planning friction by generating structured task breakdowns and recommending next actions from natural language project goals.',
  MVPScope:
    'Single-user mode. Create projects. Add goals. Generate task list from goal description. Mark tasks done. View next-action suggestion. No authentication, no collaboration, no export in V1.',
  featureList: [
    { id: 'f-001', name: 'Project creation', description: 'Create and name a project with a one-line description.', priority: 'must' },
    { id: 'f-002', name: 'Goal input', description: 'Add a high-level goal with plain language description.', priority: 'must' },
    { id: 'f-003', name: 'AI task breakdown', description: 'Generate subtasks from a goal description using AI.', priority: 'must' },
    { id: 'f-004', name: 'Task status tracking', description: 'Mark tasks as todo, in-progress, or done.', priority: 'must' },
    { id: 'f-005', name: 'Next-action suggestion', description: 'AI recommends the single most important next task.', priority: 'must' },
    { id: 'f-006', name: 'Project overview', description: 'Summary of project progress and open tasks.', priority: 'should' },
    { id: 'f-007', name: 'Offline support', description: 'App works without internet; data stored locally.', priority: 'should' },
    { id: 'f-008', name: 'Task notes', description: 'Add freeform notes to any task.', priority: 'could' },
    { id: 'f-009', name: 'Export to markdown', description: 'Export project task list as a markdown file.', priority: 'could' },
    { id: 'f-010', name: 'Team collaboration', description: 'Share projects with teammates.', priority: 'wont' },
  ],
  assumptions: [
    'Users are comfortable with AI-generated content that may need editing',
    'Local storage is sufficient for single-user MVP',
    'A Claude API key will be user-provided in V1',
    'No authentication means no cross-device sync in V1',
  ],
  constraints: [
    'No backend server in MVP',
    'No user accounts',
    'No billing',
    'Must work on mobile',
  ],
  acceptanceNotes:
    'A user can create a project, describe a goal, get AI-generated tasks, mark progress, and see the next recommended action — all without an account or backend.',
}

// ─── Mock architecture draft ──────────────────────────────────────────────────

export const mockArchitectureDraft: ArchitectureDraft = {
  recommendedStack: [
    { name: 'React', role: 'UI layer', rationale: 'Component-based, excellent mobile support, strong ecosystem' },
    { name: 'TypeScript', role: 'Type safety', rationale: 'Prevents runtime errors, self-documenting domain models' },
    { name: 'Vite', role: 'Build tool', rationale: 'Fast dev server, small bundle, ideal for local-first apps' },
    { name: 'Zustand', role: 'State management', rationale: 'Lightweight, easy local persistence with zustand/persist' },
    { name: 'Tailwind CSS', role: 'Styling', rationale: 'Utility-first, responsive, mobile-first by default' },
    { name: 'Claude API', role: 'AI provider', rationale: 'Best-in-class instruction following for task generation' },
  ],
  moduleArchitecture:
    'Feature-sliced architecture: app shell → pages → feature modules → domain entities → shared utilities. Provider adapters isolate AI calls from business logic.',
  dataFlow:
    'User input → domain action → store update → UI re-render. AI calls go through service adapters that return typed results into the store. No direct AI calls from components.',
  roadmapPhases: [
    {
      phase: 0,
      title: 'Foundation',
      goals: ['App shell', 'Routing', 'State store', 'Typed models', 'Mock data'],
      estimatedComplexity: 'low',
    },
    {
      phase: 1,
      title: 'Core workflow',
      goals: ['Project creation', 'Goal input', 'Task view', 'Status tracking'],
      estimatedComplexity: 'medium',
    },
    {
      phase: 2,
      title: 'AI integration',
      goals: ['Claude API adapter', 'Task breakdown prompt', 'Next-action prompt', 'Response parser'],
      estimatedComplexity: 'medium',
    },
    {
      phase: 3,
      title: 'Polish and offline',
      goals: ['Local persistence', 'Offline detection', 'Empty states', 'Error handling'],
      estimatedComplexity: 'medium',
    },
    {
      phase: 4,
      title: 'Export and sharing',
      goals: ['Markdown export', 'Shareable project URL (read-only)', 'Feedback loop'],
      estimatedComplexity: 'high',
    },
  ],
  technicalRisks: [
    'Claude API latency may feel slow on mobile — need optimistic UI',
    'Local storage limit (~5MB) may be hit with large projects',
    'Prompt quality for task generation needs iteration — plan for prompt versioning',
    'Offline/online sync is complex if collaboration is added later',
  ],
}

// ─── Mock prompt iterations ───────────────────────────────────────────────────

export const mockPromptIterations: PromptIteration[] = [
  {
    id: 'prompt-001',
    projectId: 'proj-001',
    iterationNumber: 1,
    promptText: `You are a senior full-stack engineer implementing TaskFlow, an AI-native project manager.

## Context
- Stack: React + TypeScript + Vite + Zustand + Tailwind CSS
- Phase 0: Foundation
- Goal: App shell, routing, state store, typed models, placeholder screens

## Task
Implement Phase 0 only:
1. Vite + React + TS scaffold
2. React Router with routes: /, /project, /goals, /tasks, /settings
3. Zustand store with Project, Goal, Task types
4. Tailwind setup
5. Placeholder pages for each route
6. Basic responsive navigation

## Rules
- TypeScript strict mode
- Mobile-first layout
- Mock data only, no real API calls
- One prompt = one phase`,
    claudeResponseRaw: null,
    parsedSummary: null,
    recommendedNextStep: null,
    status: 'draft',
    createdAt: '2026-04-07T08:45:00Z',
  },
]

// ─── Mock imported research artifact ─────────────────────────────────────────

export const mockImportedArtifact: ImportedResearchArtifact = {
  id: 'artifact-001',
  projectId: 'proj-001',
  title: 'Competitor analysis — PM tools for developers (2026)',
  sourceType: 'markdown_notes',
  sourceLabel: 'Internal analysis notes',
  rawContent: `# PM Tools Competitive Analysis

## Linear
- Pros: Fast, developer-focused, keyboard shortcuts, clean UI
- Cons: No AI, no subtask generation, team-focused pricing

## Notion
- Pros: Flexible, all-in-one, good templates
- Cons: Slow, too generic, poor mobile experience

## Todoist
- Pros: Simple, cross-platform, good habits
- Cons: No project hierarchy, no AI, no developer focus

## Opportunity
There is no lightweight PM tool that:
1. Requires no account to try
2. Uses AI to generate tasks from goals
3. Works offline
4. Is designed specifically for developers

TaskFlow addresses all four gaps.`,
  importedAt: '2026-04-05T14:00:00Z',
  notes: 'Used as supplementary input for research brief generation.',
}

// ─── Mock research run ────────────────────────────────────────────────────────

export const mockResearchRun: ResearchRun = {
  id: 'run-001',
  projectId: 'proj-001',
  providerId: 'mock-provider',
  mode: 'quick',
  status: 'completed',
  startedAt: '2026-04-05T09:00:00Z',
  finishedAt: '2026-04-05T09:02:30Z',
  inputSummary: mockIdeaDraft.rawIdea,
}

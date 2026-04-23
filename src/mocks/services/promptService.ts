import type {
  SpecPack,
  ArchitectureDraft,
  PromptIteration,
  ParsedClaudeResponse,
  ProjectType,
} from '../../shared/types'

// ─── Mock prompt generation and response parsing service ──────────────────────
// Generates Claude Code prompts and parses structured responses.
// Aligned with the Superpowers cycle: Brainstorm → Spec → Plan → Tasks → Code+Tests → Review
// implements F-007, F-024 / T-107

// ─── Internal helpers ─────────────────────────────────────────────────────────

const TDD_RULE = `## Правило TDD (обязательно)
Ты должен писать тесты как часть задачи — не после.
Включи хотя бы один юнит- или интеграционный тест на каждую нетривиальную функцию или компонент.
Отмечай тестовые файлы в списке файлов префиксом: [TEST]
Пример: [TEST] src/features/auth/__tests__/validateToken.test.ts
Ответ, реализующий код без файлов [TEST], будет отмечен на стадии Review.`

const RESPONSE_FORMAT = `## Требуемый формат ответа
1. Краткий анализ — что реализуешь и почему (со ссылками на T-xxx, F-xxx)
2. План реализации — перечисли каждое изменение; включи подход к тестам
3. Созданные/изменённые файлы — перечисли все файлы; пометь [TEST] тестовые файлы
4. Реализация — сам код
5. Рекомендуемый следующий шаг — следующая задача T-xxx и почему`

const DOCS_SECTION = `## Документы для изучения перед написанием кода
1. docs/PRD.md — цели, критерии успеха, non-goals
2. docs/features.md — определения фич (F-xxx) и статусы
3. docs/tech-spec.md — архитектурные решения и структура модулей
4. docs/data-model.md — типизированные определения сущностей
5. docs/tasks.md — список задач (T-xxx) — определяет точный скоуп
6. docs/user-stories.md — направление приёмки для Review`

function projectTypeLabel(projectType: ProjectType): string {
  return projectType === 'website' ? 'сайт' : 'приложение'
}

// ─── Type-specific implementation guidance ────────────────────────────────────
// Injected into every prompt so Claude uses the correct vocabulary and patterns
// for the project type. Application = SPA/components/state; Website = pages/SEO/SSR.

export function typeAwareGuidance(projectType: ProjectType): string {
  if (projectType === 'website') {
    return `## Руководство по реализации сайта
Ты создаёшь сайт (многостраничный, контент-первичный). Применяй эти паттерны везде:
- Думай в терминах **страниц и маршрутов** — каждый маршрут является отдельной, независимо рендерируемой контентной поверхностью.
- Применяй паттерны **SSG или SSR** там, где контент в основном статичен или критичен для SEO; предпочитай статическую генерацию, если персонализация не требует данных в рантайме.
- Поддерживай **единообразие лейаута, навигации и семантического HTML** на всех страницах; иерархия заголовков важна для доступности и SEO.
- **SEO**: каждая страница должна иметь описательный title, мета-описание и корректные Open Graph теги. Контент должен быть индексируемым (никакого рендеринга только на JS для основного текста).
- **Тестирование**: проверяй, что страницы рендерят ключевой контент, навигационные ссылки разрешаются, и что критический текст не скрыт за client-only состоянием.`
  }
  return `## Руководство по реализации приложения
Ты создаёшь SPA (Single Page Application). Применяй эти паттерны везде:
- Вся маршрутизация **клиентская** (React Router); серверного рендеринга нет — запланируй fallback-маршрут в production.
- Изменения состояния должны проходить через **Zustand стор** — никакого prop-drilling для данных, общих между компонентами.
- Держи каждый **компонент сфокусированным**; выноси общую логику в кастомные хуки или экшены стора, а не в тела компонентов.
- **Тестирование (TDD-порядок)**: пиши тесты для компонентов (props → рендер), экшенов стора (переходы состояния) и пользовательских потоков (симулируй взаимодействие → проверяй результат) перед реализацией.
- **Без преждевременной оптимизации**: реализуй фичу до Definition of Done, потом пусть review решит, нужны ли кэширование или мемоизация.`
}

// ─── Phase inference keywords ─────────────────────────────────────────────────

export function inferNextPhase(
  analysis: string,
  nextStep: string,
  hasTests: boolean,
  nextTaskId: string | null,
  prevTaskId: string | null,
): import('../../entities/prompt-iteration/types').CyclePhase {
  const combined = (analysis + '\n' + nextStep).toLowerCase()

  // Explicit "done" / "review-ready" signals
  const reviewKeywords = [
    'definition of done.*met',
    'dod.*met',
    'all.*tests.*pass',
    'ready.*for.*review',
    'ready to review',
    'task.*complete',
    'mark.*done',
    'can be marked done',
  ]
  if (reviewKeywords.some((kw) => new RegExp(kw).test(combined))) return 'review'

  // If tests are present and there is no new T-xxx to jump to → suggest review
  if (hasTests && prevTaskId && (!nextTaskId || nextTaskId === prevTaskId)) return 'review'

  // Response suggests picking from the task backlog (no concrete next task)
  if (combined.includes('check docs/tasks') || combined.includes('pick the next task')) return 'tasks'

  // Default: continue Code+Tests (new task or missing tests)
  return 'code_and_tests'
}

function extractTaskIds(text: string): string[] {
  const matches = text.match(/T-\d{3,}/g) ?? []
  return [...new Set(matches)]
}

function extractFirstTaskId(text: string): string | null {
  return text.match(/T-\d{3,}/)?.[0] ?? null
}

function detectTestFiles(changedFiles: string[], rawText: string): boolean {
  const testExtPattern = /\.(test|spec)\.(ts|tsx|js|jsx)$/
  if (changedFiles.some((f) => testExtPattern.test(f))) return true
  // also check for [TEST] markers or .test. / .spec. mentions in the raw section text
  return rawText.toLowerCase().includes('.test.') || rawText.toLowerCase().includes('.spec.')
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const mockPromptService = {
  async generateFirstPrompt(
    spec: SpecPack,
    arch: ArchitectureDraft,
    projectType: ProjectType,
    projectId: string,
    promptId: string,
    taskId: string | null,
    taskDescription: string | null,
  ): Promise<PromptIteration> {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const kind = projectTypeLabel(projectType)
    const stack = arch.recommendedStack.map((s) => `${s.name} — ${s.role}`).join('\n')
    const phase = arch.roadmapPhases[0]

    const mustHaveFeatures = spec.featureList
      .filter((f) => f.priority === 'must')
      .map((f) => `- **${f.name}** (${f.id}): ${f.description}`)
      .join('\n')

    const constraints = spec.constraints.map((c) => `- ${c}`).join('\n')
    const phaseGoals = phase.goals.map((g) => `- ${g}`).join('\n')

    const taskDescLine = taskDescription ? `\nОписание задачи: ${taskDescription}` : ''
    const taskSection = taskId
      ? `## Целевая задача: ${taskId}${taskDescLine}
Прочитай Definition of Done для **${taskId}** в docs/tasks.md.
Это твой точный скоуп для данной итерации — не реализуй другие задачи.
Ссылайся на **${taskId}** и родительский F-xxx ID фичи в каждом разделе ответа.

Подход (в этом порядке):
1. Сначала опиши тесты для ${taskId} — что будешь проверять?
2. Реализуй ${taskId}, чтобы тесты прошли.
3. Напиши краткое саморевью — удовлетворяет ли реализация Definition of Done?`
      : `## Целевая задача
Найди первую незавершённую запись T-xxx в docs/tasks.md для Фазы ${phase.phase}.
Прочитай её Definition of Done перед написанием кода.
Ссылайся на T-xxx и F-xxx ID в ответе везде, где применимо.`

    const promptText = `Ты — старший full-stack инженер, создающий ${kind}.

## Контекст проекта
Проект: ${spec.productSummary}
Тип: ${kind}
Стадия: Код + Тесты (цикл Superpowers — Стадия 5 из 6)

${DOCS_SECTION}

${typeAwareGuidance(projectType)}

## Стек
${stack}

## Фаза ${phase.phase}: ${phase.title}
Цели:
${phaseGoals}
Оценочная сложность: ${phase.estimatedComplexity}

${taskSection}

## Скоуп MVP
${spec.MVPScope}

## Обязательные фичи (эта фаза)
${mustHaveFeatures}

## Ограничения
${constraints}

${TDD_RULE}

${RESPONSE_FORMAT}`

    return {
      id: promptId,
      projectId,
      iterationNumber: 1,
      promptText,
      claudeResponseRaw: null,
      parsedSummary: null,
      recommendedNextStep: null,
      status: 'draft',
      createdAt: new Date().toISOString(),
      projectType,
      cyclePhase: 'code_and_tests',
      targetTaskId: taskId,
      roadmapPhaseNumber: phase.phase,
    }
  },

  parseClaudeResponse(raw: string): ParsedClaudeResponse {
    // Structured response parser — looks for numbered section headers
    const sections: Record<string, string> = {}
    const sectionPatterns = [
      { key: 'analysis', patterns: ['1. Brief analysis', '## 1.', '**1.'] },
      { key: 'plan', patterns: ['2. Implementation plan', '## 2.', '**2.'] },
      { key: 'files', patterns: ['3. Files created', '## 3.', '**3.'] },
      { key: 'implementation', patterns: ['4. Implementation', '## 4.', '**4.'] },
      { key: 'next', patterns: ['5. Recommended next', '5. What is recommended next', '## 5.', '**5.'] },
    ]

    const lines = raw.split('\n')
    let currentKey: string | null = null

    for (const line of lines) {
      const match = sectionPatterns.find((s) => s.patterns.some((p) => line.includes(p)))
      if (match) {
        currentKey = match.key
        sections[currentKey] = ''
      } else if (currentKey) {
        sections[currentKey] = (sections[currentKey] || '') + line + '\n'
      }
    }

    const warnings: string[] = []
    if (!sections.analysis) warnings.push('Не удалось распарсить раздел "Краткий анализ".')
    if (!sections.next) warnings.push('Не удалось распарсить раздел "Рекомендуемый следующий шаг".')

    // Extract file names from files section
    const changedFiles: string[] = []
    if (sections.files) {
      // Match backtick-quoted paths
      const backtickFiles = sections.files.match(/`([^`]+\.[a-z]{2,4})`/g)
      if (backtickFiles) changedFiles.push(...backtickFiles.map((f) => f.replace(/`/g, '')))
      // Also match [TEST] prefixed entries
      const testMarked = sections.files.match(/\[TEST\]\s+(\S+)/g)
      if (testMarked) {
        testMarked.forEach((m) => {
          const path = m.replace(/\[TEST\]\s+/, '')
          if (!changedFiles.includes(path)) changedFiles.push(path)
        })
      }
    }

    // Cycle-awareness: detect test files
    const hasTests = detectTestFiles(changedFiles, sections.files ?? '')

    if (!hasTests) {
      warnings.push(
        'Тестовые файлы не обнаружены в этом ответе. Следующий промпт запросит недостающие тесты перед продолжением.'
      )
    }

    // Extract T-xxx task IDs from the full response
    const implementedTaskIds = extractTaskIds(
      (sections.analysis ?? '') + (sections.plan ?? '') + (sections.implementation ?? '')
    )

    // Extract the first T-xxx mentioned in the "next step" section
    const nextTaskId = extractFirstTaskId(sections.next ?? '')

    // Infer which cycle phase the project should move to next.
    // prevTaskId is not available here (parser is pure); the caller may refine
    // this further, but the text-based signal is sufficient for the UI hint.
    const prevTaskId = extractFirstTaskId(
      (sections.analysis ?? '') + (sections.plan ?? '')
    )
    const inferredNextPhase = inferNextPhase(
      sections.analysis ?? '',
      sections.next ?? '',
      hasTests,
      nextTaskId,
      prevTaskId,
    )

    return {
      analysis: sections.analysis?.trim() || raw.slice(0, 500),
      plan: sections.plan?.trim() || '',
      changedFiles,
      implementationSummary: sections.implementation?.trim() || '',
      nextStep: sections.next?.trim() || '',
      warnings,
      hasTests,
      implementedTaskIds,
      nextTaskId,
      inferredNextPhase,
    }
  },

  async generateNextPrompt(
    previousIteration: PromptIteration,
    parsedResponse: ParsedClaudeResponse,
    projectType: ProjectType,
    projectId: string,
    promptId: string,
    nextIterationNumber: number,
    targetPhase: 'code_and_tests' | 'review' = 'code_and_tests',
  ): Promise<PromptIteration> {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const kind = projectTypeLabel(projectType)
    const isReviewPhase = targetPhase === 'review'
    const prevTaskId = previousIteration.targetTaskId

    const missingTestsWarning = !parsedResponse.hasTests && !isReviewPhase
      ? `\n## ⚠️ Отсутствующие тесты из итерации #${previousIteration.iterationNumber}
Предыдущая итерация не включала тестовые файлы. Перед продолжением к новым фичам:
1. Проверь, что было реализовано в итерации #${previousIteration.iterationNumber}.
2. Сначала напиши недостающие тесты.
3. Только затем переходи к следующей задаче.
Это правило Код (+Тесты) — тесты не опциональны.\n`
      : ''

    const nextTaskId = parsedResponse.nextTaskId ?? prevTaskId
    const taskRef = isReviewPhase
      ? `## Задача Review: ${prevTaskId ?? 'предыдущая задача'}
Проверь реализацию **${prevTaskId ?? 'предыдущей задачи'}** по:
- Definition of Done в docs/tasks.md
- Критериям приёмки в docs/user-stories.md
- Правилу TDD — убедись, что тестовые файлы существуют и покрывают нетривиальные пути

Отчёт: что выполнено, какие пробелы остались, и можно ли задачу отметить выполненной.`
      : nextTaskId
        ? `## Следующая целевая задача: ${nextTaskId}
Прочитай Definition of Done для **${nextTaskId}** в docs/tasks.md.
Это твой точный скоуп — не реализуй другие задачи в этом промпте.
Ссылайся на **${nextTaskId}** и родительский F-xxx ID фичи по всему ответу.

Подход (в этом порядке):
1. Сначала опиши тесты для ${nextTaskId}.
2. Реализуй ${nextTaskId}, чтобы тесты прошли.
3. Напиши краткое саморевью — удовлетворяет ли реализация Definition of Done?`
        : `## Следующая целевая задача
Проверь docs/tasks.md на предмет следующей незавершённой задачи T-xxx.
Прочитай её Definition of Done перед написанием кода.`

    const implementedIds = parsedResponse.implementedTaskIds.length > 0
      ? `Задачи, упомянутые в итерации #${previousIteration.iterationNumber}: ${parsedResponse.implementedTaskIds.join(', ')}`
      : ''

    const changedFilesList = parsedResponse.changedFiles.length > 0
      ? parsedResponse.changedFiles.map((f) => `- ${f}`).join('\n')
      : 'Не указаны'

    const stageLabel = isReviewPhase
      ? 'Review (цикл Superpowers — Стадия 6 из 6)'
      : 'Код + Тесты (цикл Superpowers — Стадия 5 из 6)'

    const promptText = `Ты — старший full-stack инженер, продолжающий реализацию ${kind}.

## Контекст проекта
Стадия: ${stageLabel}
Тип: ${kind}
${implementedIds}
${missingTestsWarning}
${typeAwareGuidance(projectType)}

## Что было реализовано — итерация #${previousIteration.iterationNumber}
${parsedResponse.implementationSummary || 'Смотри предыдущий ответ.'}

## Изменённые файлы в итерации #${previousIteration.iterationNumber}
${changedFilesList}
${parsedResponse.hasTests ? '✓ Тесты были включены в предыдущую итерацию.' : '⚠️ Тестовые файлы не обнаружены в предыдущей итерации (см. выше).'}

## Рекомендуемый следующий шаг (из итерации #${previousIteration.iterationNumber})
${parsedResponse.nextStep || previousIteration.recommendedNextStep || 'Продолжай реализацию — проверь docs/tasks.md.'}

${taskRef}

## Правило
Один промпт = одна задача. Не рефактори то, что уже работает. Не строй вперёд текущей задачи.

${isReviewPhase ? '' : TDD_RULE + '\n\n'}${RESPONSE_FORMAT}`

    return {
      id: promptId,
      projectId,
      iterationNumber: nextIterationNumber,
      promptText,
      claudeResponseRaw: null,
      parsedSummary: null,
      recommendedNextStep: null,
      status: 'draft',
      createdAt: new Date().toISOString(),
      projectType,
      cyclePhase: targetPhase,
      targetTaskId: isReviewPhase ? prevTaskId : nextTaskId,
      roadmapPhaseNumber: previousIteration.roadmapPhaseNumber,
    }
  },
}

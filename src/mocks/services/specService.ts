import type { ResearchBrief, SpecPack, ArchitectureDraft, ProjectType } from '../../shared/types'

// ─── Mock spec generation service ────────────────────────────────────────────
// Generates spec and architecture drafts from a research brief and project type.
// Replace with real AI-powered generation in Phase 3.
// implements F-005, F-006, F-025 / T-105, T-205

// ─── Application mock fixtures ────────────────────────────────────────────────

const applicationSpecFeatures: SpecPack['featureList'] = [
  { id: 'f-001', name: 'Онбординг пользователя', description: 'Форма регистрации / входа с чётким руководством при первом использовании и пустым дашбордом.', priority: 'must' },
  { id: 'f-002', name: 'Управление данными', description: 'Создание, просмотр, редактирование и удаление основных сущностей приложения.', priority: 'must' },
  { id: 'f-003', name: 'Дашборд / обзор', description: 'Сводный вид текущего состояния пользователя, ключевых метрик и ожидающих действий.', priority: 'must' },
  { id: 'f-004', name: 'Навигация', description: 'Боковое меню или нижняя навигация между основными разделами; хлебные крошки для вложенных потоков.', priority: 'must' },
  { id: 'f-005', name: 'Настройки пользователя', description: 'Экран профиля и настроек; возможность обновить данные аккаунта.', priority: 'should' },
  { id: 'f-006', name: 'Уведомления', description: 'Обратная связь в приложении (тосты, баннеры) для асинхронных действий, ошибок и важных изменений состояния.', priority: 'should' },
  { id: 'f-007', name: 'Поиск и фильтрация', description: 'Фильтрация или поиск по списку основных сущностей по имени, статусу или дате.', priority: 'should' },
  { id: 'f-008', name: 'Экспорт / шаринг', description: 'Экспорт ключевых данных в CSV, JSON или Markdown; опциональная ссылка только для чтения.', priority: 'could' },
  { id: 'f-009', name: 'Горячие клавиши', description: 'Клавиатурные сокращения для создания, навигации и отправки.', priority: 'could' },
  { id: 'f-010', name: 'Совместная работа', description: 'Приглашение участников команды, общие рабочие пространства, права доступа по ролям.', priority: 'wont' },
]

const applicationArchStack: ArchitectureDraft['recommendedStack'] = [
  { name: 'React', role: 'UI-слой', rationale: 'Компонентный SPA с сильной экосистемой; идеален для интерактивных приложений' },
  { name: 'TypeScript', role: 'Типобезопасность', rationale: 'Предотвращает ошибки в рантайме, самодокументирующиеся доменные модели' },
  { name: 'Vite', role: 'Инструмент сборки', rationale: 'Быстрый HMR, лёгкий бандл, без конфигурации для React + TypeScript' },
  { name: 'Zustand', role: 'Управление состоянием', rationale: 'Лёгкий стор со встроенной персистентностью; меньше шаблонного кода чем Redux' },
  { name: 'React Router', role: 'Клиентская маршрутизация', rationale: 'Декларативная SPA-маршрутизация с вложенными лейаутами' },
  { name: 'Tailwind CSS', role: 'Стилизация', rationale: 'Утилитарный подход, адаптивный, консистентная дизайн-система без накладных расходов CSS' },
]

const applicationRoadmap: ArchitectureDraft['roadmapPhases'] = [
  {
    phase: 0,
    title: 'Фундамент',
    goals: ['Оболочка приложения', 'Маршрутизация', 'Лейаут и навигация', 'Стор состояния', 'Типизированные модели', 'Mock-данные'],
    estimatedComplexity: 'low',
  },
  {
    phase: 1,
    title: 'Основной поток',
    goals: ['Экран онбординга', 'Список основных сущностей', 'Форма создания/редактирования', 'Удаление с подтверждением'],
    estimatedComplexity: 'medium',
  },
  {
    phase: 2,
    title: 'Дашборд и навигация',
    goals: ['Сводный дашборд', 'Навигация', 'Хлебные крошки', 'Пустые состояния'],
    estimatedComplexity: 'medium',
  },
  {
    phase: 3,
    title: 'Поиск, фильтры и настройки',
    goals: ['Фильтрация сущностей', 'Строка поиска', 'Страница настроек', 'Тост-уведомления'],
    estimatedComplexity: 'medium',
  },
  {
    phase: 4,
    title: 'Полировка и экспорт',
    goals: ['Экспорт в CSV/JSON', 'Горячие клавиши', 'Границы ошибок', 'Аудит производительности'],
    estimatedComplexity: 'high',
  },
]

// ─── Website mock fixtures ────────────────────────────────────────────────────

const websiteSpecFeatures: SpecPack['featureList'] = [
  { id: 'f-001', name: 'Главная страница', description: 'Герой-секция с ценностным предложением, CTA и ключевыми преимуществами.', priority: 'must' },
  { id: 'f-002', name: 'Контентные страницы', description: 'Страницы «О нас», услуги/продукт и любые статические информационные страницы.', priority: 'must' },
  { id: 'f-003', name: 'Блог / статьи', description: 'Список статей на Markdown и страницы статей с SEO-метаданными.', priority: 'must' },
  { id: 'f-004', name: 'Контактная форма', description: 'Простая форма для отправки запроса по email через serverless-функцию.', priority: 'should' },
  { id: 'f-005', name: 'SEO-оптимизация', description: 'Мета-теги для каждой страницы, Open Graph и генерация sitemap.xml.', priority: 'should' },
  { id: 'f-006', name: 'Тёмная тема', description: 'Цветовая схема с учётом системных настроек и ручным переключением.', priority: 'could' },
  { id: 'f-007', name: 'Интеграция CMS', description: 'Замена markdown-файлов на headless CMS (например, Contentful).', priority: 'could' },
  { id: 'f-008', name: 'Аналитика', description: 'Отслеживание просмотров страниц без нарушения конфиденциальности.', priority: 'could' },
  { id: 'f-009', name: 'Мультиязычность', description: 'Поддержка i18n для дополнительных локалей.', priority: 'wont' },
]

const websiteArchStack: ArchitectureDraft['recommendedStack'] = [
  { name: 'Next.js', role: 'Фреймворк', rationale: 'SSR/SSG для SEO, файловая маршрутизация, встроенная оптимизация изображений, идеален для контентных сайтов' },
  { name: 'TypeScript', role: 'Типобезопасность', rationale: 'Предотвращает ошибки в рантайме, самодокументирующиеся пропсы страниц и API-роуты' },
  { name: 'Tailwind CSS', role: 'Стилизация', rationale: 'Утилитарный подход, адаптивный, консистентная дизайн-система с минимальным CSS overhead' },
  { name: 'MDX', role: 'Создание контента', rationale: 'Markdown + JSX позволяет писать контент без CMS в V1; легко заменить позже' },
  { name: 'Vercel', role: 'Хостинг / деплой', rationale: 'Деплой Next.js без настройки, глобальный CDN, автоматические preview URL, бесплатный тариф' },
]

const websiteRoadmap: ArchitectureDraft['roadmapPhases'] = [
  {
    phase: 0,
    title: 'Фундамент',
    goals: ['Скаффолд Next.js', 'Настройка Tailwind', 'Оболочка лейаута', 'Навигация', 'Тёмная тема'],
    estimatedComplexity: 'low',
  },
  {
    phase: 1,
    title: 'Основные страницы',
    goals: ['Главная страница', 'Страница «О нас»', 'Шаблон контентной страницы', 'MDX-пайплайн'],
    estimatedComplexity: 'low',
  },
  {
    phase: 2,
    title: 'Блог',
    goals: ['Страница списка статей', 'Страница статьи', 'Фильтрация по тегам', 'RSS-лента'],
    estimatedComplexity: 'medium',
  },
  {
    phase: 3,
    title: 'SEO и контакты',
    goals: ['Мета-теги для страниц', 'Изображения Open Graph', 'Sitemap.xml', 'Контактная форма + serverless-обработчик'],
    estimatedComplexity: 'medium',
  },
  {
    phase: 4,
    title: 'Полировка и CMS',
    goals: ['Интеграция аналитики', 'Аудит производительности', 'Опциональный адаптер headless CMS'],
    estimatedComplexity: 'high',
  },
]

// ─── Service ──────────────────────────────────────────────────────────────────

export const mockSpecService = {
  async generateSpec(brief: ResearchBrief, projectType: ProjectType): Promise<SpecPack> {
    await new Promise((resolve) => setTimeout(resolve, 1200))

    if (projectType === 'website') {
      return {
        projectType: 'website',
        productSummary:
          brief.valueHypothesis
            ? `Контентный сайт: ${brief.valueHypothesis}`
            : 'Быстрый SEO-оптимизированный сайт с блогом, статическими страницами и контактной формой. Создан для удобства контент-авторов и высокой видимости в поиске.',
        MVPScope:
          brief.recommendedMVP ||
          'Главная страница, страница «О нас», блог на Markdown и контактная форма. Без CMS, без аутентификации, без e-commerce в V1.',
        featureList: websiteSpecFeatures,
        assumptions: [
          'Контент создаётся разработчиками в MDX для V1',
          'База данных не требуется для V1 — весь контент файловый',
          'Контактная форма использует serverless-функцию; без бэкенд-сервера',
          ...(brief.targetUsers?.slice(0, 2).map((u) => `Целевая аудитория: ${u}`) ?? []),
        ],
        constraints: [
          'Без аутентификации',
          'Без базы данных в MVP',
          'Без e-commerce',
          'Оценка Lighthouse ≥ 90 на мобильных',
        ],
        acceptanceNotes:
          'Посетитель может перейти с главной страницы в блог, открыть статью и заполнить контактную форму — весь основной контент доступен без JavaScript (SSG).',
      }
    }

    // application
    return {
      projectType: 'application',
      productSummary: brief.valueHypothesis
        ? `Приложение: ${brief.valueHypothesis}`
        : 'Интерактивное веб-приложение с онбордингом пользователя, управлением основными сущностями и дашбордом.',
      MVPScope:
        brief.recommendedMVP ||
        'Однопользовательский режим. Онбординг, CRUD основных сущностей, обзор на дашборде. Без совместной работы, биллинга и экспорта в V1.',
      featureList: applicationSpecFeatures,
      assumptions: [
        'Пользователи работают преимущественно через десктопный или планшетный браузер',
        'Совместная работа в реальном времени не требуется в V1',
        'Локальная персистентность достаточна для однопользовательского MVP',
        ...(brief.targetUsers?.slice(0, 2).map((u) => `Целевая аудитория: ${u}`) ?? []),
      ],
      constraints: [
        'Без серверного бэкенда в MVP — только клиент с локальным хранилищем',
        'Без аутентификации в V1',
        'Без биллинга',
        'Должно работать на мобильных (адаптивная вёрстка)',
      ],
      acceptanceNotes:
        'Пользователь может пройти онбординг, создать и управлять основными сущностями, видеть сводку на дашборде и вернуться к своим данным после перезагрузки страницы.',
    }
  },

  async generateArchitecture(_spec: SpecPack, projectType: ProjectType): Promise<ArchitectureDraft> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (projectType === 'website') {
      return {
        projectType: 'website',
        recommendedStack: websiteArchStack,
        moduleArchitecture:
          'Next.js app router: оболочка app/ → страницы pages/ → компоненты components/ → контент MDX-файлов content/ → утилиты lib/. Без базы данных в V1 — контент берётся из Markdown-файлов в репозитории.',
        dataFlow:
          'Статический контент при сборке: MDX-файлы → @next/mdx → статические HTML-страницы. Динамические пути (контактная форма) через API-роуты Next.js, задеплоенные как Vercel serverless-функции.',
        roadmapPhases: websiteRoadmap,
        technicalRisks: [
          'Время сборки MDX растёт с объёмом контента — запланировать инкрементальную статическую регенерацию при > 500 постах',
          'Serverless-функция контактной формы требует переменных окружения для email-провайдера — задокументировать настройку',
          'SEO зависит от корректных канонических URL и мета-тегов — проверить через Lighthouse перед запуском',
          'Переход на headless CMS потребует миграции контента — держать MDX-схему простой и консистентной',
        ],
      }
    }

    // application
    return {
      projectType: 'application',
      recommendedStack: applicationArchStack,
      moduleArchitecture:
        'Фиче-слайс архитектура: оболочка приложения → страницы → модули фич → доменные сущности → общие утилиты. Состояние в Zustand-сторах; компоненты чистые, получают данные через пропсы или селекторы стора.',
      dataFlow:
        'Действие пользователя → экшен стора → обновление состояния → перерисовка UI. Асинхронные операции проходят через адаптеры сервисов, возвращающие типизированные результаты в стор. Нет прямых API-вызовов из компонентов.',
      roadmapPhases: applicationRoadmap,
      technicalRisks: [
        'Лимит localStorage (~5МБ) может быть исчерпан на больших списках сущностей — запланировать IndexedDB',
        'Только клиентская персистентность: данные теряются при очистке хранилища браузера — предупреждать пользователей',
        'Без аутентификации в V1 нельзя делиться данными; добавление позже потребует рефакторинга маршрутизации',
        'SPA-маршрутизация требует fallback-правила на сервере (404 → index.html) для продакшен-деплоя',
      ],
    }
  },
}

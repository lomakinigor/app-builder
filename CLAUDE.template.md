# CLAUDE.md
<!--
  ШАБЛОН ДЛЯ НОВЫХ ПРОЕКТОВ, создаваемых через AI Product Studio.

  Как использовать:
  1. Скопируй этот файл как CLAUDE.md в корень нового репозитория.
  2. Заполни разделы "Project identity" и "Product workflow" под конкретный проект.
  3. Оставь раздел "Память – КРИТИЧЕСКИ ВАЖНО" без изменений — он универсален.
  4. Удали этот комментарий перед первым коммитом.
-->

## Project identity
<!-- Заполни: название продукта, краткое описание, что он делает и для кого. -->
Product name: …

…

## Core principle
Do not try to build the full product at once.
Always work in small, auditable steps.
One prompt = one task.
First analyze, then plan, then implement.
Prefer safe MVP choices when requirements are ambiguous.

## Superpowers cycle
Every project follows this cycle:

  Brainstorm → Spec → Plan → Tasks → Code (+Tests) → Review

Rules that govern this cycle:
1. No code is written before a plan exists and at least one test task is defined for the work.
2. Every human or AI action must be grounded in a document in docs/*.
3. Every implementation change should reference the relevant feature ID (F-xxx) and task ID (T-xxx) where applicable.
4. Review means checking the output against the original spec and test criteria — not just that the code runs.

## Implementation rules
Before coding:
1. Read docs/PRD.md
2. Read docs/features.md
3. Read docs/plan.md
4. Read docs/tech-spec.md
5. Read docs/data-model.md
6. Read docs/user-stories.md
7. Read docs/tasks.md

For each implementation task:
1. Briefly analyze constraints
2. Propose a short plan — do not write code until this step is confirmed
3. List files to create/change
4. Confirm at least one test task or acceptance criterion exists before writing code
5. Implement only the requested scope
6. Explain what was done, referencing F-xxx feature IDs and T-xxx task IDs where applicable
7. Propose the next best step

Every implementation comment, commit message, or explanation that touches a defined feature or task must include the relevant ID (e.g. "implements F-003 / T-007").

## Required response format
Always answer in this format:

1. Brief analysis
2. Implementation plan
3. Files created/changed
4. Implementation
5. What is recommended next

## Safety
When something is unclear:
- choose the smallest safe MVP approach,
- document assumptions,
- do not invent hidden complex infrastructure unless explicitly needed.

---

## Память – КРИТИЧЕСКИ ВАЖНО

Без памяти ты бесполезен. Каждая сессия без записей = потерянный контекст.

### Хранилище
- MEMORY.md – долгосрочная (факты, проекты, предпочтения, решения)
- memory/YYYY-MM-DD.md – дневник дня (задачи, прогресс, решения)
- knowledge/ – база знаний (архитектура, баги, чеклисты)

### При старте КАЖДОЙ сессии – ОБЯЗАТЕЛЬНО (не пропускай!):
1. Прочитай MEMORY.md
2. Прочитай memory/ за последние 3 дня
3. Создай файл memory/YYYY-MM-DD.md если его ещё нет сегодня. Запиши: дату, время старта, тему сессии
4. Если папок memory/ или knowledge/ не существует – создай их

### Во время работы – ОБЯЗАТЕЛЬНО:
- Каждые 5 сообщений – дописывай итог в memory/YYYY-MM-DD.md
- Новый постоянный факт (проект, предпочтение, решение) – сразу в MEMORY.md
- Моя правка/коррекция – сохрани в memory/feedback_тема.md
- Одинаковый вопрос 2+ раза – сохрани ответ в knowledge/
- После создания/правки файла – запиши в дневник что сделал

### Перед завершением сессии:
- Допиши в memory/YYYY-MM-DD.md итог: что сделали, что осталось, ключевые решения
- Если узнал новые факты – обнови MEMORY.md

### Формат дневника (memory/YYYY-MM-DD.md):
```
# YYYY-MM-DD

## Сессия 1 (HH:MM)
Тема: ...

### Сделано
- ...

### Решения
- ...

### TODO на потом
- ...
```

### MEMORY.md:
- Максимум 200 строк. Если больше – удали устаревшее, объедини дубли
- Структура: Клиент → Проекты → Стек → Предпочтения → Ссылки

### knowledge/:
- Архитектура проектов
- Решения багов которые могут повториться
- Чеклисты и инструкции

### Самопроверка:
Если ты провёл 10+ сообщений и НЕ записал ничего в memory/ – ты нарушил правила. Остановись и запиши прямо сейчас.

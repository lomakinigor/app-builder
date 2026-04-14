// ─── Gate diagnostic messages ─────────────────────────────────────────────────
// Maps stable diagnostic codes (SPEC_DIAG, ARCH_DIAG, PROMPT_LOOP_DIAG) to
// structured UI text for gate hint panels, History indicators, and Review page.
//
// Implements T-017: single source-of-truth for all gate blocking copy.
//
// Usage:
//   const msg = resolveGateDiagnostic(SPEC_DIAG.NO_FEATURES)
//   // → { label: 'Список фич пуст.', hint: 'Добавьте хотя бы одну фичу …' }
//
// Design contract:
//   - `label` is always set — safe to use directly in UI.
//   - `hint` is an optional actionable next step (may be undefined for trivial cases).
//   - Unknown codes get a safe fallback — never throw.

import { SPEC_DIAG, ARCH_DIAG, PROMPT_LOOP_DIAG } from './stageGates'

export interface GateDiagnosticMessage {
  /** Short description of the blocking condition. */
  label: string
  /** Actionable next step for the user. */
  hint?: string
}

const DIAGNOSTIC_MESSAGES: Record<string, GateDiagnosticMessage> = {
  // ── Spec ──────────────────────────────────────────────────────────────────
  [SPEC_DIAG.NO_SPEC]: {
    label: 'Спецификация не создана.',
    hint: 'Сгенерируйте спецификацию на странице «Спецификация».',
  },
  [SPEC_DIAG.EMPTY_SUMMARY]: {
    label: 'Резюме продукта не заполнено.',
    hint: 'Заполните краткое описание продукта в разделе «Резюме».',
  },
  [SPEC_DIAG.EMPTY_MVP_SCOPE]: {
    label: 'Скоуп MVP не определён.',
    hint: 'Опишите, что входит в MVP, в разделе «Скоуп MVP».',
  },
  [SPEC_DIAG.NO_FEATURES]: {
    label: 'Список фич пуст.',
    hint: 'Добавьте хотя бы одну фичу в раздел «Фичи MVP».',
  },
  [SPEC_DIAG.MISSING_PROJECT_TYPE]: {
    label: 'Тип проекта не задан в спецификации.',
    hint: 'Пересгенерируйте спецификацию.',
  },

  // ── Architecture ──────────────────────────────────────────────────────────
  [ARCH_DIAG.NO_ARCH]: {
    label: 'Архитектура не создана.',
    hint: 'Сгенерируйте архитектуру на странице «Архитектура».',
  },
  [ARCH_DIAG.EMPTY_STACK]: {
    label: 'Технический стек не определён.',
    hint: 'Добавьте хотя бы один элемент стека.',
  },
  [ARCH_DIAG.EMPTY_ROADMAP]: {
    label: 'Дорожная карта не содержит фаз.',
    hint: 'Добавьте хотя бы одну фазу реализации.',
  },
  [ARCH_DIAG.MISSING_PROJECT_TYPE]: {
    label: 'Тип проекта не задан в архитектуре.',
    hint: 'Пересгенерируйте архитектуру.',
  },

  // ── Prompt Loop ───────────────────────────────────────────────────────────
  [PROMPT_LOOP_DIAG.NO_ITERATION]: {
    label: 'Нет завершённой итерации.',
    hint: 'Запустите хотя бы один цикл промптов.',
  },
  [PROMPT_LOOP_DIAG.NO_PARSED_SUMMARY]: {
    label: 'Итерация не распарсена.',
    hint: 'Вставьте ответ Claude и нажмите «Распарсить ответ».',
  },
  [PROMPT_LOOP_DIAG.NO_TESTS]: {
    label: 'Тесты не обнаружены в последнем ответе.',
    hint: 'Следующий промпт должен явно требовать написание тестов.',
  },
  [PROMPT_LOOP_DIAG.PARSE_WARNINGS]: {
    label: 'Ответ Claude распознан не полностью.',
    hint: 'Сделайте ещё один цикл и попросите более структурированный ответ.',
  },
  [PROMPT_LOOP_DIAG.NOT_REVIEW_PHASE]: {
    label: 'Задача ещё не готова к ревью.',
    hint: 'Завершите текущую задачу перед переходом к этапу ревью.',
  },
  [PROMPT_LOOP_DIAG.NO_TARGET_TASK]: {
    label: 'Задача для ревью не указана.',
    hint: 'Укажите T-xxx в поле «ID стартовой задачи» при генерации промпта.',
  },
}

/**
 * Resolve a diagnostic code to structured UI text.
 * Returns a safe fallback for unknown codes — never throws.
 */
export function resolveGateDiagnostic(code: string): GateDiagnosticMessage {
  return DIAGNOSTIC_MESSAGES[code] ?? { label: `Переход заблокирован (${code}).` }
}

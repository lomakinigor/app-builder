import { useSettingsStore } from '../../app/store/settingsStore'
import { playTestBeep } from '../../shared/lib/attentionSignal'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Card, CardHeader } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'

// ─── Toggle ───────────────────────────────────────────────────────────────────
// Accessible pill switch: <button role="switch" aria-checked>.
// Styled with Tailwind — violet when on, zinc when off.

interface ToggleProps {
  id: string
  checked: boolean
  onChange: (next: boolean) => void
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

function Toggle({ id, checked, onChange, ...aria }: ToggleProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
        checked
          ? 'bg-violet-600'
          : 'bg-zinc-300 dark:bg-zinc-600',
      ].join(' ')}
      {...aria}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
      <span className="sr-only">{checked ? 'Включено' : 'Выключено'}</span>
    </button>
  )
}

// ─── Setting row ──────────────────────────────────────────────────────────────

interface SettingRowProps {
  labelId: string
  descId: string
  label: string
  description: string
  children: React.ReactNode
}

function SettingRow({ labelId, descId, label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p id={labelId} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {label}
        </p>
        <p id={descId} className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { soundNotificationsEnabled, setSoundNotificationsEnabled } = useSettingsStore()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки"
        icon="⚙️"
        description="Управление поведением и предпочтениями приложения."
      />

      {/* Notifications section */}
      <Card>
        <CardHeader title="Уведомления" icon="🔔" />

        <div className="space-y-5">
          <SettingRow
            labelId="sound-notifications-label"
            descId="sound-notifications-desc"
            label="Звуковые уведомления"
            description="Короткий сигнал при ожидании подтверждения и после завершения задачи."
          >
            <Toggle
              id="sound-notifications-toggle"
              checked={soundNotificationsEnabled}
              onChange={setSoundNotificationsEnabled}
              aria-labelledby="sound-notifications-label"
              aria-describedby="sound-notifications-desc"
            />
          </SettingRow>

          {/* Disabled helper */}
          {!soundNotificationsEnabled && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Визуальные индикаторы продолжат работать.
            </p>
          )}

          {/* Preview button */}
          {soundNotificationsEnabled && (
            <div className="flex items-center gap-3 pt-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={playTestBeep}
              >
                Проверить звук
              </Button>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                Один короткий сигнал
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

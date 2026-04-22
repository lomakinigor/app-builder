// Feature flags — read from Vite env vars.
// Add new flags here as the product grows.
//
// Rollout defaults:
//   local dev:   set VITE_FEATURE_SHARING=true in .env.local to enable
//   staging:     VITE_FEATURE_SHARING=true (set in CI/deploy config)
//   production:  VITE_FEATURE_SHARING=false (default until backend is live)

export function isSharingEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_SHARING === 'true'
}

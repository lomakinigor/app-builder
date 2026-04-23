# Beta Readiness Checklist — T-410

Closed beta gate. Each item must be manually verified before inviting external users.

## Core product workflow

- [ ] Owner can create a new project and enter idea
- [ ] Owner can import or run research, produce a ResearchBrief
- [ ] Owner can generate Spec, Architecture, and first Prompt
- [ ] Owner can run the Prompt Loop and paste Claude responses
- [ ] Owner can mark tasks reviewed and complete the project
- [ ] Demo mode loads mock project end-to-end

## Sharing and collaboration

- [ ] Share button generates a share link and copies it to clipboard
- [ ] Share API failure shows a user-facing error (not silent)
- [ ] Shared link (`/shared/:shareId`) resolves and redirects to /history
- [ ] Invalid share token shows "Не удалось открыть ссылку" + home link
- [ ] Sharing-disabled state shows "Функция недоступна" when `VITE_FEATURE_SHARING` is off

## Invite and role model

- [ ] Owner can invite a collaborator by email after generating share link
- [ ] Invite email delivers to `/invite/:token` (staging only)
- [ ] InviteAcceptPage shows project name + role before accept
- [ ] Accepting invite sets correct viewingMode and redirects to /history
- [ ] Invalid/expired invite shows error with home link
- [ ] Transient accept failure shows retry button (not just "На главную")
- [ ] Viewer: ReadOnlyBanner shown; no generate buttons; no share button
- [ ] Editor: EditorBanner shown; generate buttons enabled; no share button
- [ ] Owner: no banner; all controls enabled including sharing

## Comments

- [ ] CommentsPanel loads existing comments on mount
- [ ] Owner and editor can submit comments
- [ ] Viewer sees comments but not the submit form ("Только для чтения")
- [ ] Comment submission error shows message; clears on retry
- [ ] Empty comment list shows "Комментариев пока нет"

## Collaborator management (owner-only)

- [ ] Collaborator panel shows list with role selector and revoke button
- [ ] Role change failure shows user-facing error
- [ ] Revoke failure shows user-facing error
- [ ] Empty collaborator state shows "Пока нет приглашённых участников"

## Error states

- [ ] All API errors produce readable messages in Russian (no raw stack traces)
- [ ] Network failure on share creation → share-error below button
- [ ] Network failure on invite → invite-error in panel
- [ ] Network failure on accept → retry button present if inviteInfo loaded

## Tests

- [ ] `npm test` passes — all unit/RTL/contract tests green
- [ ] Staging smoke configured and skips cleanly without `VITE_API_BASE_URL`
- [ ] `npm run test:e2e:staging:session` passes against real backend (when available)

## Known accepted limitations (post-beta)

- No staging backend yet — live integration cannot be verified without it
- Collaborators CRUD smoke (SMOKE-005) not written — backend not implemented
- Sharing audit trail smoke not written — backend not implemented
- No reply threads or @mentions in comments
- No email notification delivery (invite link must be shared manually)
- No auth/login — viewingMode is session-only (resets on reload)
- No advanced export or multi-user real-time collaboration

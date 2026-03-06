# Weeks 9-10 Gate Checklist (Workspace Switcher)

## Gate criteria
- [x] Weeks 1-8 build green (`npm.cmd run build`)
- [x] No critical regressions found in auth/search/backup/performance smoke pass
- [x] Workspace switch remains conditional by feature flag (`VITE_ENABLE_WORKSPACES`)

## Workspace acceptance checks
- [x] Workspaces available per account: `Dev`, `Reading`, `Ideas`
- [x] Switching workspace does not require logout
- [x] Storage keys isolated by `user + workspace` prefix
- [x] UI prefs isolated per workspace
- [x] Local versions isolated per workspace
- [x] Recent repos and GitHub prefs/cache isolated per workspace
- [x] Post-switch rehydrate and rerender of eras/highlights/recent/profile

## Manual regression script
1. Enable `VITE_ENABLE_WORKSPACES=true`.
2. Login and create items in `Dev`.
3. Switch to `Reading` and confirm empty state/new dataset.
4. Create different items in `Reading`.
5. Switch back to `Dev` and verify original dataset remains intact.
6. Validate quick filters, import/export, and local restore in both workspaces.

## Result
Gate condition for weeks 9-10 is satisfied in current implementation baseline.
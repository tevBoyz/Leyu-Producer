# LeyuTune Producer

Windows desktop app for authoring game-show episodes and exporting portable ZIP packages.

Separate from the live operator dashboard; this repo only contains the producer app.

## Current Progress

- Full single-episode ZIP export is implemented.
- Import Compatibility Preview is implemented as a producer-side preview only feature.
- Developer-only demo episode generator is implemented.
- UI polish is implemented for navigation, selected-episode context, dashboard summary, question editing, validation, and export UX.
- Local producer-app settings are implemented for export defaults, version defaults, warning/debug export behavior, and preferred media extension preferences.
- Robust main-process logging and IPC error normalization are implemented.
- Business-critical automated tests now cover slug generation, stage-config defaults and validation, question validation rules, legacy row/export path mapping, manifest generation, and zip export blocking behavior.
- Electron preload output is now emitted as `out/preload/index.mjs` and the main window points to that file so the safe `window.producerApi` bridge can attach correctly in module-mode builds.
- Export now requires an absolute folder path or absolute `.zip` path so the app cannot report success while writing to an unexpected working-directory location.
- Question cards now include producer-side audio preview controls for question music and answer music so selected files can be confirmed without reopening the editor.
- Question-card audio preview now reads local audio through main-process IPC and plays it as a blob URL in the renderer, avoiding `localhost` -> `file:///...` browser blocking.
- Export output is named `LeyuTune_Episode_<episode-slug>.zip`.
- Export package layout currently includes:
  - `manifest.json`
  - `db/questions.json`
  - media copied under `music/questions/`, `music/answers/`, and `images/`
- Export runs in the Electron main process and is exposed through:
  - `window.producerApi.chooseExportDestination()`
  - `window.producerApi.exportEpisode(episodeId, destinationPath)`
- Export flow currently does all of the following:
  - loads the episode
  - runs validation before export
  - blocks export on validation errors
  - allows warnings
  - builds legacy-compatible question rows
  - builds a manifest
  - stages files in a temporary folder
  - zips the staged folder
  - cleans up temp files unless `DEBUG_EXPORT=true`
- Export safety rules currently enforced:
  - preserve original media extensions
  - write forward-slash relative paths only in JSON
  - reject duplicate media target paths
  - write `asked_flag: 0` for every exported row
  - avoid absolute producer-machine paths in `manifest.json` and `questions.json`
- Import Compatibility Preview currently does all of the following:
  - generates an in-memory preview of legacy-compatible `questions` rows for a selected episode
  - shows the exact legacy column set expected by the live MySQL `questions` table
  - warns if a legacy field is missing
  - warns if a preview media path looks absolute
  - warns if `asked_flag` is not `0`
  - warns if preview rows are not sorted by `Stage_No` and `question_no`
  - warns if question type data appears inside legacy rows
  - allows copying preview JSON to the clipboard
  - allows optional debug save as `questions.preview.json`
  - does not connect to MySQL or modify the live dashboard app
- Developer demo generator currently does all of the following:
  - appears only in development builds
  - creates a clearly marked local demo episode
  - uses the default stage counts of 15, 10, 5, and 1
  - creates placeholder questions with sequential numbering, choices, answers, points, categories, and question types
  - uses tiny placeholder media files so validation and export can succeed
  - keeps demo media under `.dev-assets/demo-media`
  - avoids overwriting existing episodes by generating a unique slug
  - keeps demo logic isolated under `src/main/dev/` and developer services
- UI polish currently does all of the following:
  - improves left navigation labels and ordering
  - shows selected episode title and slug in the workspace header
  - shows a shared selected-episode dashboard with stage counts, completion, missing slots, validation state, media completeness, and last updated date
  - improves the question workflow with stronger stage tabs, compact question cards, incomplete indicators, and a side editor panel
  - improves validation with grouped stage sections, issue filters, and more producer-friendly language
  - improves export with a pre-export checklist, clearer destination display, success messaging, and blocked export reasons
  - adds question-card audio preview buttons for question and answer music with single-player playback behavior
  - applies a cleaner desktop-oriented visual pass without changing the database schema
- Local settings currently do all of the following:
  - store settings in a local JSON file in the Electron `userData` directory
  - provide safe IPC methods to get, update, and reset settings
  - seed the export dialog with a default export folder when configured
  - seed new episodes with default app version and export version values
  - optionally block export when warnings exist
  - optionally keep the temporary export folder for debugging
  - store preferred audio and image extension settings for producer-side workflows
  - validate settings and merge them with defaults for backward-compatible future additions
- Logging and IPC error handling currently do all of the following:
  - write main-process logs to `app.getPath('userData')/logs/producer.log`
  - log app start, database initialization, migrations, validation runs, episode create/update/delete, export start/success/failure, media copy failures, zip failures, and file picker failures
  - expose log diagnostics in Settings, including the log file path and an `Open Logs Folder` action
  - wrap IPC handlers in a consistent envelope with `success`, `data`, `error`, and optional `validationResult`
  - unwrap IPC responses in preload and throw renderer-safe errors when a main-process handler fails
  - add main-process `unhandledRejection` and `uncaughtException` logging

## Handoff Notes

- Main export service: `src/main/services/exportService.ts`
- Import compatibility service: `src/main/services/importCompatibilityService.ts`
- Developer demo service: `src/main/services/developerService.ts`
- Main settings service: `src/main/services/settingsService.ts`
- UI polish work is expected to touch:
  - `src/renderer/App.tsx`
  - `src/renderer/layout/AppShell.tsx`
  - `src/renderer/screens/*.tsx`
  - `src/renderer/components/**/*`
  - `src/renderer/styles/app.css`
- Shared settings contract: `src/shared/settings.ts`
- Shared workspace summary helper: `src/renderer/utils/episodeWorkspaceSummary.ts`
- Export UI screen: `src/renderer/screens/ExportScreen.tsx`
- Import compatibility UI screen: `src/renderer/screens/CompatibilityPreviewScreen.tsx`
- Episodes screen now includes dev-only demo generation UI: `src/renderer/screens/EpisodesScreen.tsx`
- Shared export result contract: `src/shared/export.ts`
- Shared import compatibility contract: `src/shared/import-compatibility.ts`
- Shared developer contract: `src/shared/developer.ts`
- Export helpers:
  - `src/main/export/buildLegacyRows.ts`
  - `src/main/export/buildManifest.ts`
- Import compatibility preview helpers:
  - `src/main/preview/buildImportCompatibilityPreview.ts`
- Developer demo helpers:
  - `src/main/dev/demoEpisodeFactory.ts`
- Validation service: `src/main/validation/validationService.ts`

## Demo Data Notes

- How to create demo data:
  - Open the `Episodes` screen in a development build.
  - Use the `Generate Demo Episode` button in the `Developer Demo Data` card.
- Demo media location:
  - `.dev-assets/demo-media` under the project working directory.
  - Files created there are tiny placeholder assets for export and validation testing.

## Settings Notes

- Settings file location:
  - `app.getPath('userData')/producer-settings.json`
- Log file location:
  - `app.getPath('userData')/logs/producer.log`
- Current settings:
  - default export folder
  - default app version
  - default export version
  - allow export with warnings
  - keep temporary export folder for debugging
  - preferred audio extensions
  - preferred image extensions

## Recent Verification

- Passed:
  - `npm.cmd run test -- src/main/media/mediaService.test.ts`
  - `npm.cmd run test -- src/main/services/exportService.test.ts`
  - `npm.cmd run build`
  - `npm.cmd run test -- src/renderer/utils/slugify.test.ts src/renderer/utils/episodeStageConfigs.test.ts src/main/validation/validationService.test.ts src/main/export/buildLegacyRows.test.ts src/main/export/buildManifest.test.ts src/main/services/exportService.test.ts`
  - `npm.cmd run test -- src/main/services/loggerService.test.ts src/main/services/settingsService.test.ts src/main/services/exportService.test.ts src/main/dev/demoEpisodeFactory.test.ts src/main/preview/buildImportCompatibilityPreview.test.ts src/main/validation/validationService.test.ts src/main/export/buildLegacyRows.test.ts src/main/export/buildManifest.test.ts`
  - `npm.cmd run typecheck`

## Update Policy

- Keep this README updated as work progresses so another agent can resume quickly if the session is interrupted.

## Stack

- Electron + React + TypeScript + Vite (`electron-vite`)
- Node 22 + npm

## Project Layout

```text
src/
  main/           Electron main process
  preload/        contextBridge -> window.producerApi
  renderer/       React UI (Vite)
  shared/         IPC channels and API types
prisma/           Database schema and migrations
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Electron and Vite dev server |
| `npm run electron:dev` | Alias for `dev` |
| `npm run build` | Production build to `out/` |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Run Vitest suite |

## Development

```bash
npm install
npm run dev
```

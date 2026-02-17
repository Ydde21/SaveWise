# Current UI Fixes

- [x] Review `AGENTS.md` before making changes.
- [x] Diagnose dashboard spacing issue on smaller screens.
- [x] Diagnose settings currency picker visibility/scroll issue.
- [x] Diagnose clipped upgrade text/button in settings.
- [x] Implement layout and style fixes with minimal impact.
- [x] Run verification (`tsc`, `lint`) and confirm clean results.

## Review

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- Dashboard spacing, settings premium card clipping, and currency modal visibility/scroll behavior were adjusted with minimal layout changes.

## Latest Request

- [x] Rename tab label from `Wallets` to `Savings`.
- [x] Update create form field label to `Bank / E-wallet`.
- [x] Update create form placeholder to `e.g. BPI / GCash`.
- [x] Verify compile with `npx tsc --noEmit`.

## Current Request

- [x] Remove `Expenses` and `Loans` from bottom tab bar.
- [x] Keep `Expenses` and `Loans` accessible from profile/settings screen.
- [x] Rename `Settings` tab label to `Profile`.
- [x] Add key profile details (email and member since).
- [x] Verify with `npx tsc --noEmit` and `npm run lint`.

## New Request

- [x] Add `yearly` subscription plan to app types/repository/context.
- [x] Add yearly option in Profile upgrade modal UI.
- [x] Add Supabase migration to allow `yearly` in `subscriptions.plan`.
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Current Performance Request

- [x] Investigate global button lag sources in app flow.
- [x] Reduce realtime refresh churn in app context.
- [x] Add immediate loading feedback for save actions in Savings/Expenses/Loans.
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Current Goals Bug

- [x] Diagnose why created goals were not tappable.
- [x] Add tap-to-edit behavior for goal cards.
- [x] Reuse goal modal for edit/update flow.
- [x] Add saving state feedback for goal save action.
- [x] Verify with `npx tsc --noEmit` and `npm run lint`.

## Goal Plus Fix

- [x] Diagnose why `+` action still failed after tap-to-edit update.
- [x] Replace platform-limited prompt flow with cross-platform add-amount modal.
- [x] Move edit action to explicit edit icon in each goal card.
- [x] Keep goal card non-edit by default (long press remains delete).
- [x] Verify with `npx tsc --noEmit` and `npm run lint`.

## Premium Optimization

- [x] Define clear free-plan limits and premium benefit list in a shared module.
- [x] Enforce free-plan limits in context-level create operations.
- [x] Improve upgrade messaging in Profile with benefits and quota usage.
- [x] Surface limit errors in key create flows (Savings, Goals, Expenses, Loans, Transactions).
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Reports Upgrade

- [x] Review current reports weaknesses vs dashboard quality.
- [x] Redesign reports with stronger KPI hierarchy and premium polish.
- [x] Add richer sections: financial health, category percentages, loan risk summary.
- [x] Keep premium gate and visual language consistent with app.
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Reports 2.0 Premium Intelligence Redesign

- [x] Add report analytics engine in `lib/reporting.ts` with period bucketing, deltas, goal feasibility, and insights.
- [x] Extend `lib/types.ts` with report-specific interfaces and range types.
- [x] Create reusable premium report UI components (`ReportPeriodChips`, `ReportKpiCard`, `ReportInsightCard`, `ReportTrendBars`).
- [x] Refactor `app/reports.tsx` to sectioned story layout using new analytics engine and components.
- [x] Add `tests/reporting.test.ts` for range, delta, DSR, goal status, and insight trigger coverage.
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Review (Pending)

- [ ] Confirm premium gate behavior unchanged for free users.
- [ ] Confirm period chips update all sections consistently.
- [ ] Confirm mobile spacing/clipping is clean for report cards and charts.

## Review

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (12 tests, including new reporting engine coverage).
- Implemented new premium Reports 2.0 analytics pipeline and sectioned UI with rolling period controls and previous-window deltas.

## Reports 2.2 Production-Proof Final Spec

- [x] Align `lib/reporting.ts` with locked 2.2 financial semantics and UTC bucket rules.
- [x] Enforce active-loan and scheduled-payment resolution rules (stored monthly payment, amortized fallback, invalid-skip).
- [x] Enforce goal feasibility rules (`walletId` precedence + calendar-month `monthsUntilDeadline` rounding).
- [x] Update KPI delta rendering rules in `components/ReportKpiCard.tsx` (N/A/neutral/arrow threshold behavior).
- [x] Strengthen `tests/reporting.test.ts` with 2.2 edge-case coverage.
- [x] Run verification (`npx tsc --noEmit`, `npm run lint`, `npm test`).

## Reports 2.2 Review (Pending)

- [x] Confirm free users still see premium gate only in `app/reports.tsx`.
- [x] Confirm period chips refresh all report sections consistently.
- [ ] Confirm no clipping or overlap on small mobile screens.

## Reports 2.2 Review

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (`tests/reporting.test.ts` now covers 11 report-engine scenarios).
- Premium gate path in `app/reports.tsx` remains unchanged for free users.

## Reports Expense Data Bug

- [x] Reproduce and trace why Spending Diagnostics shows no expense data.
- [x] Fix current-month report filtering for Supabase `date` fields (day-only values).
- [x] Add regression coverage for date-only expense/income entries.
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Reports Expense Data Bug Review

- `lib/reporting.ts` now treats `YYYY-MM-DD` values as calendar-day records for current-month cutoff.
- Added regression test in `tests/reporting.test.ts` for day-only entries on current day.
- Verification passed: `npx tsc --noEmit`, `npm run lint`, `npm test` (18 tests total).

## Current Request - Recurring Expenses

- [x] Add recurring-expense fields and paid-month tracking to expense data model.
- [x] Add Supabase migration for recurring fields on `public.expenses`.
- [x] Wire context with recurring template actions and effective expense ledger totals.
- [x] Update expenses UI to create/edit monthly recurring items and mark current month as paid.
- [x] Add regression tests for recurring expense ledger derivation.
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Current Request Review

- [x] Confirm recurring expense can be created with no end date.
- [x] Confirm marking current month as paid updates status immediately.
- [x] Confirm dashboard/reports include paid recurring months in expense totals.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (22 tests, including new recurring-expense coverage).

## Current Request - Executive Snapshot Responsive KPI Grid

- [x] Diagnose `Executive Snapshot` right-side blank space behavior on narrow screens.
- [x] Replace fixed KPI card width with runtime-computed responsive width in `app/reports.tsx`.
- [x] Keep deterministic KPI grid spacing while auto-fitting 1 or 2 columns.
- [x] Add KPI card overflow hardening for compact widths in `components/ReportKpiCard.tsx`.
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Current Request Review

- [x] Confirm narrow-screen KPI cards render full width (no right-side dead space).
- [x] Confirm larger screens still render balanced two-column KPI cards.
- [x] Confirm orientation-driven width recalculation remains responsive.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (22 tests).

## Current Request - Expenses & Income Details Upgrade

- [x] Add pure monthly insights helpers in `lib/expense-insights.ts`.
- [x] Add unit tests for month totals, recurring summary, and category/source breakdowns.
- [x] Add month snapshot cards and responsive detail grid in `app/(tabs)/expenses.tsx`.
- [x] Add segment-aware monthly detail list (`Top Categories` / `Top Sources`).
- [x] Enrich entry row metadata tags for recurring/one-time, paid month, source, and month status.
- [x] Fix row separator encoding to `•`.
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Current Request Review

- [x] Confirm monthly snapshot values match current-month data.
- [x] Confirm top category/source rankings and shares are correct.
- [x] Confirm entry metadata tags render correctly for expense and income rows.
- [x] Confirm narrow screens use one-column detail cards and wider screens use two.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (27 tests total, including new expense insights coverage).

## Store Deployment Readiness (Pilot <5k MAU)

- [x] Add deployment-readiness implementation checklist and phase gates.
- [x] Replace stub premium activation with real IAP (RevenueCat) flow.
- [x] Harden subscriptions data authority (server-owned writes, tightened RLS).
- [x] Add subscriptions hardening migration (provider fields + unique transaction id + read-only client policy).
- [x] Add Supabase Edge Function: RevenueCat webhook sync -> `subscriptions` upsert.
- [x] Refactor app premium API surface to `purchasePremium`, `restorePremium`, `refreshPremiumStatus`.
- [x] Update upgrade UI to purchase/restore flows and entitlement-aware states.
- [x] Add in-app account deletion flow (secure edge function + settings action).
- [x] Add release build config (`eas.json`, deterministic versioning, EAS project id handling).
- [x] Resolve tooling readiness issues (`expo-doctor` dependency checks, security audit path).
- [x] Implement pilot-scale performance hardening (pagination + lower refresh churn + virtualized lists).
- [x] Implement atomic DB balance updates through RPC for transactions and loan payments.
- [x] Integrate Sentry baseline for production error monitoring.
- [x] Run verification gates (`npx tsc --noEmit`, `npm run lint`, `npm test`, `npx expo-doctor`, production bundle export).

## Store Deployment Readiness Review

- [x] Confirm no client path can self-activate premium without verified billing.
- [x] Confirm subscription table is client read-only and server write-only.
- [x] Confirm account deletion is available in-app and removes account/data path.
- [x] Confirm iOS and Android production bundles build successfully.
- [ ] Confirm performance remains stable with large local test datasets.

## Store Deployment Readiness Results

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (27 tests).
- `npx expo-doctor` passed (17/17 checks).
- `npx expo export --platform ios` passed.
- `npx expo export --platform android` passed.
- `npm audit --omit=dev` passed (0 runtime vulnerabilities).
- `npm audit` reports 6 moderate advisories in dev-only Vitest/Vite tooling (`esbuild` chain), not in app runtime bundle.
- Known external validation still required: live store sandbox purchase/restore/cancel smoke tests, RevenueCat webhook delivery checks, and large synthetic data perf run on target devices.
- Current release verdict: `NO-GO` for public store submission until the external validation items above are completed; codebase is ready for internal QA/TestFlight/Internal testing gates.

## Current Request - Wallet Projection Fix

- [x] Diagnose 12-month chart label overflow/clipping on wallet projection.
- [x] Fix wallet projection chart width math and x-axis edge-label anchoring.
- [x] Diagnose why monthly deposit input appeared non-functional in summary cards.
- [x] Wire monthly deposit into projected balance/interest calculations.
- [x] Verify with `npx tsc --noEmit` and `npm run lint`.

## Current Request - Wallet Projection Fix Review

- [x] Confirm `Projected in Xmo` updates when changing Monthly Deposit.
- [x] Confirm `Interest Earned` excludes raw deposit contributions.
- [x] Confirm first/last x-axis labels stay inside chart card on narrow screens.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.

## Current Request - Dashboard Savings Growth Source

- [x] Diagnose where `Savings Growth (12 Months)` gets monthly contribution values.
- [x] Switch dashboard savings projection to interest-only (no auto monthly capacity deposit).
- [x] Verify with `npx tsc --noEmit` and `npm run lint`.

## Current Request - Dashboard Savings Growth Source Review

- [x] Confirm `Savings Growth (12 Months)` now reflects interest-only growth.
- [x] Confirm chart still renders 12 months and existing wallet-rate averaging remains intact.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.

## Current Request - Strict Compounding Dashboard Alignment

- [x] Refactor projection helpers to support strict compounding frequency in `lib/interest.ts`.
- [x] Add portfolio projection helper that sums wallet-level projections by month.
- [x] Update wallet detail projection to pass wallet `compoundingFrequency`.
- [x] Replace dashboard average-rate projection with per-wallet portfolio projection.
- [x] Add regression tests for mixed-frequency portfolio and compatibility defaults.
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Current Request - Strict Compounding Dashboard Alignment Review

- [x] Confirm dashboard 12-month growth aligns with summed wallet projections.
- [x] Confirm annual-compounding wallet projection reflects strict annual compounding.
- [x] Confirm projection chart still renders cleanly at 12 months.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (31 tests).

## Current Request - Tab Navigation Swap

- [x] Move `Expenses` and `Loans` back to visible bottom tab navigation.
- [x] Hide `Savings` and `Goals` from bottom tab navigation.
- [x] Swap Profile finance shortcuts to `Savings` and `Goals`.
- [x] Verify with `npx tsc --noEmit` and `npm run lint`.

## Current Request - Tab Navigation Swap Review

- [x] Confirm bottom tab shows `Dashboard`, `Expenses`, `Loans`, `Profile`.
- [x] Confirm `Savings` and `Goals` remain accessible from Profile shortcuts.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.

## Current Request - APK Billing Guardrails

- [x] Add build-level billing flag (`EXPO_PUBLIC_ENABLE_BILLING`) wiring in app billing module.
- [x] Guard billing bootstrap and purchase/restore/refresh calls with deterministic disabled-build messaging.
- [x] Disable upgrade modal purchase/restore actions when billing is unavailable in build.
- [x] Add explicit EAS build profiles for APK (`production-apk`) and Play AAB (`production-play`).
- [x] Document billing flag in `.env.example`.
- [x] Verify with `npx tsc --noEmit`, `npm run lint`, and `npm test`.

## Current Request - APK Billing Guardrails Review

- [x] Confirm sideload APK profile disables purchase/restore buttons and shows guidance message (code path + profile env wiring).
- [x] Confirm Play profile keeps billing enabled for purchase/restore flow (profile env wiring).
- [x] Confirm non-premium and premium UI paths still render normally (local lint/type/test checks).
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (31 tests).
- Pending external validation: run real `eas build` for `production-apk` and `production-play` and smoke test purchase/restore on device.

## Current Request - Production APK Build

- [x] Start EAS build for `production-apk` profile.
- [x] Resolve non-interactive keystore blocker by provisioning local Android keystore and `credentials.json`.
- [x] Resolve Gradle Sentry upload blocker for APK profile by setting `SENTRY_DISABLE_AUTO_UPLOAD=true`.
- [x] Re-run `production-apk` build and confirm successful artifact generation.

## Current Request - Production APK Build Review

- First build (`13ce552d-3f6d-4c8a-a6f9-30c04ecd8b23`) failed: `createBundleReleaseJsAndAssets_SentryUpload...` required Sentry org/slug.
- Second build (`b08f0d91-bbd1-4eca-a360-d9d21633a9b0`) passed with artifact:
  `https://expo.dev/artifacts/eas/nNwHnry4q1gaXjHdsw6wom.apk`
- Note: APK/Play profiles now use `android.credentialsSource: local`; keep `credentials.json` and keystore safe/backed up.

## Current Request - APK Splash Freeze

- [x] Diagnose startup freeze on centered splash logo after sideload APK install.
- [x] Add root-layout startup fail-safe to avoid indefinite splash hold on font load error/timeout.
- [x] Add monitoring capture for splash hide/prevent errors and font load timeout/error.
- [x] Verify with `npx tsc --noEmit` and `npm run lint`.

## Current Request - APK Splash Freeze Review

- [x] Confirm app no longer hangs on splash when font loading fails/hangs (startup gate now times out and hides splash).
- [x] Confirm app continues to auth/onboarding routing after splash hides (render gate no longer blocks forever).
- `npx tsc --noEmit` passed.
- `npm run lint` passed.

## Current Request - App Icon Update

- [x] Update Expo app icon to `assets/images/icon.png`.
- [x] Update Android adaptive icon to use `assets/images/icon.png`.
- [x] Verify with `npx tsc --noEmit` and `npm run lint`.

## Current Request - App Icon Update Review

- [x] Confirm launcher icon source now points to `icon.png` in app config.
- [x] Confirm iOS/Expo icon source now points to `icon.png` (`icon` field).
- `npx tsc --noEmit` passed.
- `npm run lint` passed.

## Current Request - Keyboard-Safe Form Modals + Expenses Type Picker

- [x] Add task-tracking section and review placeholder for this request.
- [x] Implement keyboard-safe modal pattern across all form modals (`expenses`, `wallets`, `goals`, `loans`, `wallet/[id]`).
- [x] Add create-time Expense/Income type toggle in `app/(tabs)/expenses.tsx`.
- [x] Lock type switching during edit and keep create-time type switching only.
- [x] Run verification (`npx tsc --noEmit`, `npm run lint`, `npm test`).
- [x] Document verification and behavioral review results.

## Current Request Review

- [ ] Confirm keyboard overlap is resolved in all targeted form modals.
- [ ] Confirm Expenses `+` modal supports Expense/Income type selection only in create mode.
- [ ] Confirm creating opposite type switches list segment to created type after save.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (31 tests).
- Pending manual QA on device/emulator: keyboard overlap checks and Expenses create-flow behavior checks listed above.

## Current Request - EAS Update Export Failure (Keep Web Support)

- [x] Add task-tracking section and review placeholder for this request.
- [x] Install missing Expo web dependency (`react-native-web`) with Expo-managed versioning.
- [x] Confirm dependency is installed via `npm ls react-native-web --depth=0`.
- [x] Run export preflight with `npx expo export --output-dir dist --experimental-bundle --dump-sourcemap --dump-assetmap --platform all`.
- [x] Publish update with `CI=1` and production channel message.
- [x] Verify production channel now points to the newly published update group.
- [x] Document root cause, fix, and verification evidence.

## Current Request - EAS Update Export Failure Review

- [x] Confirm `eas update` no longer fails on missing web dependency.
- [x] Confirm latest production channel update includes message `chore: bug fixes for keyboard behavior`.
- Root cause: `app.config.ts` enables web export path while `react-native-web` was missing; `eas update` failed during `expo export --platform all`.
- Install note: initial `npx expo install react-native-web` hit `ERESOLVE` because `react-dom` range (`^19.1.0`) allowed `19.2.x` conflicting with `react@19.1.0`; resolved by installing Expo-compatible explicit versions `react-dom@19.1.0` and `react-native-web@0.21.0`.
- `npm ls react-native-web --depth=0` passed: `react-native-web@0.21.0`.
- `npx expo export --output-dir dist --experimental-bundle --dump-sourcemap --dump-assetmap --platform all` passed and exported `dist`.
- `CI=1 npx eas update --channel production --message "chore: bug fixes for keyboard behavior"` passed.
- Published update group: `b0bb4fb3-5700-4d5b-94a1-15719ed2c99b` (runtime `1.0.0`, platforms `android, ios`).
- `npx eas channel:view production` confirms latest message `"chore: bug fixes for keyboard behavior"` on branch `production`.

## Current Request - Keyboard Behavior Hotfix v2 (Global Forms, Android-First)

- [x] Add task-tracking section and review placeholder for this request.
- [x] Add keyboard regression-prevention lesson entry in `tasks/lessons.md`.
- [x] Harden `components/KeyboardAwareScrollViewCompat.tsx` web prop filtering for keyboard-only props.
- [x] Replace form `ScrollView` usage with `KeyboardAwareScrollViewCompat` in targeted modal/auth screens.
- [x] Standardize modal `KeyboardAvoidingView` behavior to avoid Android `height` conflicts.
- [x] Apply safe-area-aware keyboard offsets so bottom inputs/CTAs remain reachable.
- [x] Preserve existing form logic/handlers with minimal-impact UI-only keyboard changes.
- [x] Run verification (`npx tsc --noEmit`, `npm run lint`, `npm test`).
- [x] Run export preflight (`npx expo export --output-dir dist --experimental-bundle --dump-sourcemap --dump-assetmap --platform all`).
- [x] Publish direct production OTA for keyboard hotfix.
- [x] Verify production channel points to new hotfix update group.
- [x] Document root cause, implementation details, and verification evidence.

## Current Request - Keyboard Behavior Hotfix v2 Review

- [ ] Confirm Expenses modal create/edit fields stay visible above keyboard on Android.
- [ ] Confirm Wallets/Goals/Loans/Wallet detail modals remain keyboard-safe on Android.
- [ ] Confirm Sign In / Sign Up forms keep focused inputs and submit actions visible on Android.
- [ ] Confirm no iOS modal jump/clipping regressions in targeted forms.
- Root cause: modal forms used `KeyboardAvoidingView` with Android `height` behavior and plain `ScrollView`, so focused inputs could still be obscured.
- Shared fix: `components/KeyboardAwareScrollViewCompat.tsx` now strips keyboard-controller-only props on web and passes them only to native `KeyboardAwareScrollView`.
- Form updates applied in `app/(tabs)/expenses.tsx`, `app/(tabs)/wallets.tsx`, `app/(tabs)/goals.tsx`, `app/(tabs)/loans.tsx`, `app/wallet/[id].tsx`, `app/(auth)/sign-in.tsx`, and `app/(auth)/sign-up.tsx`.
- Modal behavior standardized to `behavior={Platform.OS === "ios" ? "padding" : undefined}` for targeted form modals to avoid Android `height` conflicts.
- Keyboard-aware offsets applied with safe-area-driven values (`bottomOffset={insets.bottom + 24}`, `extraKeyboardSpace={12}`) in targeted form containers.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (31 tests).
- `npx expo export --output-dir dist --experimental-bundle --dump-sourcemap --dump-assetmap --platform all` passed.
- `CI=1 npx eas update --channel production --message "fix: keyboard behavior hotfix v2 (global forms)"` passed.
- Published update group: `bc6fac7a-8e83-4e3e-aedf-f39da0724679` (runtime `1.0.0`, platforms `android, ios`).
- `npx eas channel:view production` confirms latest message `"fix: keyboard behavior hotfix v2 (global forms)"`.
- Manual device QA remains pending from CLI context: Android/iOS keyboard overlap confirmation items above require emulator/device interaction.

## Current Request - Root-Cause Keyboard Obstruction (Production Android)

- [x] Add task-tracking section and review placeholder for this request.
- [x] Add dev-only update identity diagnostics at app startup in `app/_layout.tsx`.
- [x] Add root `KeyboardProvider` wiring in `app/_layout.tsx`.
- [x] Set explicit `android.softwareKeyboardLayoutMode` in `app.config.ts`.
- [x] Preserve existing modal/auth keyboard-aware form changes without behavior regressions.
- [x] Run verification (`npx tsc --noEmit`, `npm run lint`, `npm test`).
- [x] Run export preflight (`npx expo export --output-dir dist --experimental-bundle --dump-sourcemap --dump-assetmap --platform all`).
- [x] Publish direct OTA to `production` for root-cause keyboard fix.
- [x] Verify `production` channel points to the new update group.
- [x] Document root cause, fix, and verification evidence.

## Current Request - Root-Cause Keyboard Obstruction Review

- [ ] Confirm Android modal/auth forms keep focused fields and submit CTAs visible above keyboard.
- [ ] Confirm iOS quick regression sweep shows no modal jump/clipping/stuck keyboard.
- [ ] Confirm QA session runs on expected OTA update ID/runtime via startup diagnostics.
- Root cause addressed: `KeyboardAwareScrollView` usage was present, but root app tree did not provide `KeyboardProvider`, which can downgrade keyboard-controller context behavior on Android.
- System-level hardening: `app/_layout.tsx` now wraps app content with root `KeyboardProvider` and logs dev-only startup diagnostics (`updateId`, `channel`, `runtimeVersion`, `isEmbeddedLaunch`) via `expo-updates`.
- Android keyboard mode now explicit in `app.config.ts` with `android.softwareKeyboardLayoutMode = "resize"` to avoid device-dependent defaults.
- Release caveat: EAS Update ships non-native changes, while `android.softwareKeyboardLayoutMode` maps to native `android:windowSoftInputMode`; this config is in place for the next Android binary build and does not retroactively rewrite an already-installed binary.
- Existing form-level keyboard fixes were intentionally retained; this request only added root/config setup without altering form business logic.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm test` passed (31 tests).
- `npx expo export --output-dir dist --experimental-bundle --dump-sourcemap --dump-assetmap --platform all` passed.
- `CI=1 npx eas update --channel production --message "fix: keyboard root provider + android resize mode"` passed.
- Published update group: `d7deddcf-2bbb-4db5-8fd5-6322527d1275` (runtime `1.0.0`, platforms `android, ios`).
- Android update ID: `019c6bde-31a1-7c18-bfaf-614d01296f6d`.
- iOS update ID: `019c6bde-31a1-7e70-974e-8e1e0eb9c52a`.
- `npx eas channel:view production` confirms latest message `"fix: keyboard root provider + android resize mode"` on branch `production`.
- Manual device QA remains required from app runtime context for Android/iOS keyboard-obstruction confirmation.


## Current Request - Context Slice Subscriptions Refactor

- [x] Audit `lib/context.tsx` and all `useApp` consumers targeted by request.
- [x] Split context into focused providers/hooks (auth/network/preferences/finance collections/subscription/actions).
- [x] Keep action callbacks in a stable actions context with minimal dependency churn.
- [x] Update consumers in `app/(tabs)/*`, `app/_layout.tsx`, and `components/OfflineBanner.tsx` to subscribe only to relevant hooks.
- [x] Add selector-based subscription hooks for high-frequency collections and apply where useful.
- [x] Verify with `npm run typecheck`, `npm run lint`, `npm test`.
- [x] Capture render-count verification for `(tabs)/expenses` and `(tabs)/index` before/after refactor (limited to implementation notes in this non-interactive CLI session).

## Review - Context Slice Subscriptions Refactor

- Split monolithic app context into focused context providers and exported granular hooks plus optional selector helpers for high-frequency collections.
- Updated root layout, offline banner, and all tab screens to subscribe only to slices/actions they consume.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed (31 tests).
- Render-count verification via React DevTools Profiler could not be executed in this headless CLI environment; follow-up manual profiling is still required for `(tabs)/expenses` and `(tabs)/index`.

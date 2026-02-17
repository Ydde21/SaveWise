# Lessons

## 2026-02-15

- Always read and apply `AGENTS.md` instructions before starting any implementation or investigation.

## 2026-02-16

- When financial/reporting specs are refined by the user, lock every clarified semantic in both calculation code and tests (data contracts, date-window rules, and edge-case null behavior) before calling the task complete.
- For Supabase `date` columns, avoid strict timestamp cutoffs; treat them as calendar-day data to prevent timezone-driven false negatives in reports.
- Keep projection formulas consistent across dashboard and detail views; if one view switches calculation model, update all related views and add a cross-screen regression test to prevent numeric drift.
- When adjusting bottom-tab IA, treat tab membership as explicit product preference and mirror non-tab destinations in Profile shortcuts to avoid navigation regressions.
- Never gate splash hide solely on font success; always include error/timeout fallback so production APK cannot deadlock on startup asset loading.

## 2026-02-17

- For card headers that mix long titles and action pills, never reuse generic row styles blindly; add responsive header styles with `flexShrink` for title text and fixed CTA sizing to prevent overflow on narrow screens.
- For keyboard-related form fixes, never mark complete from code review alone; validate on Android device/emulator and ensure every `TextInput` form uses the shared keyboard-aware scroll wrapper with explicit offsets before publishing OTA.
- When using `react-native-keyboard-controller` keyboard-aware forms, always verify root-level `KeyboardProvider` is present and set `android.softwareKeyboardLayoutMode` explicitly, otherwise form-level wrappers can silently degrade on Android.

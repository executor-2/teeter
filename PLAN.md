# Plan: Include hours and minutes in version timestamp with localization

## Current State

The `#version-info` div in `index.html` (line 296) contains a hardcoded static string:

```html
<div id="version-info">v1.0.0 · Last updated: 2026-03-20</div>
```

No JavaScript currently references or modifies this element.

## Approach

1. **Change the hardcoded date to an ISO 8601 datetime string** in a `data-updated` attribute on the `#version-info` div. This keeps the source value easy for developers to update (just edit the ISO string) while separating the raw value from presentation.

2. **Add a small inline `<script>`** right after the div that reads the ISO string from the `data-updated` attribute and formats it using `Date.toLocaleString()` with appropriate options (date, hours, minutes — no seconds) to produce a localized, readable timestamp.

3. **Set the initial text content** to just the version number as fallback; the script immediately updates it with the formatted date.

### Implementation Details

- **Source format**: ISO 8601 string with time, e.g. `2026-03-20T20:30:00Z`
- **Formatting API**: `new Date(isoString).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })` — this uses the browser's locale and timezone automatically.
- **Fallback**: The pre-JS or `<noscript>` case will show just "v1.0.0", which is acceptable.
- **Placement**: A small inline `<script>` tag right after the `#version-info` div to keep the logic co-located and avoid touching JS module files.

### Files Changed

- `index.html` — Modify the `#version-info` div and add a small inline script (~6 lines).

### No New Dependencies

Uses only built-in browser APIs (`Date`, `toLocaleString`).

## Verification

- `docker build -t teeter .` succeeds.
- The `#version-info` element in the bottom-right shows a localized date+time string (e.g., "Mar 20, 2026, 8:30 PM" in en-US) instead of just "2026-03-20".
- The format adjusts to the user's locale/timezone.
- The version string remains readable and unobtrusive.

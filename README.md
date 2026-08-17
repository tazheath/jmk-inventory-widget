# Inventory Widget

Self-hosted vehicle inventory widget. Pulls live records from an Airtable base and renders filterable cards with a detail modal, photo gallery, and full-screen lightbox. Client-side only — no build step.

Originally built for JMK Auto; designed to be reusable across dealership sites by changing config values, not code.

## Files

| File | Role |
|------|------|
| `javascript.js` | Widget logic. Served via jsDelivr. |
| `style.css` | Styles. Served via jsDelivr. |
| `index.html` | The embed snippet — copy this onto a page and fill in the config. Not served; it's your reference/template. |

## Embed

Paste onto the page, replace `USERNAME/REPO` in both URLs, and set the four config values on `.car-dir-widget`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/USERNAME/REPO@main/style.css">

<div class="car-dir-widget"
     data-location=""
     data-vehicle=""
     data-base-id="appXXXXXXXXXXXXXX"
     data-token="patXXXXXXXXXXXXXX">
  <!-- markup from index.html goes here -->
</div>

<script src="https://cdn.jsdelivr.net/gh/USERNAME/REPO@main/javascript.js" defer></script>
```

Use the full markup from `index.html` (it includes the modal). Only the four attributes below change per install.

## Config (data-attributes on `.car-dir-widget`)

| Attribute | Value | Notes |
|-----------|-------|-------|
| `data-location` | `Fairview`, `Ogden`, or `""` | Blank = all locations. Filters server-side. |
| `data-vehicle` | `Car`, `SUV`, `Truck`, `Minivan`, or `""` | Blank = all. When set, the filter tab bar hides. |
| `data-base-id` | Airtable Base ID (`app…`) | From the base URL. |
| `data-token` | Airtable PAT (`pat…`) | **Read-only**, scoped to the one base. |

### Examples

```html
<!-- Fairview, all types -->
<div class="car-dir-widget" data-location="Fairview" data-vehicle="" data-base-id="app…" data-token="pat…">

<!-- Ogden, all types -->
<div class="car-dir-widget" data-location="Ogden" data-vehicle="" data-base-id="app…" data-token="pat…">

<!-- Ogden trucks only -->
<div class="car-dir-widget" data-location="Ogden" data-vehicle="Truck" data-base-id="app…" data-token="pat…">
```

## Airtable requirements

- Table named **`Vehicles`**.
- A **`Sort Date`** field for newest-first ordering.
- Records with `Status` = `Sold` are hidden automatically.
- Token scope: `data.records:read`, limited to this base only.

## Updating

jsDelivr caches `@main` for a while. After pushing an edit, force a refresh once:

```
https://purge.jsdelivr.net/gh/USERNAME/REPO@main/javascript.js
```

For production, pin a version tag instead (`git tag v1.0.0` → reference `@v1.0.0`) so pages never pull a half-finished commit.

## Security note

The token sits in the page's HTML. That's an accepted tradeoff here: it's **read-only** and the data is already public, so the worst case is someone reading inventory that's public anyway. Do **not** put a token with write scope in the embed.

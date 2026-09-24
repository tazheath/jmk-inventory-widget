# Inventory Widget

Self-hosted vehicle inventory widget. Pulls live records from an Airtable base and renders filterable cards with a detail modal, photo gallery, and full-screen lightbox. Client-side only — no build step.

Originally built for JMK Auto; designed to be reusable across dealership sites by changing config values, not code.

## Files

| File | Role |
|------|------|
| `javascript.js` | Widget logic. Builds its own markup and loads `style.css` automatically. Served via jsDelivr. |
| `style.css` | Styles. Loaded by `javascript.js` from the same repo/commit. Served via jsDelivr. |
| `index.html` | Reference copy of the embed snippet. Not served. |

## Embed

The embed is an **empty config div** plus the **script tag**. The script injects all widget markup (filter tabs, grid, modal) and loads the stylesheet itself — no `<link>` tag and no pasted markup needed.

```html
<div class="car-dir-widget"
     data-location=""
     data-vehicle=""
     data-base-id="appXXXXXXXXXXXXXX"
     data-token="patXXXXXXXXXXXXXX"></div>

<script src="https://cdn.jsdelivr.net/gh/tazheath/jmk-inventory-widget@458c692f80cd5ba100f50a2c2629821346ab2bd2/javascript.js" defer></script>
```

- Leave the div empty. Anything inside it is replaced when the widget loads.
- The widget stays hidden until its stylesheet loads (3-second fail-open), so the modal never flashes unstyled.
- Multiple widgets on one page are fine — each div initializes independently; the stylesheet loads once.

### Duda

Duda doesn't run `<script>` tags placed inside HTML widgets:

- Put the **div** in an HTML widget where the inventory should appear.
- Put the **script tag** in **Settings → Head/Body HTML → Body-End HTML**.

The script watches the page for 10 seconds after load, so it picks up the div even when Duda injects it late. Test on **Preview** or the **published** page — the editor canvas won't run it.

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
<div class="car-dir-widget" data-location="Fairview" data-vehicle="" data-base-id="app…" data-token="pat…"></div>

<!-- Ogden, all types -->
<div class="car-dir-widget" data-location="Ogden" data-vehicle="" data-base-id="app…" data-token="pat…"></div>

<!-- Ogden trucks only -->
<div class="car-dir-widget" data-location="Ogden" data-vehicle="Truck" data-base-id="app…" data-token="pat…"></div>
```

## Airtable requirements

- Table named **`Vehicles`**.
- A **`Sort Date`** formula field for newest-first ordering: `IF({Date Listed}, {Date Listed}, CREATED_TIME())`.
- Records with `Status` = **`Sold`** or **`Archive`** are hidden automatically.
- Field names must match the column headers exactly (case- and space-sensitive): `Make`, `Model`, `Year`, `VIN`, `Price`, `Mileage`, `Vehicle Type`, `Drive Type`, `Transmission`, `Title`, `Location`, `Status`, `Photos`, `Description`.
- Token scope: `data.records:read`, limited to this base only.

## Updating

1. Upload or commit the changed file(s).
2. Copy the new **full commit SHA** (commits page → copy icon on the latest commit).
3. Swap it into the `<script>` src. The stylesheet follows automatically from the same commit.

Pinning to a commit SHA means pages never pick up a half-finished change and there's no cache to wait on.

If you reference `@main` instead (fine for testing), jsDelivr caches it. Force a refresh after pushing:

```
https://purge.jsdelivr.net/gh/tazheath/jmk-inventory-widget@main/javascript.js
https://purge.jsdelivr.net/gh/tazheath/jmk-inventory-widget@main/style.css
```

## Security note

The token sits in the page's HTML. That's an accepted tradeoff here: it's **read-only** and the data is already public, so the worst case is someone reading inventory that's public anyway.

- Do **not** put a token with write scope in the embed.
- Do **not** commit a real token to this repo. It's public, and GitHub reports exposed Airtable tokens, which can get them revoked automatically. Use a placeholder in `index.html`.

---
applyTo: sidebar.html
---

# sidebar.html — AI instructions

## Structure overview

```
div.sidebar-shell
  input#nav-toggle.sr-only          ← hidden checkbox, drives collapse
  label.toggle-btn                  ← collapse trigger (no JS)
  aside.sidebar
    header.user-section             ← avatar + name
    nav.nav-scroll                  ← scrollable navigation
      span.nav-label                ← section heading
      ul.nav-list
        li > a.nav-item             ← simple link
        li > details.nav-group      ← expandable group
              summary.nav-item
              ul.submenu > li > a.sub-item
      hr.divider
      span.nav-label
      ul.nav-list
        li > details.nav-group
    footer.sidebar-bottom
      ul.nav-list
        li > a.nav-item
        li > a.nav-item.nav-item--danger
```

## Rules

- **No JavaScript** — collapse uses `#nav-toggle` checkbox + CSS `:has()`. Accordion uses native `<details open>`.
- **Semantic tags** — `<aside>`, `<nav>`, `<header>`, `<footer>`, `<ul>/<li>`, `<a>`, `<hr>`, `<details>/<summary>`.
- **Accessible** — decorative SVGs carry `aria-hidden="true"`. Active page link has `aria-current="page"`. Toggle label has `aria-label`. Nav has `aria-label`. Section labels have `aria-hidden="true"`.
- **All styles** live in `sidebar.css`. Never add inline styles.

## Adding a simple nav item

```html
<li>
  <a href="#" class="nav-item" data-tip="Label">
    <span class="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><!-- stroke icon --></svg>
    </span>
    <span class="nav-text">Label</span>
  </a>
</li>
```

## Adding an expandable group

```html
<li>
  <details class="nav-group">           <!-- add open attribute to start expanded -->
    <summary class="nav-item" data-tip="Label">
      <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">…</svg></span>
      <span class="nav-text">Label</span>
      <span class="nav-arrow" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M2 4l4 4 4-4"/></svg></span>
    </summary>
    <ul class="submenu">
      <li><a href="#" class="sub-item">Child</a></li>
      <li><a href="#" class="sub-item sub-item--active" aria-current="page">Active child</a></li>
    </ul>
  </details>
</li>
```

## Icons

All icons are inline SVG strokes from the Feather icon set (`viewBox="0 0 24 24"`). Arrow chevrons use `viewBox="0 0 12 12"`. Always set `aria-hidden="true"` on decorative SVGs.

## data-tip attribute

Every `.nav-item` and `summary.nav-item` must have `data-tip="Label"`. When the sidebar is collapsed, CSS renders this as a tooltip via `content: attr(data-tip)`.

## Modifiers

| Class | Where | Effect |
|---|---|---|
| `nav-item--danger` | `<a>` | Red text + danger hover bg |
| `sub-item--active` | `<a>` | Bold dark text for current page |
| `open` (attribute) | `<details>` | Starts expanded |

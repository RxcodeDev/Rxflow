---
applyTo: sidebar.css
---

# sidebar.css — AI instructions

## Architecture

All values are defined as CSS custom properties in `:root`. Never hardcode colors — always reference a variable or add a new one.

The palette is strictly **white / gray scale / near-black**. No other colors.

```css
/* Sizing */
--sidebar-w: 13.75rem
--sidebar-collapsed-w: 4.25rem

/* Palette */
--c-bg:         #fff       /* backgrounds */
--c-text:       #111       /* primary text, active icons */
--c-text-sub:   #555       /* secondary text, hover labels */
--c-muted:      #bbb       /* inactive icons and labels */
--c-border:     #e0e0e0    /* borders, dividers */
--c-hover:      #f5f5f5    /* hover backgrounds */
--c-line:       #efefef    /* submenu tree lines, hr */
--c-tooltip-bg: #1c1c1c   /* collapsed tooltip background */
--c-avatar-bg:  #e0e0e0   /* avatar circle fill */
--c-avatar-fg:  #999       /* avatar face shapes fill */
--c-danger:     #555       /* destructive action — darker gray, NOT red */

/* Motion */
--ease: 0.25s ease
```

## Collapse mechanism

The sidebar collapses via a hidden `<input type="checkbox" id="nav-toggle">`. No JavaScript.

Collapsed state is targeted with:
```css
.sidebar-shell:has(#nav-toggle:checked) .target { ... }
```

When collapsed:
- `.sidebar` → `width: var(--sidebar-collapsed-w)`
- `.nav-text`, `.nav-arrow` → hidden
- `.nav-label` → zero height / opacity
- `.user-info` → `max-width: 0; opacity: 0`
- `.submenu` → `display: none !important`
- `[data-tip]:hover::after` → tooltip rendered via CSS `content: attr(data-tip)`

## Accordion

Uses native `<details open>` / `<summary>`. No JavaScript.

```css
/* Submenu is kept display:block so max-height can animate */
.submenu { display: block !important; max-height: 0; transition: max-height 0.25s ease; }
.nav-group[open] > .submenu { max-height: 12.5rem; }
```

Open state styling hooks:
```css
.nav-group[open] > summary .nav-icon  { color: var(--c-text); }
.nav-group[open] > summary .nav-text  { color: var(--c-text); font-weight: 600; }
.nav-group[open] > summary .nav-arrow svg { transform: rotate(180deg); }
```

## Units

- All spacing, sizing and typography → `rem`
- Borders → `1px` / `1.5px` (intentional fixed for crisp rendering)
- Box-shadow offsets → `px` (intentional)

## Adding a nav item

- Simple link → `<a class="nav-item">` inside `<li>`
- With submenu → `<details class="nav-group">` + `<summary class="nav-item">` + `<ul class="submenu">`
- Active sub-item → add class `sub-item--active` and `aria-current="page"`
- Danger item → add modifier class `nav-item--danger`

## Key selectors reference

| Selector | Purpose |
|---|---|
| `.sidebar` | Main container |
| `.toggle-btn` | Collapse label (paired with `#nav-toggle`) |
| `.user-section` | Avatar + name header |
| `.nav-scroll` | Scrollable nav area |
| `.nav-label` | Section heading (Main, Settings…) |
| `.nav-list` | `<ul>` wrapper |
| `.nav-item` | Row — used on `<a>` and `<summary>` |
| `.nav-icon` | Icon wrapper |
| `.nav-text` | Label text |
| `.nav-arrow` | Chevron for expandable items |
| `.nav-group` | `<details>` accordion |
| `.submenu` | `<ul>` inside accordion |
| `.sub-item` | Child link |
| `.sub-item--active` | Currently active child |
| `.nav-item--danger` | Red destructive action |
| `.sidebar-bottom` | Footer area |
| `.divider` | `<hr>` separator |

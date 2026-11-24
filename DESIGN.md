# Airloom design system

Adapted from the Superpower design language (opendesignmd.com/designs/superpower/DESIGN.md), MIT licensed. Airloom applies these rules as its visual source of truth.

## Overview

Airloom is an urban air quality assistant for households in polluted cities. It balances environmental urgency with decision clarity: a dark, focused environment for data and plans, and a light, editorial presentation for marketing and onboarding content. Orange is the brand energy anchor; green marks positive or safe states only. The interface uses stark black-and-white contrast, generous rounded corners, a single sans-serif family at regular weight, thin charts, minimal shadows and borders, and a 4px spacing base.

## Colors

| token | value | use |
|---|---|---|
| canvas | #ffffff | Primary page background; light surfaces |
| night | #070707 | Primary dark background; dashboard and header |
| ink | #0a0a0a | Primary text on light surfaces |
| ink-light | #f4f3f0 | Primary text on dark surfaces |
| muted | #7a7a78 | Secondary text on light surfaces |
| muted-dark | #8f8f8b | Secondary text on dark surfaces |
| line | #e7e6e2 | Borders on light surfaces |
| line-dark | #262626 | Borders on dark surfaces |
| orange | #f85a00 | Brand energy; used sparingly, never for data |
| green | #00d084 | Positive states only: good AQI, recommended actions |
| amber | #e6c558 | Elevated / caution states |
| red | #e5484d | Severe states; not used as a primary brand color |

Severity tokens map AQI categories to colors: good #00d084, moderate #cfcfcc, elevated #e6c558, high #e58a4a, very-high #e5484d, severe #c92a35, unavailable #6f6f6c.

No gradients are used in the interface. Orange appears as brand energy in small accents, not as data color. Green is reserved for positive guidance only.

## Typography

Single family: Inter via `next/font/google` (regular weight only in the visible interface; hierarchy through size and tracking, not weight). Scale built on a 4px relative unit.

| token | size | weight | leading | tracking | use |
|---|---:|---|---:|---|---|
| hero | 4rem | 400 | 0.98 | -0.045em | Page titles |
| section | 2.5rem | 400 | 1.05 | -0.03em | Section headings |
| body | 1rem | 400 | 1.5 | 0em | Standard paragraphs |
| label | 0.6875rem | 400 | 1.2 | 0.12em | Data labels, timestamps |
| navigation | 0.8125rem | 400 | 1 | 0.01em | Menu items |

Tabular numbers (`.tnum`) for all data values so columns align.

## Layout

Centered, contained shell (max-width 1120px, 20px horizontal padding, 32px at lg+). Generous vertical breathing room between sections. Alternates full-bleed dark moments (hero, dashboard) with contained light text blocks.

Spacing base: 4px. Section breaks 6rem+. Cards use moderate padding; text blocks width-constrained for comfortable line length rather than excessive gutters.

Radius: 24px on cards, dialogs, and data containers.

## Visual language

- Stark black-and-white contrast for readability and authority.
- Orange as emotional anchor, appearing in accents and buttons.
- Green as precise status indicator within data.
- Heavily rounded rectangles soften data cards and containers.
- No gradients in UI. Thin (1px) borders, minimal shadows, no drop shadows on primary surfaces.
- Responsive: centered character preserved; on narrow viewports the content column narrows and card padding reduces slightly; radius stays consistent.

## Data visualization

Hand-rolled SVG charts: thin lines (1.6px), dashed WHO guideline markers, tabular numeric axis labels, hover tooltips, current-time marker, reduced-motion safe. Charts show PM2.5/PM10/AQI over the next 24 hours with a dashed line at the WHO 2021 guideline. No filled areas, no grid beyond thin horizontal reference lines.

## Components

- Buttons: solid (ink on light, ink-light on dark), outline, ghost, dark variants; rounded-xl; h-11.
- Section labels: 11px, uppercase, tracking 0.12-0.14em, muted color.
- Badges: inline, rounded-md, thin border, 11px.
- Metric: label above tabular numeric value with optional unit.
- Provenance: expandable detail showing source label (live / cached / demo), freshness, data note, limitations.
- Empty states: bordered container, title, body, optional action.

## Accessibility

- Focus-visible rings, skip logic via semantic headings and landmarks.
- Charts carry `role="img"` with `aria-label` summaries.
- Color never used alone to convey state; severity dots accompany labels.
- Reduced motion respected: animations disabled under `prefers-reduced-motion`.
- Responsive navigation: desktop header nav, mobile bottom tabs.

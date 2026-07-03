# Atlas Learning Hub — Design Brief

## App
Atlas Learning Hub — an educational platform for browsing and viewing learning content across multiple creators.

## Aesthetic
Editorial Knowledge — serif display headlines paired with a clean sans body; warm paper-toned neutrals in light mode, deep oceanic blues in dark mode; coral accent reserved for emphasis.

## Palette
| Token | Light (OKLCH) | Dark (OKLCH) |
|---|---|---|
| --background | 0.98 0.008 75 | 0.16 0.018 250 |
| --foreground | 0.20 0.02 250 | 0.95 0.01 75 |
| --primary | 0.45 0.16 245 | 0.7 0.16 245 |
| --primary-foreground | 0.98 0.008 75 | 0.16 0.018 250 |
| --accent | 0.62 0.18 25 | 0.68 0.17 25 |
| --accent-foreground | 0.15 0.02 25 | 0.16 0.018 250 |
| --card | 0.99 0.005 75 | 0.20 0.02 250 |
| --muted | 0.95 0.01 75 | 0.22 0.02 250 |
| --border | 0.90 0.01 75 | 0.30 0.02 250 |

Primary = ocean blue; accent = coral. Gradient: `linear-gradient(135deg, var(--primary), var(--accent))`.

## Typography
| Role | Family | Use |
|---|---|---|
| Display | Fraunces | Headlines, page titles, hero text |
| Body | Figtree | Paragraphs, UI labels, navigation |
| Mono | Geist Mono | Code snippets, metadata, numerics |

Loaded via `@font-face` from Google Fonts CDN with `font-display: swap`.

## Structural Zones
| Zone | Purpose |
|---|---|
| Header | Brand wordmark, search, theme toggle, profile menu |
| Content | Main feed of creator uploads and video cards in responsive grid |
| Sidebar | Filters, categories, creator list, navigation |
| Footer | Platform info, links, theme attribution |

## Accent Usage
- Coral accent reserved for active states, CTAs, like/bookmark indicators, and key highlights.
- Never use accent for large surface fills — keep it on text, icons, borders, and small controls.
- Primary ocean blue carries buttons, links, focus rings, and selected states.
- Use `--gradient-primary` only on hero surfaces and primary brand moments, not on every card.

## Elevation & Depth
- `shadow-subtle` for resting cards and inputs.
- `shadow-elevated` for popovers, dropdowns, and hover lift on cards.
- Borders (1px solid `--border`) define structure; shadows add depth without heavy effects.

## Motion
- `animate-fade-up` (0.3s ease-out) for content reveal on scroll and route transitions.
- `transition-smooth` utility for hover and state transitions.

## Constraints
- No payments, courses/modules, certificates, live classes, community, notifications, PWA, or creator earnings per doNotBuild.
- Focus on content browsing, video playback (play/pause/seek + view counter + like/bookmark), in-app notifications, AI Tutor RAG search, and creator dashboards with charts.
- Responsive across mobile and desktop; dark/light theme toggle required.

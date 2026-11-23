# Saudi Unified Platform Code — Definition of Done

> Applies to every UI page and component in this repository. Verification baseline: 2026-09-07. Check the referenced Rule IDs in `uds-rules.json`. A `REQUIRED` failure blocks completion.

## Design

- [ ] The closest official template is identified; absence is marked `NEEDS-VERIFICATION`.
- [ ] Approved primary and semantic colors are used (`UDS-COLOR-001`–`012`).
- [ ] IBM Plex Sans Arabic and the published type scale/weights/line heights are applied (`UDS-TYPO-001`–`011`).
- [ ] Spacing, grid, container, radii, and elevation use audited tokens (`UDS-LAYOUT-002`–`012`, `UDS-ELEV-001`–`003`).
- [ ] Visual hierarchy is clear without relying on color or shadow alone (`UDS-COLOR-009`, `UDS-ELEV-002`).
- [ ] No unpublished value or variant is presented as official.

## Components

- [ ] Every interaction is mapped to an official entry in `uds-components.json` when one exists (`UDS-GOV-006`).
- [ ] Each custom replacement has a written technical justification and applicable Rule IDs.
- [ ] All published applicable states are implemented: default, hover, active/pressed, focus, disabled, error, success, loading.
- [ ] Button is used for actions and Link for navigation (`UDS-COMP-BUTTON-001`).
- [ ] Component anatomy, variants, content, keyboard behavior, and ARIA match the registry.
- [ ] Registry fields marked `NOT PUBLISHED BY OFFICIAL SOURCE` were not guessed as official behavior.

## RTL

- [ ] Arabic documents set `lang="ar"` and `dir="rtl"` (`UDS-RTL-001`).
- [ ] Visual order and DOM/Tab reading order agree (`UDS-RTL-005`, `UDS-LAYOUT-012`).
- [ ] Directional icons, back/next/previous controls, Steps, Breadcrumbs, and Pagination are checked (`UDS-RTL-003`, `004`).
- [ ] Navigation, forms, tables, filters, and mixed Arabic/English content are checked at runtime.
- [ ] Unpublished number/date/phone/bidirectional conventions are recorded as project decisions, not official requirements.

## Responsive

- [ ] Mobile-first implementation is used (`UDS-LAYOUT-001`).
- [ ] 0–599, 600–959, 960–1279, and 1280+ layouts are tested (`UDS-LAYOUT-006`, `013`).
- [ ] Container padding is 16px mobile and 32px desktop, with 1280px maximum (`UDS-LAYOUT-003`–`005`).
- [ ] Navigation and Breadcrumbs transform without losing functionality (`UDS-COMP-BREADCRUMB-002`).
- [ ] Forms use numbered Steps on large screens and Radial Stepper on mobile when multi-step (`UDS-FORM-004`, `005`).
- [ ] Text, cards, images, tables, forms, and overlays reflow without clipping.
- [ ] Portrait, landscape, and representative zoom levels are checked.

## Accessibility

- [ ] WCAG 2.1 AA is the target (`UDS-A11Y-001`).
- [ ] Text contrast is ≥4.5:1; large text/UI/graphics are ≥3:1 (`UDS-COLOR-006`–`008`).
- [ ] Every task works keyboard-only and every focusable item has visible focus (`UDS-A11Y-002`, `003`).
- [ ] Native semantic HTML is used before ARIA (`UDS-A11Y-004`).
- [ ] Images and icons have meaningful alternatives or are correctly decorative (`UDS-A11Y-005`–`007`).
- [ ] Form labels, help, errors, and invalid states are programmatically related (`UDS-A11Y-008`–`010`).
- [ ] Dynamic statuses use status/polite; critical immediate messages use alert (`UDS-A11Y-011`, `012`).
- [ ] Modals manage accessible name, focus trap, background, Escape behavior, and focus restoration (`UDS-A11Y-014`, `015`).
- [ ] Tabs, progress, switches, sliders, radio/checkbox groups, charts, and loaders satisfy their component rules.
- [ ] Targets are at least 44×44px (`UDS-LAYOUT-014`).
- [ ] Reduced motion is available where animation exists (`UDS-A11Y-024`).
- [ ] A keyboard and screen-reader smoke test is complete.

## Content

- [ ] Arabic-first content is clear and concise (`UDS-CONTENT-001`).
- [ ] Button labels describe results and link labels describe destinations (`UDS-CONTENT-002`, `003`).
- [ ] Heading hierarchy is semantic (`UDS-CONTENT-004`).
- [ ] States are explained in text, not color/icon alone (`UDS-CONTENT-005`).
- [ ] Form constraints appear before submission and errors explain correction (`UDS-FORM-002`, `003`).
- [ ] External/new-window/file destinations are identified (`UDS-COMP-LINK-002`, `UDS-TEMPLATE-SEARCH-002`).
- [ ] Last-updated information and view-all links are included where the selected template calls for them.

## Code

- [ ] Visual values use `uds-tokens.css` or an explicitly mapped equivalent; no avoidable hard-coded values remain.
- [ ] No framework support, component prop, class, API, or token namespace is claimed without an official source.
- [ ] React projects use a verified official package/version decision (`UDS-DEV-001`).
- [ ] Semantic markup remains correct after hydration and client-side state changes.
- [ ] Source files contain no duplicate IDs or broken ARIA references.
- [ ] Build/lint/type checks for the host project pass.

## Testing

- [ ] `python3 tools/uds-compliance/uds_compliance.py <target>` completes with `FAIL: 0`.
- [ ] All checker warnings are fixed or documented with reason and Rule ID.
- [ ] `AUTOMATED` rules pass.
- [ ] `SEMI_AUTOMATED` rules have runtime/visual evidence.
- [ ] Applicable `MANUAL` rules have a reviewer decision.
- [ ] Error, empty/no-results, loading, success, disabled, and long-content states are tested where applicable.
- [ ] Final report uses the `Unified Platform Compliance` format from [`../AGENTS.md`](../AGENTS.md).

## Sign-off

```text
Template:
Applicable Rule IDs:
Automated report:
Manual reviewer:
Known exceptions:
Decision: COMPLIANT | PARTIALLY COMPLIANT | NON-COMPLIANT
Date:
```

# Reader availability and compact map note — 2026-11-24

## Task and scope

The Arabic dictionary reader needs the selected plant's evidence-backed map, not editorial review messages. A valid UUID is necessary but not sufficient: show the map only when the resolved plant has an eligible administrative region or eligible published observation point. Unknown UUIDs, sense mismatches, held identities and evidence without drawable geography display «غير متوفر». Keep all underlying identity/evidence review reasons in the data and staff audit. A failed request remains a retryable error rather than an absence claim.

## Template and components

This is the existing isolated map component, not a new portal. There is no published geographic template in the checked-in registry (NEEDS-VERIFICATION); the separate preview continues the UDS-TPL-SEARCH patterns. Existing Button, Link, Card, List, Loading, Search Box and Modal patterns remain. Native HTML and custom SVG retain the documented exception in uuid-map-plan.md: the project uses native ES modules, and the documented Charts component does not supply geographic polygons. No new dependency or iframe.

## Applicable rules

UDS-GOV-006; UDS-COLOR-006–009; UDS-TYPO-001,003–009; UDS-LAYOUT-001,003–006,013–014; UDS-RTL-001–002,005; UDS-A11Y-001–015,022,024–025; UDS-COMP-BUTTON-001–003; UDS-COMP-LINK-001–002; UDS-COMP-CARD-001; UDS-COMP-CHART-001; UDS-CONTENT-001–005. Use the audited --uds-* token aliases. The secondary geographic caveat uses the existing 12px/18px text-xs token; source content keeps its existing legible scale. Arabic RTL and logical layout stay intact.

## Implementation decisions

- Put the status outside the map stage so unavailable plants do not retain a neutral Saudi outline, map controls, legend, or source shortcuts. Keep the plant name for context when its identity file loads. Reset visibility immediately when UUID changes, including while the next request is pending.
- Preserve precise UUID/sense matching and request sequencing. Resolve plant availability before requiring boundary geometry; a missing/held plant must not be reported as a geometry failure. Do not open blocked identities or synthesize coordinates to raise coverage.
- Expose a read-only mapAvailable property, a data-map-available attribute and an additional mapAvailable field on the existing state event. Add a loading state so a host can hide its surrounding map section immediately. Existing final state names remain compatible.
- Display one short map caveat below the map, using the small secondary token. Remove its duplicate in every region card. Retain observation-specific accuracy and date beside the selected observation.
- Pins are handled separately under pin-marker-plan.md. Their tip stays at the published eligible coordinate; place names are not geocoded to administrative centroids.
- Where reviewed book evidence exists, put its readable citation before web checklists and observation aggregates, show its page locator beside the summary, and retain all other sources. This is a reader ordering preference, not a claim that every printed work is more reliable. Historical dates stay explicit in the evidence summary.

## Verification

Exercise real emitted widget code for mapped→held→mapped transitions, unknown UUID, mismatched sense, text-only geography, late responses and retryable errors. Check map availability events and absence of visible stale controls/sources. Re-run the existing unit/data gates and UDS checker. Inspect the private live preview at desktop/mobile widths, hover-to-source stability, pin placement, keyboard access and the small note. Do not claim browser rendering or screen-reader coverage from DOM tests.

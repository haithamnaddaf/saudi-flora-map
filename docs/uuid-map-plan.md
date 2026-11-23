# UUID-driven distribution map — implementation plan

## Scope and task

The reader is already viewing a plant in a dictionary. Show only its Saudi administrative-region map and the sources supporting each highlighted place. Resolve the original entry UUID exactly; Arabic names are display/search text, never join keys. Keep the project independent of Siwar. The baseline is upstream feature/saudi-flora-map at a61666668efba34ae91a7766660e9533ba9cba67. Work is isolated on feature/uuid-map-sources.

## Structure and official patterns

The reusable map is a component, not a government portal page. No official geographic-component template is published in the checked-in registry (NEEDS-VERIFICATION). The separate preview uses the Search Box and Modal patterns from UDS-TPL-SEARCH. The separate management page follows UDS-TPL-FORM. The reader-facing component has a small plant heading, SVG map, short legend, equivalent region buttons, and an interactive source Card. There is no specimen sidebar, atlas hero, permanent evidence list or admin form in the component.

Official patterns considered: Button, Link, Card, List, Loading, Search Box, Modal, File Uploader. Native HTML implements those patterns because this project is native ES modules and the documented installable library targets React; no undocumented API is assumed. Tooltip was considered and rejected for source links: its brief noninteractive content cannot contain the required independently reachable source actions. A nonmodal source card supports pointer, keyboard, touch and Escape. The custom SVG exception remains because the documented Charts component cannot draw geographic polygons. Region buttons supply full-sized alternative targets.

## Rules, tokens and states

Applicable rule families: UDS-GOV-001–008; UDS-COLOR-001–002,005–012; UDS-TYPO-001,003–009,011; UDS-LAYOUT-001–016; UDS-ELEV-001–002; UDS-RTL-001–002,005; UDS-A11Y-001–015,022,024–025; UDS-COMP-BUTTON-001–003; UDS-COMP-LINK-001–002; UDS-COMP-CARD-001; UDS-COMP-LIST-001; UDS-COMP-CHART-001; UDS-COMP-SEARCH-001; UDS-COMP-INPUT-001; UDS-COMP-UPLOAD-001; UDS-COMP-LOADING-001; UDS-FORM-001–003; UDS-CONTENT-001–005,007; UDS-DEV-002–003,007; UDS-QUALITY-001–003.

Use the repository UDS aliases for colors, typography, spacing, radius, shadows and touch targets. Arabic lang/dir and DOM reading order are explicit. Small-screen sources stack below the map; they do not escape the viewport. Motion is a short opacity/outline transition, never displaced geography or perpetual pulsing, and respects prefers-reduced-motion. Missing UUID, unknown UUID, sense mismatch, loading, fetch error, held identity, valid-but-unlocated evidence, empty region, multiple sources and rapid UUID changes have distinct truthful states.

## Data and integration

Build compact per-UUID files from the audited research package; never send its 67 MB raw JSON to a reader. Keep explicit identity/geography publication gates. Administrative containment must be recorded and sourced. Do not turn a regional text mention into an observation coordinate. Remove the decorative occurrence dots. Keep boundary provenance separate from plant-distribution provenance. Evidence summaries are labelled as summaries, not quotations; source extraction line numbers are not book page numbers. A source may be a website, paper, dataset, or a book with a bibliographic locator even without a URL.

A native custom element, <saudi-flora-map>, observes uuid and optional sense-id attributes. The host changes uuid when its selected dictionary entry changes. Shadow DOM isolates component styles. Shared immutable geometry/data requests are cached; a monotonically increasing request token prevents late responses from drawing the previous plant. Disconnecting removes listeners and observers. No iframe, framework runtime, API key or Siwar repository edit is required. Local Excel overrides are explicitly opt-in for the preview/management origin; a production host uses versioned reviewed data.

## Validation and compliance

Run existing validations where relevant and add behavioral tests for real UUIDs, identity holds, Najd-only evidence, source links, missing IDs, rapid switching, hover-to-card persistence, keyboard/touch access, multiple components, imports, corrections, deletions, unsafe URLs and scientific-name mismatch. Build the site, inspect desktop/mobile screenshots, exercise the emitted widget entry and run the repository UDS checker. Record exceptions and any unperformed human screen-reader checks; do not claim full compliance from the static checker alone.

References: checked-in .design-system registries (2026-09-07); https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements ; https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html . A live request to https://design.dga.gov.sa/guidelines/templates/search-page timed out on 2026-11-23; current template equivalence remains unverified.

# Arabic botanical atlas

The single explorer adapts UDS-TPL-SEARCH (Search Results). The primary task is to select a plant, read its documented regional distribution, narrow to a locality and inspect the corresponding primary source. Use Arabic RTL in document order and isolate Latin names and opaque identifiers. Number formatting and mixed scripts are project choices (NEEDS-VERIFICATION as UDS conventions).

## Components and structure

Navigation Header → atlas title and coverage → map alongside a species Card → Filtration with native Dropdowns → evidence List → Footer. A Search Box in the species Modal searches both Arabic and Latin names. The import Modal uses File Uploader and Button patterns, previews validation and offers a versioned JSON download. Native HTML implements these documented patterns for a small static application. The only documented installable UDS library targets React. This app uses native ES modules and no React runtime. It does not assume undocumented package props or claim to use packaged widgets.

The Charts catalog publishes pie, bar and line types. None can render administrative polygons. Use an SVG choropleth with actual boundaries, labels, non-color occurrence markers, keyboard selection and equivalent full-size region and locality controls. CSS dimensions, fonts, colors and layout use audited repository aliases. Geographic coordinates and projection constants are cartographic data. Use figure geometry at full width and a stacked layout on narrow screens. Mark maps as a cartographic component exception under UDS-GOV-006, UDS-COMP-CHART-001, UDS-A11Y-022, UDS-LAYOUT-014. Every region has a 44 CSS-pixel label target. Compact-map callouts move apart and connect to the polygons with leader lines. A native region selector provides the same selection.

Test default, focused, hovered, selected, waiting, disabled, unknown binding, empty region, no search results, import errors and success. Verify keyboard and dialog focus, Arabic DOM order, contrast, screen reader, responsive ranges and zoom. Keep bibliographic citations and a visible data-version label. Load the Excel parser on demand and keep files on-device.

## Applicable registry IDs

UDS-GOV-001–008; UDS-COLOR-001–002,005–012; UDS-TYPO-001,003–009,011; UDS-LAYOUT-001–016; UDS-ELEV-001–002; UDS-RTL-001–002,005; UDS-A11Y-001–015,022,025; UDS-COMP-BUTTON-001–003; UDS-COMP-LINK-001–002; UDS-COMP-CARD-001; UDS-COMP-LIST-001; UDS-COMP-CHART-001; UDS-COMP-FILTER-001; UDS-COMP-SEARCH-001; UDS-COMP-FOOTER-001; UDS-COMP-INPUT-001; UDS-COMP-UPLOAD-001; UDS-COMP-LOADING-001; UDS-FORM-001–003; UDS-CONTENT-001–005,007; UDS-TEMPLATE-SEARCH-001–002; UDS-DEV-002–003,007; UDS-PLATFORM-002–005; UDS-QUALITY-001–003.

Sources: audited workspace registries (2026-09-07), https://design.dga.gov.sa/guidelines/templates/search-page and https://design.dga.gov.sa/guidelines/components/data-display/charts . Live DGA pages timed out during implementation. Their current status and equivalence with official packaged widgets need verification.

# Saudi Unified Platform Code — Codex Instructions

These instructions govern every UI page or component created or changed in this repository. Non-UI work is outside this document's scope.

All UI development in this repository **MUST** comply with the Saudi Unified Platform Code reference contained in:

- `.design-system/Saudi_Unified_Platform_Code_Master_Guide.md`
- `.design-system/Saudi_Unified_Platform_Code_Rules.md`
- `.design-system/uds-rules.json`
- `.design-system/uds-components.json`
- `.design-system/uds-templates.json`
- `.design-system/UDS_DEFINITION_OF_DONE.md`

The machine-readable registries are enforcement inputs; the Master Guide supplies interpretation and official-source context. If they disagree, stop, cite the conflict, and prefer the directly supported official rule. Never silently invent missing guidance.

## Requirement levels

- `REQUIRED`: blocking. The implementation is not complete while violated.
- `RECOMMENDED`: follow unless a documented project constraint justifies an exception.
- `OPTIONAL`: select only when the page need supports it.
- `INFERRED`: implementation guidance derived from official material; do not present it as an official standalone requirement.
- `NOT PUBLISHED BY OFFICIAL SOURCE`: unknown. Do not fill it with a common practice and call it official.

Use `SOURCE-CONFLICT` when two official artifacts conflict. Use `NEEDS-VERIFICATION` when the official public source is insufficient.

## Mandatory page-build workflow

Before writing UI code:

1. Identify the page type, primary user task, language, content, and data states.
2. Find the closest official template in `uds-templates.json`.
3. List the applicable Rule IDs from `uds-rules.json`.
4. List the official components to use from `uds-components.json`.
5. Read the direct sources for any ambiguous, high-impact, or time-sensitive rule.
6. Create an implementation plan that covers structure, components, tokens, RTL, responsive behavior, accessibility, content, and validation.

Then:

7. Implement the smallest complete solution.
8. Run `python3 tools/uds-compliance/uds_compliance.py <target>`.
9. Fix all `FAIL` findings and assess every `WARNING`.
10. Re-run the checker until there are no failures.
11. Complete the manual items in `UDS_DEFINITION_OF_DONE.md`.
12. Report the compliance result in the required format below.

Do not claim compliance based only on the static checker. `SEMI_AUTOMATED` and `MANUAL` rules require human or runtime verification.

## Component reuse rule

If an official Unified Platform component exists for the required interaction, **DO NOT create a custom replacement unless technically necessary**.

Before using a custom component, document:

- the official component considered;
- the concrete technical reason it cannot be used;
- the Rule IDs that still apply;
- how keyboard, ARIA, RTL, responsive behavior, states, and tokens remain compliant;
- the exception in the final compliance report.

Do not infer React prop names or CSS APIs from the minified public bundles. The public Storybook and GitHub implementation documentation was not available at the verification date.

## Design token rule

Never hard-code visual values when an official Unified Platform design token exists.

This includes colors, spacing, font size/line height, radius, shadows, container widths, and touch-target sizing. Use the audited aliases in `.design-system/uds-tokens.css`, or map the project's existing token layer to the same official values.

Breakpoint literals `600px`, `960px`, and `1280px` are allowed in CSS media queries because CSS custom properties cannot be used directly in standard media-query conditions. Do not introduce another breakpoint and label it official.

The `--uds-*` names are repository aliases marked `INFERRED`; their values are official. When the official package publishes a stable token API, migrate aliases deliberately and update the audit date.

## RTL and Arabic rule

Any Arabic page must set:

```text
language = ar
direction = rtl
```

Implement this as `lang="ar"` and `dir="rtl"` on the document root. Test, using only documented rules:

- layout and DOM reading order;
- directional icons;
- Breadcrumbs;
- primary and mobile navigation;
- form fields and validation;
- tables;
- pagination;
- mixed Arabic/English content.

Do not use visual reversal that breaks DOM or keyboard order. The public source does not publish a universal number/date/phone or bidirectional-text formatting convention; mark those decisions `NEEDS-VERIFICATION` instead of calling them UDS requirements.

## Accessibility is Definition of Done

Accessibility is part of the Definition of Done. An implementation that violates an applicable documented accessibility rule is incomplete.

At minimum verify semantic HTML, keyboard-only operation, visible focus, accessible names, form labels and errors, dynamic announcements, modal focus, text/image alternatives, 44×44px touch targets, contrast, responsive reflow, and reduced motion where animation exists.

Automated success is necessary but not sufficient. Keyboard, screen-reader, contrast, zoom, orientation, and visual/state checks remain explicit review work when the registry classifies them as `SEMI_AUTOMATED` or `MANUAL`.

## Content and state completeness

Use Arabic-first, clear, concise content. A button describes the action result; a link describes the destination; an error explains the problem and correction. Do not communicate meaning with color or icon alone.

Implement all applicable states published for the selected component: default, hover, pressed/active, focus, disabled, error, success, and loading. If a registry field says `NOT PUBLISHED BY OFFICIAL SOURCE`, do not create an “official” state; use a documented project decision and label it accordingly.

## Required AI response format

After developing or changing any UI, end with:

```text
Unified Platform Compliance

Template:
<official template ID/name, or NEEDS-VERIFICATION>

Official Components Used:
<component names>

Applicable Rules:
<Rule IDs>

Automated Checks:
PASS / FAIL
<checker summary and report path>

Manual Checks:
<completed checks and remaining checks>

Known Exceptions:
<none, or each exception with reason and affected Rule IDs>

Overall:
COMPLIANT | PARTIALLY COMPLIANT | NON-COMPLIANT
```

Use `COMPLIANT` only when all applicable `REQUIRED` rules pass and required manual checks are complete. Use `PARTIALLY COMPLIANT` when no known blocking violation remains but manual verification or justified recommended exceptions remain. Use `NON-COMPLIANT` when an applicable required rule fails.

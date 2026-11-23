#!/usr/bin/env python3
"""Static Saudi Unified Platform Code compliance checker.

The checker intentionally automates only rules that can be evaluated reliably
from source markup/CSS. Semi-automated and manual rules are always reported as
manual review work, never silently converted to pass/fail.
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import sys
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RULES = ROOT / ".design-system" / "uds-rules.json"
SCAN_SUFFIXES = {".html", ".htm", ".css", ".scss", ".jsx", ".tsx"}
ARABIC_RE = re.compile(r"[\u0600-\u06ff]")
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


@dataclass
class Element:
    tag: str
    attrs: dict[str, str]
    line: int
    ancestors: tuple[int, ...]


@dataclass
class Finding:
    severity: str
    rule_id: str
    element: str
    file: str
    line: int
    problem: str
    required: str
    source: str


class MarkupParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.elements: list[Element] = []
        self.stack: list[int] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        attr_map = {key.lower(): (value or "") for key, value in attrs}
        index = len(self.elements)
        self.elements.append(Element(tag.lower(), attr_map, self.getpos()[0], tuple(self.stack)))
        if tag.lower() not in VOID_TAGS:
            self.stack.append(index)

    def handle_startendtag(self, tag: str, attrs) -> None:
        self.handle_starttag(tag, attrs)
        if self.stack and self.elements[self.stack[-1]].tag == tag.lower():
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        while self.stack:
            index = self.stack.pop()
            if self.elements[index].tag == tag:
                break


class Checker:
    def __init__(self, target: Path, rules_path: Path) -> None:
        self.target = target.resolve()
        self.rules_path = rules_path.resolve()
        payload = json.loads(self.rules_path.read_text(encoding="utf-8"))
        self.rules = {item["id"]: item for item in payload["rules"]}
        self.automated = {item["id"] for item in payload["rules"] if item["testability"] == "AUTOMATED"}
        self.manual = [item["id"] for item in payload["rules"] if item["testability"] != "AUTOMATED"]
        self.findings: list[Finding] = []
        self.executed: set[str] = set()
        self.files: list[Path] = []

    def rel(self, path: Path) -> str:
        try:
            return str(path.resolve().relative_to(ROOT))
        except ValueError:
            return str(path.resolve())

    def rule(self, rule_id: str) -> dict:
        return self.rules.get(
            rule_id,
            {"rule": "See official rule catalog.", "source_url": "https://design.dga.gov.sa/"},
        )

    def add(self, severity: str, rule_id: str, path: Path, line: int, element: str, problem: str) -> None:
        rule = self.rule(rule_id)
        self.findings.append(
            Finding(severity, rule_id, element, self.rel(path), line, problem, rule["rule"], rule["source_url"])
        )

    def mark(self, *rule_ids: str) -> None:
        self.executed.update(rule_ids)

    def scan_files(self) -> Iterable[Path]:
        if self.target.is_file():
            candidates = [self.target]
        else:
            candidates = sorted(self.target.rglob("*"))
        ignored = {".git", "node_modules", ".venv", "venv", "dist", "build", "__pycache__"}
        for path in candidates:
            if not path.is_file() or path.suffix.lower() not in SCAN_SUFFIXES:
                continue
            if any(part in ignored for part in path.parts):
                continue
            yield path

    @staticmethod
    def has_accessible_name(attrs: dict[str, str]) -> bool:
        return bool(attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title"))

    @staticmethod
    def classes(attrs: dict[str, str]) -> set[str]:
        return set(attrs.get("class", "").split())

    def check_markup(self, path: Path, text: str) -> None:
        parser = MarkupParser()
        try:
            parser.feed(text)
        except Exception as exc:
            self.add("WARNING", "UDS-GOV-003", path, 1, "document", f"Markup parser could not fully parse the file: {exc}")
            return
        elements = parser.elements
        tags = [e.tag for e in elements]
        arabic_page = len(ARABIC_RE.findall(text)) >= 20
        html_element = next((e for e in elements if e.tag == "html"), None)

        self.mark("UDS-RTL-001")
        if arabic_page:
            if not html_element or html_element.attrs.get("lang", "").lower() != "ar" or html_element.attrs.get("dir", "").lower() != "rtl":
                self.add("FAIL", "UDS-RTL-001", path, html_element.line if html_element else 1, "html", "Arabic content requires lang=ar and dir=rtl on the root html element.")

        self.mark("UDS-LAYOUT-013")
        viewport = [e for e in elements if e.tag == "meta" and e.attrs.get("name", "").lower() == "viewport"]
        if not viewport:
            self.add("FAIL", "UDS-LAYOUT-013", path, 1, "head", "Missing responsive viewport metadata.")

        self.mark("UDS-A11Y-007")
        for e in (item for item in elements if item.tag == "img"):
            if "alt" not in e.attrs:
                self.add("FAIL", "UDS-A11Y-007", path, e.line, "img", "Image is missing an alt attribute; use meaningful text or alt=\"\" for decorative images.")

        self.mark("UDS-A11Y-008")
        label_for = {e.attrs.get("for") for e in elements if e.tag == "label" and e.attrs.get("for")}
        controls = [e for e in elements if e.tag in {"input", "select", "textarea"} and e.attrs.get("type") not in {"hidden", "submit", "button", "reset"}]
        for e in controls:
            wrapped = any(elements[index].tag == "label" for index in e.ancestors)
            named = self.has_accessible_name(e.attrs) or wrapped or (e.attrs.get("id") in label_for)
            if not named:
                self.add("FAIL", "UDS-A11Y-008", path, e.line, e.tag, "Form control has no associated label or accessible name.")

        ids = {e.attrs.get("id") for e in elements if e.attrs.get("id")}
        self.mark("UDS-A11Y-009", "UDS-A11Y-010")
        for e in controls:
            invalid = e.attrs.get("aria-invalid", "").lower() == "true" or "error" in self.classes(e.attrs)
            described = [token for token in e.attrs.get("aria-describedby", "").split() if token]
            if invalid and not described:
                self.add("FAIL", "UDS-A11Y-009", path, e.line, e.tag, "Invalid field is not associated with corrective help/error text using aria-describedby.")
            if described and any(token not in ids for token in described):
                self.add("FAIL", "UDS-A11Y-009", path, e.line, e.tag, "aria-describedby references an ID that does not exist in the document.")
            error_class = "error" in self.classes(e.attrs)
            if error_class and e.attrs.get("aria-invalid", "").lower() != "true":
                self.add("FAIL", "UDS-A11Y-010", path, e.line, e.tag, "Visually invalid field is missing aria-invalid=true.")

        self.mark("UDS-COMP-BUTTON-001")
        for e in (item for item in elements if item.tag in {"div", "span"} and ("onclick" in item.attrs or item.attrs.get("role") == "button")):
            self.add("FAIL", "UDS-COMP-BUTTON-001", path, e.line, e.tag, "Custom clickable div/span detected; use a native button for an action.")
        for e in (item for item in elements if item.tag == "a" and not item.attrs.get("href")):
            self.add("FAIL", "UDS-COMP-BUTTON-001", path, e.line, "a", "Anchor without href is not a valid navigation link; use button for actions or supply href.")

        self.mark("UDS-A11Y-005")
        button_pattern = re.compile(r"<button\b([^>]*)>(.*?)</button>", re.I | re.S)
        for match in button_pattern.finditer(text):
            attrs_text, body = match.groups()
            body_text = html_lib.unescape(re.sub(r"<[^>]+>", "", body)).strip()
            named = re.search(r"\b(?:aria-label|aria-labelledby|title)\s*=", attrs_text, re.I)
            if not body_text and not named:
                line = text.count("\n", 0, match.start()) + 1
                self.add("FAIL", "UDS-A11Y-005", path, line, "button", "Icon-only or empty button has no accessible name.")

        self.mark("UDS-COMP-LINK-002")
        for e in (item for item in elements if item.tag == "a" and item.attrs.get("target", "").lower() == "_blank"):
            rel = set(e.attrs.get("rel", "").lower().split())
            if not {"noopener", "noreferrer"}.issubset(rel):
                self.add("FAIL", "UDS-COMP-LINK-002", path, e.line, "a[target=_blank]", "New-context link must include rel=\"noopener noreferrer\".")

        self.mark("UDS-COMP-LIST-001")
        for e in (item for item in elements if item.attrs.get("data-uds-component") == "list"):
            if e.tag not in {"ul", "ol"}:
                self.add("FAIL", "UDS-COMP-LIST-001", path, e.line, e.tag, "A declared UDS list must use ul or ol semantics.")

        self.mark("UDS-COMP-TABLE-001")
        for e in (item for item in elements if item.tag == "table"):
            descendants = [d for d in elements if e is not d and elements.index(e) in d.ancestors]
            if not any(d.tag == "th" for d in descendants):
                self.add("FAIL", "UDS-COMP-TABLE-001", path, e.line, "table", "Data table has no th header cells.")

        checks = [
            ("modal", "UDS-A11Y-014", "role", "dialog"),
            ("switch", "UDS-A11Y-019", "role", "switch"),
            ("slider", "UDS-A11Y-020", "role", "slider"),
        ]
        for component_name, rule_id, attr, expected in checks:
            self.mark(rule_id)
            for e in (item for item in elements if item.attrs.get("data-uds-component") == component_name):
                native_slider = component_name == "slider" and e.tag == "input" and e.attrs.get("type") == "range"
                if not native_slider and e.attrs.get(attr) != expected:
                    self.add("FAIL", rule_id, path, e.line, e.tag, f"Declared {component_name} is missing {attr}={expected}.")
                if component_name == "modal" and e.attrs.get("aria-modal") != "true":
                    self.add("FAIL", rule_id, path, e.line, e.tag, "Modal is missing aria-modal=true.")
                if component_name == "switch" and "aria-checked" not in e.attrs:
                    self.add("FAIL", rule_id, path, e.line, e.tag, "Switch is missing aria-checked.")
                if component_name == "slider":
                    required = {"min", "max", "value"} if native_slider else {"aria-valuemin", "aria-valuemax", "aria-valuenow"}
                    missing = required - e.attrs.keys()
                    if missing:
                        self.add("FAIL", rule_id, path, e.line, e.tag, f"Slider is missing value attributes: {', '.join(sorted(missing))}.")

        self.mark("UDS-A11Y-018")
        for e in (item for item in elements if item.attrs.get("data-uds-component") in {"progress-bar", "radial-stepper"}):
            if e.attrs.get("role") != "progressbar" or not {"aria-valuemin", "aria-valuemax", "aria-valuenow"}.issubset(e.attrs):
                self.add("FAIL", "UDS-A11Y-018", path, e.line, e.tag, "Known progress component needs role=progressbar and min/max/current values.")

        self.mark("UDS-A11Y-016")
        if any(e.attrs.get("data-uds-component") == "tabs" for e in elements):
            tabs = [e for e in elements if e.attrs.get("role") == "tab"]
            if not any(e.attrs.get("role") == "tablist" for e in elements) or not tabs:
                self.add("FAIL", "UDS-A11Y-016", path, 1, "tabs", "Declared tabs require tablist and tab roles.")
            for e in tabs:
                if "aria-selected" not in e.attrs or "aria-controls" not in e.attrs:
                    self.add("FAIL", "UDS-A11Y-016", path, e.line, e.tag, "Each tab requires aria-selected and aria-controls.")

        nav_specs = [
            ("breadcrumbs", "UDS-COMP-BREADCRUMB-001", "page"),
            ("pagination", "UDS-COMP-PAGINATION-001", "page"),
            ("table-of-content", "UDS-COMP-TOC-001", None),
        ]
        self.mark("UDS-A11Y-017")
        for component_name, rule_id, current_value in nav_specs:
            self.mark(rule_id)
            roots = [e for e in elements if e.attrs.get("data-uds-component") == component_name]
            for root in roots:
                root_index = elements.index(root)
                descendants = [e for e in elements if root_index in e.ancestors]
                if root.tag != "nav":
                    self.add("FAIL", rule_id, path, root.line, root.tag, f"{component_name} must use a nav landmark.")
                current = [e for e in descendants if "aria-current" in e.attrs]
                if not current:
                    self.add("FAIL", rule_id, path, root.line, root.tag, f"{component_name} has no aria-current descendant.")
                elif current_value and all(e.attrs.get("aria-current") != current_value for e in current):
                    self.add("FAIL", rule_id, path, root.line, root.tag, f"{component_name} current item must use aria-current={current_value}.")

        self.mark("UDS-COMP-STEPS-001")
        for root in (e for e in elements if e.attrs.get("data-uds-component") == "steps"):
            index = elements.index(root)
            descendants = [e for e in elements if index in e.ancestors]
            if root.tag != "ol" or not any(e.attrs.get("aria-current") == "step" for e in descendants):
                self.add("FAIL", "UDS-COMP-STEPS-001", path, root.line, root.tag, "Steps must use an ordered list and mark the current step with aria-current=step.")

        self.mark("UDS-COMP-SEARCH-001")
        search_roots = [e for e in elements if e.attrs.get("role") == "search" or e.attrs.get("data-uds-component") == "search-box"]
        for root in search_roots:
            root_index = elements.index(root)
            descendants = [e for e in elements if root_index in e.ancestors]
            fields = [e for e in ([root] + descendants) if e.tag == "input" and e.attrs.get("type", "text") in {"search", "text"}]
            if root.attrs.get("role") != "search":
                self.add("FAIL", "UDS-COMP-SEARCH-001", path, root.line, root.tag, "Search area is missing role=search.")
            if not fields:
                self.add("FAIL", "UDS-COMP-SEARCH-001", path, root.line, root.tag, "Search area has no search input.")

        self.mark("UDS-COMP-TOC-001")
        if any(e.attrs.get("data-uds-component") == "table-of-content" for e in elements):
            if not any(e.tag == "a" and e.attrs.get("href") == "#main-content" for e in elements):
                self.add("FAIL", "UDS-COMP-TOC-001", path, 1, "document", "A page with TOC needs a skip link to #main-content.")

        self.mark("UDS-COMP-FOOTER-001")
        home_template = html_element and html_element.attrs.get("data-uds-template") == "home"
        if home_template and "footer" not in tags:
            self.add("FAIL", "UDS-COMP-FOOTER-001", path, 1, "document", "Home template is missing a footer landmark.")
        if home_template:
            for required_tag in ("header", "nav", "main"):
                if required_tag not in tags:
                    self.add("FAIL", "UDS-TEMPLATE-HOME-001", path, 1, "document", f"Home template is missing required {required_tag} structure.")

        self.mark("UDS-CONTENT-004")
        heading_levels = [int(e.tag[1]) for e in elements if re.fullmatch(r"h[1-6]", e.tag)]
        for previous, current in zip(heading_levels, heading_levels[1:]):
            if current - previous > 1:
                offending = next(e for e in elements if e.tag == f"h{current}")
                self.add("FAIL", "UDS-CONTENT-004", path, offending.line, offending.tag, f"Heading hierarchy skips from h{previous} to h{current}.")
                break

        duplicate_ids = []
        seen = set()
        for e in elements:
            value = e.attrs.get("id")
            if value and value in seen:
                duplicate_ids.append((value, e.line, e.tag))
            elif value:
                seen.add(value)
        for value, line, tag in duplicate_ids:
            self.add("FAIL", "UDS-A11Y-009", path, line, tag, f"Duplicate id={value!r} breaks label/ARIA relationships.")

    def check_css(self, path: Path, text: str) -> None:
        self.mark("UDS-TYPO-001")
        if "font-family" in text and "var(--uds-font-family" not in text and "IBM Plex Sans Arabic" not in text:
            line = next((i for i, value in enumerate(text.splitlines(), 1) if "font-family" in value), 1)
            self.add("FAIL", "UDS-TYPO-001", path, line, "font-family", "CSS font-family does not use the UDS font token or IBM Plex Sans Arabic.")

        official_token_file = path.name == "uds-tokens.css" and path.parent.name == ".design-system"
        if not official_token_file:
            for match in re.finditer(r"#[0-9a-fA-F]{3,8}\b", text):
                line = text.count("\n", 0, match.start()) + 1
                self.add("WARNING", "UDS-COLOR-012", path, line, "CSS color", f"Hard-coded color {match.group(0)}; use an audited design token when one exists.")
            allowed_spacing = {0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160}
            for match in re.finditer(r"(?:margin|padding|gap)(?:-[a-z]+)?\s*:\s*([0-9]+)px", text, re.I):
                value = int(match.group(1))
                if value not in allowed_spacing:
                    line = text.count("\n", 0, match.start()) + 1
                    self.add("WARNING", "UDS-LAYOUT-009", path, line, "CSS spacing", f"Spacing value {value}px is outside the official semantic spacing scale.")
            allowed_radius = {0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 9999}
            for match in re.finditer(r"border-radius\s*:\s*([0-9]+)px", text, re.I):
                value = int(match.group(1))
                if value not in allowed_radius:
                    line = text.count("\n", 0, match.start()) + 1
                    self.add("WARNING", "UDS-LAYOUT-010", path, line, "CSS radius", f"Radius {value}px is outside the published radius scale.")

        self.mark("UDS-A11Y-003")
        if ":focus" not in text and ":focus-visible" not in text:
            self.add("WARNING", "UDS-A11Y-003", path, 1, "stylesheet", "No explicit focus/focus-visible style was found; verify a visible focus indicator is supplied globally.")

    def run(self) -> dict:
        self.files = list(self.scan_files())
        if not self.files:
            self.add("WARNING", "UDS-GOV-003", self.target, 1, "target", "No supported HTML/CSS/JSX/TSX files were found.")
        for path in self.files:
            text = path.read_text(encoding="utf-8", errors="replace")
            if path.suffix.lower() in {".html", ".htm", ".jsx", ".tsx"}:
                self.check_markup(path, text)
            if path.suffix.lower() in {".css", ".scss"}:
                self.check_css(path, text)

        failed_ids = {f.rule_id for f in self.findings if f.severity == "FAIL"}
        warning_ids = {f.rule_id for f in self.findings if f.severity == "WARNING"}
        passed = sorted((self.executed & self.automated) - failed_ids - warning_ids)
        unexecuted_automated = sorted(self.automated - self.executed)
        manual_review = sorted(set(self.manual) | set(unexecuted_automated))
        return {
            "tool": "Saudi Unified Platform Compliance Checker",
            "target": self.rel(self.target),
            "rules_file": self.rel(self.rules_path),
            "scanned_files": [self.rel(path) for path in self.files],
            "summary": {
                "PASS": len(passed),
                "FAIL": len([f for f in self.findings if f.severity == "FAIL"]),
                "WARNING": len([f for f in self.findings if f.severity == "WARNING"]),
                "MANUAL_REVIEW": len(manual_review),
            },
            "passed_rule_ids": passed,
            "manual_review_rule_ids": manual_review,
            "findings": [asdict(f) for f in self.findings],
        }


def text_report(report: dict) -> str:
    summary = report["summary"]
    lines = [
        "Saudi Unified Platform Compliance Report",
        "",
        f"Target: {report['target']}",
        f"Files scanned: {len(report['scanned_files'])}",
        "",
        f"PASS: {summary['PASS']}",
        f"FAIL: {summary['FAIL']}",
        f"WARNING: {summary['WARNING']}",
        f"MANUAL REVIEW: {summary['MANUAL_REVIEW']}",
    ]
    for finding in report["findings"]:
        lines.extend(
            [
                "",
                finding["severity"],
                finding["rule_id"],
                f"Element: {finding['element']}",
                f"File: {finding['file']}:{finding['line']}",
                f"Problem: {finding['problem']}",
                f"Required: {finding['required']}",
                f"Source: {finding['source']}",
            ]
        )
    lines.extend(
        [
            "",
            "Manual review rule IDs:",
            ", ".join(report["manual_review_rule_ids"]) or "None",
        ]
    )
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", nargs="?", default=".", type=Path)
    parser.add_argument("--rules", type=Path, default=DEFAULT_RULES)
    parser.add_argument("--json-out", type=Path)
    parser.add_argument("--text-out", type=Path)
    parser.add_argument("--strict", action="store_true", help="Exit nonzero when warnings exist")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    checker = Checker(args.target, args.rules)
    report = checker.run()
    rendered = text_report(report)
    print(rendered, end="")
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.text_out:
        args.text_out.parent.mkdir(parents=True, exist_ok=True)
        args.text_out.write_text(rendered, encoding="utf-8")
    if report["summary"]["FAIL"]:
        return 1
    if args.strict and report["summary"]["WARNING"]:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())

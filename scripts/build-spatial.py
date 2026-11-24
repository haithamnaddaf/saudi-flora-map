#!/usr/bin/env python3
"""Build optional spatial companions for the occurrences in published UUID packs.

python3 scripts/build-spatial.py --input /path/to/siwar_plant_distribution.json
Only existing published occurrence references are used. No plant matching,
geocoding, administrative reassignment, or synthetic coordinates are performed.
"""

import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re


UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
OCCURRENCE_URL = re.compile(r'^https://www\.gbif\.org/occurrence/([0-9]+)$')
DISPLAY_STATUS = 'documented_for_supplied_taxon'
BINDING_FIELDS = ('regionId', 'place', 'sourceId', 'sourceTitle', 'sourceUrl',
                  'sourceKind', 'sourceScientificName', 'locator')
# A project display policy, not a claim that all GBIF issue flags are errors.
# Rounding and derived administrative assignments alone do not disqualify a point.
GEOGRAPHIC_ISSUES = {
    'COUNTRY_MISMATCH', 'COUNTRY_COORDINATE_MISMATCH', 'COORDINATE_COUNTRY_MISMATCH',
    'COORDINATE_INVALID', 'COORDINATE_OUT_OF_RANGE', 'ZERO_COORDINATE',
    'PRESUMED_SWAPPED_COORDINATE', 'COORDINATE_REPROJECTION_FAILED',
    'COORDINATE_REPROJECTION_SUSPICIOUS', 'GEODETIC_DATUM_INVALID',
    'COORDINATE_UNCERTAINTY_METERS_INVALID', 'COORDINATE_PRECISION_INVALID',
}


def finite_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n').encode()


def binding_for(record):
    binding = {key: record[key] for key in BINDING_FIELDS}
    binding['recordUrls'] = sorted(record.get('recordUrls', []))
    return binding


class RegionGeometry:
    """Use the same pinned, generalized paths as the reader map, without a GIS dependency."""

    def __init__(self, regions):
        self.regions = {}
        expected = {'SA-' + code for code in ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '14')}
        if len(regions) != 13 or {region['id'] for region in regions} != expected:
            raise ValueError('Expected the existing thirteen Saudi region geometries')
        for region in regions:
            path = region['path']
            # prepare-boundaries.py writes straight, absolute M...Z rings only.
            if not re.fullmatch(r'(?:M[-0-9., ]+Z)+', path):
                raise ValueError('Unsupported region path; review the projection before rebuilding')
            rings = []
            for match in re.finditer(r'M([^MZ]+)Z', path):
                numbers = [float(value) for value in re.findall(r'-?\d+(?:\.\d+)?', match[1])]
                if len(numbers) < 6 or len(numbers) % 2:
                    raise ValueError('Invalid boundary ring')
                points = list(zip(numbers[::2], numbers[1::2]))
                xs, ys = zip(*points)
                rings.append((points, (min(xs), min(ys), max(xs), max(ys))))
            self.regions[region['id']] = rings

    @staticmethod
    def ring_contains(x, y, points):
        inside = False
        previous = points[-1]
        for current in points:
            ax, ay = previous
            bx, by = current
            cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax)
            if (abs(cross) < 1e-9 and min(ax, bx) <= x <= max(ax, bx)
                    and min(ay, by) <= y <= max(ay, by)):
                return True
            if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
                inside = not inside
            previous = current
        return inside

    def containing(self, longitude, latitude):
        # Same equirectangular transform as scripts/prepare-boundaries.py.
        x, y = 130 + (longitude - 34.5) * 26, 10 + (32.5 - latitude) * 29
        result = set()
        for region_id, rings in self.regions.items():
            inside = False
            for points, (left, top, right, bottom) in rings:
                if left <= x <= right and top <= y <= bottom and self.ring_contains(x, y, points):
                    inside = not inside
            if inside:
                result.add(region_id)
        return result


def project_observation(occurrence, record, geometry):
    coordinates = occurrence.get('coordinates_interpreted_by_gbif')
    valid_coordinates = (isinstance(coordinates, list) and len(coordinates) == 2
                         and all(finite_number(value) for value in coordinates)
                         and -180 <= coordinates[0] <= 180 and -90 <= coordinates[1] <= 90)
    uncertainty = occurrence.get('coordinate_uncertainty_m')
    valid_uncertainty = finite_number(uncertainty) and uncertainty > 0
    reasons = []
    if not valid_coordinates:
        reasons.append('coordinates_missing_or_invalid')
    if not valid_uncertainty or occurrence.get('uncertainty_missing_or_invalid') is True:
        reasons.append('uncertainty_missing_or_invalid')
    elif uncertainty > 1000:
        reasons.append('uncertainty_exceeds_1000m')
    if occurrence.get('point_display_policy') != 'show_with_reported_uncertainty':
        reasons.append('source_point_policy_not_eligible')
    if occurrence.get('information_withheld') or occurrence.get('data_generalizations'):
        reasons.append('publisher_hid_or_generalized_location')
    for issue in sorted(set(occurrence.get('issues') or []) & GEOGRAPHIC_ISSUES):
        reasons.append('geographic_issue:' + issue)
    if occurrence.get('reported_region_conflict') is True:
        reasons.append('reported_region_conflict')
    if (occurrence.get('taxonomic_record_usable') is not True
            or occurrence.get('basis_usable_for_distribution') is not True
            or occurrence.get('occurrence_status') not in ('PRESENT', 'DETECTED')):
        reasons.append('source_distribution_gate_not_eligible')
    gadm = occurrence.get('gadm') or {}
    country = gadm.get('level0') or {}
    if country.get('gid') and country['gid'] != 'SAU':
        reasons.append('source_country_assignment_conflict')
    if valid_coordinates:
        containing = geometry.containing(*coordinates)
        if not containing:
            reasons.append('outside_current_saudi_geometry')
        elif record['regionId'] is not None and record['regionId'] not in containing:
            reasons.append('outside_record_region_geometry')
    governorate = gadm.get('level2') or {}
    eligible = not reasons
    return {
        'id': str(occurrence['occurrence_id']),
        'recordId': record['id'],
        'regionId': record['regionId'],
        # Ineligible coordinates are deliberately absent from the public payload.
        # The original research remains the archival source for those numbers.
        'latitude': coordinates[1] if eligible else None,
        'longitude': coordinates[0] if eligible else None,
        'uncertaintyMeters': uncertainty if valid_uncertainty else None,
        'pointEligible': eligible,
        'localityOriginal': occurrence.get('locality_verbatim') or '',
        'publisherRegionOriginal': occurrence.get('state_province_verbatim') or '',
        'governorateOriginal': governorate.get('name') or '',
        'governorateId': governorate.get('gid') or '',
        'governorateDerived': bool(governorate.get('name') or governorate.get('gid')),
        'eventDate': occurrence.get('event_date_interpreted_by_gbif') or '',
        'basisOfRecord': occurrence.get('basis_of_record') or '',
        'sourceId': occurrence['source_id'],
        'referenceUrl': occurrence['source_url'],
        'license': occurrence.get('license') or '',
        'pointSuppressionReasons': reasons,
    }


def build_plant(plant, occurrences, geometry):
    if not UUID.fullmatch(plant['uuid']):
        raise ValueError('Invalid plant UUID')
    if plant['status'] != DISPLAY_STATUS:
        if plant['records']:
            raise ValueError('Held plant unexpectedly has published records')
        return None
    observations, bindings, seen = [], {}, set()
    for record in plant['records']:
        if record['status'] != 'verified' or record['sourceKind'] != 'occurrence_records':
            continue
        for url in record.get('recordUrls', []):
            match = OCCURRENCE_URL.fullmatch(url)
            if not match or match[1] not in occurrences:
                raise ValueError('Published occurrence reference is absent from the research: ' + url)
            identifier = match[1]
            occurrence = occurrences[identifier]
            if identifier in seen:
                raise ValueError('Duplicate occurrence within UUID: ' + plant['uuid'] + '/' + identifier)
            if occurrence['source_id'] != record['sourceId'] or occurrence['source_url'] != url:
                raise ValueError('Occurrence does not belong to its published source: ' + identifier)
            seen.add(identifier)
            bindings[record['id']] = binding_for(record)
            observations.append(project_observation(occurrence, record, geometry))
    if not observations:
        return None
    return {'schemaVersion': 1, 'baseVersion': plant['version'], 'uuid': plant['uuid'],
            'scientificName': plant['scientificName'], 'bindings': bindings,
            'observations': sorted(observations, key=lambda item: item['id'])}


def main():
    repo = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--data', type=Path, default=repo / 'public/data')
    parser.add_argument('--output', type=Path, default=repo / 'public/data/spatial')
    parser.add_argument('--report', type=Path, default=repo / 'docs/spatial-build-report.json')
    args = parser.parse_args()
    raw_bytes = args.input.read_bytes()
    research = json.loads(raw_bytes)
    occurrences = {str(item['occurrence_id']): item for item in research['occurrences']}
    if len(occurrences) != len(research['occurrences']):
        raise ValueError('Duplicate research occurrence IDs')
    catalog_bytes = (args.data / 'catalog.v2.json').read_bytes()
    catalog = json.loads(catalog_bytes)
    geometry_bytes = (args.data / 'regions.v1.json').read_bytes()
    geometry = RegionGeometry(json.loads(geometry_bytes))
    payloads = {}
    for listed in catalog['plants']:
        plant = json.loads((args.data / 'plants' / (listed['uuid'] + '.json')).read_bytes())
        if (plant['uuid'] != listed['uuid'] or plant['version'] != catalog['version']
                or plant['scientificName'] != listed['scientificName'] or plant['status'] != listed['status']):
            raise ValueError('Plant identity or release differs from catalog')
        payload = build_plant(plant, occurrences, geometry)
        if payload:
            payloads[plant['uuid']] = payload
    unexpected = {path.stem for path in args.output.glob('*.json')} - set(payloads)
    if unexpected:
        raise ValueError('Existing companions are absent from this build; review before removing them: ' + str(sorted(unexpected)))
    contents = {uuid: encoded(payload) for uuid, payload in payloads.items()}
    observations = [item for payload in payloads.values() for item in payload['observations']]
    unique = {item['id']: item for item in observations}
    largest_uuid = max(contents, key=lambda uuid: len(contents[uuid])) if contents else None
    report = {
        'schemaVersion': 1, 'baseVersion': catalog['version'],
        'researchInputSha256': hashlib.sha256(raw_bytes).hexdigest(),
        'catalogInputSha256': hashlib.sha256(catalog_bytes).hexdigest(),
        'geometryInputSha256': hashlib.sha256(geometry_bytes).hexdigest(),
        'counts': {
            'plantCompanions': len(payloads),
            'plantOccurrenceRelationships': len(observations),
            'uniqueOccurrenceIds': len(unique),
            'eligiblePointRelationships': sum(item['pointEligible'] for item in observations),
            'uniqueEligibleOccurrenceIds': len({item['id'] for item in observations if item['pointEligible']}),
            'plantsWithEligiblePoints': sum(any(item['pointEligible'] for item in payload['observations']) for payload in payloads.values()),
            'textOnlyRelationships': sum(not item['pointEligible'] for item in observations),
        },
        'pointSuppressionReasonCountsPerPlantOccurrence': dict(Counter(reason for item in observations for reason in item['pointSuppressionReasons'])),
        'licenseCountsPerPlantOccurrence': dict(Counter(item['license'] for item in observations)),
        'sizesBytes': {'allCompanions': sum(map(len, contents.values())),
                       'largestCompanion': len(contents[largest_uuid]) if largest_uuid else 0,
                       'largestCompanionUuid': largest_uuid},
        'policy': {
            'namedCoverage': 'The reader uses localityOriginal and publisherRegionOriginal as published names, never coordinates or GADM, to select a governorate or a region fallback. Archived point fields remain unchanged.',
            'uncertaintyMeters': 'Publisher-reported positive uncertainty at most 1000 m; not independently verified accuracy.',
            'qualityScope': 'Checks use the geographic issues, information_withheld, data_generalizations and point policy retained in the audited research snapshot. Publisher pages are not re-fetched or re-certified by this compiler.',
            'geometry': 'Must fall inside the existing generalized Saudi polygons and its existing assigned region when present. Boundary-near valid records may conservatively remain text-only.',
            'administrativeNames': 'governorateOriginal and governorateId retain GBIF/GADM level2 assignment. governorateDerived is explicit; no city or modern official status is inferred.',
            'binding': 'UUID, scientific identity and baseVersion must match. The referenced verified record must retain all bound location/source fields and occurrence URLs.',
            'license': 'Individual occurrence license retained verbatim, separately from any dataset-level license.',
            'nonPoints': 'Textual source details remain available; coordinates are null when pointEligible is false.',
            'privacy': 'No observer names, emails, publisher identifiers, or private enrichment fields are exported.',
        },
    }
    args.output.mkdir(parents=True, exist_ok=True)
    for uuid, content in contents.items():
        (args.output / (uuid + '.json')).write_bytes(content)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'counts': report['counts'], 'sizesBytes': report['sizesBytes']}, ensure_ascii=False))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Build small, UUID-addressed map assets from the audited research package.

Usage: python3 scripts/build-research.py --input /path/to/siwar_plant_distribution.json
The original research file stays outside the public web directory. No taxonomy,
geocoding, new coordinates, or inferred administrative coverage is added here.
"""

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit


VERSION = '2.0.0'
UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
DISPLAY_STATUS = 'documented_for_supplied_taxon'
REGION_IDS = {
    'SA-01', 'SA-02', 'SA-03', 'SA-04', 'SA-05', 'SA-06', 'SA-07',
    'SA-08', 'SA-09', 'SA-10', 'SA-11', 'SA-12', 'SA-14',
}


def required_text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'Missing {label}')
    return value.strip()


def safe_url(value, label):
    value = required_text(value, label)
    parsed = urlsplit(value)
    if (parsed.scheme not in ('https', 'http') or not parsed.hostname
            or parsed.username or parsed.password
            or any(char.isspace() for char in value)):
        raise ValueError(f'Unsafe {label}')
    return value


def indexed(items, key):
    result = {}
    for item in items:
        identifier = required_text(item.get(key), key)
        if identifier in result:
            raise ValueError(f'Duplicate {key}: {identifier}')
        result[identifier] = item
    return result


def administrative_name(name):
    """Only remove the administrative prefix; never fuzzy-match place names."""
    name = required_text(name, 'administrative name')
    for prefix in ('المنطقة ', 'منطقة '):
        if name.startswith(prefix):
            return name[len(prefix):]
    return name


def region_mapping(places, geometry):
    ids = {region['id'] for region in geometry}
    if ids != REGION_IDS or len(geometry) != 13:
        raise ValueError('Expected the existing 13 Saudi administrative geometries')
    by_name = {administrative_name(region['name']): region['id'] for region in geometry}
    if len(by_name) != 13:
        raise ValueError('Duplicate geometry names')
    mapping = {}
    for place in places.values():
        if place['place_type'] == 'administrative_region':
            name = administrative_name(place['name_ar'])
            if name not in by_name:
                raise ValueError(f'Unknown administrative region: {name}')
            mapping[place['place_id']] = by_name[name]
    if set(mapping.values()) != REGION_IDS or len(mapping) != 13:
        raise ValueError('Research regions do not match the existing geometry names')
    return mapping


def containing_region(place_id, places, mapping):
    """Follow only supplied, cited containment; a locality name is not a geocoder."""
    seen = set()
    while place_id:
        if place_id in seen:
            raise ValueError(f'Cyclic containment: {place_id}')
        seen.add(place_id)
        place = places[place_id]
        if place.get('country_code') != 'SA' or place['place_type'] == 'country':
            return None
        if place_id in mapping:
            return mapping[place_id]
        parent = place.get('parent_place_id')
        if not parent or not place.get('containment_source_url'):
            return None
        safe_url(place['containment_source_url'], 'containment source')
        place_id = parent
    return None


def record_base(evidence, place, source, region_id):
    return {
        'id': evidence['evidence_id'],
        'regionId': region_id,
        'place': required_text(place.get('display_name'), 'place display name'),
        'sourceId': source['source_id'],
        'sourceTitle': required_text(source.get('title'), 'source title'),
        'sourceUrl': safe_url(evidence.get('source_url') or source.get('url'), 'evidence URL'),
        'sourceKind': required_text(evidence.get('evidence_kind'), 'evidence kind'),
        'locator': required_text(evidence.get('source_section'), 'source locator'),
        # This is a research summary, never a verbatim quotation.
        'evidence': required_text(evidence.get('evidence_summary_ar'), 'evidence summary'),
        'sourceScientificName': required_text(evidence.get('source_scientific_name'), 'source scientific name'),
        'accessedOn': required_text(source.get('accessed_on'), 'access date'),
        'status': 'verified',
    }


def years_label(occurrences):
    years = sorted({item['year'] for item in occurrences if isinstance(item.get('year'), int)})
    if not years:
        return None
    return str(years[0]) if len(years) == 1 else f'{years[0]}–{years[-1]}'


def project_entry(entry, places, evidence, sources, occurrences, mapping, counters):
    uuid = required_text(entry.get('entry_id'), 'entry UUID')
    if not UUID.fullmatch(uuid):
        raise ValueError(f'Invalid entry UUID: {uuid}')
    distribution = entry['distribution']
    base = {
        'uuid': uuid,
        'senseId': required_text(entry.get('sense_id'), 'sense ID'),
        'name': required_text(entry.get('lemma_ar'), 'plant name'),
        'scientificName': required_text(entry.get('scientific_name_original'), 'scientific name'),
        'status': required_text(distribution.get('status'), 'distribution status'),
        'statusLabel': required_text(distribution.get('status_ar'), 'distribution status label'),
    }
    records = []
    if distribution.get('public_display_allowed_under_current_rules') is not True:
        return base, records
    if base['status'] != DISPLAY_STATUS:
        raise ValueError(f'Public display flag conflicts with held status: {uuid}')

    allowed_places = set(distribution['display_place_ids'])
    candidates = defaultdict(list)
    seen_links = set()
    for link in distribution['evidence_links']:
        if link.get('display_eligible') is not True:
            continue
        evidence_id = link['evidence_id']
        if evidence_id in seen_links:
            raise ValueError(f'Duplicate evidence link: {uuid}/{evidence_id}')
        seen_links.add(evidence_id)
        item = evidence[evidence_id]
        place = places[item['place_id']]
        if (item['place_id'] not in allowed_places
                or item.get('map_evidence_usable') is not True
                or link.get('taxonomy_link_usable') is not True
                or item.get('source_taxonomy_usable') is not True
                or place.get('country_code') != 'SA'
                or place['place_type'] == 'country'
                or item['evidence_kind'] == 'regional_aggregate_candidate'):
            counters['displayLinksRejectedByAdditionalGates'] += 1
            continue
        source = sources[item['source_id']]
        region_id = containing_region(item['place_id'], places, mapping)
        record = record_base(item, place, source, region_id)
        if item['evidence_kind'] != 'occurrence_records':
            records.append(record)
            continue
        if not item.get('occurrence_ids'):
            raise ValueError(f'Occurrence evidence without occurrence IDs: {evidence_id}')
        for occurrence_id in item['occurrence_ids']:
            occurrence = occurrences[str(occurrence_id)]
            if (occurrence.get('taxonomic_record_usable') is not True
                    or occurrence.get('basis_usable_for_distribution') is not True
                    or occurrence.get('reported_region_conflict') is True
                    or occurrence.get('occurrence_status') not in ('DETECTED', 'PRESENT')):
                counters['occurrenceLinksRejectedByAdditionalGates'] += 1
                continue
            if occurrence['source_id'] != source['source_id']:
                raise ValueError(f'Occurrence/source mismatch: {occurrence_id}')
            safe_url(occurrence.get('source_url'), 'occurrence URL')
            candidates[str(occurrence_id)].append((record, place, occurrence))

    # An occurrence can supply both a region and a locality evidence link.
    # Keep it once, preferring a cited, mapped locality over a region record.
    selected = {}
    for occurrence_id, options in candidates.items():
        regions = {option[0]['regionId'] for option in options if option[0]['regionId']}
        if len(regions) > 1:
            counters['occurrencesHeldForConflictingRegions'] += 1
            continue
        options.sort(key=lambda option: (
            option[0]['regionId'] is None,
            option[1]['place_type'] == 'administrative_region',
            option[0]['id'],
        ))
        record, place, occurrence = options[0]
        group = selected.setdefault(record['id'], {'record': record, 'occurrences': []})
        group['occurrences'].append(occurrence)
        counters['duplicateOccurrenceLinksRemoved'] += len(options) - 1

    for group in selected.values():
        record = group['record']
        details = sorted(group['occurrences'], key=lambda item: str(item['occurrence_id']))
        record['recordUrls'] = [item['source_url'] for item in details]
        record['sourceUrl'] = record['recordUrls'][0]
        year = years_label(details)
        if year:
            record['year'] = year
        records.append(record)
    records.sort(key=lambda record: (record['regionId'] or 'ZZ', record['sourceKind'], record['place'], record['id']))
    return base, records


def add_prototype_records(catalog, payloads, prototype, counters):
    """Preserve the existing six citations only after a unique full-name match."""
    if prototype is None:
        return
    original_plants = indexed(prototype['plants'], 'id')
    matching = {}
    for original in original_plants.values():
        name = required_text(original.get('scientificName'), 'prototype scientific name')
        candidates = [plant for plant in catalog['plants'] if plant['scientificName'] == name]
        if len(candidates) != 1 or candidates[0]['status'] != DISPLAY_STATUS:
            raise ValueError(f'Prototype scientific identity needs review: {name}')
        matching[original['id']] = candidates[0]['uuid']
    for original in prototype['records']:
        if original.get('status') != 'verified' or original.get('regionId') not in REGION_IDS:
            raise ValueError('Prototype citation is not verified or has an unknown region')
        uuid = matching[original['plantId']]
        source_url = safe_url(original.get('sourceUrl'), 'prototype source URL')
        identifier_fields = [uuid, original['regionId'], original['place'], source_url, original['locator']]
        identifier = hashlib.sha256(json.dumps(identifier_fields, ensure_ascii=False).encode()).hexdigest()[:16]
        source_id = 'SRC-v1-' + hashlib.sha256(source_url.encode()).hexdigest()[:16]
        record = {
            'id': 'v1-' + identifier,
            'regionId': original['regionId'],
            'place': required_text(original.get('place'), 'prototype place'),
            'sourceId': source_id,
            'sourceTitle': required_text(original.get('sourceTitle'), 'prototype source title'),
            'sourceUrl': source_url,
            'sourceKind': 'research_paper',
            'locator': required_text(original.get('locator'), 'prototype locator'),
            'evidence': required_text(original.get('evidence'), 'prototype evidence summary'),
            'sourceScientificName': original_plants[original['plantId']]['scientificName'],
            # v1 did not record an access date; release date is not a substitute.
            'accessedOn': original.get('accessedOn', ''),
            'status': 'verified',
            'provenance': 'prototype-v1',
        }
        payloads[uuid]['records'].append(record)
        counters['prototypeRecordsPreserved'] += 1
    for plant in catalog['plants']:
        records = payloads[plant['uuid']]['records']
        plant['regionIds'] = sorted({record['regionId'] for record in records if record['regionId']})
        records.sort(key=lambda record: (record['regionId'] or 'ZZ', record['sourceKind'], record['place'], record['id']))


def build_release(data, geometry, prototype=None):
    places = indexed(data['places'], 'place_id')
    evidence = indexed(data['evidence'], 'evidence_id')
    sources = indexed(data['sources'], 'source_id')
    occurrences = indexed(data['occurrences'], 'occurrence_id')
    entries = indexed(data['entries'], 'entry_id')
    mapping = region_mapping(places, geometry)
    catalog = {
        'schemaVersion': 2,
        'version': VERSION,
        'released': required_text(data.get('research_date'), 'research date'),
        'country': 'SA',
        'plants': [],
    }
    counters = Counter()
    payloads = {}
    for entry in entries.values():
        base, records = project_entry(entry, places, evidence, sources, occurrences, mapping, counters)
        region_ids = sorted({record['regionId'] for record in records if record['regionId']})
        catalog['plants'].append({**base, 'regionIds': region_ids})
        payloads[base['uuid']] = {'schemaVersion': 2, 'version': VERSION, **base, 'records': records}
    add_prototype_records(catalog, payloads, prototype, counters)
    used_sources = set()
    unmapped = []
    for plant in catalog['plants']:
        records = payloads[plant['uuid']]['records']
        counters['records'] += len(records)
        counters['recordsWithRegion'] += sum(record['regionId'] is not None for record in records)
        counters['recordsWithoutRegion'] += sum(record['regionId'] is None for record in records)
        counters['entriesWithRecords'] += bool(records)
        counters['entriesWithMappedRegions'] += bool(plant['regionIds'])
        used_sources.update(record['sourceId'] for record in records)
        if records and not plant['regionIds']:
            unmapped.append(plant['uuid'])
    report = {
        'schemaVersion': 2,
        'version': VERSION,
        'released': catalog['released'],
        'inputEntries': len(entries),
        'statusCounts': dict(Counter(entry['status'] for entry in catalog['plants'])),
        'counts': dict(counters),
        'uniqueDisplayedSources': len(used_sources),
        'administrativeRegionMapping': mapping,
        'entriesWithEvidenceButNoResolvedAdministrativeRegion': unmapped,
        'semantics': {
            'verified': 'Passed the supplied research identity/geography display gates; not an independent botanical certification.',
            'evidence': 'Arabic research summary, not a verbatim source quotation.',
            'regionFill': 'Documented at locations within a region, not full-area coverage or native status.',
            'unknownRegion': 'A documented textual location retained with regionId=null; it must not color a guessed region.',
            'year': 'Optional string: one reported occurrence year or a reported range. Retrieval date is separate.',
            'coordinates': 'Not included: this release uses regions and must not display synthetic sighting points.',
            'occurrenceDeduplication': 'Each occurrence ID appears once per UUID, preferring a mapped cited locality, then a mapped region.',
            'containment': 'Only supplied parent_place_id relationships with containment_source_url are followed.',
            'missingEvidence': 'No absence inference. Withheld statuses retain their UUID and an empty records array.',
            'prototypeSources': 'The existing v1 paper citations are retained only for a unique exact full scientific-name match to a display-eligible UUID. Their missing access date stays empty.',
        },
    }
    return catalog, payloads, report


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')


def main():
    repo = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True, help='Audited research JSON, kept outside public/')
    parser.add_argument('--output', type=Path, default=repo / 'public/data')
    parser.add_argument('--regions', type=Path, default=repo / 'public/data/regions.v1.json')
    parser.add_argument('--prototype', type=Path, default=repo / 'public/data/distribution.v1.0.0.json')
    parser.add_argument('--report', type=Path, default=repo / 'docs/data-build-report.json')
    args = parser.parse_args()
    raw = args.input.read_bytes()
    geometry_bytes = args.regions.read_bytes()
    prototype_bytes = args.prototype.read_bytes()
    catalog, payloads, report = build_release(json.loads(raw), json.loads(geometry_bytes), json.loads(prototype_bytes))
    output = args.output.resolve()
    plant_dir = output / 'plants'
    plant_dir.mkdir(parents=True, exist_ok=True)
    contents = {uuid: encoded(payload) for uuid, payload in payloads.items()}
    # Validate everything before replacing assets; refuse to silently delete a
    # plant that is missing from a changed research input.
    unexpected = {path.stem for path in plant_dir.glob('*.json')} - set(contents)
    if unexpected:
        raise ValueError(f'Existing UUID assets missing from input: {sorted(unexpected)}')
    for uuid, content in contents.items():
        (plant_dir / f'{uuid}.json').write_bytes(content)
    catalog_bytes = encoded(catalog)
    (output / 'catalog.v2.json').write_bytes(catalog_bytes)
    largest_uuid = max(contents, key=lambda uuid: len(contents[uuid]))
    report.update({
        'researchInputSha256': hashlib.sha256(raw).hexdigest(),
        'geometryInputSha256': hashlib.sha256(geometry_bytes).hexdigest(),
        'prototypeInputSha256': hashlib.sha256(prototype_bytes).hexdigest(),
        'sizesBytes': {
            'researchInput': len(raw),
            'catalog': len(catalog_bytes),
            'allPlantAssets': sum(map(len, contents.values())),
            'largestPlant': len(contents[largest_uuid]),
            'largestPlantUuid': largest_uuid,
        },
    })
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'plants': len(contents), **report['counts'], 'sizesBytes': report['sizesBytes']}, ensure_ascii=False))


if __name__ == '__main__':
    main()

"""Project the pinned geoBoundaries SAU ADM1 GeoJSON into map drawing units.

Usage: python3 scripts/prepare-boundaries.py path/to/geoBoundaries-SAU-ADM1_simplified.geojson
Source, date, and redistribution terms are recorded in public/data/BOUNDARIES.txt.
"""
import hashlib
import json
import sys
from pathlib import Path

# Arabic display names and cartographic label anchors in longitude/latitude.
labels = {
    '01': ('الرياض', 45.1, 23.6), '02': ('مكة المكرمة', 41.4, 21.6),
    '03': ('المدينة المنورة', 39.4, 24.7), '04': ('الشرقية', 50.0, 23.7),
    '05': ('القصيم', 43.3, 26.3), '06': ('حائل', 41.7, 27.6),
    '07': ('تبوك', 36.8, 27.8), '08': ('الحدود الشمالية', 43.0, 29.9),
    '09': ('جازان', 40.75, 16.65), '10': ('نجران', 45.5, 18.0),
    '11': ('الباحة', 38.65, 20.05), '12': ('الجوف', 39.25, 30.55),
    '14': ('عسير', 42.8, 19.1),
}

def project(lon, lat):
    return [round(130 + (lon - 34.5) * 26.0, 1), round(10 + (32.5 - lat) * 29.0, 1)]

raw = Path(sys.argv[1]).read_bytes()
if hashlib.sha256(raw).hexdigest() != 'cf50a59ddcda0fc4539c12799c320b9936fd75f47c1b5562ef548436d9169e13':
    sys.exit('Expected the pinned simplified geoBoundaries file (see BOUNDARIES.txt)')
out = []
for feature in json.loads(raw)['features']:
    props = feature['properties']
    iso = props['shapeISO']
    geometry = feature['geometry']
    polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    parts = []
    for polygon in polygons:
        for ring in polygon:
            coords = [project(*point[:2]) for point in ring]
            parts.append('M' + ' '.join(f'{x:g},{y:g}' for x, y in coords) + 'Z')
    name, lon, lat = labels[iso[3:]]
    out.append(dict(id=iso, name=name, path=''.join(parts), label=project(lon, lat)))
if len(out) != 13 or len({r['id'] for r in out}) != 13:
    sys.exit('Expected all 13 Saudi regions')
target = Path(__file__).resolve().parents[1] / 'public/data/regions.v1.json'
target.write_text(json.dumps(sorted(out, key=lambda r: r['id']), ensure_ascii=False, separators=(',', ':'))+'\n')

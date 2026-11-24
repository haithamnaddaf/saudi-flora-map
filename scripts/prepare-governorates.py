#!/usr/bin/env python3
"""Create small, name-addressable Saudi ADM2 display paths from pinned geoBoundaries.

Usage: python3 scripts/prepare-governorates.py path/to/geoBoundaries-SAU-ADM2_simplified.geojson
This uses boundary geometry only for drawing. Observation coordinates are never
read, and no botanical observation is assigned to a governorate by this script.
Source, licensing, editorial name decisions and limits: docs/governorate-boundaries.md.
"""
import argparse
from collections import defaultdict
import gzip
import hashlib
import json
import math
from pathlib import Path

SOURCE_SHA256 = '1a336a495dfcf3c369c5b5d05c205d7509610e0ab27ef1539140f8a8c763e335'
# Pinned name correspondences, reviewed against the existing Arabic labels and
# the published Saudi governorate names. Values: Arabic name, parent region,
# additional spellings already used by the project. No fuzzy matching here.
LABELS = {
    "Abha": [
        "أبها",
        "SA-14",
        []
    ],
    "Abqaiq": [
        "بقيق",
        "SA-04",
        [
            "Buqayq"
        ]
    ],
    "Abu Arish": [
        "أبو عريش",
        "SA-09",
        []
    ],
    "Ad Dair": [
        "الدائر",
        "SA-09",
        []
    ],
    "Ad Darb": [
        "الدرب",
        "SA-09",
        []
    ],
    "Ad Dilam": [
        "الدلم",
        "SA-01",
        []
    ],
    "Ad Diriyah": [
        "الدرعية",
        "SA-01",
        []
    ],
    "Ad Duwadimi": [
        "الدوادمي",
        "SA-01",
        []
    ],
    "Adam": [
        "أضم",
        "SA-02",
        []
    ],
    "Afif": [
        "عفيف",
        "SA-01",
        []
    ],
    "Ahad Al Masarihah": [
        "أحد المسارحة",
        "SA-09",
        []
    ],
    "Ahad Rufaydah": [
        "أحد رفيدة",
        "SA-14",
        [
            "Ahad Rifaydah"
        ]
    ],
    "Al Aflaj": [
        "الأفلاج",
        "SA-01",
        []
    ],
    "Al Ahsa": [
        "الأحساء",
        "SA-04",
        []
    ],
    "Al Aqiq": [
        "العقيق",
        "SA-11",
        []
    ],
    "Al Ardiyat": [
        "العرضيات",
        "SA-02",
        []
    ],
    "Al Aridah": [
        "العارضة",
        "SA-09",
        []
    ],
    "Al Asyah": [
        "الأسياح",
        "SA-05",
        []
    ],
    "Al Aydabi": [
        "العيدابي",
        "SA-09",
        []
    ],
    "Al Bad": [
        "البدع",
        "SA-07",
        []
    ],
    "Al Badai": [
        "البدائع",
        "SA-05",
        [
            "Al Badayea"
        ]
    ],
    "Al Bahah": [
        "الباحة",
        "SA-11",
        []
    ],
    "Al Birk": [
        "البرك",
        "SA-14",
        []
    ],
    "Al Bukayriyah": [
        "البكيرية",
        "SA-05",
        []
    ],
    "Al Ghat": [
        "الغاط",
        "SA-01",
        []
    ],
    "Al Ghazalah": [
        "الغزالة",
        "SA-06",
        []
    ],
    "Al Hait": [
        "الحائط",
        "SA-06",
        []
    ],
    "Al Hajrah": [
        "الحجرة",
        "SA-11",
        []
    ],
    "Al Hariq": [
        "الحريق",
        "SA-01",
        []
    ],
    "Al Harjah": [
        "الحرجة",
        "SA-14",
        [
            "Al Harja"
        ]
    ],
    "Al Harth": [
        "الحرث",
        "SA-09",
        []
    ],
    "Al Hinakiyah": [
        "الحناكية",
        "SA-03",
        [
            "Al Hanakiyah"
        ]
    ],
    "Al Is": [
        "العيص",
        "SA-03",
        []
    ],
    "Al Jubayl": [
        "الجبيل",
        "SA-04",
        []
    ],
    "Al Jumum": [
        "الجموم",
        "SA-02",
        []
    ],
    "Al Kamil": [
        "الكامل",
        "SA-02",
        []
    ],
    "Al Khafji": [
        "الخفجي",
        "SA-04",
        []
    ],
    "Al Kharj": [
        "الخرج",
        "SA-01",
        []
    ],
    "Al Khubar": [
        "الخبر",
        "SA-04",
        [
            "Khobar",
            "Al Khobar"
        ]
    ],
    "Al Khurmah": [
        "الخرمة",
        "SA-02",
        []
    ],
    "Al Lith": [
        "الليث",
        "SA-02",
        []
    ],
    "Al Madinah Al Munawwarah": [
        "المدينة المنورة",
        "SA-03",
        [
            "Medina",
            "Madinah",
            "Al Madinah"
        ]
    ],
    "Al Mahd": [
        "المهد",
        "SA-03",
        []
    ],
    "Al Majardah": [
        "المجاردة",
        "SA-14",
        []
    ],
    "Al Majmaah": [
        "المجمعة",
        "SA-01",
        []
    ],
    "Al Mandaq": [
        "المندق",
        "SA-11",
        []
    ],
    "Al Midhnab": [
        "المذنب",
        "SA-05",
        [
            "Al Mithnab"
        ]
    ],
    "Al Mukhwah": [
        "المخواة",
        "SA-11",
        [
            "Al Makhwah"
        ]
    ],
    "Al Muzahimiyah": [
        "المزاحمية",
        "SA-01",
        []
    ],
    "Al Nuayriyah": [
        "النعيرية",
        "SA-04",
        []
    ],
    "Al Qara": [
        "القرى",
        "SA-11",
        [
            "Al Qari"
        ]
    ],
    "Al Qatif": [
        "القطيف",
        "SA-04",
        []
    ],
    "Al Qunfudhah": [
        "القنفذة",
        "SA-02",
        []
    ],
    "Al Qurayyat": [
        "القريات",
        "SA-12",
        []
    ],
    "Al Quwayiyah": [
        "القويعية",
        "SA-01",
        []
    ],
    "Al Taif": [
        "الطائف",
        "SA-02",
        [
            "Taif",
            "Ta'if"
        ]
    ],
    "Al Udayd": [
        "العديد",
        "SA-04",
        []
    ],
    "Al Ula": [
        "العلا",
        "SA-03",
        [
            "AlUla"
        ]
    ],
    "Al Uwayqilah": [
        "العويقيلة",
        "SA-08",
        []
    ],
    "Al Wajh": [
        "الوجه",
        "SA-07",
        [
            "Al Wajeh"
        ]
    ],
    "An Nabhaniyah": [
        "النبهانية",
        "SA-05",
        []
    ],
    "An Namas": [
        "النماص",
        "SA-14",
        [
            "Al-Namas"
        ]
    ],
    "Ar Rass": [
        "الرس",
        "SA-05",
        []
    ],
    "Ar Rayn": [
        "الرين",
        "SA-01",
        []
    ],
    "Ar Rayth": [
        "الريث",
        "SA-09",
        []
    ],
    "Arar": [
        "عرعر",
        "SA-08",
        []
    ],
    "As Sulaymi": [
        "السليمي",
        "SA-06",
        []
    ],
    "As Sulayyil": [
        "السليل",
        "SA-01",
        []
    ],
    "Ash Shamli": [
        "الشملي",
        "SA-06",
        []
    ],
    "Ash Shimasiyah": [
        "الشماسية",
        "SA-05",
        []
    ],
    "Ash Shinan": [
        "الشنان",
        "SA-06",
        []
    ],
    "At Tuwal": [
        "الطوال",
        "SA-09",
        []
    ],
    "Az Zulfi": [
        "الزلفي",
        "SA-01",
        []
    ],
    "Badr": [
        "بدر",
        "SA-03",
        []
    ],
    "Badr Al Janub": [
        "بدر الجنوب",
        "SA-10",
        []
    ],
    "Bahrah": [
        "بحرة",
        "SA-02",
        []
    ],
    "Balqarn": [
        "بلقرن",
        "SA-14",
        []
    ],
    "Bani Hasan": [
        "بني حسن",
        "SA-11",
        []
    ],
    "Baqa": [
        "بقعاء",
        "SA-06",
        []
    ],
    "Bariq": [
        "بارق",
        "SA-14",
        [
            "Bareq"
        ]
    ],
    "Baysh": [
        "بيش",
        "SA-09",
        []
    ],
    "Biljurashi": [
        "بلجرشي",
        "SA-11",
        [
            "Baljurashi"
        ]
    ],
    "Bishah": [
        "بيشة",
        "SA-14",
        [
            "Bisha"
        ]
    ],
    "Buraydah": [
        "بريدة",
        "SA-05",
        [
            "Buraidah"
        ]
    ],
    "Damad": [
        "ضمد",
        "SA-09",
        []
    ],
    "Dariyah": [
        "ضرية",
        "SA-05",
        []
    ],
    "Dawamat Al Jandal": [
        "دومة الجندل",
        "SA-12",
        [
            "Duma al-Jandal"
        ]
    ],
    "Duba": [
        "ضبا",
        "SA-07",
        []
    ],
    "Duruma": [
        "ضرما",
        "SA-01",
        []
    ],
    "Farasan": [
        "فرسان",
        "SA-09",
        []
    ],
    "Farat Ghamid Az Zinad": [
        "فرعة غامد الزناد",
        "SA-11",
        []
    ],
    "Fayfa": [
        "فيفا",
        "SA-09",
        []
    ],
    "Hafar Al Batin": [
        "حفر الباطن",
        "SA-04",
        []
    ],
    "Hail": [
        "حائل",
        "SA-06",
        [
            "Ha'il"
        ]
    ],
    "Haqil": [
        "حقل",
        "SA-07",
        []
    ],
    "Harub": [
        "هروب",
        "SA-09",
        []
    ],
    "Hawtat Bani Tamim": [
        "حوطة بني تميم",
        "SA-01",
        []
    ],
    "Hubuna": [
        "حبونا",
        "SA-10",
        []
    ],
    "Huraymila": [
        "حريملاء",
        "SA-01",
        []
    ],
    "Jazan": [
        "جازان",
        "SA-09",
        []
    ],
    "Jiddah": [
        "جدة",
        "SA-02",
        [
            "Jeddah"
        ]
    ],
    "Khamis Mushayt": [
        "خميس مشيط",
        "SA-14",
        []
    ],
    "Khaybar": [
        "خيبر",
        "SA-03",
        []
    ],
    "Khubash": [
        "خباش",
        "SA-10",
        []
    ],
    "Khulays": [
        "خليص",
        "SA-02",
        []
    ],
    "Makkah Al Mukarramah": [
        "مكة المكرمة",
        "SA-02",
        [
            "Makkah",
            "Mecca"
        ]
    ],
    "Marat": [
        "مرات",
        "SA-01",
        []
    ],
    "Mawqaq": [
        "موقق",
        "SA-06",
        []
    ],
    "Maysan": [
        "ميسان",
        "SA-02",
        []
    ],
    "Muhayil": [
        "محايل",
        "SA-14",
        []
    ],
    "Najran": [
        "نجران",
        "SA-10",
        []
    ],
    "Qaryah Al Ulya": [
        "قرية العليا",
        "SA-04",
        []
    ],
    "Qilwah": [
        "قلوة",
        "SA-11",
        []
    ],
    "Rabigh": [
        "رابغ",
        "SA-02",
        []
    ],
    "Rafha": [
        "رفحاء",
        "SA-08",
        []
    ],
    "Ranyah": [
        "رنية",
        "SA-02",
        []
    ],
    "Ras Tannurah": [
        "رأس تنورة",
        "SA-04",
        []
    ],
    "Rijal Al Ma": [
        "رجال ألمع",
        "SA-14",
        [
            "Rijal Alma"
        ]
    ],
    "Riyadh": [
        "الرياض",
        "SA-01",
        [
            "Ar Riyad"
        ]
    ],
    "Riyadh Al Khabra": [
        "رياض الخبراء",
        "SA-05",
        []
    ],
    "Rumah": [
        "رماح",
        "SA-01",
        []
    ],
    "Sabya": [
        "صبياء",
        "SA-09",
        []
    ],
    "Sakaka": [
        "سكاكا",
        "SA-12",
        []
    ],
    "Samtah": [
        "صامطة",
        "SA-09",
        []
    ],
    "Sarat Abidah": [
        "سراة عبيدة",
        "SA-14",
        [
            "Sarat Ubaida"
        ]
    ],
    "Shaqra": [
        "شقراء",
        "SA-01",
        []
    ],
    "Sharurah": [
        "شرورة",
        "SA-10",
        []
    ],
    "Simira": [
        "سميراء",
        "SA-06",
        []
    ],
    "Tabuk": [
        "تبوك",
        "SA-07",
        []
    ],
    "Tanumah": [
        "تنومة",
        "SA-14",
        [
            "Tanomah"
        ]
    ],
    "Tarib": [
        "طريب",
        "SA-14",
        []
    ],
    "Tathlith": [
        "تثليث",
        "SA-14",
        []
    ],
    "Tayma": [
        "تيماء",
        "SA-07",
        []
    ],
    "Thadiq": [
        "ثادق",
        "SA-01",
        []
    ],
    "Thar": [
        "ثار",
        "SA-10",
        []
    ],
    "Tubarjal": [
        "طبرجل",
        "SA-12",
        []
    ],
    "Turayf": [
        "طريف",
        "SA-08",
        [
            "Turaif"
        ]
    ],
    "Turubah": [
        "تربة",
        "SA-02",
        []
    ],
    "Umluj": [
        "أملج",
        "SA-07",
        [
            "Umm Lajj"
        ]
    ],
    "Unayzah": [
        "عنيزة",
        "SA-05",
        [
            "Unaizah"
        ]
    ],
    "Uqlat As Suqur": [
        "عقلة الصقور",
        "SA-05",
        []
    ],
    "Uyun Al Jiwa": [
        "عيون الجواء",
        "SA-05",
        []
    ],
    "Wadi Ad Dawasir": [
        "وادي الدواسر",
        "SA-01",
        []
    ],
    "Wadi Al Fara": [
        "وادي الفرع",
        "SA-03",
        []
    ],
    "Yadamah": [
        "يدمة",
        "SA-10",
        []
    ],
    "Yanbu": [
        "ينبع",
        "SA-03",
        []
    ],
    "Zahran Al Janub": [
        "ظهران الجنوب",
        "SA-14",
        [
            "Zahran Al-Janub"
        ]
    ]
}
CAPITALS = {'Abha', 'Al Bahah', 'Arar', 'Sakaka', 'Al Madinah Al Munawwarah',
            'Buraydah', 'Riyadh', 'Hail', 'Jazan', 'Makkah Al Mukarramah',
            'Najran', 'Tabuk'}


def project(point):
    longitude, latitude = point[:2]
    return (130 + (longitude - 34.5) * 26, 10 + (32.5 - latitude) * 29)


def distance_squared(point, start, end):
    dx, dy = end[0] - start[0], end[1] - start[1]
    fraction = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy) if dx or dy else 0
    fraction = max(0, min(1, fraction))
    return (point[0] - start[0] - fraction * dx) ** 2 + (point[1] - start[1] - fraction * dy) ** 2


def simplify(points, tolerance):
    """Douglas–Peucker on an open shared chain, preserving its junctions."""
    keep = {0, len(points) - 1}
    pending = [(0, len(points) - 1)]
    while pending:
        first, last = pending.pop()
        furthest, largest = None, tolerance * tolerance
        for index in range(first + 1, last):
            distance = distance_squared(points[index], points[first], points[last])
            if distance > largest:
                furthest, largest = index, distance
        if furthest is not None:
            keep.add(furthest)
            pending.extend(((first, furthest), (furthest, last)))
    return [points[index] for index in sorted(keep)]


def signed_area(ring):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1])) / 2


def contains(point, rings):
    x, y = point
    inside = False
    for ring in rings:
        for (ax, ay), (bx, by) in zip(ring, ring[1:] + ring[:1]):
            if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
                inside = not inside
    return inside


def label_point(polygons):
    """An interior cartographic label anchor, never an occurrence location."""
    rings = max(polygons, key=lambda polygon: abs(signed_area(polygon[0])))
    outer = rings[0]
    area = signed_area(outer)
    cx = cy = 0
    for a, b in zip(outer, outer[1:] + outer[:1]):
        weight = a[0] * b[1] - b[0] * a[1]
        cx += (a[0] + b[0]) * weight
        cy += (a[1] + b[1]) * weight
    centroid = (round(cx / (6 * area), 1), round(cy / (6 * area), 1))
    if contains(centroid, rings):
        return list(centroid)
    left, right = min(x for x, _ in outer), max(x for x, _ in outer)
    top, bottom = min(y for _, y in outer), max(y for _, y in outer)
    candidates = [(round(left + (right - left) * ix / 30, 1),
                   round(top + (bottom - top) * iy / 30, 1))
                  for ix in range(1, 30) for iy in range(1, 30)]
    candidates = [point for point in candidates if contains(point, rings)]
    if not candidates:
        raise ValueError('No interior label position found')
    return list(max(candidates, key=lambda point: min(distance_squared(point, a, b)
                for ring in rings for a, b in zip(ring, ring[1:] + ring[:1]))))


def build(features, tolerance):
    all_polygons, adjacency, owners = [], defaultdict(set), defaultdict(set)
    for feature_index, feature in enumerate(features):
        geometry = feature['geometry']
        if geometry['type'] not in ('Polygon', 'MultiPolygon'):
            raise ValueError('Expected polygon boundaries')
        polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
        projected = []
        for polygon in polygons:
            rings = []
            for ring in polygon:
                points = [project(point) for point in ring]
                if points[-1] == points[0]:
                    points.pop()
                points = [point for index, point in enumerate(points) if index == 0 or point != points[index - 1]]
                rings.append(points)
                for first, second in zip(points, points[1:] + points[:1]):
                    adjacency[first].add(second)
                    adjacency[second].add(first)
                    owners[tuple(sorted((first, second)))].add(feature_index)
            projected.append(rings)
        all_polygons.append(projected)
    junctions = set()
    for vertex, neighbors in adjacency.items():
        signatures = {tuple(sorted(owners[tuple(sorted((vertex, neighbor)))])) for neighbor in neighbors}
        if len(neighbors) != 2 or len(signatures) != 1:
            junctions.add(vertex)
    # Small coastal governorates need finer geometry than large inland units.
    # Every shared chain uses the smaller neighbor's tolerance so both sides
    # remain identical, including after rounding.
    areas = [sum(abs(signed_area(polygon[0])) - sum(abs(signed_area(ring)) for ring in polygon[1:])
                 for polygon in polygons) for polygons in all_polygons]
    chains = {}

    def simplified_ring(ring):
        anchors = [index for index, point in enumerate(ring) if point in junctions]
        if len(anchors) < 2:
            first = anchors[0] if anchors else min(range(len(ring)), key=lambda index: ring[index])
            second = max(range(len(ring)), key=lambda index: (ring[index][0] - ring[first][0]) ** 2 + (ring[index][1] - ring[first][1]) ** 2)
            anchors = sorted({first, second})
        result = []
        for first, last in zip(anchors, anchors[1:] + anchors[:1]):
            section = ring[first:last + 1] if first < last else ring[first:] + ring[:last + 1]
            forward, backward = tuple(section), tuple(reversed(section))
            key = min(forward, backward)
            if key not in chains:
                neighboring = set().union(*(owners[tuple(sorted((first, second)))]
                                            for first, second in zip(key, key[1:])))
                local_tolerance = min(tolerance, 0.012 * math.sqrt(min(areas[index] for index in neighboring)))
                chains[key] = simplify(key, local_tolerance)
            section = chains[key] if key == forward else list(reversed(chains[key]))
            result.extend(section[:-1])
        rounded = [(round(x, 2), round(y, 2)) for x, y in result]
        rounded = [point for index, point in enumerate(rounded) if index == 0 or point != rounded[index - 1]]
        if rounded and rounded[0] == rounded[-1]:
            rounded.pop()
        return rounded

    result = []
    for feature, polygons in zip(features, all_polygons):
        properties = feature['properties']
        original = properties['shapeName']
        name_en = original.removesuffix(' Governorate')
        name, region_id, extra_aliases = LABELS[name_en]
        simplified = []
        for polygon in polygons:
            rings = [simplified_ring(ring) for ring in polygon]
            valid = lambda ring: len(set(ring)) >= 3 and abs(signed_area(ring)) > 0.001
            # A collapsed exterior must not turn one of its holes into an island.
            if valid(rings[0]):
                simplified.append([rings[0], *[ring for ring in rings[1:] if valid(ring)]])
        if not simplified:
            raise ValueError('Entire administrative unit collapsed: ' + name_en)
        path = ''.join('M' + ' '.join(f'{x:g},{y:g}' for x, y in ring) + 'Z' for polygon in simplified for ring in polygon)
        result.append({
            'id': 'SA-GOV-' + properties['shapeID'], 'name': name, 'nameEn': name_en,
            'regionId': region_id, 'aliases': sorted(set([name, name_en, original, *extra_aliases])),
            'path': path, 'label': label_point(simplified), 'isRegionalCapital': name_en in CAPITALS,
        })
    return sorted(result, key=lambda item: (item['regionId'], item['id']))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'public/data/governorates.v1.json')
    parser.add_argument('--tolerance', type=float, default=0.22)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise SystemExit('Source checksum differs from the reviewed geoBoundaries release')
    features = json.loads(raw)['features']
    if len(features) != 147 or len({f['properties']['shapeID'] for f in features}) != 147:
        raise SystemExit('Expected 147 distinct administrative units')
    result = build(features, args.tolerance)
    encoded = (json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    args.output.write_bytes(encoded)
    print(json.dumps({'units': len(result), 'bytes': len(encoded), 'gzipBytes': len(gzip.compress(encoded)),
                      'sourceSha256': SOURCE_SHA256, 'outputSha256': hashlib.sha256(encoded).hexdigest(),
                      'toleranceDrawingUnits': args.tolerance}, indent=2))


if __name__ == '__main__':
    main()

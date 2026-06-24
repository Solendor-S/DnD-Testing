"""
Scrape D&D 5e origin data (races + subraces, backgrounds) from the D&D 5e
wikidot into structured GrantBundle JSON, bundled into srd.db at build time.

Run:  python scripts/scrape-wikidot.py
Output: data/raw/wikidot/{races,subraces,backgrounds}.json  (committed)

Uses scrapling (Fetcher). Each page is fetched once and cached (text + strong
trait names + h2 section names) under data/raw/wikidot/cache/*.json.
"""
import json
import os
import re
import time
from scrapling.fetchers import Fetcher

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "data", "origins")                 # committed (build input)
CACHE_DIR = os.path.join(ROOT, "data", "raw", "wikidot-cache")  # gitignored fetch cache
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)
BASE = "https://dnd5e.wikidot.com/"

PHB_RACES = ["dwarf", "elf", "halfling", "human", "dragonborn", "gnome", "half-elf", "half-orc", "tiefling"]
# PHB subraces (h2 section names) per race, lowercased.
SUBRACES = {
    "dwarf": ["hill dwarf", "mountain dwarf"],
    "elf": ["high elf", "wood elf", "dark elf"],
    "halfling": ["lightfoot halfling", "stout halfling"],
    "gnome": ["forest gnome", "rock gnome"],
}
PHB_BACKGROUNDS = ["acolyte", "charlatan", "criminal", "entertainer", "folk-hero", "guild-artisan",
                   "hermit", "noble", "outlander", "sage", "sailor", "soldier", "urchin"]
CLASSES = ["barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin",
           "ranger", "rogue", "sorcerer", "warlock", "wizard"]

SKILL_IDS = {
    "acrobatics": "acrobatics", "animal handling": "animal-handling", "arcana": "arcana",
    "athletics": "athletics", "deception": "deception", "history": "history", "insight": "insight",
    "intimidation": "intimidation", "investigation": "investigation", "medicine": "medicine",
    "nature": "nature", "perception": "perception", "performance": "performance",
    "persuasion": "persuasion", "religion": "religion", "sleight of hand": "sleight-of-hand",
    "stealth": "stealth", "survival": "survival",
}
ABILITY_IDS = {"strength": "str", "dexterity": "dex", "constitution": "con",
               "intelligence": "int", "wisdom": "wis", "charisma": "cha"}
WORD_NUM = {"one": 1, "two": 2, "three": 3, "four": 4, "a": 1, "an": 1}
TRAIT_LABELS = {"ability score increase.", "age.", "alignment.", "size.", "speed.",
                "languages.", "tool proficiency.", "source:"}
LANG_NAMES = ["Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling", "Orc",
              "Abyssal", "Celestial", "Deep Speech", "Draconic", "Infernal", "Primordial",
              "Sylvan", "Undercommon"]


def empty_grant():
    return {"abilityBonuses": [], "skillProficiencies": [], "expertise": [], "languages": [],
            "toolProficiencies": [], "weaponProficiencies": [], "armorProficiencies": [],
            "saveProficiencies": [], "features": [], "choices": []}


def fetch_page(slug):
    cache = os.path.join(CACHE_DIR, slug.replace(":", "_") + ".json")
    if os.path.exists(cache):
        return json.load(open(cache, encoding="utf-8"))
    p = Fetcher.get(BASE + slug, timeout=30)
    if p.status != 200:
        print(f"  WARN {slug} -> {p.status}")
        return {"text": "", "strongs": [], "h2": []}
    root = p.css("#page-content")[0]
    data = {
        "text": root.get_all_text(strip=True),
        "strongs": [s.get_all_text(strip=True) for s in p.css("#page-content strong")],
        "h2": [h.get_all_text(strip=True) for h in p.css("#page-content h2")],
        "h3": [h.get_all_text(strip=True) for h in p.css("#page-content h3")],
        "links": [{"href": a.attrib.get("href", ""), "text": a.get_all_text(strip=True)}
                  for a in p.css("#page-content a")],
    }
    json.dump(data, open(cache, "w", encoding="utf-8"))
    time.sleep(1.0)
    return data


def parse_asi(seg):
    """Parse ONLY the first 'Ability Score Increase.' sentence (avoids heritage/variant prose)."""
    m = re.search(r"Ability Score Increase\.\s*([^.]*\.)", seg)
    asi = m.group(1) if m else ""
    bonuses = []
    for ab, n in re.findall(r"(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+score\s+increases?\s+by\s+(\d+)", asi):
        bonuses.append({"ability": ABILITY_IDS[ab.lower()], "bonus": int(n)})
    cm = re.search(r"(\w+)\s+(?:other\s+)?ability scores?\s+of your choice", asi.lower())
    return bonuses, (WORD_NUM.get(cm.group(1), 0) if cm else 0)


def language_field(s):
    if not s:
        return [], 0
    m = re.search(r"(\w+)\s+(?:language|languages)?\s*of your choice", s.lower())
    choose = WORD_NUM.get(m.group(1), 0) if m else 0
    fixed = [("Elvish" if n == "Elven" else n) for n in LANG_NAMES + ["Elven"] if re.search(r"\b" + re.escape(n) + r"\b", s)]
    return sorted(set(fixed)), choose


def features_from(seg, strongs):
    """Pair each non-label <strong> trait name with the prose that follows it (deduped, capped)."""
    names = [s for s in strongs if s.strip().lower().rstrip() not in TRAIT_LABELS
             and s.endswith(".") and len(s) < 45 and s[0].isupper()]
    feats, seen = [], set()
    for i, name in enumerate(names):
        if name not in seg:
            continue
        key = name.rstrip(".")
        if key in seen:
            continue
        seen.add(key)
        start = seg.index(name) + len(name)
        end = len(seg)
        for nxt in names[i + 1:]:
            if nxt in seg[start:]:
                end = start + seg[start:].index(nxt)
                break
        feats.append({"name": key, "desc": seg[start:end].strip()[:300]})
        if len(feats) >= 8:
            break
    return feats


def grant_from_section(seg, strongs, is_subrace):
    g = empty_grant()
    bonuses, choose_ab = parse_asi(seg)
    g["abilityBonuses"] = bonuses
    if choose_ab:
        g["choices"].append({"id": "asi", "type": "ability", "choose": choose_ab, "from": "any", "bonus": 1})
    sm = re.search(r"walking speed is (\d+)\s*feet", seg)
    if sm:
        g["speed"] = int(sm.group(1))
    zm = re.search(r"Your size is (Medium|Small|Large)", seg)
    if zm:
        g["size"] = zm.group(1)
    lm = re.search(r"Languages?\.\s*(.+?\.)", seg)
    fixed_lang, choose_lang = language_field(lm.group(1) if lm else "")
    g["languages"] = fixed_lang
    if choose_lang:
        g["choices"].append({"id": "lang", "type": "language", "choose": choose_lang, "from": "any"})
    skm = re.search(r"proficiency in (\w+) skills? of your choice", seg.lower())
    if skm:
        g["choices"].append({"id": "skill", "type": "skill", "choose": WORD_NUM.get(skm.group(1), 0), "from": "any"})
    if re.search(r"hit point maximum increases by 1.*?every.*?level", seg, re.S):
        g["hpPerLevel"] = 1
    g["features"] = features_from(seg, strongs)
    return g


def title(slug):
    return slug.replace("-", " ").title()


def section_start(text, name):
    """Real section start for an h2 name = where 'Name' is followed by 'As a <name>' prose
    (the TOC lists names first, so a plain search would hit the wrong spot)."""
    m = re.search(re.escape(name) + r"\s+As a\b", text, re.I)
    if m:
        return m.start()
    # fallback: last occurrence of the name (skips the TOC mention)
    idx = text.lower().rfind(name.lower())
    return idx if idx >= 0 else None


def parse_race(slug):
    page = fetch_page("lineage:" + slug)
    text, strongs, h2 = page["text"], page["strongs"], page["h2"]
    if not text:
        return None, []
    # Boundaries for ALL h2 sections (subraces + non-PHB variants) so we can bound segments.
    starts = sorted(s for s in (section_start(text, h) for h in h2) if s is not None)
    first = starts[0] if starts else len(text)
    base_seg = text[:first]
    base = {"index": slug, "name": title(slug), "kind": "race", "parent": None,
            "description": base_seg[:280], "grant": grant_from_section(base_seg, strongs, False)}

    subs = []
    for sub in SUBRACES.get(slug, []):
        start = section_start(text, sub)
        if start is None:
            continue
        end = next((s for s in starts if s > start), len(text))
        seg = text[start:end]
        subs.append({"index": sub.replace(" ", "-"), "name": sub.title(), "kind": "subrace", "parent": slug,
                     "description": seg[:200], "grant": grant_from_section(seg, strongs, True)})
    return base, subs


def lines_of(text):
    return [l.strip() for l in text.split("\n") if l.strip()]


def value_after(lines, label):
    for i, l in enumerate(lines):
        if l.lower().startswith(label.lower()):
            rest = l.split(":", 1)[1].strip() if ":" in l else ""
            return rest or (lines[i + 1] if i + 1 < len(lines) else None)
    return None


def parse_skill_list(s):
    if not s or s.strip().lower() in ("none", "—", "-"):
        return []
    return [SKILL_IDS[p.strip().lower()] for p in re.split(r",|and", s) if p.strip().lower() in SKILL_IDS]


def parse_background(slug):
    page = fetch_page("background:" + slug)
    text = page["text"]
    if not text:
        return None
    lines = lines_of(text)
    g = empty_grant()
    g["skillProficiencies"] = parse_skill_list(value_after(lines, "Skill Proficiencies"))
    tools = value_after(lines, "Tool Proficiencies")
    if tools and tools.strip().lower() != "none":
        g["toolProficiencies"] = [t.strip() for t in re.split(r",|and", tools) if t.strip() and t.strip().lower() != "none"]
    fixed_lang, choose_lang = language_field(value_after(lines, "Languages") or "")
    g["languages"] = fixed_lang
    if choose_lang:
        g["choices"].append({"id": "lang", "type": "language", "choose": choose_lang, "from": "any"})
    # Background feature name (e.g. "Feature: Researcher"); skip the noisy d8 personality tables.
    fm = re.search(r"Feature:\s*([A-Z][^\n.]{2,40})", text)
    if fm:
        g["features"] = [{"name": fm.group(1).strip(), "desc": ""}]
    desc = text.split("Source:")[0][:280] if "Source:" in text else text[:280]
    return {"index": slug, "name": title(slug), "kind": "background", "parent": None, "description": desc, "grant": g}


def pair_features(text, names, limit=12):
    """Pair section heading names with the prose that follows each, in order."""
    feats, seen = [], set()
    present = [n for n in names if n and n in text]
    for i, name in enumerate(present):
        if name in seen:
            continue
        seen.add(name)
        start = text.index(name) + len(name)
        end = len(text)
        for nxt in present[i + 1:]:
            j = text.find(nxt, start)
            if j >= 0:
                end = j
                break
        feats.append({"name": name, "desc": text[start:end].strip()[:300]})
        if len(feats) >= limit:
            break
    return feats


def discover_subclasses(class_slug):
    page = fetch_page(class_slug)
    out, seen = [], set()
    for link in page.get("links", []):
        href, name = link.get("href", ""), link.get("text", "").strip()
        m = re.match(rf"^/?{class_slug}:([a-z0-9-]+)$", href)
        if not m or not name:
            continue
        sub = m.group(1)
        if sub.endswith("-ua") or sub in seen:  # skip Unearthed Arcana
            continue
        seen.add(sub)
        out.append((f"{class_slug}:{sub}", name))
    return out


def parse_subclass(slug, name, class_slug):
    page = fetch_page(slug)
    text = page["text"]
    if not text:
        return None
    g = empty_grant()
    g["features"] = pair_features(text, page.get("h3", []))
    if re.search(r"hit point maximum increases by 1.*?(?:every|whenever).*?level", text, re.S):
        g["hpPerLevel"] = 1
    skm = re.search(r"proficiency in (\w+) skills? of your choice", text.lower())
    if skm:
        g["choices"].append({"id": "skill", "type": "skill", "choose": WORD_NUM.get(skm.group(1), 0), "from": "any"})
    first_h3 = page.get("h3", [])
    cut = text.index(first_h3[0]) if first_h3 and first_h3[0] in text else 280
    return {"index": slug, "name": name, "kind": "subclass", "parent": class_slug,
            "description": text[:cut][:280], "grant": g}


def main():
    races, subraces = [], []
    for slug in PHB_RACES:
        base, subs = parse_race(slug)
        if base:
            races.append(base)
            subraces.extend(subs)
    backgrounds = [b for b in (parse_background(s) for s in PHB_BACKGROUNDS) if b]

    subclasses = []
    for cls in CLASSES:
        for slug, name in discover_subclasses(cls):
            sc = parse_subclass(slug, name, cls)
            if sc:
                subclasses.append(sc)

    json.dump(races, open(os.path.join(OUT_DIR, "races.json"), "w", encoding="utf-8"), indent=1)
    json.dump(subraces, open(os.path.join(OUT_DIR, "subraces.json"), "w", encoding="utf-8"), indent=1)
    json.dump(backgrounds, open(os.path.join(OUT_DIR, "backgrounds.json"), "w", encoding="utf-8"), indent=1)
    json.dump(subclasses, open(os.path.join(OUT_DIR, "subclasses.json"), "w", encoding="utf-8"), indent=1)
    print(f"races {len(races)}  subraces {len(subraces)}  backgrounds {len(backgrounds)}  subclasses {len(subclasses)}")

    def show(o):
        g = o["grant"]
        print(f"  [{o['name']}] bonus={g['abilityBonuses']} hp/lvl={g.get('hpPerLevel')} "
              f"langs={g['languages']} skills={g['skillProficiencies']} choices={json.dumps(g['choices'])} "
              f"feats={[f['name'] for f in g['features']]}")
    for o in races:
        if o["index"] in ("half-elf", "dwarf"):
            show(o)
    for o in subraces:
        if "dwarf" in o["index"]:
            show(o)
    for o in backgrounds:
        if o["index"] in ("sage", "acolyte"):
            show(o)
    for o in subclasses:
        if o["index"] in ("sorcerer:draconic-bloodline", "fighter:champion", "rogue:thief"):
            print(f"  [{o['name']} <{o['parent']}>] hp/lvl={o['grant'].get('hpPerLevel')} "
                  f"feats={[f['name'] for f in o['grant']['features']]}")


if __name__ == "__main__":
    main()

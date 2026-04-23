#!/usr/bin/env python3
"""Reads raw git log lines from stdin (format: "subject|||sha") and writes
a categorized markdown changelog to stdout."""

import sys
import re

version = sys.argv[1]
raw = sys.stdin.read().strip()

categories = {
    "feat":     ("✨ New Features",              []),
    "fix":      ("🐛 Bug Fixes",                 []),
    "docs":     ("📝 Documentation",             []),
    "refactor": ("♻️ Refactoring & Performance", []),
    "perf":     ("♻️ Refactoring & Performance", []),
    "ci":       ("⚙️ CI/CD",                     []),
    "build":    ("⚙️ CI/CD",                     []),
    "chore":    ("🔧 Chores & Maintenance",      []),
    "style":    ("🔧 Chores & Maintenance",      []),
    "test":     ("🔧 Chores & Maintenance",      []),
}
other = ("📌 Other Changes", [])

for line in raw.splitlines():
    if "|||" not in line:
        continue
    subject, sha = line.rsplit("|||", 1)
    subject = subject.strip()
    sha = sha.strip()
    match = re.match(r'^(\w+)(?:\([^)]+\))?!?:\s*(.+)', subject)
    if match:
        prefix = match.group(1).lower()
        description = match.group(2)
        entry = f"- {description} (`{sha}`)"
        if prefix in categories:
            categories[prefix][1].append(entry)
        else:
            other[1].append(f"- {subject} (`{sha}`)")
    else:
        other[1].append(f"- {subject} (`{sha}`)")

lines = [f"## 🚀 ng-mapcn v{version}", ""]

seen_titles: set = set()
for key, (title, entries) in categories.items():
    if entries and title not in seen_titles:
        seen_titles.add(title)
        lines.append(f"### {title}")
        lines.extend(entries)
        lines.append("")

if other[1]:
    lines.append(f"### {other[0]}")
    lines.extend(other[1])
    lines.append("")

lines.append(f"> 📦 Install: `npm install ng-mapcn@{version}`")

print("\n".join(lines))

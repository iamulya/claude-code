#!/usr/bin/env python3
"""
Clean internal audit/gap/sprint tracking codes from YAAF source comments.
SAFE version: never touches non-comment lines, never normalises whitespace.
"""

import re
import sys
import os
import glob

# ── Comment-prefix stripping patterns ────────────────────────────────────────
# Applied only to lines that START with optional whitespace then // or *
# Removes the audit-code prefix while keeping the rest of the comment.
COMMENT_LINE = re.compile(r'^(\s*(?://\s*|\*\s*))(.*)$')

# Prefixes to strip from the comment body (leave the rest intact)
AUDIT_PREFIX = re.compile(
    r'^('
    r'[A-Z][-\d]+\s+FIX:\s*'               # W10-05 FIX: M1 FIX:
    r'|FIX \d+\.\d+:\s*'                   # FIX 7.3: FIX 6.3:
    r'|[A-Z]\d+\s+FIX:\s*'               # C1 FIX: C12 FIX: A4 FIX:
    r'|GAP \d+\s+FIX:\s*'               # GAP 4 FIX: GAP 10 FIX:
    r'|Gap #?\d+\s+FIX:\s*'             # Gap #4 FIX: Gap 3 FIX:
    r'|[A-Z]-\d+\s+FIX:\s*'            # A-4 FIX:
    r'|[A-Z]\d+/[A-Z]\d+\s+FIX:\s*'   # A-1/S-1 FIX:
    r'|[A-Z]-\d+/[A-Z]-\d+\s+FIX:\s*' # A-1/S-1 variant
    r'|CRITIQUE #?\d+\s+FIX:\s*'       # CRITIQUE #5 FIX:
    r'|CRITIQUE #?\d+\s+FIX —\s*'      # CRITIQUE #1 FIX —
    r'|G-DEEP-\d+\s+FIX:\s*'          # G-DEEP-3 FIX:
    r'|C\d+\s+FIX \+ CRITIQUE #?\d+\s+FIX:\s*'  # C3 FIX + CRITIQUE #3 FIX:
    r')',
    re.IGNORECASE,
)

# Inline sub-patterns — applied within comment bodies, removing the bracket/dash forms
INLINE_SUBS = [
    # "// ── GAP 8: label ──" → "// ── label ──" (section headers)
    (re.compile(r'^(──\s*)GAP \d+:\s*'), r'\1'),
    # "(Gap N + M)" and "(Gap N)" parentheticals
    (re.compile(r'\s*\(Gap \d+(?:\s*\+\s*\d+)?\)'), ''),
    # "— ADK Parity — AN" and "(ADK Parity — AN)"
    (re.compile(r'\s*—?\s*ADK Parity\s*—\s*[A-Z]\d+'), ''),
    (re.compile(r'\s*\(ADK Parity\s*—\s*[A-Z]\d+\)'), ''),
    # "— OpenClaw Parity — ON" and "(OpenClaw Parity — ON)"
    (re.compile(r'\s*—?\s*OpenClaw Parity\s*—\s*[A-Z]\d+'), ''),
    (re.compile(r'\s*\(OpenClaw Parity\s*—\s*[A-Z]\d+\)'), ''),
    # "A-N / CRITIQUE-N" and standalone "CRITIQUE-N"
    (re.compile(r'A-\d+\s*/\s*CRITIQUE-\d+'), ''),
    (re.compile(r'CRITIQUE-\d+\s*(?:fix|invariant|FIX)?', re.IGNORECASE), ''),
    # "(A-N FIX)" parenthetical labels
    (re.compile(r'\s*\([A-Z]-\d+\s+FIX\)'), ''),
    # "(Phase N)" parentheticals; "// ── Phase N: ..." section divider labels
    (re.compile(r'\s*\(Phase \d+\)'), ''),
    (re.compile(r'(──\s*)Phase \d+:\s*'), r'\1'),
    # "— Sprint N-X" and "(Sprint N-X)"
    (re.compile(r'\s*—?\s*Sprint \d+-[A-Z]'), ''),
    (re.compile(r'\s*\(Sprint \d+-[A-Z]\)'), ''),
    # " (Gap N)" trailing after section name
    (re.compile(r' \(Gap \d+\)'), ''),
    # **M4 FIX:** bold markdown style
    (re.compile(r'\*\*[A-Z]\d+ FIX:\*\*\s*'), ''),
]

def clean_comment_body(body):
    """Strip audit prefix then apply inline substitutions to comment body."""
    # Strip leading audit prefix
    m = AUDIT_PREFIX.match(body)
    if m:
        body = body[m.end():]

    # Apply inline subs
    for pat, repl in INLINE_SUBS:
        body = pat.sub(repl, body)

    return body

def clean_line(line):
    """
    Returns (cleaned_line, was_changed).
    Only modifies lines that are comment lines (// or *).
    Never changes non-comment lines.
    Never strips trailing whitespace or normalises spaces in code.
    """
    # Preserve the original line ending
    ending = ''
    if line.endswith('\r\n'):
        ending = '\r\n'
        stripped = line[:-2]
    elif line.endswith('\n'):
        ending = '\n'
        stripped = line[:-1]
    else:
        stripped = line

    m = COMMENT_LINE.match(stripped)
    if not m:
        return line, False  # not a comment line — leave completely untouched

    prefix = m.group(1)  # e.g. "  // " or " * "
    body = m.group(2)    # the comment content after the marker

    new_body = clean_comment_body(body)

    if new_body == body:
        return line, False

    new_line = prefix + new_body + ending
    return new_line, True

def clean_file(path):
    """Returns (lines_changed, lines_removed)."""
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        original_lines = f.readlines()

    new_lines = []
    changed = 0

    for original in original_lines:
        cleaned, was_changed = clean_line(original)
        if was_changed:
            changed += 1
        new_lines.append(cleaned)

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)

    return changed

def main():
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    pattern = os.path.join(root, '**', '*.ts')
    files = glob.glob(pattern, recursive=True)
    files = [f for f in files if 'node_modules' not in f]

    total_files = 0
    total_changed = 0

    for path in sorted(files):
        c = clean_file(path)
        if c:
            total_files += 1
            total_changed += c
            print(f'  {path}: {c} comment lines cleaned')

    print(f'\nDone. {total_files} files modified, {total_changed} comment lines cleaned.')

if __name__ == '__main__':
    main()

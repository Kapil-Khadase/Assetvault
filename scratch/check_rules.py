with open('static/css/styles.css', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.finditer(r'([^{}]+)\{([^}]+)\}', text)
for m in matches:
    sel = m.group(1).strip()
    body = m.group(2)
    # Check for background
    for line in body.splitlines():
        line_s = line.strip()
        if line_s.startswith('background') or line_s.startswith('border-color'):
            if any(c in line_s for c in ['#fff', '#FFF', '#F8FAFC', '#0F172A', '#F5F6F3', 'rgba(']):
                if '[data-theme="dark"]' not in sel:
                    print(f"{sel} -> {line_s}")

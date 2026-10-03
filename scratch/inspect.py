with open('static/css/styles.css', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'data-theme="light"' in line or "data-theme='light'" in line:
            print(f"L{i+1}: {line.strip()}")

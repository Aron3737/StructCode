import os
import json
from flask import Flask, jsonify, send_from_directory, request
from pathlib import Path

app = Flask(__name__, static_folder='public')

INDICATORS = {
    'Python':     ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
    'JavaScript': ['package.json'],
    'Java':       ['pom.xml', 'build.gradle'],
    'Go':         ['go.mod'],
    'Rust':       ['Cargo.toml'],
    'Ruby':       ['Gemfile'],
    'PHP':        ['composer.json'],
    'C/C++':      ['CMakeLists.txt', 'Makefile'],
    'Swift':      ['Package.swift'],
    'Kotlin':     ['build.gradle.kts'],
}

FRAMEWORK_HINTS = {
    'React':    ('package.json', '"react"'),
    'Vue':      ('package.json', '"vue"'),
    'Next.js':  ('package.json', '"next"'),
    'FastAPI':  ('requirements.txt', 'fastapi'),
    'Django':   ('requirements.txt', 'django'),
    'Flask':    ('requirements.txt', 'flask'),
    'Spring':   ('pom.xml', 'spring'),
}

def detect_language(project_path: Path):
    for lang, files in INDICATORS.items():
        for f in files:
            if (project_path / f).exists():
                return lang
    return 'Unknown'

def detect_framework(project_path: Path):
    for fw, (filename, keyword) in FRAMEWORK_HINTS.items():
        target = project_path / filename
        if target.exists():
            try:
                if keyword.lower() in target.read_text(errors='ignore').lower():
                    return fw
            except Exception:
                pass
    return None

def is_project(path: Path):
    return (path / '.git').exists() or any(
        (path / f).exists()
        for files in INDICATORS.values()
        for f in files
    )

def scan(base: str):
    base_path = Path(base).expanduser().resolve()
    if not base_path.is_dir():
        return None, f"경로를 찾을 수 없습니다: {base}"

    projects = []
    try:
        entries = sorted(base_path.iterdir())
    except PermissionError:
        return None, "권한 없음"

    for entry in entries:
        if not entry.is_dir() or entry.name.startswith('.'):
            continue
        if is_project(entry):
            lang = detect_language(entry)
            fw = detect_framework(entry)
            projects.append({
                'name': entry.name,
                'path': str(entry),
                'language': lang,
                'framework': fw,
                'has_git': (entry / '.git').exists(),
            })

    return projects, None


@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/api/scan')
def api_scan():
    path = request.args.get('path', '~')
    projects, error = scan(path)
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'projects': projects, 'base': path})


if __name__ == '__main__':
    print("http://localhost:5000 에서 실행 중")
    app.run(debug=True, port=5000)

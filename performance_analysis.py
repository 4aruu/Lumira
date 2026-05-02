"""
Lumira Performance Analysis Script
===================================
Generates comprehensive performance data for charts, pie graphs, and reports.
Outputs: CSV + JSON files in /analysis_output/ for download.
"""

import os
import sys
import io

# Fix Windows console encoding for emoji/unicode
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import json
import csv
import sqlite3
import time
import ast
import re
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from pathlib import Path


def safe_read(filepath):
    """Read a file trying multiple encodings (UTF-8 -> UTF-16 -> latin-1)."""
    for enc in ['utf-8', 'utf-16', 'latin-1']:
        try:
            with open(filepath, 'r', encoding=enc) as f:
                return f.read()
        except (UnicodeDecodeError, UnicodeError):
            continue
    return ""


def safe_readlines(filepath):
    """Read a file into lines trying multiple encodings."""
    for enc in ['utf-8', 'utf-16', 'latin-1']:
        try:
            with open(filepath, 'r', encoding=enc) as f:
                return f.readlines()
        except (UnicodeDecodeError, UnicodeError):
            continue
    return []

# ──────────────────────────────────────────────
#  CONFIG
# ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
OUTPUT_DIR = os.path.join(BASE_DIR, "analysis_output")
DB_PATH = os.path.join(BACKEND_DIR, "analytics.db")

os.makedirs(OUTPUT_DIR, exist_ok=True)


def save_csv(filename, headers, rows):
    """Save data as CSV."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"  ✅ Saved: {filepath}")
    return filepath


def save_json(filename, data):
    """Save data as JSON."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    print(f"  ✅ Saved: {filepath}")
    return filepath


# ══════════════════════════════════════════════
#  1. CODEBASE ANALYSIS
# ══════════════════════════════════════════════
def analyze_codebase():
    """Analyze lines of code, file counts, and complexity per component."""
    print("\n📊 [1/6] Codebase Structure Analysis...")

    extensions_map = {
        ".py": "Python",
        ".js": "JavaScript",
        ".jsx": "React (JSX)",
        ".ts": "TypeScript",
        ".tsx": "React (TSX)",
        ".css": "CSS",
        ".html": "HTML",
        ".json": "JSON Config",
        ".md": "Markdown",
        ".txt": "Text",
    }

    skip_dirs = {"node_modules", ".git", ".venv", "__pycache__", ".idea", "dist", "chroma_db", ".next"}

    results = []
    component_stats = defaultdict(lambda: {"files": 0, "lines": 0, "blank": 0, "comment": 0, "code": 0, "size_bytes": 0})
    language_stats = defaultdict(lambda: {"files": 0, "lines": 0, "code": 0})
    file_details = []

    for root, dirs, files in os.walk(BASE_DIR):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in skip_dirs]

        for fname in files:
            fpath = os.path.join(root, fname)
            ext = os.path.splitext(fname)[1].lower()

            if ext not in extensions_map:
                continue

            lang = extensions_map[ext]
            rel_path = os.path.relpath(fpath, BASE_DIR)

            # Determine component
            if rel_path.startswith("backend"):
                if "routes" in rel_path:
                    component = "Backend / Routes"
                elif "services" in rel_path:
                    component = "Backend / Services"
                elif "Utils" in rel_path:
                    component = "Backend / Utils"
                elif "models" in rel_path:
                    component = "Backend / Models"
                elif "Database" in rel_path:
                    component = "Backend / Database"
                else:
                    component = "Backend / Core"
            elif rel_path.startswith("frontend"):
                if "components" in rel_path:
                    component = "Frontend / Components"
                elif "hooks" in rel_path:
                    component = "Frontend / Hooks"
                elif "assets" in rel_path:
                    component = "Frontend / Assets"
                else:
                    component = "Frontend / Core"
            else:
                component = "Project Root"

            try:
                file_size = os.path.getsize(fpath)
                lines = safe_readlines(fpath)

                total_lines = len(lines)
                blank_lines = sum(1 for l in lines if l.strip() == "")
                comment_lines = sum(1 for l in lines if l.strip().startswith(("#", "//", "/*", "*", "<!--")))
                code_lines = total_lines - blank_lines - comment_lines

                component_stats[component]["files"] += 1
                component_stats[component]["lines"] += total_lines
                component_stats[component]["blank"] += blank_lines
                component_stats[component]["comment"] += comment_lines
                component_stats[component]["code"] += code_lines
                component_stats[component]["size_bytes"] += file_size

                language_stats[lang]["files"] += 1
                language_stats[lang]["lines"] += total_lines
                language_stats[lang]["code"] += code_lines

                file_details.append({
                    "file": rel_path,
                    "component": component,
                    "language": lang,
                    "total_lines": total_lines,
                    "code_lines": code_lines,
                    "comment_lines": comment_lines,
                    "blank_lines": blank_lines,
                    "size_kb": round(file_size / 1024, 2),
                })

            except Exception as e:
                print(f"  ⚠️ Skipped {rel_path}: {e}")

    # Save component breakdown (for pie chart)
    comp_rows = []
    for comp, stats in sorted(component_stats.items()):
        comp_rows.append([comp, stats["files"], stats["lines"], stats["code"], stats["comment"], stats["blank"], round(stats["size_bytes"] / 1024, 2)])
    save_csv("codebase_by_component.csv",
             ["Component", "Files", "Total Lines", "Code Lines", "Comment Lines", "Blank Lines", "Size (KB)"],
             comp_rows)

    # Save language breakdown (for pie chart)
    lang_rows = [[lang, s["files"], s["lines"], s["code"]] for lang, s in sorted(language_stats.items())]
    save_csv("codebase_by_language.csv",
             ["Language", "Files", "Total Lines", "Code Lines"],
             lang_rows)

    # Save detailed file list (for table/heatmap)
    save_json("codebase_file_details.json", file_details)

    # Save summary
    total_files = sum(s["files"] for s in component_stats.values())
    total_lines = sum(s["lines"] for s in component_stats.values())
    total_code = sum(s["code"] for s in component_stats.values())
    total_comments = sum(s["comment"] for s in component_stats.values())
    total_size = sum(s["size_bytes"] for s in component_stats.values())

    summary = {
        "total_files": total_files,
        "total_lines": total_lines,
        "total_code_lines": total_code,
        "total_comment_lines": total_comments,
        "total_size_kb": round(total_size / 1024, 2),
        "code_to_comment_ratio": round(total_code / max(total_comments, 1), 2),
        "avg_lines_per_file": round(total_lines / max(total_files, 1), 1),
        "components": dict(component_stats),
        "languages": dict(language_stats),
    }
    save_json("codebase_summary.json", summary)

    return summary


# ══════════════════════════════════════════════
#  2. ANALYTICS DATABASE ANALYSIS
# ══════════════════════════════════════════════
def analyze_analytics_db():
    """Extract and analyze data from analytics.db."""
    print("\n📊 [2/6] Analytics Database Analysis...")

    if not os.path.exists(DB_PATH):
        print("  ⚠️ analytics.db not found — skipping")
        return {}

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # ── Sessions Overview ──
    sessions = conn.execute("SELECT * FROM sessions ORDER BY started_at").fetchall()
    messages = conn.execute("SELECT * FROM messages ORDER BY timestamp").fetchall()

    total_sessions = len(sessions)
    total_messages = len(messages)

    print(f"  📌 Total Sessions: {total_sessions}")
    print(f"  📌 Total Messages: {total_messages}")

    # ── Session Data CSV ──
    session_rows = []
    for s in sessions:
        try:
            started = datetime.fromisoformat(s["started_at"])
            last = datetime.fromisoformat(s["last_active"])
            duration_sec = (last - started).total_seconds()
        except:
            duration_sec = 0

        session_rows.append([
            s["id"], s["project"], s["started_at"], s["last_active"], round(duration_sec, 1)
        ])
    save_csv("analytics_sessions.csv",
             ["Session ID", "Project", "Started At", "Last Active", "Duration (sec)"],
             session_rows)

    # ── Messages CSV ──
    msg_rows = [[m["id"], m["session_id"], m["project"], m["role"], m["timestamp"]] for m in messages]
    save_csv("analytics_messages.csv",
             ["Message ID", "Session ID", "Project", "Role", "Timestamp"],
             msg_rows)

    # ── Messages per Project (for bar chart) ──
    proj_msg_count = Counter()
    proj_session_count = Counter()
    for m in messages:
        proj_msg_count[m["project"]] += 1
    for s in sessions:
        proj_session_count[s["project"]] += 1

    proj_rows = []
    all_projects = set(proj_msg_count.keys()) | set(proj_session_count.keys())
    for p in sorted(all_projects):
        proj_rows.append([p, proj_session_count.get(p, 0), proj_msg_count.get(p, 0)])
    save_csv("analytics_per_project.csv",
             ["Project", "Sessions", "Messages"],
             proj_rows)

    # ── User vs AI messages (for pie chart) ──
    role_counts = Counter(m["role"] for m in messages)
    save_csv("analytics_message_roles.csv",
             ["Role", "Count"],
             [[role, cnt] for role, cnt in role_counts.items()])

    # ── Peak Hours (for bar chart: 24 hours) ──
    hourly = [0] * 24
    for m in messages:
        try:
            ts = datetime.fromisoformat(m["timestamp"])
            hourly[ts.hour] += 1
        except:
            pass
    save_csv("analytics_peak_hours.csv",
             ["Hour", "Message Count"],
             [[h, hourly[h]] for h in range(24)])

    # ── Daily Activity (for line chart) ──
    daily_msgs = Counter()
    daily_sessions = Counter()
    for m in messages:
        try:
            day = datetime.fromisoformat(m["timestamp"]).strftime("%Y-%m-%d")
            daily_msgs[day] += 1
        except:
            pass
    for s in sessions:
        try:
            day = datetime.fromisoformat(s["started_at"]).strftime("%Y-%m-%d")
            daily_sessions[day] += 1
        except:
            pass

    all_days = sorted(set(daily_msgs.keys()) | set(daily_sessions.keys()))
    save_csv("analytics_daily_activity.csv",
             ["Date", "Messages", "Sessions"],
             [[d, daily_msgs.get(d, 0), daily_sessions.get(d, 0)] for d in all_days])

    # ── Session Durations (for histogram) ──
    durations = []
    for s in sessions:
        try:
            started = datetime.fromisoformat(s["started_at"])
            last = datetime.fromisoformat(s["last_active"])
            d = (last - started).total_seconds()
            if d > 0:
                durations.append([s["project"], round(d, 1)])
        except:
            pass
    save_csv("analytics_session_durations.csv",
             ["Project", "Duration (sec)"],
             durations)

    # ── Messages per session (for distribution chart) ──
    session_msg_counts = Counter()
    for m in messages:
        if m["session_id"]:
            session_msg_counts[m["session_id"]] += 1

    msgs_per_session = []
    for sid, cnt in session_msg_counts.items():
        # Find corresponding project
        sess = next((s for s in sessions if s["id"] == sid), None)
        proj = sess["project"] if sess else "unknown"
        msgs_per_session.append([sid[:20], proj, cnt])
    save_csv("analytics_msgs_per_session.csv",
             ["Session ID (truncated)", "Project", "Message Count"],
             msgs_per_session)

    # ── Summary ──
    avg_duration = 0
    if durations:
        avg_duration = round(sum(d[1] for d in durations) / len(durations), 1)

    avg_msgs = round(total_messages / max(total_sessions, 1), 1)

    analytics_summary = {
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "unique_projects": len(all_projects),
        "avg_messages_per_session": avg_msgs,
        "avg_session_duration_sec": avg_duration,
        "role_distribution": dict(role_counts),
        "peak_hour": hourly.index(max(hourly)) if max(hourly) > 0 else None,
        "peak_hour_count": max(hourly),
        "busiest_day": max(all_days, key=lambda d: daily_msgs.get(d, 0)) if all_days else None,
        "busiest_day_count": max(daily_msgs.values()) if daily_msgs else 0,
    }
    save_json("analytics_summary.json", analytics_summary)

    conn.close()
    return analytics_summary


# ══════════════════════════════════════════════
#  3. ARCHITECTURE COMPLEXITY ANALYSIS
# ══════════════════════════════════════════════
def analyze_architecture():
    """Analyze Python function/class complexity and frontend component sizes."""
    print("\n📊 [3/6] Architecture & Complexity Analysis...")

    py_files = []
    for root, dirs, files in os.walk(BACKEND_DIR):
        dirs[:] = [d for d in dirs if d not in {"__pycache__", ".idea", "chroma_db", ".venv"}]
        for f in files:
            if f.endswith(".py"):
                py_files.append(os.path.join(root, f))

    function_data = []
    class_data = []

    for fpath in py_files:
        rel = os.path.relpath(fpath, BASE_DIR)
        try:
            source = safe_read(fpath)
            tree = ast.parse(source)

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                    end_line = getattr(node, "end_lineno", node.lineno + 1)
                    length = end_line - node.lineno + 1

                    # Count complexity (branches)
                    complexity = 1
                    for child in ast.walk(node):
                        if isinstance(child, (ast.If, ast.For, ast.While, ast.ExceptHandler,
                                              ast.With, ast.Assert, ast.BoolOp)):
                            complexity += 1

                    function_data.append([
                        rel, node.name, node.lineno, length, complexity,
                        "async" if isinstance(node, ast.AsyncFunctionDef) else "sync"
                    ])

                elif isinstance(node, ast.ClassDef):
                    end_line = getattr(node, "end_lineno", node.lineno + 1)
                    length = end_line - node.lineno + 1
                    methods = sum(1 for n in ast.walk(node)
                                  if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)))
                    class_data.append([rel, node.name, node.lineno, length, methods])

        except SyntaxError:
            pass

    save_csv("architecture_functions.csv",
             ["File", "Function", "Start Line", "Lines", "Cyclomatic Complexity", "Type"],
             function_data)

    save_csv("architecture_classes.csv",
             ["File", "Class", "Start Line", "Lines", "Methods"],
             class_data)

    # ── Frontend Component Analysis ──
    jsx_data = []
    components_dir = os.path.join(FRONTEND_DIR, "src", "components")
    if os.path.isdir(components_dir):
        for fname in os.listdir(components_dir):
            if fname.endswith((".jsx", ".tsx", ".js")):
                fpath = os.path.join(components_dir, fname)
                try:
                    content = safe_read(fpath)
                    lines = content.count("\n") + 1
                    size_kb = round(os.path.getsize(fpath) / 1024, 2)

                    # Count hooks usage
                    hooks = len(re.findall(r'\buse[A-Z]\w*', content))
                    # Count state variables
                    states = len(re.findall(r'useState', content))
                    # Count effects
                    effects = len(re.findall(r'useEffect', content))
                    # Count props
                    props_match = re.search(r'(?:function|const)\s+\w+\s*\(\s*\{([^}]*)\}', content)
                    props_count = len(props_match.group(1).split(",")) if props_match else 0

                    jsx_data.append([
                        fname, lines, size_kb, hooks, states, effects, props_count
                    ])
                except:
                    pass

    save_csv("architecture_frontend_components.csv",
             ["Component", "Lines", "Size (KB)", "Hook Calls", "useState Count", "useEffect Count", "Props Count"],
             jsx_data)

    # Complexity summary
    complexity_summary = {
        "total_python_functions": len(function_data),
        "total_python_classes": len(class_data),
        "total_jsx_components": len(jsx_data),
        "avg_function_complexity": round(sum(f[4] for f in function_data) / max(len(function_data), 1), 2),
        "avg_function_length": round(sum(f[3] for f in function_data) / max(len(function_data), 1), 1),
        "most_complex_functions": sorted(function_data, key=lambda x: x[4], reverse=True)[:5],
        "largest_components": sorted(jsx_data, key=lambda x: x[1], reverse=True)[:5],
    }
    save_json("architecture_complexity_summary.json", complexity_summary)

    return complexity_summary


# ══════════════════════════════════════════════
#  4. DEPENDENCY ANALYSIS
# ══════════════════════════════════════════════
def analyze_dependencies():
    """Analyze Python and JavaScript dependencies."""
    print("\n📊 [4/6] Dependency Analysis...")

    # ── Python Dependencies ──
    req_path = os.path.join(BACKEND_DIR, "requirements.txt")
    py_deps = []
    if os.path.exists(req_path):
        req_lines = safe_readlines(req_path)
        for line in req_lines:
            line = line.strip()
            if line and not line.startswith("#"):
                # Parse name and version
                match = re.match(r'^([a-zA-Z0-9_-]+)(.*)', line)
                if match:
                    name = match.group(1)
                    version = match.group(2).strip()
                    # Categorize
                    if any(k in name.lower() for k in ["langchain", "chroma", "embed"]):
                        category = "AI / Vector Store"
                    elif any(k in name.lower() for k in ["fastapi", "uvicorn", "starlette"]):
                        category = "Web Framework"
                    elif any(k in name.lower() for k in ["whisper", "tts", "edge-tts", "pyttsx"]):
                        category = "Speech / Audio"
                    elif any(k in name.lower() for k in ["jwt", "auth", "crypt", "dotenv"]):
                        category = "Security / Config"
                    elif any(k in name.lower() for k in ["pdf", "pypdf"]):
                        category = "Document Processing"
                    else:
                        category = "Utility"
                    py_deps.append([name, version, category, "Python"])

    save_csv("dependencies_python.csv",
             ["Package", "Version Constraint", "Category", "Runtime"],
             py_deps)

    # ── JavaScript Dependencies ──
    pkg_path = os.path.join(FRONTEND_DIR, "package.json")
    js_deps = []
    if os.path.exists(pkg_path):
        pkg_text = safe_read(pkg_path)
        pkg = json.loads(pkg_text)

        for name, ver in pkg.get("dependencies", {}).items():
            js_deps.append([name, ver, "Production", "JavaScript"])
        for name, ver in pkg.get("devDependencies", {}).items():
            js_deps.append([name, ver, "Development", "JavaScript"])

    save_csv("dependencies_javascript.csv",
             ["Package", "Version", "Type", "Runtime"],
             js_deps)

    # ── Dependency Category Summary (for pie chart) ──
    py_categories = Counter(d[2] for d in py_deps)
    all_categories = []
    for cat, cnt in py_categories.items():
        all_categories.append(["Python", cat, cnt])
    all_categories.append(["JavaScript", "Production", sum(1 for d in js_deps if d[2] == "Production")])
    all_categories.append(["JavaScript", "Development", sum(1 for d in js_deps if d[2] == "Development")])

    save_csv("dependencies_summary.csv",
             ["Runtime", "Category", "Count"],
             all_categories)

    dep_summary = {
        "python_total": len(py_deps),
        "javascript_total": len(js_deps),
        "python_categories": dict(py_categories),
        "js_production": sum(1 for d in js_deps if d[2] == "Production"),
        "js_development": sum(1 for d in js_deps if d[2] == "Development"),
    }
    save_json("dependencies_overview.json", dep_summary)

    return dep_summary


# ══════════════════════════════════════════════
#  5. API ENDPOINT ANALYSIS
# ══════════════════════════════════════════════
def analyze_api_endpoints():
    """Catalog all API routes and their characteristics."""
    print("\n📊 [5/6] API Endpoint Analysis...")

    routes_dir = os.path.join(BACKEND_DIR, "routes")
    endpoints = []

    if os.path.isdir(routes_dir):
        for fname in os.listdir(routes_dir):
            if not fname.endswith(".py") or fname.startswith("__"):
                continue
            fpath = os.path.join(routes_dir, fname)
            try:
                content = safe_read(fpath)

                # Find route decorators
                route_pattern = re.compile(
                    r'@router\.(get|post|put|delete|patch)\(\s*["\']([^"\']+)["\']',
                    re.IGNORECASE
                )
                for match in route_pattern.finditer(content):
                    method = match.group(1).upper()
                    path = match.group(2)

                    # Find the function name
                    func_match = re.search(
                        r'(?:async\s+)?def\s+(\w+)',
                        content[match.end():]
                    )
                    func_name = func_match.group(1) if func_match else "unknown"

                    # Determine category
                    if "chat" in path or "stt" in path or "speak" in path:
                        category = "Chat / Voice"
                    elif "file" in path or "upload" in path:
                        category = "File Management"
                    elif "analytics" in path:
                        category = "Analytics"
                    elif "auth" in path:
                        category = "Authentication"
                    elif "health" in path:
                        category = "Health Check"
                    else:
                        category = "Other"

                    # Check auth requirement (simple heuristic)
                    has_auth = "Authorization" in content or "auth" in fname.lower()

                    endpoints.append([
                        method, path, func_name, fname, category, has_auth
                    ])

            except:
                pass

    save_csv("api_endpoints.csv",
             ["Method", "Path", "Function", "File", "Category", "Has Auth"],
             endpoints)

    # Category summary
    cat_counts = Counter(e[4] for e in endpoints)
    method_counts = Counter(e[0] for e in endpoints)

    save_csv("api_endpoints_by_category.csv",
             ["Category", "Count"],
             [[c, n] for c, n in cat_counts.items()])

    save_csv("api_endpoints_by_method.csv",
             ["HTTP Method", "Count"],
             [[m, n] for m, n in method_counts.items()])

    api_summary = {
        "total_endpoints": len(endpoints),
        "by_method": dict(method_counts),
        "by_category": dict(cat_counts),
        "endpoints": [{"method": e[0], "path": e[1], "function": e[2], "category": e[4]} for e in endpoints],
    }
    save_json("api_summary.json", api_summary)

    return api_summary


# ══════════════════════════════════════════════
#  6. DATASET ANALYSIS
# ══════════════════════════════════════════════
def analyze_datasets():
    """Analyze uploaded datasets and vector store."""
    print("\n📊 [6/6] Dataset & Storage Analysis...")

    dataset_dir = os.path.join(BACKEND_DIR, "Dataset")
    chroma_dir = os.path.join(BACKEND_DIR, "chroma_db")

    datasets = []
    if os.path.isdir(dataset_dir):
        for fname in os.listdir(dataset_dir):
            fpath = os.path.join(dataset_dir, fname)
            if os.path.isfile(fpath):
                size_kb = round(os.path.getsize(fpath) / 1024, 2)
                ext = os.path.splitext(fname)[1]
                mod_time = datetime.fromtimestamp(os.path.getmtime(fpath)).isoformat()
                datasets.append([fname, ext, size_kb, mod_time])

    save_csv("datasets_inventory.csv",
             ["Filename", "Extension", "Size (KB)", "Last Modified"],
             datasets)

    # Storage analysis
    storage_data = []

    def dir_size(path):
        total = 0
        if os.path.isdir(path):
            for root, dirs, files in os.walk(path):
                for f in files:
                    total += os.path.getsize(os.path.join(root, f))
        return total

    storage_data.append(["Dataset Files", round(dir_size(dataset_dir) / 1024, 2)])
    storage_data.append(["ChromaDB Vector Store", round(dir_size(chroma_dir) / 1024, 2)])

    db_size = 0
    if os.path.exists(DB_PATH):
        db_size = os.path.getsize(DB_PATH) / 1024
        # Also count WAL and SHM files
        for ext in ["-wal", "-shm"]:
            wal_path = DB_PATH + ext
            if os.path.exists(wal_path):
                db_size += os.path.getsize(wal_path) / 1024
    storage_data.append(["Analytics Database", round(db_size, 2)])

    save_csv("storage_usage.csv",
             ["Component", "Size (KB)"],
             storage_data)

    dataset_summary = {
        "total_datasets": len(datasets),
        "datasets": [{"name": d[0], "size_kb": d[2]} for d in datasets],
        "storage_kb": {s[0]: s[1] for s in storage_data},
        "total_storage_kb": round(sum(s[1] for s in storage_data), 2),
    }
    save_json("dataset_summary.json", dataset_summary)

    return dataset_summary


# ══════════════════════════════════════════════
#  MASTER REPORT
# ══════════════════════════════════════════════
def generate_master_report(codebase, analytics_db, architecture, dependencies, api, datasets):
    """Create a master summary combining all analyses."""
    print("\n📋 Generating Master Report...")

    master = {
        "report_generated_at": datetime.now().isoformat(),
        "project": "Lumira — AI Project Expo Assistant",
        "sections": {
            "codebase": codebase,
            "analytics": analytics_db,
            "architecture": architecture,
            "dependencies": dependencies,
            "api_endpoints": api,
            "datasets": datasets,
        }
    }
    save_json("master_report.json", master)

    # Also create a human-readable summary CSV
    summary_rows = [
        ["Total Source Files", codebase.get("total_files", 0)],
        ["Total Lines of Code", codebase.get("total_code_lines", 0)],
        ["Total Lines (incl. blanks/comments)", codebase.get("total_lines", 0)],
        ["Code-to-Comment Ratio", codebase.get("code_to_comment_ratio", 0)],
        ["Avg Lines per File", codebase.get("avg_lines_per_file", 0)],
        ["Python Dependencies", dependencies.get("python_total", 0)],
        ["JavaScript Dependencies", dependencies.get("javascript_total", 0)],
        ["API Endpoints", api.get("total_endpoints", 0)],
        ["Python Functions", architecture.get("total_python_functions", 0)],
        ["Python Classes", architecture.get("total_python_classes", 0)],
        ["React Components", architecture.get("total_jsx_components", 0)],
        ["Avg Function Complexity", architecture.get("avg_function_complexity", 0)],
        ["Uploaded Datasets", datasets.get("total_datasets", 0)],
        ["Total Storage (KB)", datasets.get("total_storage_kb", 0)],
        ["Total Visitor Sessions", analytics_db.get("total_sessions", 0)],
        ["Total Chat Messages", analytics_db.get("total_messages", 0)],
        ["Avg Messages per Session", analytics_db.get("avg_messages_per_session", 0)],
        ["Avg Session Duration (sec)", analytics_db.get("avg_session_duration_sec", 0)],
    ]
    save_csv("master_summary.csv", ["Metric", "Value"], summary_rows)


# ══════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("  LUMIRA PERFORMANCE ANALYSIS")
    print("=" * 60)
    start = time.time()

    codebase = analyze_codebase()
    analytics_db = analyze_analytics_db()
    architecture = analyze_architecture()
    dependencies = analyze_dependencies()
    api = analyze_api_endpoints()
    datasets = analyze_datasets()

    generate_master_report(codebase, analytics_db, architecture, dependencies, api, datasets)

    elapsed = round(time.time() - start, 2)
    print(f"\n{'=' * 60}")
    print(f"  ✅ ANALYSIS COMPLETE in {elapsed}s")
    print(f"  📁 All files saved to: {OUTPUT_DIR}")
    print(f"{'=' * 60}")

    # List all generated files
    print("\n📦 Generated Files:")
    for f in sorted(os.listdir(OUTPUT_DIR)):
        size = os.path.getsize(os.path.join(OUTPUT_DIR, f))
        print(f"  📄 {f} ({round(size / 1024, 2)} KB)")

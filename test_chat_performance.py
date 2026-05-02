"""
test_chat_performance.py  —  Lumira Chat Interface Load & Quality Tester
=========================================================================
Fires 25 diverse queries at the /api/chat endpoint and measures:
  • Latency (time to full response)
  • First-token latency (streaming responsiveness)
  • Response length
  • Basic relevance score (keyword hit rate)
  • Error / empty responses

Usage:
    python test_chat_performance.py [--file <dataset_filename>] [--url <backend_url>]

Requirements:  pip install requests rich
"""

import time
import argparse
import sys
import json
from statistics import mean, median, stdev

try:
    import requests
except ImportError:
    print("Install requests first:  pip install requests")
    sys.exit(1)

try:
    from rich.console import Console
    from rich.table import Table
    from rich import box
    from rich.text import Text
    HAS_RICH = True
except ImportError:
    HAS_RICH = False

# ---------------------------------------------------------------------------
# TEST QUERIES  (25 queries spanning all classification modes)
# ---------------------------------------------------------------------------

QUERIES = [
    # NORMAL  (short, direct questions)
    ("What is this project?",                        ["project", "system", "about"]),
    ("What problem does it solve?",                  ["problem", "solves", "address"]),
    ("Who is the target audience?",                  ["user", "audience", "customer", "people"]),
    ("What are the main features?",                  ["feature", "function", "capability"]),
    ("How does it work?",                            ["work", "process", "step", "using"]),
    ("What technologies are used?",                  ["technology", "stack", "language", "framework"]),
    ("Is there a mobile version?",                   ["mobile", "app", "phone", "responsive"]),
    ("What data does it use?",                       ["data", "dataset", "input", "information"]),

    # SUMMARY  (overview-style)
    ("Give me a summary of this project.",           ["summary", "overview", "project", "built"]),
    ("Tell me what this is about.",                  ["about", "project", "system"]),
    ("Briefly explain the project.",                 ["project", "explain"]),

    # DEEP  (technical detail)
    ("Explain in detail how the system works.",      ["detail", "system", "process", "step"]),
    ("Walk me through the architecture.",            ["architecture", "component", "module"]),
    ("What is the technical stack in detail?",       ["python", "react", "backend", "frontend", "api"]),

    # ELABORATE  (follow-on)
    ("Tell me more about that.",                     []),
    ("Can you elaborate on the core functionality?", ["function", "feature", "core"]),
    ("Explain more about how data is processed.",    ["data", "process", "extract"]),

    # COMPARISON
    ("What makes this different from similar tools?",["different", "unique", "compared", "versus"]),
    ("How does this compare to traditional methods?",["compared", "traditional", "versus", "better"]),

    # EDGE CASES
    ("Hello",                                        ["hello", "hi", "ask", "question"]),
    ("Thanks",                                       ["welcome", "help"]),
    ("asdfghjkl qwerty",                             ["understand", "rephrase"]),
    ("What is the pricing?",                         []),
    ("Can I get the source code?",                   []),
    ("What are the future plans for this project?",  ["future", "plan", "roadmap", "improve"]),
]


# ---------------------------------------------------------------------------
# RUNNER
# ---------------------------------------------------------------------------

def run_query(base_url, query, active_file):
    """Send one chat request and return timing + response data."""
    url = f"{base_url.rstrip('/')}/api/chat"
    # Omit active_file entirely when None — avoids Pydantic v2 422 on null str fields
    payload = {"message": query}
    if active_file:
        payload["active_file"] = active_file

    first_token_time = None
    chunks = []
    start = time.perf_counter()
    error = None

    try:
        with requests.post(url, json=payload, stream=True, timeout=120) as resp:
            if resp.status_code != 200:
                error = f"HTTP {resp.status_code}"
            else:
                for chunk in resp.iter_content(chunk_size=None):
                    if chunk:
                        decoded = chunk.decode("utf-8", errors="replace")
                        if first_token_time is None:
                            first_token_time = time.perf_counter() - start
                        chunks.append(decoded)
    except requests.exceptions.ConnectionError:
        error = "Connection refused (is the backend running?)"
    except requests.exceptions.Timeout:
        error = "Timeout (>120 s)"
    except Exception as e:
        error = str(e)

    elapsed = time.perf_counter() - start
    full_text = "".join(chunks).split("SOURCES_METADATA:")[0].strip()

    return {
        "query": query,
        "latency": elapsed,
        "first_token": first_token_time,
        "length": len(full_text),
        "response": full_text,
        "error": error,
    }


def relevance_score(response, keywords):
    """Simple keyword hit-rate relevance score (0.0 - 1.0)."""
    if not keywords:
        return None
    resp_lower = response.lower()
    hits = sum(1 for kw in keywords if kw.lower() in resp_lower)
    return round(hits / len(keywords), 2)


# ---------------------------------------------------------------------------
# REPORT
# ---------------------------------------------------------------------------

def print_report(results):
    latencies = [r["latency"]     for r in results if r["error"] is None]
    first_tok = [r["first_token"] for r in results if r["first_token"] is not None]
    errors    = [r for r in results if r["error"]]
    empty     = [r for r in results if not r["error"] and r["length"] == 0]

    if HAS_RICH:
        _rich_report(results, latencies, first_tok, errors, empty)
    else:
        _plain_report(results, latencies, first_tok, errors, empty)


def _rich_report(results, latencies, first_tok, errors, empty):
    console = Console()
    console.print("\n[bold violet]qqq Lumira Chat Performance Report qqq[/]\n")

    table = Table(box=box.ROUNDED, show_lines=True, header_style="bold violet")
    table.add_column("#",         width=3,  justify="right")
    table.add_column("Query",     width=38)
    table.add_column("Latency",   width=8,  justify="right")
    table.add_column("1st-tok",   width=7,  justify="right")
    table.add_column("Chars",     width=6,  justify="right")
    table.add_column("Relevance", width=9,  justify="center")
    table.add_column("Status",    width=12)

    for i, r in enumerate(results, 1):
        q_short = r["query"][:36] + ("..." if len(r["query"]) > 36 else "")
        lat_str = f"{r['latency']:.2f}s"
        ft_str  = f"{r['first_token']:.2f}s" if r["first_token"] else "--"
        ch_str  = str(r["length"]) if not r["error"] else "--"

        kws = QUERIES[i - 1][1]
        rel = relevance_score(r["response"], kws)
        rel_str = f"{rel:.0%}" if rel is not None else "N/A"
        rel_style = (
            "green" if rel is not None and rel >= 0.5 else
            "yellow" if rel is not None else "dim"
        )

        if r["error"]:
            status = Text(f"ERR: {r['error'][:25]}", style="red")
            lat_str = "--"
        elif r["length"] == 0:
            status = Text("EMPTY", style="yellow")
        else:
            status = Text("OK", style="green")

        table.add_row(
            str(i), q_short, lat_str, ft_str, ch_str,
            Text(rel_str, style=rel_style), status
        )

    console.print(table)

    console.print("\n[bold]Aggregate Stats[/]")
    stats = [
        ("Total queries",       len(results)),
        ("Successful",          len(latencies)),
        ("Errors",              len(errors)),
        ("Empty responses",     len(empty)),
        ("Avg latency",         f"{mean(latencies):.2f}s"   if latencies else "N/A"),
        ("Median latency",      f"{median(latencies):.2f}s" if latencies else "N/A"),
        ("Std-dev latency",     f"{stdev(latencies):.2f}s"  if len(latencies) > 1 else "N/A"),
        ("Min / Max latency",   f"{min(latencies):.2f}s / {max(latencies):.2f}s" if latencies else "N/A"),
        ("Avg first-token",     f"{mean(first_tok):.2f}s"   if first_tok else "N/A"),
    ]
    for k, v in stats:
        console.print(f"  [dim]{k:<22}[/]  [bold white]{v}[/]")
    console.print()


def _plain_report(results, latencies, first_tok, errors, empty):
    print("\n=== Lumira Chat Performance Report ===\n")
    for i, r in enumerate(results, 1):
        kws = QUERIES[i - 1][1]
        rel = relevance_score(r["response"], kws)
        rel_str = f"{rel:.0%}" if rel is not None else "N/A"
        status = f"ERROR: {r['error']}" if r["error"] else ("EMPTY" if r["length"] == 0 else "OK")
        ft = f"{r['first_token']:.2f}s" if r["first_token"] else "--"
        print(f"[{i:2}] {r['query'][:40]:<40}  lat={r['latency']:.2f}s  "
              f"1st={ft}  chars={r['length']}  rel={rel_str}  {status}")

    print("\n--- Aggregate ---")
    if latencies:
        print(f"  Avg latency   : {mean(latencies):.2f}s")
        print(f"  Median        : {median(latencies):.2f}s")
        print(f"  Min / Max     : {min(latencies):.2f}s / {max(latencies):.2f}s")
    print(f"  Errors        : {len(errors)}/{len(results)}")
    print(f"  Empty responses: {len(empty)}/{len(results)}")
    if first_tok:
        print(f"  Avg first-token: {mean(first_tok):.2f}s")


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Lumira Chat Performance Tester")
    parser.add_argument("--url",    default="http://localhost:8000",
                        help="Backend base URL (default: http://localhost:8000)")
    parser.add_argument("--file",   default=None,
                        help="Active dataset filename e.g. InfoBotDataset.pdf")
    parser.add_argument("--output", default=None,
                        help="Optional JSON output path for raw results")
    args = parser.parse_args()

    print(f"\nLumira Chat Tester  ->  {args.url}  |  dataset={args.file or '(none)'}")
    print(f"Firing {len(QUERIES)} queries...\n")

    results = []
    for i, (query, _kws) in enumerate(QUERIES, 1):
        print(f"  [{i:2}/{len(QUERIES)}] {query[:60]}", end="", flush=True)
        result = run_query(args.url, query, args.file)
        results.append(result)
        tag = f"ERROR: {result['error']}" if result["error"] else f"{result['latency']:.1f}s OK"
        print(f"  -> {tag}")

    print_report(results)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nRaw results saved to: {args.output}")


if __name__ == "__main__":
    main()

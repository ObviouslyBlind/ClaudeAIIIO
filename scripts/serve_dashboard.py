"""Serve the dashboard locally.

Usage:
    python scripts/serve_dashboard.py          # Export data + serve on port 8000
    python scripts/serve_dashboard.py 3000     # Use custom port
    python scripts/serve_dashboard.py --no-export  # Skip data export, just serve

Runs export_dashboard.py first (unless --no-export), then starts a local
HTTP server pointing at dashboard/. Open http://localhost:8000 in a browser.
"""

import http.server
import os
import subprocess
import sys


def main():
    port = 8000
    skip_export = False

    for arg in sys.argv[1:]:
        if arg == "--no-export":
            skip_export = True
        elif arg.isdigit():
            port = int(arg)

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dashboard_dir = os.path.join(project_root, "dashboard")
    export_script = os.path.join(project_root, "scripts", "export_dashboard.py")

    # Export latest data
    if not skip_export:
        print("Exporting latest data to dashboard/data/...")
        subprocess.run([sys.executable, export_script], check=False)
        print()

    # Serve
    print(f"Serving dashboard at http://localhost:{port}")
    print(f"Press Ctrl+C to stop.\n")

    os.chdir(dashboard_dir)
    handler = http.server.SimpleHTTPRequestHandler
    server = http.server.HTTPServer(("127.0.0.1", port), handler)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()

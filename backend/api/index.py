"""
Vercel Python runtime entrypoint.

Vercel auto-detects a FastAPI/ASGI instance named `app` at `api/index.py`
and serves the whole application as a single Vercel Function.

We replicate the same sys.path setup as `run.py` (used for local/Docker
runs) so that bare imports like `from risk_scorer import ...` inside
routers/scan.py and routers/admin.py keep working — those modules live in
`backend/ml/`, which isn't a regular importable package path otherwise.
"""

import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/

for _path in (
    _BACKEND_DIR,
    os.path.join(_BACKEND_DIR, "app"),
    os.path.join(_BACKEND_DIR, "ml"),
):
    if _path not in sys.path:
        sys.path.insert(0, _path)

from main import app  # noqa: E402

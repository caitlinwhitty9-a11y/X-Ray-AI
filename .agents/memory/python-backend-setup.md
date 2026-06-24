---
name: Python backend setup
description: How to install packages and run the Python FastAPI ML backend on this Replit environment
---

**Python binary:** `/home/runner/workspace/.pythonlibs/bin/python3` — standard `python3`/`pip3` are not on PATH.

**pip install:** Requires `--break-system-packages` flag: `python3 -m pip install <pkg> --break-system-packages`

**TensorFlow:** Already installed at `.pythonlibs` (v2.21.0). Do not try to re-install it — it will fail or be a no-op.

**Workflow commands:** Must use absolute paths. `bash python-backend/start.sh` fails because the workflow CWD may differ. Use `bash /home/runner/workspace/python-backend/start.sh` in the artifact.toml service run commands.

**Port 8090:** Used by the Python ML backend. Registered as a service in `artifacts/xray-frontend/.replit-artifact/artifact.toml` at path `/ml-api`.

**Why:** Nix environment doesn't expose standard bin dirs; the `.pythonlibs` tree is the user-writable Python install.

**How to apply:** Any time a new Python package is needed, use `python3 -m pip install <pkg> --break-system-packages`. Any new workflow that runs a Python script must use the full absolute path.

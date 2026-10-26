import sys
from pathlib import Path

# Ensure the backend directory is in sys.path so 'app.*' imports work seamlessly from any working directory
BACKEND_DIR = str(Path(__file__).resolve().parent.parent)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

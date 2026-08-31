import os
import base64
import httpx
from pathlib import Path

TOKEN = "2d1743a3308542c7beb1b61f769c124a9b08e7a04f09f851"
BASE_URL = "http://192.168.20.15:8888"
REMOTE_ROOT = "razorshield_workspace"

headers = {"Authorization": f"token {TOKEN}"}

def upload_file(local_path: Path, remote_rel_path: str):
    url = f"{BASE_URL}/api/contents/{REMOTE_ROOT}/{remote_rel_path.replace(os.sep, '/')}"
    with open(local_path, "rb") as f:
        content = f.read()
    
    # Try as text if possible, else base64
    try:
        text_content = content.decode("utf-8")
        payload = {
            "type": "file",
            "format": "text",
            "content": text_content
        }
    except UnicodeDecodeError:
        b64_content = base64.b64encode(content).decode("ascii")
        payload = {
            "type": "file",
            "format": "base64",
            "content": b64_content
        }
    
    r = httpx.put(url, headers=headers, json=payload, timeout=60.0)
    print(f"Uploaded {remote_rel_path} -> {r.status_code}")

def create_remote_dir(remote_rel_dir: str):
    url = f"{BASE_URL}/api/contents/{REMOTE_ROOT}/{remote_rel_dir.replace(os.sep, '/')}"
    r = httpx.put(url, headers=headers, json={"type": "directory"}, timeout=15.0)
    return r.status_code

def sync():
    root = Path(".")
    # Create remote folders
    create_remote_dir("backend")
    create_remote_dir("backend/models")
    create_remote_dir("backend/graph")
    create_remote_dir("backend/canary")
    create_remote_dir("backend/agent")
    create_remote_dir("backend/velocity")
    create_remote_dir("backend/copilot")
    create_remote_dir("backend/decision")
    create_remote_dir("backend/antichecker")
    create_remote_dir("backend/recovery")
    create_remote_dir("backend/governance")
    create_remote_dir("backend/benchmarks")
    create_remote_dir("backend/dataset")
    create_remote_dir("data")
    create_remote_dir("data/external")
    create_remote_dir("docs")
    create_remote_dir("tests")

    # Upload backend files and model pickles
    for p in root.glob("backend/**/*.py"):

        rel = p.relative_to(root)
        upload_file(p, str(rel))

    for p in root.glob("backend/models/*.pkl"):
        rel = p.relative_to(root)
        upload_file(p, str(rel))

    for p in root.glob("tests/**/*.py"):
        rel = p.relative_to(root)
        upload_file(p, str(rel))

    # Upload requirements
    if (root / "requirements.txt").exists():

        upload_file(root / "requirements.txt", "requirements.txt")

    print("\nSyncing code complete!")

if __name__ == "__main__":
    sync()

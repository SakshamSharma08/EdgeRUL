import urllib.request
import os

BASE_URL = "https://raw.githubusercontent.com/hankroark/Turbofan-Engine-Degradation/master/CMAPSSData/"
FILES = [
    "train_FD001.txt",
    "test_FD001.txt",
    "RUL_FD001.txt",
    "train_FD002.txt",
    "test_FD002.txt",
    "RUL_FD002.txt"
]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "raw")
os.makedirs(OUTPUT_DIR, exist_ok=True)

for fname in FILES:
    dest = os.path.join(OUTPUT_DIR, fname)
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print(f"Skipping {fname}, already exists ({os.path.getsize(dest)} bytes)")
        continue
    url = BASE_URL + fname
    print(f"Downloading {fname} from {url}...")
    try:
        urllib.request.urlretrieve(url, dest)
        print(f"Saved {fname} ({os.path.getsize(dest)} bytes)")
    except Exception as e:
        print(f"Failed to download {fname}: {e}")

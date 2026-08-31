import time
import shutil
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

output_dir = Path("docs/screenshots")
output_dir.mkdir(parents=True, exist_ok=True)

artifact_dir = Path(r"C:\Users\Owais\.gemini\antigravity\brain\e2214e11-4d1b-479e-93db-5b82e26d35b4")
artifact_dir.mkdir(parents=True, exist_ok=True)

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument("--hide-scrollbars")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

driver = webdriver.Chrome(options=chrome_options)
driver.set_window_size(1920, 1080)

base_url = "http://localhost:5173"

TABS_CONFIG = [
    ("Live SOC", "01_soc_command_center.png", "Live SOC Gateway & Real-Time Telemetry Stream"),
    ("Threat Simulator", "02_threat_simulator_lab.png", "Threat Simulator & Multi-Vector Attack Launchpad"),
    ("Active Defense", "03_active_defense_waf.png", "Active Defense, WAF Rules & Canary Token Traps"),
    ("Disputes", "04_disputes_and_evidence.png", "Autonomous Dispute Dossier & Chargeback Defense"),
    ("Governance", "05_model_governance_studio.png", "Model Governance Studio & 12-Month Drift Tracker"),
    ("Specs", "06_architecture_and_rbi_specs.png", "Full Architecture Deep Dive & RBI Compliance Specs"),
    ("Merchant Store", "07_live_merchant_store.png", "Merchant Store Sandbox with Multi-Modal Biometrics"),
]

try:
    print(f"Loading {base_url}...")
    driver.get(base_url)
    time.sleep(3.5)

    for search_term, filename, description in TABS_CONFIG:
        print(f"\nNavigating to '{search_term}'...")
        buttons = driver.find_elements(By.TAG_NAME, "button")
        clicked = False
        for b in buttons:
            txt = b.text.strip()
            if search_term.lower() in txt.lower():
                driver.execute_script("arguments[0].scrollIntoView(); arguments[0].click();", b)
                clicked = True
                print(f"  [Clicked button: '{txt}']")
                break

        if not clicked:
            print(f"  [WARNING: Could not find button for '{search_term}']")

        time.sleep(3.0)  # Wait for tab render & charts to settle
        dest_path = output_dir / filename
        driver.save_screenshot(str(dest_path))
        print(f"  [OK] Saved {filename} ({dest_path.stat().st_size / 1024:.1f} KB)")

        # Copy to artifact directory for UI display
        art_dest = artifact_dir / filename
        shutil.copy2(dest_path, art_dest)
        print(f"  [OK] Copied to artifact directory: {art_dest.name}")

    print("\n" + "=" * 60)
    print("ALL 7 UI TABS CAPTURED SUCCESSFULLY")
    print("=" * 60)

finally:
    driver.quit()

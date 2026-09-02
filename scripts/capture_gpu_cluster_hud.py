import time
import shutil
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

artifact_dir = Path("C:/Users/Owais/.gemini/antigravity/brain/e2214e11-4d1b-479e-93db-5b82e26d35b4")
docs_dir = Path("docs/screenshots")
docs_dir.mkdir(parents=True, exist_ok=True)

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument("--hide-scrollbars")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.binary_location = "C:/Program Files/Google/Chrome/Application/chrome.exe"

driver = webdriver.Chrome(options=chrome_options)
driver.set_window_size(1920, 1080)

base_url = "http://localhost:5173"

try:
    print(f"Loading {base_url}...")
    driver.get(base_url)
    time.sleep(3.5)

    # 1. Dark Mode Dashboard with GPU Badge
    p1 = artifact_dir / "v5_dark_dashboard_gpu_badge.png"
    driver.save_screenshot(str(p1))
    shutil.copy(str(p1), str(docs_dir / "v5_dark_dashboard_gpu_badge.png"))
    print("Captured v5_dark_dashboard_gpu_badge.png")

    # 2. Open GPU Cluster Modal
    print("Opening GPU Cluster Modal...")
    buttons = driver.find_elements(By.TAG_NAME, "button")
    clicked = False
    for b in buttons:
        if "bd216server3" in b.text or "6x GPU" in b.text:
            driver.execute_script("arguments[0].click();", b)
            clicked = True
            print("Clicked bd216server3 button!")
            break

    if not clicked:
        from selenium.webdriver.common.keys import Keys
        driver.find_element(By.TAG_NAME, "body").send_keys("g")
        print("Sent 'g' hotkey!")

    time.sleep(2.5)

    p2 = artifact_dir / "v5_dark_gpu_cluster_hud.png"
    driver.save_screenshot(str(p2))
    shutil.copy(str(p2), str(docs_dir / "v5_dark_gpu_cluster_hud.png"))
    print("Captured v5_dark_gpu_cluster_hud.png")

    # 3. Switch to Light Mode
    driver.execute_script("document.body.classList.add('light-theme');")
    time.sleep(1.5)

    p3 = artifact_dir / "v5_light_gpu_cluster_hud.png"
    driver.save_screenshot(str(p3))
    shutil.copy(str(p3), str(docs_dir / "v5_light_gpu_cluster_hud.png"))
    print("Captured v5_light_gpu_cluster_hud.png")

finally:
    driver.quit()
    print("Done capturing screenshots.")

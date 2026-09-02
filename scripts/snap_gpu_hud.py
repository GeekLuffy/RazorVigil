import time, shutil
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

artifact_dir = Path("C:/Users/Owais/.gemini/antigravity/brain/e2214e11-4d1b-479e-93db-5b82e26d35b4")

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1920,1080")
opts.binary_location = "C:/Program Files/Google/Chrome/Application/chrome.exe"
driver = webdriver.Chrome(options=opts)
driver.set_window_size(1920, 1080)

try:
    driver.get("http://localhost:5173/#dashboard")
    time.sleep(3.0)

    # 1. Dashboard with GPU cluster button
    p1 = artifact_dir / "v5_dark_dashboard_gpu.png"
    driver.save_screenshot(str(p1))
    print("Saved v5_dark_dashboard_gpu.png")

    # 2. Click bd216server3 button
    buttons = driver.find_elements(By.TAG_NAME, "button")
    for b in buttons:
        if "bd216server3" in b.text or "6x GPU" in b.text:
            b.click()
            print("Clicked bd216server3 button!")
            break
    time.sleep(2.0)

    p2 = artifact_dir / "v5_dark_gpu_modal.png"
    driver.save_screenshot(str(p2))
    print("Saved v5_dark_gpu_modal.png")

    # 3. Light Mode
    driver.execute_script("document.body.classList.add('light-theme');")
    time.sleep(1.0)
    p3 = artifact_dir / "v5_light_gpu_modal.png"
    driver.save_screenshot(str(p3))
    print("Saved v5_light_gpu_modal.png")

finally:
    driver.quit()
    print("Completed snapping screenshots!")

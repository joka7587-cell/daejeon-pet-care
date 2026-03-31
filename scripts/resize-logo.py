"""로고 이미지를 앱 아이콘 규격에 맞게 리사이즈하여 복사"""
from PIL import Image
import shutil

SRC = "/home/ubuntu/upload/IMG_8368.png"
BASE = "/home/ubuntu/daejeon-pet-care/assets/images"

img = Image.open(SRC).convert("RGBA")

# 정사각형으로 크롭 (1024x1024)
w, h = img.size
size = min(w, h)
left = (w - size) // 2
top = (h - size) // 2
img_square = img.crop((left, top, left + size, top + size))

# 앱 아이콘 (1024x1024)
icon = img_square.resize((1024, 1024), Image.LANCZOS)
icon.save(f"{BASE}/icon.png")
print("✅ icon.png (1024x1024)")

# 스플래시 아이콘 (200px 기준이지만 고해상도 유지)
splash = img_square.resize((512, 512), Image.LANCZOS)
splash.save(f"{BASE}/splash-icon.png")
print("✅ splash-icon.png (512x512)")

# 파비콘 (196x196)
favicon = img_square.resize((196, 196), Image.LANCZOS)
favicon.save(f"{BASE}/favicon.png")
print("✅ favicon.png (196x196)")

# Android adaptive icon foreground (1024x1024)
android_fg = img_square.resize((1024, 1024), Image.LANCZOS)
android_fg.save(f"{BASE}/android-icon-foreground.png")
print("✅ android-icon-foreground.png (1024x1024)")

# 상단 바용 로고 (작은 크기, 헤더에서 사용)
header_logo = img_square.resize((120, 120), Image.LANCZOS)
header_logo.save(f"{BASE}/header-logo.png")
print("✅ header-logo.png (120x120)")

print("\n모든 아이콘 파일 생성 완료!")

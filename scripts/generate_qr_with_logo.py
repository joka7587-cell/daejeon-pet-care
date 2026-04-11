#!/usr/bin/env python3
"""
QR 코드 중앙에 로고를 삽입하는 스크립트
"""

import sys
from PIL import Image
import qrcode

def add_logo_to_qr(qr_path, logo_path, output_path, logo_size_ratio=0.25):
    """
    QR 코드에 로고를 중앙에 삽입
    
    Args:
        qr_path: QR 코드 이미지 경로
        logo_path: 로고 이미지 경로
        output_path: 출력 이미지 경로
        logo_size_ratio: 로고 크기 비율 (QR 코드 대비)
    """
    # QR 코드 이미지 열기
    qr_img = Image.open(qr_path).convert('RGBA')
    qr_width, qr_height = qr_img.size
    
    # 로고 이미지 열기
    logo_img = Image.open(logo_path).convert('RGBA')
    
    # 로고 크기 조정
    logo_size = int(qr_width * logo_size_ratio)
    logo_img = logo_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # 로고 주변에 흰색 배경 추가 (QR 코드 인식 개선)
    bg_size = int(logo_size * 1.2)
    bg_img = Image.new('RGBA', (bg_size, bg_size), (255, 255, 255, 255))
    bg_offset = (bg_size - logo_size) // 2
    bg_img.paste(logo_img, (bg_offset, bg_offset), logo_img)
    
    # 로고를 QR 코드 중앙에 배치
    logo_x = (qr_width - bg_size) // 2
    logo_y = (qr_height - bg_size) // 2
    
    # QR 코드와 로고 합치기
    qr_img.paste(bg_img, (logo_x, logo_y), bg_img)
    
    # 결과 저장
    qr_img.convert('RGB').save(output_path, quality=95)
    print(f"✅ QR code with logo saved to {output_path}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 generate_qr_with_logo.py <qr_path> <logo_path> [output_path]")
        sys.exit(1)
    
    qr_path = sys.argv[1]
    logo_path = sys.argv[2]
    output_path = sys.argv[3] if len(sys.argv) > 3 else 'expo-qr-code-with-logo.png'
    
    add_logo_to_qr(qr_path, logo_path, output_path)

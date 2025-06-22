#!/usr/bin/env node

/**
 * Open Graph 이미지 생성 스크립트
 * HTML Canvas API를 사용하여 프로그래매틱하게 OG 이미지 생성
 */

const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function createOGImage(width, height, filename) {
  // 캔버스 생성
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 그라디언트 배경
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 패턴 오버레이
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  const patternSize = 60;
  for (let x = 0; x < width; x += patternSize) {
    for (let y = 0; y < height; y += patternSize) {
      if ((x / patternSize + y / patternSize) % 2 === 0) {
        ctx.fillRect(x, y, patternSize / 2, patternSize / 2);
      }
    }
  }

  // 텍스트 설정
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerX = width / 2;
  const centerY = height / 2;

  if (width >= 1200) {
    // 큰 이미지용
    // 타이틀
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.fillText('툴허브', centerX, centerY - 80);

    // 서브타이틀
    ctx.font = '32px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('연봉, 대출, 시간변환부터', centerX, centerY - 10);
    ctx.fillText('바코드 생성, JSON 포맷터까지', centerX, centerY + 30);

    // 도구 태그들
    const tools = ['💰 연봉계산기', '🏦 대출계산기', '⏰ 시간변환기', '📊 바코드생성기'];
    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    const tagY = centerY + 100;
    const totalWidth = tools.length * 150;
    const startX = centerX - totalWidth / 2;
    
    tools.forEach((tool, index) => {
      const x = startX + index * 150;
      // 태그 배경
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x - 60, tagY - 15, 120, 30);
      // 태그 텍스트
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tool, x, tagY);
    });
  } else {
    // 작은 이미지용
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText('툴허브', centerX, centerY - 40);

    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('모든 계산을 한 곳에서', centerX, centerY + 20);
  }

  // 이미지 저장
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`public/${filename}`, buffer);
  console.log(`✅ ${filename} 생성 완료 (${width}x${height})`);
}

async function main() {
  try {
    console.log('🎨 Open Graph 이미지 생성 중...');
    
    // 큰 이미지 (Facebook, Twitter 등)
    await createOGImage(1200, 630, 'og-image-1200x630.png');
    
    // 작은 이미지 (일부 플랫폼용)
    await createOGImage(600, 315, 'og-image-600x315.png');
    
    console.log('🎉 Open Graph 이미지 생성 완료!');
    console.log('📝 이제 다음 도구들로 테스트해보세요:');
    console.log('   - Facebook: https://developers.facebook.com/tools/debug/');
    console.log('   - Twitter: https://cards-dev.twitter.com/validator');
    console.log('   - OpenGraph: https://opengraph.xyz/');
    
  } catch (error) {
    console.error('❌ 이미지 생성 실패:', error.message);
    console.log('💡 canvas 라이브러리가 필요합니다: npm install canvas');
  }
}

main();
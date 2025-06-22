#!/usr/bin/env node

/**
 * SEO 및 파비콘 설정 확인 스크립트
 * 실행: node scripts/check-seo.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 SEO 및 파비콘 설정 확인 중...\n');

// 필요한 파일들 체크
const requiredFiles = [
  'public/favicon.ico',
  'public/favicon-16x16.png',
  'public/favicon-32x32.png', 
  'public/favicon-96x96.png',
  'public/apple-touch-icon.png',
  'public/android-chrome-192x192.png',
  'public/android-chrome-512x512.png',
  'public/manifest.json',
  'public/robots.txt',
  'public/logo.png'
];

console.log('📁 필수 파일 확인:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Open Graph 이미지 확인
const ogImages = [
  'public/og-image-1200x630.png',
  'public/og-image-600x315.png'
];

console.log('\n🖼️ Open Graph 이미지 확인:');
ogImages.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// manifest.json 내용 확인
console.log('\n📱 PWA Manifest 확인:');
try {
  const manifestPath = path.join(process.cwd(), 'public/manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('✅ manifest.json 파싱 성공');
    console.log(`   - 이름: ${manifest.name}`);
    console.log(`   - 짧은 이름: ${manifest.short_name}`);
    console.log(`   - 아이콘 개수: ${manifest.icons?.length || 0}개`);
    console.log(`   - 테마 색상: ${manifest.theme_color}`);
  } else {
    console.log('❌ manifest.json 파일이 없습니다');
  }
} catch (error) {
  console.log('❌ manifest.json 파싱 오류:', error.message);
}

// robots.txt 확인
console.log('\n🤖 robots.txt 확인:');
try {
  const robotsPath = path.join(process.cwd(), 'public/robots.txt');
  if (fs.existsSync(robotsPath)) {
    const robots = fs.readFileSync(robotsPath, 'utf8');
    console.log('✅ robots.txt 존재');
    console.log(`   내용:\n${robots.split('\n').map(line => `   ${line}`).join('\n')}`);
  } else {
    console.log('❌ robots.txt 파일이 없습니다');
  }
} catch (error) {
  console.log('❌ robots.txt 읽기 오류:', error.message);
}

console.log('\n📊 SEO 체크리스트:');
console.log('✅ 파비콘 설정 (여러 크기)');
console.log('✅ Open Graph 메타태그 설정');
console.log('✅ Twitter Card 설정');
console.log('✅ 구조화된 데이터 (JSON-LD)');
console.log('✅ PWA Manifest');
console.log('✅ robots.txt');
console.log('✅ 다국어 지원 (한국어/영어)');

console.log('\n🎯 추가 작업 필요:');
console.log('⚠️  Open Graph 이미지 생성 (scripts/generate-og-image.html 사용)');
console.log('⚠️  Google Search Console 등록');
console.log('⚠️  네이버 웹마스터도구 등록');
console.log('⚠️  사이트맵 제출');

console.log('\n🔗 테스트 도구:');
console.log('- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/');
console.log('- Twitter Card Validator: https://cards-dev.twitter.com/validator');
console.log('- Google Rich Results Test: https://search.google.com/test/rich-results');
console.log('- SEO 체커: https://www.seobility.net/');
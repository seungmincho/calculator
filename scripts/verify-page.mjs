/**
 * Playwright 페이지 검증 스크립트
 *
 * 사용법:
 *   node scripts/verify-page.mjs /ladder-game/?tool=coin
 *   node scripts/verify-page.mjs /ladder-game/?tool=coin --click "button:has-text('동전 던지기')"
 *   node scripts/verify-page.mjs /ladder-game/?tool=coin --mobile
 *   node scripts/verify-page.mjs /ladder-game/?tool=coin --dark
 *   node scripts/verify-page.mjs /salary-calculator --check-i18n
 *   node scripts/verify-page.mjs --all-pages --check-i18n  (모든 페이지 i18n 검증)
 *
 * 옵션:
 *   --click "selector"     요소 클릭
 *   --type "selector" "text"  입력란에 텍스트 입력
 *   --wait 2000            밀리초 대기
 *   --mobile               모바일 뷰포트 (375x667)
 *   --dark                 다크모드
 *   --check-i18n           MISSING_MESSAGE 텍스트 감지
 *   --screenshot name      스크린샷 파일명 (기본: verify-result)
 *   --all-pages            menuConfig의 모든 페이지 검증
 *   --port 3040            dev 서버 포트 (기본: 3040)
 *   --no-screenshot        스크린샷 생략
 */

import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);

function getArg(flag, defaultVal) {
  const idx = args.indexOf(flag);
  if (idx === -1) return defaultVal;
  return args[idx + 1] || defaultVal;
}
function hasFlag(flag) {
  return args.includes(flag);
}

const port = getArg('--port', '3040');
const baseUrl = `http://localhost:${port}`;
const isMobile = hasFlag('--mobile');
const isDark = hasFlag('--dark');
const checkI18n = hasFlag('--check-i18n');
const allPages = hasFlag('--all-pages');
const noScreenshot = hasFlag('--no-screenshot');
const screenshotName = getArg('--screenshot', 'verify-result');
const pagePath = args.find(a => a.startsWith('/')) || '/';

// 클릭/입력 액션 파싱
const actions = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--click') actions.push({ type: 'click', selector: args[++i] });
  else if (args[i] === '--type') { const sel = args[++i]; actions.push({ type: 'type', selector: sel, text: args[++i] }); }
  else if (args[i] === '--wait') actions.push({ type: 'wait', ms: parseInt(args[++i]) });
}

async function getAllPages() {
  // menuConfig에서 href 추출
  const menuConfigPath = resolve('src/config/menuConfig.ts');
  if (!existsSync(menuConfigPath)) {
    console.error('menuConfig.ts not found');
    return ['/'];
  }
  const content = readFileSync(menuConfigPath, 'utf-8');
  const hrefs = [...content.matchAll(/href:\s*'([^']+)'/g)].map(m => m[1]);
  return [...new Set(hrefs)];
}

async function verifyPage(page, url, label) {
  const consoleErrors = [];
  const i18nMissing = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response?.status() || 'N/A';

    // 페이지 로드 후 잠시 대기 (i18n 로딩)
    await page.waitForTimeout(2000);

    // i18n 누락 체크
    if (checkI18n) {
      const bodyText = await page.textContent('body');
      const missingMatches = bodyText.match(/MISSING_MESSAGE/g);
      if (missingMatches) {
        // 어떤 요소에 MISSING_MESSAGE가 있는지 찾기
        const elements = await page.$$eval('*', els =>
          els
            .filter(el => el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.includes('MISSING_MESSAGE')))
            .map(el => ({
              tag: el.tagName.toLowerCase(),
              text: el.textContent.trim().substring(0, 100),
              className: el.className?.toString().substring(0, 50) || '',
            }))
        );
        i18nMissing.push(...elements);
      }
    }

    // 액션 실행
    for (const action of actions) {
      if (action.type === 'click') {
        console.log(`  🖱 Clicking: ${action.selector}`);
        await page.click(action.selector, { timeout: 5000 }).catch(e => console.log(`  ⚠ Click failed: ${e.message}`));
        await page.waitForTimeout(500);
      } else if (action.type === 'type') {
        console.log(`  ⌨ Typing in ${action.selector}: "${action.text}"`);
        await page.fill(action.selector, action.text, { timeout: 5000 }).catch(e => console.log(`  ⚠ Type failed: ${e.message}`));
      } else if (action.type === 'wait') {
        console.log(`  ⏳ Waiting ${action.ms}ms`);
        await page.waitForTimeout(action.ms);
      }
    }

    // 스크린샷
    let screenshotPath = null;
    if (!noScreenshot && !allPages) {
      screenshotPath = `/tmp/${screenshotName}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    // 결과 출력
    const result = { url, status, label };

    if (status !== 200) {
      console.log(`  ❌ HTTP ${status}`);
      result.error = `HTTP ${status}`;
    } else {
      console.log(`  ✅ HTTP 200`);
    }

    if (consoleErrors.length > 0) {
      console.log(`  ⚠ Console errors (${consoleErrors.length}):`);
      consoleErrors.slice(0, 3).forEach(e => console.log(`    - ${e.substring(0, 120)}`));
      result.consoleErrors = consoleErrors.length;
    }

    if (i18nMissing.length > 0) {
      console.log(`  🌐 MISSING i18n keys (${i18nMissing.length}):`);
      i18nMissing.forEach(el => console.log(`    - <${el.tag}> "${el.text.substring(0, 80)}"`));
      result.i18nMissing = i18nMissing;
    }

    if (screenshotPath) {
      console.log(`  📸 Screenshot: ${screenshotPath}`);
      result.screenshot = screenshotPath;
    }

    return result;
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    return { url, error: e.message, label };
  }
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: isMobile ? { width: 375, height: 667 } : { width: 1280, height: 720 },
    colorScheme: isDark ? 'dark' : 'light',
    ...(isMobile ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await context.newPage();

  console.log(`\n🔍 Playwright Page Verifier`);
  console.log(`   Mode: ${isMobile ? 'Mobile' : 'Desktop'} | ${isDark ? 'Dark' : 'Light'} | i18n check: ${checkI18n ? 'ON' : 'OFF'}`);
  console.log('');

  if (allPages) {
    const pages = await getAllPages();
    console.log(`📋 Checking ${pages.length} pages...\n`);

    const results = { ok: 0, errors: 0, i18nIssues: [] };
    for (const p of pages) {
      const url = `${baseUrl}${p}`;
      console.log(`→ ${p}`);
      const result = await verifyPage(page, url, p);
      if (result.error) results.errors++;
      else results.ok++;
      if (result.i18nMissing?.length) results.i18nIssues.push({ page: p, count: result.i18nMissing.length, details: result.i18nMissing });
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ OK: ${results.ok} | ❌ Errors: ${results.errors}`);
    if (results.i18nIssues.length) {
      console.log(`\n🌐 Pages with MISSING i18n keys:`);
      results.i18nIssues.forEach(issue => {
        console.log(`  ${issue.page} (${issue.count} missing)`);
        issue.details.forEach(d => console.log(`    - <${d.tag}> "${d.text.substring(0, 60)}"`));
      });
    }
  } else {
    const url = `${baseUrl}${pagePath}`;
    console.log(`→ ${pagePath}`);
    await verifyPage(page, url, pagePath);
  }

  await browser.close();
  console.log('\n✨ Done\n');
}

main().catch(e => { console.error(e); process.exit(1); });

const fs = require('fs');

// menuConfig가 단일 출처 (Node 24 타입 스트리핑으로 .ts 직접 로드)
const { menuConfig, categoryKeys } = require('../src/config/menuConfig.ts');
const menuItems = [...new Map(categoryKeys.flatMap(k => menuConfig[k].items).map(i => [i.href, i])).values()];

// Algorithm sub-page hrefs
const algorithmHrefs = [
  '/algorithm/a-star',
  '/algorithm/aabb',
  '/algorithm/avl-tree',
  '/algorithm/b-tree',
  '/algorithm/bellman-ford',
  '/algorithm/bfs-dfs',
  '/algorithm/binary-search',
  '/algorithm/bloom-filter',
  '/algorithm/bst',
  '/algorithm/bubble-sort',
  '/algorithm/coin-change',
  '/algorithm/convex-hull',
  '/algorithm/counting-sort',
  '/algorithm/dijkstra',
  '/algorithm/edit-distance',
  '/algorithm/euler-path',
  '/algorithm/fenwick-tree',
  '/algorithm/fibonacci-dp',
  '/algorithm/flood-fill',
  '/algorithm/floyd-warshall',
  '/algorithm/graph-repr',
  '/algorithm/hash-table',
  '/algorithm/heap',
  '/algorithm/heap-sort',
  '/algorithm/huffman-coding',
  '/algorithm/insertion-sort',
  '/algorithm/knapsack',
  '/algorithm/kmp',
  '/algorithm/kruskal',
  '/algorithm/lcs',
  '/algorithm/linked-list',
  '/algorithm/lis',
  '/algorithm/merge-sort',
  '/algorithm/minimax',
  '/algorithm/n-queens',
  '/algorithm/pathfinding-compare',
  '/algorithm/prim',
  '/algorithm/quadtree',
  '/algorithm/quick-sort',
  '/algorithm/rabin-karp',
  '/algorithm/radix-sort',
  '/algorithm/raycasting',
  '/algorithm/red-black-tree',
  '/algorithm/sat',
  '/algorithm/segment-tree',
  '/algorithm/selection-sort',
  '/algorithm/shell-sort',
  '/algorithm/sliding-window',
  '/algorithm/stack-queue',
  '/algorithm/suffix-array',
  '/algorithm/tarjan-scc',
  '/algorithm/topological-sort',
  '/algorithm/trie',
  '/algorithm/union-find',
  '/algorithm/voronoi',
];

// CS Visualizer individual page hrefs
const csVisualizerHrefs = [
  '/cpu-scheduling',
  '/decision-tree',
  '/dns-lookup',
  '/git-visualizer',
  '/gradient-descent',
  '/kmeans-clustering',
  '/memory-management',
  '/neural-network',
  '/regex-engine',
  '/tcp-handshake',
];

// Static routes not in menuConfig
const staticRoutes = ['/offline', '/tips', '/calculators', '/tools', '/media', '/health',
  ...[2400, 2600, 2800, 3000, 3200, 3500, 3800, 4000, 4500, 5000, 5500, 6000, 7000, 8000, 10000].map(b => '/salary-table/' + b)];

// --- Build complete sorted unique set for _redirects ---
const allHrefSet = new Set();
menuItems.forEach(m => allHrefSet.add(m.href));
algorithmHrefs.forEach(h => allHrefSet.add(h));
csVisualizerHrefs.forEach(h => allHrefSet.add(h));
staticRoutes.forEach(h => allHrefSet.add(h));

const allSorted = [...allHrefSet].sort();

// Generate _redirects
// 통합·이전된 도구: 옛 URL → 새 URL (쿼리스트링은 Cloudflare가 그대로 넘김)
const movedRoutes = { '/severance-pay': '/retirement-calculator/' };
const redirectLines = [
  ...Object.entries(movedRoutes).flatMap(([from, to]) => [from + '  ' + to + '  301', from + '/  ' + to + '  301']),
  ...allSorted.map(h => h + '  ' + h + '/  301'),
];
fs.writeFileSync('C:/projects/salary-calculator/public/_redirects', redirectLines.join('\n') + '\n');
console.log('_redirects: ' + allSorted.length + ' rules written');

// --- Generate rss.xml ---
const ko = JSON.parse(fs.readFileSync('C:/projects/salary-calculator/messages/ko.json', 'utf8'));
const footerLinks = ko.footer.links;

function getTitle(labelKey) {
  const key = labelKey.replace('footer.links.', '');
  return footerLinks[key] || key;
}

// RSS items: menuConfig 도구, 최근 추가·개선순 (updatedDate → addedDate)
const lookup = key => key.split('.').reduce((o, k) => (o == null ? o : o[k]), ko);
const itemDate = m => m.updatedDate || m.addedDate || '2026-09-16';
const menuSorted = [...menuItems].sort((a, b) => itemDate(b).localeCompare(itemDate(a)) || a.href.localeCompare(b.href));
const rssItems = menuSorted.map(m => {
  const title = getTitle(m.labelKey);
  const url = 'https://toolhub.ai.kr' + m.href + '/';
  const desc = lookup(m.descriptionKey) || '';
  return '  <item>\n    <title><![CDATA[' + title + ']]></title>\n    <link>' + url + '</link>\n    <guid>' + url + '</guid>\n' +
    '    <description><![CDATA[' + desc + ']]></description>\n    <pubDate>' + new Date(itemDate(m) + 'T00:00:00+09:00').toUTCString() + '</pubDate>\n  </item>';
});

const rfcDate = new Date().toUTCString();

const rssXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
  '  <channel>\n' +
  '    <title>툴허브 - 무료 온라인 도구 모음</title>\n' +
  '    <link>https://toolhub.ai.kr</link>\n' +
  '    <description>급여 계산기, 개발 도구, 게임 등 250+ 무료 온라인 도구</description>\n' +
  '    <language>ko</language>\n' +
  '    <lastBuildDate>' + rfcDate + '</lastBuildDate>\n' +
  '    <atom:link href="https://toolhub.ai.kr/rss.xml" rel="self" type="application/rss+xml"/>\n' +
  rssItems.join('\n') + '\n' +
  '  </channel>\n' +
  '</rss>';

fs.writeFileSync('C:/projects/salary-calculator/public/rss.xml', rssXml);
console.log('rss.xml: ' + rssItems.length + ' items written');
console.log('Total unique hrefs in _redirects: ' + allSorted.length);

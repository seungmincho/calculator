// 내 IP 확인 헬퍼 회귀 체크: node scripts/check-ip-info.ts
import assert from 'node:assert/strict'
import { ipVersion, fullIPv6, classifyIp, parseUA, tzOffsetMinutes, tzMismatch, formatOffset, parseCandidate, buildReport } from '../src/utils/ipInfo.ts'

// 버전 판별
assert.equal(ipVersion('1.2.3.4'), 4)
assert.equal(ipVersion(' 255.255.255.255 '), 4)
assert.equal(ipVersion('256.1.1.1'), null)
assert.equal(ipVersion('01.2.3.4'), null)
assert.equal(ipVersion('1.2.3'), null)
assert.equal(ipVersion('2001:db8::1'), 6)
assert.equal(ipVersion('::'), 6)
assert.equal(ipVersion('::1'), 6)
assert.equal(ipVersion('[2001:db8::1]'), 6)
assert.equal(ipVersion('fe80::1%eth0'), 6)
assert.equal(ipVersion('::ffff:192.168.0.1'), 6)
assert.equal(ipVersion('1:2:3:4:5:6:7:8'), 6)
assert.equal(ipVersion('1:2:3:4:5:6:7:8:9'), null)
assert.equal(ipVersion('1::2::3'), null)
assert.equal(ipVersion('1:2:3:4:5:6:7::8'), null) // :: 가 0그룹을 대신할 수 없음
assert.equal(ipVersion('12345::'), null)
assert.equal(ipVersion('hello'), null)
assert.equal(ipVersion(''), null)

assert.equal(fullIPv6('2001:db8::1'), '2001:0db8:0000:0000:0000:0000:0000:0001')
assert.equal(fullIPv6('::ffff:1.2.3.4'), '0000:0000:0000:0000:0000:ffff:0102:0304')
assert.equal(fullIPv6('1.2.3.4'), null)

// 분류
assert.equal(classifyIp('8.8.8.8'), 'public')
assert.equal(classifyIp('10.0.0.1'), 'private')
assert.equal(classifyIp('172.16.0.1'), 'private')
assert.equal(classifyIp('172.32.0.1'), 'public')
assert.equal(classifyIp('192.168.1.1'), 'private')
assert.equal(classifyIp('127.0.0.1'), 'loopback')
assert.equal(classifyIp('169.254.1.1'), 'linkLocal')
assert.equal(classifyIp('100.64.0.1'), 'cgnat')
assert.equal(classifyIp('100.128.0.1'), 'public')
assert.equal(classifyIp('224.0.0.1'), 'multicast')
assert.equal(classifyIp('0.0.0.0'), 'reserved')
assert.equal(classifyIp('::1'), 'loopback')
assert.equal(classifyIp('::'), 'reserved')
assert.equal(classifyIp('fe80::1'), 'linkLocal')
assert.equal(classifyIp('fd00::1'), 'uniqueLocal')
assert.equal(classifyIp('ff02::1'), 'multicast')
assert.equal(classifyIp('2001:db8::1'), 'reserved')
assert.equal(classifyIp('2404:6800:4004::200e'), 'public')
assert.equal(classifyIp('::ffff:192.168.0.1'), 'private')
assert.equal(classifyIp('x'), null)

// UA
const chromeWin = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
assert.deepEqual(parseUA(chromeWin), { browser: 'Chrome', browserVersion: '129', os: 'Windows', osVersion: '10/11', device: 'desktop' })
const edge = chromeWin + ' Edg/129.0.2792.65'
assert.equal(parseUA(edge).browser, 'Edge')
const whale = chromeWin.replace('Safari/537.36', 'Whale/3.28.266.14 Safari/537.36')
assert.equal(parseUA(whale).browser, 'Whale')
const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
assert.deepEqual(parseUA(iphone), { browser: 'Safari', browserVersion: '17', os: 'iOS', osVersion: '17.5', device: 'mobile' })
const samsung = 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36'
assert.deepEqual(parseUA(samsung), { browser: 'Samsung Internet', browserVersion: '25', os: 'Android', osVersion: '14', device: 'mobile' })
const tab = 'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
assert.equal(parseUA(tab).device, 'tablet')
const ff = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0'
assert.deepEqual(parseUA(ff), { browser: 'Firefox', browserVersion: '130', os: 'macOS', osVersion: '10.15', device: 'desktop' })
const kakao = iphone + ' KAKAOTALK 10.8.5'
assert.equal(parseUA(kakao).browser, 'KakaoTalk')
assert.equal(parseUA('').browser, 'Unknown')

// 시간대
const jan = new Date('2026-01-15T00:00:00Z')
const jul = new Date('2026-07-15T00:00:00Z')
assert.equal(tzOffsetMinutes('Asia/Seoul', jan), 540)
assert.equal(tzOffsetMinutes('UTC', jan), 0)
assert.equal(tzOffsetMinutes('America/New_York', jan), -300)
assert.equal(tzOffsetMinutes('America/New_York', jul), -240)
assert.equal(tzOffsetMinutes('Asia/Kolkata', jan), 330)
assert.equal(tzOffsetMinutes('Not/AZone', jan), null)
assert.equal(tzMismatch('Asia/Seoul', 'Asia/Tokyo', jan), false)
assert.equal(tzMismatch('Asia/Seoul', 'America/New_York', jan), true)
assert.equal(tzMismatch('Asia/Seoul', '', jan), false)
assert.equal(formatOffset(540), 'UTC+09:00')
assert.equal(formatOffset(-210), 'UTC-03:30')
assert.equal(formatOffset(0), 'UTC+00:00')

// ICE candidate
assert.deepEqual(parseCandidate('candidate:842163049 1 udp 1677729535 203.0.113.7 51234 typ srflx raddr 0.0.0.0 rport 0 generation 0'), { address: '203.0.113.7', type: 'srflx', mdns: false })
assert.deepEqual(parseCandidate('candidate:1 1 udp 2122260223 3f1c2d4e-aaaa-bbbb-cccc-1234567890ab.local 54321 typ host generation 0'), { address: '3f1c2d4e-aaaa-bbbb-cccc-1234567890ab.local', type: 'host', mdns: true })
assert.equal(parseCandidate(''), null)

// 리포트
assert.equal(buildReport([
  { title: 'IP', rows: [['IPv4', '1.2.3.4'], ['IPv6', undefined]] },
  { title: 'Empty', rows: [['x', '']] },
  { title: 'Net', rows: [['ASN', 'AS4766']] },
]), '[IP]\nIPv4: 1.2.3.4\n\n[Net]\nASN: AS4766')

console.log('check-ip-info: all passed')

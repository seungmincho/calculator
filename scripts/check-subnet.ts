// 서브넷 로직 회귀 체크: node scripts/check-subnet.ts
import assert from 'node:assert/strict'
import {
  parseIPv4, formatIPv4, parseV4Input, v4Info, reverseZones, rangeToCidrs, parseRange, summarize, supernet,
  overlaps, parseV4List, vlsm, parseVlsmReqs, splitEqual, prefixForHosts, formatBlock, toHex, maskToPrefix,
  parseIPv6, compressIPv6, expandIPv6, parseV6Input, v6Info, v6ReverseZones, v6SubnetCount, v4Scope,
} from '../src/utils/subnet.ts'

const ip = (s: string) => parseIPv4(s)!
const blocks = (s: string) => parseV4List(s).map(e => e.block!)
const fmt = (bs: { network: number; prefix: number }[]) => bs.map(formatBlock)

// ── 파싱 ──
assert.equal(formatIPv4(ip('255.255.255.255')), '255.255.255.255')
assert.equal(parseIPv4('256.1.1.1'), null)
assert.equal(parseIPv4('1.2.3'), null)
assert.equal(parseIPv4('1.2.3.4.5'), null)
assert.deepEqual(parseV4Input('192.168.1.10/24'), { ok: true, ip: ip('192.168.1.10'), prefix: 24, via: 'cidr' })
assert.deepEqual(parseV4Input(' 192.168.1.10 255.255.255.0 '), { ok: true, ip: ip('192.168.1.10'), prefix: 24, via: 'mask' })
assert.deepEqual(parseV4Input('192.168.1.10/255.255.255.192'), { ok: true, ip: ip('192.168.1.10'), prefix: 26, via: 'mask' })
assert.deepEqual(parseV4Input('10.0.0.0 0.255.255.255'), { ok: true, ip: ip('10.0.0.0'), prefix: 8, via: 'wildcard' })
assert.deepEqual(parseV4Input('10.0.0.0 24'), { ok: true, ip: ip('10.0.0.0'), prefix: 24, via: 'cidr' })
assert.deepEqual(parseV4Input('8.8.8.8'), { ok: true, ip: ip('8.8.8.8'), prefix: 32, via: 'host' })
assert.deepEqual(parseV4Input('0.0.0.0/0'), { ok: true, ip: 0, prefix: 0, via: 'cidr' })
assert.deepEqual(parseV4Input(''), { ok: false, error: 'empty' })
assert.deepEqual(parseV4Input('10.0.0.0/33'), { ok: false, error: 'prefix' })
assert.deepEqual(parseV4Input('10.0.0.0/123'), { ok: false, error: 'prefix' })
assert.deepEqual(parseV4Input('10.0.0.300/8'), { ok: false, error: 'ip' })
assert.deepEqual(parseV4Input('10.0.0.1 255.0.255.0'), { ok: false, error: 'mask' })
assert.deepEqual(parseV4Input('hello'), { ok: false, error: 'format' })
assert.equal(maskToPrefix(0), 0)
assert.equal(maskToPrefix(0xffffffff), 32)

// ── 기본 계산 ──
const c24 = v4Info(ip('192.168.1.10'), 24)
assert.equal(formatIPv4(c24.network), '192.168.1.0')
assert.equal(formatIPv4(c24.broadcast!), '192.168.1.255')
assert.equal(formatIPv4(c24.first), '192.168.1.1')
assert.equal(formatIPv4(c24.last), '192.168.1.254')
assert.equal(formatIPv4(c24.mask), '255.255.255.0')
assert.equal(formatIPv4(c24.wildcard), '0.0.0.255')
assert.equal(c24.usable, 254)
assert.equal(c24.cls, 'C')
assert.equal(c24.scope, 'private')
assert.equal(toHex(c24.ip), 'C0A8010A')

const c0 = v4Info(ip('1.2.3.4'), 0)
assert.equal(c0.network, 0)
assert.equal(c0.broadcast, 4294967295)
assert.equal(c0.total, 4294967296)
assert.equal(c0.usable, 4294967294)
assert.equal(formatIPv4(c0.mask), '0.0.0.0')
assert.equal(formatIPv4(c0.wildcard), '255.255.255.255')

const c31 = v4Info(ip('10.0.0.1'), 31) // RFC 3021: 브로드캐스트 없음, 2개 모두 사용
assert.equal(c31.broadcast, null)
assert.equal(formatIPv4(c31.first), '10.0.0.0')
assert.equal(formatIPv4(c31.last), '10.0.0.1')
assert.equal(c31.usable, 2)

const c32 = v4Info(ip('10.0.0.7'), 32)
assert.equal(c32.broadcast, null)
assert.equal(formatIPv4(c32.first), '10.0.0.7')
assert.equal(formatIPv4(c32.last), '10.0.0.7')
assert.equal(c32.usable, 1)
assert.equal(formatIPv4(c32.mask), '255.255.255.255')

// 분류
assert.equal(v4Scope(ip('100.100.1.1')).scope, 'cgnat')
assert.equal(v4Scope(ip('100.128.0.1')).scope, 'public')
assert.equal(v4Scope(ip('172.31.255.255')).scope, 'private')
assert.equal(v4Scope(ip('172.32.0.0')).scope, 'public')
assert.equal(v4Scope(ip('127.0.0.1')).scope, 'loopback')
assert.equal(v4Scope(ip('169.254.10.1')).scope, 'linkLocal')
assert.equal(v4Scope(ip('224.0.0.251')).scope, 'multicast')
assert.equal(v4Scope(ip('203.0.113.9')).scope, 'documentation')
assert.equal(v4Scope(ip('255.255.255.255')).scope, 'broadcast')
assert.equal(v4Scope(ip('250.0.0.1')).scope, 'reserved')
assert.equal(v4Scope(ip('8.8.8.8')).scope, 'public')

// 역방향 존
assert.deepEqual(reverseZones(ip('192.168.1.0'), 24).zones, ['1.168.192.in-addr.arpa'])
assert.deepEqual(reverseZones(ip('10.0.0.0'), 8).zones, ['10.in-addr.arpa'])
assert.deepEqual(reverseZones(ip('192.168.4.0'), 22), { zones: ['4.168.192.in-addr.arpa', '5.168.192.in-addr.arpa', '6.168.192.in-addr.arpa', '7.168.192.in-addr.arpa'], total: 4 })
assert.deepEqual(reverseZones(ip('192.168.1.64'), 26).zones, ['64/26.1.168.192.in-addr.arpa'])
assert.deepEqual(reverseZones(0, 0).zones, ['in-addr.arpa'])
assert.deepEqual(reverseZones(ip('10.1.2.3'), 32).zones, ['3.2.1.10.in-addr.arpa'])

// ── 범위 → CIDR ──
assert.deepEqual(fmt(rangeToCidrs(ip('10.0.0.5'), ip('10.0.0.20'))), ['10.0.0.5/32', '10.0.0.6/31', '10.0.0.8/29', '10.0.0.16/30', '10.0.0.20/32'])
assert.deepEqual(fmt(rangeToCidrs(0, 4294967295)), ['0.0.0.0/0'])
assert.deepEqual(fmt(rangeToCidrs(ip('192.168.0.0'), ip('192.168.1.255'))), ['192.168.0.0/23'])
assert.deepEqual(parseRange('10.0.0.5-20'), { ok: true, start: ip('10.0.0.5'), end: ip('10.0.0.20') })
assert.deepEqual(parseRange('10.0.0.5 ~ 10.0.0.20'), { ok: true, start: ip('10.0.0.5'), end: ip('10.0.0.20') })
assert.deepEqual(parseRange('10.0.0.20-10.0.0.5'), { ok: false, error: 'order' })
assert.deepEqual(parseRange('10.0.0.5'), { ok: false, error: 'format' })

// ── 요약 · 슈퍼넷 · 겹침 ──
assert.deepEqual(fmt(summarize(blocks('10.0.0.0/24\n10.0.1.0/24\n10.0.2.0/23\n10.0.1.128/25'))), ['10.0.0.0/22'])
assert.deepEqual(fmt(summarize(blocks('10.0.1.0/24, 10.0.2.0/24'))), ['10.0.1.0/24', '10.0.2.0/24'])
assert.deepEqual(fmt(summarize(blocks('10.0.0.1, 10.0.0.0'))), ['10.0.0.0/31'])
const sn = supernet(blocks('10.0.1.0/24\n10.0.2.0/24'))!
assert.equal(formatBlock(sn.block), '10.0.0.0/22')
assert.equal(sn.extra, 512)
assert.equal(formatBlock(supernet(blocks('0.0.0.0/1, 128.0.0.0/1'))!.block), '0.0.0.0/0')
assert.deepEqual(overlaps(blocks('10.0.0.0/8\n10.0.1.0/24\n192.168.0.0/16\n10.0.1.0/24')), [
  { a: 0, b: 1, relation: 'aContainsB' }, { a: 0, b: 3, relation: 'aContainsB' }, { a: 1, b: 3, relation: 'same' },
])
assert.equal(parseV4List('10.0.0.0/8\nbad\n1.1.1.1')[1].error, 'format')
assert.equal(formatBlock(parseV4List('10.1.2.3/8')[0].block!), '10.0.0.0/8')

// ── 분할 · VLSM ──
const eq = splitEqual({ network: ip('192.168.1.0'), prefix: 24 }, 26)
assert.equal(eq.total, 4)
assert.deepEqual(fmt(eq.list), ['192.168.1.0/26', '192.168.1.64/26', '192.168.1.128/26', '192.168.1.192/26'])
assert.equal(splitEqual({ network: 0, prefix: 8 }, 30, 10).list.length, 10)
assert.equal(prefixForHosts(1), 30)
assert.equal(prefixForHosts(2), 30)
assert.equal(prefixForHosts(62), 26)
assert.equal(prefixForHosts(63), 25)
assert.equal(prefixForHosts(254), 24)
assert.equal(prefixForHosts(0), null)

const { reqs } = parseVlsmReqs('영업 60\n개발: 28\n12\n링크 2')
assert.deepEqual(reqs.map(r => r.hosts), [60, 28, 12, 2])
const v = vlsm({ network: ip('192.168.10.0'), prefix: 24 }, reqs)
assert.deepEqual(v.rows.map(r => (r.ok ? `${r.name}:${formatBlock(r.block)}` : `${r.name}:x`)), [
  '영업:192.168.10.0/26', '개발:192.168.10.64/27', ':192.168.10.96/28', '링크:192.168.10.112/30',
])
assert.equal(v.used, 116)
assert.deepEqual(fmt(v.free), ['192.168.10.116/30', '192.168.10.120/29', '192.168.10.128/25'])
// 공간 부족: 큰 요구는 실패, 작은 요구는 계속 배치
const v2 = vlsm({ network: ip('10.0.0.0'), prefix: 26 }, [{ name: 'a', hosts: 30 }, { name: 'b', hosts: 40 }, { name: 'c', hosts: 30 }])
assert.deepEqual(v2.rows.map(r => (r.ok ? formatBlock(r.block) : 'x')), ['10.0.0.0/26', 'x', 'x'])
const v3 = vlsm({ network: ip('10.0.0.0'), prefix: 26 }, [{ name: 'a', hosts: 100 }, { name: 'b', hosts: 10 }])
assert.deepEqual(v3.rows.map(r => (r.ok ? formatBlock(r.block) : 'x')), ['x', '10.0.0.0/28'])
assert.deepEqual(parseVlsmReqs('abc\n0\n5').bad, ['abc', '0'])

// ── IPv6 ──
const d = parseIPv6('2001:DB8:0:0:0:0:2:1')!
assert.equal(compressIPv6(d), '2001:db8::2:1')
assert.equal(expandIPv6(d), '2001:0db8:0000:0000:0000:0000:0002:0001')
assert.equal(compressIPv6(parseIPv6('::')!), '::')
assert.equal(compressIPv6(parseIPv6('::1')!), '::1')
assert.equal(compressIPv6(parseIPv6('2001:db8:0:1:1:1:1:1')!), '2001:db8:0:1:1:1:1:1') // 단일 0 그룹은 압축 안 함
assert.equal(compressIPv6(parseIPv6('2001:0:0:1:0:0:0:1')!), '2001:0:0:1::1') // 더 긴 쪽
assert.equal(compressIPv6(parseIPv6('2001:db8:0:0:1:0:0:1')!), '2001:db8::1:0:0:1') // 동률이면 앞
assert.equal(compressIPv6(parseIPv6('::ffff:192.168.1.1')!), '::ffff:c0a8:101')
assert.equal(parseIPv6('1::2::3'), null)
assert.equal(parseIPv6('1:2:3:4:5:6:7:8:9'), null)
assert.equal(parseIPv6('12345::'), null)
assert.equal(parseIPv6('1:2:3:4:5:6:7'), null)
assert.equal(parseIPv6('1:2:3:4:5:6:7::'), parseIPv6('1:2:3:4:5:6:7:0'))
assert.deepEqual(parseV6Input('2001:db8::/129'), { ok: false, error: 'prefix' })
assert.equal((parseV6Input('2001:db8::1') as { prefix: number }).prefix, 128)
const i48 = v6Info(parseIPv6('2001:db8:abcd:12::1')!, 48)
assert.equal(compressIPv6(i48.network), '2001:db8:abcd::')
assert.equal(compressIPv6(i48.last), '2001:db8:abcd:ffff:ffff:ffff:ffff:ffff')
assert.equal(i48.total.toString(), (BigInt(2) ** BigInt(80)).toString())
assert.equal(i48.scope, 'documentation')
assert.equal(v6SubnetCount(48, 64).toString(), '65536')
assert.equal(v6Info(parseIPv6('::')!, 0).total.toString(), (BigInt(2) ** BigInt(128)).toString())
assert.equal(v6Info(parseIPv6('fe80::1')!, 64).scope, 'linkLocal')
assert.equal(v6Info(parseIPv6('fd00::1')!, 64).scope, 'ula')
assert.equal(v6Info(parseIPv6('2600::1')!, 64).scope, 'global')
assert.deepEqual(v6ReverseZones(parseIPv6('2001:db8:abcd::')!, 48).zones, ['d.c.b.a.8.b.d.0.1.0.0.2.ip6.arpa'])
assert.deepEqual(v6ReverseZones(parseIPv6('2001:db8::')!, 31), { zones: ['8.b.d.0.1.0.0.2.ip6.arpa', '9.b.d.0.1.0.0.2.ip6.arpa'], total: 2 })

assert.deepEqual(v6ReverseZones(0n, 0).zones, ['ip6.arpa'])
assert.deepEqual(v6ReverseZones(parseIPv6('2001:db8::1')!, 128).zones[0].split('.').length, 34)
console.log('check-subnet: all passed')

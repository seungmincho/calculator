import assert from 'node:assert/strict'
import { calculateRunning, formatClock, parseClock, parseDistance, parsePace } from '../src/utils/runningPace.ts'

const result = (distance, mode, value, split = 5) => {
  const calculated = calculateRunning(distance, mode, value, split)
  assert.ok(calculated)
  assert.equal(calculated.splits.at(-1).distanceKm, distance)
  assert.equal(calculated.splits.at(-1).elapsedSeconds, calculated.finishSeconds)
  assert.equal(calculated.splits.filter(row => row.distanceKm === distance).length, 1)
  return calculated
}

let run = result(10, 'time', 50 * 60)
assert.equal(formatClock(run.secondsPerKm), '5:00')
assert.equal(run.speedKmh, 12)
assert.equal(formatClock(run.splits[0].elapsedSeconds), '25:00')
assert.equal(formatClock(run.finishSeconds, true), '0:50:00')

run = result(5, 'time', 30 * 60)
assert.equal(formatClock(run.secondsPerKm), '6:00')
assert.equal(run.speedKmh, 10)

run = result(21.0975, 'time', 2 * 3600, 1)
assert.equal(formatClock(run.secondsPerKm), '5:41')
assert.equal(formatClock(run.splits.find(row => row.distanceKm === 5).elapsedSeconds), '28:26')
assert.equal(formatClock(run.splits.find(row => row.distanceKm === 21).elapsedSeconds, true), '1:59:27')
assert.equal(formatClock(run.finishSeconds, true), '2:00:00')

run = result(42.195, 'time', 4 * 3600, 1)
assert.equal(formatClock(run.secondsPerKm), '5:41')
assert.equal(formatClock(run.splits.find(row => row.distanceKm === 5).elapsedSeconds), '28:26')
assert.equal(formatClock(run.splits.find(row => row.distanceKm === 42).elapsedSeconds, true), '3:58:53')
assert.equal(formatClock(run.finishSeconds, true), '4:00:00')

run = result(42.195, 'pace', 5 * 60 + 40)
assert.equal(formatClock(run.finishSeconds, true), '3:59:06')
run = result(21.0975, 'pace', 6 * 60)
assert.equal(formatClock(run.finishSeconds, true), '2:06:35')

assert.equal(result(10, 'time', 3000).splits.length, 2)
assert.equal(result(2.5, 'time', 750).splits.length, 1)
assert.equal(result(0.8, 'pace', 360, 1).splits.length, 1)
assert.equal(formatClock(299.6), '5:00')
assert.equal(formatClock(59.6), '1:00')

for (const value of ['', '0', '-1', 'Infinity', 'NaN', '5e2', '1.12345', '501']) assert.equal(parseDistance(value), null)
assert.equal(parseDistance('21.0975'), 21.0975)
for (const tuple of [['0','0','0'], ['-1','20','0'], ['0','60','0'], ['0','0','60'], ['','20','0'], ['0','1.5','0']]) assert.equal(parseClock(...tuple), null)
assert.equal(parseClock('1','59','59'), 7199)
for (const tuple of [['0','0'], ['-1','0'], ['5','60'], ['','30'], ['1.5','0']]) assert.equal(parsePace(...tuple), null)
assert.equal(parsePace('5','40'), 340)
for (const args of [[0,'time',100,1],[-1,'time',100,1],[10,'time',0,1],[10,'pace',Infinity,1],[10,'pace',300,2]]) assert.equal(calculateRunning(...args), null)
console.log('check-running-pace OK: key races, raw cumulative splits, formatting and invalid inputs')

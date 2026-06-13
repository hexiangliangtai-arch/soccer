export interface RandomSource { next: () => number }

export function createSeededRandom(seed: number): RandomSource {
  let value = seed >>> 0
  return {
    next: () => {
      value += 0x6D2B79F5
      let t = value
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

export function randomBetween(random: RandomSource, min: number, max: number) {
  return min + random.next() * (max - min)
}

export function randomInt(random: RandomSource, min: number, max: number) {
  return Math.floor(randomBetween(random, min, max + 1))
}

export function pickOne<T>(random: RandomSource, items: T[]): T {
  return items[Math.min(items.length - 1, Math.floor(random.next() * items.length))]
}

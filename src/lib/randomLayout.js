const NODE_SIZE = 88
const MIN_GAP = 16
const MIN_DISTANCE = NODE_SIZE + MIN_GAP
const PADDING = NODE_SIZE / 2 + 20
const MAX_ATTEMPTS = 80

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1)
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min)
}

function hasOverlap(x, y, placed) {
  return placed.some((p) => distance(x, y, p.x, p.y) < MIN_DISTANCE)
}

export function computeRandomLayout(ids, width, height) {
  if (ids.length === 0) return {}
  const minX = PADDING
  const maxX = width - PADDING
  const minY = PADDING
  const maxY = height - PADDING
  if (maxX <= minX || maxY <= minY) {
    const cx = width / 2
    const cy = height / 2
    return Object.fromEntries(
      ids.map((id, i) => [
        id,
        { x: cx + (i % 3) * MIN_DISTANCE - MIN_DISTANCE, y: cy + Math.floor(i / 3) * MIN_DISTANCE - MIN_DISTANCE / 2 },
      ])
    )
  }
  const placed = []
  const result = {}
  for (const id of ids) {
    let x, y
    let ok = false
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      x = randomInRange(minX, maxX)
      y = randomInRange(minY, maxY)
      if (!hasOverlap(x, y, placed)) {
        ok = true
        break
      }
    }
    if (!ok) {
      const cols = Math.max(1, Math.floor((maxX - minX) / MIN_DISTANCE))
      const col = placed.length % cols
      const row = Math.floor(placed.length / cols)
      x = minX + col * MIN_DISTANCE
      y = minY + row * MIN_DISTANCE
    }
    placed.push({ x, y })
    result[id] = { x, y }
  }
  return result
}

export { NODE_SIZE }

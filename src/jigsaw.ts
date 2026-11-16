export interface Piece {
  index: number
  col: number
  row: number
  d: string
  cx: number
  cy: number
}

/** เลือกจำนวนคอลัมน์/แถวให้ใกล้เคียงจำนวนชิ้นที่ต้องการ และชิ้นเกือบเป็นสี่เหลี่ยมจัตุรัส */
export function gridFor(n: number, aspect: number) {
  const cols = Math.max(2, Math.round(Math.sqrt(n * aspect)))
  const rows = Math.max(2, Math.round(n / cols))
  return { cols, rows }
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** เส้นขอบหนึ่งเส้น (มีปุ่มนูน/เว้า) จาก A ไป B โดยปุ่มชี้ไปทางเวกเตอร์ n * s */
function edge(ax: number, ay: number, bx: number, by: number, nx: number, ny: number, s: number) {
  const dx = bx - ax
  const dy = by - ay
  const L = Math.hypot(dx, dy)
  const p = (x: number, y: number) =>
    `${(ax + dx * x + nx * y * s * L).toFixed(2)} ${(ay + dy * x + ny * y * s * L).toFixed(2)}`
  return (
    `L ${p(0.35, 0)} ` +
    `C ${p(0.35, 0.05)} ${p(0.3, 0.1)} ${p(0.3, 0.17)} ` +
    `C ${p(0.3, 0.26)} ${p(0.4, 0.3)} ${p(0.5, 0.3)} ` +
    `C ${p(0.6, 0.3)} ${p(0.7, 0.26)} ${p(0.7, 0.17)} ` +
    `C ${p(0.7, 0.1)} ${p(0.65, 0.05)} ${p(0.65, 0)} ` +
    `L ${p(1, 0)} `
  )
}

export function buildPieces(cols: number, rows: number, W: number, H: number, seed: number): Piece[] {
  const rand = mulberry32(seed)
  const sign = () => (rand() < 0.5 ? -1 : 1)
  // hs[r][c]: เส้นแนวนอนที่แถว r ของคอลัมน์ c, vs[r][c]: เส้นแนวตั้งที่คอลัมน์ c ของแถว r
  const hs = Array.from({ length: rows + 1 }, () => Array.from({ length: cols }, sign))
  const vs = Array.from({ length: rows }, () => Array.from({ length: cols + 1 }, sign))
  const cw = W / cols
  const ch = H / rows
  const pieces: Piece[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = c * cw
      const x1 = (c + 1) * cw
      const y0 = r * ch
      const y1 = (r + 1) * ch
      let d = `M ${x0.toFixed(2)} ${y0.toFixed(2)} `
      d += r > 0 ? edge(x0, y0, x1, y0, 0, 1, hs[r][c]) : `L ${x1.toFixed(2)} ${y0.toFixed(2)} `
      d += c < cols - 1 ? edge(x1, y0, x1, y1, 1, 0, vs[r][c + 1]) : `L ${x1.toFixed(2)} ${y1.toFixed(2)} `
      d += r < rows - 1 ? edge(x1, y1, x0, y1, 0, 1, hs[r + 1][c]) : `L ${x0.toFixed(2)} ${y1.toFixed(2)} `
      d += c > 0 ? edge(x0, y1, x0, y0, 1, 0, vs[r][c]) : `L ${x0.toFixed(2)} ${y0.toFixed(2)} `
      d += 'Z'
      pieces.push({ index: r * cols + c, col: c, row: r, d, cx: x0 + cw / 2, cy: y0 + ch / 2 })
    }
  }
  return pieces
}

import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

function crc32(data) {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c >>> 0
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) crc = (table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)) >>> 0
  return (~crc) >>> 0
}

function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // 8-bit depth
  ihdr[9] = 2   // RGB color type

  // Ink black bg (#0A0A0A), acid yellow circle (#DFFF1F) centered
  const rows = []
  const cx = size / 2, cy = size / 2
  const r = size * 0.38  // circle radius ~38% of size

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0  // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      const inCircle = Math.sqrt(dx * dx + dy * dy) < r
      // Draw a rounded rect (icon background)
      const rx = Math.abs(x - cx) / (size / 2)
      const ry = Math.abs(y - cy) / (size / 2)
      const inRoundedRect = rx < 0.88 && ry < 0.88 && (rx < 0.72 || ry < 0.72 || Math.sqrt((rx - 0.72) ** 2 + (ry - 0.72) ** 2) < 0.16)
      let pr, pg, pb
      if (!inRoundedRect) {
        pr = 0xFF; pg = 0xFF; pb = 0xFF  // white outside rounded rect
      } else if (inCircle) {
        pr = 0xDF; pg = 0xFF; pb = 0x1F  // acid yellow: #DFFF1F
      } else {
        pr = 0x0A; pg = 0x0A; pb = 0x0A  // ink black: #0A0A0A
      }
      row[1 + x * 3] = pr
      row[2 + x * 3] = pg
      row[3 + x * 3] = pb
    }
    rows.push(row)
  }

  const rawData = Buffer.concat(rows)
  const compressed = deflateSync(rawData)

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', makePNG(192))
writeFileSync('public/icon-512.png', makePNG(512))
console.log('Generated public/icon-192.png and public/icon-512.png')

import { expect, test, type Page } from '@playwright/test'

/** สร้างรูปทดสอบด้วย canvas แล้วใส่เข้า input[type=file] เหมือนผู้ใช้เลือกไฟล์ */
async function uploadImages(page: Page, specs: { w: number; h: number; c1: string; c2: string; name: string }[]) {
  await page.evaluate(async (list) => {
    const files: File[] = []
    for (const s of list) {
      const c = document.createElement('canvas')
      c.width = s.w
      c.height = s.h
      const x = c.getContext('2d')!
      const g = x.createLinearGradient(0, 0, s.w, s.h)
      g.addColorStop(0, s.c1)
      g.addColorStop(1, s.c2)
      x.fillStyle = g
      x.fillRect(0, 0, s.w, s.h)
      x.fillStyle = 'rgba(255,255,255,.9)'
      x.beginPath()
      x.arc(s.w * 0.7, s.h * 0.3, s.h * 0.15, 0, 7)
      x.fill()
      x.fillStyle = '#fff'
      x.font = `bold ${s.h * 0.18}px sans-serif`
      x.fillText(s.name, s.w * 0.08, s.h * 0.8)
      const b = await new Promise<Blob>((r) => c.toBlob((bb) => r(bb!), 'image/png'))
      files.push(new File([b], s.name + '.png', { type: 'image/png' }))
    }
    const dt = new DataTransfer()
    files.forEach((f) => dt.items.add(f))
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, specs)
}

test('เล่นเกมต่อเนื่องหลายรูป: ตั้งค่า → เปิดจิ๊กซอ → เฉลย → ภาพถัดไป → จบเกม', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ตั้งค่าเกม' })).toBeVisible()

  // 1) เพิ่ม 3 รูปพร้อมกัน
  await uploadImages(page, [
    { w: 1600, h: 1000, c1: '#0ea5e9', c2: '#1e3a8a', name: 'Beach' },
    { w: 1200, h: 1200, c1: '#f97316', c2: '#7c2d12', name: 'Temple' },
    { w: 900, h: 1400, c1: '#22c55e', c2: '#14532d', name: 'Forest' },
  ])
  const rows = page.locator('li')
  await expect(rows).toHaveCount(3)

  // 2) ตั้งชื่อเฉลย + จำนวนจิ๊กซอของรูปแรก
  const answers = ['ชายหาดพัทยา', 'วัดอรุณ กรุงเทพ', 'ป่าเขาใหญ่']
  for (let i = 0; i < 3; i++) await rows.nth(i).locator('input[type=text], input:not([type])').fill(answers[i])
  await rows.nth(0).locator('input[type=range]').fill('48')
  await expect(rows.nth(0)).toContainText('ชิ้น')

  // 3) เริ่มเกม
  await page.getByRole('button', { name: /เริ่มเกม/ }).click()
  await expect(page.getByText('ภาพนี้คืออะไร? ที่ไหน?')).toBeVisible()
  await expect(page.getByText(/ภาพที่\s*1\s*\/\s*3/)).toBeVisible()

  // 4) คลิกเปิดจิ๊กซอ 3 ชิ้นในภาพที่ 1
  const pieces = page.locator('g.piece')
  const total = await pieces.count()
  expect(total).toBeGreaterThan(30)
  for (const i of [4, 10, 17]) await pieces.nth(i).click()
  await expect(page.getByText(`เปิดแล้ว 3 / ${total} ชิ้น`)).toBeVisible()

  // 5) เฉลยภาพที่ 1 → เห็นข้อความเฉลย
  await page.getByRole('button', { name: /เฉลย/ }).click()
  await expect(page.getByText(answers[0], { exact: true })).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(2500) // ดูพลุ

  // 6) ภาพถัดไป (ภาพที่ 2) ต้องไม่ต้องตั้งค่าใหม่
  await page.getByRole('button', { name: /ภาพถัดไป/ }).click()
  await expect(page.getByText(/ภาพที่\s*2\s*\/\s*3/)).toBeVisible()
  await expect(page.getByText('ภาพนี้คืออะไร? ที่ไหน?')).toBeVisible()
  await page.locator('g.piece').nth(6).click()
  await page.locator('g.piece').nth(12).click()
  await page.keyboard.press('Space') // คีย์ลัดเฉลย
  await expect(page.getByText(answers[1], { exact: true })).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(1500)

  // 7) ภาพที่ 3 แล้วจบเกม
  await page.keyboard.press('Space')
  await expect(page.getByText(/ภาพที่\s*3\s*\/\s*3/)).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByText(answers[2], { exact: true })).toBeVisible({ timeout: 8000 })
  await expect(page.getByRole('button', { name: /จบเกม/ })).toBeVisible()
  await page.waitForTimeout(1500)

  // 8) กลับหน้าตั้งค่า → รูปยังอยู่ครบ และรีโหลดแล้วข้อมูลไม่หาย
  await page.getByRole('button', { name: /ตั้งค่า/ }).click()
  await expect(rows).toHaveCount(3)
  await page.reload()
  await expect(page.locator('li')).toHaveCount(3)
  await expect(page.getByRole('button', { name: /เล่นต่อ/ })).toBeVisible()
  await page.waitForTimeout(1500)
})

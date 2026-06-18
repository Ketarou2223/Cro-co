// 解説: このファイルはブラウザ上で画像をトリミング（切り抜き）するユーティリティを提供する。
// 解説: 呼ばれる場所: ProfileEditPage.tsx 等の画像アップロード UI でトリミング後の Blob を取得するために使う
// 解説: react-easy-crop ライブラリと組み合わせて使う（react-easy-crop が UI、このファイルが実際の切り抜き処理）
// 解説: 処理の流れ: URL → HTMLImageElement → Canvas に描画 → JPEG Blob として出力

import type { Area } from 'react-easy-crop'

// 解説: createImage(url) = 画像 URL から HTMLImageElement を非同期で生成する
//   crossOrigin = 'anonymous' = Supabase Storage の CORS を通すために必要
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    // 解説: addEventListener で load/error の両方を監視する（onload 属性より確実）
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (err) => reject(err))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

// 解説: getCroppedImg(imageSrc, croppedAreaPixels) = 元画像 URL とトリミング領域から JPEG Blob を返す
//   Area = { x, y, width, height } のピクセル座標（react-easy-crop が計算して渡してくる）
export async function getCroppedImg(imageSrc: string, croppedAreaPixels: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  // 解説: Canvas = ブラウザ上で画像を描画・加工できる仮想キャンバス
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas context not available')

  // 解説: キャンバスのサイズをトリミング後のサイズと一致させる
  canvas.width = croppedAreaPixels.width
  canvas.height = croppedAreaPixels.height

  // 解説: drawImage = 元画像の指定領域だけをキャンバスに描画する（9引数バージョン）
  //   引数: 元画像, 切り取り元 x, y, 幅, 高さ, 描画先 x, y, 幅, 高さ
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
  )

  // 解説: canvas.toBlob() = キャンバスの内容を JPEG Blob として非同期で出力する
  //   0.9 = 品質係数（0〜1: 1が最高品質・容量大 / 0が最低品質・容量小）
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('canvas is empty'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      0.9,
    )
  })
}

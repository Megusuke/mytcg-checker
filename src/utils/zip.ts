import { unzip } from 'fflate'

export async function readZip(file: File): Promise<Record<string, Uint8Array>> {
  const buf = new Uint8Array(await file.arrayBuffer())
  return new Promise((resolve, reject) => {
    unzip(buf, (err, data) => {
      if (err) reject(err)
      else resolve(data as Record<string, Uint8Array>)
    })
  })
}

import shortid from 'shortid'
import { createWriteStream, createReadStream, unlinkSync } from 'fs'

export const imagesPath = 'images/'

export const storeUpload = async ({ stream, filename }) => {
  const id = shortid.generate()
  const path = `${imagesPath}${id}-${filename}`

  return new Promise((resolve, reject) =>
    stream
      .pipe(createWriteStream(path))
      .on('finish', () => resolve({ id, path, filename }))
      .on('error', reject),
  )
}

export const processUpload = async upload => {
  const { stream, filename } = await upload
  const f = await storeUpload({ stream, filename })
  return `${f.id}-${f.filename}`
}

export const deleteImage = imageURL => {
  if (imageURL === 'default.png') { return null }
  try { unlinkSync(`${imagesPath}${imageURL}`) } //file removed
  catch(err) { console.error(err) }
}

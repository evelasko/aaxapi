import cloudinary from 'cloudinary';

cloudinary.config(process.env.CLOUDINARY_URL)

const cloudinaryUpload = async ({stream}) => {
    try {
        return new Promise((resolve, reject) => {
            const streamLoad = cloudinary.v2.uploader.upload_stream( 
              {folder: 'aaxapi_images'}, 
              (error, result) => { if (result) { resolve(result.public_id) } else { reject(error) } }
            )
            stream.pipe(streamLoad)
        })
    }
    catch (err) { throw new Error(`Failed to upload to cloudinary! Err: ${err.message}`) }
}

export const processUpload = async upload => {
  const { stream, filename } = await upload
  const public_id = await cloudinaryUpload({stream})
  return public_id
}

export const getSecureImage = async public_id => {
  const { secure_url } = await cloudinary.v2.api.resource(public_id)
  return secure_url || null
}

export const deleteImage = imageURL => {
  try { cloudinary.v2.api.delete_resources([imageURL]) } 
  catch(err) { throw new Error(`Unable to delete! Err: ${err}`) }
  return imageURL
}

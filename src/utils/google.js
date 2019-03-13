
// Google Places API Calls
// export const getPlaceDetails = async (placeID) => {
//     const response = await axios.get(`https://maps.googleapis.com/maps/api/place/details/json?key=${process.env.GOOGLE_API_KEY}&placeid=${placeID}&language=es&region=es&fields=formatted_address,url,formatted_phone_number,website`)
//     if (!response.data.result) throw new Error('Could not found such place by ID...')
//     return response.data.result
// }

export const getPlaceDetails = async (placeid) => {
    const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_API_KEY,
    Promise: Promise
  })
  try {
  const res = await googleMapsClient.place({ 
      placeid , 
      fields: ['place_id', 'geometry', 'international_phone_number', 'website' ]})
      .asPromise()
  return res.json.result
    } catch (err) { throw new Error(err)}
}

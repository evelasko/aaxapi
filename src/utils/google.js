import axios from 'axios'

// Google Places API Calls
const getPlaceDetails = async (placeID) => {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/place/details/json?key=${process.env.GOOGLE_API_KEY}&placeid=${placeID}&language=es&region=es&fields=formatted_address,url,formatted_phone_number,website`)
    if (!response.data.result) throw new Error('Could not found such place by ID...')
    return response.data.result
}

export { getPlaceDetails }
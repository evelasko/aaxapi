//import axios from 'axios'
const axios = require('axios')

const gKey = 'AIzaSyA6MQpXZiRdjsqQtUVeZWvaH7WKMTWpD2E'

const getPlaceDetails = async (placeID) => {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/place/details/json?key=${gKey}&placeid=${placeID}&language=es&region=es&fields=formatted_address,url,formatted_phone_number,website`)
    return response.data.result
}

const displayPlace = async msg => {
    console.log(await getPlaceDetails('ChIJX9jt64MoQg0RL6tNvZdnRKY'))
}

//console.log(getPlaceDetails('ChIJX9jt64MoQg0RL6tNvZdnRKY'))
getPlaceDetails('ChIJX9jt64MoQg0RL6tNvZdnRKY').then(res => console.log(res))

displayPlace()
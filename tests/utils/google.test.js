import 'cross-fetch/polyfill';
import { getPlaceDetails } from '../../src/utils/google';

test('Should receive place data from placeID', async () => {
    const res = await getPlaceDetails('ChIJP3i1y66LQQ0RpSSEnhN7jJY')
    console.log('DATA FROM getPlaceDetails(placeID): ', JSON.stringify(res))
    expect(res.place_id).toBe('ChIJP3i1y66LQQ0RpSSEnhN7jJY')
})
require('dotenv').config()

const EMAIL = process.env.EMAIL
const FILE_URL = process.env.FILE_URL
const CF_API = process.env.CF_API_URL
const API_KEY = process.env.CF_API_KEY
const ZONE_ID = process.env.CF_ZONE_ID

const PURGE_CHARACTERS = process.env.PURGE_CHARACTERS
const PURGE_LOCATIONS = process.env.PURGE_LOCATIONS
const charactersToPurge = PURGE_CHARACTERS.split(',')
const locationsToPurge = PURGE_LOCATIONS.split(',')

function purgeCachedFiles() {
	if (!charactersToPurge[0] && !locationsToPurge[0]) return

	let cachesToPurge = []
	if (charactersToPurge.length && charactersToPurge[0])
		cachesToPurge = charactersToPurge.map(item => `${FILE_URL}/card/${item}.webp`)

	if (locationsToPurge.length && locationsToPurge[0])
		cachesToPurge = cachesToPurge.concat(locationsToPurge.map(item => `${FILE_URL}/location/${item}.webp`))

	console.log(`(${cachesToPurge.length}) CACHED FILES:`, cachesToPurge)

	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Auth-Email': EMAIL,
			'X-Auth-Key': API_KEY
		},
		body: JSON.stringify({ files: cachesToPurge })
	}

	fetch(`${CF_API}/${ZONE_ID}/purge_cache`, options)
		.then(response => response.json())
		.then(response => console.log(response))
		.catch(err => console.error(err))
}
purgeCachedFiles()
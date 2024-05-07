require('dotenv').config()

const fs = require('fs')
const AdmZip = require('adm-zip')

function buildExtension() {
	const version = process.argv[2]
	if (!version) return console.error('> ❌ build version number is required!')
	
	const manifest = require('../manifest.json')
	const chromeManifest = { ...manifest }
	const firefoxManifest = { ...manifest }
	chromeManifest.version = version
	firefoxManifest.version = version
	firefoxManifest.browser_specific_settings = {
		gecko: {
			id: process.env.EMAIL,
			strict_min_version: "109.0"
		}
	}

	try {
		console.log('> building the extension...')
		fs.writeFileSync("chrome/manifest.json", JSON.stringify(chromeManifest))
		fs.writeFileSync("firefox/manifest.json", JSON.stringify(firefoxManifest))

		const zipChrome = new AdmZip()
		const zipFirefox = new AdmZip()
		zipChrome.addLocalFolder('chrome')
		zipFirefox.addLocalFolder('firefox')
		zipChrome.writeZip(`chrome/v${version}.zip`)
		zipFirefox.writeZip(`firefox/v${version}.zip`)
		
		console.log("> ✅ manifest & zip files created!")
	} catch(err) {
		console.error("There was an error:", err)
	}
}
buildExtension()
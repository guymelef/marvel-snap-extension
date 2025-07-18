require('dotenv').config()

const cheerio = require('cheerio')
const clipboardy = require('node-clipboardy')



const scrapeSnap = async () => {
	const date = process.argv[2]
	const type = process.argv[3]
  if (!date || !type) return console.log(`❌ Missing date and/or type`)

  // SNAP balance changes html
  const htmlToScrape = ``
  const $ = cheerio.load(htmlToScrape)
  
  let cardNames = []
  $('h5').each((_, x) => cardNames.push($(x).text().trim()))

  let cardChanges = []
  $('ul').each((_, list) => {
    let change = {
      name: "",
      changes: []
    }

    $(list).find('li').each((_, item) => {
      change.changes.push($(item).text().replace('[Old] ','').replace('[Old]','').replace('[Change] ','').replace('[Change]','').replace('[Changes] ','').replace('[Changes]','').replace('[New] ','').replace('[New]','').replace('>','->'))
    })

    cardChanges.push(change)
  })

  const numberOfChanges = cardChanges.length
  console.log('🆕 BALANCE CHANGES:\n', cardChanges)
  cardChanges = {
    "date": date,
    "type": type,
    "items": cardChanges
  }
  clipboardy.writeSync(JSON.stringify(cardChanges, null, 2))
  console.log(`✅ Copied to clipboard`)
  console.log(`✨ Found [${numberOfChanges}] changes`)
  console.log('🎴 CARD NAMES:', cardNames.join(', '))
}

scrapeSnap()
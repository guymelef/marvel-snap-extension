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
  
  let changes = []
  $('ul').each((_, list) => {
    let change = {
      name: "",
      changes: []
    }

    $(list).find('li').each((index, item) => {
      if (index === 0) change.name = $(item).text().trim()
      else change.changes.push($(item).text().replace('[Old] ','').replace('[Old]','').replace('[Change] ','').replace('[Change]','').replace('[New] ','').replace('[New]',''))
    })

    changes.push(change)
  })

  const numberOfChanges = changes.length
  console.log(changes)
  changes = {
    "date": date,
    "type": type,
    "changes": changes
  }
  clipboardy.writeSync(JSON.stringify(changes, null, 2))
  console.log(`✅ Copied to clipboard!`)
  console.log(`✨ Found ${numberOfChanges} changes.`)
}

scrapeSnap()
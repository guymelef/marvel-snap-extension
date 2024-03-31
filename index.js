const buttonsSection = document.querySelector('.section-buttons')
const categoryButtons = document.querySelectorAll('.btn-category')
const searchForm = document.querySelector('.search-form')
const searchBox = document.querySelector('.search-term')
const searchResult = document.querySelector('.section-search-result')
const controlsSection = document.querySelector('.section-controls')
const randomizeBtn = document.querySelector('.btn-randomize')
const deckBuilderBtn = document.querySelector('.btn-deck-builder')
const countdownSection = document.querySelector('.section-countdown')
const seasonHeader = document.querySelector('.season-calendar')
const countdownTimer = document.querySelector('.countdown-timer')
const modal = document.querySelector('.section-modal')
const modalCloseBtn = document.querySelector('.modal-close-btn')

const borderColor = {
	card: "#2973C4",
	location: "#108800",
	bot: "#e50a10"
}
let controlsAreHidden = false
let CATEGORY = 'card'
let CARD_TO_DISPLAY = ""
let LAST_RANDOM_INDEX = 0
let BOTS = []
let CARDS = []
let LOCATIONS = []
const FEATURED_LOCATIONS = ['Krakoa', 'Utopia']

buttonsSection.onclick = handleCategoryBtnClick
searchBox.onclick = handleSearchBoxClick
searchForm.onsubmit = handleFormSubmit
randomizeBtn.onclick = getRandomCard
deckBuilderBtn.onclick = redirectToDeckBuilder
seasonHeader.onclick = showModal
modalCloseBtn.onclick = _ => showModal(false)
modal.onclick = ({ target }) => { target === modal && showModal(false) }

startApp()

async function startApp() {
	startCountdown()

	try {
		let allCards = await fetch(`./data/cards.json`)
		allCards = await allCards.json()
		CARDS = allCards
	
		let allLocations = await fetch(`./data/locations.json`)
		allLocations = await allLocations.json()
		LOCATIONS = allLocations

		let allBots = await fetch(`./data/bots.json`)
		allBots = await allBots.json()
		BOTS = allBots

		displayFeaturedCard()
		searchBox.focus()
	} catch(err) {
		console.error("ERROR FETCHING DATA:", err)
	}
}

function handleCategoryBtnClick(event) {
	const classList = [...event.target.classList]
	if (classList.includes('btn-category')) {
		const prevCategory = CATEGORY
		CATEGORY = event.target.id
		if (prevCategory === CATEGORY) return searchBox.focus()

		searchBox.value = ""
		if (CATEGORY === "bot") {
			controlsSection.classList.remove('show-controls')
			controlsSection.classList.add('hide-controls')
			controlsAreHidden = true
		} else {
			if (prevCategory !== CATEGORY) displayFeaturedCard()

			if (controlsAreHidden) {
				controlsSection.classList.remove('hide-controls')
				controlsSection.classList.add('show-controls')
			} else {
				controlsAreHidden = false
			}
			randomizeBtn.style.setProperty('--btn-color', borderColor[CATEGORY])
		}

		categoryButtons.forEach(btn => {
			if (btn.id !== CATEGORY) {
				btn.style.backgroundColor = borderColor[btn.id]
				btn.style.color = "#FCFCFC"
				btn.classList.remove(`btn-${btn.id}-select`)
			} else {
				btn.style.color = borderColor[btn.id]
				btn.style.backgroundColor = "#FCFCFC"
				btn.classList.add(`btn-${btn.id}-select`)
			}
		})

		searchBox.style.borderColor = borderColor[CATEGORY]
		searchBox.style.caretColor = borderColor[CATEGORY]
		searchBox.placeholder = `${CATEGORY.charAt(0).toUpperCase() + CATEGORY.slice(1)} search...`
		searchBox.focus()
	}
}

function handleSearchBoxClick() {
	searchBox.value = ""
	let placeholderText = ""
	if (CATEGORY === "bot") placeholderText = "Bot check (case-sensitive)"
	searchBox.placeholder = placeholderText
}

function handleFormSubmit(event) {
  event.preventDefault()
  const searchTerm = searchBox.value.trim()
  if (!searchTerm || searchTerm.length < 3) return

  const cardToDisplay = findClosest(searchTerm)
	if (!cardToDisplay) {
		searchBox.style.borderColor = "#dbcece"
		searchBox.classList.toggle('animate-searchbox')
		searchBox.value = ""
		searchBox.placeholder = `${['😓','😩','😵'][Math.floor(Math.random() * 3)]} Snap, ${CATEGORY} not found!`

		setTimeout(() => {
			searchBox.classList.toggle('animate-searchbox')
			searchBox.style.borderColor = borderColor[CATEGORY]
		}, 1200)
	} else {
		if (CATEGORY === "bot") {
			searchBox.value = `🤖 [${cardToDisplay.type}]`
		} else {
			displayCard(cardToDisplay)
			searchBox.value = ""
			searchBox.placeholder = `${CATEGORY.charAt(0).toUpperCase() + CATEGORY.slice(1)} search...`
		}
	}
}

function getRandomCard() {
  searchBox.focus()

	let cardPool = []
	if (CATEGORY === 'card') cardPool = CARDS.filter(card => card.type === "character" && card.released)
	else cardPool = LOCATIONS

	const randomIndex = Math.floor(Math.random() * cardPool.length)
	if (CARD_TO_DISPLAY === cardPool[randomIndex].name) return getRandomCard()
	else LAST_RANDOM_INDEX = randomIndex

	const cardToDisplay = cardPool[randomIndex]
	displayCard(cardToDisplay, true)
}

function displayCard(card, isRandom) {
	let type = CATEGORY
	let htmlStr = ''
	let source = ''
	let sourceClass = ''
	CARD_TO_DISPLAY = card.name
	const imgFolder = type.charAt(0).toUpperCase() + type.slice(1)
	const [imgId, imgVersion, imgName] = card.image.split('/')
	let imgSrc = `https://res.cloudinary.com/dekvdfhbv/image/upload/${imgId}/${imgVersion}/Marvel%20SNAP/${imgFolder}s/${imgName}.webp`

	if (card.ability) {
		card.ability = card.ability.replaceAll("On Reveal:", "<b>On Reveal:</b>")
		card.ability = card.ability.replaceAll("On Reveal", "<b>On Reveal</b>")
		card.ability = card.ability.replaceAll("Ongoing:", "<b>Ongoing:</b>")
		card.ability = card.ability.replaceAll("Ongoing", "<b>Ongoing</b>")
	}

	if (type === "card") {
		if (card.evolved) {
			card.evolved = card.evolved.replaceAll("On Reveal:", "<b>On Reveal:</b>")
			card.evolved = card.evolved.replaceAll("Ongoing:", "<b>Ongoing:</b>")
		}

		if (card.series === "Season Pass") {
			source = "Season Pass"
			sourceClass = "season-pass"
		} else {
			if (card.series) {
				if (card.series === "NA") {
					source = "Unreleased"
					sourceClass = "unreleased"
				} else {
					source = `Series ${card.series}`
					sourceClass = `series${card.series}`
				}
			} else {
				source = "Summon"
				sourceClass = 'summon'
			}
		}
		
		if (card.text) card.ability = `<span><i>${card.text}</i></span>`
		htmlStr = `
			<h2 
				class="card-title"
				style="--h2-border:${isRandom ? "#e50a10" : borderColor[type]}; --h2-shadow: ${borderColor[type]}"
			>
				${card.name}
			</h2>
			<h3 class="secondary-text">
				<span class="stats-text text-cost">Cost</span>:<span class="card-stats cost">${card.cost}</span> 
				<span class="stats-text text-power">Power</span>:<span class="card-stats power">${card.power}</span>
			</h3>
			<p class="card-ability ${card.evolved ? 'evolved-card' : ''}">
				${card.ability}
				${card.evolved ? `<b class="evolved-text">Evolved</b>: ${card.evolved}` : ''}
			</p>
		`
	} else if (type === "location") {
		htmlStr = `
			<h2 
				class="card-title"
				style="--h2-border:${isRandom ? "#e50a10" : borderColor[type]}; --h2-shadow: ${borderColor[type]}"
			>
				${card.name}
			</h2>
			<p class="card-ability">
				${card.ability}
			</p>
		`
	}

	searchResult.innerHTML = ""
	searchResult.innerHTML = `
		<div class="search-result-img" id="${type}-img-div">
			<img
				class="card-img card-img-${type}"
				src="${imgSrc}"
				alt="${card.name}"
				loading="eager"
			>
			<p class="search-result-info-source">
				<span class="secondary-text source-origin ${sourceClass}">${source}</span>
			</p>
		</div>
		<div class="search-result-info ${type}-search-result">
			${htmlStr}
		</div>
	`

	const cardImg = document.querySelector('.card-img')
	cardImg.onload = () => {
		cardImg.classList.add(`animate-${type}`)
		document.querySelector('.search-result-info-source').style.animation = "fade-in 300ms ease-in-out 200ms forwards"
	}
	cardImg.onerror = function() { this.src = `images/${type}.webp` }
}

function displayFeaturedCard() {
	if (CATEGORY === 'card') {
		const featuredCard = CARDS.find((card, index) => {
			if (card.series === "Season Pass") {
				LAST_RANDOM_INDEX = index
				return card
			}
		})
		displayCard(featuredCard)
	} else if (CATEGORY === 'location') {
		const randomIndex = Math.floor(Math.random() * 2)
		const featuredLocation = LOCATIONS.find((card, index) => {
			if (card.name === FEATURED_LOCATIONS[randomIndex]) {
				LAST_RANDOM_INDEX = index
				return card
			}
		})
		displayCard(featuredLocation)
	}
}

function showModal(show = true) {
	if (show) {
		modal.style.display = "block"
	} else {
		modal.scrollTop = 0
		modal.style.display = "none"
	}
}

function startCountdown() {
	let year = 2024
	let month = 3
	let date = 2

	let SEASON_END = new Date(Date.UTC(year, month, date, 19))
	const x = setInterval(_ => {
		const timeDifference = SEASON_END - new Date()

		if (timeDifference <= 0) {
			countdownTimer.textContent = "NEW SEASON BEGINS!🎉"
			return clearInterval(x)
		}

		const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24)).toString().padStart(2, 0)
		const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, 0)
		const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, 0)
		const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000).toString().padStart(2, 0)
		
		countdownTimer.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`
	}, 1000)

	setTimeout(_ => countdownSection.style.visibility = "visible", 1000)
}

function redirectToDeckBuilder(event) {
	event.preventDefault()
	document.querySelector('.content').classList.add('fade-out')
	setTimeout(() => window.location.href = `builder.html?card=${CARD_TO_DISPLAY}`, 250)
}

function findClosest(str) {
	const type = CATEGORY
	let data = []
	if (type === "location") data = LOCATIONS

	if (type === "bot") {
		data = BOTS
		return data.find(bot => bot.name === str)
	}

	str = str.trim().replace(/ +/g, ' ').toLowerCase()
	if (type === "card") {
		data = CARDS

		if (str.length < 3) return null
		str = str.replace('dr ','doctor ')
		str = str.replace('dr. ','doctor ')
		str = str.replace('mr ','mister ')
		str = str.replace('mr. ','mister ')
	}
	
	let closestMatch = null
	let strippedMatch = null
	let partialMatch = null
	let wordMatch = null
	const closestDistArr = []
	
	for (const item of data) {
		const itemName = item.name.toLowerCase()
		const strippedItemName = itemName.replace(/[\W_]/g, '')
		const strippedKeyword = str.replace(/[\W_]/g, '')

		if (itemName === str) {
			closestMatch = item
			break
		}

		if (strippedItemName === strippedKeyword) {
			strippedMatch = item
		}

		if (!partialMatch && strippedItemName.includes(strippedKeyword)) {
			partialMatch = item
			if (itemName > str) break
		}

		const cardNameArr = itemName.split(/[\W_]/)
		const strArr = str.split(/[\W_]/)
		if (!wordMatch && cardNameArr.length > 1 && strArr.length > 1) {
			let match = 0
			for (let word of strArr) {
				if (itemName.includes(word)) match++
			}

			if (match === strArr.length) wordMatch = item
		}

		if (!closestMatch && !strippedMatch && !partialMatch && !wordMatch) {
			closestDistArr.push(levenshtein(itemName, str))
		}
	}

	closestMatch = closestMatch || strippedMatch || partialMatch || wordMatch

	if (!closestMatch) {
		const min = Math.min(...closestDistArr)
		if (min === str.length) return

		const minCount = []
		closestDistArr.forEach((x, index) => {
			if (x === min) minCount.push(index)
		})

		if (minCount.length === 1) {
			closestMatch = data[closestDistArr.indexOf(min)]
		}

		if (minCount.length > 1) {
			const nearest = minCount.find(i => 
				data[i].name.toLowerCase()[0] === str[0]
			)
			if (nearest) closestMatch = data[nearest]
		}
	}

	return closestMatch
}

function levenshtein(s, t) {
	if (s === t) {
			return 0;
	}
	var n = s.length, m = t.length;
	if (n === 0 || m === 0) {
			return n + m;
	}
	var x = 0, y, a, b, c, d, g, h;
	var p = new Uint16Array(n);
	var u = new Uint32Array(n);
	for (y = 0; y < n;) {
			u[y] = s.charCodeAt(y);
			p[y] = ++y;
	}

	for (; (x + 3) < m; x += 4) {
			var e1 = t.charCodeAt(x);
			var e2 = t.charCodeAt(x + 1);
			var e3 = t.charCodeAt(x + 2);
			var e4 = t.charCodeAt(x + 3);
			c = x;
			b = x + 1;
			d = x + 2;
			g = x + 3;
			h = x + 4;
			for (y = 0; y < n; y++) {
					a = p[y];
					if (a < c || b < c) {
							c = (a > b ? b + 1 : a + 1);
					}
					else {
							if (e1 !== u[y]) {
									c++;
							}
					}

					if (c < b || d < b) {
							b = (c > d ? d + 1 : c + 1);
					}
					else {
							if (e2 !== u[y]) {
									b++;
							}
					}

					if (b < d || g < d) {
							d = (b > g ? g + 1 : b + 1);
					}
					else {
							if (e3 !== u[y]) {
									d++;
							}
					}

					if (d < g || h < g) {
							g = (d > h ? h + 1 : d + 1);
					}
					else {
							if (e4 !== u[y]) {
									g++;
							}
					}
					p[y] = h = g;
					g = d;
					d = b;
					b = c;
					c = a;
			}
	}

	for (; x < m;) {
			var e = t.charCodeAt(x);
			c = x;
			d = ++x;
			for (y = 0; y < n; y++) {
					a = p[y];
					if (a < c || d < c) {
							d = (a > d ? d + 1 : a + 1);
					}
					else {
							if (e !== u[y]) {
									d = c + 1;
							}
							else {
									d = c;
							}
					}
					p[y] = d;
					c = a;
			}
			h = d;
	}

	return h;
}
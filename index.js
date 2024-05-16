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
let isChrome = false
let controlsAreHidden = false
let CATEGORY = 'card'
let CARD_TO_DISPLAY = ""
let LAST_RANDOM_INDEX = 0
let BOTS = []
let CARDS = []
let LOCATIONS = []
let FEATURED_CARD = ''
let FEATURED_LOCATIONS = []
let SEASON_END_DATE = []
let SEASON_INFO = {}

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
	isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1

	try {
		let allCards = await fetch('./data/cards.json')
		allCards = await allCards.json()
		CARDS = allCards
	
		let allLocations = await fetch('./data/locations.json')
		allLocations = await allLocations.json()
		LOCATIONS = allLocations

		let allBots = await fetch('./data/bots.json')
		allBots = await allBots.json()
		BOTS = allBots

		let seasonDetails = await fetch('./data/season.json')
		seasonDetails = await seasonDetails.json()
		SEASON_INFO = seasonDetails.info
		FEATURED_CARD = SEASON_INFO.featuredCard
		FEATURED_LOCATIONS = SEASON_INFO.featuredLocations
		SEASON_END_DATE = SEASON_INFO.seasonEndDate

		startCountdown()
		displayFeaturedCard()
		renderModalContent(seasonDetails.events, seasonDetails.styles)
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
	
	let image = ''
	if (card.noArt) {
		image = 'default'
	} else {
		image = card.name.toLowerCase()
		image = image.replace(/ /g, '-').replace(/[^\w-]/g, '')
	}
	const imgSrc = `https://files.guymelef.dev/${type}/${image}.webp`

	if (card.ability) card.ability = card.ability.replace(/On Reveal|Ongoing/g, match => match && `<b>${match}</b>`)

	if (type === "card") {
		if (card.evolved) card.evolved = card.evolved.replace(/On Reveal|Ongoing/g, match => match && `<b>${match}</b>`)

		if (card.name === FEATURED_CARD) {
			source = "Season Pass"
			sourceClass = "season-pass"
		} else {
			if (card.series) {
				if (card.series === "NA") {
					source = "Unreleased"
					sourceClass = "unreleased"
				} else if (['1', '2', '3', '4', '5'].includes(card.series)) {
					source = `Series ${card.series}`
					sourceClass = `series${card.series}`
				} else {
					source = 'Series 5'
					sourceClass = 'series5'
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
				${card.displayName || card.name}
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
			${type === 'card' ?
				`
					<p class="search-result-info-source">
						<span class="secondary-text source-origin ${sourceClass}">${source}</span>
					</p>
				`
				: ''
			}
		</div>
		<div class="search-result-info ${type}-search-result">
			${htmlStr}
		</div>
	`

	const cardImg = document.querySelector('.card-img')
	cardImg.onload = () => {
		document.querySelector('.search-result-img').style.background = "none"
		if (type === 'location') {
			cardImg.classList.add('animate-location')
			cardImg.classList.add(`animate-location-${isChrome ? 'chrome' : 'others'}`)
		} else {
			cardImg.classList.add('animate-card')
			document.querySelector('.search-result-info-source').style.animation = "fade-in 300ms ease-in-out 200ms forwards"
		}
	}
	cardImg.onerror = function() { this.src = `images/${type}.webp` }
}

function displayFeaturedCard() {
	if (CATEGORY === 'card') {
		const featuredCard = CARDS.find((card, index) => {
			if (card.name === FEATURED_CARD) {
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

function renderModalContent(events, styles) {
	const seasonLink =	document.querySelector('.season-link')
	seasonLink.innerText  = SEASON_INFO.seasonTitle
	seasonLink.href = SEASON_INFO.seasonUrl
	
	document.documentElement.style.setProperty('--clr-date', styles.dateColor)
	const modalHeader = document.querySelector('.modal-content-header')
	const modalHeaderStyle = styles.headerStyle
	const modalHeaderStyleHover = styles.hoverStyle
	for (let prop in modalHeaderStyle) modalHeader.style[prop] = modalHeaderStyle[prop]
	modalHeader.onmouseenter = _ => { for (let prop in modalHeaderStyleHover) modalHeader.style[prop] = modalHeaderStyleHover[prop] }
	modalHeader.onmouseleave = _ => { 
		for (let prop in modalHeaderStyleHover) {
			modalHeader.style[prop] = ""
			if (modalHeaderStyle[prop]) modalHeader.style[prop] = modalHeaderStyle[prop]
		}
	}

	let modalContent = ''
	events.forEach(event => {
		if (event.title === 'New Characters') {
			let listItems = ''
			event.items.forEach((item, index) => {
				if (index === 0) {
					listItems += `<li class="list-item" aria-label="season pass card"><span class="list-padding season-pass">${item.name}</span></li>`
				} else if (index === event.items.length - 1) {
					listItems += `<li class="list-item"><span class="list-padding series${item.series}">${item.name}</span><span style="color:var(--clr-gold)">＊</span></li>`
				} else {
					listItems += `<li class="list-item"><span class="list-padding series${item.series}">${item.name}</span></li>`
				}
			})
			modalContent += `
				<div>
					<h3>☄️ ${event.title}</h3>
					<ul class="styled-list">
						${listItems}
					</ul>
				</div>
			`
		}

		if (event.title === 'New Locations') {
			let listItems = ''
			event.items.forEach(item => {
				listItems += `<li class="list-item"><span class="list-padding highlight-location">${item}</span></li>`
			})
			modalContent += `
				<div>
					<h3>🗺️ ${event.title}</h3>
					<ul class="styled-list">
						${listItems}	
					</ul>
				</div>
			`
		}

		if (event.title === 'Spotlight Caches') {
			let listItems = ''
			event.items.forEach(item => {
				let cacheList = ''
				item.items.forEach(item => {
					cacheList += `<li class="list-item"><span class="list-padding series${item.series}">${item.name}</span></li>`
				})
				listItems += `
					<li>
						<strong class="date">${item.date}</strong>
						<ul class="styled-list">
							${cacheList}
						</ul>
					</li>
				`
			})
			modalContent += `
				<div>
					<h3>🗝️ ${event.title}</h3>
					<ul class="event">
						${listItems}	
					</ul>
				</div>
			`
		}

		if (event.title === 'New Albums') {
			let albumItems = ''
			event.items.forEach(item => {
				let listItems = ''
				item.items.forEach(item => {
					const [count, reward] = item.split(':')
					listItems += `<li class="list-item">Collect ${count}: <span class="event-list secondary-text">${reward}</span></li>`
				})
				albumItems += `
					<li>
						<details>
							<summary><strong class="date">${item.date}</strong> 🔹 ${item.name}</summary>
							<ul class="styled-list">
								${listItems}
							</ul>
						</details>
					</li>
				`
			})
			modalContent += `
				<div class="albums">
					<h3>🖼️ ${event.title}</h3>
					<ul class="event">
						${albumItems}	
					</ul>
				</div>
			`
		}

		if (event.title === 'Shop Takeover') {
			let listItems = ''
			event.items.forEach(item => {
				let cards = ''
				item.cards.forEach(card => cards +=  `<li class="list-item">${card}</li>`)
				listItems += `
					<li>
						<details>
							<summary><strong class="date">${item.date}</strong> 🔹 ${item.name}</summary>
							<ul class="styled-list">
								${cards}
							</ul>
						</details>
					</li>
				`
			})
			modalContent += `
				<div class="shop-takeover">
					<h3>🎨 ${event.title}</h3>
					<ul class="event">
						${listItems}	
					</ul>
				</div>
			`
		}

		if (event.title === 'Twitch Drops') {
			let listItems = ''
			event.items.forEach(item => {
				const [hour, reward] = item.split(':')
				listItems += `<li class="list-item">Watch ${hour} hours: <span class="event-list secondary-text">${reward}</span></li>`
			})
			modalContent += `
				<div>
					<h3>🎁 ${event.title}</h3>
					<ul class="event">
						<li>
							<details>
								<summary><strong class="date">${event.date}</strong></summary>
								<ul class="styled-list">
									${listItems}
								</ul>
							</details>
						</li>
					</ul>
				</div>
			`
		}

		if (event.title === '7-Day Login' && event.items.length) {
			let listItems = ''
			event.items.forEach(item => {
				let loginRewards = ''
				item.items.forEach((item, index) => loginRewards += `<li class="list-item">Day ${index + 1}: <span class="event-list secondary-text">${item}</span></li>`)
				listItems += `
					<li>
						<details>
							<summary><strong class="date">${item.date}</strong> ${item.title ? `🔸 ${item.title}` : ''}</summary>
							<ul class="styled-list">
								${loginRewards}
							</ul>
						</details>
					</li>
				`
			})
			modalContent += `
				<div>
					<h3>📆 ${event.title}</h3>
					<ul class="event">
						${listItems}
					</ul>
				</div>
			`
		}

		if (event.title === 'Balance Updates' && event.items.length) {
			let changes = ''
			event.items.forEach(item => {
				let listItems = ''
				item.items.forEach(item => {
					listItems += `
						<li>
							<h4>${item.name}</h4>
							<p>⬅️ ${item.changes[0]}</p>
							<p>➡️ ${item.changes[1]}</p>
						</li>
					`
				})
				changes += `
					<li>
						<details>
							<summary><strong class="date">${item.date}</strong> 🔸 ${item.type}</summary>
							<ul>
								${listItems}
							</ul>
						</details>
					</li>
				`
			})
			modalContent += `
				<div class="patch-ota">
					<h3>♻️ ${event.title}</h3>
					<ul class="event">
						${changes}
					</ul>
				</div>
			`
		}

		if (event.title === "Series Drop" && event.items.length) {
			let seriesDrop = ''
			event.items.forEach(item => {
				seriesDrop += `
					<li>
						<details>
							<summary><strong class="date">${event.date}</strong> 🔸 ${item.name}</summary>
							<ul class="styled-list">
								${item.cards.map(card => `<li class="list-item">${card}</li>`).join('')}
							</ul>
						</details>
					</li>
				`
			})
			modalContent += `
				<div>
					<h3>⏬ ${event.title}</h3>
					<ul class="event">
						${seriesDrop}
					</ul>
				</div>
			`
		}
	})

	document.querySelector('.season-details').innerHTML = modalContent
}

function startCountdown() {
	const [date, month, year] = SEASON_END_DATE
	const SEASON_END = new Date(Date.UTC(year, month, date, 19))

	const x = setInterval(_ => {
		const timeDifference = SEASON_END - new Date()

		if (timeDifference <= 0) {
			countdownTimer.textContent = "NEW SEASON! 🎉"
			FEATURED_CARD = SEASON_INFO.nextFeaturedCard
			FEATURED_LOCATIONS = SEASON_INFO.nextFeaturedLocations
			SEASON_END_DATE = SEASON_INFO.nextSeasonEndDate
			displayFeaturedCard()
			clearInterval(x)
			return startCountdown()
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
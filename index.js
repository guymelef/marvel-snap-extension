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
const refCardsSection = document.querySelector('.section-ref-cards')
const modalCloseBtn = document.querySelector('.modal-close-btn')
const modalScrollToTopBtn = document.querySelector('.modal-scrolltotop')
const cardInfoTooltip = document.querySelector('.card-info')

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
let COUNTDOWN_INTERVAL
let SEASON_INFO = {}
let SEASON_STYLES = {}
let SEASON_EVENTS = []

buttonsSection.onclick = handleCategoryBtnClick
searchBox.onclick = handleSearchBoxClick
searchForm.onsubmit = handleFormSubmit
randomizeBtn.onclick = getRandomCard
deckBuilderBtn.onclick = redirectToDeckBuilder
seasonHeader.onclick = showModal
modalCloseBtn.onclick = _ => showModal(false)
modal.onclick = ({ target }) => { target === modal && showModal(false) }
modal.onscroll = handleModalScroll
modalScrollToTopBtn.onclick = _ => modal.scrollTo({ top:0, behavior:"smooth" })

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
		SEASON_EVENTS = seasonDetails.events
		SEASON_STYLES = seasonDetails.styles

		startCountdown()
		displayFeaturedCard()
		renderModalContent()
		searchBox.focus()
		addHoverListenersToCards()
		checkForUpdates()
	} catch(err) {
		console.error("ERROR FETCHING DATA:", err)
	}
}

function checkForUpdates() {
	fetch('https://guymelef.dev/data/snap-extn/update.json')
		.then(data => data.json())
		.then(data => {
			if (data.isUpdateAvailable) {
				if (data.partsToUpdate.includes('cards')) {
					for (const updatedCard of data.cards) {
						const index = CARDS.findIndex(card => card.id === updatedCard.id)
						if (index !== -1) CARDS[index] = updatedCard
						else CARDS.push(updatedCard)

						if (updatedCard.name === FEATURED_CARD) displayFeaturedCard()
					}
				}

				if (data.partsToUpdate.includes('locations')) {
					for (const updatedLocation of data.locations) {
						const index = LOCATIONS.findIndex(location => location.id === updatedLocation.id)
						if (index !== -1) LOCATIONS[index] = updatedLocation
						else LOCATIONS.push(updatedLocation)
					}
				}

				if (data.partsToUpdate.includes('events')) {					
					data.seasonEvents.forEach(event => {
						SEASON_EVENTS.forEach((item, index) => {
							if (item.title === event.title) {
								SEASON_EVENTS[index] = event
							}
						})
					})

					renderModalEvents()
				}

				if (data.partsToUpdate.includes('seasonInfo')) SEASON_INFO = data.seasonInfo[0]

				if (data.partsToUpdate.includes('seasonStyles')) SEASON_STYLES = data.seasonStyles[0]

				if (data.partsToUpdate.includes('season')) {
					SEASON_INFO = data.seasonInfo[0]
					SEASON_STYLES = data.seasonStyles[0]
					SEASON_EVENTS = data.seasonEvents
					FEATURED_CARD = SEASON_INFO.featuredCard
					FEATURED_LOCATIONS = SEASON_INFO.featuredLocations
					SEASON_END_DATE = SEASON_INFO.seasonEndDate
					displayFeaturedCard()
					clearInterval(COUNTDOWN_INTERVAL)
					startCountdown()
				}

				if (data.partsToUpdate.includes('season') || data.partsToUpdate.includes('seasonInfo') || data.partsToUpdate.includes('seasonStyles')) {
					renderModalContent()
				}

				addHoverListenersToCards()
			}
		})
		.catch(err => console.error("ERROR FETCHING UPDATES:", err))
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
  if (!searchTerm) return

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
	refCardsSection.innerHTML = ''

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
	
	const imgSrc = generateCardImgSrc(card, type)

	if (card.ability) card.ability = card.ability.replace(/On Reveal|Ongoing|Activate|Game Start|End of Turn/g, match => match && `<b>${match}</b>`)

	if (type === "card") {
		if (card.evolved) card.evolved = card.evolved.replace(/On Reveal|Ongoing|Activate|Game Start|End of Turn/g, match => match && `<b>${match}</b>`)

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
					source = card.series
					sourceClass = 'event-card'
				}
			} else {
				source = card.type === 'token' ? 'Token' : 'Skill'
				sourceClass = card.type
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
				${card.type !== 'skill' ? `<span class="stats-text text-power">Power</span>:<span class="card-stats power">${card.power}</span>` : ''}
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

	if (card.refs || card.locRefs) renderRefCardsSection(card.refs || card.locRefs, card.refs)
	else refCardsSection.innerHTML = ''
}

function displayFeaturedCard() {
	if (CATEGORY === 'card') {
		const featuredCard = CARDS.find((card, index) => {
			if (card.name === FEATURED_CARD) {
				LAST_RANDOM_INDEX = index
				return card
			}
		})
		displayCard({...featuredCard})
	} else if (CATEGORY === 'location') {
		const randomIndex = Math.floor(Math.random() * 2)
		const featuredLocation = LOCATIONS.find((card, index) => {
			if (card.name === FEATURED_LOCATIONS[randomIndex]) {
				LAST_RANDOM_INDEX = index
				return card
			}
		})
		displayCard({...featuredLocation})
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

function generateCardImgSrc(card, type) {
	let image = ''
	if (card.noArt) {
		image = 'default'
	} else {
		image = card.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
		image = image.replace(/ /g, '-').replace(/[^\w-]/g, '')
	}
	
	return `https://files.guymelef.dev/${type}/${image}.webp`
}

function renderRefCardsSection(refs, isCardRef) {
	refCardsSection.innerHTML = ''
	let cards = []
	const cardSource = isCardRef ? CARDS : LOCATIONS
	
	refs.forEach(id => {
		let refCard = cardSource.find(card => card.id === id)
		cards.push(refCard)
	})

	cards.forEach(card => card.src = generateCardImgSrc(card, isCardRef ? 'card' : 'location'))

	refCardsSection.innerHTML = cards.map(card => {
		let cardAbility
		if (card.ability) cardAbility = card.ability.replace(/<mark>|<\\mark>/g, '')
		else if (card.evolved) cardAbility = card.evolved
		else cardAbility = `<i>${card.text}</i>`
		
		return `
			<div class="ref-cards">
				<img src=${card.src} alt='${card.name}' width='150px'>
				<p>
					<strong>${card.name}</strong>
					<br>
					${cardAbility}
				</p>
			</div>
		`
	}).join('<hr>')

	document.querySelectorAll('mark').forEach(mark => mark.onmouseover = () => {
		refCardsSection.style.display = 'block'
		refCardsSection.scrollTop = 0
	})
	
	refCardsSection.onmouseleave = () => refCardsSection.style.display = 'none'
}

function renderModalContent() {
	const styles = SEASON_STYLES
	const seasonLink =	document.querySelector('.season-link')
	seasonLink.innerText = SEASON_INFO.seasonTitle
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

	renderModalEvents()
}

function generateHtmlForEvent(event) {
	if (event.title === 'New Characters') {
		let listItems = ''
		event.items.forEach((item, index) => {
			let seriesFlair = item.series === 'Ltd. Time Event' ? 'event-card' : `series${item.series}`
			if (index === 0) {
				listItems += `<li class="list-item" aria-label="season pass card"><span class="highlight-card hoverable season-pass">${item.name}</span></li>`
			} else if (index === event.items.length - 1) {
				listItems += `<li class="list-item"><span class="highlight-card hoverable ${seriesFlair}">${item.name}</span><span style="color:var(--clr-gold)">＊</span></li>`
			} else {
				listItems += `<li class="list-item"><span class="highlight-card hoverable ${seriesFlair}">${item.name}</span></li>`
			}
		})
		
		return `
			<div class="season-events">
				<h3>☄️ ${event.title}</h3>
				<ul class="styled-list">
					${listItems}
				</ul>
			</div>
		`
	}

	if (event.title === 'New Locations') {
		let listItems = event.items.map(loc => `<li class="list-item"><span class="highlight-card highlight-location hoverable">${loc}</span></li>`)
		
		return `
			<div class="season-events">
				<h3>🗺️ ${event.title}</h3>
				<ul class="styled-list">
					${listItems.join('')}
				</ul>
			</div>
		`
	}

	if (event.title === 'Spotlight Caches') {
		let listItems = ''
		event.items.forEach(item => {
			let cacheList = item.items.map(card => `<li class="list-item"><span class="highlight-card hoverable series${card.series}">${card.name}</span></li>`)
			listItems += `
				<li>
					<strong class="date">${item.date}</strong>
					<ul class="styled-list">
						${cacheList.join('')}
					</ul>
				</li>
			`
		})
		
		return `
			<div class="season-events">
				<h3>🗝️ ${event.title}</h3>
				<ul class="event">
					${listItems}	
				</ul>
			</div>
		`
	}

	if (event.title === 'New Albums' && event.items.length) {
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
						<summary><strong class="date">${item.date}</strong> 〰️ ${item.name}</summary>
						<ul class="styled-list">
							${listItems}
						</ul>
					</details>
				</li>
			`
		})
		
		return `
			<div class="season-events albums">
				<h3>🖼️ ${event.title}</h3>
				<ul class="event">
					${albumItems}	
				</ul>
			</div>
		`
	}

	if (event.title === 'Shop Takeover' && event.items.length) {
		let listItems = ''
		event.items.forEach(item => {
			let cards = item.cards.map(card => `<li class="list-item"><span class="hoverable">${card}</span></li>`)
			listItems += `
				<li>
					<details>
						<summary><strong class="date">${item.date}</strong> 💠 ${item.name}</summary>
						<ul class="styled-list">
							${cards.join('')}
						</ul>
					</details>
				</li>
			`
		})
		
		return `
			<div class="season-events shop-takeover">
				<h3>🎨 ${event.title}</h3>
				<ul class="event">
					${listItems}	
				</ul>
			</div>
		`
	}

	if (event.title === 'Twitch Drops' && event.items.length) {
		let listItems = ''
		event.items.forEach(item => {
			let twitchDrops = ''
			item.items.forEach(drop => {
				const [hour, reward] = drop.split(':')
				twitchDrops += `<li class="list-item">Watch ${hour} hours: <span class="event-list secondary-text">${reward}</span></li>`
			})
			listItems += `
				<li>
					<details>
						<summary><strong class="date">${item.date}</strong></summary>
						<ul class="styled-list">
							${twitchDrops}
						</ul>
					</details>
				</li>
			`
		})
		
		return `
			<div class="season-events">
				<h3>🎁 ${event.title}</h3>
				<ul class="event">
					${listItems}
				</ul>
			</div>
		`
	}

	if (event.title === 'Daily Login' && event.items.length) {
		let listItems = ''
		event.items.forEach(item => {
			let loginRewards = item.items.map((reward, index) => `<li class="list-item">Day ${index + 1}: <span class="event-list secondary-text">${reward}</span></li>`)
			listItems += `
				<li>
					<details>
						<summary><strong class="date">${item.date}</strong> ${item.title ? `🔸 ${item.title}` : ''}</summary>
						<ul class="styled-list">
							${loginRewards.join('')}
						</ul>
					</details>
				</li>
			`
		})
		
		return `
			<div class="season-events">
				<h3>📆 ${event.title}</h3>
				<ul class="event">
					${listItems}
				</ul>
			</div>
		`
	}

	if (event.title === 'Features/Modes/Events' && event.items.length) {
		let listItems = ''
		event.items.forEach(item => {
			let itemInfo = item.items.map(i => `<li class="list-item">${i}</li>`)
			listItems += `
				<li>
					<details>
						<summary><strong class="date">${item.date}</strong> ◾️ ${item.title}</summary>
						<ul class="styled-list">
							${itemInfo.join('')}
						</ul>
					</details>
				</li>
			`
		})
		
		return `
			<div class="season-events">
				<h3>🎮 ${event.title}</h3>
				<ul class="event">
					${listItems}
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
						<summary>
							Drop to <span class="highlight-card ${item.name.toLowerCase().split(' ').join('')}">${item.name}</span>
						</summary>
						<ul class="styled-list">
							${item.cards.map(card => `<li class="list-item"><span class="hoverable">${card}</span></li>`).join('')}
						</ul>
					</details>
				</li>
			`
		})
		
		return `
			<div class="season-events series-drop">
				<h3>⏬ ${event.title}</h3>
				<ul class="event">
					<li>
						<strong class="date">${event.date}</strong>
						<ul class="series-drop-ul">
							${seriesDrop}
						</ul>
					</li>
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
						${item.changes[0] && `<p>⬅️ ${item.changes[0]}</p>`}
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
		
		return `
			<div class="season-events patch-ota">
				<h3>♻️ ${event.title}</h3>
				<ul class="event">
					${changes}
				</ul>
			</div>
		`
	}
}

function renderModalEvents() {
	let modalContent = ''

	SEASON_EVENTS.forEach(event => {
		const htmlForEvent = generateHtmlForEvent(event)
		if (htmlForEvent) modalContent += htmlForEvent
	})

	document.querySelector('.season-details').innerHTML = modalContent
}

function addHoverListenersToCards() {
	document.querySelectorAll('.hoverable').forEach(el => {
		el.onmouseover = () => {
			const imageName = el.innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '-').replace(/[^\w-]/g, '')
			if ([...el.classList].includes('highlight-location')) {
				const cardToDisplay = LOCATIONS.find(card => card.name === el.innerText)
				cardInfoTooltip.innerHTML = `
					<img src="https://files.guymelef.dev/location/${imageName}.webp" alt="${cardToDisplay.name}" width="120px">
					<span>${cardToDisplay.ability.replace(/<mark>|<\\mark>/g, '')}</span>
				`
			} else {
				const cardToDisplay = CARDS.find(card => card.name === el.innerText)
				const source = ["Season Pass","Ltd. Time Event"].includes(cardToDisplay.series) ? cardToDisplay.series : `Series ${cardToDisplay.series}`
				cardInfoTooltip.innerHTML = `
					<img src="https://files.guymelef.dev/card/${imageName}.webp"
						alt="${cardToDisplay.name} | Series: ${cardToDisplay.series} | Cost: ${cardToDisplay.cost} | Power: ${cardToDisplay.power}"
						width="120px"
					>
					<span style="color:lime" class="secondary-text"><b>${source}</b></span>
					<span>${cardToDisplay.ability.replace(/<mark>|<\\mark>/g, '') || cardToDisplay.text}</span>
				`
			}
			cardInfoTooltip.style.display = "block"
			cardInfoTooltip.style.opacity = 1
		}

		el.onmouseout = () => {
			cardInfoTooltip.innerHTML = ""
			cardInfoTooltip.style.opacity = 0
			cardInfoTooltip.style.display = "none"
		}
	})
}

function handleModalScroll() {
	if (modal.scrollTop >= 400) modalScrollToTopBtn.style.display = 'block'
	else modalScrollToTopBtn.style.display = 'none'
}

function startCountdown() {
	const [date, month, year] = SEASON_END_DATE
	const SEASON_END = new Date(Date.UTC(year, month, date, 19))

	COUNTDOWN_INTERVAL = setInterval(_ => {
		const timeDifference = SEASON_END - new Date()

		if (timeDifference <= 0) {
			countdownTimer.textContent = "NEW SEASON! 🎉"
			FEATURED_CARD = SEASON_INFO.nextFeaturedCard
			FEATURED_LOCATIONS = SEASON_INFO.nextFeaturedLocations
			SEASON_END_DATE = SEASON_INFO.nextSeasonEndDate
			displayFeaturedCard()
			clearInterval(COUNTDOWN_INTERVAL)
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
		const strippedItemName = itemName.replace(/[\W_]/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "")
		const strippedKeyword = str.replace(/[\W_]/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "")

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
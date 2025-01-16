const cardsDiv = document.querySelector('.all-cards')
const deckDiv = document.querySelector('.deck-view')
const infoDiv = document.querySelector('.card-info')
const abilitySelector = document.querySelector('#card-ability')
const energySelector = document.querySelector('#card-energy')
const powerSelector = document.querySelector('#card-power')
const seriesSelector = document.querySelector('#card-series')
const propSorter = document.querySelector('#sort-category')
const orderSorter = document.querySelector('#sort-order')
const keywordSearcher = document.querySelector('#keyword-searcher')
const saveDeckBtn = document.querySelector('#save-deck-btn')
const importDeckBtn = document.querySelector('#import-deck-btn')
const resetSortAndFilterBtn = document.querySelector('#reset-controls-btn')
const resetAllBtn = document.querySelector('#reset-all-btn')
const toastMsg = document.querySelector('.toast-msg')
const modal = document.querySelector('.builder-modal')
const submitBtn = document.querySelector('.submit-deck-code-btn')

cardsDiv.onclick = throttle(addOrRemoveCardToDeck, 300)
deckDiv.onclick = throttle(addOrRemoveCardToDeck, 300)
cardsDiv.onmouseover = showCardInfo
cardsDiv.onmouseout = hideCardInfo
abilitySelector.onchange = handleFilterChange
energySelector.onchange = handleFilterChange
powerSelector.onchange = handleFilterChange
seriesSelector.onchange = handleFilterChange
propSorter.onchange = handleSortChange
orderSorter.onchange = handleSortChange
keywordSearcher.oninput = debounce(handleKeywordInput, 300)
saveDeckBtn.onclick = throttle(saveDeckToClipboard, 1100)
importDeckBtn.onclick = toggleModal
resetSortAndFilterBtn.onclick = throttle(resetSortAndFilter, 1000)
resetAllBtn.onclick = throttle(resetDeckBuilder, 1000)
modal.onclick = handleModalClick
submitBtn.onclick = importDeckCode

let ALL_CARDS = []
let RELEASED_CARDS = []
let cardsToDisplay = []
let selectedKeyword = ""
let selectedAbility = ""
let selectedEnergy = ""
let selectedPower = ""
let selectedSeries = ""
let selectedSortProperty = "cost"
let selectedSortOrder = "ascending"
let cardsInDeck = []
let loadedImages = new Set()
let allImagesLoaded = false

startDeckBuilder()

function startDeckBuilder() {
  fetch('./data/cards.json')
    .then(async (cards) => {
      cards = await cards.json()

      try {
        let cardUpdates = await fetch('https://guymelef.dev/data/snap-extn/update.json')
        cardUpdates = await cardUpdates.json()
        if (cardUpdates.isUpdateAvailable && cardUpdates.partsToUpdate.includes('cards')) {
          for (const updatedCard of cardUpdates.cards) {
						const index = cards.findIndex(card => card.name === updatedCard.name)
						if (index !== -1) cards[index] = updatedCard
						else cards.push(updatedCard)
					}
        }
      } catch (err) {
        console.error("ERROR FETCHING UPDATES:", err)
      }

      ALL_CARDS = cards
      RELEASED_CARDS = cards.filter(card => card.type === 'character' && card.released)
      sortCards(RELEASED_CARDS)
      cardsToDisplay = RELEASED_CARDS
      
      const urlParams = new URLSearchParams(window.location.search)
      let cardInDeck = urlParams.get('card')
      cardInDeck = cardsToDisplay.find(card => card.name === cardInDeck && card.released && card.type === 'character')
      if (cardInDeck) cardsInDeck = [cardInDeck]
      
      renderCardsInDeck()
      renderCardsInPool()
    })
    .catch(_ => showToastMsg({color:'#ef4343', msg:"There was an error!"}))
}

function addOrRemoveCardToDeck(event) {
  const elClasses = [...event.target.classList]

  if (elClasses.includes('non-deck-card')) return
  
  if (elClasses.includes('snap-card')) {
    if (elClasses.includes('deck-card')) {
      removeCardFromDeck(event.target.alt)
    } else if (elClasses.includes('card-image')) {
      const index = event.target.dataset.index
      const cardToAdd = cardsToDisplay[index]
      const cardName = cardToAdd.name
      const isCardInDeck = cardsInDeck.find(card => card.name === cardName)

      if (cardsInDeck.length < 12) {
        if (!isCardInDeck) {
          cardsInDeck.push(cardToAdd)
          sortCards(cardsInDeck, true)
          event.target.classList.toggle('selected')
          renderCardsInDeck()
        } else {
          removeCardFromDeck(cardName)
        }
      } else {
        if (isCardInDeck) removeCardFromDeck(cardName)
      }
    }
  }
}

function removeCardFromDeck(name) {
  const cardName = name
  const cardToToggle = cardsDiv.querySelector(`.card-image[alt="${name}"]`)
  cardsInDeck = cardsInDeck.filter(card => card.name !== cardName)
  cardToToggle && cardToToggle.classList.toggle('selected')
  renderCardsInDeck()
}

function showCardInfo(event) {
  infoDiv.style.display = "block"
  infoDiv.style.opacity = 1

  const elClasses = [...event.target.classList]
  if (elClasses.includes('card-image')) {
    const cardInfo = cardsToDisplay[event.target.dataset.index]

    let source = ''
    let sourceClass = ''
    let seriesLabel = ''
    const cardSeries = cardInfo.series
    if (cardSeries) {
      if (cardSeries && cardSeries !== "NA") {
        if (cardSeries === 'Season Pass') {
          source = 'Season Pass'
          sourceClass = 'season-pass'
        } else {
          source = `Series ${cardSeries}`
          sourceClass = `series${cardSeries}`
        }
        seriesLabel = `<span class="series-label ${sourceClass}">${source}</span>`
      }
    }

    let cardAbility = ""
    if (cardInfo.ability) cardAbility = `
      <p class="card-info-text">
        ${cardInfo.ability.replace(/On Reveal|Ongoing|Activate|Game Start/g, match => match && `<b>${match}</b>`)}
      </p>
    `
    else cardAbility = `
      <p class="card-info-text">
        <i class="card-quote">${cardInfo.text}</i>
        ${cardInfo.evolved ?
          `
            <br>
            <b class="evolved">Evolved:</b> ${cardInfo.evolved.replace(/On Reveal|Ongoing|Activate|Game Start/g, match => match && `<b>${match}</b>`)}
          `
          : ''
        }
      </p>
    `
    
    infoDiv.innerHTML = `
      <h3>${cardInfo.name} ${seriesLabel}</h3>
      <h4>Cost:${cardInfo.cost}<span> ┇ </span>Power:${cardInfo.power}</h4>
      ${cardAbility}
    `
  } else {
    hideCardInfo()
  }
}

function hideCardInfo() {
  infoDiv.innerHTML = ""
  infoDiv.style.display = "none"
}

function handleFilterChange(event) {
  const prop = event.target.name
  const value = event.target.value

  if (prop === 'ability')  selectedAbility = value
  else if (prop === 'cost')  selectedEnergy = value
  else if (prop === 'power')  selectedPower = value
  else if (prop === 'series')  selectedSeries = value
  
  filterCards()
}

function filterCards() {
  let cardPool = []
		
  if (!selectedAbility && !selectedKeyword) cardPool = [...RELEASED_CARDS]

  if (selectedKeyword) {
    for (const card of ALL_CARDS) {
      const cardName = card.name.toLowerCase()
      const keyword = selectedKeyword.toLowerCase()
      const cardAbility = card.ability ? card.ability.toLowerCase() : ''
      const evolvedAbility = card.evolved ? card.evolved.toLowerCase() : ''
      
      if (cardAbility && cardAbility.includes(keyword) ||
        evolvedAbility && cardAbility.includes(keyword) ||
        cardName.includes(keyword)
      ) {
        cardPool.push(card)
      }
    }
  }

  if (selectedAbility) {
    let cardsToFilter = []
    let filteredCards = []
    
    if (selectedKeyword) {
      cardsToFilter = cardPool
      for (const card of cardsToFilter) {
        if (selectedAbility === 'no ability' || selectedAbility === 'others') {
          if (card.tags && card.tags.includes(selectedAbility)) filteredCards.push(card)
        } else if (selectedAbility === 'unreleased') {
          if (!card.released && card.type === "character") filteredCards.push(card)
        } else if (selectedAbility === 'summon') {
          if (card.type === selectedAbility) filteredCards.push(card)
        } else if (card.ability) {
          if (card.ability.toLowerCase().includes(selectedAbility)) filteredCards.push(card)
        } else if (card.evolved) {
          if (card.evolved.toLowerCase().includes(selectedAbility)) filteredCards.push(card)
        }
      }
    } else {
      cardsToFilter = RELEASED_CARDS
      if (selectedAbility === 'summon') {
        filteredCards = ALL_CARDS.filter(card => card.type === selectedAbility)
      } else if (selectedAbility === 'unreleased') {
        filteredCards = ALL_CARDS.filter(card => !card.released && card.type === "character")
      } else {
        for (const card of cardsToFilter) if (card.tags && card.tags.includes(selectedAbility)) filteredCards.push(card)
      }
    }
    cardPool = filteredCards
  }

  if (selectedEnergy) {
    let foundCards = []
    for (const card of cardPool) {
      if (selectedEnergy === '6+') { if (card.cost >= 6) foundCards.push(card) }
      else { if (selectedEnergy === card.cost) foundCards.push(card) }
    }
    cardPool = foundCards
  }

  if (selectedPower) {
    let foundCards = []
    for (const card of cardPool) {
      if (selectedPower === '1-') { if (card.power <= 1) foundCards.push(card) } 
      else if (selectedPower === '6+') { if (card.power >= 6) foundCards.push(card) }
      else { if (card.power === selectedPower) foundCards.push(card) }
    }
    cardPool = foundCards
  }

  if (selectedSeries) {
    let foundCards = []
    for (const card of cardPool) if (card.series === selectedSeries) foundCards.push(card)
    cardPool = foundCards
  }

  if (cardPool.length > 1) sortCards(cardPool)
  cardsToDisplay = cardPool
  renderCardsInPool()
  scrollToTop()
  
  if (allImagesLoaded && cardsToDisplay.length > 5) showToastMsg({color:'cyan', msg:`ⓘ &nbsp;${cardsToDisplay.length} cards`})
}

function handleSortChange(event) {
  const prop = event.target.name
  const value = event.target.value

  if (prop === 'field') selectedSortProperty = value
  else selectedSortOrder = value
  
  sortCards(cardsToDisplay)
  renderCardsInPool()
  scrollToTop()
}

function sortCards(cards, cardsInDeck = false) {
  if ((selectedSortOrder === "ascending" && selectedSortProperty !== "name") || cardsInDeck) {
    cards.sort((a, b) => a.cost - b.cost || a.power - b.power || a.name.localeCompare(b.name))
  } else if (selectedSortOrder === "descending" && selectedSortProperty !== "name") {
    cards.sort((a, b) => b.cost - a.cost || b.power - a.power || a.name.localeCompare(b.name))
  } else {
    cards.sort((a, b) => {
      if (selectedSortProperty === 'name') {
        if (selectedSortOrder === 'descending') return b.name.localeCompare(a.name)
        else return a.name.localeCompare(b.name)
      }
    })
  }
}

function handleKeywordInput(event) {
  const keyword = event.target.value
  selectedKeyword = keyword
  filterCards()
}

function saveDeckToClipboard() {
  if (cardsInDeck.length) {
    const deck = []
    let deckStr = ""

    cardsInDeck.forEach((card) => {
      deck.push(card.code)
      deckStr += `# (${card.cost}) ${card.name}\n`
    })

    let deckCode = btoa(deck.join(','))
    deckCode = `${deckStr}#\n${deckCode}\n#\n# To use this deck, copy it to your clipboard and paste it from the deck editing menu in Snap.\n# Generated by Marvel SNAP Search browser extension`

    navigator.clipboard
      .writeText(deckCode)
      .then(() => {
        showToastMsg({ color: "#21c45d", msg: "Deck copied to clipboard!" })
      })
      .catch(_ => {
        showToastMsg({ color: "#e7b008", msg: "Can't copy to clipboard!" })
      })
  } else {
    showToastMsg({ color: "#e7b008", msg: "The deck is empty!" })
  }
}

function importDeckCode() {
  toggleModal()
  const deckCodeEl = document.querySelector('#deck-code')
  let deckCode = deckCodeEl.value
  deckCodeEl.value = ""
  if (!deckCode) return console.log("Deck code empty")
  
  try {
    deckCode = deckCode.trim()
    deckCode = deckCode.match(/\n[\w=\+\/^_]+\n/) || deckCode
    deckCode = atob(deckCode)
    const cardsInDeckCode = deckCode.split(',')
    
    let foundCards = []
    for (const code of cardsInDeckCode) {
      for (const card of ALL_CARDS) {
        if (card.code === code) foundCards.push(card)
      }
    }
    cardsInDeck = foundCards.filter(card => card.released && card.type === "character")
    cardsInDeck.sort((a, b) => a.cost - b.cost || a.power - b.power || a.name.localeCompare(b.name))
    renderCardsInDeck()
  } catch {
    showToastMsg({color:'#ef4343', msg:"Invalid deck code!"})
  }
}

function resetSortAndFilter() {
  selectedKeyword = ""
  selectedAbility = ""
  selectedEnergy = ""
  selectedPower = ""
  selectedSeries = ""
  selectedSortProperty = "cost"
  selectedSortOrder = "ascending"
  
  keywordSearcher.value = ""
  abilitySelector.value = ""
  energySelector.value = ""
  powerSelector.value = ""
  seriesSelector.value = ""
  propSorter.value = "cost"
  orderSorter.value = "ascending"
}

function resetDeckBuilder() {
  cardsToDisplay = RELEASED_CARDS
  cardsInDeck = []
  resetSortAndFilter()
  
  renderCardsInDeck()
  renderCardsInPool()
  setTimeout(() => scrollToTop(), 300)
}

function handleModalClick(event) {
  if ([...event.target.classList].includes('builder-modal')) toggleModal()
}

function toggleModal() {
  if (!modal.style.display || modal.style.display === "none") modal.style.display = "block"
  else modal.style.display = "none"
}

function showToastMsg(toast) {
  toastMsg.style.color = toast.color
  toastMsg.style.boxShadow = `-3px 0 ${toast.color}`
  toastMsg.innerHTML = toast.msg
  toastMsg.style.display = "block"
  toastMsg.classList.add('slide-toast')
  setTimeout(_ => {
    toastMsg.classList.remove('slide-toast')
    toastMsg.style.display = "none"
    toastMsg.innerHTML = ""
  }, 1200)
}

function renderCardsInPool() {
  cardsDiv.innerHTML = ""
  
  if (!cardsToDisplay.length) {
    cardsDiv.innerHTML = '<p class="no-cards">No cards found.</p>'
  } else {
    cardsToDisplay.forEach((card, index) => {
      const isCardInDeck = cardsInDeck.find(deckCard => card.name === deckCard.name)
      let cardImgClasses = isCardInDeck ? 'selected ' : ''
      if (!card.released || card.type !== 'character') cardImgClasses += 'non-deck-card'
      
      cardsDiv.innerHTML += `
        <img class="snap-card card-image ${cardImgClasses}"
          src=${createImgLink(card)}
          alt="${card.name}"
          data-index=${index}
          loading="eager"
        >
      `
      
      if (!allImagesLoaded) {
        document.querySelectorAll('.card-image').forEach(card => {
          card.onload = imgLoaded
          card.onerror = function() { this.src = `images/card.webp` }
        })
      }
    })
  }
}

function renderCardsInDeck() {
  deckDiv.innerHTML = ""

  if (cardsInDeck.length === 12) {
    deckDiv.classList.add('complete')
  } else if (cardsInDeck.length > 0) {
    deckDiv.classList.remove('complete')
    deckDiv.style.backgroundColor = "#981b1bde"
  } else {
    deckDiv.classList.remove('complete')
    deckDiv.style.backgroundColor = "#1e3fae"
  }

  for (let i = 0; i < 12; i++) {
    const card = cardsInDeck[i]
    if (card) {
      deckDiv.innerHTML += `
        <img class="snap-card deck-card card-added"
          src=${createImgLink(card)}
          alt="${card.name}"
          title="${card.name}"
          loading="eager"
        >
      `
    } else {
      deckDiv.innerHTML += `
        <img class="deck-card" src="images/builder/blank.webp" alt="blank card">
      `
    }
  }

  document.querySelectorAll('.card-added').forEach(card => {
    card.onerror = function() { this.src = `images/card.webp` }
  })
}

function scrollToTop() {
  document.querySelector('.cards-view').scrollTo({ top:0, behavior:"smooth" })
}

function createImgLink(card) {
  let image = ''
	if (card.noArt) {
		image = 'default'
	} else {
		image = card.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
		image = image.replace(/ /g, '-').replace(/[^\w-]/g, '')
	}
	return `https://files.guymelef.dev/card/${image}.webp`
}

function throttle(func, delay) {
  let lastCall = 0
  return function (...args) {
    const now = new Date().getTime()
    if (now - lastCall >= delay) {
      func(...args)
      lastCall = now
    }
  }
}

function debounce(func, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

function imgLoaded(event) {
  loadedImages.add(event.target.alt)
  if (cardsToDisplay.length === loadedImages.size) {
    allImagesLoaded = true
    document.body.classList.add('hide-before')
    document.querySelector('main').style.filter = 'none'
    showToastMsg({color:'cyan', msg:`ⓘ &nbsp;${cardsToDisplay.length} cards`})
  }
}
const cardsView = document.querySelector('.cards-view')
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
const resetAllBtn = document.querySelector('#reset-all-btn')
const toastMsg = document.querySelector('aside')
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
resetAllBtn.onclick = resetDeckBuilder
modal.onclick = handleModalClick
submitBtn.onclick = importDeckCode

let CARDS = []
let cardsToDisplay = []
let selectedKeyword = ""
let selectedAbility = ""
let selectedEnergy = ""
let selectedPower = ""
let selectedSeries = ""
let selectedSortProperty = "name"
let selectedSortOrder = "ascending"
let cardsInDeck = []
let loadedImages = new Set()
let allImagesLoaded = false

startDeckBuilder()

function startDeckBuilder() {
  fetch('./data/cards.json')
    .then(async (cards) => {
      cards = await cards.json()
      cards = cards.filter(card => card.released && card.type === "character")
      CARDS = cards
      cardsToDisplay = cards
      
      const urlParams = new URLSearchParams(window.location.search)
      let cardInDeck = urlParams.get('card')
      cardInDeck = CARDS.find(card => card.name === cardInDeck)
      if (cardInDeck) cardsInDeck = [cardInDeck]
      
      renderCardsInDeck()
      renderCardsInPool()
    })
    .catch(_ => showToastMsg({color:'#ef4343', msg:"There was an error!"}))
}

function addOrRemoveCardToDeck(event) {
  const elClasses = [...event.target.classList]

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
          cardsInDeck = [...cardsInDeck, cardToAdd]
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

  const elClasses = [...event.target.classList]
  if (elClasses.includes('card-image')) {
    const cardInfo = cardsToDisplay[event.target.dataset.index]
    let cardAbility = ""
    if (cardInfo.ability) cardAbility = `
      <p class="card-info-text">
        ${cardInfo.ability.replace('On Reveal:', '<b>On Reveal:</b>').replace('On Reveal', '<b>On Reveal</b>').replace('Ongoing:', '<b>Ongoing:</b>').replace('Ongoing', '<b>Ongoing</b>')}
      </p>
    `
    else cardAbility = `
      <p class="card-info-text">
        <i>${cardInfo.text}</i>
        <br>
        <br>
        <b>Evolved:</b> ${cardInfo.evolved}
      </p>
    `
    
    infoDiv.innerHTML = `
      <p>
        <h3>${cardInfo.name}</h3>
        <h4>Cost:${cardInfo.cost}<span> ┇ </span>Power:${cardInfo.power}
        </h4>
        ${cardAbility}
      </p>
    `
  }
}

function hideCardInfo() {
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
		
  if (!selectedAbility && !selectedKeyword) cardPool = [...CARDS]

  if (selectedKeyword) {
    for (const card of CARDS) {
      const cardName = card.name.toLowerCase()
      const keyword = selectedKeyword.toLowerCase()
      const ability =  card.ability && card.ability.toLowerCase()
      
      if (ability) { if (ability.includes(keyword) || cardName.includes(keyword)) cardPool.push(card) }
    }
  }

  if (selectedAbility) {
    if (selectedKeyword) cardPool = cardPool.filter(card => card.tags.includes(selectedAbility))
    else cardPool = CARDS.filter(card => card.tags.includes(selectedAbility))
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
      else if (selectedPower === '6+') {{ if (card.power >= 6) foundCards.push(card) }}
      else { if (card.power === selectedPower) foundCards.push(card) }
    }
    cardPool = foundCards
  }

  if (selectedSeries) {
    let foundCards = []
    for (const card of cardPool) if (card.series === selectedSeries) foundCards.push(card)
    cardPool = foundCards
  }

  sortCards(cardPool)
  cardsToDisplay = cardPool
  renderCardsInPool()
  scrollToTop()
  if (allImagesLoaded && cardsToDisplay.length > 10)
    showToastMsg({color:'cyan', msg:`ⓘ &nbsp;${cardsToDisplay.length} cards`})
}

function handleSortChange(event) {
  const prop = event.target.name
  const value = event.target.value

  if (prop === 'field') selectedSortProperty = value
  else selectedSortOrder = value
  
  const cardsToSort = [...cardsToDisplay]					
  sortCards(cardsToSort)
  cardsToDisplay = cardsToSort
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
    const deck = { Cards: [] }
    let deckStr = ""

    cardsInDeck.forEach((card) => {
      let id = card.code || card.name.replace(/[^\w^_]/g, "")
      deck.Cards.push({ CardDefId: id })
      deckStr += `# (${card.cost}) ${card.name}\n`
    })

    let deckCode = btoa(JSON.stringify(deck))
    deckCode = `${deckStr}#\n${deckCode}\n#\n# To use this deck, copy it to your clipboard and paste it from the deck editing menu in Snap.\n# Generated by Marvel SNAP Search browser extension`

    navigator.clipboard
      .writeText(deckCode)
      .then(() => {
        showToastMsg({ color: "#21c45d", msg: "Deck code copied to the clipboard!" })
      })
      .catch((error) => {
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
    let cardsInDeckCode = JSON.parse(deckCode).Cards
    cardsInDeckCode = cardsInDeckCode.map(card => card.CardDefId.toLowerCase())
    
    let foundCards = []
    for (const cardName of cardsInDeckCode) {
      for (const card of CARDS) {
        const name = card.name.toLowerCase().replace(/[^\w^_]/g, '')
        if (name === cardName || card.code === cardName) foundCards.push(card)
      }
    }
    cardsInDeck = foundCards
    renderCardsInDeck()
  } catch {
    showToastMsg({color:'#ef4343', msg:"Invalid deck code!"})
  }
}

function resetDeckBuilder() {
  cardsToDisplay = CARDS
  cardsInDeck = []
  selectedKeyword = ""
  selectedAbility = ""
  selectedEnergy = ""
  selectedPower = ""
  selectedSeries = ""
  selectedSortProperty = "name"
  selectedSortOrder = "ascending"
  cardsInDeck = []

  abilitySelector.value = ""
  energySelector.value = ""
  powerSelector.value = ""
  seriesSelector.value = ""
  propSorter.value = "name"
  orderSorter.value = "ascending"
  keywordSearcher.value = ""
  
  setTimeout(() => renderCardsInDeck(), 100)
  setTimeout(() => renderCardsInPool(), 300)
  setTimeout(() => scrollToTop(), 500)
}

function handleModalClick(event) {
  if ([...event.target.classList].includes('builder-modal')) toggleModal()
}

function toggleModal() {
  if (!modal.style.display || modal.style.display === "none") modal.style.display = "block"
  else modal.style.display = "none"
}

function showToastMsg(toast) {
  toastMsg.style.display = "block"
  toastMsg.innerHTML = `
    <p class="toast-msg" style="color:${toast.color}; box-shadow:-3px 0 ${toast.color}">${toast.msg}</p>
  `
  setTimeout(() => toastMsg.style.display = "none", 1200)
}

function renderCardsInPool() {
  cardsDiv.innerHTML = ""
  
  if (!cardsToDisplay.length) {
    document.body.classList.add('hide-before')
    cardsDiv.innerHTML = '<p class="no-cards">No cards found.</p>'
  } else {
    cardsToDisplay.forEach((card, index) => {
      const isCardInDeck = cardsInDeck.find(deckCard => card.name === deckCard.name)
      cardsDiv.innerHTML += `
        <img class="snap-card card-image ${isCardInDeck && 'selected'}"
          src=${createImgLink(card.image)}
          alt="${card.name}"
          data-index=${index}
          loading="eager"
        >
      `
      document.querySelectorAll('.card-image').forEach(card => {
        if (!allImagesLoaded) card.onload = imgLoaded
        card.onerror = function() { this.src = `images/card.webp` }
      })
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
          src=${createImgLink(card.image)}
          alt="${card.name}"
          title="${card.name}"
          loading="eager"
        >
      `
    } else {
      deckDiv.innerHTML += `
        <img class="deck-card" src="images/blank.webp" alt="blank card">
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

function createImgLink(url) {
  let link = url.replace('/', '/Marvel%20SNAP/Cards/')
  link = `https://res.cloudinary.com/dekvdfhbv/image/upload/${link}.webp`
  return link
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
    showToastMsg({color:'cyan', msg:`ⓘ &nbsp;${cardsToDisplay.length} cards`})
  }
}
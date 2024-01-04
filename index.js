const searchBox = document.querySelector('.search-term')
const searchForm = document.querySelector('.search-form')
const searchResult = document.querySelector('.section-search-result')
const countdownSection = document.querySelector('.section-countdown')
const modal = document.querySelector('.section-modal')
const randomizeBtn = document.querySelector('.btn-randomize')
const countdownEl = document.querySelector(".countdown")

let CATEGORY = 'card'
let LAST_RANDOM_INDEX
const borderColor = {
  "card": "#2973C4",
  "location": "#108800",
  "bot": "#e50a10"
}



// START THE APP
startApp()

randomizeBtn.onclick = _ => getRandomCard(CATEGORY)

searchForm.onsubmit = async (event) => {
  event.preventDefault()

  if (!searchBox.value) return
  
  const searchTerm = searchBox.value.trim()

  const cardToDisplay = await findClosest(searchTerm, CATEGORY)
  
  if (!cardToDisplay) {
    searchBox.style.border = "4px ridge rgb(219, 206, 206)"
    searchBox.animate([
      { transform: "translateX(0)" },
      { transform: "translateX(2px)" },
      { transform: "translateX(-2px)" },
      { transform: "translateX(2px)" },
      { transform: "translateX(0)" }
    ], {
      duration: 400,
      iterations: 1
    })
    searchBox.value = ""
    searchBox.placeholder = `${['😓','😩','😵'][Math.floor(Math.random() * 3)]} Snap, ${CATEGORY} not found!`

    setTimeout(_ => {
      searchBox.style.border = `4px ridge ${borderColor[CATEGORY]}`
    }, 1500);
  } else {
    if (CATEGORY === "bot") {
      searchBox.value = `🤖 [${cardToDisplay.type}*]`
    } else {
      displayCard(cardToDisplay, CATEGORY)
      searchBox.value = ""
      searchBox.placeholder = `${CATEGORY.charAt(0).toUpperCase() + CATEGORY.slice(1)} search...`
    }
  }
}

searchBox.onclick = _ => {
  searchBox.style.border = `4px ridge ${borderColor[CATEGORY]}`
  searchBox.value = ''
  searchBox.placeholder = `${CATEGORY.charAt(0).toUpperCase() + CATEGORY.slice(1)} search...`
}

document.onclick = ({ target }) => {
  const classes = [...target.classList]

  if (classes.includes('season-header')) {
    modal.style.display = "block"
  } else if (target === modal) {
    modal.scrollTop = 0
    modal.style.display = "none"
  }
}

document.querySelectorAll('.btn-category').forEach(button => {
  button.onclick = function() {
    if (this.id === "bot") {
      randomizeBtn.disabled = true
      randomizeBtn.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], {
        duration: 300,
        fill: "forwards",
        easing: "ease-out"
      })
      randomizeBtn.style.visibility = "hidden"
    } else {
      randomizeBtn.disabled = false
      if (randomizeBtn.style.visibility === "hidden") {
        randomizeBtn.animate([
          { opacity: 0 },
          { opacity: 1 }
        ], {
          duration: 300,
          fill: "forwards",
          easing: "ease-in"
        })
      }
      randomizeBtn.style.visibility = "visible"
      randomizeBtn.style.setProperty('--btn-color', borderColor[this.id])
    }

    CATEGORY = this.id
    
    document.querySelectorAll('.btn-category').forEach(btn => {
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

    searchBox.style.border = `4px ridge ${borderColor[this.id]}`
    searchBox.style.caretColor = `${borderColor[this.id]}`
    searchBox.placeholder = `${CATEGORY.charAt(0).toUpperCase() + CATEGORY.slice(1)} search...`
    searchBox.focus()
  }
})



// HELPER FUNCTIONS
async function startApp() {
  countdown()
  const data = await fetch(`./data/cards.json`)
  const cards = await data.json()
  let cardToDisplay = cards.find(card => card.series === "Season Pass")
  displayCard(cardToDisplay, CATEGORY, false)
  searchBox.focus()
}

async function getRandomCard(type) {
  searchBox.focus()
  const data = await fetch(`./data/${type}s.json`)
  let cards = await data.json()

  if (type === "card") cards = cards.filter(card => card.type === "character" && card.released)

  const randomIndex = Math.floor(Math.random() * cards.length)
  
  if (randomIndex === LAST_RANDOM_INDEX) return getRandomCard(type)
  else LAST_RANDOM_INDEX = randomIndex
  
  const card = cards[randomIndex]
  return displayCard(card, type, true)
}

async function findClosest(str, type) {
  let data = []

  if (type === "bot") {
    data = await fetch('./data/bots.json')
    data = await data.json()
    
    return data.find(bot => bot.name === str)
  }

  str = str.toLowerCase()

  if (type === "location") {
    data = await fetch('./data/locations.json')
    data = await data.json()
  }

  if (type === "card") {
    data = await fetch('./data/cards.json')
    data = await data.json()

    if (str.length < 3) return null
    str = str.replace('dr ','doctor ')
    str = str.replace('dr. ','doctor ')
  }
  
  let closestMatch = null
  let partialMatch = null
  let wordMatch = null
  const closestDistArr = []
  
  for (const item of data) {
    const itemName = item.name.toLowerCase()
    closestDistArr.push(levenshtein(itemName, str))

    if (itemName === str || itemName.replace(/[\W_]/g, '') === str.replace(/[\W_]/g, '')) {
      closestMatch = item
      break
    }

    if (itemName.includes(str)) {
      partialMatch = item
      if (itemName > str) break
    }

    const cardNameArr = itemName.split(' ')
    const strArr = str.split(' ')
    if (cardNameArr.length > 1 && strArr.length > 1) {
      let match = 0
      for (let word of strArr) {
        if (itemName.includes(word)) match++
      }

      if (match === strArr.length) wordMatch = item
    }
  }

  closestMatch = closestMatch || wordMatch || partialMatch

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

function displayCard(card, type, isRandom) {
  if (card.ability) {
    card.ability = card.ability.replaceAll("On Reveal:", "<b>On Reveal:</b>")
    card.ability = card.ability.replaceAll("On Reveal", "<b>On Reveal</b>")
    card.ability = card.ability.replaceAll("Ongoing:", "<b>Ongoing:</b>")
    card.ability = card.ability.replaceAll("Ongoing", "<b>Ongoing</b>")
  }
  
  let htmlStr = ''

  if (type === "card") {
    if (card.evolved) {
      card.evolved = card.evolved.replaceAll("On Reveal:", "<b>On Reveal:</b>")
      card.evolved = card.evolved.replaceAll("Ongoing:", "<b>Ongoing:</b>")
    }

    let source = ''
    if (card.series === "Season Pass") {
      source = "Season Pass"
    } else {
      if (card.series) {
        if (card.series === "NA") source = "Unreleased"
        else source = `Series ${card.series}`
      } else {
        source = "Summon"
      }
    }

    htmlStr = `
      <div class="search-result-info-title">
        <h2 
          class="card-title"
          style="--h2-border:${isRandom ? "#e50a10" : borderColor[type]}; --h2-shadow: ${borderColor[type]}"
        >
          ${card.name}
        </h2>
      </di1v>
      <div class="search-result-info-stats">
        <h3>Cost:<span class="cost card-stats">${card.cost}</span> Power:<span class="power card-stats">${card.power}</span></h3>
      </div>
      <div class="search-result-info-ability">
        <p class="card-ability">
          ${card.ability || `<i>${card.text}</i>`}
          ${card.evolved
            ? `<br><br><b class="evolved">Evolved</b>: ${card.evolved}`
            : ''
          }
        </p>
      </div>
      <div class="search-result-info-source">
        <p>
          <span class="source-text">Source</span>: <span class="source-origin">${source}</span>
        </p>
      </div>
    `
  } else if (type === "location") {
    htmlStr = `
      <div class="search-result-info-title">
        <h2 
          class="card-title"
          style="--h2-border:${isRandom ? "#e50a10" : borderColor[type]}; --h2-shadow: ${borderColor[type]}"
        >
          ${card.name}
        </h2>
      </div>
      <div class="search-result-info-ability">
        <p class="card-ability">
          ${card.ability}
        </p>
      </div>
    `
  }

  searchResult.innerHTML = ""
  searchResult.innerHTML = `
    <div class="${type}-result search-result" data-category="${type}">
      <div class="search-result-img">
        <img
          id="card-img"
          class="card-img card-img-${type}"
          src="https://res.cloudinary.com/dekvdfhbv/image/upload/${card.image}"
          alt="${card.name}"
          loading="eager"
        >
      </div>
      <div class="search-result-info ${type}-search-result">
        ${htmlStr}
      </div>
    </div>
  `

  const cardImg = document.querySelector('#card-img')
  cardImg.style.animationPlayState = "paused"
  cardImg.onerror = function() { this.src = `images/${type}.webp` }
  cardImg.onload = _ => cardImg.style.animationPlayState = "running"
}

function countdown() {
  let year = 2024
  let month = 1
  let date = 6

  let SEASON_END = new Date(Date.UTC(year, month, date, 19))
  const x = setInterval(_ => {
    const timeDifference = SEASON_END - new Date()

    if (timeDifference <= 0) {
      countdownEl.textContent = "NEW SEASON BEGINS!🎉"
      return clearInterval(x)
    }

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24)).toString().padStart(2, 0)
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, 0)
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, 0)
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000).toString().padStart(2, 0)
    
    countdownEl.textContent = `⏰${days}d ${hours}h ${minutes}m ${seconds}s`
  }, 1000)

  setTimeout(_ => {
    countdownSection.style.visibility = "visible"
  }, 1000)
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
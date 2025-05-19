const decks = JSON.parse(localStorage.getItem('decks')) || {};

// --- Create Deck ---
document.getElementById('createDeckForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const deckName = document.getElementById('deckName').value.trim();

  if (!deckName) {
    alert('Please enter a valid deck name.');
    return;
  }
  if (decks[deckName]) {
    alert('A deck with this name already exists.');
    return;
  }

  decks[deckName] = [];
  document.getElementById('deckName').value = '';
  saveDecks();
  renderDeckList();
});

// --- Add Card to Deck ---
function addToDeck(deckName, card) {
  if (!decks[deckName]) {
    alert('Deck not found.');
    return;
  }
  // Enforce 60 card limit
  const deck = decks[deckName];
  const totalCards = deck.reduce((sum, c) => sum + (c.count || 1), 0);
  if (totalCards >= 60) {
    alert('Deck limit reached! You cannot have more than 60 cards in a deck.');
    return;
  }
  // Add or increment card
  const existingCard = deck.find(c => c.id === card.id);
  if (existingCard) {
    existingCard.count = (existingCard.count || 1) + 1;
  } else {
    deck.push({ ...card, count: 1 });
  }
  saveDecks();
  alert(`Added ${card.name} to ${deckName}!`);
  renderDeckList();
}

// --- Remove Card from Deck ---
function removeFromDeck(deckName, cardId) {
  if (!decks[deckName]) {
    alert('Deck not found.');
    return;
  }
  const card = decks[deckName].find(card => card.id === cardId);
  if (card) {
    if (card.count > 1) {
      card.count -= 1;
    } else {
      const index = decks[deckName].findIndex(card => card.id === cardId);
      decks[deckName].splice(index, 1);
    }
  }
  saveDecks();
  renderDeckList();
}

// --- Save Decks to LocalStorage ---
function saveDecks() {
  localStorage.setItem('decks', JSON.stringify(decks));
}

// --- Render Deck List ---
function renderDeckList() {
  const deckList = document.getElementById('deckList');
  deckList.innerHTML = '';

  Object.keys(decks).forEach(deckName => {
    const deckDiv = document.createElement('div');
    deckDiv.classList.add('deck');

    const deckHeader = document.createElement('h3');
    deckHeader.textContent = deckName;

    // Delete Deck Button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete Deck';
    deleteButton.classList.add('delete-deck');
    deleteButton.addEventListener('click', () => deleteDeck(deckName));

    // Card List
    const cardList = document.createElement('div');
    cardList.classList.add('card-list');
    decks[deckName].forEach(card => {
      const cardDiv = document.createElement('div');
      cardDiv.classList.add('deck-card');
      cardDiv.innerHTML = `
        <img src="${card.image}" alt="${card.name}" class="card-image">
        <button onclick="removeFromDeck('${deckName}', '${card.id}')">Remove</button>
      `;
      cardList.appendChild(cardDiv);
    });

    deckDiv.appendChild(deckHeader);
    deckDiv.appendChild(deleteButton);
    deckDiv.appendChild(cardList);
    deckList.appendChild(deckDiv);
  });
}

// --- Delete Deck ---
function deleteDeck(deckName) {
  if (confirm(`Are you sure you want to delete the deck "${deckName}"?`)) {
    delete decks[deckName];
    saveDecks();
    renderDeckList();
  }
}

// --- Initial Render ---
renderDeckList();
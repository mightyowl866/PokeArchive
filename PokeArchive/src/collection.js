// Load collection from localStorage or initialize as empty array
const collection = JSON.parse(localStorage.getItem('collection')) || [];

// --- API Key Handling ---
function getApiKey() {
  return localStorage.getItem('apiKey');
}

// --- Card Search ---
document.getElementById('cardForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const apiKey = getApiKey();
  const cardName = document.getElementById('cardName').value;
  const spinner = document.getElementById('loadingSpinner');
  const result = document.getElementById('result');

  // Fade out results
  result.classList.add('fade-out');
  // Show loading spinner after fade out
  setTimeout(() => {
    spinner.classList.add('show');
    result.innerHTML = ''; // Optional: clear old results after fade
  }, 400);

  try {
    if (!apiKey) throw new Error('No API key found. Please set it in the settings.');

    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(cardName)}`,
      { headers: { 'X-Api-Key': apiKey } }
    );

    if (!response.ok) throw new Error('Card not found or an error occurred.');

    const data = await response.json();
    const cards = data.data;

    // Hide loading spinner
    spinner.classList.remove('show');

    // Fade in results after a short delay for smoothness
    setTimeout(() => {
      if (cards.length === 0) {
        result.innerHTML = `<p>No cards found with the name "${cardName}".</p>`;
      } else {
        renderCards(cards, 'result', false);
      }
      result.classList.remove('fade-out');
      result.classList.add('fade-in');
      // Remove fade-in class after animation so it can be triggered again
      setTimeout(() => result.classList.remove('fade-in'), 400);
    }, 200);

  } catch (error) {
    spinner.classList.remove('show');
    setTimeout(() => {
      result.innerHTML = `<p>Error: ${error.message}</p>`;
      result.classList.remove('fade-out');
      result.classList.add('fade-in');
      setTimeout(() => result.classList.remove('fade-in'), 400);
    }, 200);
  }
});

// --- Populate Set Filter Dropdown ---
function populateSetFilter() {
  const filter = document.getElementById('collectionFilter');
  if (!filter) return;
  const currentValue = filter.value; // Save current selection
  const sets = Array.from(new Set(collection.map(card => card.setName).filter(Boolean))).sort();
  filter.innerHTML = `<option value="">All Sets</option>` +
    sets.map(set => `<option value="${set}">${set}</option>`).join('');
  // Restore previous selection if possible
  filter.value = currentValue;
}

// --- Get Sorted & Filtered Collection ---
function getSortedFilteredCollection() {
  const search = document.getElementById('collectionSearch')?.value.trim().toLowerCase() || '';
  const sort = document.getElementById('collectionSort')?.value || 'name-asc';
  const filterSet = document.getElementById('collectionFilter')?.value || '';
  const filterType = document.getElementById('collectionTypeFilter')?.value || '';
  const filterRarity = document.getElementById('collectionRarityFilter')?.value || '';
  const filterHp = document.getElementById('collectionHpFilter')?.value || '';

  let filtered = collection.filter(card =>
    (!search || card.name.toLowerCase().includes(search) || (card.setName && card.setName.toLowerCase().includes(search))) &&
    (!filterSet || card.setName === filterSet) &&
    (!filterType || (card.types && card.types.includes(filterType))) &&
    (!filterRarity || card.rarity === filterRarity) &&
    (!filterHp ||
      (filterHp === '0-60' && Number(card.hp) <= 60) ||
      (filterHp === '61-100' && Number(card.hp) > 60 && Number(card.hp) <= 100) ||
      (filterHp === '101-' && Number(card.hp) > 100)
    )
  );

  switch (sort) {
    case 'name-asc':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      filtered.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'count-desc':
      filtered.sort((a, b) => (b.count || 1) - (a.count || 1));
      break;
    case 'count-asc':
      filtered.sort((a, b) => (a.count || 1) - (b.count || 1));
      break;
  }
  return filtered;
}
function populateTypeAndRarityFilters() {
  // Type Filter
  const typeFilter = document.getElementById('collectionTypeFilter');
  if (typeFilter) {
    const types = Array.from(new Set(collection.flatMap(card => card.types || []))).sort();
    typeFilter.innerHTML = `<option value="">All Types</option>` +
      types.map(type => `<option value="${type}">${type}</option>`).join('');
  }
  // Rarity Filter
  const rarityFilter = document.getElementById('collectionRarityFilter');
  if (rarityFilter) {
    const rarities = Array.from(new Set(collection.map(card => card.rarity).filter(Boolean))).sort();
    rarityFilter.innerHTML = `<option value="">All Rarities</option>` +
      rarities.map(rarity => `<option value="${rarity}">${rarity}</option>`).join('');
  }
}
// --- Render Collection with Controls ---
function renderCollectionWithControls() {
  populateSetFilter();
  populateTypeAndRarityFilters();
  renderCards(getSortedFilteredCollection(), 'collectionContent', true);
}

// --- Event Listeners for Controls ---
document.getElementById('collectionSearch').addEventListener('input', renderCollectionWithControls);
document.getElementById('collectionSort').addEventListener('change', renderCollectionWithControls);
document.getElementById('collectionFilter').addEventListener('change', renderCollectionWithControls);
document.getElementById('collectionTypeFilter').addEventListener('change', renderCollectionWithControls);
document.getElementById('collectionRarityFilter').addEventListener('change', renderCollectionWithControls);
document.getElementById('collectionHpFilter').addEventListener('change', renderCollectionWithControls);
document.getElementById('massEditBtn').addEventListener('click', () => {
  massEditMode = true;
  selectedForMassEdit.clear();
  renderCollectionWithControls();
});


// --- Collection Management ---
function addToCollection(id, name, image, setName, fullCard) {
  const existingCard = collection.find(card => card.id === id);
  if (existingCard) {
    existingCard.count += 1;
  } else {
    // Store the full card object, plus count
    const cardToStore = { ...(fullCard || {}), id, name, image, setName, count: 1 };
    collection.push(cardToStore);
  }
  renderCollectionWithControls();
}

function removeFromCollection(id) {
  const card = collection.find(card => card.id === id);
  if (card) {
    if (card.count > 1) {
      card.count -= 1;
    } else {
      const index = collection.findIndex(card => card.id === id);
      collection.splice(index, 1);
    }
  }
  renderCollectionWithControls();
}

// --- Card Rendering ---
let massEditMode = false;
let selectedForMassEdit = new Set();

function renderCards(cards, containerId, isCollection) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  cards.forEach((card, i) => {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add(isCollection ? 'collection-card' : 'card');

    if (isCollection && massEditMode) {
      cardDiv.style.position = 'relative';
      if (selectedForMassEdit.has(card.id)) {
        cardDiv.classList.add('mass-edit-selected');
      } else {
        cardDiv.classList.remove('mass-edit-selected');
      }
      cardDiv.innerHTML = `
        <input type="checkbox" class="mass-edit-checkbox" data-id="${card.id}" style="position:absolute;left:8px;top:8px;z-index:2;" ${selectedForMassEdit.has(card.id) ? 'checked' : ''}>
        <img src="${card.image || card.images?.large}" alt="${card.name}" class="card-image">
        <input type="number" min="1" value="${card.count || 1}" class="mass-edit-qty" data-id="${card.id}" style="width:40px;margin-top:8px;display:block;margin-left:auto;margin-right:auto;">
        <div class="card-count">x${card.count || 1}</div>
      `;
      // Card click toggles selection
      cardDiv.addEventListener('click', (event) => {
        // Ignore clicks on the checkbox or input
        if (
          event.target.classList.contains('mass-edit-checkbox') ||
          event.target.classList.contains('mass-edit-qty')
        ) return;
        if (selectedForMassEdit.has(card.id)) {
          selectedForMassEdit.delete(card.id);
          cardDiv.classList.remove('mass-edit-selected');
          cardDiv.querySelector('.mass-edit-checkbox').checked = false;
        } else {
          selectedForMassEdit.add(card.id);
          cardDiv.classList.add('mass-edit-selected');
          cardDiv.querySelector('.mass-edit-checkbox').checked = true;
        }
      });
      // Checkbox selection logic (keep in sync)
      cardDiv.querySelector('.mass-edit-checkbox').addEventListener('change', function(e) {
        if (this.checked) {
          selectedForMassEdit.add(card.id);
          cardDiv.classList.add('mass-edit-selected');
        } else {
          selectedForMassEdit.delete(card.id);
          cardDiv.classList.remove('mass-edit-selected');
        }
        e.stopPropagation();
      });
    }
   else if (!isCollection) {
      // Flip animation for search results
      cardDiv.classList.add('card-flip-container');
      cardDiv.style.width = '180px';
      cardDiv.style.height = '260px';

      cardDiv.innerHTML = `
        <div class="card-flip">
          <div class="card-front">
            <img src="${card.image || card.images?.large}" alt="${card.name}" class="card-image" style="width:100%;height:100%;">
          </div>
          <div class="card-back">
            <img src="https://images.pokemontcg.io/cardback/POKEMON_CARD_BACK.jpg" alt="Card Back" class="card-image" style="width:100%;height:100%;">
          </div>
        </div>
      `;
      setTimeout(() => {
        cardDiv.querySelector('.card-flip').classList.add('flipped');
      }, 200 + i * 120);

      cardDiv.addEventListener('click', (event) => {
        event.stopPropagation();
        showInfoBox(card);
      });
    } else {
      // Normal collection card
      cardDiv.innerHTML = `
        <img src="${card.image || card.images?.large}" alt="${card.name}" class="card-image">
        ${card.count > 1 ? `<div class="card-count">x${card.count}</div>` : `<div class="card-count">x1</div>`}
      `;
      cardDiv.addEventListener('click', (event) => {
        event.stopPropagation();
        showInfoBox(card);
      });
    }

    container.appendChild(cardDiv);
  });

  // Mass edit controls
  if (isCollection && massEditMode) {
    let controls = document.getElementById('massEditControls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'massEditControls';
      controls.style = 'text-align:center;margin:16px 0;';
      controls.innerHTML = `
        <button id="massDeleteBtn" style="margin-right:10px;">Delete Selected</button>
        <button id="massSaveBtn">Save Quantities</button>
        <button id="massEditCancelBtn" style="margin-left:10px;">Cancel</button>
      `;
      container.parentElement.insertBefore(controls, container);
    }

    // Event listeners for mass edit controls
    document.getElementById('massDeleteBtn').onclick = () => {
      // Remove all cards from collection whose id is in selectedForMassEdit
      for (const id of selectedForMassEdit) {
        const idx = collection.findIndex(card => card.id === id);
        if (idx !== -1) collection.splice(idx, 1);
      }
      selectedForMassEdit.clear();
      massEditMode = false;
      renderCollectionWithControls();
    };
    document.getElementById('massSaveBtn').onclick = () => {
      document.querySelectorAll('.mass-edit-qty').forEach(input => {
        const id = input.getAttribute('data-id');
        const qty = Math.max(1, parseInt(input.value, 10) || 1);
        const card = collection.find(c => c.id === id);
        if (card) card.count = qty;
      });
      massEditMode = false;
      renderCollectionWithControls();
    };
    document.getElementById('massEditCancelBtn').onclick = () => {
      massEditMode = false;
      selectedForMassEdit.clear();
      renderCollectionWithControls();
    };

    // Checkbox selection logic
    container.querySelectorAll('.mass-edit-checkbox').forEach(cb => {
      cb.addEventListener('change', function() {
        const id = this.getAttribute('data-id');
        if (this.checked) selectedForMassEdit.add(id);
        else selectedForMassEdit.delete(id);
      });
    });
  } else {
    // Remove mass edit controls if not in mass edit mode
    const controls = document.getElementById('massEditControls');
    if (controls) controls.remove();
  }
}



// Energy type to icon URL map
const ENERGY_ICONS = {
  Grass: 'https://archives.bulbagarden.net/media/upload/thumb/2/2e/Grass-attack.png/38px-Grass-attack.png',
  Fire: 'https://archives.bulbagarden.net/media/upload/thumb/a/ad/Fire-attack.png/38px-Fire-attack.png',
  Water: 'https://archives.bulbagarden.net/media/upload/thumb/1/11/Water-attack.png/38px-Water-attack.png',
  Lightning: 'https://archives.bulbagarden.net/media/upload/thumb/0/04/Lightning-attack.png/38px-Lightning-attack.png',
  Psychic: 'https://archives.bulbagarden.net/media/upload/thumb/e/ef/Psychic-attack.png/38px-Psychic-attack.png',
  Fighting: 'https://archives.bulbagarden.net/media/upload/thumb/4/48/Fighting-attack.png/38px-Fighting-attack.png',
  Darkness: 'https://archives.bulbagarden.net/media/upload/thumb/a/ab/Darkness-attack.png/38px-Darkness-attack.png',
  Metal: 'https://archives.bulbagarden.net/media/upload/thumb/6/64/Metal-attack.png/38px-Metal-attack.png',
  Fairy: 'https://archives.bulbagarden.net/media/upload/thumb/4/40/Fairy-attack.png/38px-Fairy-attack.png',
  Dragon: 'https://images.pokemontcg.io/sv1/symbol-dragon.png',
  Colorless: 'https://archives.bulbagarden.net/media/upload/thumb/1/1d/Colorless-attack.png/30px-Colorless-attack.png'
};

function energyIcon(type, size = 18) {
  const url = ENERGY_ICONS[type];
  if (!url) return type;
  return `<img src="${url}" alt="${type}" title="${type}" style="width:${size}px;height:${size}px;vertical-align:middle;">`;
}

// Replace [Type] with icon in text
function replaceEnergyInText(text) {
  if (!text) return '';
  return text.replace(/\[([A-Za-z]+)\]/g, (match, p1) => energyIcon(p1));
}




// --- Info Box Modal ---
function showInfoBox(card) {
  // Remove any existing info box and overlay
  document.querySelectorAll('.info-box, .info-overlay').forEach(el => el.remove());

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'info-overlay';
  overlay.addEventListener('click', closeInfoBox);
  document.body.appendChild(overlay);

  // Prepare extra info
  const hp = card.hp ? `${card.hp}` : '—';
  const types = card.types ? card.types.join(', ') : '—';
  const subtypes = card.subtypes ? card.subtypes.join(', ') : '';
  const rarity = card.rarity || '';

  // Abilities
  let abilities = '';
  if (Array.isArray(card.abilities) && card.abilities.length > 0) {
    abilities = card.abilities.map(ab => {
      const color = (ab.type && ab.type.toLowerCase() === 'ability') ? '#e33' : '#197';
      return `
        <div style="margin-bottom:10px; padding-left:4px; border-left:2px solid #4bb;">
          <div><strong style="color:${color};">${ab.type || 'Ability'}: ${ab.name}</strong></div>
          <div style="font-size:0.95em; color:#555;">${replaceEnergyInText(ab.text || '')}</div>
        </div>
      `;
    }).join('');
  }

  // Attacks
  let attacks = '—';
  if (Array.isArray(card.attacks) && card.attacks.length > 0) {
    attacks = card.attacks.map(a => `
      <div style="margin-bottom:10px; padding-left:4px; border-left:2px solid #eee;">
        <div>
          <strong>${a.name}</strong>
          ${a.cost && a.cost.length ? a.cost.map(type => energyIcon(type)).join(' ') : ''}
        </div>
        ${a.damage ? `<div><strong>Damage:</strong> ${a.damage}</div>` : ''}
        ${a.convertedEnergyCost !== undefined ? `<div><strong>Energy Cost:</strong> ${a.convertedEnergyCost}</div>` : ''}
        ${a.text ? `<div style="font-size:0.95em; color:#bbb;">${replaceEnergyInText(a.text)}</div>` : ''}
      </div>
    `).join('');
  }

  const weaknesses = Array.isArray(card.weaknesses) && card.weaknesses.length > 0
    ? card.weaknesses.map(w => `${energyIcon(w.type)} (${w.value})`).join(' ')
    : '—';

  const resistances = Array.isArray(card.resistances) && card.resistances.length > 0
    ? card.resistances.map(r => `${energyIcon(r.type)} (${r.value})`).join(' ')
    : '—';

  const retreatCost = Array.isArray(card.retreatCost) && card.retreatCost.length > 0
    ? card.retreatCost.map(type => energyIcon(type)).join(' ')
    : (card.retreatCost === 0 ? '0' : '—');

  // Create info box modal
  const infoBox = document.createElement('div');
  infoBox.classList.add('info-box');
  infoBox.innerHTML = `
    <div style="display: flex; gap: 32px; align-items: flex-start; min-width: 420px; max-width: 700px;">
      <div style="flex: 0 0 40%; display: flex; justify-content: center;">
        <img src="${card.image || card.images?.large}" alt="${card.name}" style="display:block; max-width:100%; max-height:380px; width:auto; height:auto; border-radius:10px; box-shadow:0 2px 16px rgba(0,0,0,0.18);">
      </div>
      <div style="flex: 1 1 60%; min-width: 200px;">
        <h3 style="margin-top:0;">${card.name}</h3>
        <p><strong>Set:</strong> ${card.setName || card.set?.name || ''}</p>
        ${subtypes ? `<p><strong>Subtype:</strong> ${subtypes}</p>` : ''}
        ${rarity ? `<p><strong>Rarity:</strong> ${rarity}</p>` : ''}
        <p><strong>HP:</strong> ${hp}</p>
        <p><strong>Type:</strong> ${types}</p>
        ${abilities ? `<div><strong>Abilities:</strong></div>${abilities}` : ''}
        <div><strong>Attacks:</strong></div>
        ${attacks}
        <p><strong>Weaknesses:</strong> ${weaknesses}</p>
        <p><strong>Resistances:</strong> ${resistances}</p>
        <p><strong>Retreat Cost:</strong> ${retreatCost}</p>
        <div class="info-box-buttons" style="margin-top:16px;">
          <button onclick="addToCollection('${card.id}', '${card.name}', '${card.image || card.images?.large}', '${card.setName || card.set?.name}', JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(card))}')))">Add to Collection</button>
          <button onclick="showDeckSelection('${card.id}', '${card.name}', '${card.image || card.images?.large}', '${card.setName || card.set?.name}')">Add to Deck</button>
          ${collection.find(c => c.id === card.id) ? `<button onclick="removeFromCollection('${card.id}')">Delete from Collection</button>` : ''}
        </div>
        <button onclick="closeInfoBox()" style="margin-top:14px;">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(infoBox);

  setTimeout(() => {
    overlay.classList.add('show');
    infoBox.classList.add('show');
  }, 10);
}

function closeInfoBox() {
  document.querySelectorAll('.info-box, .info-overlay').forEach(el => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  });
}

// --- Deck Selection Modal ---
function showDeckSelection(cardId, cardName, cardImage, cardSetName) {
  // Close the info box if it's open
  closeInfoBox();

  const deckNames = Object.keys(decks);
  if (deckNames.length === 0) {
    alert('No decks available. Please create a deck first.');
    return;
  }

  // Remove any existing deck selection box and overlay
  document.querySelectorAll('.overlay, .deck-selection-box').forEach(el => el.remove());

  // Create the overlay
  const overlay = document.createElement('div');
  overlay.classList.add('overlay');
  overlay.addEventListener('click', closeDeckSelection);
  document.body.appendChild(overlay);

  // Create the deck selection box
  const deckSelectionBox = document.createElement('div');
  deckSelectionBox.classList.add('deck-selection-box');
  deckSelectionBox.innerHTML = `
    <h4>Select a Deck</h4>
    ${deckNames
      .map(
        (deckName) =>
          `<button onclick="addToDeck('${deckName}', { id: '${cardId}', name: '${cardName}', image: '${cardImage}', setName: '${cardSetName}' })">${deckName}</button>`
      )
      .join('')}
    <button onclick="closeDeckSelection()">Cancel</button>
  `;
  document.body.appendChild(deckSelectionBox);

  setTimeout(() => {
    overlay.classList.add('show');
    deckSelectionBox.classList.add('show');
  }, 10);
}

function closeDeckSelection() {
  document.querySelectorAll('.overlay, .deck-selection-box').forEach(el => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  });
}

// --- Add to Deck ---
function addToDeck(deckName, card) {
  if (!decks[deckName]) {
    alert('Deck not found.');
    return;
  }
  // Check if card already exists in deck
  const existingCard = decks[deckName].find(c => c.id === card.id);
  if (existingCard) {
    existingCard.count = (existingCard.count || 1) + 1;
  } else {
    decks[deckName].push({ ...card, count: 1 });
  }
  saveDecks();
  alert(`Added ${card.name} to ${deckName}!`);
  closeDeckSelection && closeDeckSelection();
  renderDeckList && renderDeckList();
}

// --- Save Collection ---
document.getElementById('saveCollection').addEventListener('click', () => {
  localStorage.setItem('collection', JSON.stringify(collection));
  alert('Collection saved!');
});








// --- Initial Render ---
document.addEventListener('DOMContentLoaded', renderCollectionWithControls);
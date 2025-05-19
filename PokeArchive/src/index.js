const pokemon = require('pokemontcgsdk');

// Load the API key from localStorage
const savedApiKey = localStorage.getItem('apiKey');
if (savedApiKey) {
  pokemon.configure({ apiKey: savedApiKey });
} else {
  console.error('No API key found in localStorage. Please set it in the settings.');
}

// Example usage
pokemon.card.find('base1-4')
  .then(card => {
    console.log(card.name); // "Charizard"
  })
  .catch(error => {
    console.error('Error:', error);
  });
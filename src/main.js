// =============================================
// Variables globales
// =============================================
let currentConversationId = null;

// =============================================
// Fonctions pour le chat IA
// =============================================

// Fonction pour envoyer un message au Worker
async function sendMessageToWorker(message) {
  try {
    const response = await fetch('https://votre-worker.votre-sous-domaine.workers.dev/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        conversationId: currentConversationId
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lors de l'envoi du message :", error);
    return {
      response: "Désolé, une erreur est survenue. Veuillez réessayer.",
      conversationId: null
    };
  }
}

// Fonction pour fermer une conversation
async function closeConversation() {
  if (currentConversationId) {
    try {
      await fetch('https://votre-worker.votre-sous-domaine.workers.dev/api/close-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: currentConversationId })
      });
    } catch (error) {
      console.error("Erreur lors de la fermeture de la conversation :", error);
    }
    currentConversationId = null;
  }
  document.getElementById('chat-actions').innerHTML = '';
}

// Fonction pour afficher un message dans le chat
function displayMessage(sender, content) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  messageDiv.textContent = content;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Fonction pour extraire les données structurées (JSON) de la réponse IA
function extractStructuredData(response) {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Erreur de parsing JSON :", e);
    }
  }
  return null;
}

// Fonction pour gérer les actions (ajouter un repas, créer une recette, etc.)
function handleAction(action, data) {
  if (action === "add_meal") {
    addMealToJournal(data);
    displayMessage('assistant', `Repas "${data.name}" ajouté à votre journal.`);
  } else if (action === "create_recipe") {
    createRecipe(data);
    displayMessage('assistant', `Recette "${data.name}" enregistrée.`);
  } else if (action === "weight_ready") {
    addWeight(data);
    displayMessage('assistant', `Pesée de ${data.weight} kg enregistrée pour le ${data.date}.`);
  }
  closeConversation();
}

// Fonction pour gérer la reconnaissance vocale
function startVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    displayMessage('assistant', "Désolé, la reconnaissance vocale n'est pas supportée sur votre navigateur.");
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('user-input').value = transcript;
    document.getElementById('send-button').click();
  };

  recognition.onerror = (event) => {
    console.error("Erreur de reconnaissance vocale :", event.error);
    displayMessage('assistant', "Désolé, je n'ai pas pu comprendre. Veuillez réessayer.");
  };

  recognition.start();
}

// =============================================
// Fonctions pour gérer les données locales
// =============================================

// Fonction pour sauvegarder les données dans localStorage
function saveData() {
  localStorage.setItem('mwc_v03', JSON.stringify(appData));
}

// Fonction pour charger les données depuis localStorage
function loadData() {
  const savedData = localStorage.getItem('mwc_v03');
  if (savedData) {
    return JSON.parse(savedData);
  }
  return {
    meals: [],
    recipes: [],
    weights: []
  };
}

// Variable globale pour les données de l'application
let appData = loadData();

// Fonction pour ajouter un repas
function addMealToJournal(mealData) {
  const newMeal = {
    name: mealData.name,
    kcal: mealData.kcal,
    p: mealData.protein,
    c: mealData.carbs,
    f: mealData.fat,
    date: new Date().toISOString().split('T')[0]
  };

  if (mealData.fiber !== undefined && mealData.fiber !== null) {
    newMeal.fiber = mealData.fiber;
  }
  if (mealData.sugar !== undefined && mealData.sugar !== null) {
    newMeal.sugar = mealData.sugar;
  }
  if (mealData.saturated_fat !== undefined && mealData.saturated_fat !== null) {
    newMeal.saturated_fat = mealData.saturated_fat;
  }

  appData.meals.push(newMeal);
  saveData();
  refreshMealsList();
}

// Fonction pour supprimer un repas
function deleteMeal(index) {
  appData.meals.splice(index, 1);
  saveData();
  refreshMealsList();
}

// Fonction pour ajouter une recette
function createRecipe(recipeData) {
  const newRecipe = {
    name: recipeData.name,
    kcal: recipeData.kcal,
    p: recipeData.protein,
    c: recipeData.carbs,
    f: recipeData.fat,
    servings: recipeData.servings || 1,
    ingredients: recipeData.ingredients || []
  };

  if (recipeData.fiber !== undefined && recipeData.fiber !== null) {
    newRecipe.fiber = recipeData.fiber;
  }
  if (recipeData.sugar !== undefined && recipeData.sugar !== null) {
    newRecipe.sugar = recipeData.sugar;
  }
  if (recipeData.saturated_fat !== undefined && recipeData.saturated_fat !== null) {
    newRecipe.saturated_fat = recipeData.saturated_fat;
  }

  appData.recipes.push(newRecipe);
  saveData();
  refreshRecipesList();
}

// Fonction pour supprimer une recette
function deleteRecipe(index) {
  appData.recipes.splice(index, 1);
  saveData();
  refreshRecipesList();
}

// Fonction pour ajouter une pesée
function addWeight(weightData) {
  const newWeight = {
    weight: weightData.weight,
    date: weightData.date || new Date().toISOString().split('T')[0]
  };
  appData.weights.push(newWeight);
  saveData();
  refreshWeightsList();
}

// Fonction pour supprimer une pesée
function deleteWeight(index) {
  appData.weights.splice(index, 1);
  saveData();
  refreshWeightsList();
}

// =============================================
// Fonctions pour rafraîchir les listes
// =============================================

// Fonction pour rafraîchir la liste des repas
function refreshMealsList() {
  const mealsList = document.getElementById('meals-list');
  if (!mealsList) return;

  mealsList.innerHTML = '';
  appData.meals.forEach((meal, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="info">
        <strong>${meal.name}</strong> - ${meal.kcal} kcal (P: ${meal.p}g, C: ${meal.c}g, F: ${meal.f}g)
        ${meal.date ? `<br><small>${meal.date}</small>` : ''}
      </div>
      <div class="actions">
        <button class="delete" onclick="deleteMeal(${index})">Supprimer</button>
      </div>
    `;
    mealsList.appendChild(li);
  });
}

// Fonction pour rafraîchir la liste des recettes
function refreshRecipesList() {
  const recipesList = document.getElementById('recipes-list');
  if (!recipesList) return;

  recipesList.innerHTML = '';
  appData.recipes.forEach((recipe, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="info">
        <strong>${recipe.name}</strong> - ${recipe.kcal} kcal/portion (P: ${recipe.p}g, C: ${recipe.c}g, F: ${recipe.f}g)
        <br><small>${recipe.servings} portion(s)</small>
      </div>
      <div class="actions">
        <button class="delete" onclick="deleteRecipe(${index})">Supprimer</button>
      </div>
    `;
    recipesList.appendChild(li);
  });
}

// Fonction pour rafraîchir la liste des pesées
function refreshWeightsList() {
  const weightsList = document.getElementById('weights-list');
  if (!weightsList) return;

  weightsList.innerHTML = '';
  appData.weights.forEach((weight, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="info">
        <strong>${weight.weight} kg</strong> - ${weight.date}
      </div>
      <div class="actions">
        <button class="delete" onclick="deleteWeight(${index})">Supprimer</button>
      </div>
    `;
    weightsList.appendChild(li);
  });
}

// =============================================
// Fonctions pour l'export/import des données
// =============================================

// Fonction pour exporter les données
function exportData() {
  const dataStr = JSON.stringify(appData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'myweight-coach-data.json';
  link.click();
  URL.revokeObjectURL(url);
}

// Fonction pour importer les données
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      appData = importedData;
      saveData();
      refreshMealsList();
      refreshRecipesList();
      refreshWeightsList();
      alert('Données importées avec succès !');
    } catch (error) {
      alert('Erreur lors de l\'import des données.');
      console.error(error);
    }
  };
  reader.readAsText(file);
}

// =============================================
// Initialisation du chat IA et de l'application
// =============================================

// Fonction pour initialiser le chat IA
function initChat() {
  const sendButton = document.getElementById('send-button');
  const userInput = document.getElementById('user-input');
  const voiceButton = document.getElementById('voice-button');

  if (sendButton && userInput) {
    sendButton.addEventListener('click', async () => {
      const message = userInput.value.trim();
      if (!message) return;

      displayMessage('user', message);
      userInput.value = '';

      const data = await sendMessageToWorker(message);
      displayMessage('assistant', data.response);
      currentConversationId = data.conversationId;

      const structuredData = extractStructuredData(data.response);
      if (structuredData) {
        const actionsContainer = document.getElementById('chat-actions');
        actionsContainer.innerHTML = '';

        if (structuredData.type === "meal_ready") {
          const addMealButton = document.createElement('button');
          addMealButton.textContent = "Ajouter à mes repas";
          addMealButton.onclick = () => handleAction('add_meal', structuredData);
          actionsContainer.appendChild(addMealButton);

          const createRecipeButton = document.createElement('button');
          createRecipeButton.textContent = "Créer une recette";
          createRecipeButton.onclick = () => handleAction('create_recipe', structuredData);
          actionsContainer.appendChild(createRecipeButton);
        } else if (structuredData.type === "recipe_ready") {
          const createRecipeButton = document.createElement('button');
          createRecipeButton.textContent = "Enregistrer la recette";
          createRecipeButton.onclick = () => handleAction('create_recipe', structuredData);
          actionsContainer.appendChild(createRecipeButton);

          const addMealButton = document.createElement('button');
          addMealButton.textContent = "Ajouter 1 portion à mes repas";
          addMealButton.onclick = () => {
            const mealData = {
              name: structuredData.name,
              kcal: structuredData.kcal / structuredData.servings,
              protein: structuredData.protein / structuredData.servings,
              carbs: structuredData.carbs / structuredData.servings,
              fat: structuredData.fat / structuredData.servings,
              fiber: structuredData.fiber ? structuredData.fiber / structuredData.servings : null,
              sugar: structuredData.sugar ? structuredData.sugar / structuredData.servings : null,
              saturated_fat: structuredData.saturated_fat ? structuredData.saturated_fat / structuredData.servings : null
            };
            handleAction('add_meal', mealData);
          };
          actionsContainer.appendChild(addMealButton);
        } else if (structuredData.type === "weight_ready") {
          const addWeightButton = document.createElement('button');
          addWeightButton.textContent = "Ajouter cette pesée";
          addWeightButton.onclick = () => handleAction('weight_ready', structuredData);
          actionsContainer.appendChild(addWeightButton);
        }

        const closeButton = document.createElement('button');
        closeButton.textContent = "Fermer la conversation";
        closeButton.onclick = closeConversation;
        actionsContainer.appendChild(closeButton);
      }
    });

    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendButton.click();
      }
    });
  }

  if (voiceButton) {
    voiceButton.addEventListener('click', startVoiceRecognition);
  }
}

// Fonction pour initialiser l'application
function initApp() {
  // Initialiser le chat IA
  initChat();

  // Rafraîchir les listes au chargement
  refreshMealsList();
  refreshRecipesList();
  refreshWeightsList();

  // Configurer l'export/import
  const exportButton = document.getElementById('export-button');
  if (exportButton) {
    exportButton.addEventListener('click', exportData);
  }

  const importButton = document.getElementById('import-button');
  if (importButton) {
    importButton.addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
  }

  const importFileInput = document.getElementById('import-file');
  if (importFileInput) {
    importFileInput.addEventListener('change', importData);
  }
}

// Appeler l'initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', initApp);

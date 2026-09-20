const KEY = "mwc_v04";

const AI_URL = "https://myweight-ai.jallyn-lullo.workers.dev";

const defaults = {
  weight: 94,
  goal: 82,
  kcal: 2200,
  eaten: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  meals: [],
  weights: [],
  recipes: []
};

let saved = {};

try {
  saved = JSON.parse(localStorage.getItem(KEY) || "{}");
} catch (e) {
  localStorage.removeItem(KEY);
}

let s = {
  ...defaults,
  ...saved,
  recipes: saved.recipes || []
};

let rec = null;
let currentPage = "home";

/* =========================
   CONVERSATION IA
========================= */

let aiConversation = null;

function save() {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function render() {
  const app = document.querySelector("#app");

  if (!app) return;

  if (currentPage === "journal") {
    renderJournal(app);
  } else {
    renderHome(app);
  }
}

function renderHome(app) {
  app.innerHTML = `
    <div class="app">

      <header>
        <div>
          <small>MYWEIGHT COACH</small>
          <h1>Aujourd’hui</h1>
        </div>

        <button id="reset">↻</button>
      </header>

      <main>

        <section class="card hero">
          <div>
            <span>Poids actuel</span>
            <strong>${s.weight} kg</strong>
            <small>Objectif ${s.goal} kg</small>
          </div>

          <div class="ring">
            <b>${Math.max(0, s.kcal - s.eaten)}</b>
            <small>kcal restantes</small>
          </div>
        </section>

        <section class="grid">

          <div class="card stat">
            <span>Calories</span>
            <b>${Math.round(s.eaten)} / ${s.kcal}</b>
          </div>

          <div class="card stat">
            <span>Protéines</span>
            <b>${Math.round(s.protein)} g</b>
          </div>

          <div class="card stat">
            <span>Glucides</span>
            <b>${Math.round(s.carbs)} g</b>
          </div>

          <div class="card stat">
            <span>Lipides</span>
            <b>${Math.round(s.fat)} g</b>
          </div>

        </section>

        <section class="card">

          <div class="title">
            <h2>Repas du jour</h2>

            <button id="meal">
              + Ajouter
            </button>
          </div>

          ${
            s.meals.length
              ? s.meals.map(renderMeal).join("")
              : "<p>Aucun repas enregistré.</p>"
          }

        </section>

        <section class="card">

          <div class="title">
            <h2>Recettes</h2>

            <button id="create-recipe">
              🍳 Créer
            </button>
          </div>

          ${
            s.recipes.length
              ? s.recipes.map(renderRecipe).join("")
              : "<p>Aucune recette enregistrée.</p>"
          }

        </section>

        <section class="card">

          <div class="title">
            <h2>Poids</h2>

            <button id="weight">
              + Pesée
            </button>
          </div>

          <strong class="big">
            ${s.weight} kg
          </strong>

        </section>

      </main>

      ${navigation("home")}

      <button class="mic" id="mic" aria-label="Commande vocale">
        🎙️
      </button>

      <div id="toast"></div>

    </div>
  `;

  bindHome();
}

function renderJournal(app) {

  const weights = [...s.weights].reverse();

  app.innerHTML = `
    <div class="app">

      <header>
        <div>
          <small>MYWEIGHT COACH</small>
          <h1>Journal</h1>
        </div>
      </header>

      <main>

        <section class="card">

          <div class="title">
            <h2>Repas enregistrés</h2>

            <button id="meal">
              + Ajouter
            </button>
          </div>

          ${
            s.meals.length
              ? s.meals.map(renderMeal).join("")
              : "<p>Aucun repas enregistré.</p>"
          }

        </section>

        <section class="card">

          <div class="title">
            <h2>Mes recettes</h2>

            <button id="create-recipe">
              🍳 Créer
            </button>
          </div>

          ${
            s.recipes.length
              ? s.recipes.map(renderRecipe).join("")
              : "<p>Aucune recette enregistrée.</p>"
          }

        </section>

        <section class="card">

          <div class="title">
            <h2>Historique du poids</h2>

            <button id="weight">
              + Pesée
            </button>
          </div>

          ${
            weights.length
              ? weights.map(
                  (item, index) => `
                    <div class="meal">

                      <div>
                        <b>${formatDate(item.date)}</b>
                        <small>Pesée enregistrée</small>
                      </div>

                      <div style="display:flex;align-items:center;gap:8px">

                        <strong>${item.weight} kg</strong>

                        <button
                          data-weight-delete="${index}"
                          aria-label="Supprimer la pesée"
                        >
                          ×
                        </button>

                      </div>

                    </div>
                  `
                ).join("")
              : "<p>Aucune pesée enregistrée.</p>"
          }

        </section>

      </main>

      ${navigation("journal")}

      <button class="mic" id="mic" aria-label="Commande vocale">
        🎙️
      </button>

      <div id="toast"></div>

    </div>
  `;

  bindJournal();
}

/* =========================
   AFFICHAGE
========================= */

function renderMeal(m, i) {
  return `
    <div class="meal">

      <div>
        <b>${escapeHTML(m.name)}</b>

        <small>
          ${Math.round(m.kcal)} kcal ·
          P ${Math.round(m.p)}g ·
          G ${Math.round(m.c)}g ·
          L ${Math.round(m.f)}g
        </small>
      </div>

      <button
        data-meal-delete="${i}"
        aria-label="Supprimer le repas"
      >
        ×
      </button>

    </div>
  `;
}

function renderRecipe(recipe, i) {
  return `
    <div class="meal">

      <div>
        <b>${escapeHTML(recipe.name)}</b>

        <small>
          ${Math.round(recipe.kcal)} kcal/portion ·
          P ${Math.round(recipe.p)}g ·
          G ${Math.round(recipe.c)}g ·
          L ${Math.round(recipe.f)}g
          · ${recipe.servings || 1} portions
        </small>
      </div>

      <div style="display:flex;gap:6px">

        <button data-recipe-add="${i}">
          +
        </button>

        <button data-recipe-edit="${i}">
          ✎
        </button>

        <button data-recipe-delete="${i}">
          ×
        </button>

      </div>

    </div>
  `;
}

function navigation(page) {
  return `
    <nav>

      <span id="nav-home"
        style="cursor:pointer;opacity:${page === "home" ? "1" : ".55"}">
        ⌂
        <small>Accueil</small>
      </span>

      <span id="nav-journal"
        style="cursor:pointer;opacity:${page === "journal" ? "1" : ".55"}">
        ◷
        <small>Journal</small>
      </span>

      <span id="nav-settings"
        style="cursor:pointer;opacity:.55">
        ⚙
        <small>Réglages</small>
      </span>

    </nav>
  `;
}

function bindNavigation() {

  const home = document.querySelector("#nav-home");
  const journal = document.querySelector("#nav-journal");
  const settings = document.querySelector("#nav-settings");

  if (home) {
    home.onclick = () => {
      currentPage = "home";
      render();
    };
  }

  if (journal) {
    journal.onclick = () => {
      currentPage = "journal";
      render();
    };
  }

  if (settings) {
    settings.onclick = () => {
      toast("Réglages : prochaine étape");
    };
  }
}

/* =========================
   BIND
========================= */

function bindHome() {

  bindNavigation();

  const mic = document.querySelector("#mic");
  const mealButton = document.querySelector("#meal");
  const weightButton = document.querySelector("#weight");
  const resetButton = document.querySelector("#reset");
  const recipeButton = document.querySelector("#create-recipe");

  if (mic) mic.onclick = listen;
  if (mealButton) mealButton.onclick = meal;
  if (weightButton) weightButton.onclick = weight;
  if (resetButton) resetButton.onclick = resetApp;

  if (recipeButton) {
    recipeButton.onclick = () => {
      startAIConversation("recipe");
    };
  }

  bindDeleteButtons();
  bindRecipeButtons();
}

function bindJournal() {

  bindNavigation();

  const mic = document.querySelector("#mic");
  const mealButton = document.querySelector("#meal");
  const weightButton = document.querySelector("#weight");
  const recipeButton = document.querySelector("#create-recipe");

  if (mic) mic.onclick = listen;
  if (mealButton) mealButton.onclick = meal;
  if (weightButton) weightButton.onclick = weight;

  if (recipeButton) {
    recipeButton.onclick = () => {
      startAIConversation("recipe");
    };
  }

  bindDeleteButtons();
  bindRecipeButtons();
}

function bindDeleteButtons() {

  document
    .querySelectorAll("[data-meal-delete]")
    .forEach(button => {

      button.onclick = () => {

        const index = Number(button.dataset.mealDelete);
        const m = s.meals[index];

        if (!m) return;

        s.eaten -= Number(m.kcal) || 0;
        s.protein -= Number(m.p) || 0;
        s.carbs -= Number(m.c) || 0;
        s.fat -= Number(m.f) || 0;

        s.meals.splice(index, 1);

        save();
        render();

        toast("Repas supprimé");
      };
    });

  document
    .querySelectorAll("[data-weight-delete]")
    .forEach(button => {

      button.onclick = () => {

        const reversedIndex = Number(button.dataset.weightDelete);
        const weights = [...s.weights].reverse();
        const item = weights[reversedIndex];

        if (!item) return;

        const realIndex = s.weights.indexOf(item);

        s.weights.splice(realIndex, 1);

        if (s.weights.length > 0) {

          const latest =
            [...s.weights].sort(
              (a, b) =>
                new Date(b.date) -
                new Date(a.date)
            )[0];

          s.weight = latest.weight;

        } else {

          s.weight = defaults.weight;
        }

        save();
        render();

        toast("Pesée supprimée");
      };
    });
}

function bindRecipeButtons() {

  document
    .querySelectorAll("[data-recipe-add]")
    .forEach(button => {

      button.onclick = () => {

        const index = Number(button.dataset.recipeAdd);
        const recipe = s.recipes[index];

        if (!recipe) return;

        addRecipeToJournal(recipe);
      };
    });

  document
    .querySelectorAll("[data-recipe-edit]")
    .forEach(button => {

      button.onclick = () => {

        const index = Number(button.dataset.recipeEdit);
        editRecipe(index);
      };
    });

  document
    .querySelectorAll("[data-recipe-delete]")
    .forEach(button => {

      button.onclick = () => {

        const index = Number(button.dataset.recipeDelete);

        if (!s.recipes[index]) return;

        if (!confirm("Supprimer cette recette ?")) return;

        s.recipes.splice(index, 1);

        save();
        render();

        toast("Recette supprimée");
      };
    });
}

/* =========================
   REPAS MANUEL
========================= */

function meal() {

  const name = prompt("Nom du repas ?", "Repas");

  if (!name) return;

  const kcal = Number(prompt("Calories ?", "500")) || 0;
  const protein = Number(prompt("Protéines (g) ?", "30")) || 0;
  const carbs = Number(prompt("Glucides (g) ?", "50")) || 0;
  const fat = Number(prompt("Lipides (g) ?", "15")) || 0;

  addMeal({
    name,
    kcal,
    p: protein,
    c: carbs,
    f: fat
  });

  toast("Repas ajouté");
}

function addMeal(m) {

  s.meals.push({
    name: m.name,
    kcal: Number(m.kcal) || 0,
    p: Number(m.p) || 0,
    c: Number(m.c) || 0,
    f: Number(m.f) || 0
  });

  s.eaten += Number(m.kcal) || 0;
  s.protein += Number(m.p) || 0;
  s.carbs += Number(m.c) || 0;
  s.fat += Number(m.f) || 0;

  save();
  render();
}

/* =========================
   RECETTES
========================= */

function addRecipeToJournal(recipe) {

  addMeal({
    name: recipe.name + " — 1 portion",
    kcal: recipe.kcal,
    p: recipe.p,
    c: recipe.c,
    f: recipe.f
  });

  toast("Portion ajoutée au journal");
}

function editRecipe(index) {

  const recipe = s.recipes[index];

  if (!recipe) return;

  const name =
    prompt("Nom de la recette ?", recipe.name);

  if (!name) return;

  const servings =
    Number(
      prompt(
        "Nombre de portions ?",
        recipe.servings || 1
      )
    ) || 1;

  const kcal =
    Number(
      prompt(
        "Calories par portion ?",
        recipe.kcal
      )
    ) || 0;

  const p =
    Number(
      prompt(
        "Protéines par portion (g) ?",
        recipe.p
      )
    ) || 0;

  const c =
    Number(
      prompt(
        "Glucides par portion (g) ?",
        recipe.c
      )
    ) || 0;

  const f =
    Number(
      prompt(
        "Lipides par portion (g) ?",
        recipe.f
      )
    ) || 0;

  recipe.name = name;
  recipe.servings = servings;
  recipe.kcal = kcal;
  recipe.p = p;
  recipe.c = c;
  recipe.f = f;

  save();
  render();

  toast("Recette modifiée");
}

/* =========================
   POIDS
========================= */

function weight() {

  const value =
    Number(
      prompt(
        "Poids actuel (kg) ?",
        s.weight
      )
    );

  if (!value) return;

  s.weight = value;

  s.weights.push({
    date: new Date().toISOString(),
    weight: value
  });

  save();
  render();

  toast("Poids enregistré");
}

/* =========================
   RESET
========================= */

function resetApp() {

  const confirmReset =
    confirm(
      "Réinitialiser toutes les données de l’application ?"
    );

  if (!confirmReset) return;

  localStorage.removeItem(KEY);

  s = {
    ...defaults
  };

  currentPage = "home";

  render();

  toast("Données réinitialisées");
}

/* =========================
   MICRO
========================= */

function listen() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    toast(
      "La reconnaissance vocale n’est pas disponible dans ce navigateur."
    );

    return;
  }

  if (rec) {
    rec.stop();
    return;
  }

  try {

    rec = new SpeechRecognition();

    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    const button = document.querySelector("#mic");

    if (button) {
      button.textContent = "⏹️";
    }

    toast("Je t’écoute…");

    rec.onstart = () => {

      const button = document.querySelector("#mic");

      if (button) {
        button.textContent = "🔴";
      }
    };

    rec.onresult = event => {

      if (
        !event.results ||
        !event.results.length
      ) {
        return;
      }

      const text =
        event.results[0][0].transcript;

      toast("J’ai entendu : " + text);

      voice(text);
    };

    rec.onerror = event => {

      console.log(
        "SpeechRecognition error:",
        event.error
      );

      let message = "Erreur du micro.";

      if (event.error === "not-allowed") {
        message =
          "Autorise le micro pour ce site dans Chrome.";
      }

      if (event.error === "no-speech") {
        message =
          "Je n’ai rien entendu.";
      }

      if (event.error === "network") {
        message =
          "La reconnaissance vocale nécessite une connexion.";
      }

      toast(message);

      rec = null;

      const button = document.querySelector("#mic");

      if (button) {
        button.textContent = "🎙️";
      }
    };

    rec.onend = () => {

      rec = null;

      const button = document.querySelector("#mic");

      if (button) {
        button.textContent = "🎙️";
      }
    };

    rec.start();

  } catch (error) {

    console.error(error);

    rec = null;

    const button = document.querySelector("#mic");

    if (button) {
      button.textContent = "🎙️";
    }

    toast("Impossible de démarrer le micro.");
  }
}

/* =========================
   VOIX
========================= */

async function voice(text) {

  const weightMatch =
    text.match(
      /(?:poids|pèse|pesée).*?(\d+[,.]?\d*)\s*kg/i
    );

  if (weightMatch) {

    const newWeight =
      Number(
        weightMatch[1].replace(",", ".")
      );

    s.weight = newWeight;

    s.weights.push({
      date: new Date().toISOString(),
      weight: newWeight
    });

    save();
    render();

    toast(
      "Poids enregistré : " +
      newWeight +
      " kg"
    );

    return;
  }

  startAIConversation("meal", text);
}

/* =========================
   CONVERSATION IA
========================= */

function startAIConversation(mode, firstMessage = "") {

  aiConversation = {
    mode,
    messages: [],
    result: null
  };

  renderAIConversation();

  if (firstMessage) {
    sendAIMessage(firstMessage);
  }
}

function renderAIConversation() {

  const existing =
    document.querySelector("#ai-conversation");

  if (existing) {
    existing.remove();
  }

  const card =
    document.createElement("section");

  card.id = "ai-conversation";
  card.className = "card";

  const title =
    aiConversation.mode === "recipe"
      ? "🍳 Création de recette"
      : "🤖 MyWeight Coach";

  card.innerHTML = `
    <div class="title">
      <h2>${title}</h2>

      <button id="close-ai-conversation">
        ×
      </button>
    </div>

    <div
      id="ai-messages"
      style="
        display:flex;
        flex-direction:column;
        gap:10px;
        margin-bottom:12px;
      "
    ></div>

    <div
      id="ai-result"
      style="margin-bottom:10px"
    ></div>

    <div style="display:flex;gap:8px">

      <input
        id="ai-input"
        type="text"
        placeholder="Écris ta réponse…"
        style="flex:1"
      />

      <button id="ai-send">
        ➤
      </button>

    </div>
  `;

  const main = document.querySelector("main");

  if (main) {
    main.prepend(card);
  }

  document.querySelector("#close-ai-conversation").onclick =
    closeAIConversation;

  document.querySelector("#ai-send").onclick =
    sendAIInput;

  const input =
    document.querySelector("#ai-input");

  if (input) {

    input.onkeydown = event => {

      if (event.key === "Enter") {
        sendAIInput();
      }
    };

    input.focus();
  }

  updateAIMessages();
}

function updateAIMessages() {

  const container =
    document.querySelector("#ai-messages");

  if (!container || !aiConversation) return;

  container.innerHTML =
    aiConversation.messages
      .map(message => {

        const align =
          message.role === "user"
            ? "flex-end"
            : "flex-start";

        return `
          <div style="
            display:flex;
            justify-content:${align};
          ">
            <div style="
              max-width:85%;
              padding:10px 12px;
              border-radius:12px;
              background:var(--card-bg,#f2f4f7);
            ">
              ${escapeHTML(message.text)}
            </div>
          </div>
        `;
      })
      .join("");

  container.scrollTop =
    container.scrollHeight;
}

function sendAIInput() {

  const input =
    document.querySelector("#ai-input");

  if (!input) return;

  const text =
    input.value.trim();

  if (!text) return;

  input.value = "";

  sendAIMessage(text);
}

async function sendAIMessage(text) {

  if (!aiConversation) return;

  aiConversation.messages.push({
    role: "user",
    text
  });

  updateAIMessages();

  const result =
    document.querySelector("#ai-result");

  if (result) {
    result.innerHTML = "<p>⏳ Gemini réfléchit…</p>";
  }

  try {

    const history =
      aiConversation.messages
        .map(
          message =>
            `${message.role === "user" ? "Utilisateur" : "MyWeight Coach"}: ${message.text}`
        )
        .join("\n");

    const answer =
      await askAI(
        JSON.stringify({
          mode: aiConversation.mode,
          conversation: history
        })
      );

    let parsed;

    try {
      parsed = JSON.parse(answer);
    } catch (e) {
      parsed = {
        type: "message",
        message: answer
      };
    }

    if (parsed.message) {

      aiConversation.messages.push({
        role: "assistant",
        text: parsed.message
      });
    }

    aiConversation.result = parsed;

    updateAIMessages();
    renderAIResult();

  } catch (error) {

    aiConversation.messages.push({
      role: "assistant",
      text: "Erreur : " + error.message
    });

    updateAIMessages();
  }
}

function renderAIResult() {

  const result =
    document.querySelector("#ai-result");

  if (!result || !aiConversation) return;

  const data =
    aiConversation.result;

  if (!data) return;

  if (data.type === "meal" && data.ready && data.item) {

    const m = data.item;

    result.innerHTML = `
      <div class="card">

        <strong>🍎 Repas identifié</strong>

        <p>
          ${escapeHTML(m.name)}
        </p>

        <p>
          ${Math.round(m.kcal)} kcal ·
          P ${Math.round(m.p)}g ·
          G ${Math.round(m.c)}g ·
          L ${Math.round(m.f)}g
        </p>

        <div style="display:flex;gap:8px">

          <button id="ai-add-meal">
            ✓ Ajouter au journal
          </button>

          <button id="ai-cancel-result">
            Annuler
          </button>

        </div>

      </div>
    `;

    document.querySelector("#ai-add-meal").onclick =
      () => {

        addMeal(m);

        closeAIConversation();

        toast("Repas ajouté au journal");
      };

    document.querySelector("#ai-cancel-result").onclick =
      closeAIConversation;

    return;
  }

  if (data.type === "recipe" && data.ready && data.item) {

    const r = data.item;

    result.innerHTML = `
      <div class="card">

        <strong>🍳 Recette prête</strong>

        <p>
          ${escapeHTML(r.name)}
        </p>

        <p>
          ${r.servings || 1} portions
        </p>

        <p>
          ${Math.round(r.kcal)} kcal/portion ·
          P ${Math.round(r.p)}g ·
          G ${Math.round(r.c)}g ·
          L ${Math.round(r.f)}g
        </p>

        ${
          r.ingredients?.length
            ? `
              <details>
                <summary>Ingrédients</summary>
                <ul>
                  ${r.ingredients
                    .map(
                      i =>
                        `<li>${escapeHTML(i)}</li>`
                    )
                    .join("")}
                </ul>
              </details>
            `
            : ""
        }

        <div style="display:flex;gap:8px">

          <button id="ai-create-recipe">
            ✓ Créer la recette
          </button>

          <button id="ai-cancel-result">
            Annuler
          </button>

        </div>

      </div>
    `;

    document.querySelector("#ai-create-recipe").onclick =
      () => {

        s.recipes.push({
          name: r.name,
          kcal: Number(r.kcal) || 0,
          p: Number(r.p) || 0,
          c: Number(r.c) || 0,
          f: Number(r.f) || 0,
          servings: Number(r.servings) || 1,
          ingredients: r.ingredients || []
        });

        save();

        closeAIConversation();
        render();

        toast("Recette créée");
      };

    document.querySelector("#ai-cancel-result").onclick =
      closeAIConversation;

    return;
  }

  result.innerHTML = "";
}

function closeAIConversation() {

  aiConversation = null;

  const card =
    document.querySelector("#ai-conversation");

  if (card) {
    card.remove();
  }
}

/* =========================
   IA / WORKER
========================= */

async function askAI(message) {

  const response =
    await fetch(
      AI_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          message
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      JSON.stringify(data)
    );
  }

  return (
    data.answer ||
    "Je n'ai pas reçu de réponse."
  );
}

/* =========================
   UTILITAIRES
========================= */

function formatDate(date) {

  return new Date(date)
    .toLocaleDateString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );
}

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {

  const element =
    document.querySelector("#toast");

  if (!element) return;

  element.textContent = message;
  element.className = "show";

  setTimeout(() => {
    element.className = "";
  }, 2500);
}

render();

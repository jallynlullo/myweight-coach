const KEY = "mwc_v03";
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
} catch {}

let s = {
  ...defaults,
  ...saved,
  meals: Array.isArray(saved.meals) ? saved.meals : [],
  weights: Array.isArray(saved.weights) ? saved.weights : [],
  recipes: Array.isArray(saved.recipes) ? saved.recipes : []
};

let aiConversation = null;

function save() {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toast(message) {
  let el = document.getElementById("toast");

  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }

  el.textContent = message;
  el.className = "toast show";

  clearTimeout(el._timer);

  el._timer = setTimeout(() => {
    el.className = "toast";
  }, 2500);
}

function addMeal(meal) {
  const m = {
    name: String(meal.name || "Repas"),
    kcal: Math.round(num(meal.kcal)),
    p: Math.round(num(meal.p)),
    c: Math.round(num(meal.c)),
    f: Math.round(num(meal.f))
  };

  s.meals.push(m);

  s.eaten += m.kcal;
  s.protein += m.p;
  s.carbs += m.c;
  s.fat += m.f;

  save();
  render();

  toast(`${m.name} ajouté au journal`);
}

function deleteMeal(index) {
  const m = s.meals[index];

  if (!m) return;

  s.eaten -= num(m.kcal);
  s.protein -= num(m.p);
  s.carbs -= num(m.c);
  s.fat -= num(m.f);

  s.eaten = Math.max(0, s.eaten);
  s.protein = Math.max(0, s.protein);
  s.carbs = Math.max(0, s.carbs);
  s.fat = Math.max(0, s.fat);

  s.meals.splice(index, 1);

  save();
  render();
}

function addManualMeal() {
  const name = prompt("Nom du repas ou aliment ?");

  if (!name) return;

  const kcal = prompt("Calories ?");

  if (kcal === null) return;

  const p = prompt("Protéines (g) ?", "0");

  if (p === null) return;

  const c = prompt("Glucides (g) ?", "0");

  if (c === null) return;

  const f = prompt("Lipides (g) ?", "0");

  if (f === null) return;

  addMeal({
    name,
    kcal,
    p,
    c,
    f
  });
}

function addWeight() {
  const value = prompt(
    "Quel est ton poids actuel en kg ?",
    s.weight
  );

  if (value === null) return;

  const weight = Number(
    String(value).replace(",", ".")
  );

  if (!Number.isFinite(weight) || weight <= 0) {
    toast("Poids invalide");
    return;
  }

  s.weight = weight;

  s.weights.push({
    weight,
    date: new Date().toISOString()
  });

  save();
  render();

  toast(`${weight} kg enregistrés`);
}

function deleteWeight(index) {
  s.weights.splice(index, 1);

  if (s.weights.length) {
    s.weight = s.weights[
      s.weights.length - 1
    ].weight;
  }

  save();
  render();
}

function editSettings() {
  const goal = prompt(
    "Objectif de poids (kg)",
    s.goal
  );

  if (goal === null) return;

  const kcal = prompt(
    "Objectif calories quotidien",
    s.kcal
  );

  if (kcal === null) return;

  const g = Number(
    String(goal).replace(",", ".")
  );

  const k = Number(
    String(kcal).replace(",", ".")
  );

  if (!Number.isFinite(g) || g <= 0) {
    toast("Objectif de poids invalide");
    return;
  }

  if (!Number.isFinite(k) || k <= 0) {
    toast("Objectif calories invalide");
    return;
  }

  s.goal = g;
  s.kcal = k;

  save();
  render();

  toast("Réglages enregistrés");
}

function resetDay() {
  if (!confirm(
    "Réinitialiser les calories et macros du jour ?"
  )) {
    return;
  }

  s.eaten = 0;
  s.protein = 0;
  s.carbs = 0;
  s.fat = 0;
  s.meals = [];

  save();
  render();
}

function resetAll() {
  if (!confirm(
    "ATTENTION : supprimer toutes les données de MyWeight Coach ?"
  )) {
    return;
  }

  localStorage.removeItem(KEY);

  s = {
    ...defaults,
    meals: [],
    weights: [],
    recipes: []
  };

  render();

  toast("Données supprimées");
}

function startAIConversation(
  mode,
  firstMessage = ""
) {
  aiConversation = {
    mode,
    messages: [],
    result: null,
    loading: false
  };

  if (firstMessage) {
    aiConversation.messages.push({
      role: "user",
      text: firstMessage
    });

    sendAIMessage();
  }

  render();
}

function closeAIConversation() {
  aiConversation = null;
  render();
}

function renderAIConversation() {
  if (!aiConversation) return "";

  const title =
    aiConversation.mode === "recipe"
      ? "🍳 Création d'une recette"
      : "🥗 Analyse de ton repas";

  const messages =
    aiConversation.messages
      .map(m => {
        const cls =
          m.role === "user"
            ? "user"
            : "ai";

        return `
          <div class="ai-message ${cls}">
            ${esc(m.text).replaceAll("\n", "<br>")}
          </div>
        `;
      })
      .join("");

  let result = "";

  if (aiConversation.result?.ready) {
    const r = aiConversation.result.item;

    if (aiConversation.mode === "meal") {
      result = `
        <div class="ai-result">
          <h3>${esc(r.name)}</h3>

          <div class="nutrition">
            <strong>${Math.round(num(r.kcal))} kcal</strong>
            <span>Prot. ${Math.round(num(r.p))} g</span>
            <span>Gluc. ${Math.round(num(r.c))} g</span>
            <span>Lip. ${Math.round(num(r.f))} g</span>
          </div>

          <button
            class="primary"
            onclick="confirmAIMeal()"
          >
            Ajouter au journal
          </button>

          <button
            class="secondary"
            onclick="closeAIConversation()"
          >
            Annuler
          </button>
        </div>
      `;
    }

    if (aiConversation.mode === "recipe") {
      result = `
        <div class="ai-result">
          <h3>${esc(r.name)}</h3>

          <div class="nutrition">
            <strong>
              ${Math.round(num(r.kcal))} kcal / portion
            </strong>

            <span>
              Prot. ${Math.round(num(r.p))} g
            </span>

            <span>
              Gluc. ${Math.round(num(r.c))} g
            </span>

            <span>
              Lip. ${Math.round(num(r.f))} g
            </span>
          </div>

          <p>
            <strong>
              ${Math.max(
                1,
                Math.round(num(r.servings) || 1)
              )} portions
            </strong>
          </p>

          ${
            Array.isArray(r.ingredients) &&
            r.ingredients.length
              ? `
                <ul>
                  ${r.ingredients
                    .map(i => `<li>${esc(i)}</li>`)
                    .join("")}
                </ul>
              `
              : ""
          }

          <button
            class="primary"
            onclick="confirmAIRecipe()"
          >
            Créer la recette
          </button>

          <button
            class="secondary"
            onclick="closeAIConversation()"
          >
            Annuler
          </button>
        </div>
      `;
    }
  }

  return `
    <section class="ai-panel">

      <div class="ai-header">
        <h2>${title}</h2>

        <button
          class="icon-button"
          onclick="closeAIConversation()"
        >
          ✕
        </button>
      </div>

      <div class="ai-messages">
        ${
          messages ||
          `
            <div class="ai-message ai">
              Que veux-tu préparer ou analyser ?
            </div>
          `
        }
      </div>

      ${
        aiConversation.loading
          ? `
            <div class="ai-loading">
              ⏳ Gemini réfléchit…
            </div>
          `
          : ""
      }

      ${result}

      ${
        !aiConversation.result?.ready
          ? `
            <div class="ai-input-row">

              <input
                id="aiInput"
                type="text"
                placeholder="${
                  aiConversation.mode === "recipe"
                    ? "Ex. 2 personnes, 200 g de pâtes..."
                    : "Ex. J'ai mangé une pomme..."
                }"
                onkeydown="
                  if(event.key==='Enter')
                  sendAIInput()
                "
              >

              <button
                class="primary"
                onclick="sendAIInput()"
              >
                Envoyer
              </button>

            </div>

            <button
              class="secondary full"
              onclick="startVoiceConversation()"
            >
              🎙️ Parler
            </button>

            <button
              class="secondary full"
              onclick="closeAIConversation()"
            >
              Fermer la conversation
            </button>
          `
          : ""
      }

    </section>
  `;
}

function updateAIMessages() {
  const panel =
    document.querySelector(".ai-panel");

  if (panel) {
    panel.outerHTML =
      renderAIConversation();
  }
}

function sendAIInput() {
  const input =
    document.getElementById("aiInput");

  if (!input) return;

  const text = input.value.trim();

  if (!text) return;

  aiConversation.messages.push({
    role: "user",
    text
  });

  sendAIMessage();
}

function startVoiceConversation() {
  if (
    !("SpeechRecognition" in window) &&
    !("webkitSpeechRecognition" in window)
  ) {
    toast(
      "La reconnaissance vocale n'est pas disponible"
    );
    return;
  }

  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  const rec = new Recognition();

  rec.lang = "fr-FR";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  toast("🎙️ Je t'écoute…");

  rec.onresult = event => {
    const text =
      event.results[0][0].transcript;

    aiConversation.messages.push({
      role: "user",
      text
    });

    sendAIMessage();
  };

  rec.onerror = () => {
    toast(
      "Impossible d'utiliser le microphone"
    );
  };

  rec.start();
}

async function sendAIMessage() {
  if (
    !aiConversation ||
    aiConversation.loading
  ) {
    return;
  }

  aiConversation.loading = true;
  updateAIMessages();

  try {
    const data = await askAI({
      mode: aiConversation.mode,
      history: aiConversation.messages
    });

    let answer = data;

    if (typeof data === "string") {
      try {
        answer = JSON.parse(data);
      } catch {
        answer = {
          type: "message",
          message: data,
          ready: false
        };
      }
    }

    if (
      !answer ||
      typeof answer !== "object"
    ) {
      throw new Error(
        "Réponse IA invalide"
      );
    }

    if (answer.message) {
      aiConversation.messages.push({
        role: "assistant",
        text: answer.message
      });
    }

    aiConversation.result = answer;

  } catch (error) {

    console.error(error);

    aiConversation.messages.push({
      role: "assistant",
      text:
        error.message ||
        "Une erreur est survenue avec l'intelligence artificielle."
    });
  }

  aiConversation.loading = false;

  updateAIMessages();
}

async function askAI(payload) {
  const response = await fetch(
    AI_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        mode:
          payload.mode || "meal",

        messages:
          Array.isArray(payload.messages)
            ? payload.messages
            : []
      })
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Erreur IA"
    );
  }

  if (!data.result) {
    throw new Error(
      "Réponse IA invalide"
    );
  }

  return data.result;
}

  return answer;
}

function confirmAIMeal() {
  if (
    !aiConversation?.result?.item
  ) {
    return;
  }

  addMeal(
    aiConversation.result.item
  );

  aiConversation = null;

  render();
}
function confirmAIRecipe() {
  if (!aiConversation?.result?.item) {
    return;
  }

  const r = aiConversation.result.item;

  const recipe = {
    name: String(r.name || "Recette"),
    kcal: Math.round(num(r.kcal)),
    p: Math.round(num(r.p)),
    c: Math.round(num(r.c)),
    f: Math.round(num(r.f)),
    servings: Math.max(
      1,
      Math.round(num(r.servings) || 1)
    ),
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.map(String)
      : []
  };

  s.recipes.push(recipe);

  save();

  aiConversation = null;

  render();

  toast("Recette créée");
}

function createRecipe() {
  startAIConversation("recipe");
}

function addRecipeToJournal(index) {
  const recipe = s.recipes[index];

  if (!recipe) return;

  addMeal({
    name: `${recipe.name} — 1 portion`,
    kcal: recipe.kcal,
    p: recipe.p,
    c: recipe.c,
    f: recipe.f
  });
}

function editRecipe(index) {
  const r = s.recipes[index];

  if (!r) return;

  const name = prompt(
    "Nom de la recette",
    r.name
  );

  if (name === null) return;

  const kcal = prompt(
    "Calories par portion",
    r.kcal
  );

  if (kcal === null) return;

  const p = prompt(
    "Protéines par portion (g)",
    r.p
  );

  if (p === null) return;

  const c = prompt(
    "Glucides par portion (g)",
    r.c
  );

  if (c === null) return;

  const f = prompt(
    "Lipides par portion (g)",
    r.f
  );

  if (f === null) return;

  r.name = name;
  r.kcal = Math.round(num(kcal));
  r.p = Math.round(num(p));
  r.c = Math.round(num(c));
  r.f = Math.round(num(f));

  save();
  render();

  toast("Recette modifiée");
}

function deleteRecipe(index) {
  if (!confirm(
    "Supprimer cette recette ?"
  )) {
    return;
  }

  s.recipes.splice(index, 1);

  save();
  render();
}

function voice() {
  if (
    !("SpeechRecognition" in window) &&
    !("webkitSpeechRecognition" in window)
  ) {
    toast(
      "Reconnaissance vocale indisponible"
    );
    return;
  }

  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  const rec = new Recognition();

  rec.lang = "fr-FR";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  toast("🎙️ Je t'écoute…");

  rec.onresult = event => {
    const text =
      event.results[0][0].transcript;

    const weightMatch = text.match(
      /(?:poids|pèse|pesée|peser).*?(\d+[,.]?\d*)\s*(?:kg|kilo|kilos)?/i
    );

    if (weightMatch) {
      const weight =
        Number(
          weightMatch[1].replace(",", ".")
        );

      if (weight > 0) {
        s.weight = weight;

        s.weights.push({
          weight,
          date: new Date().toISOString()
        });

        save();
        render();

        toast(
          `${weight} kg enregistrés`
        );

        return;
      }
    }

    startAIConversation(
      "meal",
      text
    );
  };

  rec.onerror = () => {
    toast("Erreur microphone");
  };

  rec.start();
}

function showPage(page) {
  document
    .querySelectorAll(".page")
    .forEach(el => {
      el.style.display = "none";
    });

  const target =
    document.getElementById(
      `page-${page}`
    );

  if (target) {
    target.style.display = "block";
  }

  document
    .querySelectorAll(".nav-button")
    .forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.page === page
      );
    });
}

function renderHome() {
  const remaining =
    Math.max(
      0,
      s.kcal - s.eaten
    );

  return `
    <div
      class="page"
      id="page-home"
    >

      <section class="hero">
        <h1>MyWeight Coach</h1>
        <p>
          Ton coach alimentaire personnel
        </p>
      </section>

      <section class="card">
        <h2>Aujourd'hui</h2>

        <div class="big-number">
          ${Math.round(s.eaten)}
          <small>
            / ${Math.round(s.kcal)} kcal
          </small>
        </div>

        <p>
          Il te reste
          <strong>
            ${Math.round(remaining)} kcal
          </strong>.
        </p>

        <div class="macros">

          <div>
            <strong>
              ${Math.round(s.protein)} g
            </strong>
            <span>Protéines</span>
          </div>

          <div>
            <strong>
              ${Math.round(s.carbs)} g
            </strong>
            <span>Glucides</span>
          </div>

          <div>
            <strong>
              ${Math.round(s.fat)} g
            </strong>
            <span>Lipides</span>
          </div>

        </div>
      </section>

      <section class="card">

        <h2>Poids</h2>

        <div class="big-number">
          ${s.weight.toFixed(1)}
          <small>kg</small>
        </div>

        <p>
          Objectif :
          <strong>
            ${s.goal} kg
          </strong>
        </p>

        <button
          class="primary full"
          onclick="addWeight()"
        >
          ⚖️ Enregistrer mon poids
        </button>

      </section>

      <section class="actions">

        <button
          class="primary"
          onclick="voice()"
        >
          🎙️ Parler au coach
        </button>

        <button
          class="secondary"
          onclick="addManualMeal()"
        >
          ➕ Ajouter un repas
        </button>

      </section>

      ${
        aiConversation
          ? renderAIConversation()
          : ""
      }

      ${renderRecipesSection()}

    </div>
  `;
}

function renderJournal() {
  return `
    <div
      class="page"
      id="page-journal"
    >

      <section class="card">

        <h1>📖 Journal</h1>

        <div class="big-number">
          ${Math.round(s.eaten)}
          <small>
            / ${Math.round(s.kcal)} kcal
          </small>
        </div>

        ${
          s.meals.length
            ? `
              <div class="meal-list">

                ${s.meals
                  .map(
                    (m, i) => `
                      <div class="meal">

                        <div>
                          <strong>
                            ${esc(m.name)}
                          </strong>

                          <small>
                            ${m.kcal} kcal ·
                            P ${m.p} g ·
                            G ${m.c} g ·
                            L ${m.f} g
                          </small>
                        </div>

                        <button
                          class="danger"
                          onclick="deleteMeal(${i})"
                        >
                          🗑️
                        </button>

                      </div>
                    `
                  )
                  .join("")}

              </div>
            `
            : `
              <p>
                Aucun repas enregistré
                aujourd'hui.
              </p>
            `
        }

        <button
          class="secondary full"
          onclick="resetDay()"
        >
          Réinitialiser la journée
        </button>

      </section>

      <section class="card">

        <h2>
          ⚖️ Historique du poids
        </h2>

        ${
          s.weights.length
            ? `
              <div class="weight-list">

                ${s.weights
                  .slice()
                  .reverse()
                  .map(
                    (w, reverseIndex) => {

                      const index =
                        s.weights.length -
                        1 -
                        reverseIndex;

                      return `
                        <div class="meal">

                          <div>

                            <strong>
                              ${Number(
                                w.weight
                              ).toFixed(1)} kg
                            </strong>

                            <small>
                              ${new Date(
                                w.date
                              ).toLocaleDateString(
                                "fr-FR"
                              )}
                            </small>

                          </div>

                          <button
                            class="danger"
                            onclick="deleteWeight(${index})"
                          >
                            🗑️
                          </button>

                        </div>
                      `;
                    }
                  )
                  .join("")}

              </div>
            `
            : `
              <p>
                Aucun historique.
              </p>
            `
        }

      </section>

    </div>
  `;
}

function renderRecipesSection() {
  return `
    <section class="card">

      <div class="section-title">

        <h2>
          🍳 Mes recettes
        </h2>

        <button
          class="primary"
          onclick="createRecipe()"
        >
          + Créer
        </button>

      </div>

      ${
        s.recipes.length
          ? `
            <div class="recipe-list">

              ${s.recipes
                .map(
                  (r, i) => `
                    <div class="recipe">

                      <div>

                        <strong>
                          ${esc(r.name)}
                        </strong>

                        <small>
                          ${r.kcal} kcal / portion ·
                          P ${r.p} g ·
                          G ${r.c} g ·
                          L ${r.f} g
                        </small>

                      </div>

                      <div class="recipe-actions">

                        <button
                          class="primary"
                          onclick="addRecipeToJournal(${i})"
                        >
                          +1
                        </button>

                        <button
                          class="secondary"
                          onclick="editRecipe(${i})"
                        >
                          ✏️
                        </button>

                        <button
                          class="danger"
                          onclick="deleteRecipe(${i})"
                        >
                          🗑️
                        </button>

                      </div>

                    </div>
                  `
                )
                .join("")}

            </div>
          `
          : `
            <p>
              Aucune recette enregistrée.
              Crée ta première recette
              avec Gemini.
            </p>
          `
      }

    </section>
  `;
}

function renderSettings() {
  return `
    <div
      class="page"
      id="page-settings"
    >

      <section class="card">

        <h1>
          ⚙️ Réglages
        </h1>

        <div class="setting">
          <span>
            Poids actuel
          </span>

          <strong>
            ${s.weight} kg
          </strong>
        </div>

        <div class="setting">
          <span>
            Objectif de poids
          </span>

          <strong>
            ${s.goal} kg
          </strong>
        </div>

        <div class="setting">
          <span>
            Objectif calories
          </span>

          <strong>
            ${s.kcal} kcal
          </strong>
        </div>

        <button
          class="primary full"
          onclick="editSettings()"
        >
          Modifier mes objectifs
        </button>

      </section>

      <section class="card">

        <h2>
          💾 Données
        </h2>

        <button
          class="secondary full"
          onclick="exportData()"
        >
          Exporter mes données
        </button>

        <button
          class="secondary full"
          onclick="importData()"
        >
          Importer mes données
        </button>

        <button
          class="danger full"
          onclick="resetAll()"
        >
          Supprimer toutes mes données
        </button>

      </section>

    </div>
  `;
}

function exportData() {
  const blob = new Blob(
    [
      JSON.stringify(
        s,
        null,
        2
      )
    ],
    {
      type: "application/json"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    "myweight-coach-backup.json";

  a.click();

  URL.revokeObjectURL(url);
}

function importData() {
  const input =
    document.createElement("input");

  input.type = "file";
  input.accept =
    "application/json";

  input.onchange = async () => {

    const file =
      input.files?.[0];

    if (!file) return;

    try {

      const imported =
        JSON.parse(
          await file.text()
        );

      s = {
        ...defaults,
        ...imported,

        meals:
          Array.isArray(
            imported.meals
          )
            ? imported.meals
            : [],

        weights:
          Array.isArray(
            imported.weights
          )
            ? imported.weights
            : [],

        recipes:
          Array.isArray(
            imported.recipes
          )
            ? imported.recipes
            : []
      };

      save();
      render();

      toast(
        "Données importées"
      );

    } catch {

      toast(
        "Fichier invalide"
      );
    }
  };

  input.click();
}

function render() {
  const app =
    document.getElementById(
      "app"
    );

  if (!app) return;

  app.innerHTML = `
    ${renderHome()}
    ${renderJournal()}
    ${renderSettings()}

    <nav class="bottom-nav">

      <button
        class="nav-button active"
        data-page="home"
        onclick="showPage('home')"
      >
        🏠
        <span>
          Accueil
        </span>
      </button>

      <button
        class="nav-button"
        data-page="journal"
        onclick="showPage('journal')"
      >
        📖
        <span>
          Journal
        </span>
      </button>

      <button
        class="nav-button"
        data-page="settings"
        onclick="showPage('settings')"
      >
        ⚙️
        <span>
          Réglages
        </span>
      </button>

    </nav>
  `;

  showPage("home");
}

window.addMeal =
  addMeal;

window.addWeight =
  addWeight;

window.deleteMeal =
  deleteMeal;

window.deleteWeight =
  deleteWeight;

window.addManualMeal =
  addManualMeal;

window.resetDay =
  resetDay;

window.resetAll =
  resetAll;

window.editSettings =
  editSettings;

window.startAIConversation =
  startAIConversation;

window.closeAIConversation =
  closeAIConversation;

window.sendAIInput =
  sendAIInput;

window.startVoiceConversation =
  startVoiceConversation;

window.confirmAIMeal =
  confirmAIMeal;

window.confirmAIRecipe =
  confirmAIRecipe;

window.createRecipe =
  createRecipe;

window.addRecipeToJournal =
  addRecipeToJournal;

window.editRecipe =
  editRecipe;

window.deleteRecipe =
  deleteRecipe;

window.voice =
  voice;

window.showPage =
  showPage;

window.exportData =
  exportData;

window.importData =
  importData;

render();

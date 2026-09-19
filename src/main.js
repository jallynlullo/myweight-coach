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
  weights: []
};

let saved = {};

try {
  saved = JSON.parse(localStorage.getItem(KEY) || "{}");
} catch (e) {
  localStorage.removeItem(KEY);
}

let s = {
  ...defaults,
  ...saved
};

let rec = null;
let currentPage = "home";

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
            <b>${s.eaten} / ${s.kcal}</b>
          </div>

          <div class="card stat">
            <span>Protéines</span>
            <b>${s.protein} g</b>
          </div>

          <div class="card stat">
            <span>Glucides</span>
            <b>${s.carbs} g</b>
          </div>

          <div class="card stat">
            <span>Lipides</span>
            <b>${s.fat} g</b>
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
              ? s.meals
                  .map(
                    (m, i) => `
                      <div class="meal">

                        <div>
                          <b>${escapeHTML(m.name)}</b>

                          <small>
                            ${m.kcal} kcal ·
                            P ${m.p}g ·
                            G ${m.c}g ·
                            L ${m.f}g
                          </small>
                        </div>

                        <button
                          data-meal-delete="${i}"
                          aria-label="Supprimer le repas"
                        >
                          ×
                        </button>

                      </div>
                    `
                  )
                  .join("")
              : "<p>Aucun repas enregistré.</p>"
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

      <button
        class="mic"
        id="mic"
        aria-label="Commande vocale"
      >
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
              ? s.meals
                  .map(
                    (m, i) => `
                      <div class="meal">

                        <div>
                          <b>
                            ${escapeHTML(m.name)}
                          </b>

                          <small>
                            ${m.kcal} kcal ·
                            P ${m.p}g ·
                            G ${m.c}g ·
                            L ${m.f}g
                          </small>
                        </div>

                        <button
                          data-meal-delete="${i}"
                          aria-label="Supprimer le repas"
                        >
                          ×
                        </button>

                      </div>
                    `
                  )
                  .join("")
              : "<p>Aucun repas enregistré.</p>"
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
              ? weights
                  .map(
                    (item, index) => `
                      <div class="meal">

                        <div>

                          <b>
                            ${formatDate(item.date)}
                          </b>

                          <small>
                            Pesée enregistrée
                          </small>

                        </div>

                        <div
                          style="
                            display:flex;
                            align-items:center;
                            gap:8px;
                          "
                        >

                          <strong>
                            ${item.weight} kg
                          </strong>

                          <button
                            data-weight-delete="${index}"
                            aria-label="Supprimer la pesée"
                          >
                            ×
                          </button>

                        </div>

                      </div>
                    `
                  )
                  .join("")
              : "<p>Aucune pesée enregistrée.</p>"
          }

        </section>

      </main>

      ${navigation("journal")}

      <button
        class="mic"
        id="mic"
        aria-label="Commande vocale"
      >
        🎙️
      </button>

      <div id="toast"></div>

    </div>
  `;

  bindJournal();
}

function navigation(page) {
  return `
    <nav>

      <span
        id="nav-home"
        style="
          cursor:pointer;
          opacity:${page === "home" ? "1" : ".55"}
        "
      >
        ⌂
        <small>Accueil</small>
      </span>

      <span
        id="nav-journal"
        style="
          cursor:pointer;
          opacity:${page === "journal" ? "1" : ".55"}
        "
      >
        ◷
        <small>Journal</small>
      </span>

      <span
        id="nav-settings"
        style="
          cursor:pointer;
          opacity:.55
        "
      >
        ⚙
        <small>Réglages</small>
      </span>

    </nav>
  `;
}

function bindNavigation() {

  const home =
    document.querySelector("#nav-home");

  const journal =
    document.querySelector("#nav-journal");

  const settings =
    document.querySelector("#nav-settings");

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

function bindHome() {

  bindNavigation();

  const mic =
    document.querySelector("#mic");

  const mealButton =
    document.querySelector("#meal");

  const weightButton =
    document.querySelector("#weight");

  const resetButton =
    document.querySelector("#reset");

  if (mic) {
    mic.onclick = listen;
  }

  if (mealButton) {
    mealButton.onclick = meal;
  }

  if (weightButton) {
    weightButton.onclick = weight;
  }

  if (resetButton) {
    resetButton.onclick = resetApp;
  }

  bindDeleteButtons();
}

function bindJournal() {

  bindNavigation();

  const mic =
    document.querySelector("#mic");

  const mealButton =
    document.querySelector("#meal");

  const weightButton =
    document.querySelector("#weight");

  if (mic) {
    mic.onclick = listen;
  }

  if (mealButton) {
    mealButton.onclick = meal;
  }

  if (weightButton) {
    weightButton.onclick = weight;
  }

  bindDeleteButtons();
}

function bindDeleteButtons() {

  document
    .querySelectorAll("[data-meal-delete]")
    .forEach(button => {

      button.onclick = () => {

        const index =
          Number(button.dataset.mealDelete);

        const m =
          s.meals[index];

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

        const reversedIndex =
          Number(button.dataset.weightDelete);

        const weights =
          [...s.weights].reverse();

        const item =
          weights[reversedIndex];

        if (!item) return;

        const realIndex =
          s.weights.indexOf(item);

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

function meal() {

  const name =
    prompt(
      "Nom du repas ?",
      "Repas"
    );

  if (!name) return;

  const kcal =
    Number(
      prompt(
        "Calories ?",
        "500"
      )
    ) || 0;

  const protein =
    Number(
      prompt(
        "Protéines (g) ?",
        "30"
      )
    ) || 0;

  const carbs =
    Number(
      prompt(
        "Glucides (g) ?",
        "50"
      )
    ) || 0;

  const fat =
    Number(
      prompt(
        "Lipides (g) ?",
        "15"
      )
    ) || 0;

  s.meals.push({
    name,
    kcal,
    p: protein,
    c: carbs,
    f: fat
  });

  s.eaten += kcal;
  s.protein += protein;
  s.carbs += carbs;
  s.fat += fat;

  save();
  render();

  toast("Repas ajouté");
}

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

    rec =
      new SpeechRecognition();

    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    const button =
      document.querySelector("#mic");

    if (button) {
      button.textContent = "⏹️";
    }

    toast("Je t’écoute…");

    rec.onstart = () => {

      const button =
        document.querySelector("#mic");

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

      toast(
        "J’ai entendu : " + text
      );

      voice(text);
    };

    rec.onerror = event => {

      console.log(
        "SpeechRecognition error:",
        event.error
      );

      let message =
        "Erreur du micro.";

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

      const button =
        document.querySelector("#mic");

      if (button) {
        button.textContent = "🎙️";
      }
    };

    rec.onend = () => {

      rec = null;

      const button =
        document.querySelector("#mic");

      if (button) {
        button.textContent = "🎙️";
      }
    };

    rec.start();

  } catch (error) {

    console.error(error);

    rec = null;

    const button =
      document.querySelector("#mic");

    if (button) {
      button.textContent = "🎙️";
    }

    toast(
      "Impossible de démarrer le micro."
    );
  }
}

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

  toast("Analyse IA en cours…");

  const answer =
    await askAI(text);

  showAIResponse(answer);
}

async function askAI(message) {

  try {

    const response =
      await fetch(
        AI_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            message: message
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
  throw new Error(JSON.stringify(data));
    }

    return (
      data.answer ||
      "Je n'ai pas reçu de réponse."
    );

  } catch (error) {

    console.error(
      "Erreur IA :",
      error
    );

    return (
      "Je n'arrive pas à contacter " +
      "mon coach IA pour le moment."
    );
  }
}

function showAIResponse(answer) {

  const existing =
    document.querySelector("#ai-response");

  if (existing) {
    existing.remove();
  }

  const card =
    document.createElement("section");

  card.id = "ai-response";
  card.className = "card";

  card.innerHTML = `
    <div class="title">
      <h2>🤖 MyWeight Coach</h2>

      <button id="close-ai">
        ×
      </button>
    </div>

    <p style="white-space:pre-wrap">
      ${escapeHTML(answer)}
    </p>
  `;

  const main =
    document.querySelector("main");

  if (main) {
    main.prepend(card);
  }

  const close =
    document.querySelector("#close-ai");

  if (close) {
    close.onclick = () => {
      card.remove();
    };
  }
}

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

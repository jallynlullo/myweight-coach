const KEY = "mwc_v03";

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

let s = { ...defaults, ...saved };
let rec = null;

function save() {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function render() {
  const app = document.querySelector("#app");

  if (!app) return;

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
            <button id="meal">+ Ajouter</button>
          </div>

          ${
            s.meals.length
              ? s.meals
                  .map(
                    (m, i) => `
                      <div class="meal">
                        <div>
                          <b>${m.name}</b>
                          <small>
                            ${m.kcal} kcal ·
                            P ${m.p}g ·
                            G ${m.c}g ·
                            L ${m.f}g
                          </small>
                        </div>
                        <button data-d="${i}">×</button>
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
            <button id="weight">+ Pesée</button>
          </div>

          <strong class="big">${s.weight} kg</strong>

        </section>

      </main>

      <nav>
        <span>⌂<small>Accueil</small></span>
        <span>◷<small>Journal</small></span>
        <span>⚙<small>Réglages</small></span>
      </nav>

      <button class="mic" id="mic">🎙️</button>

      <div id="toast"></div>

    </div>
  `;

  bind();
}

function toast(message) {
  const element = document.querySelector("#toast");

  if (!element) return;

  element.textContent = message;
  element.className = "show";

  setTimeout(() => {
    element.className = "";
  }, 2200);
}

function bind() {
  document.querySelector("#mic").onclick = listen;
  document.querySelector("#meal").onclick = meal;
  document.querySelector("#weight").onclick = weight;

  document.querySelector("#reset").onclick = () => {
    localStorage.removeItem(KEY);
    s = { ...defaults };
    render();
  };

  document.querySelectorAll("[data-d]").forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.d);
      const m = s.meals.splice(index, 1)[0];

      if (!m) return;

      s.eaten -= m.kcal;
      s.protein -= m.p;
      s.carbs -= m.c;
      s.fat -= m.f;

      save();
      render();
    };
  });
}

function meal() {
  const name = prompt("Nom du repas ?", "Repas");

  if (!name) return;

  const kcal = Number(prompt("Calories ?", "500")) || 0;
  const protein = Number(prompt("Protéines (g) ?", "30")) || 0;
  const carbs = Number(prompt("Glucides (g) ?", "50")) || 0;
  const fat = Number(prompt("Lipides (g) ?", "15")) || 0;

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
}

function weight() {
  const value = Number(prompt("Poids actuel (kg) ?", s.weight));

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

function listen() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    toast("La dictée vocale n’est pas disponible ici.");
    return;
  }

  if (rec) {
    rec.stop();
    return;
  }

  rec = new SpeechRecognition();
  rec.lang = "fr-FR";
  rec.interimResults = false;

  rec.onresult = event => {
    const text =
      event.results[0][0].transcript;

    toast("J’ai entendu : " + text);
    voice(text);
  };

  rec.onerror = event => {
    toast("Micro : " + event.error);
  };

  rec.onend = () => {
    rec = null;

    const button = document.querySelector("#mic");

    if (button) {
      button.textContent = "🎙️";
    }
  };

  const button = document.querySelector("#mic");

  if (button) {
    button.textContent = "⏹️";
  }

  toast("Je t’écoute…");

  rec.start();
}

function voice(text) {
  const weightMatch = text.match(
    /(?:poids|pèse|pesée).*?(\d+[,.]?\d*)\s*kg/i
  );

  if (weightMatch) {
    s.weight = Number(
      weightMatch[1].replace(",", ".")
    );

    s.weights.push({
      date: new Date().toISOString(),
      weight: s.weight
    });

    save();
    render();

    toast("Poids enregistré");

    return;
  }

  const kcalMatch = text.match(
    /(\d+)\s*(?:kcal|calories)/i
  );

  if (
    /mangé|mange|repas|déjeun|dîné/i.test(text)
  ) {
    const kcal = kcalMatch
      ? Number(kcalMatch[1])
      : 0;

    s.meals.push({
      name: text,
      kcal,
      p: 0,
      c: 0,
      f: 0
    });

    s.eaten += kcal;

    save();
    render();

    toast("Repas ajouté");

    return;
  }

  toast(
    "Commande reçue. L’analyse IA arrive dans la prochaine version."
  );
}

render();

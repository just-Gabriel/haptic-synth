let selectedPattern = [];
let allVibrations = [];

const filtersDiv = document.getElementById("filters");
const desc = document.getElementById("description");
const btn = document.getElementById("vibrateBtn");
const tagsDiv = document.createElement("div");
const generated = document.getElementById("generatedPattern");

tagsDiv.id = "tags";
filtersDiv.before(tagsDiv); // Insère les tags au-dessus des boutons

// Fonction pour générer les boutons vibrations
function displayVibrations(vibrations) {
  filtersDiv.innerHTML = ""; // Reset affichage
  vibrations.forEach((vibration) => {
    const b = document.createElement("button");
    b.textContent = vibration.label;
    b.onclick = () => {
      selectedPattern = vibration.pattern;
      desc.textContent = vibration.description;
      btn.disabled = false;
    };
    filtersDiv.appendChild(b);
  });
}

// Fonction pour récupérer tous les tags uniques
function getAllTags(vibrations) {
  const tagSet = new Set();
  vibrations.forEach((v) => {
    if (v.tags) {
      v.tags.forEach((tag) => tagSet.add(tag));
    }
  });
  return Array.from(tagSet);
}

// Fonction pour afficher les tags filtres
function displayTagFilters(tags) {
  tagsDiv.innerHTML = "<strong>Filtrer par émotion :</strong><br/>";
  tags.forEach((tag) => {
    const tagBtn = document.createElement("button");
    tagBtn.textContent = tag;
    tagBtn.onclick = () => {
      const filtered = allVibrations.filter(
        (v) => v.tags && v.tags.includes(tag)
      );
      displayVibrations(filtered);
      desc.textContent = `Vibrations pour : "${tag}"`;
      btn.disabled = true;
    };
    tagsDiv.appendChild(tagBtn);
  });

  // Bouton pour afficher tout
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Afficher tout";
  resetBtn.onclick = () => {
    displayVibrations(allVibrations);
    desc.textContent = "Clique sur un pattern pour tester";
    btn.disabled = true;
  };
  tagsDiv.appendChild(resetBtn);
}

// Récupère les données JSON
fetch("data/vibrations.json")
  .then((res) => res.json())
  .then((data) => {
    allVibrations = data;
    const tags = getAllTags(data);
    displayTagFilters(tags);
    displayVibrations(data);

    setupVibrationButton();
  });

// Fonction pour simuler un feedback visuel
function simulateVisualFeedback(pattern) {
  const container = document.getElementById("waveContainer");
  const audio = document.getElementById("pulseSound");

  container.innerHTML = "";
  container.style.display = "flex";

  let i = 0;

  function pulse() {
    if (i >= pattern.length) {
      container.style.display = "none";
      return;
    }

    const delay = pattern[i];

    const circle = document.createElement("div");
    circle.classList.add("wave-circle");
    container.appendChild(circle);

    // 🔊 jouer un son à chaque vibration
    if (audio) {
      const beep = audio.cloneNode(); // clone pour éviter les blocages de lecture
      beep.play().catch(() => {}); // éviter erreur iOS si déjà bloqué
    }

    setTimeout(() => {
      container.removeChild(circle);
      i++;
      pulse();
    }, delay);
  }

  pulse();
}

document.getElementById("uploadForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData(this);

  console.log("🟡 Envoi du fichier à l'API...");

  fetch("/api/convert", {
    method: "POST",
    body: formData,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Erreur HTTP " + response.status + " : " + errorText);
      }
      return response.json();
    })
    .then((data) => {
      const pattern = data.pattern;
      selectedPattern = pattern;

      // 🔁 On garde la description actuelle, mais on affiche le pattern ailleurs
      desc.textContent = "Pattern généré personnalisé prêt à être testé";
      generated.textContent = `▶️ Pattern généré : [${pattern.join(", ")}]`;
      btn.disabled = false;
      setupVibrationButton();

      // === Affichage .ahap iOS ou erreur ===
      const ahapTextArea = document.getElementById('ahapJson');
      const ahapErrorDiv = document.getElementById('ahapError');
      const ahapBtn = document.getElementById('downloadAhapBtn');

      if (data.ahap) {
        // Affiche le pattern .ahap
        ahapTextArea.style.display = 'block';
        ahapErrorDiv.style.display = 'none';
        ahapTextArea.value = JSON.stringify(data.ahap, null, 2);

        // Prépare le bouton téléchargement
        const ahapBlob = new Blob([JSON.stringify(data.ahap, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(ahapBlob);
        ahapBtn.style.display = 'inline-block';
        ahapBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = url;
          a.download = "pattern.ahap";
          a.click();
        };
      } else if (data.ahap_error) {
        ahapTextArea.style.display = 'none';
        ahapBtn.style.display = 'none';
        ahapErrorDiv.style.display = 'block';
        ahapErrorDiv.textContent = "Erreur lors de la génération du pattern iOS (.ahap) :\n" + data.ahap_error;
      } else {
        ahapTextArea.style.display = 'none';
        ahapBtn.style.display = 'none';
        ahapErrorDiv.style.display = 'none';
      }

      console.log("✅ Pattern reçu :", pattern);
    })

    .catch((err) => {
      console.error("❌ Erreur lors de la conversion :", err);
      alert("❌ Erreur lors de la conversion du fichier .wav : " + err.message);
    });
});

function setupVibrationButton() {
  btn.onclick = () => {
    const audio = document.getElementById("pulseSound");
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch((e) => console.warn("⛔ Audio bloqué :", e));
    }

    if ("vibrate" in navigator && navigator.vibrate) {
      navigator.vibrate(0);
      navigator.vibrate(selectedPattern);
    }

    simulateVisualFeedback(selectedPattern);
  };
}

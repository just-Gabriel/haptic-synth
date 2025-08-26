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
  const amplitude = data.amplitude || [];
  selectedPattern = pattern;

  desc.textContent = "Pattern généré personnalisé prêt à être testé";
  generated.innerHTML = `
    <b>Pattern :</b> [${pattern.join(", ")}]<br>
    <b>Amplitude :</b> [${amplitude.join(", ")}]
  `;
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

// ========================
// SYNTHETISEUR HAPTIQUE
// ========================

// Modèle : un segment = { type: "vibration" | "pause", duration: ms, intensity: 0-255 (pour vibration) }
let synthSegments = [];

// Ajout de segment (vibration ou pause)
document.getElementById("synthAddVibration").onclick = () => {
  synthSegments.push({
    type: "vibration",
    duration: 200,     // par défaut
    intensity: 255     // max par défaut
  });
  renderSynthSegments();
};
document.getElementById("synthAddPause").onclick = () => {
  synthSegments.push({
    type: "pause",
    duration: 100      // par défaut
  });
  renderSynthSegments();
};

// Réinitialisation synthé
document.getElementById("synthReset").onclick = () => {
  synthSegments = [];
  renderSynthSegments();
};

// Fonction d'affichage/édition dynamique des segments
function renderSynthSegments() {
  const container = document.getElementById("synthContainer");
  container.innerHTML = "";

  if (synthSegments.length === 0) {
    container.innerHTML = `<p style="color:#bbb;font-style:italic;">Ajoute un segment de vibration ou une pause</p>`;
  }

  synthSegments.forEach((seg, idx) => {
    const div = document.createElement("div");
    div.className = "form-group";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "8px";
    div.style.marginBottom = "6px";

    let html = "";
    if (seg.type === "vibration") {
      html += `💥 <label>Durée</label>
        <input type="number" value="${seg.duration}" min="20" max="4000" step="10" style="width:60px"
          onchange="updateSynthSegment(${idx}, 'duration', this.value)">
        <label>Intensité</label>
        <input type="number" value="${seg.intensity}" min="1" max="255" step="1" style="width:55px"
          onchange="updateSynthSegment(${idx}, 'intensity', this.value)">
      `;
    } else {
      html += `⏸️ <label>Pause</label>
        <input type="number" value="${seg.duration}" min="10" max="4000" step="10" style="width:60px"
          onchange="updateSynthSegment(${idx}, 'duration', this.value)">
      `;
    }
    html += `<button onclick="deleteSynthSegment(${idx})" class="btn-accueil" style="padding:2px 9px;">❌</button>`;
    div.innerHTML = html;
    container.appendChild(div);
  });

  updateSynthPatternDisplay();
}

// Mise à jour d'un segment
window.updateSynthSegment = function(idx, field, value) {
  if (synthSegments[idx]) {
    if (field === "duration") synthSegments[idx].duration = parseInt(value);
    if (field === "intensity") synthSegments[idx].intensity = parseInt(value);
    renderSynthSegments();
  }
}

// Suppression d'un segment
window.deleteSynthSegment = function(idx) {
  synthSegments.splice(idx, 1);
  renderSynthSegments();
}

// Affichage pattern actuel
function updateSynthPatternDisplay() {
  const pattern = synthSegments.map(seg => seg.duration);
  const amplitude = synthSegments.map(seg => seg.type === "vibration" ? seg.intensity : 0);
  document.getElementById("synthPatternDisplay").innerHTML =
    `<b>Pattern :</b> [${pattern.join(", ")}]<br><b>Amplitude :</b> [${amplitude.join(", ")}]`;
}

// Tester la vibration sur Android/Web
document.getElementById("synthPlayBtn").onclick = () => {
  // Génère le pattern
  const pattern = synthSegments.map(seg => seg.duration);

  if ("vibrate" in navigator && navigator.vibrate) {
    navigator.vibrate(0); // Stoppe une vibration en cours
    navigator.vibrate(pattern); // Joue le pattern
  } else {
    alert("❌ Vibration non supportée sur ce navigateur.");
  }

  // Optionnel : feedback visuel
  simulateVisualFeedback(pattern);
};

// Export Android pattern+amplitude (.json)
document.getElementById("synthExportBtn").onclick = () => {
  if (!synthSegments.length) {
    alert("Ajoute d'abord des segments !");
    return;
  }
  const pattern = synthSegments.map(seg => seg.duration);
  const amplitude = synthSegments.map(seg => seg.type === "vibration" ? seg.intensity : 0);

  const exportData = {
    pattern,
    amplitude
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);

  // Téléchargement auto
  const a = document.createElement('a');
  a.href = url;
  a.download = "pattern_android.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

// Export iOS .ahap (.json)
document.getElementById("synthDownloadAhapBtn").onclick = () => {
  if (!synthSegments.length) {
    alert("Ajoute d'abord des segments !");
    return;
  }

  // Génération événements AHAP
  let time = 0;
  const ahapEvents = [];
  synthSegments.forEach(seg => {
    if (seg.type === 'vibration') {
      ahapEvents.push({
        Time: +(time / 1000).toFixed(3),
        EventType: "HapticContinuous",
        EventDuration: +(seg.duration / 1000).toFixed(3),
        EventParameters: [
          { ParameterID: "HapticIntensity", ParameterValue: +(seg.intensity / 255).toFixed(2) },
          { ParameterID: "HapticSharpness", ParameterValue: 0.5 }
        ]
      });
    }
    time += seg.duration;
  });

  const ahap = {
    Version: 1,
    Pattern: ahapEvents.map(event => ({ Event: event }))
  };

  const blob = new Blob([JSON.stringify(ahap, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);

  // Téléchargement auto
  const a = document.createElement('a');
  a.href = url;
  a.download = "pattern_ios.ahap";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

// Custom file input (.wav) pour affichage du nom du fichier sélectionné
document.getElementById('fileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  document.getElementById('fileChosen').textContent = file ? file.name : 'Aucun fichier choisi';
});

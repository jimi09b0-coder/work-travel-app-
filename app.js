const jobs = [
  {
    id: 1,
    title: "Agent de sécurité",
    country: "Belgique",
    city: "Bruxelles",
    type: "Sécurité",
    description: "Poste d'agent de sécurité en Belgique.",
    requirements: "Sérieux, ponctuel et expérience en sécurité."
  },
  {
    id: 2,
    title: "Serveur",
    country: "Belgique",
    city: "Bruxelles",
    type: "Hôtellerie",
    description: "Poste de serveur dans un établissement hôtelier.",
    requirements: "Expérience en restauration et bon contact avec les clients."
  },
  {
    id: 3,
    title: "Réceptionniste",
    country: "Belgique",
    city: "Liège",
    type: "Hôtellerie",
    description: "Accueil des clients et gestion de la réception.",
    requirements: "Français et expérience en réception."
  }
];

function displayJobs(list = jobs) {
  const container = document.getElementById("jobs");
  if (!container) return;

  container.innerHTML = "";

  list.forEach(job => {
    container.innerHTML += `
      <div class="job-card">
        <h3>${job.title}</h3>
        <p>📍 ${job.city}, ${job.country}</p>
        <p>💼 ${job.type}</p>

        <button onclick="showJob(${job.id})">
          Voir les détails
        </button>
      </div>
    `;
  });
}

function showJob(id) {
  const job = jobs.find(j => j.id === id);

  if (!job) return;

  document.getElementById("jobs").innerHTML = `
    <div class="job-card">
      <h2>${job.title}</h2>

      <p>📍 ${job.city}, ${job.country}</p>
      <p>💼 ${job.type}</p>

      <hr>

      <h3>Description</h3>
      <p>${job.description}</p>

      <h3>Conditions</h3>
      <p>${job.requirements}</p>

      <button onclick="applyJob('${job.title}')">
        📩 Postuler directement
      </button>

      <button onclick="displayJobs()" class="back-button">
        ← Retour aux offres
      </button>
    </div>
  `;
}

function applyJob(title) {
  alert("Candidature pour : " + title);
}

function searchJobs() {
  const text = document
    .getElementById("search")
    .value
    .toLowerCase();

  const results = jobs.filter(job =>
    job.title.toLowerCase().includes(text) ||
    job.country.toLowerCase().includes(text) ||
    job.city.toLowerCase().includes(text) ||
    job.type.toLowerCase().includes(text)
  );

  displayJobs(results);
}

document.addEventListener("DOMContentLoaded", () => {
  displayJobs();
});

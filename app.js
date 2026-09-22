const jobs = [
  {
    id: 1,
    title: "Agent de sécurité",
    city: "Bruxelles",
    country: "Belgique",
    type: "Temps plein",
    company: "Entreprise de sécurité",
    salary: "Selon expérience",
    description: "Poste d'agent de sécurité en Belgique.",
    requirements: [
      "Sérieux et ponctuel",
      "Bonne présentation",
      "Expérience dans la sécurité"
    ]
  },
  {
    id: 2,
    title: "Réceptionniste hôtel",
    city: "Liège",
    country: "Belgique",
    type: "Temps plein",
    company: "Hôtel",
    salary: "Selon expérience",
    description: "Accueil des clients et gestion de la réception.",
    requirements: [
      "Bonne communication",
      "Français",
      "Expérience en réception ou hôtellerie"
    ]
  },
  {
    id: 3,
    title: "Serveur",
    city: "Bruxelles",
    country: "Belgique",
    type: "Temps plein",
    company: "Restaurant",
    salary: "Selon expérience",
    description: "Service des clients dans un restaurant.",
    requirements: [
      "Sérieux",
      "Ponctualité",
      "Expérience en restauration"
    ]
  }
];

const app = document.getElementById("jobs");

function showJobs(list) {
  app.innerHTML = "";

  list.forEach(job => {
    const card = document.createElement("div");
    card.className = "job-card";

    card.innerHTML = `
      <h2>${job.title}</h2>
      <p>📍 ${job.city}, ${job.country}</p>
      <p>💼 ${job.type}</p>
      <p>🏢 ${job.company}</p>

      <button onclick="showDetails(${job.id})">
        Voir l'offre
      </button>
    `;

    app.appendChild(card);
  });
}

function showDetails(id) {
  const job = jobs.find(j => j.id === id);

  app.innerHTML = `
    <div class="job-details">
      <button onclick="showJobs(jobs)">← Retour</button>

      <h1>${job.title}</h1>

      <p>📍 <strong>Lieu :</strong> ${job.city}, ${job.country}</p>
      <p>💼 <strong>Contrat :</strong> ${job.type}</p>
      <p>🏢 <strong>Entreprise :</strong> ${job.company}</p>
      <p>💰 <strong>Salaire :</strong> ${job.salary}</p>

      <h3>Description</h3>
      <p>${job.description}</p>

      <h3>Exigences</h3>
      <ul>
        ${job.requirements.map(r => `<li>${r}</li>`).join("")}
      </ul>

      <button onclick="applyJob(${job.id})">
        📩 Postuler directement
      </button>
    </div>
  `;
}

function applyJob(id) {
  const job = jobs.find(j => j.id === id);

  alert(
    "Candidature pour : " +
    job.title +
    "\\n\\nLa page de candidature sera ajoutée à l'étape suivante."
  );
}

showJobs(jobs);

const jobs = [
  {
    id: 1,
    title: "Agent de sécurité",
    country: "Belgique",
    city: "Bruxelles",
    type: "Temps plein",
    company: "Entreprise de sécurité",
    description: "Surveillance, contrôle des accès et protection des personnes et des biens."
  },
  {
    id: 2,
    title: "Réceptionniste hôtel",
    country: "Belgique",
    city: "Liège",
    type: "Temps plein",
    company: "Hôtel",
    description: "Accueil des clients, gestion des réservations et assistance à la réception."
  },
  {
    id: 3,
    title: "Serveur",
    country: "France",
    city: "Lyon",
    type: "Temps plein",
    company: "Restaurant",
    description: "Accueil des clients, prise de commandes et service en salle."
  }
];

const jobsContainer = document.getElementById("jobs");
const search = document.getElementById("search");
const country = document.getElementById("country");

function renderJobs() {
  const text = search.value.toLowerCase();

  const filteredJobs = jobs.filter(job =>
    (!country.value || job.country === country.value) &&
    (
      job.title.toLowerCase().includes(text) ||
      job.city.toLowerCase().includes(text) ||
      job.country.toLowerCase().includes(text)
    )
  );

  jobsContainer.innerHTML = filteredJobs.map(job => `
    <article class="job">
      <h2>${job.title}</h2>
      <p>📍 ${job.city}, ${job.country}</p>
      <p>💼 ${job.type}</p>
      <p>🏢 ${job.company}</p>
      <button onclick="showJob(${job.id})">
        Voir l'offre
      </button>
    </article>
  `).join("");
}

function showJob(id) {
  const job = jobs.find(j => j.id === id);

  alert(
    job.title +
    "\n\n📍 " + job.city + ", " + job.country +
    "\n🏢 " + job.company +
    "\n💼 " + job.type +
    "\n\n" + job.description
  );
}

search.addEventListener("input", renderJobs);
country.addEventListener("change", renderJobs);

renderJobs();

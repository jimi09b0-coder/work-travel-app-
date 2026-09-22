const jobs = [
  {
    title: "Agent de sécurité",
    country: "Belgique",
    city: "Bruxelles",
    type: "Sécurité"
  },
  {
    title: "Serveur / Serveuse",
    country: "Belgique",
    city: "Bruxelles",
    type: "Hôtellerie"
  },
  {
    title: "Réceptionniste",
    country: "Belgique",
    city: "Liège",
    type: "Hôtellerie"
  },
  {
    title: "Employé de restauration",
    country: "France",
    city: "Paris",
    type: "Restauration"
  }
];

function displayJobs(list = jobs) {
  const container = document.getElementById("jobs");

  if (!container) return;

  container.innerHTML = "";

  list.forEach(job => {
    const card = document.createElement("div");

    card.className = "job-card";

    card.innerHTML = `
      <h3>${job.title}</h3>
      <p>📍 ${job.city}, ${job.country}</p>
      <p>💼 ${job.type}</p>
      <button onclick="applyJob('${job.title}')">
        Postuler
      </button>
    `;

    container.appendChild(card);
  });
}

function searchJobs() {
  const input = document.getElementById("search");

  if (!input) return;

  const text = input.value.toLowerCase();

  const results = jobs.filter(job =>
    job.title.toLowerCase().includes(text) ||
    job.country.toLowerCase().includes(text) ||
    job.city.toLowerCase().includes(text) ||
    job.type.toLowerCase().includes(text)
  );

  displayJobs(results);
}

function applyJob(title) {
  alert("Vous avez choisi : " + title);
}

document.addEventListener("DOMContentLoaded", () => {
  displayJobs();
});

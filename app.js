import { supabase } from "./supabase-config.js";

let jobs = [];
let favoritesOnly = false;
const $ = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

async function populateFilters() {
  const countries = [...new Set(jobs.map(j => j.country))].sort();
  const types = [...new Set(jobs.map(j => j.type))].sort();
  $("countryFilter").innerHTML = '<option value="">Tous les pays</option>' + countries.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  $("typeFilter").innerHTML = '<option value="">Tous les secteurs</option>' + types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem("workTravelFavorites") || "[]").map(Number); }
  catch { return []; }
}

function isFavorite(id) {
  return getFavorites().includes(Number(id));
}

function toggleFavoritesOnly() {
  favoritesOnly = !favoritesOnly;
  $("favoritesFilter").classList.toggle("active", favoritesOnly);
  searchJobs();
}

function toggleFavorite(id) {
  const favorites = getFavorites();
  const next = favorites.includes(Number(id)) ? favorites.filter(x => x !== Number(id)) : [...favorites, Number(id)];
  localStorage.setItem("workTravelFavorites", JSON.stringify(next));
  searchJobs();
}

function displayJobs(list = jobs) {
  $("resultsCount").textContent = `${list.length} offre${list.length > 1 ? "s" : ""}`;
  if (!list.length) {
    $("jobs").innerHTML = '<div class="empty-state"><h3>Aucune offre trouvée</h3><p>Essayez un autre filtre.</p></div>';
    return;
  }
  $("jobs").innerHTML = list.map(j => `
    <article class="job-card">
      <button class="favorite-button ${isFavorite(j.id) ? "is-favorite" : ""}" onclick="toggleFavorite(${j.id})" title="Ajouter aux favoris">${isFavorite(j.id) ? "★" : "☆"}</button>
      <h3>${esc(j.title)}</h3>
      <div class="job-meta"><span>📍 ${esc(j.city)}, ${esc(j.country)}</span><span>💼 ${esc(j.type)}</span><span>🕐 ${esc(j.contract)}</span></div>
      <p>${esc(j.description)}</p>
      <button onclick="showJob(${j.id})">Voir les détails →</button>
    </article>`).join("");
}

async function showJob(id) {
  const j = jobs.find(x => x.id === id);
  if (!j) return;
  const user = await currentUser();
  const alreadyApplied = user ? await hasApplied(id, user.id) : false;
  $("jobs").innerHTML = `
    <article class="job-card">
      <span class="eyebrow">OFFRE D'EMPLOI</span><h2>${esc(j.title)}</h2>
      <div class="job-meta"><span>📍 ${esc(j.city)}, ${esc(j.country)}</span><span>💼 ${esc(j.type)}</span><span>🕐 ${esc(j.contract)}</span></div>
      <div class="job-description"><h3>Description</h3><p>${esc(j.description)}</p><h3>Conditions</h3><p>${esc(j.requirements)}</p></div>
      ${alreadyApplied ? '<span class="applied-badge">✓ Déjà postulé</span>' : `<button onclick="applyJob(${j.id})">📩 Postuler</button>`}
      <button onclick="resetView()" class="back-button">← Retour</button>
    </article>`;
  $("offres").scrollIntoView({behavior:"smooth"});
}

async function hasApplied(jobId, userId) {
  const { data, error } = await supabase.from("applications").select("id").eq("user_id", userId).eq("job_id", jobId).maybeSingle();
  if (error) return false;
  return !!data;
}

async function applyJob(id) {
  const user = await currentUser();
  if (!user) { openAccount("login"); return; }
  if (await hasApplied(id, user.id)) {
    alert("Vous avez déjà postulé à cette offre.");
    return;
  }
  const { error } = await supabase.from("applications").insert({user_id:user.id, job_id:id});
  if (error) {
    if (error.code === "23505") alert("Vous avez déjà postulé à cette offre.");
    else alert("Impossible d'enregistrer la candidature : " + error.message);
    return;
  }
  alert("Candidature enregistrée dans votre espace.");
  await renderDashboard();
  $("compte").scrollIntoView({behavior:"smooth"});
}

function openAccount(mode="register") {
  currentUser().then(user => {
    if (user) renderDashboard();
    else renderAuth(mode);
    $("compte").scrollIntoView({behavior:"smooth"});
  });
}

function renderAuth(mode="register", message="") {
  $("account").innerHTML = `
    <div class="account-card">
      <span class="eyebrow">ESPACE CANDIDAT</span>
      <h2>${mode === "login" ? "🔐 Connexion" : "👤 Créer mon compte"}</h2>
      <p>${mode === "login" ? "Connectez-vous pour gérer votre profil et vos candidatures." : "Créez un profil pour postuler et enregistrer votre CV."}</p>
      ${message ? `<p class="success-note">${esc(message)}</p>` : ""}
      <form class="application-form" id="authForm">
        <input id="authName" type="text" placeholder="Nom complet" ${mode === "login" ? 'style="display:none"' : "required"}>
        <input id="authEmail" type="email" placeholder="Adresse e-mail" required>
        <input id="authPassword" type="password" placeholder="Mot de passe" minlength="6" required>
        <button type="submit">${mode === "login" ? "Se connecter" : "Créer mon compte"}</button>
      </form>
      <button class="link-button" onclick="renderAuth('${mode === "login" ? "register" : "login"}')">${mode === "login" ? "Créer un compte" : "J'ai déjà un compte"}</button>
      <p class="demo-note">Compte sécurisé par Supabase Auth. Vos données sont accessibles depuis vos différents appareils.</p>
    </div>`;
  $("authForm").addEventListener("submit", e => mode === "login" ? login(e) : register(e));
}

async function register(e) {
  e.preventDefault();
  const name = $("authName").value.trim();
  const email = $("authEmail").value.trim().toLowerCase();
  const password = $("authPassword").value;
  if (password.length < 6) return alert("Le mot de passe doit contenir au moins 6 caractères.");
  const { data, error } = await supabase.auth.signUp({email, password, options:{data:{full_name:name}}});
  if (error) return alert(error.message);
  if (!data.session) {
    renderAuth("login", "Compte créé. Vérifiez votre e-mail pour confirmer votre adresse avant de vous connecter.");
    return;
  }
  await renderDashboard();
}

async function login(e) {
  e.preventDefault();
  const email = $("authEmail").value.trim().toLowerCase();
  const password = $("authPassword").value;
  const { error } = await supabase.auth.signInWithPassword({email, password});
  if (error) return alert(error.message);
  await renderDashboard();
}

async function renderDashboard() {
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const [{data:profile}, {data:apps, error}] = await Promise.all([
    supabase.from("profiles").select("full_name,cv_path").eq("id",user.id).maybeSingle(),
    supabase.from("applications").select("id,job_id,created_at,status,jobs(title,city,country)").eq("user_id",user.id).order("created_at",{ascending:false})
  ]);
  if (error) return alert("Erreur lors du chargement du compte : " + error.message);
  const name = profile?.full_name || user.user_metadata?.full_name || "Candidat";
  $("account").innerHTML = `
    <div class="account-card">
      <div class="account-top"><div class="account-identity"><span class="eyebrow">MON COMPTE</span><h2>👋 Bonjour ${esc(name)}</h2><p class="account-email">✉️ ${esc(user.email)}</p></div><div class="account-actions"><button class="refresh-button" onclick="renderDashboard()">↻ Actualiser</button><button class="back-button" onclick="logout()">Se déconnecter</button></div></div>
      <div class="profile-grid">
        <div><h3>📄 Mon CV</h3><input type="file" id="cvFile" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><p id="cvStatus" class="small-note">${profile?.cv_path ? `CV enregistré dans votre espace. <button type="button" class="cv-link" onclick="openCV()">📄 Ouvrir mon CV</button> <button type="button" class="cv-delete" onclick="deleteCV()">🗑️ Supprimer</button>` : "Aucun CV enregistré."}</p></div>
        <div><h3>📊 Mes candidatures</h3><strong class="big-number">${apps?.length || 0}</strong><p class="small-note">candidature(s) enregistrée(s)</p><div class="application-stats"><span>🟡 ${apps?.filter(a => (a.status || "En cours") === "En cours").length || 0} En cours</span><span>🟢 ${apps?.filter(a => a.status === "Acceptée").length || 0} Acceptée(s)</span><span>🔴 ${apps?.filter(a => a.status === "Refusée").length || 0} Refusée(s)</span></div></div>
      </div>
      <div class="applications-list"><h3>Historique</h3>${apps?.length ? apps.map(a => `<div class="application-row"><strong>${esc(a.jobs?.title)}</strong><span>📍 ${esc(a.jobs?.city)}, ${esc(a.jobs?.country)}</span><small>${new Date(a.created_at).toLocaleDateString("fr-FR")} · <span class="status-badge status-${(a.status || "En cours").toLowerCase().replace(/\s+/g,"-") }">${esc(a.status || "En cours")}</span></small></div>`).join("") : '<p class="small-note">Aucune candidature pour le moment.</p>'}</div>
    </div>`;
  $("cvFile").addEventListener("change", saveCV);
}

async function deleteCV() {
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("cv_path").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.cv_path) return alert("Aucun CV enregistré.");
  if (!confirm("Supprimer votre CV enregistré ?")) return;
  const { error: storageError } = await supabase.storage.from("cvs").remove([profile.cv_path]);
  if (storageError) return alert("Impossible de supprimer le CV : " + storageError.message);
  const { error: updateError } = await supabase.from("profiles").update({cv_path:null,updated_at:new Date().toISOString()}).eq("id",user.id);
  if (updateError) return alert("Le fichier a été supprimé, mais le profil n'a pas pu être mis à jour : " + updateError.message);
  await renderDashboard();
}

async function openCV() {
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("cv_path").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.cv_path) return alert("Aucun CV enregistré.");
  const { data, error } = await supabase.storage.from("cvs").createSignedUrl(profile.cv_path, 60);
  if (error) return alert("Impossible d'ouvrir le CV : " + error.message);
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

async function saveCV(e) {
  const file = e.target.files[0];
  const user = await currentUser();
  if (!file || !user) return;
  const allowed = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowed.includes(file.type) && !/\.(pdf|doc|docx)$/i.test(file.name)) return alert("Format accepté : PDF, DOC ou DOCX.");
  if (file.size > 5 * 1024 * 1024) return alert("Le CV doit faire moins de 5 Mo.");
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
  const { error:uploadError } = await supabase.storage.from("cvs").upload(path,file,{upsert:false,contentType:file.type});
  if (uploadError) return alert("Échec du téléchargement : " + uploadError.message);
  const { error:profileError } = await supabase.from("profiles").update({cv_path:path,updated_at:new Date().toISOString()}).eq("id",user.id);
  if (profileError) return alert("CV envoyé mais profil non mis à jour : " + profileError.message);
  $("cvStatus").innerHTML = `CV enregistré : ${esc(file.name)} <button type="button" class="cv-link" onclick="openCV()">📄 Ouvrir mon CV</button>`;
}

async function logout() {
  await supabase.auth.signOut();
  renderAuth("login", "Vous êtes déconnecté.");
}

async function searchJobs() {
  const t = $("search").value.trim().toLowerCase(), c = $("countryFilter").value, ty = $("typeFilter").value;
  displayJobs(jobs.filter(j => (!t || [j.title,j.country,j.city,j.type,j.description].some(v => v.toLowerCase().includes(t))) && (!c || j.country === c) && (!ty || j.type === ty) && (!favoritesOnly || isFavorite(j.id))));
}

function resetView() {
  $("search").value = ""; $("countryFilter").value = ""; $("typeFilter").value = ""; favoritesOnly = false; if ($("favoritesFilter")) $("favoritesFilter").classList.remove("active"); displayJobs(jobs);
  $("offres").scrollIntoView({behavior:"smooth"});
}

async function loadJobs() {
  const {data,error} = await supabase.from("jobs").select("*").order("id");
  if (error) {
    $("jobs").innerHTML = '<div class="empty-state"><h3>Impossible de charger les offres</h3><p>Vérifiez la connexion à la base de données.</p></div>';
    return;
  }
  jobs = data || [];
  await populateFilters();
  displayJobs();
}

window.showJob=showJob; window.applyJob=applyJob; window.openAccount=openAccount; window.renderAuth=renderAuth; window.logout=logout; window.resetView=resetView; window.searchJobs=searchJobs; window.openCV=openCV; window.deleteCV=deleteCV; window.toggleFavorite=toggleFavorite; window.toggleFavoritesOnly=toggleFavoritesOnly;

document.addEventListener("DOMContentLoaded", async () => {
  await loadJobs();
  const user = await currentUser();
  if (user) await renderDashboard();
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) renderAuth("login");
  });
});

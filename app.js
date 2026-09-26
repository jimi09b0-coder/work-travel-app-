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

function getSearchHistory() {
  try { return JSON.parse(localStorage.getItem("workTravelSearchHistory") || "[]"); }
  catch { return []; }
}

function saveSearchHistory(term) {
  const value = term.trim();
  if (!value) return;
  const next = [value, ...getSearchHistory().filter(x => x.toLowerCase() !== value.toLowerCase())].slice(0,5);
  localStorage.setItem("workTravelSearchHistory", JSON.stringify(next));
  renderSearchHistory();
}

function renderSearchHistory() {
  const box = $("searchHistory");
  if (!box) return;
  const history = getSearchHistory();
  box.innerHTML = history.length ? `<span>🕘 Recherches récentes</span>${history.map(x => `<button type="button" onclick="useSearchHistory(${JSON.stringify(x).replace(/"/g,"&quot;")})">${esc(x)}</button>`).join("")}` : "";
}

function useSearchHistory(value) {
  if (!$("search")) return;
  $("search").value = value;
  searchJobs();
}

function clearSearchHistory() {
  localStorage.removeItem("workTravelSearchHistory");
  renderSearchHistory();
}

function getReadNotifications() {
  try { return JSON.parse(localStorage.getItem("workTravelReadNotifications") || "[]"); } catch { return []; }
}

function notificationKey(app) { return String(app.id) + ':' + String(app.status || 'En cours'); }

function markNotificationRead(key) {
  const next = [...new Set([...getReadNotifications(), key])];
  localStorage.setItem("workTravelReadNotifications", JSON.stringify(next));
  renderDashboard();
}

function buildUserNotifications(apps) {
  const read = getReadNotifications();
  return (apps || []).filter(a => { const status = a.status || "En cours"; return status !== "En cours" && !read.includes(notificationKey(a)); }).slice(0, 5);
}
function showNotification(message, type="info") {
  const old = document.querySelector(".app-notification");
  if (old) old.remove();
  const el = document.createElement("div");
  el.className = "app-notification notification-" + type;
  el.innerHTML = `<span>${type === "success" ? "✓" : "🔔"}</span><p>${esc(message)}</p><button aria-label="Fermer" onclick="this.parentElement.remove()">×</button>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem("workTravelFavorites") || "[]").map(Number); }
  catch { return []; }
}

function isFavorite(id) {
  return getFavorites().includes(Number(id));
}

function clearFavorites() {
  const count = getFavorites().length;
  if (!count) return;
  if (!confirm("Supprimer toutes les offres favorites ?")) return;
  localStorage.removeItem("workTravelFavorites");
  favoritesOnly = false;
  if ($("favoritesFilter")) $("favoritesFilter").classList.remove("active");
  displayJobs(jobs);
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

function getPreferences() {
  try { return JSON.parse(localStorage.getItem('workTravelPreferences') || '{}'); } catch { return {}; }
}

function savePreferences() {
  const countries = [...document.querySelectorAll('.pref-country:checked')].map(x => x.value);
  const types = [...document.querySelectorAll('.pref-type:checked')].map(x => x.value);
  localStorage.setItem('workTravelPreferences', JSON.stringify({countries, types}));
  showNotification('Préférences enregistrées.', 'success');
  displayJobs(jobs);
}

function renderPreferences() {
  const box = $('preferencesBox');
  if (!box) return;
  const prefs = getPreferences();
  const countries = [...new Set(jobs.map(j => j.country))].sort();
  const types = [...new Set(jobs.map(j => j.type))].sort();
  box.innerHTML = `<div class="preferences-head"><div><span class="eyebrow">PERSONNALISATION</span><h3>🎯 Mes préférences</h3><p>Choisissez les destinations et secteurs qui vous intéressent.</p></div></div><div class="preference-groups"><div><strong>🌍 Pays</strong><div class="preference-options">${countries.map(x => `<label><input class="pref-country" type="checkbox" value="${esc(x)}" ${prefs.countries?.includes(x) ? 'checked' : ''}> ${esc(x)}</label>`).join('')}</div></div><div><strong>💼 Secteurs</strong><div class="preference-options">${types.map(x => `<label><input class="pref-type" type="checkbox" value="${esc(x)}" ${prefs.types?.includes(x) ? 'checked' : ''}> ${esc(x)}</label>`).join('')}</div></div></div><button type="button" onclick="savePreferences()">💾 Enregistrer mes préférences</button>`;
}
function jobMatchScore(job) {
  const q = $('search')?.value.trim().toLowerCase() || '';
  const country = $('countryFilter')?.value || '';
  const type = $('typeFilter')?.value || '';
  const prefs = getPreferences();
  let score = 40;
  if (country && job.country === country) score += 20;
  if (type && job.type === type) score += 15;
  if (prefs.countries?.includes(job.country)) score += 15;
  if (prefs.types?.includes(job.type)) score += 10;
  if (q) {
    const hay = [job.title,job.country,job.city,job.type,job.contract,job.description,job.requirements].join(' ').toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    score += Math.min(10, words.filter(w => hay.includes(w)).length * 5);
  }
  return Math.min(100, score);
}

function matchLabel(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Très bon";
  if (score >= 55) return "Bon";
  return "À découvrir";
}
function displayJobs(list = jobs) {
  const favoritesCount = getFavorites().length;
  if ($("favoritesCount")) $("favoritesCount").textContent = favoritesCount;
  $("resultsCount").textContent = `${list.length} offre${list.length > 1 ? "s" : ""}`;
  if (!list.length) {
    $("jobs").innerHTML = '<div class="empty-state"><h3>Aucune offre trouvée</h3><p>Essayez un autre filtre.</p></div>';
    return;
  }
  $("jobs").innerHTML = list.map(j => `
    <article class="job-card">
      <button class="favorite-button ${isFavorite(j.id) ? "is-favorite" : ""}" onclick="toggleFavorite(${j.id})" title="Ajouter aux favoris">${isFavorite(j.id) ? "★" : "☆"}</button>
      <div class="job-card-title"><h3>${esc(j.title)}</h3><span class="match-score">${jobMatchScore(j)}% · ${matchLabel(jobMatchScore(j))}</span></div>
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
  const similar = jobs.filter(x => x.id !== id && (x.country === j.country || x.type === j.type)).slice(0,3);
  $("jobs").innerHTML = `
    <article class="job-detail-card">
      <div class="job-detail-top"><div><span class="eyebrow">OFFRE D'EMPLOI</span><h2>${esc(j.title)}</h2><div class="job-meta"><span>📍 ${esc(j.city)}, ${esc(j.country)}</span><span>💼 ${esc(j.type)}</span><span>🕐 ${esc(j.contract)}</span></div></div><button class="favorite-button ${isFavorite(j.id) ? "is-favorite" : ""}" onclick="toggleFavorite(${j.id})">${isFavorite(j.id) ? "★" : "☆"}</button></div>
      <div class="job-detail-grid"><div>
        <section class="detail-section"><h3>📝 Description</h3><p>${esc(j.description)}</p></section>
        <section class="detail-section"><h3>✅ Conditions & exigences</h3><p>${esc(j.requirements)}</p></section>
        <section class="detail-section"><h3>🧳 Préparer votre départ</h3><div class="travel-mini"><span>📄 Documents</span><span>🏠 Logement</span><span>🚌 Transport</span><span>🛡️ Assurance</span></div></section>
      </div><aside class="job-apply-box"><span class="eyebrow">VOTRE CANDIDATURE</span><h3>Prêt à postuler ?</h3><p>Préparez votre CV et votre lettre de motivation avant d’envoyer votre candidature.</p>${alreadyApplied ? '<div class="applied-badge">✓ Déjà postulé</div>' : `<button class="apply-main" onclick="openApplicationForm(${j.id})">🚀 Postuler maintenant</button>`}<button onclick="resetView()" class="back-button detail-back">← Retour aux offres</button></aside></div>
      ${similar.length ? `<section class="similar-section"><div class="panel-heading"><div><span class="eyebrow">À DÉCOUVRIR</span><h3>💼 Offres similaires</h3></div></div><div class="similar-jobs">${similar.map(x => `<button class="similar-job" onclick="showJob(${x.id})"><strong>${esc(x.title)}</strong><span>📍 ${esc(x.city)}, ${esc(x.country)}</span><small>${esc(x.type)} · ${esc(x.contract)}</small></button>`).join("")}</div></section>` : ""}
    </article>`;
  $("offres").scrollIntoView({behavior:"smooth"});
}

async function hasApplied(jobId, userId) {
  const { data, error } = await supabase.from("applications").select("id").eq("user_id", userId).eq("job_id", jobId).maybeSingle();
  if (error) return false;
  return !!data;
}

function openApplicationForm(id) {
  const j = jobs.find(x => x.id === id);
  if (!j) return;
  $("jobs").innerHTML = `
    <article class="job-card application-card">
      <span class="eyebrow">CANDIDATURE</span><h2>📩 Postuler à « ${esc(j.title)} »</h2>
      <p>Présentez votre profil en quelques lignes. Votre CV enregistré sera associé automatiquement à la candidature.</p>
      <form class="application-form" id="jobApplicationForm">
        <label>📱 Téléphone<input id="applicationPhone" type="tel" maxlength="30" placeholder="+213 ..."></label>
        <label>🕐 Disponibilité<select id="applicationAvailability" required><option value="">Choisir</option><option>Immédiate</option><option>Dans 2 semaines</option><option>Dans 1 mois</option><option>À définir</option></select></label>
        <label>✍️ Lettre de motivation<textarea id="coverLetter" rows="7" maxlength="2000" required placeholder="Expliquez brièvement votre motivation, votre expérience et pourquoi ce poste vous intéresse..."></textarea></label>
        <div class="application-actions"><button type="submit">🚀 Envoyer ma candidature</button><button type="button" class="back-button" onclick="showJob(${id})">← Retour à l’offre</button></div>
      </form>
    </article>`;
  $("jobApplicationForm").addEventListener("submit", e => applyJob(e,id));
  $("offres").scrollIntoView({behavior:"smooth"});
}

async function applyJob(e, id) {
  e.preventDefault();
  const user = await currentUser();
  if (!user) { openAccount("login"); return; }
  if (await hasApplied(id, user.id)) { alert("Vous avez déjà postulé à cette offre."); return; }
  const cover_letter = $("coverLetter").value.trim();
  const availability = $("applicationAvailability").value;
  const phone = $("applicationPhone").value.trim();
  if (!cover_letter || !availability) return alert("Veuillez compléter la lettre de motivation et votre disponibilité.");
  if (cover_letter.length < 30) return alert("Votre lettre de motivation doit contenir au moins 30 caractères.");
  const { error } = await supabase.from("applications").insert({user_id:user.id, job_id:id, cover_letter, availability, phone});
  if (error) {
    if (error.code === "23505") alert("Vous avez déjà postulé à cette offre.");
    else alert("Impossible d’enregistrer la candidature : " + error.message);
    return;
  }
  alert("🎉 Candidature envoyée avec succès.");
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

async function updateProfileName(e) {
  e.preventDefault();
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const name = $("profileName").value.trim();
  if (!name) return alert("Veuillez saisir votre nom.");
  const { error: profileError } = await supabase.from("profiles").update({full_name:name,updated_at:new Date().toISOString()}).eq("id",user.id);
  if (profileError) return alert("Impossible de mettre à jour le profil : " + profileError.message);
  const { error: authError } = await supabase.auth.updateUser({data:{full_name:name}});
  if (authError) return alert("Profil enregistré, mais les données du compte n'ont pas pu être synchronisées : " + authError.message);
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
  const totalApps = apps?.length || 0;
  const pending = apps?.filter(a => (a.status || "En cours") === "En cours").length || 0;
  const accepted = apps?.filter(a => a.status === "Acceptée").length || 0;
  const refused = apps?.filter(a => a.status === "Refusée").length || 0;
  const favoriteCount = getFavorites().length;
  const profileCompletion = Math.round(((name !== "Candidat" ? 50 : 0) + (profile?.cv_path ? 50 : 0)));
  const latestApps = (apps || []).slice(0, 5);
  $("account").innerHTML = `
    <div class="account-card dashboard">
      <div class="dashboard-header">
        <div class="account-identity"><span class="eyebrow">TABLEAU DE BORD</span><h2>👋 Bonjour ${esc(name)}</h2><p class="account-email">✉️ ${esc(user.email)}</p></div>
        <div class="account-actions"><button class="refresh-button" onclick="renderDashboard()">↻ Actualiser</button><button class="back-button" onclick="logout()">Se déconnecter</button></div>
      </div>
      <div class="dashboard-welcome"><div><strong>Votre espace candidat</strong><p>Suivez vos candidatures, préparez votre départ et gardez votre profil prêt pour les prochaines opportunités.</p></div><div class="completion"><div><span>Profil complété</span><strong>${profileCompletion}%</strong></div><div class="progress-track"><span style="width:${profileCompletion}%"></span></div><small>${profileCompletion === 100 ? "Profil prêt pour postuler." : "Ajoutez votre nom et votre CV pour compléter votre profil."}</small></div></div>
      <div class="dashboard-notifications"><div class="panel-heading"><div><span class="eyebrow">NOTIFICATIONS</span><h3>🔔 Nouveautés</h3></div><span class="notification-count">${buildUserNotifications(apps).length}</span></div>
        ${buildUserNotifications(apps).length ? buildUserNotifications(apps).map(a => `<div class="notification-row"><span>${a.status === "Acceptée" ? "🟢" : "🔴"}</span><div><strong>${esc(a.jobs?.title || "Votre candidature")}</strong><p>Votre candidature est maintenant <b>${esc(a.status || "En cours")}</b>.</p></div><button onclick="markNotificationRead('${notificationKey(a)}')">✓ Lu</button></div>`).join("") : '<p class="small-note">Aucune nouvelle notification.</p>'}</div>
      <div class="dashboard-stats">
        <button class="stat-card" onclick="document.getElementById('offres').scrollIntoView({behavior:'smooth'})"><span>📩</span><strong>${totalApps}</strong><small>Candidatures</small></button>
        <button class="stat-card" onclick="document.getElementById('offres').scrollIntoView({behavior:'smooth'})"><span>🟡</span><strong>${pending}</strong><small>En cours</small></button>
        <button class="stat-card"><span>🟢</span><strong>${accepted}</strong><small>Acceptées</small></button>
        <button class="stat-card"><span>⭐</span><strong>${favoriteCount}</strong><small>Favoris</small></button>
      </div>
      <div class="dashboard-grid">
        <section class="dashboard-panel"><div class="panel-heading"><div><span class="eyebrow">PROFIL</span><h3>👤 Mes informations</h3></div><span class="completion-mini">${profileCompletion}%</span></div>
          <form class="name-form" onsubmit="updateProfileName(event)"><input id="profileName" type="text" value="${esc(name)}" maxlength="80" required><button type="submit">💾 Enregistrer</button></form>
          <div class="cv-box"><div><strong>📄 Mon CV</strong><p id="cvStatus" class="small-note">${profile?.cv_path ? `CV enregistré. <button type="button" class="cv-link" onclick="openCV()">Ouvrir</button> <button type="button" class="cv-delete" onclick="deleteCV()">Supprimer</button>` : "Ajoutez votre CV pour compléter votre profil."}</p></div><input type="file" id="cvFile" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div>
        </section>
        <section class="dashboard-panel"><div class="panel-heading"><div><span class="eyebrow">ACTIVITÉ</span><h3>📈 Résumé</h3></div></div>
          <div class="activity-list"><div><span>🟡</span><strong>${pending}</strong><p>candidature(s) en cours</p></div><div><span>🟢</span><strong>${accepted}</strong><p>candidature(s) acceptée(s)</p></div><div><span>🔴</span><strong>${refused}</strong><p>candidature(s) refusée(s)</p></div></div>
        </section>
      </div>
      <div class="applications-list dashboard-history"><div class="panel-heading"><div><span class="eyebrow">SUIVI</span><h3>📋 Mes dernières candidatures</h3></div><span class="small-note">${totalApps} au total</span></div>
        ${latestApps.length ? latestApps.map(a => `<div class="application-row"><strong>${esc(a.jobs?.title || "Offre")}</strong><span>📍 ${esc(a.jobs?.city || "")}, ${esc(a.jobs?.country || "")}</span><small>${new Date(a.created_at).toLocaleDateString("fr-FR")} · <span class="status-badge status-${(a.status || "En cours").toLowerCase().replace(/\s+/g,"-") }">${esc(a.status || "En cours")}</span></small></div>`).join("") : '<p class="small-note">Aucune candidature pour le moment. Découvrez les offres disponibles.</p>'}
      </div>
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

async function searchJobs(saveHistory = false) {
  const raw = $("search").value.trim();
  const t = raw.toLowerCase(), c = $("countryFilter").value, ty = $("typeFilter").value;
  const words = t.split(/\\s+/).filter(Boolean);
  const list = jobs.filter(j => {
    const haystack = [j.title,j.country,j.city,j.type,j.contract,j.description,j.requirements].join(" ").toLowerCase();
    const matchesText = !words.length || words.every(word => haystack.includes(word));
    return matchesText && (!c || j.country === c) && (!ty || j.type === ty) && (!favoritesOnly || isFavorite(j.id));
  });
  displayJobs(list);
  if (saveHistory && raw) saveSearchHistory(raw);
}

const travelItems = ["Passeport / pièce d'identité","Contrat ou promesse d'embauche","Justificatifs de logement","Assurance voyage / santé","Moyens de paiement","Adresse et trajet vers le logement","Copies numériques des documents","Numéros d'urgence et contacts utiles"];

function updateTravelGuide() {
  const country = $("travelCountry")?.value;
  const box = $("travelGuide");
  if (!box) return;
  if (!country) {
    box.innerHTML = '<div class="travel-empty"><span>🗺️</span><h3>Choisissez votre destination</h3><p>Vous obtiendrez une checklist adaptée à votre départ.</p></div>';
    updateTravelProgress();
    return;
  }
  const key = "workTravelChecklist_" + country;
  let checked = [];
  try { checked = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
  box.innerHTML = `
    <div class="travel-guide-head"><div><span class="eyebrow">GUIDE ${esc(country).toUpperCase()}</span><h3>📋 Checklist avant le départ</h3></div><button class="clear-checklist" onclick="clearTravelChecklist()">Réinitialiser</button></div>
    <div class="travel-checklist">${travelItems.map((item,i) => `<label class="check-item"><input type="checkbox" ${checked.includes(i) ? "checked" : ""} onchange="toggleTravelItem(${i})"><span>${esc(item)}</span></label>`).join("")}</div>
    <div class="travel-tips"><strong>💡 Conseil</strong><p>Conservez une copie numérique de vos documents importants dans un espace sécurisé avant votre départ.</p></div>`;
  updateTravelProgress();
}

function toggleTravelItem(index) {
  const country = $("travelCountry")?.value;
  if (!country) return;
  const key = "workTravelChecklist_" + country;
  let checked = [];
  try { checked = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
  checked = checked.includes(index) ? checked.filter(x => x !== index) : [...checked, index];
  localStorage.setItem(key, JSON.stringify(checked));
  updateTravelProgress();
}

function clearTravelChecklist() {
  const country = $("travelCountry")?.value;
  if (!country || !confirm("Réinitialiser votre checklist ?")) return;
  localStorage.removeItem("workTravelChecklist_" + country);
  updateTravelGuide();
}

function updateTravelProgress() {
  const country = $("travelCountry")?.value;
  const total = travelItems.length;
  let count = 0;
  if (country) {
    try { count = JSON.parse(localStorage.getItem("workTravelChecklist_" + country) || "[]").length; } catch {}
  }
  const percent = Math.round((count / total) * 100);
  if ($("travelProgress")) $("travelProgress").textContent = percent + "%";
  if ($("travelProgressBar")) $("travelProgressBar").style.width = percent + "%";
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
  renderPreferences();
  displayJobs();
  renderSearchHistory();
}

window.showJob=showJob; window.savePreferences=savePreferences; window.jobMatchScore=jobMatchScore; window.saveSearchHistory=saveSearchHistory; window.useSearchHistory=useSearchHistory; window.clearSearchHistory=clearSearchHistory; window.showNotification=showNotification; window.openApplicationForm=openApplicationForm; window.applyJob=applyJob; window.updateTravelGuide=updateTravelGuide; window.toggleTravelItem=toggleTravelItem; window.clearTravelChecklist=clearTravelChecklist; window.openAccount=openAccount; window.renderAuth=renderAuth; window.logout=logout; window.resetView=resetView; window.searchJobs=searchJobs; window.openCV=openCV; window.deleteCV=deleteCV; window.toggleFavorite=toggleFavorite; window.toggleFavoritesOnly=toggleFavoritesOnly; window.clearFavorites=clearFavorites; window.updateProfileName=updateProfileName;

document.addEventListener("DOMContentLoaded", async () => {
  await loadJobs();
  const user = await currentUser();
  if (user) await renderDashboard();
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) renderAuth("login");
  });
});

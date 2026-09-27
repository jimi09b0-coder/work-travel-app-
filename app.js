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
      \${j.profiles?.company_name ? \`<div class="job-company-mini">\${j.profiles.company_logo_url ? \`<img src="\${esc(j.profiles.company_logo_url)}" alt="">\` : "<span>🏢</span>"}<div><strong>\${esc(j.profiles.company_name)}</strong><small>\${esc(j.profiles.company_city || j.profiles.company_country || "Entreprise")}</small></div></div>\` : ""}
      <button onclick="showJob(${j.id})">Voir les détails →</button>
    </article>`).join("");
}

async async function showJob(id) {
  const j = jobs.find(x => x.id === id);
  if (!j) return;
  const user = await currentUser();
  const alreadyApplied = user ? await hasApplied(id, user.id) : false;
  const similar = jobs.filter(x => x.id !== id && (x.country === j.country || x.type === j.type)).slice(0,3);
  $("jobs").innerHTML = `
    <article class="job-detail-card">
      <div class="job-detail-top"><div><span class="eyebrow">OFFRE D'EMPLOI</span><h2>${esc(j.title)}</h2><div class="job-meta"><span>📍 ${esc(j.city)}, ${esc(j.country)}</span><span>💼 ${esc(j.type)}</span><span>🕐 ${esc(j.contract)}</span></div></div><button class="favorite-button ${isFavorite(j.id) ? "is-favorite" : ""}" onclick="toggleFavorite(${j.id})">${isFavorite(j.id) ? "★" : "☆"}</button></div>
      <div class="job-detail-grid"><div>
        \${j.profiles?.company_name ? \`<section class="job-company-profile"><div class="company-profile-head">\${j.profiles.company_logo_url ? \`<img src="\${esc(j.profiles.company_logo_url)}" alt="">\` : \`<div class="company-logo-placeholder">🏢</div>\`}<div><span class="eyebrow">ENTREPRISE</span><h3>\${esc(j.profiles.company_name)}</h3><p>📍 \${esc(j.profiles.company_city || "")}\${j.profiles.company_city && j.profiles.company_country ? ", " : ""}\${esc(j.profiles.company_country || "")}</p></div></div>\${j.profiles.company_description ? \`<p>\${esc(j.profiles.company_description)}</p>\` : ""}<button type="button" class="company-profile-link" onclick="showCompanyProfile('${j.employer_id}')">Voir le profil de l’entreprise →</button><div class="company-links">\${j.profiles.company_website ? \`<a href="\${esc(j.profiles.company_website)}" target="_blank" rel="noopener noreferrer">🌐 Site web</a>\` : ""}\${j.profiles.company_phone ? \`<span>📞 \${esc(j.profiles.company_phone)}</span>\` : ""}\${j.profiles.company_email ? \`<span>✉️ \${esc(j.profiles.company_email)}</span>\` : ""}</div></section>\` : ""}
        <section class="detail-section"><h3>📝 Description</h3><p>${esc(j.description)}</p></section>
        <section class="detail-section"><h3>✅ Conditions & exigences</h3><p>${esc(j.requirements)}</p></section>
        <section class="detail-section"><h3>🧳 Préparer votre départ</h3><div class="travel-mini"><span>📄 Documents</span><span>🏠 Logement</span><span>🚌 Transport</span><span>🛡️ Assurance</span></div></section>
      </div><aside class="job-apply-box"><span class="eyebrow">VOTRE CANDIDATURE</span><h3>Prêt à postuler ?</h3><p>Préparez votre CV et votre lettre de motivation avant d’envoyer votre candidature.</p>${alreadyApplied ? '<div class="applied-badge">✓ Déjà postulé</div>' : `<button class="apply-main" onclick="openApplicationForm(${j.id})">🚀 Postuler maintenant</button>`}<button onclick="resetView()" class="back-button detail-back">← Retour aux offres</button></aside></div>
      ${similar.length ? `<section class="similar-section"><div class="panel-heading"><div><span class="eyebrow">À DÉCOUVRIR</span><h3>💼 Offres similaires</h3></div></div><div class="similar-jobs">${similar.map(x => `<button class="similar-job" onclick="showJob(${x.id})"><strong>${esc(x.title)}</strong><span>📍 ${esc(x.city)}, ${esc(x.country)}</span><small>${esc(x.type)} · ${esc(x.contract)}</small></button>`).join("")}</div></section>` : ""}
    </article>`;
  $("offres").scrollIntoView({behavior:"smooth"});
}

async function showCompanyProfile(userId) {
  const {data:company,error}=await supabase.rpc("get_company_public_profile",{company_user_id:userId}).maybeSingle();
  if(error||!company?.company_name) return;
  const {data:companyJobs,error:jobsError}=await supabase.from("jobs").select("*,profiles!jobs_employer_id_fkey(company_name,company_logo_url,company_city,company_country)").eq("employer_id",userId).order("created_at",{ascending:false});
  if(jobsError) return alert("Impossible de charger les offres de cette entreprise : "+jobsError.message);
  $("jobs").innerHTML=`
    <article class="company-page">
      <div class="company-page-head">
        ${company.company_logo_url ? `<img src="${esc(company.company_logo_url)}" alt="">` : '<div class="company-logo-large">🏢</div>'}
        <div><span class="eyebrow">ENTREPRISE</span><h2>${esc(company.company_name)}</h2><p>📍 ${esc(company.company_city||"")}${company.company_city&&company.company_country?", ":""}${esc(company.company_country||"")}</p></div>
      </div>
      ${company.company_description ? `<section class="company-page-section"><h3>À propos</h3><p>${esc(company.company_description)}</p></section>` : ""}
      <div class="company-links">${company.company_website ? `<a href="${esc(company.company_website)}" target="_blank" rel="noopener noreferrer">🌐 Site web</a>` : ""}${company.company_phone ? `<span>📞 ${esc(company.company_phone)}</span>` : ""}${company.company_email ? `<span>✉️ ${esc(company.company_email)}</span>` : ""}</div>
      <section class="company-page-section"><div class="panel-heading"><div><span class="eyebrow">OPPORTUNITÉS</span><h3>💼 Offres de cette entreprise</h3></div><span>${companyJobs.length} offre(s)</span></div>
        <div class="similar-jobs">${companyJobs.map(j=>`<button class="similar-job" onclick="showJob(${j.id})"><strong>${esc(j.title)}</strong><span>📍 ${esc(j.city)}, ${esc(j.country)}</span><small>${esc(j.type)} · ${esc(j.contract)}</small></button>`).join("") || '<p class="small-note">Aucune offre publiée actuellement.</p>'}</div>
      </section>
      <button onclick="resetView()" class="back-button">← Retour aux offres</button>
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
      <p>Votre profil professionnel, votre CV, votre lettre de motivation et votre disponibilité seront enregistrés avec cette candidature.</p>
      <form class="application-form" id="jobApplicationForm">
        <div class="application-profile-status">👤 Profil professionnel · 📄 CV enregistré requis</div>
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
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name,phone,headline,bio,skills,languages,experience,education,cv_path,role").eq("id", user.id).maybeSingle();
  if (profileError) return alert("Impossible de charger votre profil : " + profileError.message);
  if (!profile?.cv_path) return alert("Ajoutez votre CV dans votre espace candidat avant d'envoyer une candidature.");
  const cvName = profile.cv_path.split("/").pop().replace(/^[0-9a-f-]+-/i, "") || "CV";
  const applicationToken = crypto.randomUUID();
  const applicationCvPath = "applications/" + user.id + "/" + applicationToken + "-" + cvName;
  const { error: copyError } = await supabase.storage.from("cvs").copy(profile.cv_path, applicationCvPath);
  if (copyError) return alert("Impossible de préparer la copie du CV pour cette candidature : " + copyError.message);
  const profile_snapshot = {
    full_name: profile.full_name || user.user_metadata?.full_name || "",
    phone: phone || profile.phone || "", headline: profile.headline || "", bio: profile.bio || "",
    skills: profile.skills || [], languages: profile.languages || [], experience: profile.experience || "",
    education: profile.education || "", cv_name: cvName
  };
  const { error } = await supabase.from("applications").insert({user_id:user.id,job_id:id,cover_letter,availability,phone:phone || profile.phone || "",profile_snapshot,cv_path:applicationCvPath,cv_name:cvName});
  if (error) {
    await supabase.storage.from("cvs").remove([applicationCvPath]);
    if (error.code === "23505") alert("Vous avez déjà postulé à cette offre."); else alert("Impossible d’enregistrer la candidature : " + error.message);
    return;
  }
  showNotification("Candidature complète envoyée avec succès.", "success");
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

function getProfileCompletion(profile, fallbackName="") {
  const fields = [
    fallbackName || profile?.full_name,
    profile?.phone,
    profile?.headline,
    profile?.bio,
    profile?.skills?.length,
    profile?.languages?.length,
    profile?.experience,
    profile?.education,
    profile?.cv_path
  ];
  return Math.round(fields.filter(Boolean).length / fields.length * 100);
}

function csvValues(value) {
  return value.split(",").map(x => x.trim()).filter(Boolean).slice(0, 12);
}

async function saveCandidateProfile(e) {
  e.preventDefault();
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const payload = {
    full_name: $("profileName").value.trim(),
    phone: $("profilePhone").value.trim(),
    headline: $("profileHeadline").value.trim(),
    bio: $("profileBio").value.trim(),
    skills: csvValues($("profileSkills").value),
    languages: csvValues($("profileLanguages").value),
    experience: $("profileExperience").value.trim(),
    education: $("profileEducation").value.trim(),
    updated_at: new Date().toISOString()
  };
  if (!payload.full_name) return alert("Veuillez saisir votre nom.");
  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
  if (error) return alert("Impossible d’enregistrer le profil : " + error.message);
  const { error: authError } = await supabase.auth.updateUser({data:{full_name:payload.full_name}});
  if (authError) return alert("Profil enregistré, mais le compte n'a pas pu être synchronisé : " + authError.message);
  showNotification("Profil professionnel enregistré.", "success");
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

async function renderEmployerDashboard() {
  const user = await currentUser();
  if (!user) return renderAuth("login");

  const {data:profile, error:profileError} = await supabase.from("profiles").select("role,full_name,company_name,company_logo_url,company_description,company_website,company_phone,company_email,company_city,company_country").eq("id",user.id).maybeSingle();
  if (profileError) return alert("Erreur lors du chargement du profil entreprise : " + profileError.message);
  if (profile?.role !== "employer") return renderDashboard();

  const [{data:ownedJobs,error:jobsError},{data:apps,error:appsError}] = await Promise.all([
    supabase.from("jobs").select("id,title,country,city,type,contract,description,requirements,created_at,employer_id").eq("employer_id",user.id).order("created_at",{ascending:false}),
    supabase.from("applications").select("id,created_at,status,cover_letter,availability,phone,profile_snapshot,cv_path,cv_name,jobs!inner(id,title,city,country,employer_id)").eq("jobs.employer_id",user.id).order("created_at",{ascending:false})
  ]);
  if (jobsError) return alert("Impossible de charger vos offres : " + jobsError.message);
  if (appsError) return alert("Impossible de charger les candidatures : " + appsError.message);

function safeHtml(v){return esc(v || "");}
async function saveCompanyProfile(e){
  e.preventDefault(); const user=await currentUser(); if(!user)return renderAuth("login");
  const payload={company_name:$("companyName").value.trim(),company_logo_url:$("companyLogo").value.trim(),company_description:$("companyDescription").value.trim(),company_website:$("companyWebsite").value.trim(),company_phone:$("companyPhone").value.trim(),company_email:$("companyEmail").value.trim(),company_city:$("companyCity").value.trim(),company_country:$("companyCountry").value.trim()};
  const {error}=await supabase.from("profiles").update(payload).eq("id",user.id);
  if(error)return alert("Impossible d'enregistrer les informations : "+error.message);
  showNotification("Profil entreprise enregistré.","success"); await renderEmployerDashboard();
}
  const list = apps || [];
  const jobList = ownedJobs || [];
  const jobStats = jobList.reduce((acc,j) => {
    const items = list.filter(a => a.jobs?.id === j.id);
    acc[j.id] = { total: items.length, pending: items.filter(a => (a.status || "En cours") === "En cours").length, accepted: items.filter(a => a.status === "Acceptée").length, refused: items.filter(a => a.status === "Refusée").length };
    return acc;
  }, {});

  const cards = list.map(a => {
    const current = a.status || "En cours";
    return `<article class="employer-application-card" data-search="${esc([a.profile_snapshot?.full_name,a.profile_snapshot?.headline,a.jobs?.title,a.jobs?.city,a.jobs?.country].filter(Boolean).join(" "))}" data-status="${esc(current)}" data-job-id="${esc(a.jobs?.id || "")}">
      <div class="employer-application-head"><div>
        <h3>${esc(a.profile_snapshot?.full_name || "Candidat")}</h3>
        <p>${esc(a.profile_snapshot?.headline || "Profil candidat")} · ${esc(a.jobs?.title || "Offre")}</p>
        <small>📍 ${esc(a.jobs?.city || "")}, ${esc(a.jobs?.country || "")}</small>
      </div>
      <div class="application-status-actions">
        <button type="button" class="${current==="En cours"?"active":""}" onclick="updateApplicationStatus(${a.id},'En cours')">🟡 En cours</button>
        <button type="button" class="${current==="Acceptée"?"active":""}" onclick="updateApplicationStatus(${a.id},'Acceptée')">🟢 Acceptée</button>
        <button type="button" class="${current==="Refusée"?"active":""}" onclick="updateApplicationStatus(${a.id},'Refusée')">🔴 Refusée</button>
      </div></div>
      <div class="employer-application-grid">
        <div><small>🕐 Disponibilité</small><strong>${esc(a.availability || "Non précisée")}</strong></div>
        <div><small>📱 Téléphone</small><strong>${esc(a.phone || "Non précisé")}</strong></div>
        <div><small>📄 CV</small>${a.cv_path ? `<button type="button" class="cv-link" onclick="openApplicationCV('${esc(a.cv_path)}')">Ouvrir</button>` : "<strong>Non joint</strong>"}</div>
      </div>
      <details class="employer-details"><summary>Voir le profil et la lettre</summary>
        <p>${esc(a.profile_snapshot?.bio || "")}</p>
        <p><strong>✍️ Lettre</strong><br>${esc(a.cover_letter || "")}</p>
        ${(a.profile_snapshot?.skills || []).length ? `<p><strong>🧰 Compétences</strong><br>${esc(a.profile_snapshot.skills.join(" · "))}</p>` : ""}
      </details>
    </article>`;
  }).join("");

  const jobCards = jobList.map(j => {
    const s = jobStats[j.id] || {total:0,pending:0,accepted:0,refused:0};
    const active = j.is_active !== false;
    return `<article class="employer-job-card ${active ? "" : "job-closed"}" data-job-card-id="${j.id}">
      <div><h3>${esc(j.title)} <span class="job-activity-badge">${active ? "🟢 Active" : "⚪ Fermée"}</span></h3><p>📍 ${esc(j.city)}, ${esc(j.country)} · 💼 ${esc(j.type)} · 🕐 ${esc(j.contract)}</p></div>
      <div class="employer-job-count">${s.total} candidature(s)</div>
      <div class="employer-job-status-summary"><span>🟡 ${s.pending}</span><span>🟢 ${s.accepted}</span><span>🔴 ${s.refused}</span></div>
      <div class="employer-job-actions">
        <button type="button" onclick="focusEmployerApplications(${j.id})">📩 Voir les candidatures</button>
        <button type="button" onclick="toggleEmployerJob(${j.id},${active})">${active ? "⏸️ Fermer l'offre" : "▶️ Réactiver"}</button>
        <button type="button" onclick="editEmployerJob(${j.id})">✏️ Modifier</button>
        <button type="button" class="danger-button" onclick="deleteEmployerJob(${j.id})">🗑️ Supprimer</button>
      </div>
    </article>`;
  }).join("");

  $("account").innerHTML = `
    <div class="account-card dashboard employer-dashboard">
      <div class="dashboard-header">
        <div class="account-identity"><span class="eyebrow">ESPACE ENTREPRISE</span><h2>🏢 ${esc(profile?.full_name || "Entreprise")}</h2><p class="account-email">✉️ ${esc(user.email)}</p></div>
        <div class="account-actions"><button class="refresh-button" onclick="renderEmployerDashboard()">↻ Actualiser</button><button class="back-button" onclick="logout()">Se déconnecter</button></div>
      </div>
      <div class="dashboard-stats">
        <div class="stat-card"><span>💼</span><strong>${jobList.length}</strong><small>Mes offres</small></div>
        <div class="stat-card"><span>📩</span><strong>${list.length}</strong><small>Candidatures</small></div>
        <div class="stat-card"><span>🟡</span><strong>${list.filter(a=>(a.status||"En cours")==="En cours").length}</strong><small>En cours</small></div>
        <div class="stat-card"><span>🟢</span><strong>${list.filter(a=>a.status==="Acceptée").length}</strong><small>Acceptées</small></div>
        <div class="stat-card"><span>🔴</span><strong>${list.filter(a=>a.status==="Refusée").length}</strong><small>Refusées</small></div>
      </div>
      <section class="company-profile-manager">
        <div class="panel-heading"><div><span class="eyebrow">IDENTITÉ ENTREPRISE</span><h3>🏢 Profil de votre entreprise</h3><p class="small-note">Ces informations peuvent être affichées avec vos offres.</p></div></div>
        <form class="company-profile-form" onsubmit="saveCompanyProfile(event)">
          <div class="profile-form-grid">
            <label>Nom de l'entreprise<input id="companyName" value="${safeHtml(profile?.company_name)}" required maxlength="160"></label>
            <label>Logo (URL)<input id="companyLogo" value="${safeHtml(profile?.company_logo_url)}" type="url" maxlength="500"></label>
            <label>Site web<input id="companyWebsite" value="${safeHtml(profile?.company_website)}" type="url" maxlength="200"></label>
            <label>Téléphone<input id="companyPhone" value="${safeHtml(profile?.company_phone)}" maxlength="40"></label>
            <label>Email professionnel<input id="companyEmail" value="${safeHtml(profile?.company_email)}" type="email" maxlength="160"></label>
            <label>Ville<input id="companyCity" value="${safeHtml(profile?.company_city)}" maxlength="80"></label>
            <label>Pays<input id="companyCountry" value="${safeHtml(profile?.company_country)}" maxlength="80"></label>
          </div>
          <label>Présentation<textarea id="companyDescription" rows="4" maxlength="2000">${safeHtml(profile?.company_description)}</textarea></label>
          <button type="submit">💾 Enregistrer le profil entreprise</button>
        </form>
      </section>
      <section class="employer-job-manager">
        <div class="panel-heading"><div><span class="eyebrow">RECRUTEMENT</span><h3>➕ Publier une offre</h3><p class="small-note">Chaque offre est automatiquement rattachée à votre compte entreprise.</p></div></div>
        <form class="employer-job-form" onsubmit="saveEmployerJob(event)">
          <div class="profile-form-grid">
            <label>💼 Intitulé<input id="employerJobTitle" required maxlength="120"></label>
            <label>🌍 Pays<input id="employerJobCountry" required maxlength="80"></label>
            <label>📍 Ville<input id="employerJobCity" required maxlength="80"></label>
            <label>🏷️ Secteur<input id="employerJobType" required maxlength="80" placeholder="Hôtellerie, Logistique..."></label>
            <label>🕐 Contrat<input id="employerJobContract" required maxlength="80" value="Temps plein"></label>
          </div>
          <label>📝 Description<textarea id="employerJobDescription" rows="5" required maxlength="3000"></textarea></label>
          <label>✅ Conditions & exigences<textarea id="employerJobRequirements" rows="4" required maxlength="2000"></textarea></label>
          <input type="hidden" id="employerJobId">
          <div class="employer-job-form-actions"><button type="submit">💾 Enregistrer l'offre</button><button type="button" class="back-button" onclick="resetEmployerJobForm()">Réinitialiser</button></div>
        </form>
      </section>
      <section class="employer-job-manager">
        <div class="panel-heading"><div><span class="eyebrow">MES OFFRES</span><h3>📋 Offres publiées</h3></div></div>
        <div class="employer-job-list">${jobCards || '<p class="small-note">Aucune offre publiée pour le moment.</p>'}</div>
      </section>
      <section class="employer-applications">
        <div class="panel-heading"><div><span class="eyebrow">CANDIDATURES</span><h3>📩 Candidatures reçues</h3></div><span class="small-note">${list.length} au total</span></div>
        <div class="employer-filters">
          <input id="employerApplicationSearch" type="search" placeholder="🔎 Rechercher un candidat ou une offre..." oninput="filterEmployerApplications()">
          <select id="employerApplicationStatus" onchange="filterEmployerApplications()">
            <option value="">Tous les statuts</option><option>En cours</option><option>Acceptée</option><option>Refusée</option>
          </select>
          <select id="employerApplicationJob" onchange="filterEmployerApplications()">
            <option value="">Toutes les offres</option>
            ${jobList.map(j=>`<option value="${j.id}">${esc(j.title)}</option>`).join("")}
          </select>
          <select id="employerApplicationSort" onchange="sortEmployerApplications()">
            <option value="newest">Plus récentes</option><option value="oldest">Plus anciennes</option><option value="name">Nom du candidat</option>
          </select>
        </div>
        <p id="employerApplicationResultCount" class="filter-result-count">${list.length} candidature(s) affichée(s)</p>
        <div id="employerApplicationResults">${cards || '<p class="small-note">Aucune candidature reçue sur vos offres.</p>'}<p id="employerApplicationEmpty" class="filter-empty-state" hidden>Aucun résultat ne correspond aux filtres sélectionnés.</p></div>
      </section>
    </div>`;
}

function sortEmployerApplications() {
  const container = $("employerApplicationResults");
  if (!container) return;
  const cards = [...container.querySelectorAll(".employer-application-card")];
  const mode = $("employerApplicationSort")?.value || "newest";
  cards.sort((a,b) => {
    if (mode === "name") return (a.dataset.candidateName || "").localeCompare(b.dataset.candidateName || "", "fr");
    const da = new Date(a.dataset.createdAt || 0).getTime();
    const db = new Date(b.dataset.createdAt || 0).getTime();
    return mode === "oldest" ? da - db : db - da;
  });
  cards.forEach(card => container.appendChild(card));
  filterEmployerApplications();
}

function focusEmployerApplications(jobId){
  const select = $("employerApplicationJob");
  if (select) { select.value = String(jobId); filterEmployerApplications(); }
  const section = $("employerApplicationResults");
  if (section) section.scrollIntoView({behavior:"smooth", block:"start"});
}

function filterEmployerApplications() {
  const q = ($("employerApplicationSearch")?.value || "").trim().toLowerCase();
  const status = $("employerApplicationStatus")?.value || "";
  const jobId = $("employerApplicationJob")?.value || "";
  const cards = [...document.querySelectorAll("#employerApplicationResults .employer-application-card")];
  let visible = 0;
  cards.forEach(card => {
    const hay = (card.dataset.search || "").toLowerCase();
    card.hidden = Boolean((q && !hay.includes(q)) || (status && card.dataset.status !== status) || (jobId && card.dataset.jobId !== jobId));
    if (!card.hidden) visible++;
  });
  const empty = $("employerApplicationEmpty");
  if (empty) empty.hidden = visible !== 0;
  const counter = $("employerApplicationResultCount");
  if (counter) counter.textContent = `${visible} candidature(s) affichée(s) sur ${cards.length}`;
}

async function saveEmployerJob(e) {
  e.preventDefault();
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const id = $("employerJobId").value;
  const payload = {
    title: $("employerJobTitle").value.trim(),
    country: $("employerJobCountry").value.trim(),
    city: $("employerJobCity").value.trim(),
    type: $("employerJobType").value.trim(),
    contract: $("employerJobContract").value.trim(),
    description: $("employerJobDescription").value.trim(),
    requirements: $("employerJobRequirements").value.trim()
  };
  if (Object.values(payload).some(v => !v)) return alert("Veuillez compléter tous les champs.");
  const query = id
    ? supabase.from("jobs").update(payload).eq("id",id).eq("employer_id",user.id)
    : supabase.from("jobs").insert({...payload,employer_id:user.id});
  const {error} = await query;
  if (error) return alert("Impossible d'enregistrer l'offre : " + error.message);
  showNotification(id ? "Offre mise à jour." : "Offre publiée avec succès.", "success");
  await loadJobs();
  await renderEmployerDashboard();
}

function editEmployerJob(id) {
  const job = jobs.find(j => Number(j.id) === Number(id));
  if (!job) return;
  $("employerJobId").value = job.id;
  $("employerJobTitle").value = job.title || "";
  $("employerJobCountry").value = job.country || "";
  $("employerJobCity").value = job.city || "";
  $("employerJobType").value = job.type || "";
  $("employerJobContract").value = job.contract || "";
  $("employerJobDescription").value = job.description || "";
  $("employerJobRequirements").value = job.requirements || "";
  $("employerJobTitle").focus();
}

function resetEmployerJobForm() {
  const form = document.querySelector(".employer-job-form");
  if (form) form.reset();
  if ($("employerJobId")) $("employerJobId").value = "";
  if ($("employerJobContract")) $("employerJobContract").value = "Temps plein";
}

async function toggleEmployerJob(id, active) {
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const message = active ? "Fermer cette offre ? Elle ne sera plus visible aux candidats." : "Réactiver cette offre ?";
  if (!confirm(message)) return;
  const {error} = await supabase.from("jobs").update({is_active: !active}).eq("id",id).eq("employer_id",user.id);
  if (error) return alert("Impossible de modifier le statut de l'offre : " + error.message);
  showNotification(active ? "Offre fermée." : "Offre réactivée.", "success");
  await loadJobs();
  await renderEmployerDashboard();
}

async function deleteEmployerJob(id) {
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const {data:apps} = await supabase.from("applications").select("id").eq("job_id",id);
  if ((apps || []).length) return alert("Cette offre possède des candidatures. Modifiez-la plutôt que de la supprimer.");
  if (!confirm("Supprimer cette offre ?")) return;
  const {error} = await supabase.from("jobs").delete().eq("id",id).eq("employer_id",user.id);
  if (error) return alert("Impossible de supprimer l'offre : " + error.message);
  await loadJobs();
  await renderEmployerDashboard();
}

async function submitEmployerRequest(e) {
  e.preventDefault();
  const user=await currentUser(); if(!user) return renderAuth("login");
  const company_name=$("employerCompanyName").value.trim();
  if(!company_name) return alert("Veuillez saisir le nom de votre entreprise.");
  const {data:pending}=await supabase.from("employer_requests").select("id").eq("user_id",user.id).eq("status","pending").maybeSingle();
  if(pending) return alert("Une demande est déjà en attente.");
  const payload={user_id:user.id,company_name,contact_phone:$("employerContactPhone").value.trim(),website:$("employerWebsite").value.trim(),message:$("employerRequestMessage").value.trim()};
  const {error}=await supabase.from("employer_requests").insert(payload);
  if(error) return alert("Impossible d'envoyer la demande : "+error.message);
  showNotification("Demande entreprise envoyée.","success"); await renderDashboard();
}
function showEmployerRequestForm(){
  const box=document.getElementById("employerRequestBox"); if(!box)return;
  box.innerHTML='<span class="eyebrow">DEMANDE ENTREPRISE</span><h3>🏢 Demander un accès recruteur</h3><form class="employer-request-form" onsubmit="submitEmployerRequest(event)"><label>Nom de l’entreprise<input id="employerCompanyName" required maxlength="160"></label><label>Téléphone professionnel<input id="employerContactPhone" maxlength="40"></label><label>Site web<input id="employerWebsite" type="url" maxlength="200"></label><label>Présentation<textarea id="employerRequestMessage" rows="4" maxlength="1500"></textarea></label><div class="employer-request-actions"><button type="submit">📨 Envoyer</button><button type="button" class="back-button" onclick="renderEmployerRequestPanel()">Annuler</button></div></form>';
}
async function renderEmployerRequestPanel(){
  const user=await currentUser(),box=document.getElementById("employerRequestBox"); if(!user||!box)return;
  const {data:rows}=await supabase.from("employer_requests").select("company_name,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1);
  const r=rows&&rows[0];
  if(!r){box.innerHTML='<span class="eyebrow">RECRUTEMENT</span><h3>🏢 Vous recrutez ?</h3><p>Demandez un accès entreprise pour publier vos offres et gérer les candidatures.</p><button type="button" onclick="showEmployerRequestForm()">Demander un compte entreprise</button>';return;}
  const labels={pending:"En attente",approved:"Approuvée",rejected:"Refusée"};
  box.innerHTML='<span class="eyebrow">COMPTE ENTREPRISE</span><h3>🏢 Demande '+esc(labels[r.status]||r.status)+'</h3><p><strong>'+esc(r.company_name)+'</strong> · '+new Date(r.created_at).toLocaleDateString("fr-FR")+'</p><p class="small-note">'+(r.status==="pending"?"Votre demande est en cours de validation.":r.status==="approved"?"Votre accès entreprise est actif.":"La demande a été refusée.")+'</p>';
}
async function renderAdminPanel(){
  const user=await currentUser(); if(!user)return renderAuth("login");
  const {data:profile}=await supabase.from("profiles").select("is_admin").eq("id",user.id).maybeSingle();
  if(!profile||!profile.is_admin)return renderDashboard();
  const {data:rows,error}=await supabase.from("employer_requests").select("id,user_id,company_name,contact_phone,website,message,status,created_at").order("created_at",{ascending:false});
  if(error)return alert("Impossible de charger les demandes : "+error.message);
  const cards=(rows||[]).map(r=>'<article class="admin-request-card"><div class="admin-request-head"><div><span class="eyebrow">DEMANDE #'+r.id+'</span><h3>'+esc(r.company_name)+'</h3><p>'+esc(r.contact_phone||"Téléphone non renseigné")+' · '+esc(r.website||"Site non renseigné")+'</p><small>'+new Date(r.created_at).toLocaleDateString("fr-FR")+'</small></div><span class="status-badge">'+esc(r.status)+'</span></div><p class="admin-request-message">'+esc(r.message||"Aucun message.")+'</p><div class="admin-request-actions"><button type="button" onclick="reviewEmployerRequest('+r.id+',\\'approved\\')">✅ Approuver</button><button type="button" class="danger-button" onclick="reviewEmployerRequest('+r.id+',\\'rejected\\')">❌ Refuser</button></div></article>').join("");
  $("account").innerHTML='<div class="account-card dashboard admin-dashboard"><div class="dashboard-header"><div class="account-identity"><span class="eyebrow">ADMINISTRATION</span><h2>🛡️ Gestion des entreprises</h2><p class="account-email">Validation des comptes recruteurs</p></div><div class="account-actions"><button onclick="renderAdminPanel()">↻ Actualiser</button><button class="back-button" onclick="logout()">Se déconnecter</button></div></div><div class="dashboard-stats"><div class="stat-card"><span>📋</span><strong>'+(rows||[]).length+'</strong><small>Total</small></div><div class="stat-card"><span>🟡</span><strong>'+(rows||[]).filter(x=>x.status==="pending").length+'</strong><small>En attente</small></div><div class="stat-card"><span>🟢</span><strong>'+(rows||[]).filter(x=>x.status==="approved").length+'</strong><small>Approuvées</small></div></div><section class="admin-requests"><div class="panel-heading"><div><span class="eyebrow">REVUE</span><h3>Demandes reçues</h3></div></div>'+(cards||'<p class="small-note">Aucune demande.</p>')+'</section></div>';
}
async function reviewEmployerRequest(id,status){
  const user=await currentUser(); if(!user||!["approved","rejected"].includes(status))return;
  if(!confirm(status==="approved"?"Approuver cette entreprise ?":"Refuser cette demande ?"))return;
  const {data:req,error:readError}=await supabase.from("employer_requests").select("user_id").eq("id",id).maybeSingle();
  if(readError||!req)return alert("Demande introuvable.");
  const {error}=await supabase.from("employer_requests").update({status,reviewed_at:new Date().toISOString()}).eq("id",id);
  if(error)return alert("Impossible de traiter la demande : "+error.message);
  if(status==="approved"){
    const {error:roleError}=await supabase.from("profiles").update({role:"employer"}).eq("id",req.user_id);
    if(roleError)return alert("Demande approuvée, mais activation impossible : "+roleError.message);
  }
  await renderAdminPanel();
}

async function renderDashboard() {
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const [{data:profile}, {data:apps, error}] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,headline,bio,skills,languages,experience,education,cv_path,role").eq("id",user.id).maybeSingle(),
    supabase.from("applications").select("id,job_id,created_at,status,cover_letter,availability,phone,profile_snapshot,cv_path,cv_name,jobs(title,city,country)").eq("user_id",user.id).order("created_at",{ascending:false})
  ]);
  if (error) return alert("Erreur lors du chargement du compte : " + error.message);
  if (profile?.is_admin) return renderAdminPanel();
  if (profile?.role === 'employer') return renderEmployerDashboard();
  const name = profile?.full_name || user.user_metadata?.full_name || 'Candidat';
  const totalApps = apps?.length || 0;
  const pending = apps?.filter(a => (a.status || "En cours") === "En cours").length || 0;
  const accepted = apps?.filter(a => a.status === "Acceptée").length || 0;
  const refused = apps?.filter(a => a.status === "Refusée").length || 0;
  const favoriteCount = getFavorites().length;
  const profileCompletion = getProfileCompletion(profile, name !== "Candidat" ? name : "");
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
      <section class="candidate-profile-editor">
        <div class="panel-heading"><div><span class="eyebrow">PROFIL PROFESSIONNEL</span><h3>👤 Mon profil</h3><p class="small-note">Complétez votre profil pour mieux présenter votre candidature.</p></div><span class="completion-mini">${profileCompletion}%</span></div>
        <form class="candidate-profile-form" onsubmit="saveCandidateProfile(event)">
          <div class="profile-form-grid">
            <label>📛 Nom complet<input id="profileName" type="text" value="${esc(name)}" maxlength="80" required></label>
            <label>📱 Téléphone<input id="profilePhone" type="tel" maxlength="30" value="${esc(profile?.phone || "")}" placeholder="+213 ..."></label>
            <label>🎯 Titre professionnel<input id="profileHeadline" type="text" maxlength="120" value="${esc(profile?.headline || "")}" placeholder="Ex. Agent de sécurité"></label>
            <label>🧰 Compétences<input id="profileSkills" type="text" value="${esc((profile?.skills || []).join(", "))}" placeholder="Sécurité, accueil, informatique"></label>
            <label>🌐 Langues<input id="profileLanguages" type="text" value="${esc((profile?.languages || []).join(", "))}" placeholder="Français, arabe, anglais"></label>
            <label>💼 Expérience<textarea id="profileExperience" rows="4" maxlength="1500" placeholder="Décrivez vos expériences professionnelles...">${esc(profile?.experience || "")}</textarea></label>
            <label>🎓 Formation<textarea id="profileEducation" rows="4" maxlength="1500" placeholder="Diplômes, formations, certifications...">${esc(profile?.education || "")}</textarea></label>
          </div>
          <label>📝 Présentation<textarea id="profileBio" rows="5" maxlength="2000" placeholder="Présentez votre profil en quelques lignes...">${esc(profile?.bio || "")}</textarea></label>
          <button type="submit">💾 Enregistrer mon profil</button>
        </form>
      </section>
      <section class="candidate-profile-preview">
        <div class="panel-heading"><div><span class="eyebrow">APERÇU</span><h3>👁️ Profil professionnel</h3><p class="small-note">Voici comment votre profil peut être présenté à un recruteur.</p></div></div>
        <div class="profile-preview-card">
          <div class="profile-preview-head"><div class="profile-avatar">${esc((name || "C").charAt(0).toUpperCase())}</div><div><h3>${esc(profile?.headline || name)}</h3><p>${esc(profile?.headline ? name : "Candidat Work Travel")}</p></div></div>
          ${profile?.bio ? `<div class="preview-section"><strong>📝 Présentation</strong><p>${esc(profile.bio)}</p></div>` : ""}
          ${(profile?.skills || []).length ? `<div class="preview-section"><strong>🧰 Compétences</strong><div class="preview-tags">${profile.skills.map(x => `<span>${esc(x)}</span>`).join("")}</div></div>` : ""}
          ${(profile?.languages || []).length ? `<div class="preview-section"><strong>🌐 Langues</strong><p>${esc(profile.languages.join(" · "))}</p></div>` : ""}
          ${profile?.experience ? `<div class="preview-section"><strong>💼 Expérience</strong><p>${esc(profile.experience)}</p></div>` : ""}
          ${profile?.education ? `<div class="preview-section"><strong>🎓 Formation</strong><p>${esc(profile.education)}</p></div>` : ""}
          ${profile?.phone ? `<div class="preview-contact">📱 ${esc(profile.phone)}</div>` : ""}
        </div>
      </section>
      <section class="employer-request-panel" id="employerRequestBox"></section>
      <div class="dashboard-grid">
        <section class="dashboard-panel"><div class="panel-heading"><div><span class="eyebrow">DOCUMENTS</span><h3>📄 Mon CV</h3></div></div>
          <div class="cv-box"><div><strong>CV professionnel</strong><p id="cvStatus" class="small-note">${profile?.cv_path ? `CV enregistré. <button type="button" class="cv-link" onclick="openCV()">Ouvrir</button> <button type="button" class="cv-delete" onclick="deleteCV()">Supprimer</button>` : "Ajoutez votre CV pour compléter votre profil."}</p></div><input type="file" id="cvFile" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div>
        </section>
        <section class="dashboard-panel"><div class="panel-heading"><div><span class="eyebrow">ACTIVITÉ</span><h3>📈 Résumé</h3></div></div>
          <div class="activity-list"><div><span>🟡</span><strong>${pending}</strong><p>candidature(s) en cours</p></div><div><span>🟢</span><strong>${accepted}</strong><p>candidature(s) acceptée(s)</p></div><div><span>🔴</span><strong>${refused}</strong><p>candidature(s) refusée(s)</p></div></div>
        </section>
      </div>
      <div class="applications-list dashboard-history"><div class="panel-heading"><div><span class="eyebrow">SUIVI</span><h3>📋 Mes dernières candidatures</h3></div><span class="small-note">${totalApps} au total</span></div>
        ${latestApps.length ? latestApps.map(a => `
          <article class="application-history-card">
            <div class="application-history-head"><div><strong>${esc(a.jobs?.title || "Offre")}</strong><span>📍 ${esc(a.jobs?.city || "")}, ${esc(a.jobs?.country || "")}</span></div><span class="status-badge status-${(a.status || "En cours").toLowerCase().replace(/\s+/g,"-")}">${esc(a.status || "En cours")}</span></div>
            <div class="application-history-grid"><div><small>📅 Envoyée le</small><strong>${new Date(a.created_at).toLocaleDateString("fr-FR")}</strong></div><div><small>🕐 Disponibilité</small><strong>${esc(a.availability || "Non précisée")}</strong></div><div><small>📱 Téléphone</small><strong>${esc(a.phone || a.profile_snapshot?.phone || "Non précisé")}</strong></div><div><small>📄 CV</small>${a.cv_path ? `<button type="button" class="cv-link" onclick="openApplicationCV('${esc(a.cv_path)}')">Ouvrir ${esc(a.cv_name || "le CV")}</button>` : "<strong>Non joint</strong>"}</div></div>
            <div class="application-history-section"><small>👤 Profil envoyé</small><div class="profile-snapshot-line"><strong>${esc(a.profile_snapshot?.full_name || "Candidat")}</strong>${a.profile_snapshot?.headline ? `<span>${esc(a.profile_snapshot.headline)}</span>` : ""}</div>${(a.profile_snapshot?.skills || []).length ? `<div class="preview-tags">${a.profile_snapshot.skills.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}</div>
            <div class="application-history-section"><small>✍️ Lettre de motivation</small><p class="application-cover-letter">${esc(a.cover_letter || "Aucune lettre enregistrée.")}</p></div>
          </article>`).join("") : '<p class="small-note">Aucune candidature pour le moment. Découvrez les offres disponibles.</p>'}      </div>
    </div>`;
  $("cvFile").addEventListener("change", saveCV);
}

async function openApplicationCV(path) {
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const {data:profile} = await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  const isEmployer = profile?.role === "employer";
  if (!path) return alert("Document non autorisé.");
  if (!isEmployer && !path.startsWith("applications/" + user.id + "/") && !path.startsWith(user.id + "/")) return alert("Document non autorisé.");
  if (isEmployer && !path.startsWith("applications/")) return alert("Document non autorisé.");
  const { data, error } = await supabase.storage.from("cvs").createSignedUrl(path, 60);
  if (error) return alert("Impossible d’ouvrir le CV : " + error.message);
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
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
  const {data,error} = await supabase.from("jobs").select("*,profiles!jobs_employer_id_fkey(company_name,company_logo_url,company_description,company_website,company_phone,company_email,company_city,company_country)").order("id");
  if (error) {
    $("jobs").innerHTML = '<div class="empty-state"><h3>Impossible de charger les offres</h3><p>Vérifiez la connexion à la base de données.</p></div>';
    return;
  }
  jobs = (data || []).filter(job => job.is_active !== false);
  await populateFilters();
  renderPreferences();
  displayJobs();
  await renderEmployerRequestPanel();
  renderSearchHistory();
}

window.showJob=showJob; window.savePreferences=savePreferences; window.saveEmployerJob=saveEmployerJob; window.editEmployerJob=editEmployerJob; window.resetEmployerJobForm=resetEmployerJobForm; window.deleteEmployerJob=deleteEmployerJob; window.jobMatchScore=jobMatchScore; window.saveSearchHistory=saveSearchHistory; window.useSearchHistory=useSearchHistory; window.clearSearchHistory=clearSearchHistory; window.showNotification=showNotification; window.openApplicationForm=openApplicationForm; window.applyJob=applyJob; window.updateTravelGuide=updateTravelGuide; window.toggleTravelItem=toggleTravelItem; window.clearTravelChecklist=clearTravelChecklist; window.openAccount=openAccount; window.renderAuth=renderAuth; window.logout=logout; window.resetView=resetView; window.searchJobs=searchJobs; window.openCV=openCV; window.deleteCV=deleteCV; window.toggleFavorite=toggleFavorite; window.toggleFavoritesOnly=toggleFavoritesOnly; window.clearFavorites=clearFavorites; window.updateProfileName=updateProfileName; window.saveCandidateProfile=saveCandidateProfile; window.openApplicationCV=openApplicationCV; window.renderEmployerDashboard=renderEmployerDashboard; window.saveCompanyProfile=saveCompanyProfile; window.renderAdminPanel=renderAdminPanel; window.reviewEmployerRequest=reviewEmployerRequest; window.renderEmployerRequestPanel=renderEmployerRequestPanel; window.showEmployerRequestForm=showEmployerRequestForm; window.showCompanyProfile=showCompanyProfile; window.submitEmployerRequest=submitEmployerRequest; window.renderEmployerRequestPanel=renderEmployerRequestPanel; window.showEmployerRequestForm=showEmployerRequestForm; window.submitEmployerRequest=submitEmployerRequest; window.updateApplicationStatus=updateApplicationStatus;

document.addEventListener("DOMContentLoaded", async () => {
  await loadJobs();
  const user = await currentUser();
  if (user) await renderDashboard();
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) renderAuth("login");
  });
});

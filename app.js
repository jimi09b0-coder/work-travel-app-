
const I18N = {
  fr: {
    nav_jobs:"Offres", nav_travel:"Voyage", nav_account:"Mon compte",
    hero_badge:"🇪🇺 Europe • Emploi • Voyage", hero_title:"Travaillez en Europe,\n", hero_text:"Trouvez un emploi, préparez votre départ et gérez vos candidatures au même endroit.", hero_cta:"🔎 Voir les offres",
    useful_eyebrow:"LIENS UTILES", useful_title:"🌐 Sites officiels pour travailler et préparer son départ", useful_text:"Accédez directement aux portails européens et nationaux de l’emploi.",
    jobs_eyebrow:"OPPORTUNITÉS", search_title:"🔎 Rechercher un emploi", search_text:"Filtrez les offres par métier, pays, ville ou secteur.",
    search_placeholder:"Métier, pays ou ville...", all_countries:"Tous les pays", all_sectors:"Tous les secteurs",
    travel_eyebrow:"PRÉPARER SON DÉPART", travel_title:"🧳 Votre checklist de voyage", travel_text:"Préparez votre installation en Europe avec une checklist simple et pratique.",
    progress:"Progression", travel_empty_title:"Choisissez votre destination", travel_empty_text:"Vous obtiendrez une checklist adaptée à votre départ.",
    about_eyebrow:"WORK TRAVEL", about_title:"Votre projet européen, au même endroit", about_text:"Créez votre profil, ajoutez votre CV et gardez une trace de vos candidatures.",
    footer_text:"Travail et voyage en Europe", language_name:"Français"
  },
  en: {
    nav_jobs:"Jobs", nav_travel:"Travel", nav_account:"My account",
    hero_badge:"🇪🇺 Europe • Jobs • Travel", hero_title:"Work in Europe,", hero_text:"Find a job, prepare your move, and manage your applications in one place.", hero_cta:"🔎 View jobs",
    useful_eyebrow:"USEFUL LINKS", useful_title:"🌐 Official sites for work and relocation", useful_text:"Go directly to European and national employment portals.",
    jobs_eyebrow:"OPPORTUNITIES", search_title:"🔎 Search for a job", search_text:"Filter jobs by role, country, city or sector.",
    search_placeholder:"Job, country or city...", all_countries:"All countries", all_sectors:"All sectors",
    travel_eyebrow:"PREPARE YOUR MOVE", travel_title:"🧳 Your travel checklist", travel_text:"Prepare your move to Europe with a simple, practical checklist.",
    progress:"Progress", travel_empty_title:"Choose your destination", travel_empty_text:"You will get a checklist tailored to your move.",
    about_eyebrow:"WORK TRAVEL", about_title:"Your European project, in one place", about_text:"Create your profile, add your CV and keep track of your applications.",
    footer_text:"Work and travel in Europe", language_name:"English"
  },
  ar: {
    nav_jobs:"الوظائف", nav_travel:"السفر", nav_account:"حسابي",
    hero_badge:"🇪🇺 أوروبا • العمل • السفر", hero_title:"اعمل في أوروبا،", hero_text:"ابحث عن وظيفة، حضّر سفرك، وأدر طلباتك من مكان واحد.", hero_cta:"🔎 عرض الوظائف",
    useful_eyebrow:"روابط مفيدة", useful_title:"🌐 مواقع رسمية للعمل والاستقرار", useful_text:"انتقل مباشرة إلى بوابات التوظيف الأوروبية والوطنية.",
    jobs_eyebrow:"الفرص", search_title:"🔎 ابحث عن وظيفة", search_text:"صفِّ الوظائف حسب المهنة أو الدولة أو المدينة أو القطاع.",
    search_placeholder:"المهنة أو الدولة أو المدينة...", all_countries:"كل الدول", all_sectors:"كل القطاعات",
    travel_eyebrow:"الاستعداد للسفر", travel_title:"🧳 قائمة تجهيز السفر", travel_text:"جهّز انتقالك إلى أوروبا من خلال قائمة بسيطة وعملية.",
    progress:"التقدم", travel_empty_title:"اختر وجهتك", travel_empty_text:"ستظهر لك قائمة تجهيز مناسبة لرحلتك.",
    about_eyebrow:"WORK TRAVEL", about_title:"مشروعك الأوروبي في مكان واحد", about_text:"أنشئ ملفك، أضف سيرتك الذاتية، وتابع طلبات التوظيف.",
    footer_text:"العمل والسفر في أوروبا", language_name:"العربية"
  }
};
function getLanguage(){ return localStorage.getItem("workTravelLanguage") || "fr"; }
function setLanguage(lang){
  const selected = I18N[lang] ? lang : "fr";
  localStorage.setItem("workTravelLanguage", selected);
  applyLanguage();
}
function applyLanguage(){
  const lang = getLanguage(), dict = I18N[lang] || I18N.fr;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.body.classList.toggle("rtl-language", lang === "ar");
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n, value = dict[key];
    if (value == null) return;
    if (key === "hero_title") {
      const titleSpan = el.querySelector("span");
      if (titleSpan) titleSpan.textContent = lang === "fr" ? "vivez votre aventure." : lang === "en" ? "live your adventure." : "عِش مغامرتك.";
      el.childNodes[0].nodeValue = value + " ";
    } else el.textContent = value;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const value = dict[el.dataset.i18nPlaceholder]; if (value) el.placeholder = value;
  });
  const select=$("languageSelect"); if(select) select.value=lang;
  document.title = lang==="ar" ? "Work Travel | العمل والسفر" : lang==="en" ? "Work Travel | Jobs & Travel" : "Work Travel | Emploi & Voyage";
}

import { supabase } from "./supabase-config.js";

let jobs = [];
let favoritesOnly = false;
const $ = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function safeExternalUrl(value) { const raw=String(value || '').trim(); if (!raw) return ''; try { const url=new URL(raw, window.location.origin); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }

async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

async function populateFilters() {
  const countries = [...new Set(jobs.map(j => j.country))].sort();
  const types = [...new Set(jobs.map(j => j.type).filter(Boolean))].sort();
  const currencies = [...new Set(jobs.map(j => j.salary_currency).filter(Boolean))].sort();
  $("countryFilter").innerHTML = '<option value="">Tous les pays</option>' + countries.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  $("typeFilter").innerHTML = '<option value="">Tous les secteurs</option>' + types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  if ($("currencyFilter")) $("currencyFilter").innerHTML = '<option value="">Toutes les devises</option>' + currencies.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
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

function applicationStatusLabel(status) {
  const value = status || 'En cours';
  if (value === 'Acceptée') return '🟢 Acceptée';
  if (value === 'Refusée') return '🔴 Refusée';
  return '🟡 En cours';
}

function notificationKey(app) { return String(app.id) + ':' + String(app.status || 'En cours'); }

async function markNotificationRead(key) {
  const user = await currentUser();
  if (!user) return renderAuth("login");
  if (String(key).startsWith("db:")) {
    const id = Number(String(key).slice(3));
    if (Number.isFinite(id)) await supabase.from("notifications").update({is_read:true}).eq("id",id).eq("user_id",user.id);
  } else {
    const next = [...new Set([...getReadNotifications(), key])];
    localStorage.setItem("workTravelReadNotifications", JSON.stringify(next));
  }
  await renderDashboard();
}

function notificationMessage(app) {
  const title = app?.jobs?.title || 'Votre candidature';
  if ((app?.status || 'En cours') === 'Acceptée') return 'Bonne nouvelle : votre candidature pour « ' + title + ' » a été acceptée.';
  if ((app?.status || '') === 'Refusée') return 'Le recruteur a terminé l’examen de votre candidature pour « ' + title + ' ». Consultez le statut dans votre historique.';
  return 'Votre candidature pour « ' + title + ' » est toujours en cours de traitement.';
}

async function markAllNotificationsRead() {
  const user = await currentUser();
  if (!user) return renderAuth('login');
  await supabase.from('notifications').update({is_read:true}).eq('user_id',user.id).eq('is_read',false);
  const {data:apps} = await supabase.from('applications').select('id,status').eq('user_id',user.id);
  const keys = (apps || []).filter(a => (a.status || 'En cours') !== 'En cours').map(notificationKey);
  const next = [...new Set([...getReadNotifications(), ...keys])];
  localStorage.setItem('workTravelReadNotifications', JSON.stringify(next));
  await renderDashboard();
}

async function buildUserNotifications(apps) {
  const user = await currentUser();
  const db = user ? await supabase.from('notifications').select('id,title,message,created_at,is_read,application_id,type').eq('user_id',user.id).order('created_at',{ascending:false}).limit(8) : {data:[]};
  const dbNotifications = db.data || [];
  const dbApplicationIds = new Set(dbNotifications.map(n => Number(n.application_id)).filter(Number.isFinite));
  const read = getReadNotifications();
  const legacyNotifications = (apps || []).filter(a => {
    const status = a.status || 'En cours';
    return status !== 'En cours' && !dbApplicationIds.has(Number(a.id)) && !read.includes(notificationKey(a));
  }).map(a => ({
    ...a,
    title: 'Mise à jour de candidature',
    message: notificationMessage(a),
    id: 'legacy:' + String(a.id),
    is_read: false,
    type: 'application_status'
  }));
  return [...dbNotifications, ...legacyNotifications]
    .sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 8);
}
async function getUnreadNotificationCount() {
  const user = await currentUser();
  if (!user) return 0;
  const {count} = await supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('is_read',false);
  return count || 0;
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
  const job = jobs.find(j => Number(j.id) === Number(id));
  const favorites = getFavorites();
  if (job?.is_active === false && !favorites.includes(Number(id))) {
    showNotification("Cette offre est fermée et ne peut pas être ajoutée aux favoris.", "info");
    return;
  }
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
  const remote = $('remoteFilter')?.value || '';
  const prefs = getPreferences();
  let score = 40;
  if (country && job.country === country) score += 20;
  if (type && job.type === type) score += 15;
  if (remote && job.remote_type === remote) score += 10;
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
      <div class="job-meta"><span>📍 ${esc(j.city)}, ${esc(j.country)}</span><span>💼 ${esc(j.type)}</span><span>🕐 ${esc(j.contract)}</span><span>🌐 ${esc(j.remote_type === "remote" ? "À distance" : j.remote_type === "hybrid" ? "Hybride" : "Présentiel")}</span>${j.salary_currency && (j.salary_min != null || j.salary_max != null) ? `<span>💰 ${j.salary_min != null ? Number(j.salary_min).toLocaleString() : ""}${j.salary_max != null ? "–"+Number(j.salary_max).toLocaleString() : ""} ${esc(j.salary_currency)}</span>` : ""}</div>
      <p>${esc(j.description)}</p>
      ${j.profiles?.company_name ? `<div class="job-company-mini">${safeExternalUrl(j.profiles.company_logo_url) ? `<img src="${esc(safeExternalUrl(j.profiles.company_logo_url))}" alt="">` : "<span>🏢</span>"}<div><strong>${esc(j.profiles.company_name)}</strong><small>${esc(j.profiles.company_city || j.profiles.company_country || "Entreprise")}</small></div></div>` : ""}
      <button onclick="showJob(${j.id})">Voir les détails →</button>
    </article>`).join("");
}

async function showJob(id) {
  const user = await currentUser();
  let j = jobs.find(x => x.id === id);
  if (!j) {
    const {data,error} = await supabase.from("jobs").select("*").eq("id",id).maybeSingle();
    if (error || !data) return;
    j = data;
    if (j.employer_id && user) {
      const {data:company} = await supabase.rpc("get_company_public_profile",{company_user_id:j.employer_id});
      j = {...j, profiles: company || null};
    }
  }
  const alreadyApplied = user ? await hasApplied(id, user.id) : false;
  const similar = jobs.filter(x => x.id !== id && (x.country === j.country || x.type === j.type)).slice(0,3);
  const jobClosed = j.is_active === false;
  $("jobs").innerHTML = `
    <article class="job-detail-card">
      <div class="job-detail-top"><div><span class="eyebrow">OFFRE D'EMPLOI</span><h2>${esc(j.title)} ${jobClosed ? '<span class="job-activity-badge">⚪ Offre fermée</span>' : '<span class="job-activity-badge">🟢 Offre active</span>'}</h2><div class="job-meta"><span>📍 ${esc(j.city)}, ${esc(j.country)}</span><span>💼 ${esc(j.type)}</span><span>🕐 ${esc(j.contract)}</span></div></div><button class="favorite-button ${isFavorite(j.id) ? "is-favorite" : ""}" onclick="toggleFavorite(${j.id})">${isFavorite(j.id) ? "★" : "☆"}</button></div>
      <div class="job-detail-grid"><div>
        ${j.profiles?.company_name ? `<section class="job-company-profile"><div class="company-profile-head">${safeExternalUrl(j.profiles.company_logo_url) ? `<img src="${esc(safeExternalUrl(j.profiles.company_logo_url))}" alt="">` : `<div class="company-logo-placeholder">🏢</div>`}<div><span class="eyebrow">ENTREPRISE</span><h3>${esc(j.profiles.company_name)}</h3><p>📍 ${esc(j.profiles.company_city || "")}${j.profiles.company_city && j.profiles.company_country ? ", " : ""}${esc(j.profiles.company_country || "")}</p></div></div>${j.profiles.company_description ? `<p>${esc(j.profiles.company_description)}</p>` : ""}<button type="button" class="company-profile-link" onclick="showCompanyProfile('${j.employer_id}')">Voir le profil de l’entreprise →</button><div class="company-links">${j.profiles.company_website ? `<a href="${esc(safeExternalUrl(j.profiles.company_website))}" target="_blank" rel="noopener noreferrer">🌐 Site web</a>` : ""}${j.profiles.company_phone ? `<span>📞 ${esc(j.profiles.company_phone)}</span>` : ""}${j.profiles.company_email ? `<span>✉️ ${esc(j.profiles.company_email)}</span>` : ""}</div></section>` : ""}
        <section class="detail-section"><h3>📝 Description</h3><p>${esc(j.description)}</p></section>
        <section class="detail-section"><h3>✅ Conditions & exigences</h3><p>${esc(j.requirements)}</p></section>
        <section class="detail-section"><h3>🧳 Préparer votre départ</h3><div class="travel-mini"><span>📄 Documents</span><span>🏠 Logement</span><span>🚌 Transport</span><span>🛡️ Assurance</span></div></section>
      </div><aside class="job-apply-box"><span class="eyebrow">VOTRE CANDIDATURE</span><h3>Prêt à postuler ?</h3><p>Préparez votre CV et votre lettre de motivation avant d’envoyer votre candidature.</p>${jobClosed ? '<div class="applied-badge">⚪ Cette offre est fermée</div>' : (alreadyApplied ? '<div class="applied-badge">✓ Déjà postulé</div>' : `<button class="apply-main" onclick="openApplicationForm(${j.id})">🚀 Postuler maintenant</button>`)}<button onclick="resetView()" class="back-button detail-back">← Retour aux offres</button></aside></div>
      ${similar.length ? `<section class="similar-section"><div class="panel-heading"><div><span class="eyebrow">À DÉCOUVRIR</span><h3>💼 Offres similaires</h3></div></div><div class="similar-jobs">${similar.map(x => `<button class="similar-job" onclick="showJob(${x.id})"><strong>${esc(x.title)}</strong><span>📍 ${esc(x.city)}, ${esc(x.country)}</span><small>${esc(x.type)} · ${esc(x.contract)}</small></button>`).join("")}</div></section>` : ""}
    </article>`;
  $("offres").scrollIntoView({behavior:"smooth"});
}

async function showCompanyProfile(userId) {
  const viewer = await currentUser();
  if (!viewer) return renderAuth("login");
  const {data:company,error}=await supabase.rpc("get_company_public_profile",{company_user_id:userId}).maybeSingle();
  if(error||!company?.company_name) return;
  const {data:companyJobs,error:jobsError}=await supabase.from("jobs").select("id,title,city,country,type,contract,is_active,created_at,employer_id").eq("employer_id",userId).eq("is_active",true).order("created_at",{ascending:false});
  if(jobsError) return alert("Impossible de charger les offres de cette entreprise : "+jobsError.message);
  $("jobs").innerHTML=`
    <article class="company-page">
      <div class="company-page-head">
        ${safeExternalUrl(company.company_logo_url) ? `<img src="${esc(safeExternalUrl(company.company_logo_url))}" alt="">` : '<div class="company-logo-large">🏢</div>'}
        <div><span class="eyebrow">ENTREPRISE</span><h2>${esc(company.company_name)}</h2><p>📍 ${esc(company.company_city||"")}${company.company_city&&company.company_country?", ":""}${esc(company.company_country||"")}</p></div>
      </div>
      ${company.company_description ? `<section class="company-page-section"><h3>À propos</h3><p>${esc(company.company_description)}</p></section>` : ""}
      <div class="company-links">${safeExternalUrl(company.company_website) ? `<a href="${esc(safeExternalUrl(company.company_website))}" target="_blank" rel="noopener noreferrer">🌐 Site web</a>` : ""}${company.company_phone ? `<span>📞 ${esc(company.company_phone)}</span>` : ""}${company.company_email ? `<span>✉️ ${esc(company.company_email)}</span>` : ""}</div>
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

async function openApplicationForm(id) {
  let j = jobs.find(x => Number(x.id) === Number(id));
  if (!j) {
    const {data,error} = await supabase.from("jobs").select("id,title,country,country_code,city,type,contract,remote_type,salary_min,salary_max,salary_currency,description,requirements,is_active").eq("id",id).maybeSingle();
    if (error || !data) return alert("Cette offre n'est plus disponible.");
    j = data;
  }
  if (j.is_active === false) return alert("Cette offre est actuellement fermée.");
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
  const {data:job,error:jobError} = await supabase.from("jobs").select("id,title,is_active").eq("id",id).maybeSingle();
  if (jobError || !job) { alert("Cette offre n'est plus disponible."); return; }
  if (job.is_active === false) { alert("Cette offre est actuellement fermée. Vous ne pouvez plus envoyer de candidature."); return; }
  if (await hasApplied(id, user.id)) { alert("Vous avez déjà postulé à cette offre."); return; }
  const cover_letter = $("coverLetter").value.trim();
  const availability = $("applicationAvailability").value;
  const phone = $("applicationPhone").value.trim();
  if (!cover_letter || !availability) return alert("Veuillez compléter la lettre de motivation et votre disponibilité.");
  if (cover_letter.length < 30) return alert("Votre lettre de motivation doit contenir au moins 30 caractères.");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name,phone,headline,bio,skills,languages,experience,education,cv_path,role,is_admin").eq("id", user.id).maybeSingle();
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

function renderPasswordRecovery() {
  $("account").innerHTML = `
    <div class="account-card">
      <span class="eyebrow">ESPACE CANDIDAT</span>
      <h2>🔁 Réinitialiser le mot de passe</h2>
      <p>Choisissez un nouveau mot de passe pour votre compte.</p>
      <form class="application-form" id="recoveryForm">
        <input id="recoveryPassword" type="password" placeholder="Nouveau mot de passe" minlength="6" required>
        <button type="submit">Enregistrer le nouveau mot de passe</button>
      </form>
      <button class="link-button" onclick="renderAuth('login')">← Retour à la connexion</button>
    </div>`;
  $("recoveryForm").addEventListener("submit", async e => {
    e.preventDefault();
    const password = $("recoveryPassword").value;
    if (password.length < 6) return alert("Le mot de passe doit contenir au moins 6 caractères.");
    const {error} = await supabase.auth.updateUser({password});
    if (error) return alert(error.message);
    await supabase.auth.signOut();
    renderAuth("login", "Mot de passe mis à jour. Vous pouvez vous reconnecter.");
  });
}
function handleAuthRedirectError() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  const error = params.get("error");
  if (!error) return false;
  const description = params.get("error_description");
  const code = params.get("error_code");
  const message = code === "otp_expired"
    ? "Le lien de confirmation a expiré ou a déjà été utilisé. Demandez un nouveau lien."
    : description
      ? decodeURIComponent(description.replace(/\\+/g, " "))
      : "Le lien d’authentification n’est plus valide. Réessayez.";
  renderAuth("login", message);
  return true;
}

async function forgotPassword() {
  const email = (window.prompt("Adresse e-mail du compte :") || "").trim().toLowerCase();
  if (!email) return;
  const redirectTo = window.location.origin + window.location.pathname;
  const {error} = await supabase.auth.resetPasswordForEmail(email, {redirectTo});
  if (error) return alert(error.message);
  renderAuth("login", "Un lien de réinitialisation a été envoyé si cette adresse correspond à un compte.");
}

function renderAuth(mode="register", message="") {
  $("account").innerHTML = `
    <div class="account-card">
      <span class="eyebrow">ESPACE CANDIDAT</span>
      <h2>${mode === "login" ? "🔐 Connexion" : "👤 Créer mon compte"}</h2>
      <p>${mode === "login" ? "Connectez-vous pour gérer votre profil et vos candidatures." : "Créez un profil pour postuler et enregistrer votre CV."}</p>
      <p id="authMessage" class="auth-error" hidden></p>
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
  if (mode === "login") {
    const forgot = document.createElement("button");
    forgot.type = "button";
    forgot.className = "link-button";
    forgot.textContent = "Mot de passe oublié ?";
    forgot.addEventListener("click", forgotPassword);
    $("authForm").after(forgot);
  }
}

function authMessage(message, type="error") {
  const box = document.getElementById("authMessage");
  if (!box) return;
  box.className = type === "error" ? "auth-error" : "success-note";
  box.textContent = message;
  box.hidden = !message;
}
function friendlyAuthError(error) {
  const message = String(error?.message || "");
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (lower.includes("email not confirmed")) return "Votre e-mail n’est pas encore confirmé.";
  if (lower.includes("user already registered")) return "Un compte existe déjà avec cet e-mail. Utilisez « Se connecter ».";
  if (lower.includes("rate limit")) return "Trop de tentatives. Attendez quelques minutes puis réessayez.";
  if (lower.includes("network") || lower.includes("fetch")) return "Connexion réseau impossible. Vérifiez Internet puis réessayez.";
  return message || "Une erreur d’authentification est survenue.";
}
async function resendConfirmation(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!value) return authMessage("Saisissez votre adresse e-mail pour recevoir le lien de confirmation.");
  const { error } = await supabase.auth.resend({ type: "signup", email: value });
  if (error) return authMessage(friendlyAuthError(error));
  authMessage("Nouveau lien de confirmation envoyé. Vérifiez aussi le dossier spam.", "success");
}
function showResendConfirmation(email) {
  const form = $("authForm");
  if (!form) return;
  const old = document.getElementById("resendConfirmation");
  if (old) old.remove();
  const button = document.createElement("button");
  button.id = "resendConfirmation";
  button.type = "button";
  button.className = "link-button";
  button.textContent = "📩 Renvoyer l’e-mail de confirmation";
  button.addEventListener("click", () => resendConfirmation(email));
  form.after(button);
}
async function register(e) {
  e.preventDefault();
  authMessage("");
  const name = $("authName")?.value.trim() || "";
  const email = $("authEmail")?.value.trim().toLowerCase() || "";
  const password = $("authPassword")?.value || "";
  if (!name) return authMessage("Veuillez saisir votre nom complet.");
  if (!email) return authMessage("Veuillez saisir votre adresse e-mail.");
  if (password.length < 6) return authMessage("Le mot de passe doit contenir au moins 6 caractères.");
  const button = $("authForm")?.querySelector('button[type="submit"]');
  if (button) { button.disabled = true; button.textContent = "Création du compte…"; }
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    if (error) return authMessage(friendlyAuthError(error));
    if (data?.session) return await renderDashboard();
    renderAuth("login", "Compte créé. Vérifiez votre e-mail puis utilisez le bouton de renvoi si nécessaire.");
    $("authEmail").value = email;
    showResendConfirmation(email);
  } catch (error) {
    authMessage(friendlyAuthError(error));
  } finally {
    const currentButton = $("authForm")?.querySelector('button[type="submit"]');
    if (currentButton) { currentButton.disabled = false; currentButton.textContent = "Se connecter"; }
  }
}
async function login(e) {
  e.preventDefault();
  authMessage("");
  const email = $("authEmail")?.value.trim().toLowerCase() || "";
  const password = $("authPassword")?.value || "";
  if (!email) return authMessage("Veuillez saisir votre adresse e-mail.");
  if (!password) return authMessage("Veuillez saisir votre mot de passe.");
  const button = $("authForm")?.querySelector('button[type="submit"]');
  if (button) { button.disabled = true; button.textContent = "Connexion…"; }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      authMessage(friendlyAuthError(error));
      if (String(error?.message || "").toLowerCase().includes("email not confirmed")) showResendConfirmation(email);
      return;
    }
    if (!data?.user) return authMessage("Connexion non confirmée. Réessayez.");
    await renderDashboard();
  } catch (error) {
    authMessage(friendlyAuthError(error));
  } finally {
    const currentButton = $("authForm")?.querySelector('button[type="submit"]');
    if (currentButton) { currentButton.disabled = false; currentButton.textContent = "Se connecter"; }
  }
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
    supabase.from("jobs").select("id,title,country,country_code,city,type,contract,remote_type,salary_min,salary_max,salary_currency,description,requirements,created_at,employer_id,is_active").eq("employer_id",user.id).order("created_at",{ascending:false}),
    supabase.from("applications").select("id,created_at,status,cover_letter,availability,phone,profile_snapshot,cv_path,cv_name,jobs!inner(id,title,city,country,employer_id)").eq("jobs.employer_id",user.id).order("created_at",{ascending:false})
  ]);
  if (jobsError) return alert("Impossible de charger vos offres : " + jobsError.message);
  if (appsError) return alert("Impossible de charger les candidatures : " + appsError.message);

function safeHtml(v){return esc(v || "");}
async function saveCompanyProfile(e){
  e.preventDefault(); const user=await currentUser(); if(!user)return renderAuth("login");
  const payload={company_name:$("companyName").value.trim(),company_logo_url:$("companyLogo").value.trim(),company_description:$("companyDescription").value.trim(),company_website:$("companyWebsite").value.trim(),company_phone:$("companyPhone").value.trim(),company_email:$("companyEmail").value.trim(),company_city:$("companyCity").value.trim(),company_country:$("companyCountry").value.trim()};
  const {error}=await supabase.rpc("update_company_profile",{p_company_name:payload.company_name,p_company_logo_url:payload.company_logo_url,p_company_description:payload.company_description,p_company_website:payload.company_website,p_company_phone:payload.company_phone,p_company_email:payload.company_email,p_company_city:payload.company_city,p_company_country:payload.company_country});
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
    return `<article class="employer-application-card" data-search="${esc([a.profile_snapshot?.full_name,a.profile_snapshot?.headline,a.jobs?.title,a.jobs?.city,a.jobs?.country].filter(Boolean).join(" "))}" data-status="${esc(current)}" data-job-id="${esc(a.jobs?.id || "")}" data-candidate-name="${esc(a.profile_snapshot?.full_name || "")}" data-job-title="${esc(a.jobs?.title || "")}" data-created-at="${esc(a.created_at || "")}" data-phone="${esc(a.phone || "")}" data-availability="${esc(a.availability || "")}">
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
        <div class="stat-card employer-inbox-stat"><span>📩</span><strong>${list.length}</strong><small>Candidatures reçues</small>${list.filter(a => (a.status || "En cours") === "En cours").length ? `<em>${list.filter(a => (a.status || "En cours") === "En cours").length} à traiter</em>` : ""}</div>
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
            <label>🔤 Code pays<input id="employerJobCountryCode" maxlength="2" placeholder="FR, DE, CA"></label>
            <label>📍 Ville<input id="employerJobCity" required maxlength="80"></label>
            <label>🏷️ Secteur<input id="employerJobType" required maxlength="80" placeholder="Hôtellerie, Logistique..."></label>
            <label>🕐 Contrat<input id="employerJobContract" required maxlength="80" value="Temps plein"></label>
            <label>🌐 Mode de travail<select id="employerJobRemoteType"><option value="onsite">Présentiel</option><option value="hybrid">Hybride</option><option value="remote">À distance</option></select></label>
            <label>💰 Salaire minimum<input id="employerJobSalaryMin" type="number" min="0" step="0.01" placeholder="Ex. 1800"></label>
            <label>💰 Salaire maximum<input id="employerJobSalaryMax" type="number" min="0" step="0.01" placeholder="Ex. 2600"></label>
            <label>💱 Devise<select id="employerJobSalaryCurrency"><option value="">Choisir</option><option>EUR</option><option>USD</option><option>GBP</option><option>CAD</option><option>AUD</option><option>CHF</option><option>AED</option><option>SAR</option><option>QAR</option><option>JPY</option><option>CNY</option><option>SEK</option><option>NOK</option><option>DKK</option><option>PLN</option><option>TRY</option><option>DZD</option></select></label>
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
          <button type="button" class="secondary-button" onclick="exportEmployerApplicationsCSV()">⬇️ Exporter CSV</button>
          <button type="button" class="secondary-button" onclick="resetEmployerApplicationFilters()">↺ Réinitialiser</button>
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

function exportEmployerApplicationsCSV() {
  const cards = [...document.querySelectorAll("#employerApplicationResults .employer-application-card")]
    .filter(card => !card.hidden);
  if (!cards.length) return alert("Aucune candidature à exporter.");

  const rows = cards.map(card => ({
    candidat: card.dataset.candidateName || card.querySelector(".employer-candidate-name")?.textContent?.trim() || "",
    offre: card.dataset.jobTitle || "",
    statut: card.dataset.status || "En cours",
    date: card.dataset.createdAt || "",
    telephone: card.dataset.phone || "",
    disponibilite: card.dataset.availability || ""
  }));

  const escCsv = value => '"' + String(value ?? "").replace(/"/g, '""') + '"';
  const header = ["Candidat","Offre","Statut","Date","Téléphone","Disponibilité"];
  const csv = "\ufeff" + [header, ...rows.map(r => Object.values(r))]
    .map(row => row.map(escCsv).join(";")).join("\r\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "candidatures-work-travel.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function resetEmployerApplicationFilters() {
  const search = $("employerApplicationSearch");
  const status = $("employerApplicationStatus");
  const job = $("employerApplicationJob");
  const sort = $("employerApplicationSort");
  if (search) search.value = "";
  if (status) status.value = "";
  if (job) job.value = "";
  if (sort) sort.value = "newest";
  sortEmployerApplications();
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
  const salaryMinRaw = $("employerJobSalaryMin")?.value.trim() || "";
  const salaryMaxRaw = $("employerJobSalaryMax")?.value.trim() || "";
  const payload = {
    title: $("employerJobTitle").value.trim(),
    country: $("employerJobCountry").value.trim(),
    country_code: (($("employerJobCountryCode")?.value.trim() || "").toUpperCase() || null),
    city: $("employerJobCity").value.trim(),
    type: $("employerJobType").value.trim(),
    contract: $("employerJobContract").value.trim(),
    remote_type: $("employerJobRemoteType")?.value || "onsite",
    salary_min: salaryMinRaw === "" ? null : Number(salaryMinRaw),
    salary_max: salaryMaxRaw === "" ? null : Number(salaryMaxRaw),
    salary_currency: $("employerJobSalaryCurrency")?.value || null,
    description: $("employerJobDescription").value.trim(),
    requirements: $("employerJobRequirements").value.trim()
  };
  if (!payload.title || !payload.country || !payload.city || !payload.type || !payload.contract || !payload.description || !payload.requirements) return alert("Veuillez compléter les champs obligatoires.");
  if (payload.country_code && !/^[A-Z]{2}$/.test(payload.country_code)) return alert("Le code pays doit contenir 2 lettres, par exemple FR ou CA.");
  if (payload.salary_min !== null && (!Number.isFinite(payload.salary_min) || payload.salary_min < 0)) return alert("Salaire minimum invalide.");
  if (payload.salary_max !== null && (!Number.isFinite(payload.salary_max) || payload.salary_max < 0)) return alert("Salaire maximum invalide.");
  if (payload.salary_min !== null && payload.salary_max !== null && payload.salary_max < payload.salary_min) return alert("Le salaire maximum doit être supérieur ou égal au salaire minimum.");
  if ((payload.salary_min !== null || payload.salary_max !== null) && !payload.salary_currency) return alert("Choisissez la devise du salaire.");
  const query = id
    ? supabase.from("jobs").update(payload).eq("id",id).eq("employer_id",user.id)
    : supabase.from("jobs").insert({...payload,employer_id:user.id});
  const {error} = await query;
  if (error) return alert("Impossible d'enregistrer l'offre : " + error.message);
  showNotification(id ? "Offre mise à jour." : "Offre publiée avec succès.", "success");
  await loadJobs();
  await renderEmployerDashboard();
}

async function editEmployerJob(id) {
  let job = jobs.find(j => Number(j.id) === Number(id));
  if (!job) {
    const user = await currentUser();
    if (!user) return renderAuth("login");
    const {data,error} = await supabase.from("jobs").select("id,title,country,city,type,contract,description,requirements,is_active").eq("id",id).eq("employer_id",user.id).maybeSingle();
    if (error || !data) return alert("Offre introuvable.");
    job = data;
  }
  $("employerJobId").value = job.id;
  $("employerJobTitle").value = job.title || "";
  $("employerJobCountry").value = job.country || "";
  $("employerJobCountryCode").value = job.country_code || "";
  $("employerJobCity").value = job.city || "";
  $("employerJobType").value = job.type || "";
  $("employerJobContract").value = job.contract || "";
  $("employerJobRemoteType").value = job.remote_type || "onsite";
  $("employerJobSalaryMin").value = job.salary_min ?? "";
  $("employerJobSalaryMax").value = job.salary_max ?? "";
  $("employerJobSalaryCurrency").value = job.salary_currency || "";
  $("employerJobDescription").value = job.description || "";
  $("employerJobRequirements").value = job.requirements || "";
  $("employerJobTitle").focus();
}

function resetEmployerJobForm() {
  const form = document.querySelector(".employer-job-form");
  if (form) form.reset();
  if ($("employerJobId")) $("employerJobId").value = "";
  if ($("employerJobContract")) $("employerJobContract").value = "Temps plein";
  if ($("employerJobCountryCode")) $("employerJobCountryCode").value = "";
  if ($("employerJobRemoteType")) $("employerJobRemoteType").value = "onsite";
  if ($("employerJobSalaryMin")) $("employerJobSalaryMin").value = "";
  if ($("employerJobSalaryMax")) $("employerJobSalaryMax").value = "";
  if ($("employerJobSalaryCurrency")) $("employerJobSalaryCurrency").value = "";
}

async function updateApplicationStatus(id, status) {
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const allowed = ["En cours", "Acceptée", "Refusée"];
  if (!allowed.includes(status)) return;

  const {data:app,error:loadError} = await supabase
    .from("applications")
    .select("id,status,jobs!inner(id,title,employer_id)")
    .eq("id",id)
    .eq("jobs.employer_id",user.id)
    .maybeSingle();

  if (loadError || !app) return alert("Candidature introuvable ou accès non autorisé.");
  if ((app.status || "En cours") === status) return;

  const {error} = await supabase
    .from("applications")
    .update({status})
    .eq("id",id);

  if (error) return alert("Impossible de modifier le statut : " + error.message);

  showNotification("Candidature mise à jour : " + status + ".", "success");
  await renderEmployerDashboard();
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
  const {data:profile}=await supabase.from("profiles").select("is_admin,full_name").eq("id",user.id).maybeSingle();
  if(!profile||!profile.is_admin)return renderDashboard();
  const [{data:rows,error},{count:users},{count:employers},{count:candidates},{count:jobs},{count:activeJobs},{count:applications},{count:pendingApplications}]=await Promise.all([
    supabase.from("employer_requests").select("id,user_id,company_name,contact_phone,website,message,status,created_at").order("created_at",{ascending:false}),
    supabase.from("profiles").select("id",{count:"exact",head:true}),
    supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","employer"),
    supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","candidate"),
    supabase.from("jobs").select("id",{count:"exact",head:true}),
    supabase.from("jobs").select("id",{count:"exact",head:true}).eq("is_active",true),
    supabase.from("applications").select("id",{count:"exact",head:true}),
    supabase.from("applications").select("id",{count:"exact",head:true}).eq("status","En cours")
  ]);
  if(error)return alert("Impossible de charger les demandes : "+error.message);
  const list=rows||[], pending=list.filter(x=>x.status==="pending").length, approved=list.filter(x=>x.status==="approved").length;
  const cards=list.map(r=>'<article class="admin-request-card '+(r.status==="pending"?'admin-request-pending':'')+'"><div class="admin-request-head"><div><span class="eyebrow">DEMANDE #'+r.id+'</span><h3>'+esc(r.company_name)+'</h3><p>'+esc(r.contact_phone||"Téléphone non renseigné")+' · '+esc(r.website||"Site non renseigné")+'</p><small>'+new Date(r.created_at).toLocaleDateString("fr-FR")+'</small></div><span class="status-badge">'+esc(r.status)+'</span></div><p class="admin-request-message">'+esc(r.message||"Aucun message.")+'</p>'+ (r.status==="pending" ? '<div class="admin-request-actions"><button type="button" onclick="reviewEmployerRequest('+r.id+',\'approved\')">✅ Approuver</button><button type="button" class="danger-button" onclick="reviewEmployerRequest('+r.id+',\'rejected\')">❌ Refuser</button></div>' : '<p class="small-note">Cette demande a déjà été traitée.</p>') +'</article>').join("");
  $("account").innerHTML='<div class="account-card dashboard admin-dashboard"><div class="dashboard-header"><div class="account-identity"><span class="eyebrow">ADMINISTRATION</span><h2>🛡️ Centre de contrôle</h2><p class="account-email">Bienvenue '+esc(profile.full_name||user.email)+' · gestion de Work Travel</p></div><div class="account-actions"><button onclick="renderAdminPanel()">↻ Actualiser</button><button class="back-button" onclick="logout()">Se déconnecter</button></div></div><div class="dashboard-stats"><div class="stat-card"><span>👥</span><strong>'+(users||0)+'</strong><small>Utilisateurs</small></div><div class="stat-card"><span>🏢</span><strong>'+(employers||0)+'</strong><small>Entreprises</small></div><div class="stat-card"><span>👤</span><strong>'+(candidates||0)+'</strong><small>Candidats</small></div><div class="stat-card"><span>💼</span><strong>'+(activeJobs||0)+'</strong><small>Offres actives</small><em>'+(jobs||0)+' au total</em></div><div class="stat-card"><span>📩</span><strong>'+(applications||0)+'</strong><small>Candidatures</small><em>'+(pendingApplications||0)+' à traiter</em></div><div class="stat-card"><span>🟡</span><strong>'+pending+'</strong><small>Demandes en attente</small></div></div><section class="admin-requests"><div class="panel-heading"><div><span class="eyebrow">REVUE ENTREPRISES</span><h3>Demandes reçues</h3><p class="small-note">'+pending+' en attente · '+approved+' approuvées · '+list.filter(x=>x.status==="rejected").length+' refusées</p></div></div>'+ (cards || '<p class="small-note">Aucune demande.</p>') +'</section></div>';
}
async function reviewEmployerRequest(id,status){
  const user=await currentUser(); if(!user||!["approved","rejected"].includes(status))return;
  if(!confirm(status==="approved"?"Approuver cette entreprise ?":"Refuser cette demande ?"))return;
  const {error}=await supabase.rpc("review_employer_request",{request_id:id,review_status:status});
  if(error)return alert("Impossible de traiter la demande : "+error.message);
  showNotification(status==="approved"?"Entreprise approuvée et compte employeur activé.":"Demande refusée.","success");
  await renderAdminPanel();
}

async function renderDashboard() {
  const user = await currentUser();
  if (!user) return renderAuth("login");
  const [{data:profile}, {data:apps, error}] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,headline,bio,skills,languages,experience,education,cv_path,role,is_admin").eq("id",user.id).maybeSingle(),
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
  const notifications = await buildUserNotifications(apps);
  const profileCompletion = getProfileCompletion(profile, name !== "Candidat" ? name : "");
  const latestApps = (apps || []).slice(0, 5);
  $("account").innerHTML = `
    <div class="account-card dashboard">
      <div class="dashboard-header">
        <div class="account-identity"><span class="eyebrow">TABLEAU DE BORD</span><h2>👋 Bonjour ${esc(name)}</h2><p class="account-email">✉️ ${esc(user.email)}</p></div>
        <div class="account-actions"><button class="refresh-button" onclick="renderDashboard()">↻ Actualiser</button><button class="back-button" onclick="logout()">Se déconnecter</button></div>
      </div>
      <div class="dashboard-welcome"><div><strong>Votre espace candidat</strong><p>Suivez vos candidatures, préparez votre départ et gardez votre profil prêt pour les prochaines opportunités.</p></div><div class="completion"><div><span>Profil complété</span><strong>${profileCompletion}%</strong></div><div class="progress-track"><span style="width:${profileCompletion}%"></span></div><small>${profileCompletion === 100 ? "Profil prêt pour postuler." : "Ajoutez votre nom et votre CV pour compléter votre profil."}</small></div></div>
      <div class="dashboard-notifications">
  <div class="panel-heading">
    <div>
      <span class="eyebrow">NOTIFICATIONS</span>
      <h3>🔔 Nouveautés</h3>
    </div>
    <span class="notification-count">${notifications.filter(n => !n.is_read).length}</span>
    ${notifications.some(n => !n.is_read) ? '<button type="button" class="link-button notification-read-all" onclick="markAllNotificationsRead()">✓ Tout marquer comme lu</button>' : ""}
  </div>

  ${
    notifications.length
      ? notifications.map(n => {
          const isDbNotification = Number.isFinite(Number(n.id));
          const isRead = isDbNotification ? Boolean(n.is_read) : false;
          const key = isDbNotification ? "db:" + n.id : notificationKey(n);
          const title = n.title || n.jobs?.title || "Votre candidature";
          const message = n.message || notificationMessage(n);
          const icon =
            n.status === "Acceptée" ||
            String(n.title || "").toLowerCase().includes("accept")
              ? "🟢"
              : "🔔";

          return '<div class="notification-row' +
            (isRead ? ' is-read' : '') +
            '">' +
            '<span>' + icon + '</span>' +
            '<div><strong>' + esc(title) + '</strong>' +
            '<p>' + esc(message) + '</p></div>' +
            (isRead
              ? '<span class="notification-read-state">Lu</span>'
              : '<button type="button" onclick="markNotificationRead(\'' + key + '\')">✓ Lu</button>') +
            '</div>';
        }).join("")
      : '<p class="small-note">Aucune notification.</p>'
  }
</div>
      <div class="dashboard-stats">
        <button class="stat-card" onclick="document.querySelector('.dashboard-history')?.scrollIntoView({behavior:'smooth'})"><span>📩</span><strong>${totalApps}</strong><small>Candidatures</small></button>
        <button class="stat-card" onclick="document.querySelector('.dashboard-history')?.scrollIntoView({behavior:'smooth'})"><span>🟡</span><strong>${pending}</strong><small>En cours</small></button>
        <button class="stat-card" onclick="document.querySelector('.dashboard-history')?.scrollIntoView({behavior:'smooth'})"><span>🟢</span><strong>${accepted}</strong><small>Acceptées</small></button>
        <button class="stat-card" onclick="document.getElementById('offres')?.scrollIntoView({behavior:'smooth'})"><span>⭐</span><strong>${favoriteCount}</strong><small>Favoris</small></button>
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
            <div class="application-history-head"><div><strong>${esc(a.jobs?.title || "Offre")}</strong><span>📍 ${esc(a.jobs?.city || "")}, ${esc(a.jobs?.country || "")}</span></div><div class="application-history-status"><span class="status-badge status-${(a.status || "En cours").toLowerCase().replace(/\s+/g,"-")}">${esc(applicationStatusLabel(a.status))}</span><small>${a.status === "Acceptée" ? "Le recruteur a accepté votre candidature." : a.status === "Refusée" ? "Le recruteur a refusé votre candidature." : "Votre candidature est toujours en cours de traitement."}</small></div></div>
            <div class="application-history-grid"><div><small>📅 Envoyée le</small><strong>${new Date(a.created_at).toLocaleDateString("fr-FR")}</strong></div><div><small>🕐 Disponibilité</small><strong>${esc(a.availability || "Non précisée")}</strong></div><div><small>📱 Téléphone</small><strong>${esc(a.phone || a.profile_snapshot?.phone || "Non précisé")}</strong></div><div><small>📄 CV</small>${a.cv_path ? `<button type="button" class="cv-link" onclick="openApplicationCV('${esc(a.cv_path)}')">Ouvrir ${esc(a.cv_name || "le CV")}</button>` : "<strong>Non joint</strong>"}</div></div>
            ${a.status === "En cours" ? `<div class="application-history-actions"><button type="button" class="secondary-button" onclick="withdrawApplication(${Number(a.id)})">↩ Retirer la candidature</button></div>` : ""}
            <div class="application-history-section"><small>👤 Profil envoyé</small><div class="profile-snapshot-line"><strong>${esc(a.profile_snapshot?.full_name || "Candidat")}</strong>${a.profile_snapshot?.headline ? `<span>${esc(a.profile_snapshot.headline)}</span>` : ""}</div>${(a.profile_snapshot?.skills || []).length ? `<div class="preview-tags">${a.profile_snapshot.skills.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}</div>
            <div class="application-history-section"><small>✍️ Lettre de motivation</small><p class="application-cover-letter">${esc(a.cover_letter || "Aucune lettre enregistrée.")}</p></div>
          </article>`).join("") : '<p class="small-note">Aucune candidature pour le moment. Découvrez les offres disponibles.</p>'}      </div>
    </div>`;
  $("cvFile").addEventListener("change", saveCV);
}

async function withdrawApplication(id) {
  const user = await currentUser();
  if (!user) return renderAuth('login');
  if (!confirm('Retirer cette candidature ? Cette action est définitive.')) return;
  const {data:app,error:loadError} = await supabase.from('applications').select('id,status,cv_path').eq('id',id).eq('user_id',user.id).maybeSingle();
  if (loadError || !app) return alert('Candidature introuvable ou accès non autorisé.');
  if ((app.status || 'En cours') !== 'En cours') return alert('Cette candidature ne peut plus être retirée car son statut a déjà été traité.');
  const {error} = await supabase.from('applications').delete().eq('id',id).eq('user_id',user.id);
  if (error) return alert('Impossible de retirer la candidature : ' + error.message);
  if (app.cv_path) await supabase.storage.from('cvs').remove([app.cv_path]);
  showNotification('Candidature retirée.', 'success');
  await renderDashboard();
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
  const { error: updateError } = await supabase.rpc("update_own_cv_path",{p_cv_path:null});
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
  const {data:previousProfile,error:loadError} = await supabase.from("profiles").select("cv_path").eq("id",user.id).maybeSingle();
  if (loadError) return alert("Impossible de vérifier votre CV actuel : " + loadError.message);
  const {error:uploadError} = await supabase.storage.from("cvs").upload(path,file,{upsert:false,contentType:file.type});
  if (uploadError) return alert("Échec du téléchargement : " + uploadError.message);
  const {error:profileError} = await supabase.rpc("update_own_cv_path",{p_cv_path:path});
  if (profileError) {
    await supabase.storage.from("cvs").remove([path]);
    return alert("CV envoyé mais profil non mis à jour : " + profileError.message);
  }
  if (previousProfile?.cv_path && previousProfile.cv_path !== path) {
    await supabase.storage.from("cvs").remove([previousProfile.cv_path]);
  }
  $("cvStatus").innerHTML = `CV enregistré : ${esc(file.name)} <button type="button" class="cv-link" onclick="openCV()">📄 Ouvrir mon CV</button>`;
  showNotification("CV enregistré avec succès.","success");
}

async function logout() {
  await supabase.auth.signOut();
  renderAuth("login", "Vous êtes déconnecté.");
}

async function searchJobs(saveHistory = false) {
  const raw = $("search").value.trim();
  const t = raw.toLowerCase(), c = $("countryFilter").value, ty = $("typeFilter").value;
  const remote = $("remoteFilter")?.value || "", currency = $("currencyFilter")?.value || "";
  const words = t.split(/\s+/).filter(Boolean);
  const list = jobs.filter(j => {
    const haystack = [j.title,j.country,j.city,j.type,j.contract,j.description,j.requirements].join(" ").toLowerCase();
    const matchesText = !words.length || words.every(word => haystack.includes(word));
    return matchesText && (!c || j.country === c) && (!ty || j.type === ty) && (!remote || j.remote_type === remote) && (!currency || j.salary_currency === currency) && (!favoritesOnly || isFavorite(j.id));
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
  $("search").value = ""; $("countryFilter").value = ""; $("typeFilter").value = ""; if ($("remoteFilter")) $("remoteFilter").value = ""; if ($("currencyFilter")) $("currencyFilter").value = ""; favoritesOnly = false; if ($("favoritesFilter")) $("favoritesFilter").classList.remove("active"); displayJobs(jobs);
  $("offres").scrollIntoView({behavior:"smooth"});
}

async function loadJobs() {
  const {data,error} = await supabase.from("jobs").select("*").order("id");
  if (error) {
    $("jobs").innerHTML = '<div class="empty-state"><h3>Impossible de charger les offres</h3><p>Vérifiez la connexion à la base de données.</p></div>';
    return;
  }
  const rawJobs = (data || []).filter(job => job.is_active !== false);
  const employerIds = [...new Set(rawJobs.map(job => job.employer_id).filter(Boolean))];
  const viewer = await currentUser();
  const companyProfiles = viewer
    ? await Promise.all(employerIds.map(async employerId => {
        const {data:company} = await supabase.rpc("get_company_public_profile", {company_user_id: employerId});
        return [employerId, company || null];
      }))
    : [];
  const companyMap = new Map(companyProfiles);
  jobs = rawJobs.map(job => ({...job, profiles: companyMap.get(job.employer_id) || null}));
  await populateFilters();
  renderPreferences();
  displayJobs();
  await renderEmployerRequestPanel();
  renderSearchHistory();
}

window.forgotPassword=forgotPassword; window.renderPasswordRecovery=renderPasswordRecovery; window.exportEmployerApplicationsCSV=exportEmployerApplicationsCSV; window.resetEmployerApplicationFilters=resetEmployerApplicationFilters; window.focusEmployerApplications=focusEmployerApplications; window.toggleEmployerJob=toggleEmployerJob; window.filterEmployerApplications=filterEmployerApplications; window.sortEmployerApplications=sortEmployerApplications; window.renderDashboard=renderDashboard; window.markNotificationRead=markNotificationRead; window.showJob=showJob; window.savePreferences=savePreferences; window.saveEmployerJob=saveEmployerJob; window.editEmployerJob=editEmployerJob; window.resetEmployerJobForm=resetEmployerJobForm; window.deleteEmployerJob=deleteEmployerJob; window.jobMatchScore=jobMatchScore; window.saveSearchHistory=saveSearchHistory; window.useSearchHistory=useSearchHistory; window.clearSearchHistory=clearSearchHistory; window.showNotification=showNotification; window.openApplicationForm=openApplicationForm; window.applyJob=applyJob; window.updateTravelGuide=updateTravelGuide; window.toggleTravelItem=toggleTravelItem; window.clearTravelChecklist=clearTravelChecklist; window.openAccount=openAccount; window.renderAuth=renderAuth; window.logout=logout; window.resetView=resetView; window.searchJobs=searchJobs; window.openCV=openCV; window.deleteCV=deleteCV; window.toggleFavorite=toggleFavorite; window.toggleFavoritesOnly=toggleFavoritesOnly; window.clearFavorites=clearFavorites; window.updateProfileName=updateProfileName; window.saveCandidateProfile=saveCandidateProfile; window.openApplicationCV=openApplicationCV; window.renderEmployerDashboard=renderEmployerDashboard; window.saveCompanyProfile=saveCompanyProfile; window.renderAdminPanel=renderAdminPanel; window.reviewEmployerRequest=reviewEmployerRequest; window.renderEmployerRequestPanel=renderEmployerRequestPanel; window.showEmployerRequestForm=showEmployerRequestForm; window.showCompanyProfile=showCompanyProfile; window.submitEmployerRequest=submitEmployerRequest; window.renderEmployerRequestPanel=renderEmployerRequestPanel; window.showEmployerRequestForm=showEmployerRequestForm; window.submitEmployerRequest=submitEmployerRequest; window.updateApplicationStatus=updateApplicationStatus; window.markAllNotificationsRead=markAllNotificationsRead; window.withdrawApplication=withdrawApplication;

document.addEventListener("DOMContentLoaded", async () => {
  applyLanguage();
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") return renderPasswordRecovery();
    if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) return renderDashboard();
    if (!session && event === "SIGNED_OUT") renderAuth("login");
  });
  await loadJobs();
  const user = await currentUser();
  if (user) await renderDashboard();
});

function openExternalJobSearch(country) {
  const query = (document.getElementById("externalSearchQuery")?.value || document.getElementById("search")?.value || "").trim();
  const location = (document.getElementById("externalSearchLocation")?.value || "").trim();
  const q = encodeURIComponent(query);
  const loc = encodeURIComponent(location);
  const countryMap = {Belgique:"be",France:"fr",Espagne:"es",Allemagne:"de"};
  let url = "";
  if (country === "EURES") {
    url = "https://europa.eu/eures/portal/jv-se/search?page=1&resultsPerPage=25&orderBy=BEST_MATCH";
    if (query) url += "&keywordsEverywhere=" + q;
    const code = countryMap[document.getElementById("countryFilter")?.value] || "";
    if (code) url += "&locationCodes=" + code;
    url += "&lang=en";
  } else if (country === "France") {
    url = "https://candidat.francetravail.fr/offres/recherche?offresPartenaires=false";
    if (query) url += "&libMetier=" + q;
  } else if (country === "Allemagne") {
    url = "https://www.arbeitsagentur.de/jobsuche/suche?angebotsart=1&suchbereich=jobs";
    if (query) url += "&was=" + q;
    if (location) url += "&wo=" + loc;
  } else if (country === "Belgique") {
    const belgiumSearch = [query, location].filter(Boolean).join(" ");
    const slug = belgiumSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    url = slug ? "https://www.vdab.be/vindeenjob/jobs/" + slug : "https://www.vdab.be/vindeenjob/search.aspx";
  } else if (country === "Espagne") {
    const search = [query, location].filter(Boolean).join(" ").trim();
    url = search
      ? "https://empleate.gob.es/empleo/?search=#/buscarOferta?search=" + encodeURIComponent(search)
      : "https://empleate.gob.es/empleo/#/buscarOferta";
  } else if (country === "LinkedIn") {
    url = "https://www.linkedin.com/jobs/search-jobs-worldwide";
    const params = [];
    if (query) params.push("keywords=" + q);
    if (location) params.push("location=" + loc);
    if (params.length) url += "?" + params.join("&");
  } else if (country === "Indeed") {
    url = "https://www.indeed.com/jobs";
    const params = [];
    if (query) params.push("q=" + q);
    if (location) params.push("l=" + loc);
    if (params.length) url += "?" + params.join("&");
    else url = "https://www.indeed.com/worldwide";
  } else if (country === "UN") {
    url = "https://careers.un.org/";
  }
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
window.openExternalJobSearch = openExternalJobSearch;

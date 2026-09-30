# Work Travel

Plateforme web de recherche d'emploi et de préparation au départ en Europe.

## Fonctionnalités
- Recherche et filtrage des offres d'emploi.
- Comptes candidats et employeurs.
- Profil candidat avec CV PDF/DOC/DOCX.
- Candidatures avec lettre de motivation, disponibilité et suivi de statut.
- Espace employeur pour gérer les offres et les candidatures.
- Demandes de compte employeur avec validation administrateur.
- Notifications liées aux candidatures et aux demandes employeur.
- Favoris, historique de recherche et préférences de recherche.
- Checklist de préparation au voyage par destination.

## Stack
- Frontend : HTML, CSS et JavaScript ES modules.
- Backend : Supabase Auth, PostgreSQL, RLS, RPC et Storage.
- Hébergement frontend : tout hébergeur statique compatible avec les modules ES.

## Configuration
La configuration Supabase utilisée par le frontend se trouve dans `supabase-config.js`. Elle contient uniquement la clé publishable destinée au navigateur.

Le backend doit conserver les protections Supabase suivantes :
- Les changements de rôle et de privilèges administrateur ne sont pas modifiables depuis le client.
- Les mises à jour du profil entreprise passent par le RPC `update_company_profile`.
- La mise à jour du chemin CV passe par le RPC `update_own_cv_path`.
- Les candidatures et les offres sont protégées par les politiques RLS.
- Les CV sont stockés dans le bucket privé `cvs`.

## Développement
Le projet est une application statique : ouvrir `index.html` via un serveur HTTP local ou déployer les fichiers du dépôt sur un hébergeur statique.

Avant une mise en production, effectuer un test navigateur complet des parcours candidat, employeur et administrateur.
## Release checklist

- Automated validation workflow is configured in GitHub Actions.
- JavaScript syntax is checked with Node.js.
- Frontend consistency validation checks required assets, duplicate HTML IDs, local references, inline handlers, external `_blank` links, responsive viewport support, and reduced-motion support.
- Supabase credentials in the frontend are limited to the publishable key; service-role credentials must never be committed.
- Final release still requires a real browser smoke test covering authentication, candidate application flow, employer workflow, admin review, notifications, CV upload/download, and mobile layouts.

# Systeme de reservation de gites (Node.js + Express + Stripe)

Application modulaire pour :
- gerer les disponibilites et tarifs des gites,
- afficher un calendrier interactif,
- creer des reservations automatisees,
- lancer un paiement Stripe Checkout,
- generer des contrats personnalises depuis un template,
- envoyer des emails automatiques (pre-reservation et confirmation).

## 1) Installation

```bash
npm install
cp .env.example .env
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## 2) Architecture

```text
gite-booking-system/
  public/                # Frontend HTML/CSS/JS (calendrier + formulaires)
  src/config/            # Variables d'environnement
  src/data/              # Stockage en memoire (a remplacer par DB en prod)
  src/routes/            # Endpoints API Express
  src/services/          # Logique metier (pricing, Stripe, email, contrats)
  templates/             # Template de contrat
  server.js              # Point d'entree Express
```

## 3) Endpoints principaux

- `POST /api/availability` : definir disponibilite et tarif d'une plage de dates
- `GET /api/availability` : recuperer calendrier d'un gite (`giteId`, `startDate`, `endDate`)
- `POST /api/bookings` : creer une reservation, calculer total, generer contrat, creer session Stripe
- `POST /api/payments/webhook` : webhook Stripe pour confirmer le paiement
- `GET /api/contracts/:bookingId` : afficher le contrat HTML genere

## 3.1) Pages UI (mode unique gite)

- Page publique (locataire) : `/`
  - selectionnez vos dates en cliquant sur une date de depart puis une date de fin
  - le systeme affiche `Oui/Non` selon la disponibilite
  - puis “Reserver et payer” cree la reservation + lance Stripe
- Page hote (admin) : `/host`
  - protegee via une page de login + cookie HttpOnly (auth serveur)
  - selectionnez une plage (depart/fin), renseignez `Prix/nuit` et `Disponible (oui/non)`, puis “Appliquer”

## 4) Integration Stripe (etapes claires)

1. Creer un compte Stripe et recuperer `STRIPE_SECRET_KEY`.
2. Ajouter `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` dans `.env`.
3. Exposer le serveur local pour le webhook :
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```
4. Copier le secret `whsec_...` fourni par Stripe CLI dans `STRIPE_WEBHOOK_SECRET`.
5. Tester un paiement :
   - creer des disponibilites,
   - creer une reservation depuis l'interface,
   - suivre l'URL Checkout,
   - verifier que le webhook passe la reservation en `paid`.

Note : sans `STRIPE_SECRET_KEY`, le projet fonctionne en mode mock (URL de paiement locale).

## 5) Generation automatique des contrats

- Le template se trouve dans `templates/contract-template.html`.
- Les variables `{{bookingId}}`, `{{tenantName}}`, `{{startDate}}`, `{{total}}`, etc. sont remplacees automatiquement par `contractService`.
- Le contrat est stocke dans la reservation et consultable via `GET /api/contracts/:bookingId`.

## 6) Emails automatises

- Configurer SMTP dans `.env`.
- Si SMTP n'est pas configure, le service passe en mode `dry-run` (log console, pas d'erreur bloquante).
- Par defaut, si SMTP est configure mais echoue (ex: DNS, credentials), l'envoi email ne bloque pas la creation de reservation.
- Pour bloquer en cas d'erreur (mode strict), definir `EMAIL_STRICT=true` dans `.env`.
- Emails envoyes :
  - creation de pre-reservation (lien de paiement),
  - confirmation apres webhook `checkout.session.completed`.

## 7) Conformite paiements et aspects legaux (checklist)

- Utiliser HTTPS en production (obligatoire pour la securite des paiements).
- Ne jamais stocker les donnees carte : Stripe Checkout gere la saisie PCI.
- Conserver journaux de transaction (`bookingId`, `paymentIntentId`, horodatages).
- Fournir CGV, politique d'annulation, mentions legales, RGPD, et consentement client.
- Ajouter numerotation contractuelle, signature electronique si necessaire, et archivage conforme.

## 8) Passage en production recommande

- Remplacer `src/data/store.js` par une base SQL (PostgreSQL/MySQL).
- Ajouter authentification admin pour la gestion des disponibilites.
- Ajouter validation avancee (ex: zod/joi) et tests (unitaires + integration webhook).
- Mettre en place idempotence webhook (eviter double traitement d'un meme event Stripe).

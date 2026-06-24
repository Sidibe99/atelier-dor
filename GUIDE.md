# Atelier d'Or — Guide de déploiement

Ce dossier est un projet web complet, prêt à être mis en ligne **gratuitement** sur GitHub Pages,
puis branché plus tard sur ton propre domaine via Cloudflare.

Tu n'as **pas besoin d'installer quoi que ce soit sur ton ordinateur** : GitHub construit le site tout seul.

---

## Étape 1 — Créer un compte et un dépôt GitHub

1. Crée un compte gratuit sur https://github.com (si tu n'en as pas).
2. Clique sur **New repository** (Nouveau dépôt).
   - Nom : `atelier-dor` (tu peux choisir un autre nom).
   - Visibilité : **Public** (Pages est gratuit en public).
   - Ne coche rien d'autre, puis **Create repository**.

## Étape 2 — Envoyer les fichiers du projet

Le plus simple, sans logiciel :

1. Sur la page du dépôt vide, clique **uploading an existing file** (ou **Add file > Upload files**).
2. Glisse **tout le contenu de ce dossier** (`package.json`, `vite.config.js`, `index.html`,
   le dossier `src/`, le dossier `public/`, et le dossier `.github/`).
   - ⚠️ Le dossier `.github` est important (il contient l'automatisation). S'il n'apparaît pas
     quand tu glisses, c'est que ton système cache les dossiers commençant par un point :
     tu peux alors créer le fichier à la main sur GitHub (**Add file > Create new file**),
     nommer le chemin `.github/workflows/deploy.yml` et y coller le contenu du fichier fourni.
3. En bas, clique **Commit changes**.

> Astuce : si tu connais Git, tu peux aussi faire `git init`, `git add .`,
> `git commit -m "premier dépôt"`, puis pousser sur la branche `main`.

## Étape 3 — Activer GitHub Pages

1. Dans le dépôt : **Settings** (Réglages) > **Pages** (menu de gauche).
2. Sous **Build and deployment > Source**, choisis **GitHub Actions**.
3. C'est tout. À chaque envoi de fichiers, le site se reconstruit automatiquement.

Va dans l'onglet **Actions** : tu verras le déploiement tourner (1–2 minutes).
Quand c'est vert ✅, ton site est en ligne à :

```
https://TON-PSEUDO.github.io/atelier-dor/
```

(Remplace `TON-PSEUDO` par ton nom d'utilisateur GitHub.)

---

## Étape 4 — Personnaliser AVANT de revendre

Ouvre `src/AtelierDor.jsx` (sur GitHub : clique le fichier puis l'icône crayon ✏️) et change,
tout en haut, ces deux valeurs **secrètes** :

```js
const LIC_SECRET = "ATELIERDOR-K7-2026";   // → mets ta propre phrase secrète
const MASTER_PW   = "admin2026";            // → mets ton propre mot de passe éditeur
```

Plus bas, l'objet `FORMULAS` contient tes **tarifs et limites** (Essai, Standard, Pro, Premium) :
ajuste les prix (`priceLabel`), le nombre d'admins (`admins`) et d'utilisateurs (`users`),
et les durées (`days`) à ta convenance.

Après chaque modification, **Commit changes** : le site se met à jour tout seul.

> Espace éditeur (pour générer les codes clients) : ajoute `#admin-create` à la fin de l'adresse,
> par ex. `https://TON-PSEUDO.github.io/atelier-dor/#admin-create`, puis entre ton mot de passe maître.

---

## Étape 5 — Brancher ton propre domaine (via Cloudflare)

À faire quand tu es satisfait du site.

### 5a. Acheter le domaine
- Sur Cloudflare : **Registrar > Register domains** (prix coûtant, souvent le moins cher).
  Ou achète ailleurs (Namecheap, etc.) puis ajoute le domaine à Cloudflare (**Add a site**).

### 5b. Déclarer le domaine côté GitHub
1. Dépôt > **Settings > Pages > Custom domain** : saisis ton domaine
   (ex. `atelierdor.sn` ou `app.atelierdor.sn`) puis **Save**.
   → GitHub ajoute automatiquement un fichier `CNAME` dans le dépôt. Ne le supprime pas.

### 5c. Configurer le DNS dans Cloudflare
Dans Cloudflare > **DNS > Records**, ajoute selon ton choix :

- **Sous-domaine** (recommandé, ex. `app.atelierdor.sn`) :
  - Type `CNAME`, Name `app`, Target `TON-PSEUDO.github.io`, Proxy **activé (orange)**.

- **Domaine racine** (ex. `atelierdor.sn`) :
  - Type `CNAME`, Name `@`, Target `TON-PSEUDO.github.io` (Cloudflare gère la racine via CNAME flattening),
    Proxy **activé**.
  - (Alternative sans Cloudflare : 4 enregistrements `A` vers les IP de GitHub Pages
    `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.)

### 5d. HTTPS
- Côté GitHub Pages : coche **Enforce HTTPS** (peut prendre quelques minutes à s'activer).
- Côté Cloudflare : **SSL/TLS > Overview > Full**.

Compte ~10 à 30 minutes de propagation. Ensuite ton appli est sur ton domaine, en HTTPS, gratuitement.

---

## Étape 6 — Tester sur un vrai téléphone

- Ouvre l'adresse sur Android/iPhone.
- Vérifie : connexion (identifiant + mot de passe), le **cours de l'or en direct**
  (il s'affiche une fois en ligne — les sources `gold-api.com` et `open.er-api.com` répondent
  depuis un vrai site), l'**impression d'un reçu**, et le **partage WhatsApp**.
- Astuce « appli » : sur le téléphone, menu du navigateur > **Ajouter à l'écran d'accueil**
  pour une icône comme une vraie application.

---

## Comment ça marche (rappel honnête)

- **Stockage** : les données sont enregistrées **dans le navigateur de l'appareil** (localStorage).
  Chaque téléphone a donc ses propres données. Pour transférer, utilise **Sauvegarde > Exporter / Importer**
  dans l'app (onglet Cours de l'or).
- **Cours en direct** : récupéré côté navigateur depuis des API publiques gratuites. Si elles sont
  momentanément indisponibles, tu peux toujours saisir le cours et le taux à la main.
- **Licences** : codes signés et vérifiés **hors-ligne**. Solide pour la revente, mais l'anti-partage
  strict et la révocation à distance nécessiteraient un serveur (étape ultérieure possible).

Bon déploiement !

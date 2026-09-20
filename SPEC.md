# NOVA STRIKE 2.0 — Spec d'amélioration

> Jeu : arène FPS néon, navigateur, three.js (fichier local, zéro réseau au runtime).
> Prod actuelle : https://meteorsd.github.io/nova-strike/ (v1, commit `c8d3e67`)
> Cible : v2 « profondeur de jeu + confort », livrée et testée en ligne.

## 1. Objectif

La v1 est jouable mais plate : 1 seule arme, ennemis tous au corps-à-corps, aucune
récompense intermédiaire, aucun réglage, pas de mobile. La v2 vise trois choses :

1. **Profondeur** — décisions intéressantes en jeu (choix d'arme, gestion des pickups,
   esquive des projectiles, positionnement derrière les couverts, enchaînement de kills).
2. **Lisibilité** — le joueur comprend instantanément ce qui se passe (radar, dégâts
   flottants, combo, feed de kills, barre de dash).
3. **Confort d'accès** — réglages persistants (sensibilité, FOV, volume, qualité) et
   contrôles tactiles utilisables sur téléphone.

Contrainte non négociable : **aucune régression** sur ce qui marche déjà (boucle de
vagues, surchauffe, score/record, pause, son synthétisé, aucune erreur JS).

## 2. Périmètre fonctionnel

### 2.1 Arsenal — 3 armes commutables (`1` `2` `3`, molette, boutons en mobile)

| # | Arme | Dégâts | Cadence | Chaleur/tir | Comportement |
|---|------|-------:|--------:|------------:|--------------|
| 1 | **PULSE** (SMG) | 12 | 9 tirs/s | 9.5 | hitscan précis, arme par défaut |
| 2 | **SCATTER** (shotgun) | 6 × 9 | ~1.6 tirs/s | 26 | cône de 6 projectiles, dévastateur à courte portée |
| 3 | **RAIL** (railgun) | 55 | ~0.8 tirs/s | 34 | **perce** : touche tous les ennemis alignés, portée illimitée |

- La chaleur est **partagée** : enchaîner les tirs de RAIL surchauffe plus vite. En
  surchauffe, aucune arme ne tire et la chaleur redescend (comportement v1 conservé).
- Chaque arme a son viewmodel (taille/couleur/lueur) et son son propre.
- Le HUD affiche les 3 slots, l'arme active surlignée.

### 2.2 Ennemis — 5 archétypes + boss

| Type | PV | Vitesse | Comportement |
|------|---:|--------:|--------------|
| **drone** | 20 | 3.1 | corps-à-corps, trajectoire directe (v1) |
| **sprinter** | 12 | 5.3 | corps-à-corps, zigzag rapide (v1) |
| **brute** | 55 | 1.9 | corps-à-corps, encaisse, frappe fort (v1) |
| **spitter** | 26 | 1.6 | **tire** des projectiles plasma à 12–18 unités, garde ses distances |
| **boss** | 380 + 40/vague | 1.5 | toutes les 5 vagues : énorme, tire des salves, invoque des drones |

- Projectiles ennemis : sphères lumineuses, 14 dmg, détruites si elles touchent un
  couvert, vitesse 9 u/s. Elles doivent être **esquivables** (télégraphe visuel).
- Apparition progressive : spitter dès la vague 2, brute dès la 3, sprinter dès la 5,
  boss aux vagues 5, 10, 15…

### 2.3 Pickups

- **Soin** (+30 PV) et **Cellule** (−45 chaleur) : lâchés par les ennemis (≈18 % de
  chance) et 1 soin garanti par vague à une position aléatoire.
- Ramassage par proximité (< 1.6 u). Icône tournante, halo, pop sonore, disparition
  après 20 s. Refusés si inutiles (PV pleins / chaleur basse) → le pickup reste au sol.

### 2.4 Combo / enchaînement

- Un kill dans les **3 s** après le précédent prolonge la chaîne.
- Multiplicateur = `min(1 + floor(chain/3), 5)` appliqué au score du kill.
- Affichage HUD : `×N` coloré + jauge qui se vide. Le meilleur combo est conservé
  pour l'écran de fin.

### 2.5 Dash

- `Espace` (ou bouton mobile) : impulsion à 26 u/s pendant 0.18 s, **cooldown 2.2 s**.
- Barre HUD dédiée. Pendant le dash, le joueur ne peut pas tirer (choix tactique).
- Le dash traverse les projectiles sans collision ? **Non** — il sert à esquiver, la
  fenêtre d'invulnérabilité reste nulle (pas de gratuité).

### 2.6 Couverts / obstacles

- **8 blocs** d'acier néon répartis dans l'arène (2 tailles : 1.4×1.4 h2.4 et 2.6×1.2 h3.2).
- **Collision joueur** : glissement le long des faces (pas de blocage sec).
- **Collision projectiles ennemis** : un projectile qui touche un bloc est absorbé.
- **Collision tir joueur** : un hitscan s'arrête sur le bloc s'il est devant l'ennemi
  (l'IA ennemie cherche à se rapprocher en contournant grossièrement).
- Les couverts apparaissent sur le radar.

### 2.7 Radar

- Canvas 2D en haut à droite, 150 px : arène entière (vue fixe), joueur (flèche
  orientée selon le yaw), ennemis (points colorés par type), boss (plus gros),
  pickups (croix), couverts (rectangles).
- Vue « arène complète » plutôt que radar tournant : l'arène ne fait que 44 unités,
  tout tient à l'écran — plus lisible qu'un radar centré sur le joueur.

### 2.8 Feedback de combat

- **Dégâts flottants** : nombres qui montent et s'estompent au point d'impact.
- **Hit marker** au viseur (existe en v1) + variante « kill marker » (croix rouge).
- **Feed de kills** : `DRONE ×3` empilé en haut à gauche, s'efface après 3 s.
- Secousse de caméra proportionnelle au tir et aux dégâts reçus.

### 2.9 Réglages + stats

- Menu réglages accessible depuis l'écran de démarrage et la pause :
  - sensibilité souris (0.5–3.0, défaut 1.0)
  - FOV (65–100, défaut 75)
  - volume général (0–100, défaut 70)
  - qualité (Basse / Moyenne / Haute → pixelRatio 0.75 / 1.0 / min(dpr,2))
  - mode d'affichage du radar (ON/OFF)
  - réinitialiser le record
- Tout est persisté en `localStorage` (`novaStrikeSettings`).
- Écran de fin enrichi : score, vague, **kills**, **précision %**, **meilleur combo**,
  **temps survécu**, record.

### 2.10 Contrôles tactiles (mobile)

- Détection automatique `pointer:coarse` ou `ontouchstart`, avec bascule manuelle.
- **Stick virtuel gauche** : déplacement (deadzone 12 %, sprint si poussé à fond).
- **Glissement droit** : visée (sensibilité ×1.6 sur mobile).
- Boutons : **TIRER** (maintenu = tir auto), **DASH**, armes 1/2/3.
- Overlays non bloquants (`touch-action: none`), pas de scroll parasite.

## 3. Hors périmètre (assumé)

- Pas de multijoueur, pas de sauvegarde de progression, pas de nouvelles cartes.
- Pas de modèles 3D externes (contrainte : un seul fichier vendor `three.module.min.js`).
- Pas de musique (le son reste entièrement synthétisé, comme en v1).

## 4. Critères d'acceptation

| # | Critère | Vérification |
|---|---------|--------------|
| A1 | 3 armes commutables, dégâts/comportements distincts | test headless : le RAIL traverse 2 ennemis alignés |
| A2 | 5 types d'ennemis + boss aux vagues 5/10 | test : spawn forcé de chaque type, boss a > 400 PV |
| A3 | Projectiles ennemis esquivables et absorbés par les couverts | test : projectile bloqué par un bloc, dégâts au joueur sinon |
| A4 | Soin et cellule ramassables, refusés si inutiles | test : PV 40 → pickup → 70 ; PV 100 → pickup non consommé |
| A5 | Combo ×5 max, remis à zéro après 3 s sans kill | test : 9 kills rapides → ×4, attente → ×1 |
| A6 | Dash avec cooldown réel | test : position avance, second dash refusé pendant le CD |
| A7 | Collision joueur avec les couverts (glissement) | test : marche frontale 2 s → position bornée par le bloc |
| A8 | Radar dessine ennemis/pickups/couverts | test : pixels non vides sur le canvas radar + comptage d'entités |
| A9 | Réglages persistés et appliqués (FOV, sensibilité, qualité) | test : set FOV 90 → camera.fov === 90 après reload |
| A10 | Écran de fin expose kills/précision/combo/temps | test : DOM renseigné après game over |
| A11 | Contrôles tactiles fonctionnels (joystick → déplacement) | test : émulation tactile → position change |
| A12 | Zéro erreur JS, zéro requête réseau externe manquante | test : `pageerror` + `requestfailed` vides |
| A13 | Site en ligne à jour (HTTP 200, contenu v2) | `curl` prod après déploiement |
| A14 | Pas de régression v1 (vagues, surchauffe, pause, record) | tests de la suite v1 rejoués |

## 5. Plan de test (réel, pas déclaratif)

1. **Harnais puppeteer** (chromium + SwiftShader, `--enable-unsafe-swiftshader`) :
   - sert le jeu en HTTP local (`python3 -m http.server 8099`) puis teste la prod ;
   - appelle les hooks `window.__NOVA_STRIKE__` (étendus en v2) pour chaque critère ;
   - capture `pageerror` et `requestfailed`.
2. **Tests par critère** : un test = un critère d'acceptation, assertion binaire.
3. **Vérif de mise en page** (`mobile-check.js`) : rectangles du HUD et des commandes
   tactiles mesurés (`getBoundingClientRect`) sur 5 viewports — chevauchement,
   hors-écran et cibles tactiles < 40 px détectés automatiquement.
4. **Captures d'écran** : écran de démarrage, gameplay dense (boss + spitter + pickups),
   vue mobile — vérifiées à l'œil (rendu non noir, HUD lisible).
5. **Déploiement** : commit + push `main`, puis `curl` de la prod et re-run du test live.

## 6. Livrables

- `index.html` — HUD v2, radar, réglages, contrôles tactiles.
- `game.js` — moteur v2 (armes, ennemis, projectiles, pickups, combo, dash, couverts).
- `SPEC.md` — ce document.
- `README.md` — commandes et fonctionnalités mises à jour.
- Hooks de test `window.__NOVA_STRIKE__` étendus (documentés en fin de `game.js`).

## 7. Résultats (mesurés)

| Vérification | Résultat |
|---|---|
| `test-v2.js` — critères A1→A14, en local **et sur la prod** | **40/40** tests passés, **0** erreur JS, **0** requête échouée |
| `live-check.js` — partie réelle de 18 s sur la prod (hooks, ennemis, radar, CSS déployé) | **7/7** |
| `mobile-check.js` — 390×844, 820×1180, 1366×768, 1920×1080, 2560×1080 | **0** chevauchement, **0** hors-écran, **0** cible tactile < 40 px |
| Rendu (captures desktop + mobile) | 3D non noir, HUD lisible, radar et commandes tactiles dégagés |
| Bugs trouvés et corrigés pendant les tests | 1) un railgun touchait 2× le même ennemi (face avant + arrière) ; 2) le HUD mobile chevauchait les commandes tactiles ; 3) les tirs traversaient les murs de l'arène ; 4) le boss était inoffensif au corps-à-corps ; 5) boutons du HUD translucides donc illisibles sur une scène claire |

Livré sur `main` (GitHub Pages) : commits `78d7ad7` → `ed075a8` → `84158d7`.
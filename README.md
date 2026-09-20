# NOVA STRIKE

Arène de combat néon — jeu de tir 3D à la première personne, jouable directement dans le navigateur (three.js, aucune dépendance externe au runtime).

## Jouer
https://meteorsd.github.io/nova-strike/

## Commandes (clavier / souris)
| Touche | Action |
|---|---|
| WASD | se déplacer |
| Souris | viser (clic pour verrouiller le pointeur) |
| Clic gauche | tirer (maintenu = tir auto) |
| Maj | sprint |
| Espace | **dash** (esquive, cooldown 2,2 s) |
| 1 / 2 / 3 ou molette | changer d'arme (PULSE / SCATTER / RAIL) |
| Échap | pause (+ menu réglages) |
| M | son on/off |

## Commandes (mobile)
- **Joystick** en bas à gauche : déplacement (poussé à fond = sprint)
- **Glisser** sur la moitié droite de l'écran : visée
- **TIRER** : tir (maintenu = tir auto) · **DASH** : esquive · **1/2/3** : armes

## Contenu de jeu (v2)
- **3 armes** partageant la même jauge de chaleur : PULSE (SMG précise), SCATTER (6 projectiles, courte portée), RAIL (perce tous les ennemis alignés).
- **5 types d'ennemis** : drone, sprinter, brute, **spitter** (tire des projectiles plasma), et un **boss « SENTINELLE »** toutes les 5 vagues (salves + invocation de drones).
- **Pickups** : soin (+30 PV) et cellule (−45 chaleur), lâchés par les ennemis + 1 soin garanti par vague.
- **Combo** : kills enchaînés en < 3 s → multiplicateur jusqu'à ×5 sur le score.
- **Couverts** : 8 blocs dans l'arène qui bloquent joueur, tirs et projectiles.
- **Radar** : arène complète, joueur orienté, ennemis par type, pickups, couverts.
- **Feedback** : dégâts flottants, hit/kill marker, feed de kills, secousse de caméra, sons synthétisés.
- **Réglages persistants** : sensibilité, FOV, volume, qualité de rendu, radar on/off, bascule tactile, reset du record.
- **Écran de fin** : score, vague, kills, précision, meilleur combo, temps survécu, record.

## Fichiers
- `index.html` — page + HUD + overlays (démarrage, pause, fin, réglages, contrôles tactiles)
- `game.js` — moteur du jeu (module ES, importe `three.module.min.js` en local)
- `three.module.min.js` — vendor three.js (aucun CDN au runtime)
- `SPEC.md` — spec d'amélioration v2 + critères d'acceptation + résultats de test

## Tests
```bash
python3 -m http.server 8099            # depuis ce dossier
node ../nova-strike-test/test-v2.js http://localhost:8099/    # 40 tests (critères A1→A14)
node ../nova-strike-test/mobile-check.js http://localhost:8099/ 390x844   # mise en page mobile
```

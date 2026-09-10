# Conventions du dépôt (pour les contributeurs et les assistants de code)

## Commandes

- `npm run dev` — développement ; `npm run check` — types ; `npm run build` — build complet (échoue si un frontmatter est invalide).
- Toujours lancer `npm run build` avant de pousser du contenu : la validation Zod et Starlight y est stricte.

## Où vit quoi

- Configuration éditoriale (nom, URL, navigation, catégories, niveaux) : `src/data/site.ts`. Ne pas dupliquer ces listes ailleurs.
- Contenu : `src/content/` (voir README pour les schémas). Une fiche docs va dans `src/content/docs/docs/<categorie>/`.
- Composants réutilisables : `src/components/`. Surcharges Starlight uniquement dans `src/components/starlight/`.
- Styles : jetons et prose dans `src/styles/global.css`, habillage Starlight dans `src/styles/starlight.css`. Pas de couleurs en dur dans les composants : utiliser les classes `text-fg`, `bg-bg-elev`, `border-line`, `text-hue`, etc.

## Écrire une fiche docs

1. Créer `src/content/docs/docs/<categorie>/<slug>.md` avec un slug en minuscules, sans accents, mots séparés par des tirets.
2. Frontmatter complet (voir README). `tested_on` uniquement si la procédure a réellement été déroulée sur cet environnement.
3. Structure : accroche (contexte + pourquoi) → `## Prérequis` → étapes en `##` → `## Pour aller plus loin`. Pas de `#` dans le corps.
4. Encadrés `:::note` / `:::tip` / `:::caution` / `:::danger` pour les pièges. Blocs de code avec langage.
5. Liens internes en chemins absolus (`/docs/reseau/ma-fiche/`).

## Style éditorial

- Français, vouvoiement dans les docs, première personne dans le blog et le lab.
- Direct, pédagogue, le « pourquoi » avant la consigne, humour sec autorisé, pas de marketing, pas de lorem ipsum.
- Dater et versionner : une procédure sans `tested_on` ni version est suspecte.

## Confidentialité (site public)

Interdit dans le contenu : noms de personnes (collègues, clients, interlocuteurs), nom de l'employeur et ses domaines, adresses IP réelles
(utiliser 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 ou des plages privées d'exemple), noms d'hôtes internes réels,
montants, numéros de dossier, secrets. Les noms de produits et d'éditeurs sont autorisés.

## Checklist avant de pousser

- [ ] `npm run build` passe.
- [ ] Le frontmatter respecte le schéma (catégorie = dossier, niveau valide, date ≤ aujourd'hui).
- [ ] Aucune donnée confidentielle (voir ci-dessus).
- [ ] Les liens internes pointent vers des pages existantes.

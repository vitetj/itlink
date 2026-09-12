---
title: "Explorateur Windows lent et fichiers Office qui mettent dix secondes à s'ouvrir"
description: "Deux lenteurs qu'on confond tout le temps : l'Accès rapide qui interroge des chemins morts, et Office qui inspecte chaque fichier venu du réseau. Les régler sans tout désactiver."
published: 2025-04-22
category: microsoft
tags: [windows, explorateur, office, excel, mode-protege, performance]
level: débutant
status: à jour
featured: false
sidebar:
  label: "Explorateur lent et fichiers Office"
---

« C'est lent. » C'est le ticket le plus fréquent et le plus vague qui soit. Quand on prend le temps de
regarder, il se cache presque toujours deux problèmes différents derrière ce mot, et on gagne beaucoup à les
séparer dès le début.

Le premier : l'Explorateur de fichiers met plusieurs secondes à afficher son contenu, parfois avant même qu'on
ait cliqué quelque part. Le second : le dossier s'ouvre normalement, mais un classeur Excel ou un document
Word posé sur un partage réseau reste dix secondes sur un écran blanc avant de s'afficher. Deux symptômes,
deux causes, deux réglages. Les traiter ensemble fait perdre du temps à tout le monde.

## Cause n° 1 : l'Accès rapide interroge des chemins qui ne répondent plus

Par défaut, l'Explorateur s'ouvre sur l'Accès rapide (appelé **Accueil** sur Windows 11). Cette page affiche
vos dossiers fréquents et vos fichiers récents. Pour la construire, Windows relit une liste d'emplacements
mémorisés — et il les relit *tous*, y compris ceux qui ne sont plus joignables : un lecteur réseau démonté, un
partage accessible seulement en VPN, une clé USB rendue depuis six mois, un dossier d'un serveur
décommissionné.

Chaque chemin mort coûte un délai d'attente réseau. Mettez-en cinq ou six dans la liste et vous obtenez
exactement ce que décrit l'utilisateur : l'Explorateur qui « rame » à l'ouverture, sans rien faire de visible.

### Ouvrir l'Explorateur sur « Ce PC »

1. Dans l'Explorateur, ouvrez les options de dossier : sur Windows 10, **Affichage > Options > Modifier les
   options des dossiers et de recherche** ; sur Windows 11, le bouton **…** de la barre d'outils, puis
   **Options**.
2. Onglet **Général**, champ **Ouvrir l'Explorateur de fichiers dans** : choisissez **Ce PC**.
3. Dans la section **Confidentialité**, décochez les deux cases (afficher les fichiers récemment utilisés,
   afficher les dossiers fréquemment utilisés).
4. Cliquez sur **Effacer** en face de « Effacer l'historique de l'Explorateur de fichiers ».
5. Validez, puis fermez et rouvrez une fenêtre d'Explorateur.

### Vider aussi les listes de raccourcis

L'historique des applications est stocké ailleurs, dans deux dossiers que l'étape précédente ne nettoie pas
toujours. Ce sont eux qui alimentent les « documents récents » du clic droit sur une icône de la barre des
tâches, et ils contiennent souvent les chemins fantômes les plus coûteux.

Fermez les applications Office, puis :

```powershell title="Purger les listes de documents récents"
Remove-Item "$env:APPDATA\Microsoft\Windows\Recent\AutomaticDestinations\*" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:APPDATA\Microsoft\Windows\Recent\CustomDestinations\*" -Force -ErrorAction SilentlyContinue
```

Vous perdez la liste des documents récents, rien d'autre : aucun fichier réel n'est touché. Prévenez
l'utilisateur, c'est le genre de détail qui génère un second ticket.

:::tip
Sur un parc, ces réglages se poussent par stratégie de groupe (configuration utilisateur, modèles
d'administration, menu Démarrer et barre des tâches) plutôt que poste par poste. Si vos utilisateurs
travaillent sur des serveurs de bureaux à distance partagés, c'est même indispensable : un seul profil avec
une liste pourrie ralentit sa session à chaque ouverture.
:::

## Cause n° 2 : Office inspecte chaque fichier venu d'ailleurs

Ici, l'Explorateur va bien. C'est Office qui prend son temps, et il a de bonnes raisons : un fichier
téléchargé, reçu par mail ou posé sur un partage porte une marque d'origine. Word et Excel la lisent et
appliquent une série de contrôles avant d'afficher quoi que ce soit — affichage protégé, vérification des
liens et des connexions de données, contrôle des macros et des contrôles ActiveX. Sur un fichier lourd, ou
quand le partage répond lentement, ces contrôles s'additionnent en secondes d'attente.

Tout se règle au même endroit : **Fichier > Options > Centre de gestion de la confidentialité > Paramètres du
Centre de gestion de la confidentialité**. Et là commence le vrai sujet, parce que la tentation est de tout
décocher.

:::danger
Ces contrôles ne sont pas là pour vous embêter. L'affichage protégé et le blocage des macros sont la dernière
barrière entre un utilisateur et une pièce jointe piégée. Tout désactiver pour gagner huit secondes, c'est
troquer un inconfort contre un incident de sécurité. Faites le réglage ciblé décrit ci-dessous.
:::

### Le bon réglage : déclarer vos partages internes comme emplacements approuvés

C'est la manipulation qui règle 90 % des cas, sans abaisser la protection sur le reste du monde. Dans
**Emplacements approuvés** :

1. Cochez **Autoriser les emplacements approuvés sur mon réseau**.
2. **Ajouter un nouvel emplacement**, saisissez le chemin UNC du partage, par exemple
   `\\fichiers.example.com\projets`.
3. Cochez **Les sous-dossiers de cet emplacement sont également approuvés**.

Un fichier ouvert depuis un emplacement approuvé contourne l'affichage protégé, ouvre ses connexions de
données et exécute ses macros sans poser de question. Les fichiers venus d'Internet ou d'une pièce jointe,
eux, restent contrôlés. C'est exactement le comportement recherché.

### Les autres réglages, et ce qu'ils coûtent

| Réglage | Où | Effet | Mon avis |
|---|---|---|---|
| Affichage protégé | Affichage protégé | Trois cases : Internet, emplacements dangereux, pièces jointes Outlook | Ne décochez jamais Internet ni Outlook. La troisième devient inutile si vous avez déclaré vos partages |
| Documents approuvés | Documents approuvés | « Autoriser les documents approuvés sur le réseau » évite de redemander à chaque ouverture | À activer, sans risque supplémentaire réel |
| Connexions de données | Contenu externe | Requêtes vers une base ou un autre classeur | À laisser sur « demander », et approuver via l'emplacement approuvé |
| Contrôles ActiveX | Paramètres ActiveX | Anciens formulaires métier | À n'activer que dans un emplacement approuvé |
| Macros | Paramètres des macros | VBA | « Désactiver avec notification », ou macros signées. Jamais « activer toutes les macros » |

Le fil conducteur : plutôt que d'assouplir un réglage global, désignez l'endroit de confiance. Une seule
décision à documenter, réversible, et qui ne suit pas le fichier quand il part par mail.

## Ce qui ressemble à une lenteur Office mais n'en est pas

Avant de toucher au Centre de gestion de la confidentialité, éliminez ces classiques :

- **L'imprimante par défaut n'existe plus.** Word et Excel interrogent le pilote de l'imprimante par défaut au
  démarrage pour calculer la mise en page. Si elle pointe vers une file supprimée ou un poste éteint, chaque
  ouverture attend le délai d'expiration. Basculez la valeur par défaut sur une imprimante joignable et
  mesurez de nouveau.
- **L'antivirus analyse le fichier à chaque ouverture** depuis le réseau. Regardez les exclusions recommandées
  par l'éditeur avant de conclure.
- **La résolution de noms est lente.** Si le poste met du temps à joindre le serveur de fichiers lui-même, le
  problème est en amont d'Office.
- **OneDrive en fichiers à la demande.** Un fichier non synchronisé se télécharge à l'ouverture. Ça ne se voit
  pas dans l'Explorateur, ça se voit à l'ouverture.

Le réflexe qui fait gagner le plus de temps : ouvrir le même fichier copié en local. S'il s'ouvre
instantanément, le problème est le trajet, pas Office.

## Pour aller plus loin

- [DNS interne cassé par un client VPN ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/),
  quand le partage lui-même répond mal.
- [Fiches d'hygiène numérique pour les utilisateurs](/docs/cybersecurite/fiches-dhygiene-numerique-pour-les-utilisateurs/),
  pour expliquer l'affichage protégé au lieu de le désactiver.
- [Déployer Microsoft 365 Apps avec WAPT](/docs/automatisation/deployer-microsoft-365-apps-avec-wapt/),
  pour appliquer ces réglages à l'installation plutôt qu'à la main.

<!-- source : procédures internes « Explorateur lent » et « Excel ouverture de fichiers », export du centre de documentation -->

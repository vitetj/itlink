---
title: "Un PC modulaire et réparable en entreprise : la grille de décision"
description: "Réparable, modulaire, argument RSE : un poste modulaire coche des cases séduisantes. Reste à savoir s'il tient dans un parc géré. Les critères, la méthode de calcul et les limites à vérifier avant de généraliser."
published: 2026-07-02
category: dsi
tags: [poste-de-travail, achats, obsolescence, rse, industrie, materiel]
level: intermédiaire
status: à jour
featured: false
sidebar:
  label: "Un PC modulaire et réparable en…"
---

Fin juin, une collègue m'écrit une phrase que j'entends deux fois par an : « c'est fou, cette obsolescence si rapide ». Ce jour-là, elle tombait mal : je venais de conclure qu'il fallait racheter une infrastructure serveur parce que le matériel en place, parfaitement fonctionnel, sortait du périmètre de support de son constructeur. Alors j'ai fait ce que je fais quand une remarque m'agace : j'ai regardé si on pouvait y répondre autrement, et j'ai monté un dossier sur les postes de travail modulaires et réparables.

Le résultat n'est pas « oui » ni « non ». C'est une grille. Elle est reproductible, et elle marche pour n'importe quel matériel qui promet la réparabilité, pas seulement pour la marque à la mode. Ce qui suit est la trame que j'ai envoyée aux achats.

## Prérequis

Avant de comparer quoi que ce soit, il faut trois choses. Si vous n'en avez aucune, la grille produira du vent.

- **Un inventaire réel des composants récupérables** sur les postes sortants : format et génération de la mémoire, format et interface des disques. « On récupérera la RAM » n'est pas une hypothèse tant que quelqu'un n'a pas ouvert trois machines pour vérifier.
- **La liste de vos usages atypiques** : postes d'atelier, liaisons série vers les automates, cartes d'acquisition, lecteurs de badges. C'est là que la modularité se paie ou se rentabilise.
- **Le mode de déploiement** : image maître, gestionnaire de paquets, jonction au domaine, chiffrement du disque. Un poste qui ne rentre pas dans cette chaîne coûte du temps humain à chaque livraison, et ce temps ne figure sur aucun devis.

## Poser les critères avant les prix

Un dossier d'achat qui commence par un tableau de prix se termine toujours par le moins cher. Commencez par les critères, notez chaque option, et regardez le prix ensuite.

| Critère | La question à poser | Signal d'alerte |
| --- | --- | --- |
| Réparabilité réelle | Quelles pièces sont remplaçables sans démontage complet, et lesquelles sont soudées ? | Une seule pièce « remplaçable » est en réalité un sous-ensemble complet |
| Disponibilité des pièces | Quel délai d'approvisionnement annoncé, sur quelle durée après la fin de commercialisation ? | Aucun engagement écrit sur la durée |
| Support et garantie | Que devient la garantie si c'est vous qui remplacez la pièce ? Intervention sur site ou retour atelier ? | Le contrat suppose que personne n'ouvre la machine |
| Intégration au parc | Gestion du firmware, enrôlement, chiffrement, image maître : tout passe-t-il comme sur un poste du catalogue ? | Il faut une procédure d'exception « juste pour ces machines-là » |
| Homogénéité | Combien de configurations différentes allez-vous devoir supporter ? | Chaque poste devient un cas particulier |
| Usages métier spécifiques | La modularité résout-elle un besoin que vous financez déjà autrement ? | Réponse « non », auquel cas c'est un achat de conviction |

La dernière ligne est celle qui décide, et j'y reviens plus bas.

## Faire le calcul sans se raconter d'histoires

Le piège classique du dossier « matériel durable » est de comparer un prix d'achat à un prix d'achat. Ça donne toujours le même résultat : la machine réparable est plus chère en configuration préassemblée, point final, dossier refusé.

Le calcul honnête compare **ce que vous décaissez réellement**, pour une machine complète et déployée. Trois options méritent une colonne :

1. Le poste standard de votre catalogue actuel, préassemblé.
2. Le poste modulaire préassemblé par son constructeur.
3. Le poste modulaire en version à assembler, garni de la mémoire et du disque récupérés sur les machines sortantes.

:::note[Les valeurs ci-dessous sont inventées]
Elles sont exprimées en base 100, le poste standard valant 100. Elles servent uniquement à montrer d'où vient l'écart. Remplacez-les par vos devis : les vôtres seront différents, et c'est tout l'intérêt de refaire le tableau.
:::

| Poste de coût | Standard | Modulaire préassemblé | Modulaire à assembler |
| --- | --- | --- | --- |
| Châssis, carte, processeur | 100 | 115 | 95 |
| Mémoire | incluse | incluse | 0 (récupérée) |
| Disque | inclus | inclus | 0 (récupéré) |
| Licence système | incluse | incluse | 0 (couverte par l'abonnement) |
| Main-d'œuvre d'assemblage | 0 | 0 | à valoriser |
| **Total indicatif** | **100** | **115** | **95 + main-d'œuvre** |

Deux lignes font tout le travail, et ce sont les deux plus contestables.

La mémoire et le disque à zéro supposent que les composants récupérés sont compatibles **et** en bon état. Vérifiez le format, la génération, et l'usure des disques : un disque sorti d'un poste de cinq ans qu'on remet en service pour cinq ans de plus n'est pas une économie, c'est une panne différée.

La licence système à zéro suppose que votre abonnement bureautique couvre déjà le droit d'usage du système d'exploitation d'entreprise. C'est le cas de beaucoup d'abonnements, mais la plupart de ces droits sont des **mises à niveau** qui exigent une licence sous-jacente sur la machine. Faites confirmer par écrit par votre revendeur avant d'inscrire un zéro dans une colonne.

:::caution[Le marché des composants bouge plus vite que votre dossier]
Sur la période où j'ai monté cette analyse, les prix de la mémoire et du stockage étaient très volatils. Un business case bâti sur « la RAM ne coûte rien » se périme en un trimestre. Datez vos hypothèses et prévoyez de refaire le calcul avant de généraliser.
:::

## L'argument métier qui change le dossier

Tant qu'on reste sur le coût, la machine modulaire gagne de peu ou perd de peu, selon le cours de la mémoire. Ce n'est pas une décision, c'est un match nul.

Ce qui a fait basculer mon analyse est ailleurs : la baie de ports d'extension est modulaire et sa documentation mécanique est ouverte. Nous avons une imprimante 3D et un atelier câblage en interne. Nous avons aussi, dans les ateliers, des postes qui doivent parler en liaison série à des automates, et pour lesquels on achète depuis des années des adaptateurs USB-série, qu'on rachète, qu'on perd, et dont le pilote change de comportement à chaque grande mise à jour.

Avec un poste dont on peut concevoir soi-même un module de port, cet achat récurrent devient une pièce interne, imprimée et câblée chez nous, au format exact de la machine, qui ne se débranche pas et ne se perd pas dans un tiroir. Voilà la ligne qui mérite d'être défendue devant les achats : pas « c'est réparable », mais **« ça supprime une dépense récurrente et un motif d'incident récurrent »**.

Le corollaire vaut pour votre propre dossier : si vous n'avez aucun usage de ce type, le poste modulaire reste un achat de conviction. Ce n'est pas illégitime, mais il faut l'assumer comme tel devant la direction financière plutôt que de le déguiser en économie.

## L'argument RSE, à sa juste place

Remplacer la pièce en panne plutôt que mettre la machine au rebut est un vrai argument, et il est valorisable dans une notation extra-financière ou une réponse à appel d'offres qui vous interroge sur vos pratiques.

Deux précautions. D'abord, c'est un argument **qui se démontre** : il faut pouvoir dire combien de pièces vous avez effectivement remplacées, donc tenir le compte. Ensuite, ne le mettez jamais en premier dans le dossier. Un argument environnemental placé en tête fait lire le reste comme une justification ; placé en dernier, il fait office de bonus sur une décision déjà solide.

## La méthode : un poste, un an

C'est la conclusion que j'ai proposée, et elle vaut pour toute évaluation de matériel en parc géré.

1. **Acheter un seul poste**, attribué au service informatique comme machine de test et d'usage quotidien. Une machine qu'on utilise vraiment révèle en trois semaines ce qu'aucune fiche technique ne dit.
2. **Réattribuer le poste libéré** à un utilisateur, pour que l'opération ne soit pas une dépense sèche.
3. **Dérouler la chaîne complète** : image maître, jonction au domaine, chiffrement, gestion du firmware, déploiement applicatif. Noter chaque exception nécessaire.
4. **Fabriquer et tester le module métier** si c'est lui qui justifie le dossier. Tant qu'il n'existe pas, il ne compte pas.
5. **Se donner un an** avant de généraliser, et rouvrir le tableau à ce moment-là avec les prix du moment et les incidents réellement constatés.

Un an, c'est long pour une décision d'achat. C'est exactement la bonne durée pour une décision de parc : c'est le temps qu'il faut pour qu'une machine casse au moins une fois et que vous découvriez ce que vaut vraiment la promesse de réparabilité.

## Pour aller plus loin

- [Copieur : location ou achat ? Faire le calcul de coût total](/docs/dsi/copieur-location-ou-achat-calcul-tco/) : la même mécanique de tableau, appliquée à un contrat plutôt qu'à une machine.
- [Construire le dossier de décision d'un projet réseau](/docs/dsi/construire-le-dossier-de-decision-dun-projet-reseau/) : options chiffrées puis recommandation, la structure qui fait passer un arbitrage.
- [Segmenter les réseaux des machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/) : le contexte atelier dans lequel ces postes finissent par vivre.

<!-- source : mails « obsolescence et alternative modulaire », analyse envoyée aux achats, 2026-06-26 -->

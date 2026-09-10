---
title: "Facturation électronique : comprendre UBL, Factur-X et CII avant de choisir"
description: "Les trois formats du socle français ne se valent pas dès qu'une facture passe une frontière. Ce que fait PEPPOL, pourquoi Factur-X s'arrête à Strasbourg, et les questions à poser par écrit à votre éditeur."
published: 2025-10-16
category: architecture
tags: [facturation-electronique, ubl, factur-x, peppol, dematerialisation, edi]
level: intermédiaire
status: à jour
featured: false
sidebar:
  label: "Facturation électronique"
---

Le service comptable prépare le passage à la facturation électronique. L'éditeur pressenti pose sa question dès la
première démo, sur le ton de la formalité administrative : « vous partez sur quel format ? ». Et comme
l'administration en accepte trois et laisse le choix libre, tout le monde comprend « ça n'a pas d'importance ».

Ça en a. J'ai écrit cette note à titre de pense-bête avant une démo éditeur, et je la reprends ici parce que le
raisonnement vaut pour n'importe quelle PME qui exporte. Le format d'une facture, ce n'est pas une case à cocher
dans un paramétrage : c'est la langue dans laquelle vous allez parler à vos clients pendant dix ans. Le réseau qui
la transporte, c'est la poste. Vous pouvez changer de poste ; changer de langue, c'est un projet.

## Les trois formats du socle

L'administration française accepte trois formats. Ils portent tous la même sémantique — le modèle européen de
facture, normalisé par l'EN 16931, qui décrit ce qu'est un numéro de facture, une ligne, une TVA. Ce qui change,
c'est la syntaxe, c'est-à-dire la façon d'écrire cette sémantique dans un fichier.

| Format | Ce que c'est | Lisible par un humain | Aire de diffusion réelle |
| --- | --- | --- | --- |
| **Factur-X** | Un PDF qui contient un XML CII caché à l'intérieur | Oui, c'est un PDF | France et Allemagne (ZUGFeRD) |
| **CII** | XML pur (UN/CEFACT, *Cross Industry Invoice*) | Non | International, gros donneurs d'ordre |
| **UBL** | XML pur (OASIS, *Universal Business Language*) | Non | Standard international, socle de PEPPOL |

Factur-X est séduisant parce qu'il ressemble à ce qu'on connaît : on ouvre le fichier, on voit une facture. Le
comptable est rassuré, le fournisseur artisan aussi. C'est un vrai avantage, et c'est aussi le piège, parce que
c'est le seul des trois dont l'aire de diffusion s'arrête à une frontière.

## Ce que le choix change vraiment : la frontière

UBL est le standard international. C'est celui qu'utilisent déjà la majorité des pays européens, et surtout c'est
celui que reconnaît **PEPPOL**, le réseau qui interconnecte les plateformes nationales. Conséquence très concrète :
une facture UBL envoyée à un client étranger est reconnue automatiquement et réceptionnée par la plateforme de son
pays. Vous n'avez rien à négocier, rien à convertir, personne à appeler.

Factur-X n'est pas reconnu hors de France et d'Allemagne. Les grands groupes internationaux, eux, échangent en UBL
ou en CII, jamais en Factur-X. Si vous facturez à l'export, choisir Factur-X par défaut revient à écrire vos
factures dans une langue que votre client ne parle pas, et à espérer que quelqu'un traduise en chemin.

Il faut aussi se souvenir d'où l'on part. L'Italie, l'Espagne, la Belgique, les Pays-Bas et les pays scandinaves
sont passés à la facture électronique obligatoire il y a des années. La France est l'un des derniers grands pays à
se moderniser sur ce point. Autrement dit : vos clients étrangers sont déjà 100 % numériques et attendent que vous
vous mettiez à leur norme, pas l'inverse.

:::caution[« Format libre » ne veut pas dire « sans conséquence »]
Le choix est libre au sens réglementaire : l'administration acceptera vos factures dans les trois cas. Elle ne
garantit pas que votre client les acceptera. La liberté porte sur la conformité, pas sur l'interopérabilité.
:::

## L'arbitrage que j'ai retenu

Pour une PME industrielle qui exporte, la règle tient en deux lignes :

- **UBL pour l'international et l'Europe.** C'est le format qui passe les frontières sans intervention humaine.
- **Factur-X pour les petits artisans nationaux**, quand le destinataire n'a pas de système comptable capable de
  lire du XML et qu'un PDF lisible lui rend un vrai service.

C'est un arbitrage, pas un dogme. Le point important est qu'il soit posé consciemment, écrit, et présenté à la
direction avec l'argument commercial et pas seulement technique : le format conditionne la capacité à facturer un
grand compte étranger sans passer par une saisie manuelle chez lui.

## Ce que la réforme attend, et ce que je ne vous dirai pas

Deux choses sont stables : les trois formats du socle, et l'obligation de passer par une plateforme agréée par la
DGFiP — une PDP — pour émettre et recevoir. Tout le reste, à commencer par le calendrier, a déjà été décalé
plusieurs fois. Je ne vais donc pas vous donner de dates : une page de blog vieillit mal, et vous prendriez le
risque de planifier un projet sur mon article plutôt que sur `impots.gouv.fr`. Allez lire le calendrier à la
source, le jour où vous cadrez le projet.

En revanche, ce qui ne bougera pas, c'est que vous devrez **recevoir** autant qu'**émettre**. La plupart des
démos éditeurs se concentrent sur l'émission, parce que c'est ce qui impressionne. La réception, c'est là que vous
allez récupérer du CII d'un donneur d'ordre allemand, de l'UBL d'un espagnol et du Factur-X d'un artisan du coin,
tout ça dans la même journée.

## Poser la question à son éditeur, par écrit

La démo ne suffit pas. Voici les questions que j'envoie, dans un mail, avant de signer. Elles ont l'air naïves ;
c'est exactement pour ça qu'elles marchent.

1. **Quels formats gérez-vous en émission, et quels formats gérez-vous en réception ?** Les deux listes sont
   rarement identiques, et personne ne le dit spontanément.
2. **Êtes-vous vous-même une PDP agréée, ou passez-vous par une PDP tierce ?** Si c'est une tierce, laquelle, et
   qu'est-ce qui se passe pour moi le jour où vous en changez ?
3. **Êtes-vous raccordé à PEPPOL, et via quel point d'accès ?** Sans ce raccordement, la promesse
   « international » est un discours commercial.
4. **Que faites-vous d'une facture entrante dans un format que je n'ai pas choisi ?** Conversion automatique ?
   Rejet ? Et qu'est-ce qui se perd à la conversion ?
5. **Où placez-vous mes références métier ?** Numéro de commande client, référence affaire, numéro d'ordre de
   fabrication : ces champs existent dans la norme, mais tous les éditeurs ne les remplissent pas, et ce sont eux
   qui permettent le rapprochement automatique côté client.
6. **Comment je récupère mes factures si je pars ?** Format d'export, délai, coût. La réversibilité se négocie
   avant la signature, jamais après.

:::tip[Demandez un fichier, pas une capture d'écran]
Réclamez un exemplaire réel de chaque format : un vrai XML, un vrai Factur-X, générés depuis leur plateforme.
Ouvrez-les. Cherchez-y vos champs métier. Une capture d'écran d'interface ne prouve rien sur ce qui sort du
tuyau — et c'est le fichier qui partira chez votre client, pas l'interface.
:::

Sur le ton : commencez par reconnaître ce que l'éditeur fait bien — agrément, certifications, documentation
publique — puis pointez ce qui « ne figure pas de manière explicite dans les documents mis à disposition ». Ça
transforme un interrogatoire en demande de précision, et vous obtenez des réponses écrites, ce qui est le seul
objectif.

## Pour aller plus loin

- La même méthode, appliquée à la conformité et à l'hébergement d'un éditeur :
  [Auditer un fournisseur SaaS et exiger un plan de remédiation](/docs/dsi/auditer-un-fournisseur-saas-et-exiger-un-plan-de-remediation/).
- Ce qui vous attend juste après le choix du format, côté messagerie :
  [Transférer une boîte partagée vers un alias externe « plus-adressé »](/docs/microsoft-365/regle-de-flux-transfert-vers-alias-plus-adresse/).
- Pour alimenter la plateforme depuis un SI ancien :
  [Exposer une GPAO legacy avec une API et Metabase](/docs/architecture/exposer-une-gpao-legacy-avec-une-api-et-metabase/).
- Référence officielle : [la facturation électronique sur impots.gouv.fr](https://www.impots.gouv.fr/professionnel/facturation-electronique).

<!-- source : note de cadrage « Mise en place de la facturation électronique – pourquoi nous devons choisir le format UBL », 2025-10-16 -->

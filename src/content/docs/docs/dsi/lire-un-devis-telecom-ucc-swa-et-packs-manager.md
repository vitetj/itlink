---
title: "Lire un devis de téléphonie d'entreprise : licences UCC, contrat de maintenance logicielle et packs"
description: "Vingt licences à ajouter, un devis d'une page et demie. Distinguer un ajout d'un renouvellement, recompter les packs avant de les payer, refuser la demi-journée d'injection, et rédiger la contre-proposition."
published: 2026-08-12
category: dsi
tags: [telephonie, devis, licences, achats, fournisseurs, negociation]
level: intermédiaire
status: à jour
featured: false
---

Vingt personnes de plus dans l'entreprise, donc vingt licences de téléphonie à ajouter à celles déjà en service. La
demande tient en une phrase. Le devis qui revient, lui, tient sur une page et demie, avec des lignes que je n'ai pas
demandées, des sigles qui ne veulent rien dire hors du catalogue de l'éditeur, et une prestation d'installation dont
le volume horaire m'a fait relire deux fois.

Ce n'est pas de la malhonnêteté. Un intégrateur configure une offre à partir d'un configurateur qui, dans le doute,
ajoute. Il ne connaît pas votre parc aussi bien que vous, et il n'a aucune raison de retirer une ligne que vous n'avez
pas contestée. Votre travail n'est donc pas de négocier un pourcentage : c'est de **relire ligne à ligne** et de dire
ce que vous gardez. Cette fiche décrit comment.

## Prérequis

- Le devis, avec le détail par ligne : désignation, quantité, unité, durée, date d'échéance.
- L'état réel de votre parc, relevé dans la console d'administration de votre plateforme, pas dans un fichier de 2019.
- Le contrat en cours, avec sa date anniversaire de maintenance et son préavis.
- Le nombre d'utilisateurs concernés, par usage. Pas le nombre de salariés.

## Décoder les lignes avant de regarder les prix

Un devis de téléphonie mélange trois natures d'achat que rien ne distingue visuellement, alors qu'elles se comportent
de façon totalement différente dans le temps.

| Nature | Ce que c'est | Ce qui compte |
|---|---|---|
| Licence d'usage (type UCC) | Un droit d'utilisation par utilisateur ou par poste | La quantité, et le profil : tout le monde n'a pas besoin du même |
| Maintenance logicielle (type SWA) | L'abonnement qui donne droit aux versions et au support | La date anniversaire et le périmètre couvert |
| Pack de gestion | Une application d'administration, souvent licenciée par blocs d'utilisateurs | Le nombre de blocs **déjà** possédés |
| Prestation | Le temps du technicien pour intégrer les licences | Le volume, et à distance ou sur site |

La ligne de maintenance est celle qui mérite le plus d'attention, parce qu'elle porte souvent deux mentions très
proches : **ADD-ON** et **RENEWAL**. Un ajout étend la maintenance aux nouvelles licences, en général jusqu'à la date
anniversaire commune, pour ne pas se retrouver avec deux échéances différentes. Un renouvellement reconduit la
maintenance de la base existante pour une nouvelle période. Les deux peuvent légitimement figurer sur le même devis —
mais alors les quantités doivent s'expliquer : le nombre couvert par l'ajout doit correspondre aux nouvelles licences,
celui du renouvellement à la base déjà installée. Si les deux quantités se recouvrent, vous payez deux fois la même
chose sur une partie du parc.

## Recompter avant de payer

Le piège le plus courant ne vient pas d'une ligne inutile, il vient d'une ligne **déjà couverte**.

Les packs de gestion se vendent par blocs — par exemple par dix utilisateurs. À la commande suivante, le
configurateur ajoute mécaniquement des blocs pour les nouveaux arrivants. Sauf que les blocs déjà achetés au fil des
ans dépassent souvent largement l'effectif : treize blocs de dix couvrent cent trente utilisateurs, et si vous en
avez cent, vous n'avez besoin d'aucun bloc supplémentaire. La ligne est parfaitement logique côté fournisseur, et
parfaitement inutile côté client.

D'où la règle : **avant de lire le devis, comptez**. Ouvrez la console d'administration, relevez le nombre de licences
par type, le nombre de packs et le nombre d'utilisateurs réellement déclarés. Cinq minutes, et vous avez de quoi
contester une ligne avec un chiffre au lieu d'une impression.

:::tip
Distinguez aussi les usages. Sur un site industriel, une partie des postes sont des téléphones d'atelier ou de salle
de réunion, sans besoin de fonctions de collaboration. Les compter comme des utilisateurs complets gonfle chaque
renouvellement, année après année.
:::

## La ligne de prestation

Sur mon devis figurait une demi-journée de technicien, plus le déplacement, pour intégrer les nouvelles licences sur
un serveur téléphonique existant. Or l'opération consiste à charger un fichier de licence et à vérifier que le
décompte est bon. Cela se fait à distance, et cela ne prend pas une demi-journée.

Deux questions suffisent à trancher, et il faut les poser sans agressivité :

1. L'intervention peut-elle être réalisée à distance ? Si oui, le déplacement disparaît.
2. Quel est le temps minimum facturable pour l'injection de la clé ? Si l'entreprise facture par tranche d'une heure,
   demandez une tranche.

Il y a des cas où la demi-journée est justifiée : montée de version, changement de configuration, formation des
utilisateurs, intervention sur site avec test des postes. Le devis doit alors le dire. « Prestation d'installation »
sans description n'est pas une justification, c'est une case cochée par défaut.

## Les questions à poser par écrit

Avant de contre-proposer, envoyez ces questions. Les réponses valent contrat, et elles vous serviront au
renouvellement suivant.

- Les nouvelles licences sont-elles perpétuelles ou souscrites, et pour quelle durée ?
- Quelle est la date anniversaire de la maintenance après cet ajout, et le préavis de résiliation ?
- L'ajout de ces licences impose-t-il une version minimale du logiciel serveur ? Si oui, cette montée de version
  est-elle incluse dans la maintenance ou facturée à part ?
- Que se passe-t-il si l'effectif baisse : peut-on réduire le nombre de licences à l'échéance, et sous quel délai ?
- Les packs de gestion facturés couvrent-ils un besoin non couvert par ceux déjà en place ? Merci de fournir le
  décompte tel que le voit l'éditeur.
- La prestation est-elle réalisable à distance, et quel est son temps minimum facturable ?

:::caution
Posez ces questions dans le fil du devis, pas au téléphone. Un intégrateur qui répond par écrit engage sa société ;
la même réponse donnée oralement disparaîtra avec le commercial qui l'a donnée, et ils changent souvent.
:::

## Formuler la contre-proposition

C'est le moment où beaucoup de DSI se contentent d'un « c'est trop cher », qui n'aboutit à rien parce que le
fournisseur ne sait pas quoi retirer. Une contre-proposition utile est une **relecture ligne par ligne**, avec pour
chacune un verbe et une raison.

```text title="Trame de réponse à un devis"
Bonjour,

Merci pour ce devis. Après relecture ligne à ligne, voici notre position :

- Ligne 1 (licences d'usage, quantité N) : CONSERVÉE. Conforme au besoin.
- Ligne 2 (maintenance, ajout) : CONSERVÉE, sous réserve que la quantité corresponde
  aux seules nouvelles licences et que l'échéance soit alignée sur la date anniversaire
  du contrat en cours.
- Ligne 3 (maintenance, renouvellement) : À CONFIRMER. Merci de préciser le périmètre
  couvert, afin de vérifier qu'il ne recouvre pas la ligne 2.
- Ligne 4 (packs de gestion) : RETIRÉE. Notre console indique un nombre de blocs déjà
  suffisant pour l'effectif après arrivée des nouveaux utilisateurs.
- Ligne 5 (prestation, demi-journée + déplacement) : REQUALIFIÉE. L'opération se limite
  à l'injection du fichier de licence, réalisable à distance. Merci de la ramener au
  temps minimum facturable, sans déplacement.

Pouvez-vous nous adresser un devis corrigé sur cette base ?
```

Trois principes derrière cette trame. On ne conteste jamais un montant global, on conteste une ligne. On donne
systématiquement la raison, ce qui permet au fournisseur de corriger sans perdre la face. Et on demande un devis
révisé, pas une remise : une remise sur une ligne inutile reste de l'argent dépensé pour rien.

## Ce que le devis ne dit pas

- **La date anniversaire commande tout.** Un ajout en cours d'année se règle souvent au prorata jusqu'à l'échéance
  commune. C'est normal, mais cela rend la comparaison avec l'année précédente illisible si vous ne le savez pas.
- **Une licence n'est pas une ligne budgétaire isolée.** Elle entraîne de la maintenance chaque année. Vérifiez que
  votre budget récurrent est mis à jour le jour où vous signez, pas onze mois plus tard.
- **Les fonctions incluses évoluent.** Ce qui était un module payant peut être intégré à l'offre standard depuis deux
  versions. Demandez-le, personne ne vous le proposera spontanément.
- **Le devis suivant reprendra celui-ci.** Toute ligne acceptée sans discussion devient la référence. C'est la vraie
  raison de relire : vous ne négociez pas cette commande, vous négociez les cinq prochaines.

## Pour aller plus loin

- [Copieur : location ou achat ? Faire le calcul de coût total](/docs/dsi/copieur-location-ou-achat-calcul-tco/), la
  même méthode appliquée à un contrat d'impression.
- [Construire le dossier de décision d'un projet réseau](/docs/dsi/construire-le-dossier-de-decision-dun-projet-reseau/),
  pour présenter l'arbitrage à la direction une fois le devis corrigé.
- [MiCollab, SIP et RTP derrière un SASE](/docs/reseau/micollab-sip-rtp-derriere-un-sase-cato/), sur ce que ces
  licences font réellement tourner.

<!-- source : mail « Explication d'un devis de licences téléphonie », 2026-08-07 -->

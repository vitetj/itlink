---
title: "Fiabiliser les indicateurs d'un helpdesk : quand le rapport annonce 198 réouvertures et qu'il y en a 9"
description: "Un indicateur de réouverture qui comptait les « merci » : comment un rapport transforme 9 vrais échecs en 198, comment recalculer la mesure sur l'export brut, et pourquoi un KPI faux coûte plus cher qu'aucun KPI."
published: 2026-03-27
category: dsi
tags: [kpi, zammad, helpdesk, itsm, pilotage, reporting]
level: intermédiaire
status: à jour
featured: true
tested_on: [Zammad]
sidebar:
  label: "Fiabiliser les indicateurs d'un helpdesk"
---

En mars 2026, j'ai repris l'analyse des tickets de mon helpdesk pour la présenter à la direction. Le rapport
généré automatiquement annonçait **198 « réouvertures (approx) »** sur 603 tickets. Un tiers du support qui
repasse au tourniquet : présenté tel quel, ce chiffre dit qu'on résout mal, et il n'appelle qu'une conclusion, la
mise en cause du service.

Sauf qu'il était faux. Après recalcul sur les exports bruts, il y a eu **47 réouvertures réelles**, dont **9
correspondent à un problème non résolu**. Neuf sur 603, soit 1,5 %. L'écart entre 198 et 9 n'est pas une erreur
d'arrondi, c'est une erreur de définition — et ce genre d'erreur se glisse dans à peu près tous les rapports
automatiques que j'ai vus.

Cette fiche décrit le piège, la façon de recalculer proprement, les deux autres biais découverts au passage, et ce
que j'en ai tiré comme règle de pilotage.

## Comprendre le piège : « activité après clôture » n'est pas « réouverture »

L'indicateur automatique comptait comme réouverture **toute activité conversationnelle survenue après la
clôture** : un message, une réponse, un accusé de réception. Or dans la vraie vie d'un helpdesk, ce qui arrive le
plus souvent après une clôture, c'est un utilisateur poli qui écrit « merci, c'est bon ».

Le rapport comptait donc les remerciements comme des échecs. C'est la mécanique classique du proxy de mesure : on
ne sait pas mesurer directement ce qui nous intéresse (l'état du ticket a-t-il changé ?), alors on mesure ce qui
est facile à compter (y a-t-il eu un message ?), et on oublie la substitution. Six mois plus tard, plus personne
ne se souvient que le chiffre est un approximatif — le mot « approx » dans le titre de la colonne ne protège de
rien.

Une réouverture, ce n'est pas un message. C'est un **changement d'état** : un ticket clos qui redevient ouvert,
puis reclos.

## Prérequis

- Un accès aux **exports bruts** de l'outil de ticketing : la table des tickets **et** celle des messages. Jamais
  le PDF de synthèse, jamais le tableau de bord intégré : ce sont eux qui portent la définition fautive.
- De quoi croiser deux fichiers : une base, un tableur, ou n'importe quel outil d'analyse. Le volume d'une petite
  DSI tient dans un tableur.
- Une demi-journée. C'est le coût réel de l'exercice, et il ne se refait pas tous les mois.

## Recalculer la réouverture sur un changement d'état

Dans Zammad, deux champs suffisent : `close_at`, la première clôture, et `last_close_at`, la dernière. Un ticket
clos une seule fois a deux dates identiques. Un ticket rouvert puis reclos a une dernière clôture postérieure à la
première.

```sql title="La mesure correcte : une réouverture est un écart entre deux clôtures"
SELECT
  COUNT(*) AS reouvertures_etat
FROM tickets
WHERE close_at IS NOT NULL
  AND last_close_at IS NOT NULL
  AND last_close_at > close_at;
```

Et voici, pour comparaison, ce que faisait le rapport automatique :

```sql title="La mesure fautive : toute activité postérieure à la clôture"
SELECT COUNT(DISTINCT t.id) AS activite_apres_cloture
FROM tickets t
JOIN ticket_articles a ON a.ticket_id = t.id
WHERE t.close_at IS NOT NULL
  AND a.created_at > t.close_at;
```

La première requête donne 47. La seconde en donne 198. Les deux sont « justes » : elles ne répondent simplement
pas à la même question. Une seule des deux mérite d'apparaître dans une revue de service.

:::caution
Les noms de tables et de champs dépendent de votre outil et de sa version. Vérifiez-les sur votre export avant de
recopier ces requêtes. Ce qui est transposable partout, c'est le principe : **cherchez un changement d'état
horodaté, pas une trace de conversation**.
:::

Dans un tableur, la même logique s'écrit en une colonne : `= SI(ET(close_at<>""; last_close_at>close_at); 1; 0)`,
puis une somme. Pas besoin d'outil décisionnel pour corriger un indicateur.

## Qualifier les réouvertures à la main

47 réouvertures d'état, sur 603 tickets, cela fait 7,8 %. C'est déjà un tout autre message que 33 %. Mais le
chiffre reste inexploitable tant qu'on ne sait pas **pourquoi** ces tickets sont repartis. Je les ai donc relus un
par un — 47 tickets, c'est une heure de lecture, pas un projet.

| Cause réelle de la réouverture | Tickets | Part des 47 |
| --- | --- | --- |
| Remerciement / validation (« ok », « merci », « c'est bon ») | 21 | 44,7 % |
| Complément d'information / relance simple | 7 | 14,9 % |
| Nouvelle demande / changement de périmètre | 6 | 12,8 % |
| Réouverture administrative ou interne | 4 | 8,5 % |
| **Vrai problème non résolu** | **9** | **19,1 %** |

**38 réouvertures sur 47, soit 80,9 %, ne sont pas des échecs.** Les vrais problèmes représentent 9 tickets sur
603, soit 1,5 %. Le chiffre qui devait dire « votre support résout mal » disait en réalité « vos utilisateurs
répondent poliment ».

:::tip
Gardez la qualification manuelle même après avoir corrigé la requête. Un indicateur qui compte bien mais qui ne
distingue pas « nouvelle demande » de « ça ne marche toujours pas » reste un indicateur qu'il faudra interpréter à
la main. Mieux vaut trois compteurs honnêtes qu'un seul compteur qu'on doit expliquer à chaque comité.
:::

## Deuxième biais : la clôture administrative tardive

Une fois le premier chiffre corrigé, le deuxième saute aux yeux. Le délai moyen de résolution affiché était de
**129,3 heures**. La médiane réelle est de **6,8 heures**.

L'explication tient dans deux nombres : **164 tickets** ont été fermés plus de 24 heures après le dernier échange
avec l'utilisateur, et **266 tickets** ont passé plus de **95 % de leur durée de vie** en attente d'une clôture
formelle. Autrement dit, le problème était réglé depuis longtemps, mais le ticket restait ouvert en attendant que
quelqu'un clique.

La conclusion que j'ai écrite à la direction, telle quelle : *le support n'est pas lent à traiter, il est surtout
irrégulier à clôturer proprement*. Ce n'est pas la même faiblesse, et ce n'est pas le même plan d'action. La
moyenne mesurait mes habitudes de rangement, pas mon temps de réponse.

Au passage, la réactivité réelle : sur les 348 tickets où une première réponse publique est identifiable, la
**médiane est de 19 minutes**, avec 223 tickets répondus en moins d'une heure. Là encore, la moyenne — 39,6 heures
— ne raconte rien d'autre que l'existence de quelques traînards. Sur des durées de traitement, publiez la médiane.

## Troisième biais : deux mondes dans la même file

Dernier écart, structurel celui-là : **114 tickets sur 603 (18,9 %) ont été créés par l'informatique elle-même** —
tâches internes, projets, achats, R&D. Un ticket « comparer trois offres d'onduleurs » vit des semaines ; un
ticket « je n'ai plus de son en réunion » vit vingt minutes.

Les chiffres le confirment : médiane de résolution d'environ **4,8 heures** pour les tickets utilisateurs, contre
**24,4 heures** pour les tickets internes, avec une moyenne interne qui frôle les 238 heures. Mélanger les deux
dans la même statistique, c'est faire la moyenne d'un sprint et d'un déménagement.

## Les quatre corrections retenues

1. **Abandonner le KPI « réouvertures approx »** et le remplacer par trois compteurs distincts : réouverture exacte
   d'état (`last_close_at > close_at`), réouverture problématique qualifiée, et réponse de validation ou de
   remerciement. Le troisième n'est pas un défaut : c'est un signe de satisfaction, autant l'assumer.
2. **Séparer les files** : incidents utilisateurs d'un côté, projets, achats, R&D et tâches internes de l'autre.
   Aucune statistique commune ne survit à ce mélange.
3. **Mieux piloter la clôture** : fermeture automatique après validation de l'utilisateur, ou statut intermédiaire
   « résolu, en attente de confirmation ». C'est le correctif qui divise le délai affiché par vingt sans changer
   une ligne de la façon de travailler.
4. **Rendre le reporting exploitable à la source** : titre obligatoire et non générique, catégorie obligatoire,
   motif de mise en attente, motif de réouverture. Un rapport ne rattrape jamais une saisie absente.

## La morale : un indicateur faux coûte plus cher que pas d'indicateur

Sans indicateur de réouverture, on discute à l'instinct, et tout le monde sait qu'on discute à l'instinct. Avec un
indicateur faux, on discute avec assurance, on prend des décisions, on arbitre des budgets — et personne ne
rediscute le chiffre, parce qu'il vient d'un outil.

Ce chiffre-là aurait pu justifier une réorganisation, un changement d'outil, une mise en cause. Il ne mesurait que
la politesse des utilisateurs.

D'où la règle que j'applique désormais avant de publier une statistique de service : écrire noir sur blanc la
**définition** de chaque indicateur, la **requête** qui le produit, et **ce qu'il ne mesure pas**. Trois lignes en
annexe du rapport. Si je ne sais pas écrire ces trois lignes, je ne publie pas le chiffre — et je le dis, ce qui
reste plus honnête que de publier un chiffre qui se défend tout seul faute d'être compris.

## Pour aller plus loin

- [Choisir un outil de ticketing pour une petite DSI](/docs/dsi/choisir-un-outil-de-ticketing-pour-une-petite-dsi/) : les critères, dont l'accès aux données brutes, qui conditionne tout ce qui précède.
- [Modèle de rapport d'audit d'infrastructure pour une PME](/docs/dsi/modele-de-rapport-daudit-infrastructure-pme/) : où faire figurer les définitions d'indicateurs.
- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/) : présenter un chiffre corrigé à une direction sans passer pour celui qui se cherche des excuses.

<!-- source : mail « Ticket support V2 » — analyse des tickets et correction des KPI, 25/03/2026 -->

---
title: "Quand l'informaticien est absent : la procédure de remplacement qu'un non-technicien peut suivre"
description: "Portails, mots de passe à durée limitée, redémarrage d'une VM dans vCenter et ordre de reprise après coupure électrique : le document de passation que tout IT solo devrait écrire avant ses congés."
published: 2026-08-03
category: dsi
tags: [continuite, passation, vcenter, coupure-electrique, it-solo, runbook]
level: intermédiaire
status: à jour
featured: false
tested_on: [VMware vCenter 8.0.3, Dell VxRail]
---

Fin juillet 2026, à quelques jours de mes congés, j'ai envoyé un mail au responsable automatisme et à la RH. Titre : « Procédure de base – remplacement IT pendant mon absence ». Quelques pages, pas plus, destinées à des gens compétents dans leur métier mais qui n'avaient jamais ouvert vCenter. Un mois plus tôt, une série de micro-coupures électriques avait laissé trois serveurs à relancer et deux VM qui refusaient de redémarrer seules. Je ne voulais pas que ça se reproduise avec moi injoignable.

Cette fiche explique ce que ce document doit contenir, pourquoi, et vous donne la trame. Elle s'adresse à l'informaticien qui la rédige. Les blocs de texte sont les extraits destinés au remplaçant, à copier tels quels.

## Pourquoi un collègue, et pas seulement un prestataire

Quand on est seul, l'astreinte n'existe pas. Le prestataire a un contrat, un délai et une facture ; le collègue a un badge et la clé de la salle serveur. Les deux sont utiles, mais le collègue est là en dix minutes. Le document ne vise pas à le transformer en administrateur : il vise à ce qu'il puisse faire les trois gestes qui couvrent l'essentiel des incidents d'été, et qu'il sache quand appeler plutôt que d'insister.

## Prérequis

- Un coffre-fort de mots de passe capable de générer des liens de partage à durée limitée (type Bitwarden Send ou équivalent).
- Un accès vCenter dédié au remplaçant, ou à défaut un compte d'intérim partagé temporairement. Jamais votre compte personnel.
- La liste à jour des portails : SOC, support de l'opérateur, vCenter, helpdesk.
- Un onduleur qui tient réellement le temps d'un arrêt propre. C'est la moitié du sujet, on y revient.

## Rédiger la section « Où aller et qui appeler »

Le remplaçant ne doit pas chercher. Un tableau, quatre lignes, et les références de contrat dans le coffre plutôt que dans le mail.

| Situation | Où aller | Qui contacter |
| --- | --- | --- |
| Un poste isolé, une alerte de sécurité | Portail du Micro-SOC (Orange Cyberdefense) | Le SOC, joignable 24/7 |
| Un problème de lien Internet ou de téléphonie | Portail support de l'opérateur | Le support opérateur, avec la référence du contrat |
| Une VM figée, un serveur à redémarrer | vCenter | Ce document, puis le support en cas de doute |
| Une demande d'utilisateur | Helpdesk | La traiter si c'est simple, sinon répondre « à mon retour » |

Les mots de passe sont transmis par un lien du coffre-fort à durée limitée, jamais dans le corps du mail. Le lien expire à votre retour. Si le collègue ne l'a pas ouvert, vous ne changez rien ; s'il l'a ouvert, vous changez le mot de passe. Un mail de passation transféré trois fois finit toujours quelque part.

## Rédiger la section « Redémarrer une VM »

C'est le geste le plus fréquent et le moins risqué, à condition d'expliquer la différence entre les deux boutons.

```text title="Extrait du document remis au remplaçant"
1. Ouvrir vCenter dans le navigateur et se connecter avec le compte fourni.
2. Chercher la VM par son nom dans la barre de recherche en haut.
3. Clic droit sur la VM > Alimentation > « Redémarrer le SE invité ».
   La VM s'éteint proprement et redémarre. Compter 2 à 5 minutes.
4. Si la VM ne réagit toujours pas au bout de 10 minutes :
   clic droit > Alimentation > « Réinitialiser ».
   C'est l'équivalent d'un bouton reset : uniquement si la VM est réellement figée.
5. Ne rien faire sur les « hôtes » (les serveurs physiques dans la liste). Jamais.
```

:::caution
« Réinitialiser » coupe la VM sans prévenir le système. Sur un serveur de base de données ou un contrôleur de domaine, c'est le dernier recours, pas le premier réflexe. Écrivez-le en gras : un non-technicien cherche naturellement le bouton le plus rapide.
:::

## Rédiger la section « Reprise après coupure électrique »

C'est la partie qui justifie le document. Le 24 juin 2026, après des micro-coupures, trois serveurs étaient à relancer et deux VM ne sont pas revenues seules : la VM de CAO, protégée par une licence antivol, et la VM de comptabilité. Sans ordre de redémarrage, un remplaçant relance tout en même temps, l'ERP démarre avant les contrôleurs de domaine, personne ne peut s'authentifier, et il conclut que « rien ne marche ».

```text title="Extrait : après une coupure de courant"
1. Vérifier l'alimentation : l'onduleur est-il allumé ? Les serveurs sont-ils branchés ?
2. Dans vCenter, vérifier que tous les hôtes sont « Connectés » et que le stockage
   (vSAN) est en bonne santé. Si ce n'est pas le cas : ne pas insister, appeler le support.
3. Démarrer D'ABORD les deux contrôleurs de domaine (AD/DNS).
   Attendre qu'ils répondent, environ 5 minutes.
4. Ensuite, les serveurs métier : ERP/GPAO, serveur de fichiers, impression.
5. Puis le reste, par petits groupes.
   Mieux vaut redémarrer calmement que lancer toutes les VM d'un coup.
6. Cas particuliers : la VM de CAO (licence antivol) et la VM de comptabilité
   ne redémarrent pas seules. Les démarrer à la main, systématiquement.
7. Contrôler : ouvrir l'ERP, imprimer une page, ouvrir un dossier réseau.
```

| Ordre | Quoi | Pourquoi |
| --- | --- | --- |
| 1 | Contrôleurs de domaine | Sans AD ni DNS, rien ne s'authentifie et rien ne se résout |
| 2 | ERP/GPAO, fichiers, impression | Ce dont la production a besoin pour tourner |
| 3 | Le reste, par vagues | Éviter la ruée sur le stockage et la mémoire |
| Toujours | CAO et comptabilité, à la main | Elles ne reviennent pas seules |

:::tip
« Redémarrer calmement » n'est pas une coquetterie. Un cluster qui reçoit des dizaines de démarrages simultanés après une coupure passe de longues minutes à se battre pour le disque et la RAM, et les services qui dépendent les uns des autres échouent en cascade. Trois vagues espacées coûtent moins de temps qu'un redémarrage général suivi d'un après-midi de diagnostic.
:::

## Écrire une ligne sur l'onduleur

En septembre 2025, quatre coupures dans la même journée : l'onduleur n'avait pas rechargé après la deuxième, et la suivante a tout fait tomber. Un onduleur qui n'a pas rechargé est un onduleur absent. Ajoutez au document une consigne simple : après une coupure, regarder le niveau de charge de l'onduleur et prévenir s'il est bas, avant la coupure suivante plutôt qu'après. Et pour vous : le projet d'onduleurs est le vrai correctif, la procédure n'est que le pansement.

## Terminer par les interdits

Le document se termine par trois lignes en gras, parce que ce sont celles qu'on lit en dernier et qu'on retient :

- Ne rien faire sur les hôtes physiques.
- Ne pas installer, ne pas mettre à jour, ne pas « nettoyer ».
- En cas de doute, ne pas insister : appeler le support (coordonnées dans le coffre) et m'envoyer un message. Un appel pour rien coûte moins cher qu'un « Réinitialiser » de trop.

Relisez ensuite le document en vous mettant à la place de quelqu'un qui découvre vCenter un dimanche soir. Chaque phrase qui suppose une connaissance implicite est une phrase à réécrire.

## Pour aller plus loin

- [Runbook : redémarrer une infrastructure virtualisée après coupure](/docs/windows-server/runbook-redemarrer-une-infrastructure-virtualisee-apres-coupure/) : la version technique, pour vous.
- [Dimensionner les onduleurs d'une petite salle serveur](/docs/architecture/dimensionner-les-onduleurs-dune-petite-salle-serveur/) : le correctif de fond.
- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/) : la même exigence de clarté, appliquée à tout le reste.

<!-- source : mail « Procédure de base – Remplacement IT pendant mon absence », 2026-07-31 ; mail de reprise après coupure électrique, 2026-06-24 -->

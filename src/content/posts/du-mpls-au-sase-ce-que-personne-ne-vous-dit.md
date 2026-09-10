---
title: "Du MPLS au SASE : ce que personne ne vous dit avant la bascule"
description: "Deux ans pour sortir d'un Internet direct avec pare-feu et VPN, une bascule ratée en juin, une victoire sur une plage de ports en juillet et un projet clos en septembre. Ce que j'aurais aimé lire avant."
published: 2026-09-09
category: retex
tags: [sase, mpls, cato, stormshield, mitel, bgp]
featured: true
---

Le 8 septembre 2026, j'ai écrit à l'opérateur une phrase que j'attendais depuis 2022 : ce projet est désormais terminé, je valide le SASE, le lien MPLS et la connexion de secours. Entre les deux, une bascule ratée, trois semaines de captures pour une plage de ports, une session BGP bloquée par une convention que personne n'avait écrite, et un compte-rendu d'échec devenu le document le plus utile du projet. Voici ce que personne ne m'avait dit.

## Le titre est un mensonge, et c'est la première leçon

On ne passe pas « du MPLS au SASE ». On ne quitte pas le MPLS. Quand j'ai commencé, ma boîte avait un accès Internet direct, un pare-feu qui écoutait sur une adresse publique, et des VPN classiques pour le télétravail et les prestataires. Le MPLS, je l'ai fait livrer en juin 2026 précisément pour arrêter ça : le site n'a plus d'accès Internet à lui, il a un lien privé vers l'opérateur, qui l'amène en BGP jusqu'au point de présence du fournisseur SASE. L'Internet est là-bas, filtré, inspecté, et personne sur Internet ne voit plus mon site. « Non exposée par conception », c'est la formule que j'ai vendue à ma direction. Le SASE ne remplace pas le MPLS, il lui donne enfin un sens.

Ce que ça implique et que le commercial ne dit pas : votre ancien accès Internet ne se résilie pas le jour de la bascule. Il vous faut un secours pendant les tests, un plan de retour arrière, et, à la fin, une bonne surprise : les pénalités de résiliation anticipée ont été très inférieures à ce que j'avais estimé. J'avais budgété le pire. Faites pareil.

## La bascule ratée du 16 juin

Le 15 juin, j'ai envoyé la communication aux utilisateurs : migration le lendemain entre 12h30 et 13h30, services indisponibles, agent pré-installé « ne l'utilisez pas », plan de retour arrière. Le 16 à 12h30, j'ai inversé les passerelles sur le cluster Stormshield. Le 16 à 13h30, j'étais revenu en arrière.

Les symptômes : les appels MiCollab passaient mais sans voix retour ; l'adresse publique vue par le SASE n'était pas celle attendue ; le pare-feu local et le SASE inspectaient tous les deux le même trafic, chacun avec son IPS ; des erreurs NTP ; et cinq licences d'évaluation pour tester avec de vrais utilisateurs, ce qui ne suffit pas.

Ce que j'ai fait ensuite est la chose dont je suis le plus fier sur ce projet, et ce n'est pas technique : un compte-rendu d'échec de déploiement, structuré. Tests réalisés, symptômes observés, cause probable pour chacun, actions, et un responsable par rôle : LAN et pare-feu, téléphonie, trunk SIP, SASE, MPLS. Envoyé à tout le monde. Jusque-là, j'avais quatre équipes chez trois entités qui se renvoyaient des mails. Après ce document, chacun savait quelle ligne était la sienne. Si vous ne retenez qu'une chose de ce billet : formalisez l'échec le jour même, pendant que les captures sont encore chaudes.

## Trois semaines pour une plage de ports

Nouvelle tentative le 23 juin : une règle « tout vers tout » sur le pare-feu local règle le problème d'IPS, pas la voix. Le 2 juillet, puis le 7 : nouvel échec, j'avais même désactivé l'IPS côté SASE. Entre-temps, le jeton d'enregistrement du site avait expiré, ce que personne n'avait vu venir.

Le 16 juillet, avec le spécialiste téléphonie de l'opérateur, on a enfin regardé au bon endroit. La passerelle de bordure Mitel, en DMZ, sortait avec l'adresse publique générique du point de présence, partagée avec d'autres clients : il lui fallait une adresse dédiée. Une capture sur cette passerelle montrait l'audio G.722 arriver depuis le trunk SIP, et rien repartir. Ni codec, ni IPS : un problème de retour.

Le 17 juillet, la cause : les redirections de ports vers la passerelle Mitel publiaient la signalisation SIP mais pas toutes les plages RTP. Après l'ajout des plages 20000-31000 et 32000-33500 en UDP, audio bidirectionnel, appels entrants et sortants. Trois semaines de captures pour deux lignes de configuration. J'ai écrit « victoire » en objet du mail, et je ne le regrette pas. La procédure complète est dans [MiCollab, SIP et RTP derrière un SASE Cato](/docs/reseau/micollab-sip-rtp-derriere-un-sase-cato/).

Leçon, valable pour tout ce qui ressemble à de la voix derrière un NAT : l'audio unidirectionnel, c'est presque toujours le chemin retour. Cherchez ce qui n'est pas publié avant de chercher ce qui est bloqué.

## Les deux autres pièges que personne ne documente

**L'agent qui ne voit pas qu'il est au bureau.** Une fois la voix réglée, l'agent SASE sur les postes refusait de passer en mode bureau et mettait deux à trois minutes à se stabiliser. La plage interne des services du fournisseur, documentée par lui, n'était pas annoncée en BGP entre le routeur MPLS et le point de présence. Une route ajoutée, authentification immédiate. Personne, ni l'opérateur, ni le MSSP, ni le fournisseur, ne l'avait mise dans la liste des prérequis.

**Le /30 qui a un sens.** En parallèle, la session BGP entre OVHcloud et le SASE, via Equinix Fabric, restait en « No route to host ». Il a fallu que l'ingénieur du fournisseur lui-même admette qu'il l'avait configurée à l'envers : OVHcloud prend toujours la première adresse utilisable du /30 de peering, et ça ne se change pas. Ce n'est écrit dans le processus de mise en service d'aucun des deux côtés. Les conventions implicites tuent des semaines. Le détail est dans [OVHcloud Connect vers Cato via Equinix Fabric en BGP](/docs/cloud-web/ovhcloud-connect-vers-cato-via-equinix-fabric-bgp/).

Côté support : quand votre fournisseur SASE est opéré par un MSSP, le support éditeur devient un passe-plat. Une visio avec un ingénieur direct a débloqué en une heure ce que des mails interminables n'avaient pas fait en un mois. Demandez ce contact avant d'en avoir besoin.

## Ce que j'en retiens

- Ne jamais empiler deux IPS sur le même flux. L'un des deux doit se taire.
- L'audio dans un seul sens est un problème de NAT retour jusqu'à preuve du contraire.
- Une plage de services « interne au fournisseur » est une route comme une autre : demandez-la avant la bascule.
- Un compte-rendu d'échec vaut plus qu'un compte-rendu de succès. Il aligne les gens ; le succès ne fait que les rassurer.
- Un jeton d'enregistrement a une date d'expiration, et elle tombe toujours entre deux tentatives.
- Ne commandez pas la brique suivante avant que la précédente soit en production. J'ai reporté plusieurs résiliations pour ça, et c'est ce qui a permis le retour arrière.
- Un binôme de debug, humain ou IA, sert à lister les hypothèses ; c'est la capture qui tranche. Sur le RTP, l'IA a tenu la liste, la trace sur la passerelle a donné la réponse. J'en parle dans [L'IA au service informatique : un binôme, pas un remplaçant](/blog/lia-au-service-informatique-un-binome-pas-un-remplacant/).

Et l'Always-On ? Les automaticiens me demandent encore, deux mois après, s'ils peuvent désactiver l'agent pour brancher leur PC sur un automate. La réponse est toujours non, avec une déconnexion temporaire de soixante minutes et un motif obligatoire. Ce n'est pas la fin du projet, c'est la partie que le commercial ne met pas dans la présentation : un SASE, ça se déploie en trois mois et ça se vit ensuite tous les jours. Je ne changerais rien, sauf peut-être le titre.

<!-- source : mails « Compte-rendu d'échec de déploiement – Bascule de la passerelle par défaut vers Cato » 2026-06-16 et suites 2026-06-23 → 2026-07-07, « Micollab debug avancement » 2026-07-16, « VICTOIRE » 2026-07-17, « Point global déploiement Cato » 2026-07-21, « Cato Cloud Interconnect » 2026-07-10 → 2026-07-24, validation de fin de projet et résiliation 2026-09-07 → 2026-09-08 -->

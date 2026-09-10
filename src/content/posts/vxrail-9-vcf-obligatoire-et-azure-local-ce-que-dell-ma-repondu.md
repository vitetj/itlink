---
title: "VxRail 9, abonnement VCF obligatoire et Azure Local : ce que Dell m'a répondu"
description: "Deux questions posées à Dell en 2026, deux réponses nettes : pas de VxRail 9 sans abonnement VCF, pas de conversion d'un VxRail en Azure Local. Chronique d'un renouvellement où les portes se ferment une à une."
published: 2026-09-08
category: veille
tags: [vxrail, vcf, broadcom, azure-local, dell, renouvellement]
featured: true
---

Il y a des mails qu'on relit trois fois. Pas parce qu'ils sont compliqués : parce qu'on espère avoir mal
lu. J'en ai reçu deux de Dell cette année. Polis, précis, sourcés. Et chacun refermait une porte que je
croyais ouverte.

## Deux ans à voir venir

Je ne peux pas dire que je n'ai pas été prévenu. En février 2024, j'écrivais déjà une note à la direction :
Dell arrête de vendre VMware, les licences perpétuelles disparaissent, on est tranquilles cinq ans sur le
contrat en cours. En mai 2025, nouvelle note : Broadcom annonce une hausse de l'ordre de +800 %, notre
renouvellement tombe en février 2027, objectif « serveurs agnostiques ». Le même jour, j'écrivais à
l'intégrateur que j'étais attaché à VMware, mais pas pour ce futur prix.

En juin 2025, l'avant-vente Dell a proposé deux pistes : des nœuds VxRail « dynamiques » adossés à une baie
PowerStore pour abandonner les licences vSAN, ou une plateforme Nutanix. Autrement dit, remplacer des
licences par d'autres licences. J'ai rangé les propositions et j'ai attendu de voir ce que la version 9 de
VxRail allait changer.

## Première porte : pas de VxRail 9 sans abonnement

Le 10 février 2026, j'ai posé la question simplement : peut-on passer de VxRail 8 à VxRail 9 avec les
licences qu'on a ? La réponse tenait en une référence, la KB 000310965, et trois phrases. VxRail 9 s'appuie
sur VMware Cloud Foundation ou vSphere Foundation, sous abonnement. Sans abonnement, on reste en 8.x, avec
le support jusqu'à sa fin de vie. Et une fois en 9, aucun retour arrière.

Ma réponse à l'ingénieur tenait en trois mots que je ne reproduirai pas ici. Le lendemain, comme pour
enfoncer le clou, la mise à niveau 8.0.361 vers 8.0.370 s'est mise à
[tourner en boucle](/docs/virtualisation/vxrail-mise-a-niveau-lcm-en-boucle-postgresql-et-toolbox/), et j'ai
passé une nuit dans la base PostgreSQL du VxRail Manager. Mais ça, c'est une autre histoire.

La suite a été pire, et plus discrète. En mars, en préparant un export RVTools pour l'intégrateur, on a
découvert que nos licences vCenter perpétuelles n'avaient jamais été rattachées au portail Broadcom lors de
la migration. Pour Broadcom, elles n'existent pas. Personne ne nous l'avait dit ; personne ne nous avait
demandé de le faire. Si vous avez encore des licences perpétuelles quelque part, allez vérifier le portail
aujourd'hui. Pas demain.

## Deuxième porte : votre R640 n'est pas un AX-640

Début juin, j'ai changé d'angle. Plutôt que Proxmox, pourquoi pas Azure Local sur les VxRail existants ? On
paie déjà la Software Assurance, l'interconnexion avec notre SASE et notre MPLS est simple, et la
conformité au Cloud Act faisait partie du cahier des charges. Le 15 juin, réunion « renouvellement d'infrastructure » avec
Dell : Proxmox écarté, pas par snobisme, mais parce qu'une équipe d'une personne ne porte pas cette charge
d'administration en production ; Vates apprécié ; Dell qui pousse un intégrateur ; lancement d'une collecte
Live Optics. J'ai demandé le compte rendu au commercial en me présentant comme un informaticien fainéant
qui lui laissait la transcription.

Le 16 juin, question formelle. Mes nœuds VxRail E560F sont des PowerEdge R640. Dell vend des AX-640 et des
R640 « S2D Ready Node » pour Azure Local. Peut-on convertir les Service Tags ? Même châssis, a priori
mêmes composants.

Le 25 juin, la réponse : non. Identifiants de plateforme distincts, validation matérielle distincte,
conformité et support distincts. Pour faire de l'Azure Local, il faut acheter des nœuds AX. Même tôle, pas
la même étiquette. Le mail que j'ai envoyé à la direction le soir même commençait par « il faut racheter
une infra », dans une version un peu moins polie.

Le lendemain, j'ai fait le tour des constructeurs, à voix haute et par écrit. HP ne m'a pas convaincu.
Huawei et Lenovo sont techniquement bons, mais la question de la souveraineté se pose. Fujitsu m'a plu,
puis j'ai appris qu'ils se retiraient d'Europe. J'aimerais un serveur français conçu comme un Framework,
réparable et documenté. Le reste, c'est du Dell en marque blanche. Donc Dell. Encore.

## Ce que j'en retiens

1. **Le matériel hyperconvergé « constructeur » est verrouillé par le logiciel.** La portabilité se décide à
   l'achat, pas au renouvellement. La prochaine fois, je poserai la question « et dans cinq ans, ce châssis
   peut-il faire tourner autre chose ? » avant de signer, et j'exigerai la réponse par écrit.
2. **Vérifiez vos droits sur le portail Broadcom maintenant.** Une licence perpétuelle non rattachée est
   une licence perdue.
3. **Votre vraie échéance, c'est la fin de support de la 8.x**, pas la date du contrat. Notez-la.
4. **La Software Assurance est un actif**, mais un actif ne sert à rien si le matériel ne suit pas.
5. **Les chiffres avant les slides.** Le débriefing [Live Optics](/docs/architecture/lire-un-rapport-live-optics-et-un-export-rvtools/)
   de juillet a montré un CPU largement suffisant, une RAM qui est le vrai goulot, et des SSD NVMe dont le
   prix rend l'hyperconvergence moins évidente qu'il y a cinq ans. HCI et trois-tiers seront chiffrés tous
   les deux, plus un renouvellement à l'identique.
6. **Pas de devis sans document d'architecture ni schémas réseau.** Un vendeur qui ne dessine pas ce qu'il
   vend ne le comprend pas mieux que vous.
7. **Il me faut du temps.** Je l'ai écrit en majuscules dans une note de cadrage en février. La pression
   commerciale n'est pas un argument technique.

Début septembre, un nouvel interlocuteur stockage chez Dell a repris le dossier, et l'intégrateur m'a
proposé une présentation d'Azure Local. J'ai accepté. J'irai, j'écouterai, et cette fois je prendrai mes
notes moi-même. Février 2027 est loin, ou pas, selon qu'on est vendeur ou acheteur.

Si ces deux mails m'ont appris quelque chose, c'est que la réponse à « est-ce que je peux ? » est souvent
« non », et qu'il vaut mieux l'entendre avant de signer qu'après. Il me faut du temps. C'est la seule chose
que personne ne vend par abonnement.

<!-- source : mails « Note Dell / VMware — fin des licences perpétuelles », 2024-02-05 ; « Alerte Broadcom », 2025-05-27 ; « VxRail 9 / VCF-VVF obligatoire », 2026-02-10 ; « Licences vCenter perdues », 2026-03-19 ; « Azure Local au lieu de Proxmox ? », 2026-06-04 ; « Renew Infrastructure — compte rendu », 2026-06-15 ; « Conversion Service Tags VxRail → Azure Local », 2026-06-16 / 2026-06-25 ; « Il faut racheter une infra / avis constructeurs », 2026-06-26 ; « Debrief Live Optics », 2026-07-08 ; « Présentation Azure Local », 2026-09-07 -->

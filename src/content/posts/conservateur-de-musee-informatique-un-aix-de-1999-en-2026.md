---
title: "Conservateur de musée informatique : un AIX de 1999 encore en production en 2026"
description: "Un IBM RS/6000 sous AIX 4.3, une application métier critique, une alimentation qui faiblit et un constructeur qui n'a plus les pièces. Pourquoi ces machines survivent et comment leur trouver une sortie."
published: 2026-03-24
category: culture-geek
tags: [aix, legacy, dette-technique, obsolescence, ibm, continuite-activite]
featured: true
---

J'ai écrit un jour, dans un mail, que j'étais officiellement devenu conservateur de musée informatique. C'était une blague. Comme la plupart des blagues d'informaticien, elle décrivait la situation avec une précision gênante : dans ma salle serveur, à quelques mètres d'un cluster hyperconvergé qui a moins de cinq ans, tourne un IBM RS/6000 sous AIX 4.3. Une machine de 1999. Elle porte une application métier critique. Elle fonctionne parfaitement.

C'est exactement le problème.

## Pourquoi ces machines survivent

On imagine volontiers qu'un serveur de vingt-sept ans en production est le symptôme d'une négligence, ou d'une entreprise qui ne veut pas payer. C'est rarement le cas. Ces machines survivent parce qu'elles marchent, et parce que le calcul du remplacement ne devient jamais favorable une année en particulier.

Le mécanisme est toujours le même. Un serveur métier est acheté avec l'application qui va dessus. L'application est faite pour lui, pour son système, pour ses formats. Personne ne la porte ailleurs, parce que le portage coûte un projet, et qu'un projet a besoin d'un déclencheur. Or il ne se passe rien. Rien ne tombe en panne. Aucune supervision ne remonte l'alerte « ce serveur a vingt-sept ans ». Une dette technique ne fait pas de bruit : c'est même sa principale caractéristique.

S'ajoute une peur parfaitement rationnelle. La seule chose pire qu'un serveur de 1999 en production, c'est un serveur de 1999 qu'on a tenté de migrer un vendredi après-midi. Chaque année, quelqu'un évoque le sujet, chacun mesure le risque, et la décision par défaut l'emporte : on ne touche à rien. La décision par défaut est toujours celle qui gagne quand personne n'est officiellement responsable du sujet.

Et cette machine n'est pas seule. Dans le même système d'information, une GPAO en base MultiValue tient la production, avec sa logique, son vocabulaire et son cercle très restreint de gens qui la comprennent. Il y a des jours où je me demande sincèrement si mon métier est directeur informatique ou archiviste. Ces deux dossiers m'ont appris la même chose : ce n'est pas l'âge du logiciel qui pose problème, c'est le nombre de personnes capables de le maintenir.

## Ce qu'elles coûtent vraiment

Sur le papier, une vieille machine ne coûte rien. Pas de licence à renouveler, pas de contrat de support, quelques unités de baie et un peu d'électricité. C'est ce qu'on voit, et c'est ce qui trompe tout le monde, direction comprise.

Le coût réel se répartit sur quatre lignes qui n'apparaissent dans aucun budget.

Les pièces, d'abord. L'alimentation de la mienne commence à faiblir, et le constructeur n'a bizarrement plus de pièces. Obsolescence programmée, à peine vingt-sept ans. Une alimentation fatiguée sur une machine dont on ne peut plus acheter d'alimentation, ce n'est pas un incident matériel : c'est un compte à rebours dont personne ne connaît la durée.

Les compétences, ensuite. Combien de personnes savent encore administrer AIX 4.3 au quotidien, et parmi elles combien sont joignables un dimanche soir ? Ceux qui ont installé cette machine étaient en début de carrière à l'époque. Chaque année, le vivier se réduit, et le tarif de ceux qui restent augmente. Ce n'est pas une critique, c'est de la démographie.

La restauration, surtout. Sauvegarder une machine ancienne, on sait à peu près faire. La vraie question, celle qui empêche de dormir, c'est : restaurer sur quoi ? Une sauvegarde sans cible de restauration disponible n'est pas une sauvegarde, c'est un souvenir bien rangé. C'est la même confusion que celle que je décris à propos du [RAID 5](/blog/raid5-nest-pas-une-sauvegarde/), en pire, parce qu'ici le matériel de remplacement n'existe plus sur le marché.

Le gel, enfin. Tout projet qui touche de près ou de loin à ce périmètre coûte plus cher, parce qu'il faut composer avec elle : interfaces d'un autre siècle, formats de fichiers exotiques, jeux de caractères qui ne pardonnent rien. La vieille machine ne coûte pas cher toute seule ; elle taxe discrètement tout ce qui l'entoure.

Sur la sécurité, je serai volontairement bref et vague, et c'est délibéré : je ne détaillerai pas ici comment on parle à cette machine ni depuis où. Le principe se résume en une phrase. Les protocoles de 1999 n'ont pas été conçus pour un monde qui écoute, et un système qu'on ne peut plus corriger se traite par son environnement, pas par un correctif qui n'existera jamais. C'est le même raisonnement que pour les [réseaux de machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/) : on ne durcit pas le système, on durcit ce qui l'entoure.

## Ce qu'on fait quand on ne peut pas remplacer

Il existe une posture confortable qui consiste à répéter qu'il faut migrer. Elle ne coûte rien et ne produit rien. Voici ce que je fais à la place.

Nommer la chose. Une fiche, écrite, qui dit quelle application tourne là, quel processus métier s'arrête si elle s'arrête, qui sait la redémarrer et qui sait la réinstaller. Tant que ce n'est pas écrit, ce n'est pas un risque : c'est une ambiance. Une direction ne finance jamais une ambiance.

Réduire la surface. Le strict nécessaire, rien d'autre, et une revue régulière de ce que « nécessaire » veut encore dire.

Documenter les interfaces. Qu'est-ce qui entre, qu'est-ce qui sort, sous quelle forme, à quelle heure, pour qui. Ce sont ces flux, et pas le code de l'application, qui détermineront le coût du jour où il faudra sortir. Une machine dont on connaît les entrées et les sorties est remplaçable ; une machine dont personne ne sait à quoi elle parle est un otage.

Chercher la porte de sortie avant la panne. En mars, j'ai demandé à un fournisseur cloud s'il proposait des machines virtuelles IBM Power sous AIX à la demande. L'idée est de séparer deux problèmes que tout le monde traite comme un seul : sortir le système de son fer d'abord, sortir l'application de son système ensuite. Deux problèmes difficiles valent toujours mieux qu'un seul insoluble. Je n'ai pas encore de réponse qui me satisfasse, et je ne vends rien ici : je raconte une recherche en cours, avec ses impasses.

Se donner un déclencheur, enfin. Décider à froid ce qui fera basculer le sujet en priorité absolue : la panne d'alimentation, le départ de la dernière personne qui sait, ou une exigence réglementaire. Sur ce dernier point, les obligations qui arrivent sur les PME industrielles rendront cette conversation plus facile qu'elle ne l'a jamais été, et j'ai déjà raconté à quoi ressemble la [conformité quand le service informatique, c'est vous](/blog/nis2-quand-le-service-informatique-cest-vous/).

L'objectif que je m'étais fixé, écrit tel quel dans un mail : sauver la bête avant qu'elle décide de partir à la retraite toute seule. J'y tiens, et sans la moindre condescendance. Cette machine a tenu vingt-sept ans, sans plainte, sans redémarrage intempestif, sans mise à jour ratée un mardi soir. Peu de choses que j'installe aujourd'hui peuvent prétendre au même bilan. Mon musée n'a qu'une seule pièce, elle est allumée, et je cherche activement où la mettre à l'abri avant qu'elle ne devienne une pièce de collection au sens propre.

<!-- source : rapport « Éléments envoyés 2026-01-01 → 2026-04-01 », passage « conservateur de musée informatique » et recherche d'une porte de sortie pour le serveur AIX, 2026-03-18 -->

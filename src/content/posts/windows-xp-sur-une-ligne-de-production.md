---
title: "Windows XP sur une ligne de production, et alors ?"
description: "Le SOC signale un flux sortant depuis un PC industriel sous Windows XP. Avant de crier au scandale : pourquoi ces systèmes restent en place, ce qu'il faut exiger du fournisseur de la machine, et où est la vraie faute."
published: 2026-03-03
category: humeur
tags: [ot, windows-xp, segmentation, industrie, achats, cybersecurite]
featured: false
---

Un après-midi de février, le SOC remonte une alerte : un PC industriel émet un flux sortant vers une destination qui n'a rien à faire là. On regarde de plus près le poste concerné, et on découvre le système d'exploitation. Windows XP. Sur une ligne de production. Avec un accès direct à Internet.

Ma première réaction n'était pas publiable. Je l'ai quand même écrite, en interne, parce que j'écris tout : il y était question de libertinage réseau. Puis j'ai rangé l'indignation dans un tiroir, parce que l'indignation n'a jamais nettoyé un poste ni redémarré une ligne de production.

## Pourquoi XP est encore là, et pourquoi ce n'est pas de la bêtise

Une machine industrielle s'achète pour vingt ans, parfois trente. Le PC qui la pilote n'est pas un PC de bureau qu'on remplacerait tous les cinq ans : c'est un composant de la machine, au même titre qu'un vérin ou qu'un variateur. Il a été livré avec elle, qualifié avec elle, et le logiciel de pilotage n'est souvent validé par le constructeur que sur ce système-là.

Changer l'OS, dans ce contexte, ce n'est pas cliquer sur « mettre à jour ». C'est perdre le support du constructeur de la machine, parfois la conformité de la ligne, souvent la garantie, et prendre le risque qu'une chaîne qui produit tous les jours ne redémarre pas. En face, le responsable de production a un carnet de commandes et une équipe. Quand l'informatique arrive en disant « il faut migrer », elle demande d'arrêter quelque chose qui fonctionne pour remplacer un composant qui fonctionne. À sa place, je dirais non aussi.

Alors posons-le clairement : le problème n'est pas Windows XP. Vingt-cinq ans de retard sur un poste bureautique, c'est une faute professionnelle. Sur un PC industriel qui ne parle qu'à un automate, dans un réseau fermé, c'est un arbitrage industriel défendable. Le mot qui change tout, dans cette phrase, c'est « fermé ».

## Isoler, plutôt que s'indigner

La règle tient en une ligne, et c'est la seule que je ne négocie jamais : un pupitre ou un PC industriel sous système obsolète n'a jamais d'accès direct à Internet. Jamais. Pas « filtré », pas « juste pour la télémaintenance », pas « le temps de la mise en service ».

Concrètement, cela veut dire un réseau virtuel dédié par zone fonctionnelle, une zone démilitarisée industrielle entre l'informatique de gestion et l'atelier, un vrai pare-feu industriel et non un simple routeur, un Wi-Fi de maintenance dans son propre réseau et jamais raccordé au réseau de contrôle, des flux autorisés un par un et documentés, et une télémaintenance ouverte à la demande puis refermée. J'ai détaillé cette démarche dans une fiche sur la [segmentation des réseaux de machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/). Rien là-dedans n'est spectaculaire, et c'est bien l'idée : un système qu'on ne peut plus corriger se traite par son environnement.

Et quand l'alerte tombe malgré tout, il reste une discipline d'investigation. Avant de couper quoi que ce soit, on relie la connexion suspecte à un processus. Depuis une invite de commandes lancée en administrateur, sinon certains processus système restent invisibles :

```cmd
netstat -ano | find "198.51.100"
tasklist /FI "PID eq 1234"
```

On filtre sur un préfixe d'adresse et non sur l'adresse complète, parce que le port change à chaque connexion alors que la destination, elle, ne change pas. La dernière colonne de `netstat` donne l'identifiant du processus, `tasklist` lui met un nom.

Vient ensuite la règle que je répète le plus souvent, et de loin : sur un poste de production, on ne tue rien sans l'accord du responsable de la ligne. Le processus suspect est peut-être aussi celui qui pilote un four ou une descente en température. Une investigation qui arrête la production sans prévenir ne sera pas la dernière de votre carrière, elle sera la seule : plus personne ne vous appellera. Le détail de la méthode est dans la fiche sur [l'identification du processus derrière une connexion sortante](/docs/cybersecurite/identifier-le-processus-derriere-une-connexion-sortante/).

## Ce qu'on exige du fournisseur de la machine

Tout ce qui précède est du rattrapage. Le vrai levier se situe des années plus tôt, au moment de la commande, et il tient dans un cahier des charges informatique court et non négociable. Six points suffisent.

Le pupitre et le PC industriel fonctionnent intégralement hors ligne : aucune fonction de production ne dépend d'un accès Internet. La liste exhaustive des flux nécessaires est fournie par écrit, avec protocole, sens, port et destination. Le système d'exploitation est nommé, avec sa version et sa date de fin de support. Le fournisseur dit qui applique les correctifs, comment, et pendant combien d'années. La télémaintenance passe par un accès tracé, ouvert à la demande, sans aucun accès de secours installé dans l'armoire électrique à mon insu. Et le plan d'adressage proposé est compatible avec le nôtre, pas un décalque du dernier client livré.

Ce n'est pas de l'arrogance d'acheteur. C'est simplement la seule fenêtre de l'histoire du projet où il existe un rapport de force. Après la signature, on n'exige plus rien : on demande poliment, et on attend. J'ai regroupé cette liste dans les [exigences informatiques pour l'achat d'une machine industrielle](/docs/architecture/exigences-it-pour-lachat-dune-machine-industrielle/), et je la joins désormais à toute consultation.

Un fournisseur capable de répondre à ces six points vend un système. Les autres vendent un capot et une odeur de peinture neuve, et l'informatique découvrira le reste à la mise en service. C'est un sujet sur lequel je suis revenu plusieurs fois : le [fournisseur vend une machine, pas un système d'information](/blog/le-fournisseur-vend-une-machine-pas-un-systeme-dinformation/).

## La vraie faute est ailleurs

Elle n'est pas dans le système d'exploitation. Elle est dans le fait que personne, le jour de la commande, n'a demandé où cette machine allait se brancher, ni ce qu'elle aurait besoin d'atteindre pour fonctionner. Une décision d'architecture a été prise par défaut, par un technicien de mise en service pressé, un vendredi, il y a des années. Personne n'a rien validé, donc personne n'est fautif, et c'est précisément ce qui rend la situation si difficile à corriger.

Il y a aussi la tentation de la responsabilité en cascade. Quand le flux part de chez quelqu'un d'autre, il est tentant de conclure que ce n'est pas notre adresse et qu'il revient au client de bloquer. C'est juridiquement exact et opérationnellement insuffisant. On prévient, on fournit la commande de diagnostic, on aide à isoler. Un écosystème industriel n'est pas une chaîne de responsabilités séparées : c'est un réseau au sens propre, et les machines de vos clients parlent à vos machines.

Alors, Windows XP sur une ligne de production, et alors ? Rien, tant qu'il n'a qu'un automate à qui parler. Le jour où on lui donne une passerelle par défaut vers Internet, ce n'est plus un vieux système : c'est une porte ouverte avec un mot de passe des années 2000 collé dessus. La bonne question n'est jamais « quel âge a ce système », c'est « à qui peut-il parler ». Et cette question-là se pose sur le bon de commande, pas dans un mail du SOC un après-midi de février.

<!-- source : rapport « Éléments envoyés 2026-01-01 → 2026-04-01 », suspicion de compromission d'un PC industriel signalée par le SOC, 2026-02-24, et note d'architecture réseau industrielle, 2026-03-10 -->

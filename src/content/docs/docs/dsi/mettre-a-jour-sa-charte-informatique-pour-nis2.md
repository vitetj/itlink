---
title: "Mettre à jour sa charte informatique pour NIS2 : les neuf ajouts qui comptent"
description: "PRA, journaux, BYOD, signalement à l'ANSSI, sensibilisation obligatoire : ce que j'ai ajouté à la charte informatique de ma boîte en novembre 2024, article par article, et pourquoi chaque ligne y est."
published: 2024-11-26
category: dsi
tags: [nis2, charte-informatique, conformite, byod, pra, sensibilisation]
level: intermédiaire
status: à jour
featured: true
sidebar:
  label: "Mettre à jour sa charte informatique…"
---

Octobre 2024, deux mails à une journée d'écart. Le premier vient d'un grand client : une charte de sécurité « NIS2 » à signer, que je ne peux pas signer (j'explique pourquoi dans [ce billet](/blog/nis2-quand-le-service-informatique-cest-vous/)). Le second est le rapport de l'assureur cyber : sauvegardes et sécurité, bien ; RGPD et NIS2, « pas dans les clous ». Entre les deux, la charte informatique de ma boîte ne parlait ni de NIS2, ni de plan de reprise, ni de smartphone personnel.

Le 21 novembre, la version 1.0 révisée est partie à la direction et à la RH. Neuf ajouts, pas une refonte : les articles existants ont gardé leur numéro, on a inséré ce qui manquait. Les voici un par un, avec le « pourquoi », parce qu'une clause que personne ne comprend est une clause que personne n'applique.

## Pourquoi la charte, et pas un nouveau document

NIS2 demande des mesures : hygiène de base, formation, gestion des accès, continuité, traitement des incidents. Pour la partie technique, vous avez vos outils. Pour la partie humaine, un seul document engage chaque salarié et vaut en cas de litige : la charte informatique, annexée au règlement intérieur. C'est le règlement de la piscine : il ne remplace pas le maître-nageur, mais sans lui le maître-nageur ne peut rien exiger.

## Prérequis

- La charte actuelle en version modifiable, avec sa numérotation d'articles. Les numéros ci-dessous sont ceux de la nôtre ; adaptez-les.
- L'accord de la direction pour repasser par le circuit RH : une charte annexée au règlement intérieur suit ses règles (avis du CSE, dépôt, affichage). La RH connaît le circuit.
- La liste de ce que vous faites déjà et qui n'est écrit nulle part : gestionnaire de mots de passe, campagne de sensibilisation, outil de transfert de fichiers, contrôle des périphériques. On ne met dans une charte que ce qu'on applique.

## Ajout 1 : une page de révision

Une charte sans historique est une charte dont personne ne sait si elle est à jour. La première page reçoit un tableau : version, date, auteur (par fonction, pas par nom), motif de la révision.

```text title="Extrait : page de révision"
Version | Date       | Auteur                | Motif
1.0     | 2024-11-21 | Service informatique  | Révision NIS2 : PRA, logs, BYOD, sensibilisation
```

Ce tableau est la première chose qu'un assureur ou un auditeur regarde.

## Ajout 2 : la référence à NIS2 et la notion de PRA (§3.2)

L'article sur la sécurité des systèmes cite désormais la directive et introduit le plan de reprise d'activité. Pour le salarié, ce paragraphe dit une chose simple : en cas de sinistre, l'ordre de remise en service est décidé par le plan, pas par celui qui crie le plus fort. L'annuaire revient avant l'ERP, l'ERP avant l'intranet.

## Ajout 3 : journaux, vie privée et périphériques externes (§3.3)

Trois sujets dans un même article, parce qu'ils ont la même logique : dire ce qu'on fait avant de le faire.

- **Journaux** : ce qui est enregistré (connexions, accès aux serveurs, messagerie, filtrage web), pourquoi (comprendre un incident, répondre à une obligation), et combien de temps. Le salarié en est informé : c'est une condition de validité, pas une politesse.
- **Vie privée** : un usage personnel raisonnable est toléré ; il n'y a pas de surveillance individuelle sans motif.
- **Périphériques externes** : clés USB et disques externes sont contrôlés, et pour l'essentiel interdits. L'alternative existe : un outil interne de transfert de fichiers, et c'est ce qu'a reçu le stagiaire arrivé avec sa clé.

:::caution[Ne promettez que ce que vous tenez]
N'écrivez pas « les journaux sont conservés un an » sans avoir vérifié sur chaque système combien de temps il les garde. Une charte qui promet plus que l'infrastructure se retourne contre vous.
:::

## Ajout 4 : sanctions et obligation de signalement (§3.4)

Deux paragraphes de plus. Le premier rappelle que l'entreprise elle-même est exposée à des sanctions européennes en cas de manquement, et que la chaîne de responsabilité descend jusqu'au poste de travail : d'où les sanctions disciplinaires du règlement intérieur. Le second est le plus important : en cas de cyberattaque, l'entreprise doit le signaler à l'ANSSI, dans des délais courts, et déposer plainte auprès de la gendarmerie.

Pour le salarié, ça se traduit par une consigne : tout incident, même un clic sur un lien douteux, se signale immédiatement au service informatique. Et une garantie, écrite noir sur blanc : signaler n'est jamais sanctionné.

:::tip
Sanctionner celui qui signale, c'est garantir qu'on n'apprendra plus rien. Le salarié qui appelle dix minutes après avoir cliqué vous fait gagner une journée ; celui qui a peur attend le lundi.
:::

## Ajout 5 : le mot de passe est la responsabilité du salarié (§4)

L'article sur les accès précise les règles de complexité et, surtout, place la responsabilité du mot de passe sur celui qui le choisit. Ça n'a de sens que si l'entreprise fournit l'outil : chez nous, un gestionnaire de mots de passe auto-hébergé, avec la règle « on n'envoie jamais un identifiant en clair dans un mail, on passe par le coffre ». Le mois précédent, j'ai dû la rappeler à un éditeur.

## Ajout 6 : le BYOD, dont le smartphone personnel en intervention (§5)

Le cas réel : des techniciens en intervention chez des clients échangent avec eux sur leur smartphone personnel, via WhatsApp. Faire comme si ça n'existait pas ne protège personne. Ce qu'un article BYOD doit couvrir :

| Point | Ce qu'il faut écrire |
| --- | --- |
| Ce qui est autorisé | Contacts et échanges courants avec le client |
| Ce qui est interdit | Documents confidentiels, identifiants, données personnelles de tiers |
| Ce que l'entreprise exige | Verrouillage de l'appareil, mises à jour, effacement des données pro au départ |
| L'alternative | Un smartphone professionnel pour ceux dont le poste le justifie |

Le BYOD n'est pas une faveur, c'est un périmètre. Le définir, c'est pouvoir dire non à ce qui en sort.

## Ajout 7 : le marquage « personnel » des mails privés (§6)

En droit français, un mail reçu ou envoyé sur la messagerie professionnelle est présumé professionnel, sauf s'il est identifié comme personnel. La charte le dit et donne la méthode : un objet qui commence par « Personnel », ou un dossier nommé ainsi. Pourquoi : pendant une absence ou une enquête sur un incident, le service informatique peut avoir à ouvrir une boîte. Le marquage protège la vie privée du salarié et met l'entreprise à l'abri d'un reproche, à condition de l'avoir écrit avant.

## Ajout 8 : la formation et la sensibilisation deviennent obligatoires (§9)

La directive impose la formation des dirigeants et attend qu'elle descende jusqu'au poste de travail. La charte transforme donc la campagne de sensibilisation en obligation : simulations de phishing, bannières d'alerte sur les mails externes, modules de formation. Participer n'est plus une option. Chez nous, la campagne se mettait en place à l'automne 2024 ; la charte est arrivée en même temps, pour que la règle et l'outil se présentent ensemble.

## Ajout 9 : un paragraphe NIS2 dédié (§9.1)

Un paragraphe, pas une page. Ce qu'est NIS2, pourquoi une PME industrielle est concernée (directement, ou parce que ses clients l'exigent), et ce que ça change pour le salarié : les huit ajouts ci-dessus. En français courant : si le lecteur a besoin d'un juriste pour comprendre le paragraphe, il ne le lira pas.

## Récapitulatif

| Ajout | Article | Ce que ça change pour le salarié |
| --- | --- | --- |
| 1 | Page de révision | Il sait quelle version il a signée |
| 2 | §3.2 NIS2 et PRA | L'ordre de reprise est décidé par le plan |
| 3 | §3.3 Journaux, vie privée, périphériques | Il sait ce qui est enregistré et ce qui est interdit |
| 4 | §3.4 Sanctions et signalement | Il signale tout, tout de suite, sans crainte |
| 5 | §4 Mot de passe | Il en est responsable, avec un outil fourni |
| 6 | §5 BYOD | Son smartphone perso a un périmètre |
| 7 | §6 Marquage « personnel » | Ses mails privés sont protégés s'il les marque |
| 8 | §9 Sensibilisation | La formation est obligatoire |
| 9 | §9.1 NIS2 | Il comprend pourquoi tout ça |

## Faire signer, puis faire vivre

Une charte révisée se signe à l'embauche et à chaque révision, par tout le monde, direction comprise. Traduisez-la pour les collègues non francophones : une règle qu'on ne peut pas lire n'engage personne. Ensuite, citez l'article quand vous refusez quelque chose, et relisez-la tous les ans depuis la page de révision.

:::caution[Je ne suis pas juriste]
Je ne suis pas juriste. Ces ajouts formalisent ce que nous faisons ; la rédaction finale relève de la RH et, si possible, d'un conseil. Une charte qui n'a pas suivi le circuit du règlement intérieur est un beau document sans valeur.
:::

## Pour aller plus loin

- [NIS2 quand le service informatique, c'est vous](/blog/nis2-quand-le-service-informatique-cest-vous/) : le contexte, et pourquoi la conformité ne se résume pas à un document.
- [Auditer un fournisseur SaaS et exiger un plan de remédiation](/docs/dsi/auditer-un-fournisseur-saas-et-exiger-un-plan-de-remediation/) : l'autre versant de NIS2, la chaîne d'approvisionnement.
- [MFA obligatoire avec TOTP dans Vaultwarden](/docs/cybersecurite/mfa-obligatoire-avec-totp-dans-vaultwarden/) : l'outil derrière l'ajout 5.
- La directive elle-même, [sur EUR-Lex](https://eur-lex.europa.eu/eli/dir/2022/2555/oj), et [la page NIS2 de l'ANSSI](https://cyber.gouv.fr/la-directive-nis-2).

<!-- source : mail « charte informatique à jour », 2024-11-21 ; rapport pour l'assureur cyber, 2024-10-15 ; réponse à une charte de sécurité client, 2024-10-14 -->

---
title: "Auditer un fournisseur SaaS et obtenir un plan de remédiation"
description: "Ce que vous pouvez vérifier sans intrusion sur la plateforme d'un éditeur, les questions à poser avec les preuves attendues, le rapport de constats et la demande de plan de remédiation daté. Méthode de juin 2026."
published: 2026-06-05
category: dsi
tags: [saas, fournisseurs, nis2, rgpd, audit, remediation]
level: intermédiaire
status: à jour
featured: false
sidebar:
  label: "Auditer un fournisseur SaaS et obtenir un plan…"
---

En janvier 2026, un client industriel m'a envoyé son questionnaire de sécurité fournisseur, estampillé
NIS2. J'y ai répondu honnêtement, c'est-à-dire majoritairement « non ». En juin, j'ai fait la même chose
dans l'autre sens : audit de la plateforme SaaS d'un éditeur qui héberge une partie de nos données, rapport
de constats, demande de plan de remédiation daté.

Ce n'est pas de la vengeance, c'est de la chaîne. Ce que mes clients exigent de moi, je dois l'exiger de
mes fournisseurs, sinon mes réponses ne valent rien. Comme votre banque : elle vous demande d'où vient
l'argent parce que quelqu'un le lui demande à elle.

Je ne nommerai pas l'éditeur : la méthode compte plus que le nom, et il a répondu, ce qui était l'objectif.

## Prérequis

- Le contrat et l'accord de traitement des données (article 28 du RGPD), pour savoir ce qui est promis.
- La liste de ce que la plateforme contient réellement : quelles données, pour quel usage, avec quelle
  criticité si elles fuient ou disparaissent.
- Un périmètre écrit de ce que vous allez tester : sur la surface publique, sans autorisation, vous restez
  passif.
- Une journée : moitié vérifications, moitié rédaction.

## Cadrer ce que vous avez le droit de tester

Vos données sont à vous ; leurs serveurs ne le sont pas. Sans autorisation écrite de l'éditeur, ni scan de
ports ni scanner de vulnérabilités sur ses hôtes. Sans risque : lire ce que le DNS et le TLS annoncent
publiquement, observer les en-têtes HTTP renvoyés à votre navigateur, tester le comportement de votre
propre compte. Pour aller plus loin, demandez le rapport de leur dernier test d'intrusion : c'est à eux de
le faire faire.

:::danger
Un scan non autorisé sur l'infrastructure d'un tiers est une intrusion, même avec de bonnes intentions.
Restez sur ce qui est passif, ou obtenez l'accord par écrit.
:::

## Vérifier la surface publique

Quatre commandes suffisent pour un premier constat, avec le domaine de l'éditeur à la place de l'exemple :

```bash title="Vérifications passives sur une plateforme SaaS"
dig +short TXT example.com
dig +short TXT _dmarc.example.com
openssl s_client -connect app.example.com:443 -servername app.example.com </dev/null 2>/dev/null | openssl x509 -noout -dates -issuer
curl -sI https://app.example.com | grep -iE 'strict-transport|content-security|x-frame|set-cookie|^server'
```

À noter : SPF et DMARC (un éditeur qui envoie des notifications sans DMARC facilite l'usurpation de ses
propres mails) ; expiration et émetteur du certificat ; HSTS et politique de sécurité de contenu ; un
en-tête `Server` qui annonce une version ; des cookies de session sans `Secure` ni `HttpOnly`. Pour un
rapport TLS complet, `testssl.sh` fait le tour des protocoles et suites acceptées.

## Tester depuis votre propre compte

Sur votre compte, vous êtes chez vous :

- si l'authentification multifacteur existe, et si elle peut être rendue obligatoire pour vos utilisateurs ;
- si l'authentification unique via votre annuaire (Entra ID ou autre) est proposée ;
- la politique de mots de passe et la durée de session ;
- la séparation des rôles : un utilisateur standard peut-il voir les données des autres, exporter, supprimer ?
- l'export de vos données dans un format exploitable, autrement dit la réversibilité ;
- l'existence d'un journal d'audit consultable : qui a fait quoi, quand ;
- la durée de vie des liens de partage, s'il y en a.

## Poser les questions organisationnelles

La technique visible ne dit rien de l'organisation derrière. Ces questions se posent par écrit, chacune
avec la preuve attendue. Une réponse sans preuve est une intention.

| Thème | Question | Preuve attendue |
| --- | --- | --- |
| Hébergement | Où sont les données, chez quel hébergeur, sous quelle juridiction ? | Clause contractuelle, attestation d'hébergement |
| Sauvegarde | Fréquence, rétention, dernier test de restauration | Rapport de test daté |
| Incident | Délai de notification au client en cas d'incident | Procédure écrite |
| Accès | MFA pour les administrateurs, revue périodique des comptes | Politique, extrait de revue |
| Correctifs | Délai d'application d'un correctif critique | Politique de patching |
| Sous-traitants | Liste des sous-traitants ultérieurs et leur localisation | Liste à jour, notification en cas de changement |
| Test d'intrusion | Date du dernier, par qui, constats clos ou non | Synthèse du rapport |
| Réversibilité | Format d'export, délai, suppression après résiliation | Clause, procédure |
| Journalisation | Ce qui est tracé, combien de temps, accès client | Échantillon de journal |

Sur la sauvegarde, l'éditeur audité m'a répondu trente jours de rétention. C'est une réponse : on peut
juger si c'est suffisant pour l'usage, et sinon en faire un constat.

:::note
La NIS2 fixe des délais de notification aux autorités pour les entités concernées : une alerte précoce sous
24 heures, une notification sous 72 heures. Votre fournisseur n'est pas forcément dans le périmètre, mais
si vous l'êtes, ou si vos clients le sont, ses délais deviennent les vôtres. Écrivez-les dans le contrat.
:::

## Rédiger le rapport de constats

Le rapport tient en quelques pages et suit toujours la même structure : contexte, méthode, constats,
demandes.

Le **contexte** rappelle pourquoi vous auditez : exigences de vos propres clients, NIS2, RGPD, contrôle des
tiers. Pas de la politesse : ce qui donne à l'éditeur une raison de répondre vite.

La **méthode** liste ce qui a été testé, quand, depuis où, avec quel compte, et ce qui n'a pas été testé.

Chaque **constat** suit le même format :

```text title="Format d'un constat"
C-03 — Cookies de session sans attribut Secure — Majeur
Observation : réponse HTTP du 2026-06-02, en-tête Set-Cookie sans Secure ni HttpOnly.
Risque : vol de session en cas d'interception ou de script injecté.
Recommandation : positionner Secure, HttpOnly et SameSite sur tous les cookies d'authentification.
Preuve attendue : capture de l'en-tête après correction.
```

Trois niveaux suffisent : critique, majeur, mineur. Un constat sans preuve ne va pas dans le rapport.

## Exiger un plan de remédiation

C'est ce qui distingue un audit d'un mail de plainte. Pour chaque constat, quatre choses : une action, un
responsable côté éditeur, une date, la preuve qui sera fournie. Plus un délai de réponse pour le plan
lui-même.

```text title="Trame de la demande jointe au rapport"
Objet : rapport d'audit de la plateforme — demande de plan de remédiation

Vous trouverez ci-joint le rapport de constats établi le <date> sur la plateforme <nom>.
Ces vérifications s'inscrivent dans le contrôle de nos fournisseurs, exigé par nos propres clients
(questionnaires NIS2) et par nos obligations RGPD en tant que responsable de traitement.

Nous vous demandons, sous <délai> :
- pour chaque constat, l'action retenue, le responsable, la date cible et la preuve qui sera transmise ;
- vos réponses aux questions organisationnelles du chapitre 4, avec les documents demandés ;
- la date de votre dernier test d'intrusion et la synthèse de ses conclusions.

Nous restons disponibles pour un échange technique afin de préciser tout constat.
```

Ton ferme et factuel : vous n'êtes pas là pour gagner mais pour obtenir une réponse, et vous aurez encore
besoin de cet éditeur l'année prochaine.

La réponse va ensuite dans votre registre des fournisseurs, avec les dates : c'est ce que le questionnaire
de votre client vous demandera de montrer.

## Et quand c'est vous qui recevez le questionnaire

Le questionnaire NIS2 de janvier m'a appris la méthode inverse. Seul à l'IT, on ne coche pas « oui »
partout, on trie :

- **ce qui est réel** : tout est hébergé sur site, les données restent en France, EDR supervisé par un SOC,
  antispam, sauvegardes ;
- **ce qui est structurellement impossible seul** : séparation des rôles, astreinte, revue à quatre yeux.
  Comme je l'ai écrit à notre responsable commercial, rien que le fait d'être seul ne respecte pas la norme ;
- **ce qui peut être normé sur papier** en attendant : un référentiel des salariés aligné entre la GPAO et
  l'annuaire, des procédures écrites ;
- **ce qu'un prestataire couvre** : le durcissement des interfaces des machines, côté produit, est passé par
  l'intégrateur.

Un « non » honnête vaut mieux qu'un « oui » qu'un audit contredira, et il vous donne au passage votre
propre plan de remédiation.

## Les pièges

- **Scanner sans accord.** Passif, ou écrit.
- **Accepter « nous sommes certifiés » comme réponse à tout.** Demandez le périmètre de la certification :
  il exclut souvent la plateforme que vous utilisez.
- **Ne pas relancer.** Les dates du plan vont dans votre agenda, pas dans le leur.
- **Le faire une fois.** À refaire à chaque renouvellement et après chaque incident, chez eux ou chez vous.

## Pour aller plus loin

- [NIS2 : quand le service informatique, c'est vous](/blog/nis2-quand-le-service-informatique-cest-vous/) :
  le questionnaire de janvier, raconté.
- [Mettre à jour sa charte informatique pour NIS2](/docs/dsi/mettre-a-jour-sa-charte-informatique-pour-nis2/) :
  la partie « normer sur papier ».
- [Phishing depuis un compte fournisseur compromis](/docs/cybersecurite/phishing-depuis-un-compte-fournisseur-compromis/) :
  ce qui arrive quand le maillon d'à côté lâche.

<!-- source : mails « Audit plateforme SaaS fournisseur », 2026-06-03 ; « Questionnaire fournisseur NIS2 », 2026-01-21 → 2026-02-02 ; « Alignement GPAO/AD », 2026-04-16 -->

---
title: "Annuler l'envoi d'un mail dans Outlook : le délai de grâce, et ce qu'il ne fait pas"
description: "Activer « Annuler l'envoi » dans le nouvel Outlook, connaître le plafond du délai, et comprendre pourquoi ce n'est pas la même chose que rappeler un message déjà parti."
published: 2025-11-21
updated: 2026-09-10
category: microsoft-365
tags: [outlook, microsoft-365, messagerie, bonnes-pratiques, exchange-online]
level: débutant
status: à jour
featured: false
tested_on: ["Outlook (nouveau) pour Windows"]
---

La demande arrive toujours dans la minute qui suit la bêtise : « je viens d'envoyer le mail à toute la boîte au lieu
du service, tu peux le rattraper ? ». Et la réponse honnête, c'est « ça dépend de ce que tu appelles rattraper ».

Il existe deux mécanismes différents dans Outlook, et on les confond en permanence. Le premier, c'est le **délai
d'annulation** : le message n'est pas encore parti, vous le reprenez de la main du facteur. Le second, c'est le
**rappel de message** : la lettre est déjà dans la boîte du destinataire, vous sonnez chez lui pour lui demander de
ne pas l'ouvrir. Le premier marche toujours. Le second, presque jamais quand on en a besoin.

Cette fiche traite du premier, en cinq minutes, et explique en quoi il ne remplace pas le second.

## Activer « Annuler l'envoi » dans le nouvel Outlook

C'est un réglage par utilisateur : chacun l'active pour sa propre boîte, il n'y a rien à déployer côté serveur.

1. Ouvrir **Outlook (nouveau)**.
2. En haut à droite, cliquer sur la roue dentée **Paramètres**.
3. En bas du panneau, cliquer sur **Voir tous les paramètres d'Outlook**.
4. Aller dans **Courrier**, puis **Rédiger et répondre**.
5. Descendre jusqu'à la section **Annuler l'envoi**.
6. Choisir un délai, puis **Enregistrer**.

Le réglage s'applique à tous les messages que vous envoyez depuis cette boîte. Après un clic sur *Envoyer*, une
bannière apparaît en bas de la fenêtre avec un bouton **Annuler** : tant que le décompte tourne, rien n'est parti,
et le message revient dans la fenêtre de rédaction si vous cliquez.

## Quel délai choisir

Cinq ou dix secondes suffisent. Le but n'est pas de vous laisser le temps de relire le mail : c'est de vous laisser
le temps de reconnaître la petite décharge d'adrénaline qui suit un envoi raté. Elle arrive en deux secondes.

:::note[Le plafond a bougé]
Quand j'ai écrit cette procédure, le nouvel Outlook plafonnait à **10 secondes**, là où l'ancien Outlook permettait
des temporisations bien plus longues via une règle. Depuis janvier 2026, les options de délai du nouvel Outlook pour
Windows montent à **30 secondes**. Si vous ne voyez que 10 dans la liste, votre client n'est pas à jour.
:::

Dans l'**Outlook classique**, le mécanisme équivalent n'est pas un réglage mais une règle : *Gérer les règles et
alertes* → *Nouvelle règle* → *Appliquer la règle aux messages que j'envoie*, sans condition, avec l'action
**différer la livraison de N minutes** (jusqu'à 120). C'est beaucoup plus souple, mais c'est une règle côté client :
le message reste dans la boîte d'envoi et ne part que si Outlook tourne encore à l'échéance. Le nouvel Outlook n'a
pas d'équivalent global ; pour un message précis, utilisez la flèche à côté du bouton *Envoyer* et
**Envoyer ultérieurement**.

:::caution[Le délai est tenu par le client]
Pendant le décompte, c'est votre application qui retient le message. Fermer la fenêtre, quitter Outlook ou fermer
l'onglet dans la foulée n'est pas un scénario sur lequel je vous conseille de compter. Cliquez sur *Annuler*, ne
tentez pas de gagner du temps en fermant tout.
:::

## Ce que ce délai ne fait pas : rappeler un message

Une fois le décompte terminé, le message est remis. À partir de là, on ne parle plus d'annulation mais de **rappel
de message** (*Rappeler ce message* dans Outlook), et les limites sont sévères :

| | Annuler l'envoi | Rappeler un message |
| --- | --- | --- |
| Quand | Pendant le décompte, avant remise | Après remise |
| Le message est parti | Non | Oui |
| Destinataire externe | Sans objet | **Impossible** |
| Destinataire interne | Sans objet | Possible, sous conditions |
| Message déjà lu | Sans objet | Échec |
| Dépend du destinataire | Non | Oui |

Le rappel ne fonctionne **qu'à l'intérieur de votre organisation**. On ne rappelle pas un message parti sur
Internet, ni vers une autre organisation. En environnement hybride, on ne rappelle pas non plus un message envoyé
depuis une boîte cloud vers une boîte Exchange restée sur site. Et même dans le cas favorable, le rappel échoue si
le destinataire a déjà ouvert le message, ou si une règle l'a déplacé hors de sa boîte de réception.

Autrement dit : le rappel n'est pas un bouton d'effacement, c'est une demande polie adressée à un serveur qui fera
ce qu'il peut, et qui enverra un rapport disant s'il a réussi. Ne construisez aucune procédure interne dessus.

:::danger[Un mail sensible parti à l'extérieur est un incident, pas un problème d'Outlook]
Pièce jointe confidentielle envoyée au mauvais client, fichier de paie parti à toute l'entreprise, mot de passe
écrit en clair : arrêtez de chercher un bouton. Prévenez le service informatique tout de suite, et le responsable
concerné. Selon les données, il y a une notification à faire, et le délai commence à courir au moment de l'envoi,
pas au moment où vous vous décidez à en parler.
:::

## Les trois réflexes qui marchent mieux que le délai

Le délai de grâce rattrape un envoi sur dix. Le reste se joue à la rédaction :

- **Écrire les destinataires en dernier.** Rédigez le corps, joignez le fichier, relisez, et seulement ensuite
  remplissez le champ *À*. Un mail sans destinataire ne part pas tout seul.
- **Joindre la pièce avant d'écrire « ci-joint ».** C'est bête, ça évite la moitié des relances.
- **Se méfier de « Répondre à tous ».** C'est le bouton qui fait le plus de dégâts dans une PME, et aucun délai de
  10 secondes ne vous sauvera d'un fil de trente personnes.

Et pour tout ce qui ne doit pas circuler par mail — mots de passe, clés, accès — le bon réflexe n'est pas d'écrire
vite puis d'annuler : c'est de ne jamais l'écrire dans un mail, et d'utiliser un lien à usage unique depuis le
gestionnaire de mots de passe.

## Pour aller plus loin

- Les réflexes à diffuser aux utilisateurs, dont celui-ci :
  [Fiches d'hygiène numérique pour les utilisateurs](/docs/cybersecurite/fiches-dhygiene-numerique-pour-les-utilisateurs/).
- Quand le message part mais se fait bloquer en route :
  [Pièce jointe sortante bloquée, lire un NDR 554 5.6.4](/docs/microsoft-365/piece-jointe-sortante-bloquee-lire-un-ndr-554-5-6-4/).
- Référence Microsoft :
  [Rappel de message basé sur le cloud](https://learn.microsoft.com/exchange/mail-flow-best-practices/work-with-cloud-based-message-recall).

<!-- source : procédure « Activer Annuler l'envoi dans Outlook New » diffusée aux utilisateurs, 2025-11-21 -->

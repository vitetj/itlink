---
title: "Phishing venant d’un compte fournisseur compromis : la check-list côté Entra ID et Exchange Online"
description: "Signature vraie, domaine tiers dans le lien, faute dans le nom : le mail venait bien de votre fournisseur, mais pas de lui. Comment le reconnaître, quoi lui demander de vérifier, et quoi dire à vos utilisateurs."
published: 2026-07-29
category: cybersecurite
tags: [phishing, entra-id, exchange-online, hornetsecurity, incident, communication]
level: intermédiaire
status: à jour
featured: false
tested_on: [Microsoft 365, Exchange Online, Entra ID, Hornetsecurity Email Protection]
sidebar:
  label: "Phishing venant d’un compte fournisseur compromis"
---

Fin juillet 2026, un mail arrive d'un fournisseur habituel. L'adresse est la bonne, la signature est cohérente
avec tous les échanges précédents. Trois détails clochent : le sujet ne ressemble à rien de ce que ce
fournisseur nous envoie d'habitude, le lien pointe vers un formulaire hébergé sur un domaine sans rapport avec
lui, et le nom de l'expéditeur comporte une coquille que la personne réelle n'aurait jamais faite dans son
propre nom.

Ce n'est pas une usurpation. Rien à redire côté authentification : le message sort des vrais serveurs du
fournisseur. Quelqu'un est entré dans sa boîte et envoie depuis là. C'est la différence entre un cambrioleur
qui force la porte et un cambrioleur qui a les clés : le second ne déclenche aucune alarme à l'entrée, et il
faut le repérer à ce qu'il fait une fois à l'intérieur.

Ce qui suit, c'est ce que j'ai fait le jour même, dans cet ordre : qualifier, bloquer chez nous, écrire au
fournisseur avec une liste de vérifications précises, puis alerter les utilisateurs en français et en
espagnol.

## Reconnaître un compte compromis plutôt qu'une usurpation

| Indice | Usurpation classique | Compte compromis |
| --- | --- | --- |
| Adresse d'expédition | Domaine ressemblant, ou domaine gratuit | Le vrai domaine, le vrai compte |
| SPF / DKIM / DMARC | Souvent en échec ou absents | Passent, puisque le mail sort des vrais serveurs |
| Signature | Approximative ou copiée d'un vieux mail | Exacte, à jour |
| Sujet et ton | Génériques | Inhabituels pour ce contact, mais crédibles |
| Lien | Domaine piégé évident | Formulaire sur un service tiers légitime, détourné |
| Détail qui trahit | À peu près tout | Une coquille, une heure d'envoi, une tournure |

Face à un compte compromis, votre filtre de messagerie n'a presque rien à quoi se raccrocher, à part le lien.
Chez moi, c'est la protection des liens de la passerelle Hornetsecurity qui a bloqué la destination, ce qui a
limité l'incident à une alerte. C'est exactement pour ce cas que la réécriture des liens existe, et c'est
pour ça que je la défends quand un utilisateur trouve les liens réécrits « moches ».

## Bloquer et vérifier de votre côté

Avant d'écrire à qui que ce soit, sécurisez votre périmètre :

1. Bloquez l'URL du formulaire dans votre passerelle si ce n'est pas déjà fait automatiquement, et vérifiez
   dans le suivi des messages (Email Live Tracking ou équivalent) qui a reçu le mail.
2. Recherchez toutes les occurrences du message dans le tenant. Dans le portail Defender, l'Explorateur de
   menaces (ou « Détections en temps réel » avec le Plan 1) permet de retrouver les copies par expéditeur et
   sujet, puis de les supprimer des boîtes.
3. Si quelqu'un a saisi des identifiants, traitez ce compte-là comme compromis : réinitialisation du mot de
   passe, révocation des sessions, vérification des règles de boîte. Les mêmes commandes que plus bas,
   appliquées chez vous.

:::danger
Ne répondez pas au mail suspect, même pour prévenir. Le compte est entre les mains de l'attaquant : votre
réponse lui confirme que le message a été lu et lui offre un fil de discussion crédible pour relancer. Passez
par un autre canal : téléphone, adresse générique du service, contact connu.
:::

## Écrire au fournisseur avec des vérifications précises

Un mail qui dit « je crois que vous êtes piratés » finit dans une boîte partagée et n'en sort pas. Un mail qui
liste les indicateurs et dit exactement quoi vérifier a une chance d'atterrir chez quelqu'un qui sait quoi en
faire. Le mien contenait trois blocs : les indicateurs observés (sujet, domaine du lien, coquille dans le
nom), ce que nous avions fait (lien bloqué de notre côté), et la liste de contrôles ci-dessous, que leur
informaticien pouvait dérouler en une demi-heure.

### Journaux de connexion Entra ID

Dans Entra ID, ouvrez les journaux de connexion de l'utilisateur concerné et cherchez les pays inhabituels,
les adresses IP inconnues et surtout les connexions par protocoles hérités (IMAP, POP, SMTP authentifié), qui
contournent le MFA.

### Couper l'accès de l'attaquant

Réinitialiser le mot de passe ne suffit pas : les jetons de session restent valides. Il faut révoquer les
sessions, puis vérifier que le MFA est bien actif et qu'aucune méthode d'authentification inconnue n'a été
ajoutée au compte.

```powershell title="Révoquer les sessions d'un compte compromis"
Connect-MgGraph -Scopes User.RevokeSessions.All
Revoke-MgUserSignInSession -UserId utilisateur@example.com
```

### Règles de boîte et transferts automatiques

C'est le contrôle le plus souvent oublié, et le plus utile. Un attaquant qui a pris pied dans une boîte crée
presque toujours une règle qui déplace ou supprime les réponses, pour que le propriétaire ne voie pas ce qui
se passe, et parfois un transfert vers une adresse externe pour continuer à lire après avoir perdu l'accès.

```powershell title="Chercher les règles et transferts suspects"
Connect-ExchangeOnline

Get-InboxRule -Mailbox utilisateur@example.com |
  Format-List Name, Enabled, ForwardTo, ForwardAsAttachmentTo, RedirectTo, DeleteMessage

Get-Mailbox utilisateur@example.com |
  Format-List ForwardingAddress, ForwardingSmtpAddress, DeliverToMailboxAndForward
```

Toute règle dont le nom est vide, un point ou une suite de caractères sans sens, qui supprime des messages ou
transfère vers l'extérieur, doit être supprimée. Un transfert SMTP vers une adresse inconnue au niveau de la
boîte elle-même est encore plus parlant.

### Consentements OAuth

Dans Entra ID, **Applications d'entreprise**, vérifiez les applications auxquelles l'utilisateur a récemment
accordé un consentement. Une application inconnue avec un droit de lecture sur la messagerie est une porte
dérobée qui survit au changement de mot de passe.

### Messages envoyés et destinataires

Depuis le portail Defender, rechercher tout ce que le compte a envoyé pendant la période suspecte, purger ce
qui peut l'être, et prévenir les destinataires. C'est au fournisseur de le faire pour ses contacts ; vous,
vous vous occupez des vôtres avec l'étape précédente.

## Alerter les utilisateurs sans crier au loup

L'alerte interne est partie en français et en espagnol, pour les deux sites concernés. Elle tenait sur un
écran, avec une liste de réflexes du type :

- **À faire** : ne pas ouvrir le lien, supprimer le mail, signaler tout message reçu du même contact depuis
  la veille, prévenir l'IT si un formulaire a été rempli.
- **À ne pas faire** : répondre au mail, le transférer à des collègues « pour vérifier », appeler le numéro
  indiqué dans le mail.

:::note
Au moment de l'envoi, le fournisseur n'avait pas encore répondu et son site web était indisponible, ce qui
est en soi un indice. J'ai donc écrit que l'incident n'était « pas confirmé officiellement ». Dire ce qu'on
sait, et seulement ce qu'on sait, c'est ce qui permet d'être cru la fois suivante.
:::

Ne nommez personne dans l'alerte : ni la personne du fournisseur dont le compte a servi, ni le collègue qui a
signalé le mail. La première est une victime, le second doit avoir envie de recommencer.

## Pour aller plus loin

- [SPF, DKIM et DMARC derrière une passerelle de filtrage](/docs/cybersecurite/spf-dkim-dmarc-derriere-une-passerelle-de-filtrage/),
  pour comprendre pourquoi ces contrôles ne vous protègent pas d'un compte réellement compromis.
- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/),
  pour l'alerte interne.
- [Un poste isolé par l'EDR : que faire, dans quel ordre](/docs/cybersecurite/poste-isole-par-l-edr-que-faire/),
  la suite logique si quelqu'un a cliqué.

<!-- source : mails « phishing » au fournisseur et alerte interne FR/ES, 2026-07-28 ; « Alerte sécurité – Suspicion de compromission de compte de messagerie », 2026-07-28 -->

---
title: "Transférer une boîte partagée vers un alias externe « plus-adressé » avec une règle de flux Exchange Online"
description: "Un éditeur de dématérialisation impose une adresse de collecte du type collecte+client@editeur.tld. L'interface d'Exchange Online n'aime pas le « + » et l'éditeur lit le mauvais en-tête. Enveloppe, To:, redirection : ce qui marche."
published: 2026-06-12
updated: 2026-09-08
category: microsoft-365
tags: [exchange-online, regle-de-flux, smtp, dematerialisation, powershell, boites-partagees]
level: avancé
status: à jour
featured: false
tested_on: ["Exchange Online"]
sidebar:
  label: "Transférer une boîte partagée vers un…"
---

Le service comptable passe à la dématérialisation des factures fournisseurs. L'éditeur retenu explique le principe :
« faites envoyer toutes vos factures à `collecte+votreidentifiant@editeur.tld`, notre plateforme les récupère et les
rattache à votre dossier grâce à la partie après le `+` ». Sur le papier, c'est élégant : une seule adresse de collecte
pour tous les clients, et le sous-adressage (le `+`, normalisé par la RFC 5233) sert de clé de tri.

Sauf que je ne vais pas demander à trois cents fournisseurs de changer leur carnet d'adresses. Les factures continuent
d'arriver sur `factures@example.com`, une boîte partagée, et c'est elle qui doit transmettre. Un transfert, donc. Trois
mois plus tard, le dossier n'était toujours pas clos, et je n'ai jamais autant galéré pour un simple transfert. Ce
qui suit est ce que j'ai compris en chemin, et les trois façons de faire, avec leurs limites.

## Enveloppe et en-têtes : le point qui change tout

Un mail, c'est une lettre dans une enveloppe. Sur l'enveloppe, il y a l'adresse que lit le facteur : en SMTP, c'est le
`RCPT TO`, l'enveloppe. Dans la lettre, en haut, il y a l'adresse que lit le destinataire : c'est l'en-tête `To:`. Les
deux sont souvent identiques, mais rien ne l'impose.

Quand Exchange Online transfère ou redirige un message, il réécrit l'enveloppe : le facteur porte bien la lettre à
`collecte+client@editeur.tld`. Mais il ne touche pas à la lettre : l'en-tête `To:` contient toujours
`factures@example.com`. Si la plateforme de l'éditeur identifie le client en lisant le `To:` au lieu de l'enveloppe,
elle voit une adresse qu'elle ne connaît pas et rejette la facture. C'est exactement notre cas.

| Méthode | Enveloppe (`RCPT TO`) | En-tête `To:` | Copie gardée dans la boîte |
|---|---|---|---|
| Transfert de boîte (`ForwardingSmtpAddress`) | Alias avec `+` | Inchangé | Oui, avec `DeliverToMailboxAndForward` |
| Règle de flux « Rediriger » | Alias avec `+` | Inchangé | Non, sauf action Cci en plus |
| Règle de flux « Cci » | Alias avec `+` (copie) | Inchangé | Oui |
| Contact de messagerie externe comme cible | Alias avec `+` | Inchangé | Selon la méthode qui l'utilise |

Aucune de ces méthodes ne réécrit le `To:`. Si l'éditeur ne sait lire que cet en-tête, la solution n'est pas chez vous.

## Prérequis

- Le module Exchange Online PowerShell, connecté avec un rôle Organization Management.
- L'adresse cible exacte fournie par l'éditeur, `+` compris.
- Une boîte de test hors du tenant où vous pouvez lire les en-têtes bruts d'un message reçu.
- La réponse de l'éditeur à la question « sur quel en-tête identifiez-vous le client ? ». Posez-la avant de configurer,
  pas après trois mois.

## Créer la boîte partagée

Si elle n'existe pas encore :

```powershell
Connect-ExchangeOnline
New-Mailbox -Shared -Name "Factures" -PrimarySmtpAddress factures@example.com
```

## Option A : le transfert de boîte

C'est la méthode la plus simple, et elle suffit si l'éditeur lit l'enveloppe. Le `+` passe sans problème en
PowerShell ; c'est l'interface graphique qui le refuse ou le tronque par moments, d'où la ligne de commande.

```powershell title="Transfert avec copie locale"
Set-Mailbox -Identity factures@example.com `
  -ForwardingSmtpAddress "smtp:collecte+client@editeur.tld" `
  -DeliverToMailboxAndForward $true
```

:::caution[Transfert externe bloqué par défaut]
Depuis 2020, la stratégie de courrier indésirable sortant d'Exchange Online bloque le transfert automatique vers
l'extérieur. Sans exception, le message repart en NDR `5.7.520 Access denied, Your organization does not allow
external forwarding`. Créez une stratégie dédiée à cette boîte plutôt que d'ouvrir la vanne pour tout le monde :

```powershell
New-HostedOutboundSpamFilterPolicy -Name "Transfert externe factures" -AutoForwardingMode On
New-HostedOutboundSpamFilterRule -Name "Transfert externe factures" `
  -HostedOutboundSpamFilterPolicy "Transfert externe factures" -From factures@example.com
```
:::

## Option B : la règle de flux

La règle de flux (règle de transport) agit au niveau de l'organisation, avant la remise dans la boîte. Elle a deux
avantages : elle n'est pas soumise aux règles de boîte de réception que l'utilisateur pourrait modifier, et elle se
lit dans un seul endroit quand on cherche pourquoi un mail est parti ailleurs.

```powershell title="Redirection vers l'alias de collecte"
New-TransportRule -Name "Factures vers dematerialisation" `
  -SentTo "factures@example.com" `
  -RedirectMessageTo "collecte+client@editeur.tld" `
  -Comments "Collecte des factures fournisseurs par la plateforme de dematerialisation"
```

Avec `RedirectMessageTo`, le message ne s'arrête plus dans la boîte partagée. Si la comptabilité veut garder un œil
dessus, préférez `BlindCopyTo`, qui envoie une copie à l'éditeur et laisse l'original dans `factures@` :

```powershell
Set-TransportRule -Identity "Factures vers dematerialisation" -RedirectMessageTo $null -BlindCopyTo "collecte+client@editeur.tld"
```

Vérifiez ce que la règle a réellement enregistré, c'est là que le `+` disparaît parfois quand on passe par l'interface :

```powershell
Get-TransportRule -Identity "Factures vers dematerialisation" | Format-List State, SentTo, RedirectMessageTo, BlindCopyTo
```

## Option C : passer par un contact de messagerie

Un contact de messagerie externe portant l'adresse avec `+` a deux intérêts : il est sélectionnable dans l'interface
graphique là où la saisie directe de l'adresse est refusée, et il apparaît dans le carnet d'adresses pour les
collègues qui veulent envoyer un document directement à la plateforme.

```powershell
New-MailContact -Name "Collecte dematerialisation" -ExternalEmailAddress "collecte+client@editeur.tld"
Set-Mailbox -Identity factures@example.com -ForwardingAddress "Collecte dematerialisation" -DeliverToMailboxAndForward $true
```

Cela ne change rien au fond : l'enveloppe porte l'alias, le `To:` reste celui d'origine. C'est un contournement de
l'interface, pas une réponse au problème d'en-tête.

## Tester et lire les en-têtes

Envoyez un mail de test à `factures@` depuis l'extérieur, puis suivez-le :

```powershell
Get-MessageTrace -RecipientAddress "collecte+client@editeur.tld" `
  -StartDate (Get-Date).AddDays(-1) -EndDate (Get-Date) |
  Format-Table Received, SenderAddress, RecipientAddress, Status
```

Un statut `Delivered` prouve que l'enveloppe est bonne et que le serveur de l'éditeur a accepté le message. Si la
plateforme le rejette ensuite, le problème est dans son traitement, pas dans votre transport.

Pour voir ce que l'éditeur voit, remplacez temporairement la cible par votre boîte de test externe, envoyez un
message, et ouvrez ses en-têtes bruts. Vous y lirez le `To:` d'origine, et les en-têtes ajoutés par Exchange Online
lors du transfert. Envoyez ce bloc d'en-têtes à l'éditeur : c'est la seule pièce qui fait avancer une discussion entre
un support de niveau 1 et un développeur.

:::tip
Si un antispam cloud filtre aussi votre flux sortant, vérifiez qu'il ne réécrit pas l'adresse de destination au
passage. Chez nous il ne le faisait pas, mais c'est une question à poser avant d'accuser Exchange Online.
:::

## Où nous en sommes

Mise à jour du 8 septembre 2026 : l'enveloppe est correcte quelle que soit l'option, la trace de message est en
`Delivered`, et la plateforme continue de rejeter les factures parce qu'elle identifie le client dans le `To:`. Le
dossier est remonté aux développeurs de l'éditeur, qui analysent les en-têtes que je leur ai transmis, et en interne à
la direction, parce que la comptabilité attend. Je serais apparemment leur seul client sur Exchange Online. J'espère
que non.

La leçon, elle, est déjà acquise : avant de choisir une plateforme qui se nourrit par e-mail, demandez à l'éditeur, par
écrit, sur quel en-tête il identifie le client. S'il répond « le To: », prévenez-le que la moitié des systèmes de
messagerie de la planète transfèrent sans le réécrire, et faites-le corriger avant de signer.

## Pour aller plus loin

- Quand le MX est chez un tiers et que le flux sortant est filtré :
  [SPF, DKIM et DMARC derrière une passerelle de filtrage](/docs/cybersecurite/spf-dkim-dmarc-derriere-une-passerelle-de-filtrage/).
- Une autre boîte partagée qui pose problème, côté sessions cette fois :
  [Résoudre l'erreur OWA 500 TooManyObjectsOpenedException](/docs/microsoft-365/owa-erreur-500-toomanyobjectsopened/).
- Référence Microsoft : [Actions des règles de flux de messagerie dans Exchange Online](https://learn.microsoft.com/exchange/security-and-compliance/mail-flow-rules/mail-flow-rule-actions).

<!-- source : fil « transfert mail alias inconnu » / « Mauvais alias », 2026-06-05 → 2026-09-08 -->

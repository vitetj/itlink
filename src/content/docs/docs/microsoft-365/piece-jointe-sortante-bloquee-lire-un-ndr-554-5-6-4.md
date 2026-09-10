---
title: "Pièce jointe sortante bloquée : lire un rapport de non-remise 554 5.6.4 et créer la bonne exception"
description: "Un technicien ne peut plus envoyer un fichier de diagnostic au constructeur. Le rapport de non-remise dit 554 5.6.4, forbidden attachment by company rule. Comment lire le NDR, identifier qui rejette, et ouvrir le bon canal."
published: 2026-09-02
category: microsoft-365
tags: [exchange-online, ndr, pieces-jointes, hornetsecurity, regle-de-flux, support]
level: débutant
status: à jour
featured: false
---

Le ticket s'appelait « collision robot ». En le lisant, on comprenait qu'un robot d'atelier était entré en collision,
que le constructeur demandait un fichier de diagnostic, et que le technicien du SAV avait « un souci de mail ». Le
vrai sujet du ticket n'était donc ni le robot ni la collision : c'était un rapport de non-remise que personne n'avait
lu jusqu'au bout.

```text title="Le passage utile du rapport de non-remise"
Action: failed
Status: 5.6.4
Diagnostic-Code: smtp; 554 5.6.4 E-Mail rejected, forbidden attachment by company rule
```

Une fois cette ligne trouvée, le diagnostic prend dix secondes : ce n'est pas le destinataire qui refuse, c'est notre
propre filtrage sortant qui a bloqué la pièce jointe. Le reste de la fiche explique comment arriver à cette ligne, et
surtout quoi faire ensuite — parce que la mauvaise réponse, « on désactive la règle », est aussi la plus rapide.

## Lire un rapport de non-remise dans le bon ordre

Un NDR (*Non-Delivery Report*, ou DSN) est un message automatique généré par un serveur de messagerie qui a renoncé à
livrer un courrier. Il est long, il est en anglais, il commence souvent par une phrase rassurante et inutile. Trois
informations comptent, dans cet ordre.

**Le code de statut étendu**, de la forme `X.Y.Z`. Le premier chiffre donne la nature : `4` = échec temporaire, le
serveur réessaiera ; `5` = échec permanent, le message ne partira jamais tel quel. Le deuxième chiffre donne la
famille : `6` désigne le **contenu du message** — donc, neuf fois sur dix, une pièce jointe. Un `5.6.x` vous dit ainsi,
avant même de lire l'anglais, que le problème est dans ce que contient le mail, pas dans l'adresse ni dans le réseau.

**Le texte qui suit le code.** C'est lui qui porte le sens réel, parce que chaque passerelle formule son propre
message. Ici, `forbidden attachment by company rule` : une règle interne, explicitement. Ne cherchez pas plus loin
qu'une lecture littérale — le code numérique classe, le texte explique.

**Le serveur qui a émis le rejet.** Cherchez les champs `Reporting-MTA` et `Remote-MTA`, ou le nom d'hôte qui précède
le code dans le `Diagnostic-Code`. S'il porte le nom de votre passerelle de filtrage, le blocage est chez vous. S'il
porte celui du domaine destinataire, il est chez lui, et vous n'avez plus rien à corriger : vous avez un mail à écrire.

| Code rencontré | Ce que ça veut dire en pratique | Où agir |
|---|---|---|
| `554 5.6.4 ... forbidden attachment` | Le filtrage de pièces jointes a rejeté le fichier | Chez vous, sur la passerelle ou la règle de flux |
| `554 5.7.1 Relay access denied` | L'expéditeur ou le domaine n'est pas reconnu par la passerelle | Chez vous, synchronisation des domaines et alias |
| `554 5.4.14 Hop count exceeded` | Boucle de routage entre deux organisations | Sur les connecteurs, des deux côtés |
| `4.x.x` | Rejet temporaire, réessai en cours | Nulle part : attendre avant d'agir |

:::tip
Demandez toujours le **rapport complet**, transféré en pièce jointe, pas une capture d'écran du premier paragraphe.
Les champs qui servent au diagnostic sont dans la partie technique que les utilisateurs ne lisent jamais, et qu'un
copier-coller mutile.
:::

## Confirmer le trajet du message dans Exchange Online

Avant de toucher à une règle, vérifiez ce que Microsoft 365 a fait du message. Dans le centre d'administration
Exchange : **Flux de messagerie > Suivi des messages**, en filtrant sur l'expéditeur, le destinataire et le créneau.
En PowerShell, la même chose se lit ainsi :

```powershell title="Suivre un message sortant refusé"
Get-MessageTrace -SenderAddress sav@example.com -StartDate (Get-Date).AddDays(-1) -EndDate (Get-Date) |
    Format-Table Received, RecipientAddress, Subject, Status, Size -AutoSize

Get-MessageTrace -SenderAddress sav@example.com -StartDate (Get-Date).AddDays(-1) -EndDate (Get-Date) |
    Get-MessageTraceDetail
```

Deux cas de figure, et ils n'appellent pas la même correction :

- le statut est **Failed** avec un événement de règle de transport : la règle est **dans Exchange Online**, c'est là
  qu'il faudra ajouter l'exception ;
- le statut montre une remise vers le connecteur sortant puis un échec renvoyé par la passerelle : la règle est **sur
  la passerelle de filtrage**, et modifier Exchange Online ne changera strictement rien. C'était notre cas.

Cette vérification de deux minutes évite la demi-journée classique passée à écrire une règle de flux impeccable qui
ne s'applique jamais, parce que le rejet se produit un étage plus loin.

## Choisir la réponse, dans cet ordre

Une règle de filtrage des pièces jointes sortantes n'est pas une vexation administrative. Elle existe parce qu'un
poste compromis exfiltre par mail, parce qu'une archive protégée par mot de passe traverse tous les antivirus, et
parce qu'un fichier exécutable envoyé depuis votre domaine engage votre réputation d'expéditeur. Avant de la percer,
regardez si vous en avez vraiment besoin.

1. **Le canal de dépôt.** Un service de transfert de fichiers, interne ou fourni par le constructeur, règle le
   problème sans toucher au filtrage — et passe mieux la limite de taille des pièces jointes, qui vous rattrapera de
   toute façon sur un fichier de diagnostic de machine. C'est la réponse par défaut.
2. **L'exception ciblée.** Quand le correspondant n'a pas de portail et que le besoin est récurrent, on crée une
   exception **la plus étroite possible** : un expéditeur (ou une boîte partagée), un domaine destinataire, une
   extension de fichier. Jamais « tous les utilisateurs vers tout le monde ».
3. **La levée de la règle.** Jamais. Si l'exception demandée revient à désactiver le filtrage, c'est que la demande
   est mal posée, ou que le fichier n'a rien à faire dans un mail.

:::caution
Le contournement que vos utilisateurs trouveront tout seuls : renommer le fichier en `.txt`, ou le glisser dans une
archive protégée par mot de passe. Les deux fonctionnent parfois, les deux sont exactement le comportement que le
filtrage cherche à détecter, et le second vous vaudra un signalement au SOC. Dites-le explicitement dans votre
réponse au ticket, sinon la question reviendra.
:::

## Écrire l'exception au bon endroit

Sur une passerelle de filtrage tierce, l'exception se pose dans les règles de conformité ou de contenu sortant du
panneau d'administration : périmètre expéditeur, domaine destinataire, types de fichiers autorisés. Notez la date, le
demandeur et le numéro de ticket dans le commentaire de la règle — un an plus tard, personne ne saura pourquoi elle
existe, et une règle dont on ignore la raison ne se supprime jamais.

Si le blocage vient d'Exchange Online, il s'agit d'une règle de flux, et l'exception s'ajoute dessus. En PowerShell :

```powershell title="Ajouter une exception à une règle de flux existante"
Get-TransportRule "Blocage des pieces jointes sortantes" |
    Format-List Name, AttachmentExtensionMatchesWords, ExceptIfFrom, ExceptIfRecipientDomainIs

Set-TransportRule -Identity "Blocage des pieces jointes sortantes" `
    -ExceptIfFrom "sav@example.com" `
    -ExceptIfRecipientDomainIs "example.net"
```

:::note
`Set-TransportRule` **remplace** la valeur d'un paramètre, il ne l'ajoute pas à la liste existante. Relisez la règle
avant, notez les exceptions déjà en place, et repassez-les toutes dans la commande. C'est la façon la plus courante
de supprimer sans le vouloir une exception que quelqu'un avait mise il y a deux ans.
:::

Testez ensuite avec un vrai envoi, depuis le poste de la personne qui a ouvert le ticket, et pas depuis le vôtre :
vos droits ne sont pas les siens.

## Refermer le ticket proprement

Trois lignes suffisent, et elles économisent les cinq tickets suivants : ce qui a bloqué, ce qui a été ouvert et pour
qui, et le canal à utiliser la prochaine fois. Le meilleur ticket informatique reste celui que personne n'a besoin
d'ouvrir — encore faut-il avoir dit une fois où déposer un fichier de 200 Mo destiné à un constructeur.

## Pour aller plus loin

- [Transférer une boîte partagée vers un alias externe avec une règle de flux Exchange Online](/docs/microsoft-365/regle-de-flux-transfert-vers-alias-plus-adresse/),
  pour la mécanique des règles de flux et leurs pièges.
- [SPF, DKIM et DMARC derrière une passerelle de filtrage](/docs/cybersecurite/spf-dkim-dmarc-derriere-une-passerelle-de-filtrage/),
  parce qu'un rejet sortant a souvent une cousine côté authentification.
- [WeTransfer interdit, et alors ?](/blog/wetransfer-interdit-et-alors/), sur le canal de dépôt à proposer avant de
  percer le filtrage.

<!-- source : ticket helpdesk « pièce jointe rejetée vers un constructeur », 2026-09-01 -->

---
title: "Compte invité Entra ID et erreur 53003 : quand l'accès conditionnel d'un client bloque votre connexion"
description: "Un client vous ouvre son infrastructure par package d'accès Entra, et la connexion s'arrête sur une erreur 53003. Ce que dit vraiment le code, ce qu'il faut demander à l'équipe d'en face, et pourquoi on ne dégrade jamais son propre MFA."
published: 2026-09-09
category: microsoft-365
tags: [entra-id, acces-conditionnel, b2b, cato-networks, mfa, sase]
level: avancé
status: à jour
featured: true
tested_on: [Windows 10, Windows 11, Entra ID B2B, client Cato Networks]
---

Septembre 2026. Un client industriel nous demande d'intervenir sur un logiciel installé sur l'un de ses serveurs.
Plus de VPN ouvert à la demande chez lui : désormais, l'accès prestataire passe par un package d'accès Entra ID
(Entitlement Management), un client VPN SASE et un bastion. Notre automaticien reçoit l'invitation, accepte le compte
invité, clique sur le lien, et tombe sur un mur :

```text title="Ce que voit l'invité"
Error 53003
Access has been blocked by Conditional Access policies.
Device : Windows 10 / Unregistered
Application : Azure AD Identity Governance - Entitlement Management
```

Deux réflexes possibles. Le mauvais : bricoler côté poste jusqu'à ce que ça passe, quitte à enregistrer un PC de
l'entreprise dans le tenant du client. Le bon : lire le message, comprendre de quel côté est le verrou, et renvoyer
poliment la balle à qui de droit. Cette fiche décrit le second.

## Prérequis

- Un compte invité (B2B) accepté dans le tenant du client, et l'URL du package d'accès qu'il vous a envoyée.
- Un interlocuteur technique identifié côté client : l'équipe qui administre Entra, pas l'acheteur ni le chef de projet.
  C'est le point le plus important de la liste.
- De votre côté, un poste géré, à jour, avec le MFA de **votre** tenant. Vous n'aurez rien d'autre à fournir.
- De quoi tracer par écrit : ce dossier se règle en trois allers-retours par mail, pas au téléphone.

## Comprendre ce que dit le code 53003

Le code 53003 signifie une seule chose : la connexion a été **bloquée par une stratégie d'accès conditionnel**. Il ne
dit pas laquelle, et surtout il ne dit pas que votre MFA est en cause. Le motif est dans les lignes qui suivent, et
dans notre cas il était écrit noir sur blanc : `Device : Windows 10 / Unregistered`.

Traduction : la stratégie du client exige un appareil **enregistré, joint ou conforme** dans son tenant. Un poste
d'un prestataire n'a par construction aucune de ces trois qualités. L'invitation a été acceptée, le compte invité
existe, le package d'accès a été attribué — et la stratégie tape quand même, parce qu'elle porte sur l'appareil et
pas sur l'identité.

:::note
Ne confondez pas avec les codes voisins : 53000 vise un appareil non conforme au sens Intune, 53001 un appareil non
joint au domaine. 53003 est le code générique du blocage par accès conditionnel ; c'est le texte affiché en dessous
qui donne la raison.
:::

### Trouver la stratégie fautive (et pourquoi ce n'est pas vous qui le ferez)

Les journaux de connexion vivent dans le tenant qui héberge la ressource, pas dans le vôtre. Vous ne verrez donc
rien, même en étant administrateur global chez vous. Ce que vous pouvez faire, c'est fournir à l'équipe d'en face
de quoi retrouver la trace en trente secondes :

- l'adresse du compte invité utilisée (par exemple `prenom.nom@example.com`, telle qu'invitée) ;
- l'horodatage précis de la tentative, avec le fuseau ;
- l'identifiant de requête et l'identifiant de corrélation affichés sous le message d'erreur.

Côté client, cela se lit dans **Microsoft Entra > Surveillance > Journaux de connexion**, en filtrant sur
l'utilisateur, puis dans l'onglet **Accès conditionnel** de la connexion en échec : la stratégie qui a échoué y est
nommée, avec le contrôle non satisfait. Demandez-leur cette capture. Tant que personne ne l'a regardée, tout le reste
est de la divination.

## Ne jamais dégrader son propre MFA pour satisfaire un tiers

C'est la règle, et elle n'a pas d'exception. Deux demandes reviennent systématiquement dans ce type de dossier, et
les deux se refusent.

**« Enregistrez votre PC dans notre tenant. »** Non. Un appareil enregistré ou joint devient un objet dans l'annuaire
du client : il reçoit ses stratégies, il peut être enrôlé dans sa gestion de parc, il peut être marqué non conforme,
et il peut être supprimé ou réinitialisé à distance par une équipe qui n'est pas la vôtre. Vous confiez un poste de
votre entreprise, avec les accès de votre entreprise dessus, à la gouvernance d'un tiers. Pour installer un logiciel
sur une machine-outil. C'est disproportionné, et c'est très difficile à défaire proprement.

**« Désactivez le MFA sur le compte qui se connecte. »** Non plus, et pas davantage dans l'autre sens. Nous sommes en
MFA sur notre tenant ; le client est en MFA sur le sien. Le compte invité est **son** compte, dans **son** annuaire :
c'est donc à lui de définir la méthode d'authentification forte qu'il accepte pour ses invités. Aucune urgence
commerciale ne justifie de percer un trou dans son propre socle d'authentification pour entrer chez quelqu'un
d'autre. Si la demande insiste, elle se traite par écrit, avec la direction, pas dans un fil technique.

:::caution
La phrase à ne pas prononcer, même par gentillesse : « on va faire une exception, juste pour l'intervention ».
Une exception MFA « temporaire » survit à l'intervention dans 100 % des cas, parce que personne ne se souvient de la
refermer. Si vous devez absolument créer quelque chose, créez-le avec une date de fin dans l'outil lui-même.
:::

## Les trois demandes à formuler au client

Une fois le diagnostic posé, l'essentiel du travail est de demander les bonnes choses, dans le bon ordre, à la bonne
personne.

### 1. Une stratégie d'accès conditionnel compatible avec des invités

Le client dispose de plusieurs leviers documentés, et c'est à lui de choisir :

- cibler sa stratégie sur les utilisateurs internes et exclure les **utilisateurs invités et externes**, en leur
  appliquant une stratégie dédiée qui exige le **MFA** au lieu d'un appareil conforme ;
- ou, dans **Identités externes > Paramètres d'accès entre locataires > Paramètres d'accès entrant**, activer les
  approbations : *approuver le MFA du locataire d'origine*, *approuver les appareils conformes*, *approuver les
  appareils joints hybrides*. C'est le mécanisme prévu par Microsoft exactement pour ce cas : notre MFA et la
  conformité de nos postes, évalués chez nous, sont acceptés chez eux. Personne n'enregistre le poste de personne.

Formulez la demande dans ces termes. « Ça ne marche pas » ne produit rien ; « pouvez-vous autoriser les invités sur
appareils non gérés, ou approuver les revendications MFA de notre locataire ? » produit une réponse.

### 2. Le sous-domaine du client sur la plateforme SASE

Deuxième mur, et celui-là ne se voit pas venir : nous utilisons **aussi** Cato Networks pour notre propre réseau. Le
client agent installé sur le poste demande le sous-domaine du locataire auquel se rattacher, de la forme
`abcdef.via.catonetworks.com`. Si l'automaticien lance simplement le client et se connecte avec le SSO habituel, il
est renvoyé vers **notre** locataire, pas celui du client, et l'accès au serveur cible n'existe évidemment pas.

Réclamez donc explicitement ce sous-domaine. Et côté poste, prévoyez de ne pas casser la connexion de l'entreprise :
profil secondaire ou machine virtuelle dédiée. Deux clients SASE concurrents sur le même Windows, c'est la panne
garantie le jour où vous êtes attendu.

### 3. L'ouverture de l'accès à l'heure convenue

Ces accès sont fermés par défaut et ouverts sur créneau. Confirmez par écrit la date, l'heure, la durée, le serveur
visé et qui ouvrira. Sans cela, vous découvrirez le jour J que le package d'accès a expiré pendant que vous discutiez
d'accès conditionnel.

## Prévoir un plan B dès le premier échange

Le service métier, lui, a une machine arrêtée et une phrase toute prête : « ça commence à devenir urgent ». Pour tenir
la ligne technique sans passer pour l'obstacle, proposez un repli en même temps que la demande :

| Option | Ce qu'elle demande au client | Quand la retenir |
|---|---|---|
| Correction de la stratégie invités | Une modification de configuration Entra | Solution cible, à demander en premier |
| Publication du seul serveur nécessaire via le portail applicatif SASE, avec un compte local | Une publication d'application, pas d'invité Entra | Quand l'accès conditionnel du client est intouchable |
| Prise en main d'un poste du client par un outil de partage d'écran | Un poste et un utilisateur disponibles | Intervention courte, encadrée, immédiate |
| Déplacement sur site | Rien, sauf du temps et des frais | Quand tout le reste échoue, ou pour une mise en service |

Les deux dernières lignes ne sont pas des défaites : ce sont des accès qui ne créent aucune dette de sécurité, et
qui mettent le coût du blocage là où il est produit.

## Les pièges rencontrés

- **Le `#` en trop dans l'URL du package d'accès.** Les liens envoyés par mail se font mutiler au copier-coller et le
  portail répond une erreur illisible. Vérifiez l'URL avant de suspecter une stratégie.
- **Deux packages d'accès successifs.** Un pour le groupe VPN, un pour l'accès applicatif : tant que le second n'est
  pas attribué, l'invité a l'impression que rien n'avance.
- **La confusion MFA / appareil.** C'est l'erreur d'analyse la plus fréquente sur un 53003, y compris côté client :
  on vous demandera de « refaire votre MFA » alors que le contrôle qui bloque porte sur l'état de l'appareil.
- **La discussion technique par téléphone.** Ce dossier a été réglé quand il est repassé à l'écrit entre équipes
  d'infrastructure, avec le message d'erreur complet en pièce jointe.

## Pour aller plus loin

- [Diagnostiquer l'état de jonction Entra d'un poste Windows](/docs/microsoft-365/diagnostiquer-jonction-entra-dsregcmd/),
  pour savoir ce que votre propre tenant sait de vos appareils avant d'en discuter avec un tiers.
- [Agent Cato en mode always-on : bypass et contrôle](/docs/reseau/agent-cato-office-mode-always-on-et-bypass-controle/),
  pour le comportement du client SASE sur un poste d'entreprise.
- [Auditer un fournisseur SaaS et exiger un plan de remédiation](/docs/dsi/auditer-un-fournisseur-saas-et-exiger-un-plan-de-remediation/),
  la même logique appliquée dans l'autre sens.
- Documentation Microsoft : [Paramètres d'accès entre locataires pour la collaboration B2B](https://learn.microsoft.com/entra/external-id/cross-tenant-access-overview).

<!-- source : mail « Logiciel trieuse – accès prestataire », 2026-09-03 → 2026-09-09 -->

---
title: "Deux agents VPN ou SASE sur le même poste : pourquoi ça ne marche pas, et quoi faire"
description: "Intervenir chez un client qui utilise le même agent SASE que vous bloque le poste. Ce que deux agents always-on se disputent, comment reconnaître le symptôme, et les trois solutions praticables."
published: 2026-09-09
category: reseau
tags: [sase, vpn, always-on, cato, prestataires, poste-de-travail]
level: intermédiaire
status: à jour
featured: false
tested_on: [Cato Client Windows, Windows 11]
---

Il y a un cas qu'aucun commercial ne mentionne quand il vous vend une plateforme SASE, et qui vous tombe dessus
le jour où vous devez intervenir chez un client : votre client utilise le même produit que vous. Deux agents
always-on, deux tenants différents, un seul poste. Ça ne marche pas, et ce n'est pas un bug qu'un support va
corriger.

Je l'ai rencontré en septembre 2026, en préparant une intervention à distance sur un serveur chez un client
industriel. La bonne nouvelle, c'est que la parade se prépare en amont et qu'elle est meilleure que le VPN
qu'on cherchait à monter au départ.

## Prérequis

- Un poste avec un agent SASE ou VPN en mode always-on déjà déployé et non désactivable.
- Un accès administrateur local, ne serait-ce que pour lire l'état des cartes réseau.
- Un interlocuteur technique côté client, avec qui il faudra parler avant l'intervention et pas pendant.

## Ce qu'un agent always-on prend en charge sur le poste

Pour comprendre le conflit, il faut voir ce qu'un agent moderne s'approprie. Ce n'est plus « un tunnel » : c'est
une bonne partie de la pile réseau du poste.

- Une **carte réseau virtuelle**, qu'il crée et surveille.
- La **route par défaut**, qu'il capture pour que tout le trafic parte dans son tunnel — sauf ce que le split
  tunnel exclut explicitement.
- La **résolution DNS**, souvent redirigée vers ses propres résolveurs pour appliquer le filtrage.
- Une **autorité de certification** installée dans le magasin du poste, pour l'inspection TLS.
- Un mécanisme **anti-tamper** qui empêche l'utilisateur, et donc l'autre agent, de le désactiver ou de reprendre
  ses réglages.

Chacun de ces cinq points est un point d'exclusivité. Un poste n'a qu'une route par défaut, qu'une chaîne de
résolution DNS efficace, et un seul processus peut gagner un bras de fer anti-tamper.

## Pourquoi deux agents ne cohabitent pas

Le résultat est prévisible dès qu'on pose les choses ainsi :

| Ressource | Ce que fait l'agent A | Ce que fait l'agent B | Résultat |
| --- | --- | --- | --- |
| Route par défaut | La capture vers son tunnel | La capture vers le sien | Le dernier qui parle gagne, l'autre perd son tunnel |
| DNS | Force ses résolveurs | Force les siens | Résolution incohérente selon le moment |
| Inspection TLS | Signe avec sa CA | Signe avec la sienne | Chaîne de certificats cassée pour l'un des deux |
| Anti-tamper | Se protège des modifications | Se protège aussi | Les deux se voient comme une menace |
| Authentification | Renvoie le SSO vers son tenant | Idem | Le portail du client vous renvoie chez vous |

Le dernier point est le plus vicieux, parce qu'il ne ressemble pas à un problème réseau. Vous ouvrez le portail
applicatif du client, et le SSO vous renvoie vers votre propre tenant. Rien n'indique la cause. On accuse le
compte, on accuse le mot de passe, on accuse le MFA, et on perd une journée.

:::caution
Ne comptez pas sur « ça passera peut-être ». Le comportement n'est ni documenté ni stable : selon l'ordre de
démarrage des services, le poste sera tantôt utilisable, tantôt totalement coupé. Un environnement non
déterministe est pire qu'une panne franche, parce qu'il donne l'illusion d'avoir été réparé.
:::

## Reconnaître le symptôme rapidement

Trois vérifications suffisent à confirmer qu'on est dans ce cas plutôt que dans une panne classique.

```powershell title="Combien de cartes virtuelles et qui tient la route par défaut"
Get-NetAdapter | Where-Object { $_.InterfaceDescription -match 'VPN|TAP|TUN|Virtual' } |
  Format-Table Name, InterfaceDescription, Status -AutoSize

Get-NetRoute -DestinationPrefix '0.0.0.0/0' |
  Sort-Object RouteMetric |
  Format-Table InterfaceAlias, NextHop, RouteMetric -AutoSize
```

Deux cartes virtuelles de deux éditeurs, ou deux routes par défaut avec des métriques qui se battent, et le
diagnostic est fait. Complétez avec la liste des services en cours d'exécution : si deux services d'agents
distincts tournent, vous savez déjà que l'un des deux perdra.

## Les trois solutions praticables

### 1. Le portail applicatif du client, dans un navigateur

C'est la meilleure, et de loin. Quand la ressource à atteindre est un serveur précis, le client la publie dans
son portail applicatif — Browser Access chez plusieurs éditeurs — avec un compte invité **local à sa plateforme**,
sans passer par son annuaire d'entreprise. Vous ouvrez une URL, vous n'installez rien, votre agent reste en place.

Les arguments à mettre dans le mail au client, parce que c'est lui qui doit accepter d'ouvrir :

- un compte nominatif dédié à l'intervenant ;
- un accès limité **uniquement** au serveur concerné ;
- **uniquement** les protocoles nécessaires à l'intervention ;
- aucune ouverture globale du réseau ;
- des règles gérées directement dans sa console, chez lui ;
- la traçabilité des connexions ;
- la désactivation immédiate de l'accès en fin d'intervention ;
- aucune dépendance à son annuaire ni à son MFA pour un compte externe ;
- aucun outil de prise en main supplémentaire à installer.

Neuf arguments, et pas un seul qui demande au client de baisser sa garde. C'est ce qui fait accepter la demande.

:::tip
Si le client et vous utilisez le même éditeur, demandez-lui l'URL **de son sous-domaine**, pas l'URL générique du
portail. L'URL générique vous renvoie sur votre propre tenant à cause du SSO, et vous repartez pour une journée
de quiproquo.
:::

### 2. La déconnexion temporaire encadrée

Si votre plateforme le permet, une règle autorise la déconnexion de l'agent pour une durée limitée. Chez moi :
clic sur **Disconnect**, saisie d'un **motif obligatoire**, coupure pendant **60 minutes**, reconnexion
automatique. C'est la soupape que j'ai mise en place pour les techniciens qui interviennent sur des installations
sans Internet, et elle sert aussi ici.

Elle a deux mérites : la traçabilité, et le fait que personne n'ait à se souvenir de réactiver quoi que ce soit.
Un agent désactivé « le temps de » est un agent qu'on retrouve désactivé six mois plus tard.

### 3. Un poste ou une machine virtuelle dédiée

Pour les interventions longues, un poste banalisé sans votre agent, ou une machine virtuelle jetable, règle le
problème par la séparation. C'est lourd, ça demande un cycle de vie propre, mais c'est la seule option quand le
client refuse le portail et exige son propre client VPN.

Ce qui n'est **pas** une solution : désinstaller votre agent pour la journée. Vous perdez la protection du poste
au moment précis où il se connecte au réseau d'un tiers, et vous démontrez à toute l'équipe que la règle est
négociable.

## Pour aller plus loin

- [Agent Cato : Office Mode qui ne s'active pas, Always-On et bypass temporaire contrôlé pour les techniciens](/docs/reseau/agent-cato-office-mode-always-on-et-bypass-controle/)
- [Accès invité Entra : erreur 53003 et conflit de tenants](/docs/microsoft-365/acces-invite-entra-erreur-53003-et-conflit-de-tenants/)
- [Diagnostiquer une résolution DNS interne cassée par un client VPN tiers ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/)

<!-- source : mails « Rappel sur le fonctionnement du nouveau VPN » et « Déconnexion temporaire disponible pour les interventions chez les clients », 2026-07-21, et fil d'accès prestataire 2026-09-03 → 2026-09-09 -->

---
title: "Déployer et configurer une appliance vCenter Server"
description: "Déploiement en deux étapes, DNS à préparer avant, deux consoles à ne pas confondre, et le piège du mot de passe root qui expire au bout de quatre-vingt-dix jours et bloque l'administration."
published: 2026-06-11
category: virtualisation
tags: [vmware, vcenter, vcsa, vami, appliance, exploitation]
level: avancé
status: à jour
featured: false
tested_on: [VMware vCenter Server Appliance]
sidebar:
  label: "Déployer une appliance vCenter Server"
---

L'appliance vCenter Server est une machine virtuelle Linux livrée clé en main. On la déploie en une heure, elle
démarre, on se connecte, et on l'oublie — jusqu'au jour où plus rien ne répond sur le port d'administration
alors que les machines virtuelles tournent parfaitement. Dans neuf cas sur dix, le mot de passe `root` de
l'appliance a expiré. C'est prévu, c'est documenté, et tout le monde se fait avoir une fois.

Cette fiche décrit le déploiement complet, puis les réglages d'exploitation qui évitent de découvrir
l'appliance en urgence deux ans après l'avoir installée.

## Prérequis

Ce sont eux qui font la différence entre un déploiement d'une heure et une journée perdue.

- **Un hôte de virtualisation joignable**, avec assez de ressources pour le gabarit visé, et un stockage
  accessible depuis cet hôte.
- **Les enregistrements DNS créés à l'avance**, en direct **et en inverse**. L'installeur vérifie que le nom
  complet de l'appliance résout vers l'adresse IP que vous saisissez, et que cette adresse résout en retour
  vers ce nom. Si l'un des deux manque, le déploiement échoue tardivement, après le transfert des disques.
- **Une adresse IP fixe**, jamais une adresse obtenue en DHCP.
- **Une source de temps fiable**, la même que celle des hôtes. Un décalage d'horloge casse l'authentification
  avant de casser autre chose.
- Le poste depuis lequel vous lancez l'installeur doit joindre l'hôte cible **et** la future adresse de
  l'appliance, sur les ports d'administration.

:::caution
Choisissez le nom complet de l'appliance en pensant au certificat que vous lui présenterez plus tard, et à la
relation d'approbation avec l'annuaire. Un renommage après coup est possible mais coûteux : ce n'est pas un
paramètre, c'est une intervention.
:::

## Étape 1 : déployer l'appliance

L'installeur fourni avec l'image d'installation fonctionne en deux temps, et le premier consiste uniquement à
poser la machine virtuelle sur l'hôte. Vous y renseignez :

- **la cible** : l'hôte de virtualisation ou un vCenter existant, avec un compte administrateur ;
- **le nom de la machine virtuelle** et le mot de passe `root` de l'appliance ;
- **le gabarit** de déploiement, du plus petit au plus grand, dimensionné par le nombre d'hôtes et de machines
  virtuelles que vous comptez gérer. Prenez la taille au-dessus si vous hésitez : elle se change ensuite, mais
  cela demande un arrêt ;
- **la taille du stockage** et la banque de données cible, avec ou sans allocation dynamique ;
- **le réseau** : groupe de ports, nom complet, adresse IP, masque, passerelle et serveurs DNS.

À la fin de cette étape, l'appliance existe et démarre, mais elle ne rend aucun service. L'installeur bascule
alors sur le port d'administration de l'appliance pour la seconde étape.

## Étape 2 : configurer les services

La seconde étape configure ce qui tourne à l'intérieur :

- **la synchronisation du temps**, par serveurs NTP ou depuis l'hôte. Préférez NTP, avec les mêmes serveurs
  que le reste de l'infrastructure ;
- **l'accès SSH**, à activer ou non. Activez-le : le jour où l'interface web ne répond plus, c'est votre seule
  porte d'entrée. Restreignez-le côté réseau plutôt que de le désactiver ;
- **le domaine d'authentification interne** et le mot de passe de son compte administrateur.

:::danger
Le domaine d'authentification interne ne doit **jamais** porter le même nom que votre domaine Active Directory.
Deux domaines homonymes provoquent des conflits d'authentification que l'on ne résout pas : on redéploie. Gardez
le nom par défaut proposé par l'installeur si vous n'avez pas de raison forte d'en changer.
:::

Une fois cette étape validée, l'appliance initialise ses services. Comptez un long quart d'heure pendant lequel
il ne faut rien interrompre.

## Les deux consoles, et pourquoi on les confond

C'est la source de malentendus la plus fréquente sur ce produit. L'appliance expose **deux interfaces web
distinctes**, qui ne servent pas à la même chose et n'ont pas les mêmes comptes.

| Interface | Ce qu'on y fait | Compte |
| --- | --- | --- |
| Client vSphere, sur le port standard HTTPS | Administrer l'infrastructure : hôtes, machines virtuelles, réseaux, stockage | Compte du domaine d'authentification ou de l'annuaire |
| Interface de gestion de l'appliance, sur le port 5480 | Administrer l'appliance elle-même : réseau, temps, sauvegarde, mises à jour, services, mots de passe | `root` de l'appliance |

Retenez la règle : **tout ce qui concerne la boîte se passe sur le port 5480, tout ce qui concerne la
virtualisation se passe ailleurs**. Et c'est bien le compte `root` du port 5480 qui expire.

## Configurer l'appliance après le déploiement

Cinq réglages à faire tout de suite, pendant que vous y êtes.

**La licence.** L'appliance démarre en évaluation. Saisissez la licence et affectez-la aux hôtes, sinon vous
découvrirez l'échéance par une alerte, en général un vendredi.

**La source d'identité.** Raccordez l'appliance à l'annuaire de l'entreprise et donnez les droits à un groupe,
jamais à des comptes nominatifs. Conservez malgré tout le compte d'administration interne : c'est votre porte
de secours quand l'annuaire est en panne — cas dans lequel vous aurez justement besoin de vCenter.

**La sauvegarde.** L'appliance sait se sauvegarder toute seule, sur un partage distant, selon une planification.
Configurez-la, et vérifiez qu'un fichier est bien produit. Une sauvegarde de VM ne remplace pas cette
sauvegarde native, parce qu'elle ne garantit pas la cohérence de la base interne.

**Le certificat.** Remplacez le certificat auto-signé par un certificat reconnu de vos postes, sous peine
d'habituer tout le monde à cliquer sur « continuer malgré l'avertissement ».

**Les alertes par courriel.** Sans destinataire configuré, les alarmes s'accumulent dans une interface que
personne n'ouvre.

## Le piège du mot de passe root de l'appliance

Le compte `root` de l'appliance a une politique d'expiration par défaut de quatre-vingt-dix jours. Quand elle
est atteinte, l'interface de gestion refuse la connexion et certains services de l'appliance ne redémarrent
plus. L'infrastructure continue de fonctionner, ce qui rend le diagnostic déroutant : les machines virtuelles
tournent, mais vous ne pouvez plus rien administrer.

La remise en état se fait depuis la console de la machine virtuelle ou en SSH. On bascule d'abord dans le shell
de l'appliance :

```bash title="Réinitialiser le mot de passe et vérifier le compteur d'expiration"
shell
passwd
chage -l root
```

`chage -l root` affiche la date du dernier changement, la date d'expiration et la durée de validité. C'est
cette sortie qui confirme que le compteur est bien reparti — un mot de passe changé sans que la date bouge, et
vous serez de retour dans trois mois.

Il reste à relancer le service de gestion de l'appliance, puis à contrôler l'état de l'ensemble :

```bash title="Relancer les services de l'appliance et contrôler"
service-control --start applmgmt
service-control --status
```

La commande d'état liste les services démarrés et arrêtés. Si plusieurs manquent à l'appel, un redémarrage
complet de l'appliance (`reboot`) est plus sûr qu'un démarrage service par service : les dépendances entre
services sont nombreuses et l'ordre compte.

:::tip
Le correctif durable ne consiste pas à noter un rappel dans l'agenda, mais à définir une politique
d'expiration explicite pour ce compte, depuis l'interface de gestion de l'appliance, et à renseigner une
adresse de notification pour être prévenu avant l'échéance. Choisissez une durée que vous tiendrez vraiment :
un compte à expiration longue mais dont le mot de passe est dans le coffre-fort vaut mieux qu'un compte à
quatre-vingt-dix jours que personne ne suit.
:::

## Vérifier avant de déclarer l'appliance en service

Quatre contrôles, dans l'ordre :

1. **Les deux interfaces répondent** sur leur port respectif, avec les comptes attendus.
2. **La résolution DNS fonctionne dans les deux sens** depuis l'appliance et vers elle.
3. **Un fichier de sauvegarde a été produit** à l'emplacement configuré, avec une date d'aujourd'hui.
4. **`chage -l root` renvoie une date d'expiration que vous avez choisie**, et elle est notée dans votre
   documentation d'exploitation au même titre que l'adresse IP.

Ce dernier point tient en une ligne dans un runbook, et c'est celui qui vous évitera un vendredi soir difficile.

## Pour aller plus loin

- [Runbook : redémarrer une infrastructure virtualisée après une coupure](/docs/windows-server/runbook-redemarrer-une-infrastructure-virtualisee-apres-coupure/)
- [Restaurer une VM cassée par une mise à jour non supportée](/docs/virtualisation/restaurer-une-vm-cassee-par-une-mise-a-jour-non-supportee/)
- [Administrer une infrastructure de postes virtuels VMware Horizon](/docs/virtualisation/administrer-une-infrastructure-vmware-horizon/)

<!-- source : procédure interne « Appliance vCenter », centre de documentation -->

---
title: "Runbook : redémarrer une infrastructure virtualisée après une coupure électrique (les DC d'abord)"
description: "Procédure d'absence pour remettre debout un cluster VMware après une coupure : VM figée dans vCenter, contrôleurs de domaine avant tout le reste, contrôle DNS et Kerberos, puis les applications."
published: 2026-08-01
category: windows-server
tags: [runbook, vcenter, vmware, active-directory, continuite, procedure]
level: intermédiaire
status: à jour
featured: false
tested_on: [VMware vCenter, VxRail, Windows Server]
sidebar:
  label: "Runbook : redémarrer une…"
---

Cette fiche est née d'une procédure d'absence. Quand le seul informaticien de la boîte part en congés, il reste
quelqu'un pour appuyer sur les boutons, et ce quelqu'un n'administre pas l'infrastructure au quotidien. Le
scénario qui fait le plus de dégâts n'est pas la panne matérielle : c'est la coupure électrique. L'onduleur tient
quelques minutes, puis tout s'éteint, puis le courant revient et les machines virtuelles redémarrent dans un
ordre que personne n'a choisi. Le serveur de fichiers cherche l'annuaire qui n'est pas encore là, l'ERP démarre
sans son DNS, et une heure plus tard tout le monde se plaint que « rien ne marche » alors que tout est allumé.

La règle tient en une phrase : les contrôleurs de domaine d'abord, tout le reste ensuite. Le DC, c'est l'accueil
de l'usine qui détient les badges et l'annuaire : si personne n'est à l'accueil, aucun autre service ne peut
laisser entrer qui que ce soit. Et une deuxième règle, qui figure telle quelle dans la procédure d'origine : en
cas de doute, mieux vaut redémarrer calmement et vérifier chaque étape plutôt que de lancer toutes les VM d'un
coup.

## Prérequis

- Un accès à vCenter avec un compte autorisé à démarrer, arrêter et réinitialiser les VM.
- Le coffre de mots de passe (Bitwarden) : les identifiants des portails et des serveurs y sont, jamais dans un
  mail ni dans un fichier sur le bureau. Pour un partage temporaire à un remplaçant, utilisez Bitwarden Send,
  qui expire tout seul.
- La liste des VM avec leur rôle, à jour, et l'ordre de démarrage décrit ci-dessous.
- Les coordonnées du prestataire d'infogérance, rangées dans le même coffre.

## Avant d'appuyer sur quoi que ce soit

Prenez deux minutes pour regarder l'état d'ensemble dans vCenter. Les hôtes du cluster doivent apparaître
**connectés** ; s'ils sont encore en train de démarrer ou en alerte, attendez qu'ils soient stables avant de
toucher aux VM. Un cluster hyperconvergé a besoin que ses nœuds se retrouvent entre eux avant de servir le
stockage ; lancer des VM pendant ce temps ne fait que rallonger l'attente.

Ensuite, faites l'inventaire de ce qui est déjà allumé. Après une coupure, certaines VM ont redémarré seules,
d'autres non, d'autres sont figées sur un écran noir. Ne redémarrez pas ce qui fonctionne.

## Redémarrer une VM figée dans vCenter

vCenter propose deux actions qui se ressemblent et qui ne font pas la même chose :

| Action | Ce qu'elle fait | Quand l'utiliser |
| --- | --- | --- |
| **Redémarrer le système d'exploitation invité** | demande à Windows de s'arrêter proprement, via VMware Tools | toujours en premier choix |
| **Réinitialiser** (*Reset*) | coupe et rallume la VM, comme débrancher la prise | seulement si la VM ne répond plus du tout |

Une VM figée qui ne réagit pas au redémarrage invité au bout de quelques minutes se réinitialise. Une VM qui
répond, même lentement, se redémarre proprement. La réinitialisation d'un serveur qui était en train d'écrire sur
son disque laisse des traces ; ce n'est pas dramatique, mais ce n'est pas gratuit non plus.

Vérifiez aussi que la carte réseau de la VM est bien **connectée** dans ses paramètres : une VM démarrée avec sa
carte déconnectée a l'air de fonctionner depuis la console et reste invisible pour le reste du réseau.

## Étape 1 : démarrer les contrôleurs de domaine

Démarrez **SRV-DC01**, puis **SRV-DC02**. Attendez que le premier soit complètement démarré avant le second, et
attendez que les deux le soient avant toute autre VM. « Complètement démarré » veut dire deux choses : vous
pouvez ouvrir une session dessus, et le DNS répond. Un DC qui affiche l'écran de connexion mais dont les services
sont encore en train de se lancer n'est pas prêt.

Ouvrez une session sur le DC et lancez ces trois contrôles :

```powershell title="Le DC est-il prêt ?"
Resolve-DnsName example.local
nltest /dsgetdc:example.local
Get-Service kdc, netlogon, dns, ntds | Format-Table Name, Status
```

| Commande | Ce qu'elle prouve | Résultat attendu |
| --- | --- | --- |
| `Resolve-DnsName` | le DNS du domaine répond | une ou plusieurs adresses des DC |
| `nltest /dsgetdc` | un DC est localisable et accepte les demandes | le nom d'un DC, sans message d'erreur |
| `Get-Service` | les quatre services de l'annuaire tournent | `Running` sur les quatre lignes |

Si un service reste en `Stopped`, attendez une minute et relancez la commande ; au premier démarrage après une
coupure, les services peuvent mettre du temps. S'il ne démarre toujours pas, redémarrez proprement le DC une fois
avant d'appeler à l'aide. Si SRV-DC01 refuse de démarrer, SRV-DC02 seul suffit à faire fonctionner le domaine :
passez à l'étape suivante et signalez le problème.

:::note
Pour la personne qui remplace l'informaticien, ces commandes suffisent. Pour l'informaticien de retour, un
`repadmin /replsummary` une fois les deux DC en ligne confirme que la réplication a repris sans erreur.
:::

## Étape 2 : démarrer les autres serveurs

Une fois les DC prêts, démarrez le reste par couches, en laissant chaque couche finir avant la suivante :

1. **Les services d'infrastructure** : DHCP, serveur d'impression, VM IAM (connecteurs et mises à jour). Sans
   DHCP, les postes qui redémarrent n'ont pas d'adresse.
2. **Les serveurs de fichiers.** Les applications y stockent leurs documents et leurs exports.
3. **Les serveurs applicatifs et l'ERP**, base de données d'abord, application ensuite quand ce sont deux VM.
4. **Tout le reste** : outils secondaires, serveurs de test.

Une VM qui a démarré d'elle-même *avant* les DC peut sembler fonctionner et refuser les connexions des
utilisateurs, ou afficher des services en erreur. Dans ce cas, redémarrez-la proprement maintenant que l'annuaire
est en ligne, plutôt que de chercher à corriger service par service.

## Étape 3 : vérifier depuis un poste utilisateur

Le vrai test ne se fait pas depuis vCenter. Depuis un poste normal :

- ouvrez une session Windows avec un compte du domaine ;
- ouvrez un partage de fichiers ;
- lancez l'ERP et la messagerie ;
- imprimez une page de test.

Si les quatre passent, envoyez un message court aux équipes pour dire que tout est revenu, et notez l'heure de la
coupure et l'heure de la reprise. Si l'un des quatre échoue, l'ordre de vérification est celui du démarrage :
DC, puis infrastructure, puis fichiers, puis application.

:::tip
Pour ne plus dépendre de l'ordre manuel, vSphere HA permet de donner aux DC une priorité de redémarrage plus
élevée qu'aux autres VM, et de conditionner le démarrage des suivantes. Ça ne remplace pas la procédure (il faut
encore vérifier), mais ça réduit le nombre de VM à relancer à la main.
:::

## Pour aller plus loin

- Pourquoi les DC ne doivent porter que l'annuaire et le DNS, ce qui rend cette procédure plus courte :
  [Tier 0 : contrôleurs de domaine et VM IAM](/docs/architecture/tier-0-controleurs-de-domaine-et-vm-iam/).
- Quand le redémarrage ne suffit pas et que la VM elle-même est abîmée :
  [Restaurer une VM cassée par une mise à jour non supportée](/docs/virtualisation/restaurer-une-vm-cassee-par-une-mise-a-jour-non-supportee/).
- Rédiger une procédure que quelqu'un d'autre suivra vraiment :
  [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/).

<!-- source : mail « Procédure absence », 2026-07-31 -->

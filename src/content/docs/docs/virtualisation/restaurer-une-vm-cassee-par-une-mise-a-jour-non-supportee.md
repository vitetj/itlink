---
title: "Restaurer une VM cassée par une mise à jour non supportée : snapshot, sauvegarde et matrice de compatibilité"
description: "Un prestataire met à jour une passerelle Mitel vers une version incompatible : softphones externes HS. Retour en service en quinze minutes avec la sauvegarde du jour, et une règle : snapshot avant toute intervention."
published: 2024-09-16
category: virtualisation
tags: [vmware, veeam, snapshot, mitel, restauration, prestataire]
level: avancé
status: à jour
featured: true
tested_on: [VMware vSphere, Dell VxRail, Veeam, Mitel MBG, Mitel MiCollab]
---

Un jeudi de septembre, le prestataire qui gère notre téléphonie Mitel se connecte pour une opération de routine sur
le MBG, le Mitel Border Gateway. C'est la passerelle qui permet aux softphones MiCollab de fonctionner depuis
l'extérieur : sans elle, un commercial en déplacement n'a plus de téléphone. L'outil de mise à jour lui propose la
dernière version disponible. Il la prend. Elle n'est pas supportée par la version de MiCollab installée.

Résultat : MBG injoignable, softphones externes muets. En interne et via le VPN, tout fonctionne, ce qui est à la
fois rassurant et trompeur, parce que les utilisateurs concernés sont précisément ceux qui sont dehors. Le
prestataire a eu l'honnêteté de le dire lui-même : il avait pris la version la plus récente sans vérifier. Ça
arrive. Ce qui compte, c'est ce qu'on a sous la main à ce moment-là. Nous avions la sauvegarde du jour, et le MBG
était de retour en service un quart d'heure plus tard. Voici la méthode, et surtout la règle qui en a découlé.

## Prérequis

- Une VM sauvegardée quotidiennement (ici Veeam, sur un cluster Dell VxRail sous vSphere), et une vérification
  récente que les points de restauration existent réellement.
- Un accès à la console de sauvegarde et à vCenter, indépendant de la VM en panne.
- Le prestataire au téléphone, et une consigne claire : plus personne ne touche à la VM tant que la décision n'est
  pas prise.

## Qualifier la panne avant d'agir

Le réflexe qui fait gagner du temps, c'est de cartographier ce qui marche et ce qui ne marche pas avant de proposer
quoi que ce soit.

| Chemin | État | Ce que ça dit |
| --- | --- | --- |
| Postes fixes internes | OK | Le cœur MiVoice est sain |
| Softphones en Wi-Fi interne ou via VPN | OK | MiCollab est sain |
| Softphones depuis Internet | HS | Seul le MBG est touché |

Une seule brique cassée, une seule VM à traiter. Ça exclut d'emblée les scénarios lourds (restaurer toute la chaîne
téléphonique) et ça borne le risque : ce qu'on va restaurer ne contient rien d'autre que la configuration du MBG.

Notez aussi l'**heure exacte** de la mise à jour. C'est elle qui déterminera le point de restauration à choisir.

:::danger
Ne laissez pas « réparer en avant ». Tenter une autre version, appliquer un correctif, relancer la mise à jour :
chaque essai éloigne la VM de son dernier état connu et allonge la panne. La question n'est pas « comment faire
marcher la nouvelle version », c'est « comment revenir à la version qui marchait ».
:::

## Choisir entre snapshot, sauvegarde et redéploiement

Le prestataire a listé trois options :

| Option | Prérequis | Durée | Ce qu'on perd |
| --- | --- | --- | --- |
| Revenir à un snapshot pris avant la mise à jour | Qu'il existe | Quelques minutes | Rien |
| Restaurer la VM depuis la sauvegarde | Une sauvegarde récente | Le temps de recopier les disques | Les changements depuis la sauvegarde |
| Redéployer l'OVA dans l'ESX puis restaurer une sauvegarde applicative (SFTP, SMB, AWS) | L'OVA de la bonne version, la sauvegarde applicative, les paramètres réseau et licences | Des heures | Tout ce qui n'est pas dans la sauvegarde applicative |

Il n'y avait pas de snapshot. Personne n'en avait fait avant l'intervention, et c'est exactement ce que la suite de
cette fiche corrige. Restait la deuxième option : la sauvegarde Veeam de la nuit précédente, antérieure à la mise à
jour, et aucune modification de configuration dans la journée. Le choix était vite fait.

## Restaurer la VM depuis la sauvegarde

Dans la console Veeam, la restauration complète d'une VM se fait en quelques écrans : **Restore**, **Entire VM
restore**, choix de la VM, choix du point de restauration (celui d'avant la mise à jour, d'où l'importance de
l'heure notée plus haut), restauration à l'emplacement d'origine.

Deux détails qui comptent :

- éteignez la VM cassée avant, ou laissez Veeam le faire ; une restauration à l'emplacement d'origine écrase les
  disques existants ;
- si vous avez un doute, restaurez **à côté** sous un autre nom, réseau déconnecté, et basculez seulement après
  vérification. Ça coûte de l'espace disque, pas du temps.

En PowerShell, pour retrouver le bon point de restauration et lancer la restauration à l'emplacement d'origine :

```powershell title="Retrouver et restaurer le point de restauration du jour (Veeam)"
$rp = Get-VBRRestorePoint -Name "MBG" | Sort-Object CreationTime -Descending | Select-Object -First 1
$rp | Select-Object VmName, CreationTime, Type
Start-VBRRestoreVM -RestorePoint $rp -Reason "MBG casse par une mise a jour non supportee"
```

Pour une VM de la taille d'un MBG, la copie des disques prend quelques minutes sur un stockage correct. Démarrage,
vérification que la console du MBG répond, puis le prestataire a resynchronisé le MBG avec MiCollab. Quinze minutes
entre la décision et le retour des softphones externes.

:::note
Le temps de restauration dépend de la taille des disques et du stockage, pas de la gravité de la panne. Une
appliance télécom revient vite ; un serveur de fichiers, non. C'est un argument de plus pour garder les appliances
petites et leur configuration dans une sauvegarde applicative à part.
:::

## Vérifier avant de crier victoire

Après restauration :

1. Le MBG est joignable depuis Internet et apparaît connecté dans MiCollab.
2. Un softphone externe passe un appel **en Wi-Fi**.
3. Le même softphone passe un appel **en 4G**.

Le point 3 n'est pas du zèle. Chez nous, le test Wi-Fi était bon et le test 4G montrait des lenteurs et des pertes.
Ce n'était pas lié à la restauration mais à un tout autre sujet, la gestion d'IPv6 sur les réseaux mobiles, que
la réinstallation de l'application iOS a en partie réglé sur le moment et que des mises à jour Mitel ultérieures
ont corrigé. Si vous ne testez qu'en Wi-Fi, vous fermez l'incident avec un problème encore ouvert.

## Instaurer la règle : snapshot avant toute intervention

La leçon tient en une ligne : **aucune intervention d'un prestataire sur une VM sans snapshot préalable**, pris par
nous, nommé avec la date et le motif. Un snapshot vSphere, c'est un point de retour instantané ; il aurait ramené
le MBG en deux minutes au lieu de quinze, sans passer par la sauvegarde.

```powershell title="Snapshot avant intervention (PowerCLI)"
Connect-VIServer vcenter.example.com
New-Snapshot -VM "MBG" -Name "avant-maj-prestataire-2024-09-12" `
  -Description "Mise a jour MBG par le prestataire telecom" -Memory:$false
```

Et parce qu'un snapshot n'est pas une sauvegarde, on le supprime une fois l'intervention validée :

```powershell title="Nettoyer après validation"
Get-Snapshot -VM "MBG" | Remove-Snapshot -Confirm:$false
```

:::caution
Un snapshot qui reste des semaines grossit, ralentit la VM et complique les sauvegardes. Validez l'intervention dans
les 48 à 72 heures, testez, puis supprimez. Le snapshot protège l'intervention, la sauvegarde protège tout le
reste.
:::

## Lire la matrice de compatibilité, et la faire lire

Mitel publie des matrices de compatibilité entre les versions de MiCollab et de MBG. L'outil de mise à jour, lui,
propose ce qui est disponible, pas ce qui est supporté par le reste de votre chaîne. La vérification est humaine, et
elle se fait avant, par écrit. Ce que je demande désormais au prestataire avant toute mise à jour :

- la version cible et la ligne de la matrice qui la déclare compatible avec nos autres composants ;
- la fenêtre d'intervention ;
- le plan de retour arrière (« snapshot pris à telle heure » suffit) ;
- les tests de validation prévus, Wi-Fi et 4G compris.

Ça prend cinq minutes à écrire et ça transforme « j'ai pris le plus récent » en « on a vérifié, on y va ». C'est
aussi la trace qui sert le jour où il faut expliquer une panne à la direction.

## Pour aller plus loin

- Les mêmes réflexes, à l'échelle de toute l'infrastructure :
  [Runbook : redémarrer une infrastructure virtualisée après une coupure](/docs/windows-server/runbook-redemarrer-une-infrastructure-virtualisee-apres-coupure/).
- Pourquoi la redondance ne remplace jamais une sauvegarde qu'on a testée :
  [RAID5 n'est pas une sauvegarde](/blog/raid5-nest-pas-une-sauvegarde/).
- Quand la téléphonie Mitel traverse un pare-feu ou un SASE, les problèmes changent de nature :
  [MiCollab, SIP et RTP derrière un SASE Cato](/docs/reseau/micollab-sip-rtp-derriere-un-sase-cato/).

<!-- source : mail « RE: MBG HS », 2024-09-12 -->

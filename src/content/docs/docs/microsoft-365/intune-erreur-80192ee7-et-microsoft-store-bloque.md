---
title: "Intune : erreur d'enrôlement 80192EE7 et Microsoft Store bloqué après passage de Windows Pro à Business"
description: "Deux pannes d'un tenant hybride fraîchement passé à Business Premium : l'enrôlement qui échoue en 80192EE7 (étendue WIP), puis le Store bloqué par une clé de registre que Windows pose et qu'Intune n'enlève jamais."
published: 2025-06-16
category: microsoft-365
tags: [intune, entra-id, jonction-hybride, microsoft-store, registre, windows-11]
level: intermédiaire
status: à jour
featured: false
tested_on: [Windows 11 Business 24H2, Microsoft 365 Business Premium, Entra Connect]
sidebar:
  label: "Intune : erreur d'enrôlement 80192EE7 et…"
---

Printemps 2025. Les licences viennent de passer de Business Standard à Business Premium, Intune est enfin
disponible, et le tenant hybride me réserve deux surprises à quelques semaines d'intervalle. D'abord,
l'enrôlement automatique échoue de façon apparemment aléatoire avec le code **80192EE7**. Ensuite, une fois
les postes correctement enrôlés, le Microsoft Store disparaît sur certains d'entre eux, sans qu'aucune
stratégie Intune ne l'interdise. Les deux problèmes ont la même racine : ce que Windows fait tout seul quand
un poste déjà joint au domaine découvre sa nouvelle licence.

## Prérequis

- Un tenant hybride : Active Directory local, Entra Connect, postes en jonction hybride. Si vous n'êtes pas
  sûr de l'état de vos postes, commencez par
  [le diagnostic dsregcmd](/docs/microsoft-365/diagnostiquer-jonction-entra-dsregcmd/) : un poste « Inscrit »
  ne s'enrôlera jamais, quelle que soit la correction ci-dessous.
- Une licence incluant Intune : Microsoft 365 Business Premium (ou EMS). Business Standard n'en fait pas
  partie.
- Un rôle administrateur Intune et Entra.
- Sur les postes : un compte administrateur local pour la partie registre.

## Partie 1 : l'enrôlement échoue avec 80192EE7

### Ce que le code veut dire

80192EE7 est un code d'enrôlement MDM assez peu bavard. Dans mon cas, il apparaissait sur des postes en
jonction hybride correcte, avec un utilisateur licencié, et pas sur tous : un jour un poste passait, le
lendemain son voisin échouait. Le TAM Microsoft 365 de mon CSP m'a mis sur la piste : le conflit entre les
deux étendues d'enrôlement automatique configurées dans Entra, **MDM** et **WIP (MAM)**.

L'analogie : vous donnez deux consignes contradictoires au même livreur. « Livrez ce poste à Intune pour la
gestion complète » (MDM) et « Livrez-le à la protection des applications sans gestion du poste » (MAM).
Windows en choisit une, pas toujours la bonne, et l'enrôlement échoue.

### Vérifier la licence de l'utilisateur

Dans le centre d'administration Microsoft 365, **Utilisateurs > Utilisateurs actifs**, ouvrez l'utilisateur
concerné et vérifiez qu'une licence incluant Intune est bien affectée et que le service **Microsoft Intune**
n'est pas décoché dans le détail des applications. Cela paraît évident, mais après une migration de licences
par lots, il reste toujours un ou deux utilisateurs encore en Standard.

### Vérifier l'étendue d'enrôlement MDM

Dans le centre d'administration Microsoft Entra : **Identité > Mobilité (MDM et MAM) > Microsoft Intune**.
L'**étendue utilisateur MDM** doit être sur **Tous** ou sur un groupe qui contient vos utilisateurs. Si vous
avez choisi un groupe, vérifiez que l'utilisateur en fait partie. Un utilisateur hors étendue ne produit pas
d'erreur explicite : il ne s'enrôle pas, c'est tout.

Vérifiez au passage **Appareils > Inscrire des appareils > Restrictions d'inscription** dans Intune : une
restriction sur la plateforme Windows ou sur les appareils personnels peut bloquer silencieusement.

### Mettre l'étendue WIP (MAM) sur « Aucun »

C'est la correction qui a réglé mon cas. Toujours dans **Mobilité (MDM et MAM) > Microsoft Intune**, l'**étendue
utilisateur WIP (MAM)** était sur « Certains » avec un groupe, sans qu'aucune stratégie de protection des
applications Windows n'existe derrière. Passez-la sur **Aucun** si vous ne faites pas de Windows Information
Protection, ce qui est le cas de la plupart des PME. Enregistrez.

:::caution
Ne laissez jamais l'étendue WIP (MAM) sur « Certains » ou « Tous » sans stratégie de protection des
applications configurée. C'est exactement la situation qui produit ce conflit, et elle ne se voit nulle part
dans les journaux côté poste.
:::

### Relancer l'enrôlement

Deux options. La rapide, sur le poste : **Paramètres > Comptes > Accès professionnel ou scolaire > Inscrire
uniquement dans la gestion des appareils**, puis connexion avec le compte de l'utilisateur. La patiente :
laisser la tâche planifiée d'enrôlement automatique, créée par la GPO « Activer l'inscription MDM automatique
à l'aide des informations d'identification Microsoft Entra par défaut », refaire son cycle.

Pour suivre le résultat sans deviner, le journal utile est
`Applications and Services Logs > Microsoft > Windows > DeviceManagement-Enterprise-Diagnostics-Provider >
Admin`. Une fois l'étendue WIP corrigée, les échecs 80192EE7 ont cessé, et j'ai pu écrire fin avril à mon
CSP : « J'ai également réussi à enfin faire fonctionner mon Intune. » Trois mois après le premier ticket.

## Partie 2 : le Microsoft Store disparaît après le passage Pro → Business

### Le symptôme

Juin 2025, sur des postes désormais bien gérés par Intune : le Microsoft Store refuse de s'ouvrir, et les
applications qui en dépendent tombent avec lui. Dans Intune, aucune stratégie de configuration ne bloque le
Store. Aucune GPO locale non plus. Un poste concerné, vérifié avec `dsregcmd /status`, est en jonction
hybride propre, TPM actif, Windows 11 Business 24H2 build 26100.4349.

### L'erreur classique : chercher une stratégie fantôme

J'ai commencé par là, et j'y ai perdu du temps : relire chaque profil de configuration Intune,
chaque ligne du catalogue de paramètres, chercher une stratégie héritée d'un test. Rien. Le réflexe « c'est
forcément le MDM » est naturel sur un poste géré. Il était faux.

### La vraie cause : une clé que Windows pose lui-même

Quand un poste **déjà joint au domaine** reçoit une licence Business Premium, Windows bascule son édition de
Pro vers Business. Au passage, il crée la clé de registre suivante, avec la valeur `RemoveWindowsStore` :

```text
HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\WindowsStore
```

Cette clé est celle qu'une GPO « Désactiver l'application Store » écrirait. Mais ici, aucune GPO ne l'a posée :
c'est le changement d'édition qui l'a laissée derrière lui. Et Intune ne la supprimera jamais, pour une raison
simple : il ne nettoie que ce qu'il a lui-même configuré. Du point de vue du MDM, cette clé n'existe pas.
C'est un peu le meuble monté par le précédent locataire : le nouveau ne le démontera pas, il ne sait même
pas qu'il est là.

### Corriger un poste à la main

1. Confirmez l'état du poste avec `dsregcmd /status` (jonction hybride attendue).
2. Ouvrez `regedit` en administrateur et allez dans `HKLM\SOFTWARE\Policies\Microsoft\WindowsStore`.
3. Supprimez la clé entière, ou au minimum la valeur `RemoveWindowsStore`.
4. Lancez `gpupdate /force` puis redémarrez. Le Store et ses applications reviennent.

En PowerShell administrateur, la même chose en deux lignes :

```powershell title="Détection puis suppression manuelle"
Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\WindowsStore'
Remove-Item 'HKLM:\SOFTWARE\Policies\Microsoft\WindowsStore' -Recurse -Force
```

:::note
Si vous utilisez réellement une GPO pour interdire le Store sur certains postes, ne supprimez pas la clé à
l'aveugle : elle reviendra au prochain `gpupdate`, et vous aurez surtout supprimé une consigne voulue.
Vérifiez d'abord avec `gpresult /h rapport.html` qu'aucune stratégie ne cible cette valeur.
:::

### Corriger tout le parc avec une remédiation Intune

Corriger un poste à la main, c'est bien. Quand tout un parc bascule d'édition au fil des affectations de
licences, c'est la raison d'être des **Remédiations** Intune (**Appareils > Scripts et remédiations**). Deux scripts : un de
détection, un de remédiation. La détection renvoie un code de sortie 1 quand la clé existe (non conforme),
0 sinon.

```powershell title="Détection : la clé WindowsStore existe-t-elle ?"
$key = 'HKLM:\SOFTWARE\Policies\Microsoft\WindowsStore'
if (Test-Path $key) {
    Write-Output "Clé WindowsStore présente : Store probablement bloqué"
    exit 1
}
Write-Output "Aucune clé WindowsStore : conforme"
exit 0
```

```powershell title="Remédiation : supprimer la clé"
$key = 'HKLM:\SOFTWARE\Policies\Microsoft\WindowsStore'
if (Test-Path $key) {
    Remove-Item $key -Recurse -Force
    Write-Output "Clé WindowsStore supprimée"
}
exit 0
```

Paramètres du package : exécution dans le contexte système (la clé est dans HKLM), PowerShell 64 bits,
planification quotidienne. Affectez-le au groupe de postes concernés et lisez le rapport de conformité le
lendemain : il vous dira combien de postes avaient la clé sans que personne ne s'en plaigne encore.

## Résumé des deux pannes

| Symptôme | Cause réelle | Correction |
|---|---|---|
| Enrôlement en échec 80192EE7, aléatoire | Étendue WIP (MAM) active sans stratégie, conflit avec l'étendue MDM | Entra > Mobilité > Intune : étendue WIP sur « Aucun » |
| Store bloqué, aucune stratégie Intune | Clé `Policies\Microsoft\WindowsStore` créée au passage Pro → Business | Supprimer la clé, à la main ou par remédiation Intune |

Dans les deux cas, la leçon est la même : sur un tenant hybride, le poste a une histoire (domaine, édition,
enregistrements passés) qu'Intune ignore. Quand le MDM « ne fait rien », regardez ce que Windows a fait avant
lui.

## Pour aller plus loin

- [Diagnostiquer l'état de jonction Entra d'un poste Windows](/docs/microsoft-365/diagnostiquer-jonction-entra-dsregcmd/),
  le préalable à toute correction d'enrôlement.
- [BitLocker : ne jamais perdre une clé de récupération, même après la suppression du device Entra](/docs/microsoft-365/cle-bitlocker-device-entra-supprime/),
  avant de céder à la tentation de supprimer un appareil pour « repartir propre ».
- [Déployer Microsoft 365 Apps avec WAPT](/docs/automatisation/deployer-microsoft-365-apps-avec-wapt/),
  l'autre canal de déploiement quand Intune n'est pas encore en place.
- Documentation Microsoft : [Remédiations dans Intune](https://learn.microsoft.com/mem/intune/fundamentals/remediations).

<!-- source : mails « Offre Working Together - TAM », 2025-01-30 ; « MAJ des licences et commande bloquée sur mon tenant », 2025-04-30 ; « Problème Intune Windows store bloqué », 2025-06-13 -->

---
title: "BitLocker : ne jamais perdre une clé de récupération, même après la suppression du device Entra"
description: "Supprimer un appareil dans Entra efface aussi sa clé BitLocker séquestrée. Où vérifier vos clés avant toute suppression, comment les re-séquestrer, et la règle des deux coffres."
published: 2025-09-19
category: microsoft-365
tags: [bitlocker, entra-id, intune, autopatch, sauvegarde, windows-11]
level: intermédiaire
status: à jour
featured: false
tested_on: [Windows 11, Microsoft Intune, Windows Autopatch, jonction hybride Entra]
---

Septembre 2025. Un poste refuse de s'enrôler correctement dans Intune et Windows Autopatch. Le réflexe
classique quand un enrôlement est vicié : supprimer l'objet appareil dans Entra et dans Autopatch, puis
repartir de zéro. Je le fais. L'enrôlement repart, tout va bien. Puis je cherche la clé de récupération
BitLocker de ce poste. Elle n'existe plus. Elle était séquestrée dans l'objet appareil, et uniquement là.
Ticket ouvert chez Microsoft, réponse générique : la suppression est définitive, aucune récupération
possible.

Il n'y a pas eu mort d'homme, la session Windows était encore ouverte sur le poste, ce qui laisse le temps de
régénérer une clé. Si ce PC avait redémarré en réclamant sa clé de récupération, le disque était perdu. Depuis,
chaque clé BitLocker de mon parc vit dans deux endroits. Voici pourquoi, et comment.

## Pourquoi la clé disparaît avec l'appareil

Quand Windows séquestre une clé BitLocker dans Entra, il ne la range pas dans un coffre global du tenant. Il
l'attache à l'objet appareil, comme un attribut de cet objet. Supprimez l'objet, vous supprimez ce qu'il
contient. C'est comme votre banque qui vide le coffre quand vous clôturez le compte : la procédure est
logique de leur point de vue, et catastrophique du vôtre si vous n'avez pas fait de copie.

Deux détails aggravent le cas dans un tenant hybride avec Intune et Autopatch :

- Intune et Autopatch peuvent **recréer** l'objet appareil au prochain enrôlement. Vous retrouvez un poste
  dans la console, avec le même nom, et vous croyez que tout est revenu. Les clés, elles, ne reviennent pas.
- Rien dans la console ne vous prévient au moment de la suppression. Le bouton « Supprimer » fait exactement
  ce qu'il dit.

## Prérequis

- Un compte administrateur sur le poste (pour `manage-bde` et les cmdlets BitLocker).
- Un rôle suffisant dans Entra pour lire les clés BitLocker des appareils.
- Si jonction hybride : les droits de lecture de l'attribut de récupération sur les objets ordinateur dans
  Active Directory.
- Un coffre de mots de passe pour le second emplacement : KeePass ou une instance Bitwarden/Vaultwarden.

## Vérifier où sont vos clés avant toute suppression

Avant de toucher à un objet appareil, faites le tour des quatre endroits où une clé peut se trouver. Notez le
résultat. Si la clé n'existe qu'à un seul endroit, vous n'êtes pas prêt à supprimer.

### Côté utilisateur : le portail Mon compte

L'utilisateur lui-même peut voir ses clés, sans passer par vous. Sur `https://myaccount.microsoft.com/device-list`,
il sélectionne son appareil puis **Afficher les clés BitLocker**. Pratique pour un dépannage à distance à
19 h un vendredi ; inutile si l'objet appareil a disparu.

### Côté administrateur : Entra

Dans le centre d'administration Microsoft Entra : **Appareils > Tous les appareils**, ouvrez l'appareil, puis
**Clés BitLocker**. Vous y voyez l'identifiant de clé et le mot de passe de récupération. C'est cet écran qui
devient vide, définitivement, après une suppression.

### Côté Active Directory : la jonction hybride a un avantage

Si vos postes sont en jonction hybride et que la GPO de séquestre BitLocker vers Active Directory est
activée (« Stocker les informations de récupération BitLocker dans les services de domaine Active
Directory »), la clé existe aussi sur l'objet ordinateur AD, dans l'attribut `ms-FVE-RecoveryInformation`.
Dans « Utilisateurs et ordinateurs Active Directory », ouvrez l'ordinateur et regardez l'onglet
**Récupération BitLocker**. Cet onglet n'apparaît que si les outils BitLocker de RSAT sont installés sur la
machine d'administration.

C'est le second emplacement le plus simple à mettre en place dans une PME qui a déjà un AD : Windows
l'alimente tout seul, et une suppression dans Entra ne le touche pas.

### Côté poste : l'export local

Enfin, la source de vérité : le poste lui-même. Depuis une invite administrateur :

```cmd title="Lister les protecteurs du volume système"
manage-bde -protectors -get C:
```

Repérez le bloc **Mot de passe de récupération numérique**. Il contient un identifiant (`ID`) et le mot de
passe à 48 chiffres. Ce sont ces deux valeurs, ensemble, qu'il faut ranger dans le coffre externe. Sans
l'identifiant, vous devrez tester les mots de passe un par un sur un parc entier ; c'est faisable, c'est
juste long.

:::danger
Ne stockez jamais ces valeurs dans un fichier texte sur un partage réseau ou dans une boîte mail. Une clé de
récupération BitLocker, c'est l'équivalent du disque en clair. Coffre chiffré, accès nominatif, rien d'autre.
:::

## Mettre en place la règle des deux coffres

La règle que j'applique depuis : **deux emplacements de stockage minimum pour chaque clé, et une
vérification avant toute suppression d'objet appareil**. Concrètement :

| Emplacement | Alimenté par | Survit à la suppression du device Entra ? |
|---|---|---|
| Objet appareil Entra | Séquestre automatique (stratégie Intune ou enrôlement) | Non |
| Objet ordinateur AD | GPO de séquestre, jonction hybride | Oui |
| Coffre externe (KeePass, Vaultwarden) | Vous, à la main ou par script | Oui |

Le couple Entra + AD est le plus confortable si vous êtes en hybride. Le couple Entra + coffre externe est le
seul possible si vos postes sont joints cloud uniquement. Dans les deux cas, Entra seul ne suffit pas.

### Séquestrer dans Active Directory

Sur un poste en jonction hybride, pour pousser un protecteur existant vers AD :

```powershell title="Séquestre vers Active Directory"
$vol = Get-BitLockerVolume -MountPoint 'C:'
$rp  = $vol.KeyProtector | Where-Object KeyProtectorType -eq 'RecoveryPassword'
Backup-BitLockerKeyProtector -MountPoint 'C:' -KeyProtectorId $rp.KeyProtectorId
```

### Séquestrer dans Entra

Même logique, cmdlet différente. C'est celle que j'ai utilisée pour re-séquestrer la clé du poste concerné
une fois son objet appareil recréé :

```powershell title="Séquestre vers Entra"
$vol = Get-BitLockerVolume -MountPoint 'C:'
$rp  = $vol.KeyProtector | Where-Object KeyProtectorType -eq 'RecoveryPassword'
BackupToAAD-BitLockerKeyProtector -MountPoint 'C:' -KeyProtectorId $rp.KeyProtectorId
```

:::tip
Filtrez toujours sur `KeyProtectorType -eq 'RecoveryPassword'` plutôt que d'indexer `KeyProtector[1]` en dur.
L'ordre des protecteurs varie d'un poste à l'autre (TPM en premier ou non), et un index faux vous fait
séquestrer le mauvais protecteur sans aucun message d'erreur.
:::

## Re-séquestrer une clé après un incident

Si vous êtes déjà dans mon cas (objet supprimé, clé envolée, session encore ouverte), l'ordre des opérations
compte :

1. Ne redémarrez pas le poste tant que la nouvelle clé n'est pas rangée quelque part.
2. Vérifiez qu'un protecteur « mot de passe de récupération » existe encore localement avec
   `manage-bde -protectors -get C:`. S'il existe, il est toujours valable : Entra a perdu sa copie, pas le
   poste.
3. Copiez immédiatement l'identifiant et le mot de passe dans le coffre externe.
4. Attendez que l'objet appareil soit recréé par l'enrôlement, puis lancez `BackupToAAD-BitLockerKeyProtector`
   comme ci-dessus. Vérifiez dans Entra que la clé apparaît bien sur le nouvel objet.
5. Si le poste est en hybride, lancez aussi `Backup-BitLockerKeyProtector` vers AD.

Si aucun protecteur de type mot de passe de récupération n'existe plus (cas rare, mais possible après une
réinitialisation de protecteurs), créez-en un nouveau avant de le séquestrer :

```powershell title="Créer puis séquestrer un nouveau mot de passe de récupération"
Add-BitLockerKeyProtector -MountPoint 'C:' -RecoveryPasswordProtector
$rp = (Get-BitLockerVolume -MountPoint 'C:').KeyProtector |
      Where-Object KeyProtectorType -eq 'RecoveryPassword' |
      Select-Object -Last 1
BackupToAAD-BitLockerKeyProtector -MountPoint 'C:' -KeyProtectorId $rp.KeyProtectorId
```

## La liste à dérouler avant de supprimer un objet appareil

Elle tient en cinq lignes ; gardez-la sous la main, en modèle dans votre outil de tickets par exemple :

1. Clé visible dans Entra sur l'objet à supprimer ? Notez l'identifiant.
2. Même clé visible dans AD (onglet Récupération BitLocker) ou dans le coffre externe ? Si non, exportez-la
   maintenant avec `manage-bde`.
3. Le poste est-il allumé avec une session ouverte ? Si non, attendez qu'il le soit : vous voulez pouvoir
   régénérer un protecteur en cas de surprise.
4. Supprimez l'objet dans Entra, puis dans Autopatch et Intune si nécessaire.
5. Après le ré-enrôlement, vérifiez que la clé est revenue dans Entra ; sinon, re-séquestrez.

Cinq minutes à chaque fois. Un disque et une journée de travail de sauvés le jour où ça compte.

## Pour aller plus loin

- [Diagnostiquer l'état de jonction Entra d'un poste Windows](/docs/microsoft-365/diagnostiquer-jonction-entra-dsregcmd/),
  pour comprendre pourquoi un poste finit parfois en double dans Entra, ce qui pousse à supprimer des objets.
- [Intune : erreur d'enrôlement 80192EE7 et Microsoft Store bloqué](/docs/microsoft-365/intune-erreur-80192ee7-et-microsoft-store-bloque/),
  le genre de bug d'enrôlement qui donne envie de tout supprimer.
- [MFA obligatoire avec TOTP dans Vaultwarden](/docs/cybersecurite/mfa-obligatoire-avec-totp-dans-vaultwarden/),
  si vous choisissez un coffre auto-hébergé comme second emplacement.
- Documentation Microsoft : [BackupToAAD-BitLockerKeyProtector](https://learn.microsoft.com/powershell/module/bitlocker/backuptoaad-bitlockerkeyprotector).

<!-- source : mails « Perdu BitLocker Key », 2025-09-15/16 et ticket Microsoft « Un device supprimé » -->

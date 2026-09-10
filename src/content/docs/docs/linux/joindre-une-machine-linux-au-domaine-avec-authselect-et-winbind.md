---
title: "Joindre une machine Linux à Active Directory avec authselect et winbind (plutôt que sssd)"
description: "Retirer sssd, sélectionner le profil winbind avec authselect, joindre le domaine avec net ads join et vérifier la résolution des comptes : la procédure complète sur une distribution RHEL-like."
published: 2026-05-28
category: linux
tags: [linux, active-directory, winbind, authselect, samba, kerberos]
level: avancé
status: à jour
featured: false
tested_on: [Distribution RHEL-like (dnf), Samba winbind, authselect]
sidebar:
  label: "Joindre une machine Linux à Active…"
---

Fin mai 2026, j'ai joint une machine Linux de la famille Red Hat (gestion des paquets avec dnf) à mon Active Directory, sans sssd. Sur ces distributions, sssd est le choix par défaut, celui que `realm join` installe sans vous demander votre avis, et il fonctionne bien. Mais Samba dispose de son propre composant d'intégration, winbind, et il y a des cas où c'est lui le bon outil : quand la machine sert aussi des partages SMB (winbind est alors nécessaire pour la correspondance des identifiants), ou quand on préfère un seul empilement Samba plutôt que sssd et Samba côte à côte, chacun avec sa vision des utilisateurs.

Cette fiche décrit ce que j'ai fait, dans l'ordre, avec les vérifications à chaque étape. Le domaine d'exemple est `ad.example.com`, le nom NetBIOS `AD`.

## Prérequis

- Une machine RHEL-like avec dnf et un accès root.
- La résolution DNS qui pointe vers les contrôleurs de domaine (les enregistrements SRV du domaine doivent être trouvés).
- Une horloge synchronisée : Kerberos tolère cinq minutes d'écart, pas davantage.
- Un compte Active Directory autorisé à joindre des machines au domaine.
- Si la machine est déjà jointe via sssd, une fenêtre d'intervention : les sessions AD vont être interrompues.

```bash title="Vérifications préalables"
dig +short -t SRV _ldap._tcp.ad.example.com
chronyc tracking
hostnamectl
```

## Retirer sssd proprement

Si la machine avait été jointe avec `realm`, commencez par quitter le domaine : cela retire le compte ordinateur et la configuration sssd générée automatiquement.

```bash title="Quitter le domaine (uniquement si jointe via realm/sssd)"
realm leave ad.example.com
```

Puis retirez les paquets. C'est le point de départ de ma procédure :

```bash title="Retirer sssd"
dnf remove sssd sssd-common sssd-winbind-idmap
```

:::note
`sssd-winbind-idmap` est le module qui permet à Samba de déléguer la correspondance des identifiants à sssd. Si vous le laissez, Samba continue de chercher sssd et vous obtenez des utilisateurs sans UID. On le retire avec le reste.
:::

## Installer Samba, winbind et les outils Kerberos

```bash title="Paquets nécessaires"
dnf install samba-winbind samba-winbind-clients samba-common-tools krb5-workstation oddjob oddjob-mkhomedir
```

`oddjob-mkhomedir` sert à créer le répertoire personnel à la première ouverture de session ; sans lui, les utilisateurs AD se connectent dans un répertoire inexistant et repartent avec une erreur peu parlante.

## Configurer Kerberos et Samba

Kerberos d'abord. Avec `dns_lookup_kdc`, inutile de lister les contrôleurs de domaine : ils sont découverts par les enregistrements SRV.

```ini title="/etc/krb5.conf (extrait)"
[libdefaults]
    default_realm = AD.EXAMPLE.COM
    dns_lookup_realm = true
    dns_lookup_kdc = true
    ticket_lifetime = 24h
    renew_lifetime = 7d

[realms]
    AD.EXAMPLE.COM = {
        kdc = dc1.ad.example.com
        admin_server = dc1.ad.example.com
    }

[domain_realm]
    .ad.example.com = AD.EXAMPLE.COM
    ad.example.com = AD.EXAMPLE.COM
```

Samba ensuite. La partie qui compte est la correspondance des identifiants (`idmap`) : le backend `rid` calcule un UID stable à partir du RID de l'objet AD, ce qui donne les mêmes UID sur toutes les machines configurées de la même façon, sans rien stocker dans l'annuaire.

```ini title="/etc/samba/smb.conf"
[global]
    workgroup = AD
    realm = AD.EXAMPLE.COM
    security = ads
    kerberos method = secrets and keytab

    idmap config * : backend = tdb
    idmap config * : range = 10000-19999
    idmap config AD : backend = rid
    idmap config AD : range = 100000-999999

    winbind use default domain = yes
    winbind refresh tickets = yes
    winbind offline logon = yes
    winbind enum users = no
    winbind enum groups = no

    template shell = /bin/bash
    template homedir = /home/%D/%U
```

```bash title="Valider la syntaxe"
testparm -s
```

:::caution
Les plages `idmap` ne doivent jamais changer une fois des fichiers créés avec ces UID, et ne doivent pas chevaucher les comptes locaux. Choisissez-les une fois, notez-les, et réutilisez exactement les mêmes sur les autres machines.
:::

## Joindre le domaine

Obtenez un ticket Kerberos avec le compte autorisé, puis joignez la machine. Le compte ordinateur est créé (ou réinitialisé) dans l'unité d'organisation par défaut.

```bash title="Jonction au domaine"
kinit compte-jonction@AD.EXAMPLE.COM
net ads join -k
net ads testjoin
systemctl enable --now winbind oddjobd
```

`net ads testjoin` doit répondre `Join is OK`. Sinon, ne continuez pas : les étapes suivantes échoueront de toute façon.

## Basculer authselect sur le profil winbind

C'est le cœur de la manipulation. `authselect` gère les fichiers PAM et `nsswitch.conf` à partir de profils ; jusqu'ici, le profil actif était `sssd`. On sélectionne `winbind`, avec l'option `-b` qui sauvegarde la configuration actuelle avant de la remplacer :

```bash title="Sélectionner le profil winbind"
authselect select winbind -b
authselect apply-changes
```

Si vous voulez la création automatique du répertoire personnel, ajoutez la fonctionnalité `with-mkhomedir` (elle s'appuie sur `oddjobd`, activé à l'étape précédente) :

```bash title="Variante avec création du home"
authselect select winbind with-mkhomedir -b
authselect apply-changes
```

Vérifiez ensuite que le profil est bien actif et que `nsswitch.conf` a été réécrit :

```bash title="Contrôle du profil"
authselect current
authselect check
grep -E '^(passwd|group):' /etc/nsswitch.conf
```

:::tip
Si `authselect` refuse parce que des fichiers PAM ont été modifiés à la main (« unexpected changes »), regardez d'abord ce qui a changé avec `authselect check`, puis relancez avec `--force` en connaissance de cause. La sauvegarde `-b` reste votre retour arrière : `authselect backup-list` puis `authselect backup-restore <nom>`.
:::

## Vérifier la résolution des comptes et l'ouverture de session

Dans l'ordre, du plus bas niveau au plus haut. Chaque commande qui échoue désigne la couche fautive.

```bash title="Vérifications"
wbinfo -t                        # relation d'approbation avec le domaine
wbinfo -D AD                     # informations sur le domaine
wbinfo -n utilisateur.test       # nom -> SID
getent passwd utilisateur.test   # résolution via nsswitch (UID, home, shell)
id utilisateur.test              # groupes AD résolus
```

Puis une vraie ouverture de session, idéalement depuis un autre poste :

```bash title="Test de connexion"
ssh utilisateur.test@192.0.2.10
```

Le répertoire `/home/AD/utilisateur.test` doit être créé à la volée et `klist` doit afficher un ticket Kerberos.

| Symptôme | Cause probable | Vérification |
| --- | --- | --- |
| `wbinfo -t` échoue | Jonction incomplète ou horloge décalée | `net ads testjoin`, `chronyc tracking` |
| `wbinfo -n` fonctionne mais pas `getent` | `nsswitch.conf` non mis à jour | `authselect current`, `grep winbind /etc/nsswitch.conf` |
| `getent` fonctionne mais la connexion est refusée | PAM ou shell/home | `journalctl -u winbind`, `/var/log/secure` |
| Connexion acceptée, home absent | `oddjobd` arrêté ou `with-mkhomedir` absent | `systemctl status oddjobd` |

## Pour aller plus loin

- [Winbind : réinitialiser la jonction Active Directory](/docs/linux/winbind-reinitialiser-la-jonction-active-directory/) : quand le compte ordinateur est cassé et que tout ce qui précède échoue.
- [Rocky Linux : faire confiance à une CA interne et valider LDAPS](/docs/linux/rocky-linux-faire-confiance-a-une-ca-interne-et-valider-ldaps/) : indispensable dès qu'un service de la machine interroge l'annuaire en LDAPS.
- [Tier 0 : contrôleurs de domaine et VM IAM](/docs/architecture/tier-0-controleurs-de-domaine-et-vm-iam/) : où placer une machine qui détient un compte ordinateur.
- Documentation Red Hat : « Connecting RHEL systems directly to AD using Samba Winbind », sur [docs.redhat.com](https://docs.redhat.com/).

<!-- source : échanges « authselect / winbind », 2026-05-26 → 2026-05-27 -->

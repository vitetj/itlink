---
title: "Serveur de fichiers Samba : passer de security = user à security = ads avec Kerberos et idmap rid"
description: "Faire rejoindre l'annuaire à un serveur de fichiers Samba autonome : bascule autorid vers rid, Kerberos, reprise des ACL, et la sortie de NT_STATUS_NO_LOGON_SERVERS quand sssd et winbind cohabitent."
published: 2026-05-27
category: linux
tags: [samba, active-directory, kerberos, idmap, winbind, rhel]
level: avancé
status: à jour
featured: false
tested_on: [Distribution RHEL-like (dnf), Samba winbind, Active Directory domaine unique]
---

Mai 2026. Le serveur de fichiers de ma boîte tournait en Samba autonome : des comptes locaux, des mots de passe qui n'avaient rien à voir avec ceux du domaine, et un mappage d'identifiants laissé à la valeur par défaut. Ça marchait. Ça marchait même très bien, à condition de ne jamais monter un deuxième serveur de fichiers, et d'accepter qu'un départ de salarié se traite à deux endroits — l'annuaire, puis le serveur, et dans cet ordre si on ne veut pas d'oubli.

Le passage à `security = ads` règle tout cela. Mais évitons tout de suite un malentendu : **ce n'est pas la même opération que joindre un poste Linux au domaine**. Sur un poste, l'enjeu est l'ouverture de session. Sur un serveur de fichiers, l'enjeu est le mappage d'identités. Chaque fichier posé sur le disque porte un UID et un GID numériques ; si ces numéros changent sous vos pieds, vous n'avez pas migré une authentification, vous avez tiré vos droits au sort.

La bascule est décrite ici dans l'ordre où je l'ai faite, piège central d'abord. Le domaine d'exemple est `ad.example.com`, le nom NetBIOS `AD`, les partages sont sous `/srv/partages`.

## Prérequis

- Un serveur de la famille Red Hat (paquets avec `dnf`), un accès root, et une fenêtre d'intervention : les partages seront indisponibles.
- Un compte de l'annuaire autorisé à joindre des machines au domaine.
- Une horloge synchronisée sur la même source que les contrôleurs de domaine, et un DNS qui trouve les enregistrements de service.
- Une sauvegarde du serveur, pas seulement de `smb.conf` : on va toucher aux identifiants numériques de tous les fichiers.

## Comprendre ce qui change vraiment : autorid contre rid

Un backend `idmap`, c'est la table de conversion entre le SID d'un objet de l'annuaire et l'UID POSIX que Linux sait manipuler. Les deux backends en présence ne travaillent pas du tout de la même façon.

`autorid` alloue les plages tout seul, dans l'ordre d'arrivée des domaines, et stocke le résultat dans une base locale. Pratique sur une machine isolée, ingérable à plusieurs : deux serveurs configurés à l'identique n'attribuent pas les mêmes numéros, parce que l'ordre d'arrivée n'est pas le même.

`rid` calcule l'UID : base de la plage plus le RID de l'objet dans l'annuaire. Rien n'est stocké, rien n'est alloué, le calcul est déterministe. Deux serveurs avec la même plage donnent les mêmes UID, aujourd'hui et dans trois ans.

:::danger
Passer de `autorid` à `rid` **change les UID et les GID de tout le monde**. Les fichiers déjà sur le disque, eux, gardent leurs anciens numéros. C'est une bascule, pas un réglage : sans inventaire préalable, vous obtenez des répertoires appartenant à des utilisateurs qui n'existent plus, et des ACL qui pointent dans le vide.
:::

## Faire l'inventaire avant de toucher à smb.conf

Cinq minutes ici vous en économisent une journée plus tard. On photographie l'état des lieux : la configuration, les bases Samba, et surtout la correspondance actuelle entre les fichiers et leurs propriétaires.

```bash title="Sauvegarder l'existant"
cp -a /etc/samba/smb.conf /root/smb.conf.avant
tar czf /root/samba-tdb-avant.tar.gz /var/lib/samba
getent passwd > /root/passwd-avant.txt
getent group  > /root/group-avant.txt
```

```bash title="Photographier les propriétaires des fichiers"
find /srv/partages -printf '%U %G %u %g %p\n' > /root/inventaire-avant.txt
getfacl -R /srv/partages > /root/acl-avant.txt
```

`%U` et `%G` donnent les numéros, `%u` et `%g` les noms résolus. Après la bascule, les numéros n'auront plus de nom : c'est ce fichier qui vous dira à qui rendre quoi.

## Vérifier l'heure et le DNS

Kerberos ne pardonne pas la dérive d'horloge, et il ne trouve les contrôleurs de domaine que par les enregistrements de service. Ces deux points expliquent la majorité des jonctions qui échouent.

```bash title="Contrôles préalables"
chronyc tracking
timedatectl
dig +short -t SRV _ldap._tcp.ad.example.com
```

:::caution
Cinq minutes d'écart suffisent à faire échouer Kerberos, avec un message qui ne parle jamais d'horloge. Si le serveur se synchronise sur une source publique pendant que les contrôleurs se synchronisent entre eux, alignez-les d'abord.
:::

## Écrire la configuration cible

Voici ce dont on part — une configuration autonome très proche des valeurs par défaut :

```ini title="Avant : Samba autonome"
security = user
idmap config * : backend = autorid
```

Et voici la cible :

```ini title="Après : Samba intégré au domaine"
security = ads
realm = AD.EXAMPLE.COM
kerberos method = secrets and keytab
idmap config AD : backend = rid
```

En pratique, la section `[global]` complète ressemble à ceci. Les deux plages ne doivent jamais se chevaucher, et celle du domaine ne doit jamais changer une fois des fichiers écrits.

```ini title="/etc/samba/smb.conf (extrait [global])"
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
    winbind enum users = no
    winbind enum groups = no

    template shell = /sbin/nologin
    template homedir = /home/%D/%U

    vfs objects = acl_xattr
    map acl inherit = yes
    store dos attributes = yes
```

`kerberos method = secrets and keytab` mérite un mot : c'est lui qui alimente un vrai keytab, réutilisable par les autres services de la machine — sauvegarde, montages, supervision. Sans lui, tout ce petit monde retombe sur du NTLM, et vous vous en apercevrez le jour où vous voudrez le couper. `template shell = /sbin/nologin` est volontaire : ici, les comptes du domaine servent à accéder à des partages, pas à ouvrir un shell.

```bash title="Valider la syntaxe avant tout redémarrage"
testparm -s
```

## Joindre le domaine et valider dans l'ordre

```bash title="Jonction et vérifications"
kinit compte-jonction@AD.EXAMPLE.COM
net ads join -U compte-jonction
systemctl enable --now winbind smb

net ads info
wbinfo --dc-info=AD.EXAMPLE.COM
wbinfo -a utilisateur.test
kinit utilisateur.test
getent passwd utilisateur.test
id utilisateur.test
```

Faites-les dans cet ordre, du plus bas niveau au plus haut : la première qui échoue désigne la couche fautive. `net ads info` valide la jonction, `wbinfo --dc-info` la découverte du contrôleur, `wbinfo -a` l'authentification, `getent` la résolution par `nsswitch`, `id` les groupes.

## Sortir de NT_STATUS_NO_LOGON_SERVERS

C'est l'incident qui m'a coûté deux jours, et il n'a rien d'exotique. Après la bascule, l'authentification des comptes du domaine échouait par intermittence, puis complètement, avec ce message :

```text title="Le symptôme"
NT_STATUS_NO_LOGON_SERVERS (0xc000005e)
No logon servers are currently available
```

Alors que le serveur voyait parfaitement le contrôleur de domaine. La cause : **deux fournisseurs d'identité installés en même temps**, sssd et winbind. Sur une distribution RHEL-like, `authselect` génère `/etc/nsswitch.conf` et les fichiers PAM à partir d'un profil ; tant que le profil actif est `sssd`, le fichier « revient » sur `sss` et winbind n'est plus consulté. Vous corrigez le fichier, ça marche, et ça recasse au redémarrage suivant.

Le choix se fait vite : sur un serveur qui sert des partages SMB, **c'est winbind**. Samba a besoin de son propre mappage d'identités, et deux visions des utilisateurs sur la même machine ne produisent que des tickets. Sur un poste sans partage, sssd reste un très bon choix — mais alors on ne met pas winbind à côté.

```bash title="Remise à plat, dans cet ordre"
# 1. Retirer le fournisseur concurrent
dnf remove sssd sssd-common sssd-winbind-idmap

# 2. Repartir d'un profil authselect propre, orienté winbind
authselect select winbind -b
authselect apply-changes

# 3. Revérifier la configuration Samba avant de relancer
testparm -s

# 4. Purger les caches d'identité (indispensable après un changement d'idmap)
net cache flush

# 5. Relancer les services dans le bon ordre
systemctl restart winbind smb

# 6. Revalider de bout en bout
net ads info
wbinfo --dc-info=AD.EXAMPLE.COM
wbinfo -a utilisateur.test
kinit utilisateur.test
```

:::caution
N'éditez jamais `/etc/nsswitch.conf` à la main sur ces distributions : `authselect` le régénère. Corrigez le profil, pas le fichier, sinon votre correction disparaît au prochain `apply-changes` — et vous croirez à une panne aléatoire.
:::

Trois détails qui font gagner du temps :

- `wbinfo --dc-info` peut réussir alors que `wbinfo -a` échoue : découverte et authentification n'empruntent pas le même chemin, testez les deux.
- `kinit` peut renvoyer un **avertissement de chiffrement déprécié** (type `arcfour-hmac`). Ce n'est pas cosmétique : corrigez les types autorisés côté client et côté compte machine plutôt que de scroller.
- Sans `net cache flush`, l'ancien mappage continue d'être servi et vous débuguez un fantôme.

## Reprendre les ACL après la bascule

Une fois l'authentification saine, comparez l'avant et l'après : les fichiers portent encore les anciens numéros.

```bash title="Mesurer l'écart"
find /srv/partages -printf '%U %G %u %g %p\n' > /root/inventaire-apres.txt
find /srv/partages -nouser -o -nogroup | head -n 50
```

Pour chaque ancien identifiant, retrouvez le compte dans `/root/inventaire-avant.txt`, lisez son nouvel UID avec `id`, puis réattribuez :

```bash title="Réattribuer un ancien identifiant"
find /srv/partages -uid 3001 -exec chown 100521 {} +
find /srv/partages -gid 3001 -exec chgrp 100513 {} +
```

| Symptôme après bascule | Cause probable | Vérification |
| --- | --- | --- |
| Fichiers appartenant à un numéro sans nom | Ancien mappage `autorid` | `find -nouser`, `/root/inventaire-avant.txt` |
| `getent passwd` vide pour le domaine | Profil `authselect` non appliqué | `authselect current`, `grep winbind /etc/nsswitch.conf` |
| `NT_STATUS_NO_LOGON_SERVERS` | sssd et winbind en concurrence | `rpm -q sssd`, `authselect current` |
| Accès refusé alors que l'UID est bon | ACL étendues non reprises | `getfacl` sur le partage, `/root/acl-avant.txt` |
| Authentification NTLM là où on attend Kerberos | `kerberos method` absent | `testparm -s`, `klist -k` |

Dernier conseil, appris en le faisant mal : commencez par un partage secondaire, pas par celui de la comptabilité. La bascule est réversible sur le papier, beaucoup moins dans le planning d'une journée de production.

## Pour aller plus loin

- [Joindre une machine Linux à Active Directory avec authselect et winbind](/docs/linux/joindre-une-machine-linux-au-domaine-avec-authselect-et-winbind/) : le cas du poste ou du serveur applicatif, sans la problématique des ACL de fichiers.
- [Réinitialiser winbind sur un serveur Linux joint à Active Directory](/docs/linux/winbind-reinitialiser-la-jonction-active-directory/) : quand la jonction tient mais que les correspondances partent en vrille.
- [Rafraîchir le cache winbind avec un timer systemd](/docs/linux/rafraichir-le-cache-winbind-avec-un-timer-systemd/) : pour éviter que le cache ne vous serve d'anciennes réponses.
- Documentation Samba : la page « idmap config » du wiki officiel, sur [wiki.samba.org](https://wiki.samba.org/).

<!-- source : mail « migration Samba vers l'annuaire », 2026-05-22 ; échanges « winbind / authselect », 2026-05-26 → 2026-05-27 -->

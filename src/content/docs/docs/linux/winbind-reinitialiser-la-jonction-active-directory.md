---
title: "Réinitialiser winbind sur un serveur Linux joint à Active Directory"
description: "Un serveur RHEL joint à l'AD par winbind perd ses correspondances utilisateurs, groupes et SID. Le contournement qui remet tout d'aplomb, les vérifications à faire dans l'ordre, et quand refaire la jonction."
published: 2026-05-22
category: linux
tags: [linux, winbind, samba, active-directory, kerberos, rhel]
level: avancé
status: à jour
featured: false
tested_on: [RHEL, Samba winbind, Windows Server 2022]
---

Le serveur de comptabilité de ma boîte tourne sous RHEL. Il est joint à l'Active Directory par winbind, le
composant de Samba qui traduit les comptes du domaine en utilisateurs et groupes Linux. De temps en temps, sans
prévenir, il oublie qui est qui : `id` ne renvoie plus les groupes AD, `getent passwd` reste muet, un partage
refuse une ouverture de session pourtant valide. Rien n'a changé côté domaine, les contrôleurs répondent, les
postes Windows travaillent normalement. Un `systemctl restart winbind` et tout revient. Puis ça recommence
quelques semaines plus tard.

Cette fiche décrit ce contournement, parce qu'il dépanne en trente secondes et que c'est exactement ce que vous
voulez à 8 h 05 quand la compta doit clôturer. Mais elle s'attarde surtout sur les vérifications à faire avant et
après, dans l'ordre, pour désigner la couche fautive : le cache de winbind, un contrôleur de domaine devenu
injoignable, une horloge décalée, ou un secret machine cassé. Le redémarrage soigne le symptôme ; le diagnostic
évite de le refaire tous les mois. Chez moi, la cause n'est pas encore tranchée, et je le dis : la reprise propre
des accès Linux vers l'AD fait partie du chantier Tier 0 planifié dans le rapport de maintenance serveurs.

## Prérequis

- Un accès root sur le serveur Linux.
- Une machine déjà jointe au domaine avec winbind (voir la fiche de jonction en fin d'article). Le domaine
  d'exemple est `ad.example.com`, nom NetBIOS `AD`.
- Un compte AD de test, ici `utilisateur.test`, et le nom d'un contrôleur de domaine, `dc1.ad.example.com`.
- Pour la réinitialisation complète : un compte AD autorisé à joindre des machines au domaine.

## Comprendre ce que winbind garde en mémoire

winbindd ne demande pas au contrôleur de domaine à chaque appel. Il conserve plusieurs bases locales dans
`/var/lib/samba/` : un cache des utilisateurs et groupes déjà vus (`winbindd_cache.tdb`), un cache d'ouverture de
session (`netsamlogon_cache.tdb`), et la table de correspondance SID vers UID/GID (`winbindd_idmap.tdb`) pour
les plages allouées dynamiquement. Il détient aussi le secret du compte ordinateur dans `secrets.tdb` et le
keytab Kerberos ; ce mot de passe machine est renouvelé automatiquement, comme sur un poste Windows.

Trois choses peuvent donc dérailler. Le cache devient incohérent et sert des réponses fausses ou vides. Le
contrôleur de domaine disparaît le temps d'un redémarrage et winbind passe en mode hors ligne sans toujours en
revenir tout seul. Ou le secret machine ne correspond plus à ce que l'AD connaît, et là, plus aucune requête
authentifiée ne passe. Les symptômes se ressemblent, les remèdes non.

## Appliquer le contournement : redémarrer winbind

```bash title="Redémarrage et état du service"
systemctl restart winbind
systemctl status winbind --no-pager
```

Enchaînez immédiatement avec les vérifications, du plus bas niveau au plus haut. Chaque commande qui échoue
désigne la couche à regarder.

```bash title="Vérifications après redémarrage"
wbinfo -p               # winbindd répond-il ?
wbinfo -t               # le secret machine est-il valide ?
wbinfo --ping-dc        # un contrôleur de domaine répond-il ?
wbinfo -u | head        # les utilisateurs du domaine sont-ils vus ?
getent passwd utilisateur.test
id utilisateur.test
```

Ce que vous devez lire : `checking the trust secret for domain AD via RPC calls succeeded` pour `wbinfo -t`,
`succeeded` pour le ping du DC, une liste de comptes pour `wbinfo -u`, et pour `id` les groupes AD avec leurs
GID. Si tout est vert, l'incident est clos. Notez l'heure : c'est le point de départ de l'enquête.

:::note
Si le redémarrage suffit et que `wbinfo -t` réussit, le secret machine est sain et le contrôleur joignable. Le
suspect numéro un est le cache. Regardez ce qui s'est passé dans les minutes qui précèdent l'incident :
`journalctl -u winbind --since "2 hours ago"` révèle souvent un contrôleur de domaine passé hors ligne pendant
son redémarrage mensuel, ou une coupure réseau.
:::

## Chercher la cause avant le prochain incident

### L'horloge

Kerberos tolère cinq minutes d'écart entre le serveur et le contrôleur de domaine, pas davantage. Au-delà, les
tickets sont refusés, winbind ne peut plus s'authentifier et bascule hors ligne.

```bash title="Contrôle de l'heure"
chronyc tracking
timedatectl
net ads info
```

`net ads info` affiche le contrôleur utilisé et l'heure qu'il annonce (`Server time`). Comparez-la à `date`.
Si la source NTP du serveur n'est pas le domaine, faites-la pointer vers vos contrôleurs : ils sont la référence
de temps de tout ce qui parle Kerberos.

### Le contrôleur de domaine

```bash title="Le domaine est-il vu en ligne ?"
wbinfo --online-status
dig +short -t SRV _ldap._tcp.ad.example.com
```

Un domaine marqué `offline` alors que les DC répondent au ping signifie que winbind n'est pas revenu de lui-même.
`smbcontrol winbindd online` le force à retenter sans redémarrer le service. Si le nom de domaine ne donne aucun
enregistrement SRV, le problème est le DNS du serveur Linux, pas winbind.

### Le cache

Pour purger sans redémarrer, `net cache flush` vide le cache générique de Samba. Pour repartir de zéro sur les
caches de winbind :

```bash title="Purge complète des caches winbind"
systemctl stop winbind
mv /var/lib/samba/winbindd_cache.tdb /root/winbindd_cache.tdb.$(date +%F)
mv /var/lib/samba/netsamlogon_cache.tdb /root/netsamlogon_cache.tdb.$(date +%F)
systemctl start winbind
```

:::caution
Ne touchez pas à `winbindd_idmap.tdb` si vous utilisez le backend `tdb` pour allouer des UID. Ce fichier contient
les correspondances attribuées ; le supprimer change le propriétaire apparent de tous les fichiers créés par ces
comptes. Avec le backend `rid` sur le domaine, la correspondance est calculée et le risque ne concerne que la
plage par défaut `*`.
:::

## Réinitialiser la jonction quand le secret machine est cassé

Si `wbinfo -t` échoue après redémarrage alors que l'horloge est bonne et que le DC répond, le mot de passe du
compte ordinateur ne correspond plus. Le cas classique : le serveur a été restauré depuis un instantané ou une
sauvegarde antérieure au dernier renouvellement automatique du mot de passe machine. L'AD a la nouvelle valeur,
le serveur l'ancienne, comme un poste Windows après un retour de snapshot.

Première tentative, la moins intrusive :

```bash
net ads changetrustpw
```

Si elle échoue, refaites la jonction. L'objet ordinateur existant est réutilisé, seul son mot de passe est
réinitialisé, et le keytab est mis à jour si `kerberos method = secrets and keytab` figure dans `smb.conf`.

```bash title="Nouvelle jonction"
kinit compte-jonction@AD.EXAMPLE.COM
net ads join -k
net ads testjoin
systemctl restart winbind
wbinfo -t
```

`net ads testjoin` doit répondre `Join is OK`. Les UID ne changent pas tant que la configuration `idmap` est
identique ; vérifiez-le tout de même avec `id utilisateur.test` avant de rendre la main à la compta.

:::tip
Si le serveur est une VM, ajoutez ce réflexe à votre procédure de restauration : après tout retour arrière d'un
instantané vieux de plus de quelques semaines, contrôlez `wbinfo -t` avant de crier victoire.
:::

## Résumer : symptôme, cause, commande

| Symptôme | Cause probable | Vérification |
| --- | --- | --- |
| `id` vide, `wbinfo -t` OK après redémarrage | Cache incohérent | `journalctl -u winbind`, purge des caches |
| Domaine `offline`, DC joignables | winbind non revenu en ligne | `wbinfo --online-status`, `smbcontrol winbindd online` |
| `wbinfo -t` échoue, DC joignables | Secret machine invalide | `net ads changetrustpw`, nouvelle jonction |
| Tout échoue, y compris `kinit` | Horloge ou DNS | `chronyc tracking`, `dig SRV` |

Le redémarrage restera dans la boîte à outils. Mais un serveur qui a besoin d'un redémarrage de service tous les
mois vous dit quelque chose ; écoutez-le avant qu'il ne le dise un jour de clôture.

## Pour aller plus loin

- La procédure de jonction complète, avec `authselect` et le choix des plages `idmap` :
  [Joindre une machine Linux à Active Directory avec authselect et winbind](/docs/linux/joindre-une-machine-linux-au-domaine-avec-authselect-et-winbind/).
- Où doit vivre une machine qui détient un compte ordinateur et des comptes de service :
  [Tier 0 : contrôleurs de domaine et VM IAM](/docs/architecture/tier-0-controleurs-de-domaine-et-vm-iam/).
- Documentation Samba : pages de manuel `wbinfo(1)`, `net(8)` et `winbindd(8)` sur
  [samba.org](https://www.samba.org/samba/docs/current/man-html/).

<!-- source : note interne « Dysfonctionnement récurrent winbind / cache sur serveur compta », 2026-05-21 -->

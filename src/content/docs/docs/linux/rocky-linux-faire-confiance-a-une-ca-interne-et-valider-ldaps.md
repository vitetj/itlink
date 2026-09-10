---
title: "Rocky Linux : faire confiance à une CA interne et valider LDAPS avec openssl et ldapsearch"
description: "Après une nouvelle autorité de certification, prouver depuis un serveur Rocky Linux que le LDAPS d'un contrôleur de domaine fonctionne : trust store, poignée de main TLS sur le 636, recherche LDAP authentifiée."
published: 2026-02-19
category: linux
tags: [rocky-linux, ldaps, openssl, ldapsearch, pki, active-directory]
level: intermédiaire
status: à jour
featured: false
tested_on: [Rocky Linux 8, Rocky Linux 9, Windows Server 2022]
sidebar:
  label: "Rocky Linux"
---

Le contexte : un IPBX Mitel MiCollab tourne sur Rocky Linux et lit ses utilisateurs dans l'Active Directory en
LDAPS. L'autorité de certification interne vient d'être reconstruite en SHA-256, les contrôleurs de domaine
présentent de nouveaux certificats, et l'application affiche toujours « échec d'authentification ». Ce message ne
dit rien. Trois couches peuvent lâcher : la chaîne de confiance (la racine n'est pas connue du serveur), la
poignée de main TLS elle-même (protocole, taille de clé, algorithme), et enfin le *bind* LDAP (compte, mot de
passe, base de recherche). Tant que vous testez depuis l'application, vous ne savez pas laquelle.

L'idée de cette fiche est de tester chaque couche séparément avec des outils standard, comme on vérifie la prise
murale au multimètre avant d'accuser l'appareil. Si `openssl` et `ldapsearch` passent, le problème est dans
l'application et vous pouvez le dire à l'éditeur preuves à l'appui. S'ils ne passent pas, vous savez exactement
où regarder.

## Prérequis

- Le certificat de la nouvelle CA racine au format `.crt`, exporté depuis la CA (`certutil -ca.cert` côté
  Windows) et copié sur le serveur Linux avec `scp`.
- Un accès `sudo` sur le serveur Rocky Linux.
- Le port 636 ouvert entre le serveur et au moins un contrôleur de domaine.
- Un compte AD **en lecture seule** dédié aux tests LDAP (voir l'encadré plus bas).

## Vérifier ce que le système connaît déjà

Avant d'ajouter quoi que ce soit, regardez ce que le magasin de confiance contient. Sur la famille RHEL, la
commande `trust` liste les ancres, celles du système comme celles ajoutées localement :

```bash
trust list | grep -i example
ls -l /etc/pki/ca-trust/source/anchors/
```

Si l'ancienne racine apparaît, notez son nom : vous la retirerez à la fin, une fois que plus aucun DC ne l'utilise.
Si rien n'apparaît alors que l'application fonctionnait avant, c'est que l'ancien certificat avait été importé
directement dans l'application, pas dans le système. Dans ce cas, le trust store n'était même pas en cause
jusqu'ici.

Vérifiez aussi que le fichier que vous vous apprêtez à importer est bien la racine attendue, et pas un certificat
de DC :

```bash
openssl x509 -in EXAMPLE-CA01.crt -noout -subject -issuer -enddate -fingerprint -sha256
```

Pour une racine, `subject` et `issuer` sont identiques. Si `openssl` répond `unable to load certificate`, le
fichier est probablement en DER : ajoutez `-inform der`.

## Ajouter la racine dans le magasin de confiance

```bash title="Import de la racine"
sudo cp EXAMPLE-CA01.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust extract
trust list | grep -i example-ca01
```

:::note
Pourquoi `anchors` et pas `/etc/pki/tls/certs/ca-bundle.crt` directement ? Parce que les bundles sont
**générés** par `update-ca-trust` à partir des sources. Tout ce que vous écrivez à la main dans un bundle disparaît
à la prochaine mise à jour du paquet `ca-certificates`. Le dossier `anchors` accepte les fichiers PEM comme DER.
:::

## Tester la poignée de main TLS sur le port 636

C'est le test le plus utile de la fiche. Il ne dépend ni de l'application, ni d'un compte :

```bash
openssl s_client -connect srv-dc01.example.local:636 </dev/null
```

Trois lignes à lire dans la sortie :

| Ligne | Attendu | Sinon |
| --- | --- | --- |
| `Protocol : TLSv1.3` (ou 1.2) | protocole moderne négocié | le DC ou le client restreint les protocoles |
| `Server public key is 2048 bit` ou plus | clé conforme | le DC présente encore un vieux certificat |
| `Verify return code: 0 (ok)` | chaîne validée jusqu'à une racine connue | voir le tableau des codes |

Les codes de retour que vous croiserez le plus souvent :

| Code | Signification | Où chercher |
| --- | --- | --- |
| `0 (ok)` | tout est bon | nulle part |
| `19` self signed certificate in certificate chain | la racine n'est pas dans le trust store | import raté, ou mauvaise racine |
| `20` unable to get local issuer certificate | chaîne incomplète | CA intermédiaire manquante, ou ancienne racine |
| `10` certificate has expired | certificat périmé | renouvellement côté DC |

Pour confirmer l'algorithme de signature et l'émetteur du certificat présenté :

```bash
openssl s_client -connect srv-dc01.example.local:636 -showcerts </dev/null \
  | openssl x509 -noout -text \
  | grep -E "Signature Algorithm|Public-Key|Issuer"
```

Vous devez lire `sha256WithRSAEncryption` et le nom de la nouvelle CA. Pour tester une racine précise sans
toucher au système, `-CAfile EXAMPLE-CA01.crt` fait l'affaire. Répétez le test sur **chaque** contrôleur de
domaine : l'IPBX peut en interroger un autre que celui que vous venez de corriger.

## Faire une recherche LDAPS authentifiée

Dernière couche. Installez les clients OpenLDAP, puis lancez une recherche qui ressemble à ce que fait
l'application :

```bash title="Recherche LDAPS"
sudo dnf -y install openldap-clients
ldapsearch -LLL -H ldaps://srv-dc01.example.local:636 \
  -D "svc-ldap-ro@example.local" -W \
  -b "DC=example,DC=local" \
  "(&(objectClass=user)(objectCategory=person))" sAMAccountName dn | head -n 50
```

Lecture des options : `-LLL` supprime les commentaires et les versions LDIF, `-H` impose LDAPS et le port,
`-D` est le compte de connexion (l'AD accepte la forme UPN, plus lisible qu'un DN complet), `-W` demande le mot
de passe au clavier au lieu de le laisser dans l'historique du shell, `-b` est la base de recherche. Le filtre
ne renvoie que les utilisateurs « personnes », pas les ordinateurs. Vous devez voir défiler des blocs `dn:` et
`sAMAccountName:`.

Les erreurs les plus fréquentes :

| Message | Couche en cause |
| --- | --- |
| `Can't contact LDAP server (-1)` | TLS ou réseau : la chaîne n'est pas validée, ou le port est fermé |
| `Invalid credentials (49)` | compte, mot de passe ou compte désactivé |
| `Operations error (1)` avec mention d'un *bind* requis | l'AD refuse la recherche anonyme, `-D` manque |
| `Size limit exceeded (4)` | normal au-delà de 1 000 entrées ; ajoutez `-E pr=1000/noprompt` |

Si `openssl` accepte la chaîne mais que `ldapsearch` renvoie `-1`, le client LDAP ne regarde pas le même magasin.
Vérifiez `TLS_CACERT` ou `TLS_CACERTDIR` dans `/etc/openldap/ldap.conf`, ou forcez la racine le temps du test :

```bash
LDAPTLS_CACERT=/etc/pki/ca-trust/source/anchors/EXAMPLE-CA01.crt ldapsearch -d 1 -H ldaps://srv-dc01.example.local:636 -x -b "" -s base
```

L'option `-d 1` affiche le détail de la négociation TLS, ce qui suffit en général à voir où ça coince.

:::caution
Faites le test définitif avec un compte de service en lecture seule, jamais avec un compte à privilèges. Le
premier test « pour voir » avait été fait avec un compte administrateur ; ça marche, et c'est précisément le
problème : on finit par laisser ce compte dans la configuration de l'application. Un compte dédié, mot de passe
long, membre d'aucun groupe d'administration, suffit pour lire l'annuaire.
:::

## Retirer l'ancienne racine

Une fois que tous les DC présentent un certificat de la nouvelle CA et que l'application synchronise, supprimez
l'ancienne racine des ancres et régénérez les bundles :

```bash
sudo rm /etc/pki/ca-trust/source/anchors/ANCIENNE-CA.crt
sudo update-ca-trust extract
openssl s_client -connect srv-dc01.example.local:636 </dev/null | grep "Verify return code"
```

Si le test reste à `0 (ok)`, l'ancienne CA peut être décommissionnée côté Windows sans casser ce serveur. Gardez
la sortie `openssl` dans le ticket : c'est la preuve à joindre à l'éditeur si l'application, elle, continue de
bouder.

## Pour aller plus loin

- Le côté Windows de l'histoire, modèle CNG et reconstruction de la CA :
  [Réparer l'authentification LDAPS d'un contrôleur de domaine](/docs/windows-server/ldaps-reparer-un-certificat-capi-vers-cng-sha256/).
- Un serveur Linux joint au domaine qui perd ses utilisateurs :
  [Réinitialiser la jonction Active Directory avec winbind](/docs/linux/winbind-reinitialiser-la-jonction-active-directory/).
- Les autres fiches [Linux](/docs/linux/).

<!-- source : mail « RE: Échec authentification », 2026-02-17 -->

---
title: "Rafraîchir le cache winbind automatiquement avec un service et un timer systemd"
description: "Les changements Active Directory mettent des heures à apparaître sur un serveur Linux joint par winbind. La purge automatisée par un service et un timer systemd, ses limites, et pourquoi c'est un contournement."
published: 2026-03-18
category: linux
tags: [linux, winbind, systemd, timer, active-directory, samba]
level: intermédiaire
status: à jour
featured: false
tested_on: [Samba winbind, systemd]
sidebar:
  label: "Rafraîchir le cache winbind…"
---

Sur un serveur Linux joint au domaine par winbind, vous créez un compte dans Active Directory, vous l'ajoutez à un
groupe, et côté Linux… rien. `id` ne voit pas le nouveau groupe, un partage refuse un accès pourtant accordé, et
l'utilisateur vous appelle. Une heure plus tard, ça marche tout seul. Le coupable est le cache de winbind, qui
fait très bien son travail : il évite de matraquer les contrôleurs de domaine à chaque résolution d'identité. Le
revers, c'est qu'il vous fait vivre dans le passé.

En mars 2026, j'ai arrêté de purger ce cache à la main. Cette fiche décrit l'automatisation que j'ai mise en
place : un service `oneshot` et un timer systemd qui remettent les compteurs à zéro chaque soir.

:::note
Cette fiche suppose une machine **déjà jointe au domaine et fonctionnelle**. Si vous en êtes à la jonction, à
`authselect` ou à un secret machine cassé, commencez par
[Joindre une machine Linux à Active Directory avec authselect et winbind](/docs/linux/joindre-une-machine-linux-au-domaine-avec-authselect-et-winbind/)
et [Réinitialiser winbind sur un serveur Linux joint à Active Directory](/docs/linux/winbind-reinitialiser-la-jonction-active-directory/).
On ne planifie pas la purge d'un cache tant que la jonction elle-même est bancale.
:::

## Comprendre ce que vous purgez

winbind conserve localement le résultat des résolutions d'identité : correspondances nom ↔ SID, appartenances aux
groupes, informations d'énumération. C'est un cache classique, avec une durée de vie propre. Tant qu'une entrée
n'a pas expiré, winbind répond de mémoire, sans interroger le domaine — même si le domaine a changé d'avis entre
temps.

Deux gestes suffisent à repartir sur des bases propres :

```bash
net cache flush
systemctl restart winbind
```

Le premier vide le cache général de Samba. Le second relance le démon, ce qui écarte les entrées qu'il gardait en
mémoire vive. Faits à la main, ces deux gestes règlent l'incident en dix secondes ; faits trois fois par semaine à
la demande d'un utilisateur, ils deviennent une corvée. D'où le timer.

## Prérequis

- Un accès root sur le serveur.
- Le chemin réel de la commande `net`, qui varie selon la distribution :

  ```bash
  which net
  # /usr/bin/net sur la plupart des distributions RHEL-like
  ```

  Notez-le, il ira tel quel dans l'unité systemd. Une unité systemd n'utilise pas votre `PATH` : un chemin relatif
  échoue silencieusement au premier déclenchement, à une heure où personne ne regarde.
- Un créneau horaire creux. Le redémarrage de winbind coupe brièvement la résolution d'identité.

## Écrire le service

Le service ne tourne pas en continu : il exécute deux commandes puis se termine. C'est exactement ce que décrit
`Type=oneshot`, qui autorise plusieurs `ExecStart=` exécutés dans l'ordre.

```ini title="/etc/systemd/system/winbind-refresh.service"
[Unit]
Description=Purge du cache winbind et redemarrage du service
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/net cache flush
ExecStart=/bin/systemctl restart winbind
```

Trois remarques sur ce fichier :

- pas de section `[Install]`, et c'est volontaire : ce service n'a pas à être activé au démarrage, c'est le timer
  qui le déclenchera ;
- `After=network-online.target` évite un déclenchement pendant que la pile réseau se monte, notamment si le
  serveur redémarre juste avant l'heure prévue ;
- adaptez le chemin de `net` à ce que vous a répondu `which net`.

## Écrire le timer

Le timer porte le même nom que le service, avec l'extension `.timer`. C'est cette convention de nommage qui les
relie : pas besoin de `Unit=` tant que les deux fichiers s'appellent pareil.

```ini title="/etc/systemd/system/winbind-refresh.timer"
[Unit]
Description=Declenche le rafraichissement winbind chaque jour

[Timer]
OnCalendar=*-*-* 19:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

`OnCalendar=*-*-* 19:00:00` signifie « tous les jours à 19 h », dans le fuseau du serveur. `Persistent=true` est la
ligne qui distingue un timer systemd d'une ligne de cron : si la machine était éteinte à 19 h, le déclenchement a
lieu au démarrage suivant, au lieu d'être simplement sauté.

:::tip
Avant d'activer quoi que ce soit, faites relire votre expression par systemd lui-même :

```bash
systemd-analyze calendar "*-*-* 19:00:00"
```

Il vous renvoie la forme normalisée et la prochaine occurrence. C'est la façon la plus rapide de vérifier qu'on
n'a pas écrit une expression qui ne se déclenchera jamais.
:::

## Activer et vérifier

```bash
systemctl daemon-reload
systemctl enable --now winbind-refresh.timer
systemctl list-timers | grep winbind
```

`list-timers` affiche la prochaine échéance, le temps restant, la dernière exécution et l'unité déclenchée. Si la
colonne `NEXT` est vide, le timer n'est pas armé : dans la quasi-totalité des cas, c'est un `daemon-reload`
oublié ou une faute de frappe dans `OnCalendar`.

Testez ensuite le service sans attendre 19 h :

```bash
systemctl start winbind-refresh.service
systemctl status winbind-refresh.service
journalctl -u winbind-refresh.service -n 30 --no-pager
```

Un `oneshot` qui a bien tourné apparaît en `inactive (dead)` avec un code de sortie 0. C'est normal : il n'a pas
vocation à rester actif.

Enfin, vérifiez l'effet réel, pas seulement l'exécution :

```bash
wbinfo -u | head
getent group "DOMAINE\\nom-du-groupe"
id utilisateur.test
```

Créez un compte de test dans l'annuaire, lancez le service, et regardez si le compte apparaît. Un timer qui
s'exécute sans rien corriger est un timer inutile qu'on gardera dix ans.

## Les pièges à connaître

| Piège | Conséquence | Parade |
| --- | --- | --- |
| Chemin de `net` erroné | Le service échoue chaque soir, sans que personne ne le voie | `which net`, et relire `journalctl` après le premier déclenchement |
| Horaire mal choisi | Coupure de résolution pendant une sauvegarde ou un batch | Un créneau réellement creux, vérifié avec l'exploitation |
| Plusieurs serveurs à la même heure | Rafale de requêtes simultanées sur les contrôleurs de domaine | `RandomizedDelaySec=300` dans la section `[Timer]` |
| Purge trop fréquente | Charge inutile sur l'annuaire, gain nul | Quotidien suffit dans presque tous les cas |
| Aucune surveillance | L'échec du service passe inaperçu | Vérifier `systemctl list-timers` dans votre tour de contrôle mensuel |

Le redémarrage de winbind mérite une mention à part : pendant une poignée de secondes, les résolutions d'identité
échouent. Sur un serveur de fichiers, cela peut se traduire par un accès refusé pour un utilisateur qui tombait
pile au mauvais moment. C'est supportable à 19 h, beaucoup moins à 10 h.

## Assumer que c'est un contournement

Purger un cache tous les soirs ne corrige rien : cela masque un délai de propagation qu'on n'a pas voulu, ou pas
pu, traiter à la source. La question de fond reste ouverte, et elle est côté configuration : quelles durées de vie
de cache sont réellement paramétrées, sont-elles adaptées à la fréquence des changements d'annuaire, et
l'énumération des utilisateurs et des groupes est-elle activée alors qu'elle ne sert à rien sur ce serveur ?

Ma règle, quand je pose un contournement : je l'écris dans la fiche du serveur, avec la date, la raison, et la
phrase « à revoir si le comportement change ». Un contournement documenté est une dette technique. Un
contournement silencieux est un piège pour celui qui reprendra le serveur — c'est-à-dire, souvent, moi dans deux
ans.

:::caution
Si le besoin de fraîcheur devient permanent et critique — création de comptes vue instantanément, groupes
appliqués dans la minute — le timer n'est pas la bonne réponse. C'est le signe qu'il faut revoir la configuration
de winbind, ou l'architecture d'attribution des droits, et non purger plus souvent.
:::

## Pour aller plus loin

- [Joindre une machine Linux à Active Directory avec authselect et winbind](/docs/linux/joindre-une-machine-linux-au-domaine-avec-authselect-et-winbind/) : la mise en place complète, en amont de cette fiche.
- [Réinitialiser winbind sur un serveur Linux joint à Active Directory](/docs/linux/winbind-reinitialiser-la-jonction-active-directory/) : quand ce n'est plus le cache mais la jonction elle-même.
- [systemd : forcer un service à démarrer après sa base de données](/docs/linux/systemd-forcer-un-service-a-demarrer-apres-sa-base-de-donnees/) : l'autre moitié du sujet systemd, l'ordonnancement.

<!-- source : fil sur le cache winbind et son rafraîchissement automatisé, 16/03/2026 -->

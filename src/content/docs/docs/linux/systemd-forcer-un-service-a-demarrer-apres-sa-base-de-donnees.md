---
title: "systemd : forcer un service à démarrer après sa base de données (After, Requires, ExecStartPre)"
description: "Un service Java qui démarre avant sa base et plante à chaque redémarrage du serveur. Comment ordonner correctement deux unités systemd, attendre que la base soit réellement prête, et ne pas casser l'unité livrée par l'éditeur."
published: 2024-11-23
category: linux
tags: [systemd, linux, java, ordonnancement, services]
level: intermédiaire
status: à jour
featured: true
tested_on: [Linux serveur applicatif d'un éditeur tiers, systemd]
sidebar:
  label: "systemd : forcer un service à…"
---

Le serveur de gestion d'un éditeur métier tourne sous Linux. Il embarque une base de données propriétaire et un
service Java qui génère des PDF. À chaque redémarrage du serveur, le service Java se lance, ne trouve pas la base,
plante avec un `No RPC Connection active`, et quelqu'un doit se connecter pour le relancer à la main. Pas dramatique,
mais franchement agaçant, surtout quand le redémarrage a lieu un dimanche soir après une coupure électrique.

Le problème est un classique de systemd : les deux services démarrent « en même temps », et « après » ne veut pas dire
« quand l'autre est prêt ».

## Comprendre After, Requires et Wants

systemd sépare deux notions que l'on confond souvent :

- **l'ordre** (`After=`, `Before=`) : dans quel ordre démarrer, sans obligation de dépendance ;
- **la dépendance** (`Requires=`, `Wants=`) : quelles unités doivent être activées avec celle-ci.

`After=unidata.service` seul ne garantit rien si `unidata.service` n'est pas démarré par ailleurs. `Requires=` seul ne
garantit pas l'ordre : les deux unités peuvent partir en parallèle. Il faut les deux, et c'est là que la plupart des
unités livrées par les éditeurs pèchent.

| Directive | Effet | Si la cible échoue ou s'arrête |
| --- | --- | --- |
| `After=` | Démarre après l'unité citée | Aucun effet |
| `Wants=` | Démarre l'unité citée si possible | Continue quand même |
| `Requires=` | Démarre l'unité citée, obligatoire | Le service est arrêté avec elle |
| `BindsTo=` | Comme `Requires`, plus strict | Arrêt immédiat si la cible disparaît |

Pour un générateur de PDF qui n'a aucun sens sans sa base, `Requires=` + `After=` est le bon couple.

## Prérequis

- Un accès root sur le serveur.
- Le nom exact de l'unité de la base : `systemctl list-units --type=service | grep -i unidata` (adaptez à votre éditeur).
- L'accord de l'éditeur si l'unité fait partie de son installation. Une unité modifiée sans prévenir est le genre de
  chose qu'un support prend comme excuse pour ne plus rien regarder.

## Écrire l'unité

Voici l'unité proposée pour le service de génération de PDF, à placer dans `/etc/systemd/system/` (les unités de
`/etc/` priment sur celles de `/usr/lib/systemd/system/`, ce qui évite d'écraser le fichier de l'éditeur) :

```ini title="/etc/systemd/system/gescore-genpdf.service"
[Unit]
Description=GesServices - GENPDF
Wants=network-online.target
After=network-online.target unidata.service
Requires=unidata.service

[Service]
User=root
Group=root
WorkingDirectory=/srv/editeur/gescore/genpdf/
ExecStartPre=/bin/sleep 10
ExecStart=/usr/bin/java -jar GesServices-1.0.2.jar genpdf-spark.conf.json genpdf-instance.conf.json
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gescore-genpdf
TimeoutStopSec=20
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

Trois lignes font le travail :

- `After=network-online.target unidata.service` : on attend le réseau réellement monté et la base ;
- `Requires=unidata.service` : sans la base, pas de service, et si la base s'arrête, le service aussi ;
- `ExecStartPre=/bin/sleep 10` : le compromis pragmatique quand la base annonce « démarrée » avant d'accepter des
  connexions.

Ensuite :

```bash
systemctl daemon-reload
systemctl enable --now gescore-genpdf
journalctl -u gescore-genpdf -f
```

:::caution
`Requires=` a une conséquence qu'on oublie : un `systemctl restart unidata` redémarre aussi le service qui en dépend.
C'est voulu ici, mais prévenez l'exploitant qui a l'habitude de redémarrer la base « vite fait » en journée.
:::

## Mieux qu'un sleep : attendre que la base réponde

Le `sleep 10` fonctionne, mais il est aveugle : trop court un jour de forte charge, trop long le reste du temps. La
version propre attend que le port de la base réponde, avec une limite :

```bash title="/usr/local/bin/wait-for-port.sh"
#!/bin/bash
# Usage : wait-for-port.sh <hôte> <port> [timeout_s]
host="$1"; port="$2"; timeout="${3:-60}"
for ((i = 0; i < timeout; i++)); do
  if (echo > "/dev/tcp/${host}/${port}") 2>/dev/null; then
    exit 0
  fi
  sleep 1
done
echo "Port ${host}:${port} injoignable après ${timeout}s" >&2
exit 1
```

Puis dans l'unité, à la place du `sleep` :

```ini
ExecStartPre=/usr/local/bin/wait-for-port.sh 127.0.0.1 31438 60
```

Si le port ne répond pas dans le délai, `ExecStartPre` échoue et le service ne démarre pas : vous le verrez dans
`systemctl status`, au lieu de découvrir un service « actif » qui ne fait rien.

Pour rendre le tout résilient, ajoutez un redémarrage automatique en cas d'échec :

```ini
[Service]
Restart=on-failure
RestartSec=15
```

## Vérifier l'ordre réel de démarrage

Après un redémarrage complet du serveur, systemd sait vous dire dans quel ordre les choses se sont passées :

```bash
systemd-analyze critical-chain gescore-genpdf.service
systemctl show gescore-genpdf -p After -p Requires
journalctl -b -u unidata -u gescore-genpdf --no-pager | head -40
```

`critical-chain` affiche la chaîne d'unités qui a conditionné le démarrage, avec les délais. Si `unidata.service`
n'y apparaît pas, la directive n'a pas été prise en compte : vérifiez qu'il n'y a pas une faute de frappe dans le nom
de l'unité, `systemd` ignore silencieusement une dépendance vers une unité inconnue.

:::tip
Plutôt que de modifier l'unité de l'éditeur, créez un fichier de surcharge avec `systemctl edit gescore-genpdf`. Il
sera écrit dans `/etc/systemd/system/gescore-genpdf.service.d/override.conf` et survivra aux mises à jour du logiciel.
Ne mettez dedans que les lignes qui changent : `[Unit]`, `After=`, `Requires=`, et éventuellement `ExecStartPre=`.
:::

## Pour aller plus loin

- [Runbook : redémarrer une infrastructure virtualisée après une coupure électrique](/docs/windows-server/runbook-redemarrer-une-infrastructure-virtualisee-apres-coupure/) : le même problème d'ordre, à l'échelle de toute une salle serveur.
- [Réinitialiser winbind sur un serveur Linux joint à Active Directory](/docs/linux/winbind-reinitialiser-la-jonction-active-directory/) : un autre service qui n'aime pas démarrer avant le réseau.
- La page `man systemd.unit` détaille toutes les directives d'ordonnancement et de dépendance.

<!-- source : mail « Demande de modification du service GENPDF », 2024-11-22 -->

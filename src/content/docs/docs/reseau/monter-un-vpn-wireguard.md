---
title: "Monter un VPN WireGuard pour ses accès distants"
description: "Serveur, pairs, clés, routage et poste mobile : comment monter un accès distant WireGuard qui tient la route, et ce qu'il faut comprendre avant de coller une configuration trouvée sur Internet."
published: 2026-04-14
category: reseau
tags: [wireguard, vpn, docker, reverse-proxy, teletravail, routage]
level: intermédiaire
status: à jour
featured: false
tested_on: [WireGuard, Docker, wg-easy, nginx]
sidebar:
  label: "Monter un VPN WireGuard"
---

On monte un VPN WireGuard pour deux raisons quand on gère l'informatique d'une PME : avoir un accès distant
qui ne dépende pas du contrat de support d'un pare-feu, et un tunnel qui se rétablit tout seul quand le
portable passe du wifi de la maison à la 4G du train.

Il fait les deux, avec une configuration qui tient sur un écran. C'est aussi son piège : comme c'est court, on
la copie d'un tutoriel sans comprendre quelle ligne fait quoi, et on obtient un tunnel qui monte mais ne route
rien — ou pire, qui capture tout le trafic d'un poste en télétravail sans que personne l'ait décidé.

## Prérequis

- Une machine Linux joignable depuis Internet. Un petit gabarit suffit : WireGuard vit dans le noyau.
- **Un port UDP** ouvert en entrée, en général `51820/udp`. Pas de repli TCP, WireGuard n'existe qu'en UDP.
- **Un nom DNS public**, par exemple `vpn.example.com`. Jamais une adresse IP en dur dans les profils : le
  jour où l'opérateur la change, vous redistribuez trente fichiers.
- Un plan d'adressage libre pour le tunnel, **sans conflit avec aucun réseau utilisateur**. C'est le point
  qu'on oublie : si vous prenez `192.168.1.0/24`, tous ceux dont la box est en `192.168.1.x` seront hors jeu.
- Aucun autre client VPN déjà installé sur les postes concernés : deux piles VPN, c'est deux tables de routage
  qui se disputent la passerelle par défaut.

## Comprendre le modèle avant de configurer

WireGuard n'a ni serveur ni client au sens strict : il n'y a que des **pairs**, chacun connaissant la clé
publique des autres. Ce qu'on appelle le serveur est le pair qui a une adresse fixe et n'initie jamais la
connexion.

| Notion | Ce que c'est | L'erreur classique |
| --- | --- | --- |
| Couple de clés | Une clé privée qui ne quitte jamais la machine, une clé publique qu'on distribue | Générer les clés du poste sur le serveur, puis les envoyer par mail |
| `AllowedIPs` | Les réseaux joignables **par ce pair** — à la fois une route et un filtre | Mettre `0.0.0.0/0` partout « parce que ça marche » |
| `Endpoint` | Où joindre le pair distant. Renseigné côté client, appris côté serveur | Une IP publique en dur au lieu d'un nom DNS |

Retenez surtout `AllowedIPs`. Côté client, c'est **ce qui part dans le tunnel** ; côté serveur, **ce qui est
autorisé à en sortir pour ce pair**. La même directive fait table de routage et contrôle d'accès : élégant, et
déroutant la première fois.

## Générer les clés proprement

Une clé privée se génère sur la machine qui l'utilisera et n'en bouge pas.

```bash title="Générer un couple de clés et une clé pré-partagée"
umask 077
wg genkey | tee serveur.key | wg pubkey > serveur.pub
wg genkey | tee poste-01.key | wg pubkey > poste-01.pub
wg genpsk > poste-01.psk   # clé pré-partagée, optionnelle
```

:::danger
Les fichiers WireGuard contiennent les clés **en clair**. Traitez-les comme des mots de passe : `chmod 600`,
coffre-fort, jamais dans un dépôt Git ni dans un partage ouvert.
:::

## Configurer le serveur

La configuration native tient dans un fichier. Sachez l'écrire même si vous passez ensuite par une interface
graphique : le jour où ça ne marche pas, c'est ce fichier que vous lirez.

```ini title="/etc/wireguard/wg0.conf — côté serveur"
[Interface]
Address    = 10.66.66.1/24
ListenPort = 51820
PrivateKey = <clé privée du serveur>
# Masque le tunnel derrière l'adresse du serveur ; PostDown fait l'inverse avec -D
PostUp     = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Poste portable 01
PublicKey    = <clé publique du poste 01>
PresharedKey = <clé pré-partagée du poste 01>
AllowedIPs   = 10.66.66.2/32
```

Un pair, un bloc `[Peer]`, une adresse en `/32`. Verbeux et voulu : vous savez qui a le droit d'entrer, et
vous révoquez en supprimant cinq lignes. Le routage IP doit ensuite être activé, sinon le tunnel monte et
s'arrête là :

```bash title="Activer le routage et démarrer le tunnel"
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-wireguard.conf
sudo sysctl --system
sudo systemctl enable --now wg-quick@wg0
sudo wg show
```

`wg show` est votre tableau de bord : pairs, adresse source, volumes, date du dernier échange (`latest
handshake`). Un pair sans échange récent n'est pas connecté, quoi qu'affiche l'icône sur le poste.

## Passer par une interface d'administration en conteneur

À la dixième demande du mois, éditer le fichier à la main lasse. Une interface web comme `wg-easy`, en
conteneur, génère les pairs et sort un QR code prêt à scanner. Le `wg0.conf` continue d'exister derrière.

```yaml title="docker-compose.yml — à adapter, pas à copier tel quel"
services:
  wg-easy:
    image: ghcr.io/wg-easy/wg-easy
    environment:
      - WG_HOST=vpn.example.com
      - WG_DEFAULT_DNS=192.0.2.10,192.0.2.11
      - PASSWORD_HASH=<empreinte bcrypt du mot de passe d'administration>
      - WG_PORT=51820
      - PORT=51821
    volumes:
      - ./wireguard:/etc/wireguard
    ports:
      - "51820:51820/udp"
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    sysctls:
      - net.ipv4.ip_forward=1
      - net.ipv4.conf.all.src_valid_mark=1
```

**Le mot de passe n'est pas stocké en clair** : l'interface attend une empreinte bcrypt, produite localement
avec le module `bcrypt` de Python. Dans un fichier Compose, les `$` de l'empreinte doivent être doublés (`$$`),
sinon Compose les prend pour des variables et le mot de passe ne fonctionne jamais.

**Le port de l'interface web n'est pas publié** : seul `51820/udp` l'est, et un reverse proxy publie
l'administration en HTTPS.

```nginx title="Bloc serveur du reverse proxy"
server {
    server_name vpn.example.com;
    location / {
        proxy_pass http://wg-easy:51821/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Les en-têtes `Upgrade` et `Connection` ne sont pas décoratifs : sans eux, les statistiques temps réel restent
figées, parce qu'elles passent par un WebSocket. Et si vous pouvez réserver cette console au réseau interne,
faites-le : une administration de VPN publiée sur Internet est une cible.

## Décider du routage : tunnel complet ou partiel

La vraie décision de conception, à prendre avant de distribuer le premier profil. **Tunnel partiel**
(`AllowedIPs = 10.0.0.0/8`) : seuls les réseaux internes passent par le VPN, c'est rapide et économe sur le
lien du site. **Tunnel complet** (`AllowedIPs = 0.0.0.0/0`) : tout passe par le VPN, Internet compris —
nécessaire si le filtrage de l'entreprise doit s'appliquer en télétravail, à condition que le lien encaisse.

Le DNS suit la même logique : sur un tunnel partiel, la plage des résolveurs internes doit figurer dans
`AllowedIPs`, sinon le poste interroge un serveur qu'il ne sait pas joindre.

```ini title="Profil client — tunnel partiel vers les réseaux internes"
[Interface]
Address    = 10.66.66.2/32
PrivateKey = <clé privée du poste>
DNS        = 192.0.2.10, 192.0.2.11

[Peer]
PublicKey           = <clé publique du serveur>
PresharedKey        = <clé pré-partagée>
Endpoint            = vpn.example.com:51820
AllowedIPs          = 10.0.0.0/8, 10.66.66.0/24
PersistentKeepalive = 25
```

`PersistentKeepalive = 25` maintient ouverte la traduction d'adresses du routeur d'en face. Sans lui, un poste
derrière une box devient injoignable depuis le site après quelques minutes.

## Le cas du poste mobile

Le pair le plus simple à déclarer, et le plus difficile à faire adopter.

**Distribuez un QR code, pas un fichier.** L'application mobile importe un profil en le scannant à l'écran :
cinq secondes, aucune pièce jointe à retrouver, aucune clé qui traîne dans la galerie photo.

**Un profil par appareil, jamais partagé**, nommé d'après l'appareil (« portable atelier 2 »). Le même couple
de clés sur deux appareils provoque des déconnexions permanentes : le serveur ne mémorise qu'un point de
terminaison par pair.

**Prévoyez le DNS.** C'est le premier point de friction : le tunnel affiche « connecté » mais l'intranet ne
s'ouvre pas, parce que le système a gardé le résolveur de l'opérateur. Poussez les résolveurs internes et
testez avec un nom, pas avec un `ping` d'adresse IP.

**Rendez la connexion accessible en un geste** : raccourci d'écran d'accueil ou activation à la demande. Si
l'utilisateur doit ouvrir une application et basculer un interrupteur, il ne le fera pas — il vous appellera.

:::tip
Testez toujours un profil mobile en 4G, jamais sur le wifi du bureau. Sur le réseau interne, tout fonctionne —
y compris sans le tunnel. Vous ne validez rien.
:::

## Vérifier que ça marche vraiment

1. **Le handshake**, avec `sudo wg show`. Pas de `latest handshake` récent ? Le problème est en amont : port
   UDP fermé, redirection absente sur le routeur, ou nom DNS qui pointe ailleurs.
2. **Le ping dans le tunnel.** S'il passe mais que rien d'autre ne passe, regardez `AllowedIPs` et le routage
   du site.
3. **Le retour.** Les équipements internes doivent savoir revenir vers la plage du tunnel : route statique,
   ou masquage derrière l'adresse du serveur comme dans le `PostUp` plus haut.
4. **Un nom, pas une adresse.** Le dernier test se fait sur un nom interne : c'est lui qui attrape les
   problèmes de DNS.

Dernier point : WireGuard authentifie des clés, pas des utilisateurs. Ni annuaire, ni second facteur, ni
expiration. Un poste volé garde l'accès jusqu'à la suppression de son `[Peer]` : tenez la liste des pairs et
de leurs propriétaires, et mettez la révocation dans votre procédure de départ.

## Pour aller plus loin

- [Deux agents VPN sur le même poste](/docs/reseau/deux-agents-vpn-sur-le-meme-poste/)
- [DNS interne cassé par un client VPN ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/)
- [Mettre un boîtier sans HTTPS derrière un reverse proxy](/docs/self-hosting/mettre-un-boitier-sans-https-derriere-un-reverse-proxy/)

<!-- source : procédures internes « VPN WireGuard » et « VPN mobile », centre de documentation -->

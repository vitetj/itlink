---
title: "Prendre en main un serveur dédié : les dix premières choses à faire"
description: "Ce qu'il faut traiter dans les premiers jours après la livraison d'un serveur dédié : système, console et mode secours, SSH, pare-feu, IP failover, sauvegardes, supervision et DNS inverse."
published: 2025-10-14
category: cloud-web
tags: [ovhcloud, serveur-dedie, ssh, pare-feu, supervision, dns]
level: intermédiaire
status: à jour
featured: false
tested_on: [VMware ESXi 6.7 U3, pfSense]
sidebar:
  label: "Prendre en main un serveur dédié…"
---

Un serveur dédié n'arrive pas comme un serveur de la salle machines. Vous ne le déballez pas, vous ne
verrez jamais ses disques, et personne ne passera le redémarrer à votre place. Ce que vous recevez, c'est
un mail : une adresse IP, un nom d'hôte généré par l'hébergeur, un mot de passe `root`, et parfois un bloc
d'adresses publiques supplémentaires. À partir de là, tout est à vous — y compris les erreurs.

J'ai repris une de ces machines chez OVHcloud : livrée avec un hyperviseur préinstallé, un bloc d'IP
failover, un espace de sauvegarde FTP inclus, et rien d'autre. Voici les dix choses à traiter dans les
premiers jours. L'ordre compte : les trois premières évitent de vous enfermer dehors, les suivantes
évitent qu'on entre.

## Prérequis

- Un compte nominatif sur l'espace client de l'hébergeur, avec authentification multifacteur.
- Un gestionnaire de mots de passe. Les identifiants livrés par mail n'ont rien à faire dans une boîte
  aux lettres.
- Un nom de domaine que vous contrôlez, avec accès à sa zone DNS.
- Une paire de clés SSH, générée sur votre poste d'administration.

## 1. Inventorier ce qui a été livré

Les mails d'activation arrivent en désordre et contiennent tout ce qui compte : IP principale, nom d'hôte
par défaut, identifiants de l'espace de sauvegarde, caractéristiques du bloc d'IP supplémentaire. Faites-en
une fiche unique dans votre documentation avant de les archiver.

:::danger
Ces mails contiennent des mots de passe en clair. Recopiez-les dans le coffre, changez-les, supprimez les
messages. Une boîte compromise trois ans plus tard ne doit pas livrer les accès de votre infrastructure.
:::

## 2. Décider si vous gardez le système livré

L'hébergeur installe un modèle pour que la machine démarre, pas pour qu'elle vous serve dix ans. La
mienne est arrivée avec VMware ESXi 6.7 U3 : fonctionnel, mais une version en fin de support. Réinstaller
au jour zéro coûte vingt minutes ; au jour deux cents, une fenêtre de maintenance, une migration et des
explications.

Trois questions suffisent : la version livrée est-elle encore supportée, le partitionnement correspond-il à
votre usage, et saurez-vous exploiter ce système ? Une réinstallation depuis l'espace client, avec
partitionnement personnalisé et votre clé SSH injectée, règle les trois d'un coup.

## 3. Tester la console et le mode secours avant d'en avoir besoin

C'est l'étape que tout le monde saute et la seule qui vous sauvera un dimanche soir.

Deux accès existent hors du système : la console distante (KVM/IPMI selon la gamme), qui vous donne l'écran
de la machine, et le mode secours, qui démarre le serveur sur un système en mémoire, avec des identifiants
temporaires envoyés par mail. Vos disques n'y sont pas montés : vous les montez à la main.

Faites le test maintenant : bascule en secours, montage de la partition racine, lecture d'un fichier de
configuration, retour en démarrage normal.

```bash title="Repères en mode secours"
lsblk                      # identifier les disques et les partitions
mount /dev/md2 /mnt        # ou le volume logique LVM correspondant
ls /mnt/etc                # confirmer que c'est bien votre système
umount /mnt
```

Le jour où une règle de pare-feu vous coupe l'accès SSH, vous saurez quoi faire au lieu d'apprendre.

## 4. Durcir SSH immédiatement

Un serveur dédié a une adresse publique : les tentatives d'authentification commencent dans l'heure, avant
même qu'il ne serve à quelque chose.

Créez un compte d'administration nominatif avec `sudo`, déposez-y votre clé publique, vérifiez que vous
vous connectez avec, **puis seulement** durcissez la configuration.

```ini title="/etc/ssh/sshd_config (extrait)"
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
AllowUsers monadmin
```

:::caution
Gardez la session en cours ouverte pendant le rechargement du service, et ouvrez-en une seconde pour tester.
Si la nouvelle échoue, vous corrigez depuis la première. Sinon, direction le mode secours.
:::

Ajoutez un outil de bannissement d'adresses (`fail2ban` ou équivalent) : il ne remplace pas
l'authentification par clé, il vide les journaux du bruit de fond. Sur un hyperviseur ESXi, c'est l'inverse :
SSH est désactivé par défaut, laissez-le ainsi et ne l'activez que le temps d'une intervention.

## 5. Filtrer avant la machine, pas seulement dessus

Trois niveaux se cumulent, et ils ne font pas le même travail.

| Niveau | Ce qu'il fait | Sa limite |
|---|---|---|
| Pare-feu réseau de l'hébergeur | Filtre en amont, avant que le trafic n'atteigne votre lien | Souvent sans état : on filtre par IP et par port, pas par connexion |
| Pare-feu du système | Règles fines, par service, sur la machine elle-même | Ne protège pas de ce qui sature le lien |
| Pare-feu virtuel (VM dédiée) | Passerelle et NAT pour les machines virtuelles hébergées | C'est une VM : elle tombe si l'hôte tombe |

Sur ma plateforme, une VM pfSense sert de passerelle : elle porte les adresses publiques utiles, fait le NAT
vers les machines internes, et ne publie que les services qui doivent l'être, par redirection de port
explicite.

La règle non négociable : **l'interface d'administration de l'hyperviseur ne s'expose pas sur Internet.**
Ni sa console web, ni son SSH. On y accède par VPN ou depuis une liste d'adresses sources restreinte.

## 6. Comprendre le bloc d'IP supplémentaires avant de le distribuer

C'est le piège le plus classique : le bloc se configure de deux façons selon l'usage, et vous ne lirez
qu'en diagonale le mail qui les décrit.

Prenons un bloc d'exemple `198.51.100.64/26`, routé vers un serveur dont l'IP principale est
`203.0.113.151`.

- **Sur le serveur ou sur des VM en pont (bridge)** : chaque adresse se configure en `255.255.255.255`
  (/32), et la passerelle n'est pas dans le bloc — c'est celle de votre IP principale, ici
  `203.0.113.254`. Tout le bloc est utilisable. Les VM en pont réclament en plus une adresse MAC virtuelle
  générée depuis l'espace client, sans quoi le trafic est filtré en amont.
- **Dans un réseau privé de l'hébergeur (vRack) ou une offre cloud dédiée** : le bloc redevient un
  sous-réseau classique en `255.255.255.192` (/26), et vous perdez trois adresses : réseau
  `198.51.100.64`, passerelle `198.51.100.126`, diffusion `198.51.100.127`.

Notez le choix retenu dans la documentation du serveur : le prestataire suivant se posera la même question,
et le mail d'origine aura disparu.

## 7. Découper le réseau interne

Ne donnez pas une adresse publique à chaque machine virtuelle sous prétexte que le bloc en contient
soixante-quatre : chaque adresse publique est une surface d'attaque de plus.

Le découpage qui marche : un réseau d'administration et un réseau de production séparés, en adressage privé
derrière la passerelle — par exemple `10.20.0.0/24` et `10.30.0.0/24` —, une sortie par NAT, et seulement
les entrées nécessaires en redirection de port ou derrière un reverse proxy. Un service qui n'a pas besoin
d'être joignable depuis Internet ne doit pas l'être, même « le temps des tests ».

## 8. Brancher les sauvegardes, sans faire confiance à l'espace inclus

La plupart des offres dédiées incluent un espace de sauvegarde — sur la mienne, 500 Go en FTP, avec une
contrainte utile : la connexion n'est autorisée que depuis le serveur lui-même.

C'est pratique et insuffisant : même fournisseur, et un espace joignable depuis la machine sauvegardée, donc
atteignable par un compte compromis sur celle-ci. Voyez-le comme la copie rapide, celle qui restaure un
fichier effacé. La copie hors site, chez un autre fournisseur, avec une rétention que le serveur ne peut pas
modifier, reste à faire.

## 9. Superviser autre chose que le ping

La supervision incluse répond à une seule question : la machine répond-elle au ping ? Elle ne dit rien de
vos services. Vérifiez aussi ce qu'elle déclenche : certaines offres redémarrent le serveur en cas de
non-réponse, rarement ce que vous voulez sur un hyperviseur.

Ajoutez donc une sonde externe par service publié — code HTTP et expiration du certificat — avec une alerte
qui arrive là où vous la lirez ; et, côté machine, espace disque, état du RAID et des disques (SMART),
application effective des correctifs.

## 10. Poser le DNS et le DNS inverse

Le nom livré par l'hébergeur est technique et ne doit pas rester la seule identité de la machine.

1. Créez un enregistrement `A` sur votre domaine, par exemple `srv1.example.com`, vers l'IP principale.
2. Renseignez le DNS inverse (PTR) depuis l'espace client, avec exactement ce nom. La plupart des
   hébergeurs le refusent tant que l'enregistrement direct n'existe pas.
3. Vérifiez la cohérence dans les deux sens.

```bash title="Contrôle direct et inverse"
dig +short srv1.example.com
dig +short -x 203.0.113.151
```

Cette symétrie n'est pas cosmétique : un serveur qui envoie du courrier sans PTR cohérent voit ses messages
classés en indésirable ou rejetés, et le diagnostic prend une demi-journée.

## Pour aller plus loin

- La suite logique de l'étape 8 : [Migrer ses sauvegardes de Backblaze B2 vers OVH Object Storage](/docs/cloud-web/migrer-ses-sauvegardes-de-backblaze-b2-vers-ovh-object-storage/).
- Pour l'étape 9, une sonde externe simple à exploiter : [Surveiller ses services avec Uptime Kuma](/docs/self-hosting/surveiller-ses-services-avec-uptime-kuma/).
- Avant de choisir l'adressage de l'étape 7 : [Les trois plages IP privées de la RFC 1918](/docs/reseau/les-trois-plages-ip-privees-rfc-1918/).
- La documentation officielle des IP supplémentaires, en
  [aliasing sur une interface](https://docs.ovh.com/fr/fr/cloud/dedicated/network-ipaliasing/) ou en
  [pont vers des VM](https://docs.ovh.com/fr/fr/cloud/dedicated/network-bridging/).

<!-- source : procédure interne « Serveur dédié : livraison, IP failover, sauvegarde et pare-feu », export du centre de documentation -->

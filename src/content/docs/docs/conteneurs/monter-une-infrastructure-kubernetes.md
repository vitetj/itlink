---
title: "Monter une petite infrastructure Kubernetes : ce qu'il faut décider avant d'installer"
description: "Retour de maquette sur un cluster kubeadm monté dans une PME : les six décisions à prendre avant la première commande (runtime, plages IP, stockage, entrée, RBAC), le squelette d'installation, et le verdict."
published: 2026-09-01
category: conteneurs
tags: [kubernetes, kubeadm, cni, stockage, rbac, maquette]
level: expert
status: à jour
tested_on: [Ubuntu Server 18.04, Docker CE, Flannel, Rook Ceph]
sidebar:
  label: "Monter une infrastructure Kubernetes"
---

À un moment, dans toute PME qui héberge ses propres applications, quelqu'un pose la question : « et si on
passait sur Kubernetes ? ». J'ai monté un cluster de trois nœuds pour pouvoir répondre autrement que par une
opinion. La procédure interne que j'en ai tirée est restée marquée « en cours » pendant des années, et ce n'est
pas un oubli : c'est le résultat de l'exercice.

Cette fiche n'est pas un tutoriel d'installation de plus. `kubeadm init` tient en une ligne, et c'est bien le
problème : les décisions qui comptent se prennent avant, et se rattrapent très mal après.

## Décision 0 : est-ce que vous en avez besoin ?

Kubernetes résout des problèmes précis : faire tourner des applications sur plusieurs machines sans se soucier
de laquelle, redémarrer automatiquement ce qui tombe, déployer par vagues avec retour arrière, et donner à
plusieurs équipes un cadre commun de déploiement.

Il en crée d'autres, tout aussi précis : un plan de contrôle à maintenir, un réseau overlay à déboguer, du
stockage distribué à surveiller, et une montée de version mineure tous les trois à quatre mois, avec une
fenêtre de support courte.

Pour une quinzaine d'applications internes qui tournent sur un serveur avec Compose et un reverse proxy, le
gain est nul et le coût réel. Kubernetes commence à se défendre quand la perte d'une machine ne doit pas
interrompre le service, et quand plusieurs personnes déploient sans se marcher dessus. Posez-vous la question
dans ce sens-là.

## Décision 1 : l'installateur, et donc le mainteneur

Trois familles de réponses : un cluster managé chez un hébergeur, une distribution légère intégrée, ou
`kubeadm` à la main. `kubeadm` donne la compréhension complète de ce que vous montez — et la responsabilité
complète de son maintien. C'est la voie que j'ai prise pour la maquette, précisément pour savoir ce qu'il y a
dans la boîte.

:::caution
Attention aux procédures que vous trouverez, y compris internes : Kubernetes bouge vite. Les dépôts historiques
en `kubernetes-xenial` ajoutés avec `apt-key` n'existent plus ; les paquets viennent aujourd'hui de
`pkgs.k8s.io`, et **chaque branche mineure a son propre dépôt**. Choisir sa version n'est donc pas une
formalité : c'est la première décision, elle détermine l'URL du dépôt et le rythme de vos mises à jour.
:::

## Décision 2 : le runtime de conteneurs

Les procédures d'avant 2022 installent Docker, souvent épinglé à une version précise. Depuis la version 1.24,
Kubernetes ne parle plus directement à Docker : il faut un runtime compatible CRI, en pratique containerd ou
CRI-O.

Le point qui coûte le plus cher à diagnostiquer : le **pilote de cgroups** doit être `systemd`, et il doit être
le même côté kubelet et côté runtime. Une incohérence ne se voit pas à l'installation. Elle se voit sous
charge, par des nœuds qui passent en `NotReady` sans raison apparente.

## Décision 3 : les trois plages IP

C'est le sujet que personne n'anticipe et qui casse tout. Un cluster manipule trois réseaux distincts :

| Réseau | Rôle | Valeur courante |
| --- | --- | --- |
| Réseau des nœuds | Le LAN où vivent les machines | Votre plan d'adressage |
| CIDR des pods | Adresses distribuées aux conteneurs | `10.244.0.0/16` pour Flannel |
| CIDR des services | Adresses virtuelles internes | `10.96.0.0/12` par défaut |

Ces trois plages ne doivent se chevaucher ni entre elles, ni avec quoi que ce soit d'existant sur le réseau de
l'entreprise : ni les VLAN machines, ni les sous-réseaux du VPN, ni les plages du prestataire. Dans une PME
industrielle où le plan d'adressage s'est construit au fil de vingt ans, la collision est le premier incident,
et son symptôme est déroutant : les pods joignent Internet mais plus l'ERP.

La valeur choisie doit correspondre à ce qu'attend le plugin réseau retenu, et se déclare à l'initialisation :

```bash
kubeadm init --pod-network-cidr=10.244.0.0/16
```

## Décision 4 : le stockage persistant

Sans stockage persistant, un cluster ne sait faire tourner que des applications sans état — donc pas grand
chose d'utile dans une PME. Trois options : un partage NFS existant avec un provisionneur, une baie qui expose
un pilote CSI, ou du stockage distribué construit sur les disques des nœuds.

J'ai testé la troisième avec Rook et Ceph : un opérateur déployé dans le cluster, un pool de blocs, et une
`StorageClass` qui permet aux applications de réclamer des volumes toutes seules.

```yaml title="Un pool de blocs, en maquette"
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 1
```

:::danger
`size: 1` signifie **aucune réplication**. C'est acceptable sur une maquette, jamais ailleurs : la panne d'un
nœud emporte les données. Et un stockage distribué sérieux réclame au minimum trois nœuds avec des disques
dédiés, pas trois VM qui se partagent la même baie — sinon vous répliquez trois fois sur le même disque
physique, avec la lenteur en prime et la résilience en moins.
:::

Prévoyez aussi la place : mes nœuds ont saturé dès les premiers volumes dynamiques, et il a fallu étendre le
volume logique système avant de pouvoir continuer. Un cluster consomme du disque sur les nœuds, y compris pour
des choses qui n'ont rien à voir avec vos données.

## Décision 5 : comment on entre dans le cluster

Un service Kubernetes n'est pas joignable de l'extérieur par défaut. Il faut choisir entre `NodePort` (un port
haut ouvert sur chaque nœud, simple et laid), un service `LoadBalancer` — qui suppose une infrastructure
capable d'en fournir un, ce qui n'est pas le cas d'une salle serveur de PME sans composant supplémentaire — ou
un contrôleur d'Ingress qui centralise le routage HTTP et les certificats.

En pratique, dans une PME, la combinaison qui fonctionne est un contrôleur d'Ingress publié en `NodePort`,
derrière le reverse proxy qui existe déjà. Et des noms DNS internes prévus dès le départ, pas bricolés après
coup : `appli.example.com` doit pointer quelque part avant que quiconque teste.

## Décision 6 : qui a le droit de faire quoi

Le tableau de bord Kubernetes s'installe en deux commandes. Le raccourci universel que l'on trouve dans tous
les tutoriels — et que j'ai suivi sur la maquette — consiste à lui attribuer le rôle `cluster-admin` et à
l'exposer en `NodePort`.

C'est acceptable dix minutes sur un réseau isolé. C'est inacceptable partout ailleurs : vous publiez une
interface web qui a tous les droits sur tout le cluster. Si vous gardez le tableau de bord, donnez-lui un
compte de service aux droits limités, ne l'exposez qu'en local, et passez par `kubectl proxy` ou un tunnel.
Plus généralement : un compte de service par usage, des rôles nommés, et l'`admin.conf` traité comme la clé
maîtresse qu'il est.

## Le squelette d'installation

Une fois les six décisions prises, l'installation elle-même est courte. Sur tous les nœuds :

```bash title="Préparation des nœuds"
swapoff -a
# puis commenter définitivement la ligne swap dans /etc/fstab
free -m
```

:::caution
Beaucoup de procédures — dont la mienne, à l'époque — désactivent purement et simplement le pare-feu des nœuds
pour que « ça marche ». Ne le faites pas au-delà d'un banc de test. Ouvrez les flux nécessaires : `6443` pour
l'API, `2379-2380` pour etcd sur le plan de contrôle, `10250` pour les kubelets, la plage `30000-32767` pour
les NodePort, plus les ports propres au plugin réseau retenu.
:::

Sur le premier nœud du plan de contrôle :

```bash
kubeadm init --pod-network-cidr=10.244.0.0/16

mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config

kubectl apply -f <manifeste du plugin réseau choisi>
kubectl get pods --all-namespaces
kubectl get nodes -o wide
```

Tant que le plugin réseau n'est pas déployé, le nœud reste en `NotReady` et le DNS interne tourne en boucle.
C'est normal, pas la peine de tout recommencer.

Puis sur chaque nœud de calcul, la commande d'adhésion affichée à la fin du `kubeadm init` :

```bash
kubeadm join 192.0.2.10:6443 --token <jeton> --discovery-token-ca-cert-hash sha256:<empreinte>
```

Le jeton expire au bout de 24 heures. Si vous revenez le lendemain, ou si vous avez perdu la commande, elle se
régénère :

```bash
kubeadm token create --print-join-command
```

## Le verdict, après la maquette

Le cluster a fonctionné. Il a survécu au redémarrage d'un nœud, les volumes dynamiques se créaient tout seuls,
et voir une application se relancer ailleurs sans intervention reste impressionnant.

Et pourtant je ne l'ai pas mis en production. Entre le plan de contrôle, le plugin réseau, le stockage
distribué, le contrôleur d'Ingress et le tableau de bord, j'avais cinq composants ayant chacun son propre cycle
de vie, ses propres notes de version et ses propres incompatibilités — pour une DSI d'une personne, et une
charge que deux serveurs avec Compose absorbaient sans se plaindre.

Si le besoin revient, la question ne sera pas « comment installer Kubernetes » mais « qui l'exploite ». Et la
réponse raisonnable, dans une structure de cette taille, sera un cluster managé.

## Pour aller plus loin

- L'étage du dessous, celui qu'il faut maîtriser d'abord :
  [Démarrer avec Docker sur un serveur](/docs/conteneurs/demarrer-avec-docker-sur-un-serveur/).
- Pour choisir des plages qui n'entrent en collision avec rien :
  [Les trois plages IP privées de la RFC 1918](/docs/reseau/les-trois-plages-ip-privees-rfc-1918/).
- Quand les nœuds saturent avant les applications :
  [Agrandir un disque sous Linux avec LVM](/docs/linux/agrandir-un-disque-avec-lvm/).
- La référence officielle, à relire à chaque version : « Creating a cluster with kubeadm » sur kubernetes.io.

<!-- source : procédure interne « Installation d'une infrastructure Kubernetes », maquette restée en cours, 2026-09-01 -->

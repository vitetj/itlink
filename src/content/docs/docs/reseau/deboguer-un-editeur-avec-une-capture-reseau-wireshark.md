---
title: "Prouver à un éditeur que le problème vient de chez lui : la capture réseau comme argument"
description: "Un support qui ne bouge pas ne cède pas à l'insistance, il cède à la preuve. Où capturer, quels filtres Wireshark utiliser, quoi montrer, et comment présenter deux captures qui isolent une régression."
published: 2025-11-12
category: reseau
tags: [wireshark, capture-reseau, diagnostic, support-editeur, regression]
level: avancé
status: à jour
featured: true
tested_on: [Wireshark, Android 14, iOS 26.0.1]
sidebar:
  label: "Prouver à un éditeur que le problème…"
---

Un matin d'octobre, tout un plateau de bureaux est resté allumé. Pas une panne électrique : une mise à jour.
L'application mobile qui pilote l'éclairage DALI du bâtiment était passée d'une version 2.3 à une version 3.0
la veille au soir, et depuis, elle ne détectait plus aucun contrôleur. Sans ordre, les luminaires restent
allumés en permanence. La version précédente, elle, fonctionnait parfaitement.

Le support a répondu ce que répondent tous les supports : réinstallez, redémarrez, vérifiez votre réseau. Six
semaines plus tard, le dossier a bougé — parce que je leur ai envoyé deux captures réseau : une prise avec la
version qui marche, une avec celle qui ne marche pas. Détail savoureux : leur première réaction a été de me
demander pourquoi je leur envoyais des photos.

Cette fiche décrit la méthode, pas l'outil. Wireshark s'apprend en une soirée ; construire un dossier qu'un
éditeur ne peut pas renvoyer, c'est autre chose.

## Ce qu'une capture prouve, et ce qu'elle ne prouve pas

Une capture prouve **ce qui est parti et ce qui est revenu**. Rien d'autre, et c'est déjà énorme : ça déplace
le débat de l'opinion (« ça doit être votre réseau ») vers le fait vérifiable. Elle ne dit rien de ce qui se
passe **dans** l'application — un plantage interne ne laisse aucune trace réseau — mais une capture vide côté
client est déjà un résultat : le logiciel n'a même pas essayé.

La force du dossier ne vient donc jamais d'une capture seule, mais de **deux captures comparables** : même
poste, même réseau, même manipulation, seule la version change. C'est cette paire qui transforme une plainte en
régression documentée.

## Prérequis

- Wireshark installé sur un poste d'administration, avec les droits de capture.
- Un moyen de placer ce poste sur le même segment que le client et l'équipement (port miroir, partage de
  connexion — voir plus bas).
- Les deux versions du logiciel : celle qui marche et celle qui ne marche pas. Sans la première, pas de témoin.
- Un scénario de test court et reproductible : « ouvrir l'application, lancer la recherche d'équipements,
  attendre 30 secondes ». Le même pour les deux versions.

## Éliminer tout le reste avant de sortir Wireshark

Une capture envoyée trop tôt se fait renvoyer. Avant de capturer, fermez les portes une par une :

1. **Isoler la régression.** L'ancienne version fonctionne, la nouvelle non, sur le même terminal et le même
   réseau : le problème n'est ni l'installation, ni l'environnement.
2. **Éliminer le matériel.** Rejouez le test sur plusieurs terminaux, de systèmes différents. Ici, la
   manipulation a été refaite sur une tablette Android 14 et un téléphone sous iOS 26 : même comportement, le
   terminal est hors de cause.
3. **Éliminer le réseau.** Vérifiez que le client et les équipements sont sur le même sous-réseau, sans routeur
   ni pare-feu entre les deux : beaucoup de protocoles de découverte reposent sur du broadcast ou du multicast,
   qui ne franchissent pas un routeur. Pour couper court, rejouez le test sur un partage de connexion 4G : le
   diagnostic devient agnostique à votre réseau, et l'argument est imparable.
4. **Documenter le matériel, précisément.** Modèle exact, version d'OS, version de noyau. Un support qui reçoit
   « Samsung Galaxy Tab A9 (SM-X110), Android 14, noyau `5.10.205-android12-9-28698995` » comprend qu'il n'a pas
   affaire à quelqu'un qui a « un problème avec l'appli ».

## Choisir le point de capture

Le point de capture décide de ce que vous verrez. C'est la décision la plus importante.

| Où capturer | Ce qu'on voit | Quand l'utiliser |
| --- | --- | --- |
| Sur le poste client (Windows, Linux, macOS) | Tout ce que le logiciel émet et reçoit | Cas le plus simple, client sur PC |
| Sur un port miroir du switch | Le trafic réel entre client et équipement, sans influer sur le client | Client mobile, ou doute sur une couche intermédiaire |
| Sur un poste servant de point d'accès Wi-Fi | Tout le trafic du mobile, sans rien installer dessus | Client mobile, pas d'accès au switch |

Quand le client est un mobile, la capture directe sur le terminal demande un accès privilégié que vous n'avez
pas. Restent le **port miroir** (SPAN) sur le switch qui porte le point d'accès, ou un **poste qui partage sa
connexion** au mobile. Dans les deux cas, capturez au plus près du client : vous voulez savoir si la requête
est partie, pas seulement si elle est arrivée.

:::caution
Une capture contient tout : en-têtes d'authentification, cookies, requêtes en clair, noms de machines, plan
d'adressage. Avant d'envoyer un fichier à un tiers, ouvrez-le et regardez ce qu'il y a dedans. Réduisez le
périmètre et la durée plutôt que d'anonymiser après coup.
:::

## Filtre de capture, filtre d'affichage : ne pas confondre

Deux mécanismes différents, et les confondre est l'erreur classique. Le **filtre de capture** (syntaxe BPF)
décide de ce qui est écrit sur le disque : irréversible, ce qui n'est pas capturé est perdu. On s'en sert pour
tenir la taille du fichier, jamais pour cibler finement.

```text title="Filtres de capture (BPF) — à poser avant de lancer"
host 192.0.2.50
host 192.0.2.50 or host 192.0.2.51
not port 22
```

Le **filtre d'affichage**, lui, ne perd rien : c'est là qu'on travaille. On capture large, on filtre après.

```text title="Filtres d'affichage Wireshark"
ip.addr == 192.0.2.50
udp.port == 1900 || udp.port == 5353          # découverte SSDP / mDNS
eth.dst == ff:ff:ff:ff:ff:ff                  # broadcast pur
!(arp || mdns || ssdp || icmpv6)              # nettoyer le bruit d'un LAN
tcp.flags.reset == 1                          # connexions refusées
tcp.analysis.retransmission                   # pertes, équipement injoignable
frame contains "identifiant-de-votre-appareil"
```

Pour un cas « l'application ne détecte plus les équipements », l'ordre est toujours le même : **la découverte
part-elle ? l'équipement répond-il ? le client exploite-t-il la réponse ?** Chaque question a une réponse
binaire dans la capture, et désigne un coupable différent.

## Ce qu'il faut montrer, concrètement

Le premier niveau de support ne lira pas votre capture ligne à ligne. La démonstration doit tenir dans le
message ; la capture n'est que la pièce justificative.

Réduisez votre propos à trois éléments :

1. **Le témoin.** « En version 2.3, le client émet N requêtes de découverte en 10 secondes et reçoit N réponses.
   Trames 12 à 48 du fichier `ok-2.3.pcapng`. »
2. **Le défaut.** « En version 3.0, dans le même scénario, le client n'émet aucune requête de découverte, ou en
   émet et ignore les réponses. Fichier `ko-3.0.pcapng`, aucun paquet ne correspond au filtre. »
3. **Le delta.** Une phrase qui nomme la différence, sans l'expliquer à leur place. Vous n'êtes pas leur
   développeur : vous documentez, ils diagnostiquent.

Nommez les fichiers pour qu'ils parlent tout seuls : `ok-2.3.pcapng` et `ko-3.0.pcapng`. Un support qui reçoit
`capture1` et `capture2` ouvrira le mauvais.

Deux outils livrés avec Wireshark rendent le colis présentable :

```bash title="Réduire et résumer une capture avant envoi"
# Ne garder que les 60 premières secondes utiles
editcap -A "2025-11-06 09:12:00" -B "2025-11-06 09:13:00" brut.pcapng ok-2.3.pcapng

# Produire un résumé lisible à coller dans le mail
tshark -r ko-3.0.pcapng -q -z io,phs
```

## Présenter le dossier au support

Quelques règles qui ont fait leurs preuves :

- **Dire ce que c'est.** « Ci-joint deux captures réseau, à ouvrir avec Wireshark. » Ça paraît condescendant ;
  ça ne l'est pas. Un technicien de premier niveau n'a pas forcément croisé le format.
- **Passer à l'anglais** dès que l'échange remonte au développement : « Let's switch to English to avoid wrong
  translation. » Une traduction approximative transforme un rapport de bug en malentendu.
- **Dater vos relances.** « Je n'ai pas eu de retour à mon message du 14/10. Sans les traces de mon réseau, le
  développement ne pourra pas reproduire le problème. » Une date vaut trois points d'exclamation.
- **Rester factuel quand le ton durcit.** On a le droit d'écrire qu'on se demande si la mise à jour a été testée
  avant publication ; on n'a rien à gagner à viser une personne.
- **Ne jamais lâcher le témoin.** Gardez une machine avec l'ancienne version jusqu'à la résolution.

## Quand la preuve ne suffit pas

La preuve est une monnaie d'échange, pas une garantie : un éditeur peut reconnaître le bug et ne rien livrer
avant six mois. Le travail change alors de nature : il ne s'agit plus de convaincre, mais de chiffrer un
contournement.

Dans le cas de l'éclairage, la question posée au métier a fini par tenir en une phrase : un interrupteur de
contournement câblé sur le circuit, ce ne serait pas plus simple ? Un plan B matériel rend l'entreprise
indépendante de la roadmap d'un fournisseur. Instruisez les deux pistes en parallèle dès que le dossier dépasse
deux semaines.

## Pour aller plus loin

- [Diagnostiquer une résolution DNS interne cassée par un client VPN ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/),
  un autre cas où la capture tranche entre « le réseau » et « le logiciel ».
- [Segmenter les réseaux machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/),
  parce qu'un protocole de découverte qui ne traverse pas un routeur est la première hypothèse à éliminer.
- [Auditer un fournisseur SaaS et exiger un plan de remédiation](/docs/dsi/auditer-un-fournisseur-saas-et-exiger-un-plan-de-remediation/),
  pour la suite de l'histoire quand l'éditeur ne bouge toujours pas.
- La documentation officielle de Wireshark détaille la syntaxe complète des deux familles de filtres.

<!-- source : mails « Débogage éditeur par capture réseau (Wireshark) », dossier application de pilotage d'éclairage, 2025-10-01 → 2025-11-12 -->

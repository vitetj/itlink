---
title: "RustDesk auto-hébergé : ports à ouvrir, documentation client et prise en main à double validation"
description: "Remplacer TeamViewer et AnyDesk par un serveur RustDesk hébergé en France : ports à autoriser, doc à envoyer aux clients, et un mode QuickSupport où rien ne se passe sans l'accord de l'utilisateur."
published: 2024-10-31
category: self-hosting
tags: [rustdesk, telemaintenance, self-hosting, pare-feu, industrie]
level: intermédiaire
status: à jour
featured: false
tested_on: [RustDesk Pro, Windows]
---

Ma boîte fabrique des machines. Elles partent chez des clients aux quatre coins du monde et, tôt ou tard, un
technicien du SAV a besoin de voir l'écran du PC qui pilote l'IHM pour comprendre ce qui coince. Pendant des années,
ça passait par TeamViewer ou AnyDesk. Des licences par technicien dont le prix grimpe à chaque renouvellement, des
CVE à répétition (AnyDesk a eu droit à CVE-2023-26509 puis CVE-2024-52940), et des sessions qui transitent par des
serveurs dont on ne sait rien. TeamViewer ou AnyDesk, c'est la même mayonnaise.

J'ai fini par interdire tout logiciel de contrôle à distance sauf le nôtre : un serveur RustDesk auto-hébergé, en
France, avec une licence Pro qui coûte à l'année à peu près ce que TeamViewer nous coûtait au mois. Je l'appelle ici
« RustDesk maison » et j'utilise `rustdesk.example.com` comme domaine d'exemple. Cette fiche couvre ce qui a posé
question en pratique : quels ports ouvrir, quoi écrire dans la doc envoyée aux clients, et comment répondre à
l'objection « pas question d'installer ça sur le PC d'une machine ».

## Comment RustDesk fonctionne, en deux minutes

Un serveur RustDesk, ce sont deux services :

- **hbbs**, le serveur d'identifiants et de rendez-vous. Chaque client s'y enregistre avec son ID, et c'est lui qui
  met en relation le technicien et le poste distant, en essayant d'abord une connexion directe (traversée de NAT).
- **hbbr**, le relais. Quand la connexion directe échoue, ce qui est fréquent derrière un pare-feu industriel, le
  trafic passe par lui.

Pensez à hbbs comme au standard téléphonique qui met deux personnes en relation, et à hbbr comme à l'opératrice qui
garde la ligne ouverte quand les deux interlocuteurs ne peuvent pas se joindre directement. Le trafic est chiffré de
bout en bout ; le serveur possède une paire de clés et sa **clé publique** identifie votre serveur auprès des clients.

## Prérequis

- Un serveur joignable depuis Internet, avec un nom DNS (`rustdesk.example.com`) et RustDesk Server installé
  (version open source ou Pro).
- La main sur le pare-feu devant ce serveur.
- Un client à distribuer : soit le client RustDesk générique que l'utilisateur configure, soit, plus confortable, un
  exécutable portable préconfiguré avec l'adresse du serveur. C'est ce que nous appelons en interne le
  « QuickSupport », par analogie avec l'outil du même nom chez TeamViewer.

## Ouvrir les bons ports

RustDesk utilise une plage de ports bien documentée. Côté serveur, tout doit être autorisé **en entrée** :

| Port | Protocole | Service | Rôle |
| --- | --- | --- | --- |
| 21115 | TCP | hbbs | test du type de NAT |
| 21116 | TCP | hbbs | enregistrement de l'ID, heartbeat, traversée de NAT |
| 21116 | UDP | hbbs | enregistrement de l'ID, heartbeat |
| 21117 | TCP | hbbr | relais du trafic de session |
| 21118 | TCP | hbbs | WebSocket (client web) |
| 21119 | TCP | hbbr | WebSocket (client web) |

```bash title="Pare-feu du serveur (exemple avec ufw)"
ufw allow 21115:21119/tcp
ufw allow 21116/udp
```

Côté client, c'est l'inverse : le poste distant n'a besoin que de **sortir** vers ces ports. Sur un réseau de
bureau, ça passe sans rien faire. Sur un réseau de machines, où le pare-feu ne laisse sortir que ce qui est
explicitement autorisé, c'est là que ça bloque. C'est pour ça que la doc client ne mentionne les ports qu'en fin de
document, dans une section « uniquement si la connexion échoue » : dans la grande majorité des cas, l'utilisateur
n'a pas à s'en préoccuper.

:::caution
Ne publiez jamais l'adresse IP publique du serveur et la liste des ports dans un mail « à tous », encore moins sur
une page web ouverte. Mettez le nom DNS dans les configurations, gardez le détail des ports pour la doc envoyée à un
interlocuteur identifié. Je me suis fait la remarque à moi-même en relisant une de nos procédures internes.
:::

Configurez toujours les clients sur le **nom DNS** et non sur l'IP. Une IP change, un nom suit. Et un nom ne donne
pas la topologie de votre infrastructure à qui lit par-dessus l'épaule.

## Rédiger la documentation envoyée aux clients

La doc que nous envoyons aux clients tient sur une page et suit toujours le même plan. Elle a été traduite en anglais
et en hébreu à la demande d'un client ; prévoyez la traduction dès le départ, et faites relire par quelqu'un qui
parle la langue.

1. **Ce que c'est.** Un outil de prise en main à distance basé sur le projet open source RustDesk, hébergé et
   administré par nous, en France. Aucun tiers ne voit la session.
2. **Comment se déroule une intervention.** L'utilisateur lance l'exécutable, lit son ID au technicien, puis
   accepte la demande de connexion à l'écran. Rien ne se passe sans ces deux gestes.
3. **Uniquement si la connexion échoue.** Les ports du tableau ci-dessus, en sortie, vers `rustdesk.example.com`.
4. **Si le client préfère le RustDesk générique.** Les trois paramètres à saisir dans Paramètres, Réseau :

```text title="Paramètres réseau du client RustDesk générique"
Serveur d'ID      : rustdesk.example.com
Serveur de relais : rustdesk.example.com
Clé               : <clé publique du serveur, fichier id_ed25519.pub>
```

Sans la clé, le client générique refuse de s'enregistrer sur un serveur qui en exige une. C'est voulu : votre
serveur ne sert que vos clients.

:::tip
L'exécutable portable préconfiguré évite les trois quarts des tickets « ça ne se connecte pas » : le serveur, le
relais et la clé sont déjà dedans, l'utilisateur n'a rien à saisir. Le générateur de client de la version Pro
permet aussi d'y figer les réglages de sécurité décrits ci-dessous.
:::

## Mettre en place la prise en main à double validation

L'objection est venue de l'intérieur : « pas de logiciel de télémaintenance sur les PC des machines, pour des
raisons juridiques ». Elle est légitime. Un outil de contrôle à distance installé en service, avec un mot de passe
permanent, sur le PC qui pilote une machine de production, c'est une porte d'entrée en plus, et quelqu'un en
portera la responsabilité le jour où elle sert à autre chose.

La réponse tient en une phrase : c'est un QuickSupport. Si l'exécutable n'est pas lancé, aucune connexion n'est
possible. Et s'il est lancé, l'utilisateur doit encore accepter la session. Deux validations, à chaque fois, par
la personne physiquement devant la machine. Et les données restent en France, contrairement à la télémaintenance
Ewon qui équipe par ailleurs nos machines.

Concrètement, sur le client :

- **portable, pas installé** : pas de service Windows, rien ne tourne quand la fenêtre est fermée ;
- **pas de mot de passe permanent** : l'accès sans surveillance est désactivé, il n'existe aucun secret qui
  permettrait de se connecter sans personne devant l'écran ;
- **acceptation par clic** : dans Paramètres, Sécurité, la session n'est ouverte que si l'utilisateur clique sur
  « Accepter » ; le mode par mot de passe est désactivé.

| | Outil SaaS classique | RustDesk maison en mode QuickSupport |
| --- | --- | --- |
| Où passent les sessions | Serveurs de l'éditeur | Notre serveur, en France |
| Accès sans personne devant l'écran | Possible (mot de passe permanent) | Impossible |
| Qui décide d'ouvrir la session | Le technicien, si le mot de passe est connu | L'utilisateur, à chaque fois |
| Ce qui reste sur le PC après | Un service installé | Rien, l'exécutable est portable |

Cette double validation n'est pas un frein pour le SAV. Le technicien est de toute façon au téléphone avec la
personne sur place, et « cliquez sur Accepter » prend moins de temps que « quel est votre mot de passe ».

## Les pièges rencontrés

- **Le pare-feu sortant des réseaux de machines.** Quand ça ne se connecte pas, c'est presque toujours ça. Demandez
  au service informatique du client d'autoriser la sortie vers les ports du tableau, uniquement vers votre nom DNS.
- **La clé oubliée.** Un client qui installe le RustDesk générique depuis le site officiel et ne saisit que le
  serveur d'ID ne s'enregistrera jamais. La clé fait partie de la doc.
- **Le mail à tous avec l'IP dedans.** Voir plus haut. Ça part vite, ça ne se rattrape pas.
- **Les autres outils qui restent installés.** Interdire TeamViewer et AnyDesk n'a de sens que si on les désinstalle
  vraiment ; un outil de déploiement fait ça proprement sur tout le parc.
- **La doc en une seule langue.** Un client qui ne comprend pas la procédure appelle, et le technicien la lui
  dicte. Traduisez une fois, gagnez à chaque intervention.

## Pour aller plus loin

- La télémaintenance ne doit jamais atterrir sur le même réseau que la bureautique :
  [Segmenter les réseaux machines industrielles](/docs/architecture/segmenter-les-reseaux-machines-industrielles/).
- Même logique appliquée aux transferts de fichiers, avec un outil auto-hébergé à la place d'un service en ligne :
  [WeTransfer interdit, et alors ?](/blog/wetransfer-interdit-et-alors/).
- La documentation officielle de RustDesk Server détaille l'installation de hbbs et hbbr et les options de
  sécurité du client.

<!-- source : mails « VOILA » (2024-09-10), « Re: Ecatcher : Limite de consommation » (2024-10-02) et documentation client de télémaintenance (2024-10-30) -->

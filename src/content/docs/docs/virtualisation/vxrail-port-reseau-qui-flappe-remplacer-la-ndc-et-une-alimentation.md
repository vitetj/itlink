---
title: "VxRail : diagnostiquer un port réseau qui « flappe » et remplacer soi-même une NDC ou une alimentation"
description: "« NIC 1 Port 4 link is down » en boucle dans le Lifecycle Log, dial-home VXR508NIC100, puis une alimentation injoignable : isoler le défaut, faire valider le diagnostic par Dell et remplacer la pièce en Customer Self Replace."
published: 2026-07-08
category: virtualisation
tags: [vxrail, dell, poweredge, idrac, ndc, reseau]
level: avancé
status: à jour
featured: false
tested_on: [VxRail E560F, PowerEdge R640, iDRAC 9]
---

Un port réseau qui « flappe », c'est un port qui tombe et remonte tout seul, à intervalles irréguliers.
Sur un poste de travail, personne ne s'en aperçoit. Sur un nœud vSAN, c'est autre chose : chaque coupure
de quelques secondes, ce sont des retransmissions, de la latence pour toutes les VM du cluster, et un
VxRail Manager qui déclenche un « dial-home » vers Dell avec le code VXR508NIC100. Le pire, c'est que rien
ne tombe vraiment. vSphere bascule sur l'autre uplink, tout continue de fonctionner, et on est tenté de
laisser courir.

J'ai eu ce symptôme deux fois sur le même nœud de mon cluster VxRail E560F, six nœuds en configuration
étendue. La première en septembre 2024 : « NIC 1 Port 4 link is down », puis « up », puis « down », dans
le Lifecycle Log. Dell avait diagnostiqué la carte réseau intégrée, la NDC (Network Daughter Card), et
envoyé un technicien la remplacer. La seconde en juin 2026, même nœud, même port 4, événements NIC100 et
NIC101 en alternance. Cette fois, Dell a conclu à un défaut de couche physique (PHY) sur la NDC et j'ai
choisi de la remplacer moi-même. Le même mois, une alimentation du cluster s'est déclarée « cannot be
contacted » et a suivi le même chemin. Voici comment tout cela se passe, du diagnostic au retour de la
pièce.

## Prérequis

- Un cluster vSAN sain et, sur un cluster étendu, un witness joignable pendant toute l'opération.
- L'accès au Lifecycle Log de l'iDRAC et à la configuration du switch en face.
- Un dossier ouvert chez Dell ProSupport avec un TSR
  (voir [Collecter un TSR VxRail](/docs/virtualisation/collecter-un-tsr-vxrail-et-ouvrir-un-ticket-dell-prosupport/)).
- Pour la NDC : un tournevis, une fenêtre d'une heure hôte compris, des câbles étiquetés.
- Pour l'alimentation : rien de plus qu'une main libre, l'échange se fait à chaud.

## Isoler le symptôme avant d'accuser la carte

Un lien qui flappe a trois coupables possibles : le câble ou le module optique, le port du switch, la carte
du serveur. Le Lifecycle Log vous dit quand ça tombe ; il ne vous dit pas pourquoi. Commencez par le côté
switch : les compteurs d'erreurs du port, ses journaux, l'état du SFP. Puis faites l'expérience la plus
simple qui soit : inversez le câble avec celui d'un port voisin qui fonctionne.

| Ce que vous observez après l'inversion | Coupable probable |
| --- | --- |
| Le défaut suit le câble sur le nouveau port | Câble ou module |
| Le défaut reste sur le même port serveur | Carte réseau (NDC) |
| Le défaut reste sur le même port switch | Switch |

Côté ESXi, la commande suivante confirme quel `vmnic` correspond au port en cause et à quelle vitesse il
négocie. Un lien qui oscille entre « Up » et « Down » à chaque exécution vaut tous les discours.

```bash title="Vérifier l'état des cartes réseau vues par ESXi"
esxcli network nic list
esxcli network nic get -n vmnic3
```

:::note
Dans le Lifecycle Log, NIC100 correspond au lien perdu et NIC101 au lien retrouvé. Une paire NIC100/NIC101
toutes les quelques minutes, sur un seul port, avec un câble déjà inversé, c'est la signature d'un
défaut de couche physique sur la carte. C'est exactement le diagnostic que Dell a posé chez moi en juin 2026.
:::

## Faire valider le diagnostic par Dell

Envoyez le TSR et un extrait du Lifecycle Log sur le dossier, en précisant ce que vous avez déjà fait :
inversion du câble, port switch changé ou non, résultat. Cette précision vous évite qu'on vous demande de le
faire une seconde fois. L'ingénieur Dell confirme (ou infirme) le défaut PHY et déclenche l'envoi de la
pièce en échange standard.

À ce moment-là, vous avez le choix : attendre un technicien, ou demander l'option « Customer Self
Replace ». La NDC d'un R640 est une pièce que Dell classe comme remplaçable par le client. Je préfère la
seconde option : je connais le cluster, je choisis mon créneau, et je ne fais pas attendre quelqu'un sur le
parking pendant que vSAN évacue les données.

## Remplacer la NDC d'un nœud R640

La NDC est une carte mezzanine fixée à l'arrière du châssis, sous les ports réseau intégrés. Son
remplacement impose l'arrêt complet du nœud, donc une préparation vSAN.

1. Dans vCenter, passez l'hôte en mode maintenance. Pour une heure d'intervention, « Ensure accessibility »
   suffit ; choisissez « Full data migration » si vous préférez ne dépendre d'aucune réplique le temps du
   remplacement.
2. Éteignez l'hôte proprement, attendez que l'iDRAC le confirme hors tension.
3. Débranchez les cordons d'alimentation puis les câbles réseau, en notant la position de chacun. Le port 4
   d'aujourd'hui doit rester le port 4 de demain, sinon vos uplinks vSphere ne correspondront plus.
4. Sortez le serveur du rack, ouvrez le capot, retirez la NDC (vis et connecteur mezzanine), insérez la
   neuve, refermez.
5. Rebranchez dans l'ordre inverse, allumez, laissez l'ESXi démarrer et se reconnecter à vCenter.

:::caution
Une nouvelle NDC, ce sont de nouvelles adresses MAC. ESXi conserve en général le mappage `vmnic0` à
`vmnic3` par emplacement PCI, mais vérifiez-le avant de sortir de maintenance : les uplinks du switch
distribué doivent pointer vers les bons `vmnic`, et les interfaces VMkernel vSAN et vMotion doivent
repasser au vert dans la santé du cluster. Un uplink orphelin se voit tout de suite dans la vue réseau de
l'hôte.
:::

Sortez ensuite du mode maintenance, attendez que vSAN resynchronise, et surveillez le Lifecycle Log
pendant vingt-quatre heures. Plus de NIC100, plus de dial-home : le remplacement est validé. Chez moi,
l'échange s'est fait le 11 juin, une semaine après le premier diagnostic.

## Remplacer une alimentation « cannot be contacted »

Le cas de l'alimentation est plus simple et se traite à chaud, à condition de respecter deux détails.
L'iDRAC signale qu'une alimentation ne répond plus au bus de gestion. Le serveur tourne toujours sur
l'autre (redondance 1+1), donc pas d'arrêt, pas de mode maintenance.

1. Ouvrez la page « Power » de l'iDRAC et notez **quel emplacement** est en défaut, PSU1 ou PSU2. C'est
   l'erreur classique : retirer la bonne alimentation et laisser le nœud sur celle qui ne répond plus.
2. Ouvrez le dossier avec le TSR ; Dell expédie une PSU en échange standard.
3. À réception, débranchez le cordon de l'alimentation en défaut, pressez le levier de verrouillage et
   tirez sur la poignée. Insérez la neuve jusqu'au clic, rebranchez le cordon.
4. Vérifiez la LED de l'alimentation (vert fixe) et son état dans l'iDRAC. L'événement doit se clore de
   lui-même dans le Lifecycle Log.

## Retourner l'ancienne pièce sans y laisser un mois

L'échange standard suppose que vous renvoyiez la pièce défectueuse avec l'étiquette de retour fournie.
Sur le papier, c'est le point le plus facile de la procédure. Dans les faits, c'est là que j'ai perdu le
plus de temps : le transporteur n'a pas reconnu l'étiquette de retour de l'alimentation, le colis est
resté sur place, et il a fallu rouvrir un dossier pour obtenir une étiquette valide. L'affaire, ouverte
début juin, s'est conclue début juillet. Le mail de clôture ne contenait qu'un mot, en majuscules.

- Conservez la preuve de dépôt, ou le refus du transporteur, avec la date.
- Relancez Dell sur le dossier d'origine avant d'en ouvrir un second : le service logistique et le
  support technique ne lisent pas la même file.
- Ne jetez jamais l'ancienne pièce : sans retour, la pièce d'échange vous sera facturée.

## Les pièges rencontrés

- **Ignorer un flapping « sans impact ».** Il finit toujours par en avoir un, et vSAN n'aime pas les
  liens instables.
- **Envoyer le TSR sans dire ce qu'on a déjà testé.** Vous repartirez à l'étape « inversez le câble ».
- **Oublier le witness.** Sur un cluster étendu, vérifiez sa joignabilité avant de mettre un nœud en
  maintenance.
- **Retirer la mauvaise alimentation.** Le numéro d'emplacement est dans l'iDRAC, pas dans votre mémoire.
- **Se fier à l'étiquette de retour.** Vérifiez qu'elle est acceptée avant de laisser partir le colis.

## Pour aller plus loin

- [Reset « flea power » d'un nœud VxRail / PowerEdge sur erreurs iDRAC](/docs/virtualisation/vxrail-reset-flea-power-sur-erreurs-idrac/) :
  la manipulation que Dell demande avant tout remplacement quand le bus de gestion est en cause.
- [Collecter un TSR VxRail et ouvrir un ticket Dell ProSupport qui avance vite](/docs/virtualisation/collecter-un-tsr-vxrail-et-ouvrir-un-ticket-dell-prosupport/).
- [Dimensionner les onduleurs d'une petite salle serveur](/docs/architecture/dimensionner-les-onduleurs-dune-petite-salle-serveur/) :
  parce qu'une alimentation qui souffre, c'est parfois une salle qui souffre.

<!-- source : mails « NIC 1 Port 4 link down (VXR508NIC100) », 2024-09 ; « Link flapping NIC port 4 », 2026-06-04 ; « NDC replaced », 2026-06-11 ; « PSU cannot be contacted » et « Retour pièce », 2026-06-03 → 2026-07-07 -->

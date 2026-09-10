---
title: "Home Assistant : mesurer la consommation électrique par secteur avec des prises Matter"
description: "Le bureau d'études veut quatre ou cinq compteurs sur les départs principaux pour le bilan RSE. Plutôt que du Tuya, je monte la mesure dans Home Assistant avec du Matter, sur un VLAN IoT isolé."
published: 2025-03-10
category: homelab
status: en cours
stack: [Home Assistant, Matter, Zigbee, Z-Wave, UniFi]
tags: [home-assistant, matter, energie, iot, rse, vlan]
featured: false
---

Mars 2025, le bureau d'études me pose une question simple : « on voudrait quatre ou cinq compteurs sur les
départs électriques principaux, pour la démarche RSE, tu nous conseilles quoi ? ». Derrière la question, il y
avait déjà une réponse toute prête : des compteurs Wi-Fi bon marché, avec leur application sur le
téléphone. Pratique, pas cher, et hors de question.

Pas par snobisme. Une courbe de consommation électrique par atelier, c'est une courbe d'activité de production.
Confier cette donnée à un cloud dont je ne sais rien, via un protocole que je ne maîtrise pas, sur mon réseau
d'entreprise, c'est ouvrir une fenêtre pour économiser une porte. Ma réponse tenait en quatre points :
tout centraliser dans Home Assistant ; des capteurs Wi-Fi, Zigbee ou Z-Wave au choix, mais avec un protocole
chiffré ; pas de protocole propriétaire chinois type Tuya ; et une préférence pour Matter, le standard de la
Connectivity Standards Alliance. Le tout isolé sur le SSID et le VLAN IoT des bornes Wi-Fi, comme n'importe
quel objet connecté chez moi.

Avant de proposer ça pour de vrai, je le monte dans mon homelab. Je ne déploie rien en production qui n'ait
pas survécu à la maison, et ce projet ne fait pas exception. Statut au moment où j'écris : en cours.

## Matériel / stack

- **Home Assistant OS** dans une VM Proxmox du homelab, sauvegardée comme les autres.
- Le module complémentaire **Matter Server**, qui porte le contrôleur Matter, et l'intégration Matter qui
  s'accroche dessus.
- Des **prises Matter avec mesure d'énergie** pour la maquette. Depuis Matter 1.3, le standard décrit un
  cluster de mesure d'énergie électrique ; les prises qui l'implémentent remontent puissance instantanée et
  énergie cumulée sans application tierce.
- Pour les départs principaux de l'usine, ce ne seront pas des prises mais des **compteurs modulaires à
  pinces** posés au tableau. Zigbee ou Z-Wave si Matter n'a rien de mûr à cet endroit : les deux sont chiffrés
  et locaux, ce qui est le critère.
- Le réseau **UniFi** du homelab : un SSID IoT sur son VLAN, sans accès au reste du réseau, et les règles de
  pare-feu qui vont avec.
- Le téléphone avec l'application compagnon Home Assistant, indispensable pour la mise en service Matter.

## Mise en place

### Le réseau avant les objets

Matter sur Wi-Fi s'appuie sur IPv6 en lien local et sur mDNS pour que le contrôleur découvre les appareils.
C'est là que la segmentation fait mal : un objet sur le VLAN IoT et un Home Assistant sur le VLAN serveurs ne se
voient pas sans aide. Côté UniFi, il faut activer la réflexion mDNS entre les deux réseaux et laisser IPv6 actif
sur le VLAN IoT, même sans routage IPv6 vers l'extérieur. Les règles de pare-feu sont volontairement sèches :
Home Assistant peut initier vers le VLAN IoT ; le VLAN IoT ne peut initier vers rien, ni vers le LAN, ni vers
Internet, à l'exception du serveur de temps.

### Mettre en service une prise

Dans Home Assistant, *Paramètres → Modules complémentaires → Matter Server*, démarrer, puis l'intégration
Matter se propose d'elle-même. Depuis l'application compagnon sur le téléphone : *Ajouter un appareil Matter*,
scanner le QR code de la prise, choisir le réseau Wi-Fi IoT. La prise apparaît avec ses entités : état
marche/arrêt, puissance en watts, énergie cumulée en kilowattheures.

### Compter par secteur

Le tableau de bord Énergie de Home Assistant (*Paramètres → Tableaux de bord → Énergie*) accepte chaque
capteur d'énergie dans la section « Appareils individuels ». Pour obtenir des totaux par période et par
secteur, j'ajoute des compteurs `utility_meter` avec un cycle mensuel, et un capteur modèle qui les somme :

```yaml title="configuration.yaml : compteurs mensuels par secteur"
utility_meter:
  energie_usinage_mensuel:
    source: sensor.prise_usinage_energy
    cycle: monthly
  energie_assemblage_mensuel:
    source: sensor.prise_assemblage_energy
    cycle: monthly

template:
  - sensor:
      - name: "Énergie totale mensuelle"
        unit_of_measurement: "kWh"
        device_class: energy
        state_class: total
        state: >
          {{ (states('sensor.energie_usinage_mensuel') | float(0))
           + (states('sensor.energie_assemblage_mensuel') | float(0)) }}
```

Les statistiques à long terme de Home Assistant conservent les valeurs horaires bien au-delà de la durée de
rétention de l'historique brut, ce qui suffit pour un bilan annuel. L'export se fait depuis le graphique
d'historique, en CSV, pour les gens du bureau d'études qui vivent dans un tableur.

## Ce que ça donne

À ce stade, ce que ça donne est une architecture et une grille de décision, pas encore des kilowattheures
d'usine. Je n'ai pas de chiffres à montrer et je ne vais pas en inventer. La grille, elle, est déjà utile,
parce que c'est avec elle que la discussion avec le bureau d'études a changé de nature :

| Critère | Compteurs Wi-Fi « avec appli » | Home Assistant + Matter | Offre managée de l'opérateur |
| --- | --- | --- | --- |
| Où vont les données | cloud du fabricant, souvent hors UE | sur mon serveur, point | chez l'opérateur, contrat à l'appui |
| Protocole | propriétaire, chiffrement inconnu | standard, chiffré, local | matériel et supervision fournis |
| Réseau | Wi-Fi de l'entreprise | VLAN IoT isolé | dépend de l'installation |
| Qui pose les compteurs | le bureau d'études | un électricien, puis moi pour l'intégration | l'opérateur |
| Dépendance | une appli qui disparaîtra | ma maintenance | un abonnement |

L'offre managée dont il est question est celle que l'opérateur de la boîte propose pour le suivi énergétique.
Je l'ai mise dans le comparatif à dessein : si le bureau d'études préfère payer un service que de me demander
une maintenance de plus, c'est un choix défendable, tant que la donnée ne finit pas chez un inconnu.

Le banc de test, chez moi, c'est une prise sur le rack du homelab pour tracer ce que consomment les nœuds
Proxmox. C'est moins glorieux qu'un atelier d'usinage, mais c'est le même capteur, la même chaîne et le même
tableau de bord que ce que je proposerai à l'usine.

## Limites et suite

- **Une prise mesure ce qui est branché dessus.** Pour un départ de tableau, il faut un compteur à pinces, posé
  par un électricien, dans une armoire où je ne mets pas les mains. Le projet se scinde donc en deux : la partie
  « objets » que je maîtrise, et la partie « armoire électrique » qui se planifie avec la maintenance.
- **Matter est jeune sur l'énergie.** Le cluster de mesure existe, tous les fabricants ne l'implémentent pas
  encore, et l'offre de compteurs modulaires Matter est mince. Zigbee et Z-Wave restent le plan B, sans regret :
  chiffrés, locaux, éprouvés.
- **Le mDNS entre VLAN** est la source classique de « ça marchait hier ». Je documente les règles UniFi au fur et
  à mesure pour ne pas les redécouvrir à chaque mise à jour du contrôleur.
- **Tuya reste interdit.** Même quand un capteur Tuya est « compatible Home Assistant » via une intégration
  locale, il embarque un firmware et un cloud que je ne veux pas voir sur un réseau d'entreprise.

La suite : quand la maquette aura tourné assez longtemps pour que j'aie confiance dans les totaux, je
présenterai les deux scénarios au bureau d'études avec les coûts, et la direction tranchera. Si c'est Home
Assistant, la première étape sera un rendez-vous avec l'électricien, pas une commande de prises. Je mettrai cette
page à jour à ce moment-là.

<!-- source : mail « RE: Compteur d'énergie », 2025-03-10 -->

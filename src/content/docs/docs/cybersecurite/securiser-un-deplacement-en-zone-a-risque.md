---
title: "Sécuriser un déplacement professionnel en zone à risque : matériel, comptes et retour"
description: "Un collaborateur part en mission dans un pays soumis à un contrôle renforcé. Ce qui part, ce qui reste, comment couper les accès internes sans bloquer le travail, et la checklist de retour qu'on oublie."
published: 2025-11-17
category: cybersecurite
tags: [mobilite, deplacement, zone-a-risque, chiffrement, mfa]
level: intermédiaire
status: à jour
featured: false
---

La demande arrive toujours de la même façon, et rarement à l'avance : un collaborateur part en mission dans un
pays soumis à un contrôle renforcé, et quelqu'un demande au service informatique si « on peut emporter le PC ».

La réponse n'est ni oui ni non. C'est une procédure en trois temps — avant, pendant, après — dont le principe
tient en une phrase : **ce qui part est du matériel qu'on accepte de perdre, et des comptes qu'on accepte de
devoir réinitialiser au retour.** Tout le reste découle de là.

Autant le dire tout de suite : chez moi, la première application de cette procédure s'est bien passée côté
système d'information, et mal côté humain. Le collaborateur est rentré sans téléphone fonctionnel, sans avoir
prévenu, et le service n'avait aucun mobile d'avance en stock — parce que « c'est cher ». La partie technique
n'est jamais celle qui manque.

## Décider ce qui part et ce qui reste

L'idéal est un **poste de mission** : une machine dédiée, réinstallée avant le départ, avec un compte
utilisateur distinct, les seuls documents nécessaires et aucun accès permanent au système d'information. C'est
la recommandation de toutes les doctrines publiques sur le sujet, et c'est ce qu'on applique dès qu'on a une
flotte de prêt.

Dans une PME, cette flotte n'existe souvent pas. On part donc du poste habituel, en l'allégeant.

| Élément | Part en mission ? | Condition |
| --- | --- | --- |
| Ordinateur portable professionnel | Oui | Chiffré, allégé, sauvegardé, clé de récupération séquestrée |
| Téléphone professionnel | Oui | Verrouillé par code long, sauvegardé, applications d'entreprise limitées |
| Disque dur externe, clé USB | Non, sauf besoin écrit | Chiffré, et jamais rebranché au retour sans vérification |
| Accès VPN et applications internes | Non | Coupés pour toute la durée du séjour |
| Jeton matériel d'authentification | Oui | Avec des codes de secours conservés séparément |
| Documents non liés à la mission | Non | Déplacés hors du poste avant le départ |

Le travail préparatoire tient en quatre points : chiffrer le disque, vérifier que la clé de récupération est
bien séquestrée côté entreprise, sauvegarder le poste, puis retirer ce qui n'a rien à faire dans le voyage.

## Couper les accès internes, sans bloquer le travail

La mesure structurante est simple : **tous les accès internes sont bloqués depuis le pays de destination,
pendant toute la durée du séjour**. VPN, partages de fichiers, prise en main à distance, applications métier
hébergées en interne : rien.

Restent accessibles les **services cloud** déjà utilisés au quotidien : suite bureautique, messagerie, stockage
en ligne. C'est suffisant pour travailler dans 90 % des missions, et ça réduit la surface exposée à ce que le
fournisseur protège déjà.

La contrepartie se prépare avant le départ, et c'est elle qu'on oublie : **tout ce dont le collaborateur aura
besoin doit être sauvegardé localement sur le portable ou déposé dans le stockage cloud** avant l'embarquement.
Un plan, une nomenclature, un manuel de mise en service qui vit sur un partage interne devient inaccessible à
l'atterrissage. Faites la liste avec la personne concernée, pas à sa place.

Techniquement, le blocage se pose à deux endroits, et il faut les deux :

- côté **fournisseur d'identité**, par une stratégie d'accès conditionnel qui restreint la connexion aux
  emplacements nommés autorisés, avec une exception explicite pour les seules applications cloud permises ;
- côté **pare-feu et passerelle VPN**, par un filtrage géographique sur les plages d'adresses du pays.

:::caution
Le filtrage par pays réduit la surface d'attaque, il ne garantit rien. N'importe quel service de VPN grand
public déplace l'adresse publique en deux clics, et un attaquant qui a déjà des identifiants valides ne se
connectera pas depuis le pays en question. Traitez cette mesure comme une réduction d'exposition, jamais comme
une frontière.
:::

## Traiter la sécurité des personnes comme une partie du périmètre

Ce point ne relève pas de la cybersécurité au sens strict, et c'est pourtant le service informatique qu'on
vient voir. Autant l'assumer et le formaliser.

1. **Proposer un outil de géolocalisation ou d'alerte** sur le téléphone du collaborateur. Proposer, pas
   imposer : l'installation ne se fait qu'avec son **accord explicite**, écrit, limité à la durée de la mission.
2. **Prévoir une alternative en cas de refus**, et ne pas la présenter comme une sanction : téléphone de
   secours, points de contact à heures convenues, consignes spécifiques. Un refus est légitime.
3. **Inscrire le déplacement au dispositif Fil d'Ariane** du ministère des Affaires étrangères, qui permet
   d'être contacté et localisé en cas de crise.
4. **Enregistrer dans le téléphone** les coordonnées de l'ambassade ou du consulat, les numéros d'urgence
   locaux et le numéro d'astreinte de l'entreprise — et les imprimer sur papier, parce qu'un téléphone perdu
   emporte le carnet d'adresses avec lui.

:::danger
Un traceur installé sans accord explicite et documenté du salarié est un problème juridique avant d'être un
problème technique, et il détruit la confiance qui rend le reste de la procédure applicable. Le consentement
doit être écrit, révocable, et strictement borné à la mission.
:::

## Le cas des cartes SIM locales

Certains pays bloquent les terminaux étrangers pour imposer l'usage de cartes SIM locales. La question qui
remonte alors est : « on met une SIM locale dans le téléphone de l'entreprise ? »

La réponse est non. Insérer une SIM locale, c'est faire enregistrer l'identifiant du terminal auprès d'un
opérateur soumis à une réglementation qu'on ne maîtrise pas, et faire transiter les communications
d'entreprise par un intermédiaire imposé. Si le besoin de joignabilité locale est réel, la seule réponse
acceptable est un **terminal dédié à la mission**, sans compte d'entreprise, sans messagerie professionnelle,
dont le numéro est diffusé aux interlocuteurs avant le départ.

C'est une décision d'administrateur système qui se prend pour des raisons géopolitiques. Elle mérite d'être
écrite et validée par la direction, pas improvisée la veille du vol.

## Le retour, la partie qu'on oublie

La procédure ne s'arrête pas à l'atterrissage. Elle s'arrête quand le matériel est revenu et vérifié.

```text title="Checklist de retour de mission"
[ ] Inventaire du matériel rendu (portable, téléphone, jeton, câbles, supports amovibles)
[ ] Signalement immédiat de tout matériel perdu, volé, confisqué ou hors service
[ ] Poste analysé par l'EDR avant tout raccordement au réseau interne
[ ] Supports amovibles rapportés : contenu extrait sur un poste isolé, puis effacés
[ ] Mots de passe des comptes utilisés pendant la mission changés
[ ] Deuxième facteur régénéré si le téléphone a été perdu ou remplacé
[ ] Restrictions d'accès géographiques levées
[ ] Outil de géolocalisation désinstallé et arrêt confirmé au collaborateur
[ ] Débrief : ce qui a manqué, ce qui a bloqué, ce qu'on change pour la prochaine fois
```

C'est ce débrief qui a produit, chez nous, les deux vraies décisions du dossier. La première est une
**procédure de traçabilité du matériel côté ressources humaines** : ce qui est remis avant un départ est
consigné, et ce qui revient est pointé, ce qui évite d'apprendre trois semaines après qu'un téléphone
professionnel n'existe plus. La seconde est un **stock de terminaux d'avance**. Un mobile qui dort dans une
armoire coûte moins cher qu'une mission où l'on ne peut plus joindre personne.

## Pour aller plus loin

- [Des fiches d'hygiène numérique que les utilisateurs lisent vraiment](/docs/cybersecurite/fiches-dhygiene-numerique-pour-les-utilisateurs/),
  pour transformer cette procédure en une page qu'un voyageur lira réellement.
- [Mettre à jour sa charte informatique pour NIS2](/docs/dsi/mettre-a-jour-sa-charte-informatique-pour-nis2/),
  parce que le consentement à la géolocalisation et l'usage du matériel en mobilité s'y écrivent.
- [MFA obligatoire avec TOTP dans Vaultwarden](/docs/cybersecurite/mfa-obligatoire-avec-totp-dans-vaultwarden/),
  pour gérer proprement le deuxième facteur d'un collaborateur qui perd son téléphone à l'étranger.
- Le « Passeport de conseils aux voyageurs » publié par l'ANSSI reste la référence à distribuer telle quelle.

<!-- source : mails « Sécuriser un déplacement en zone à risque », consignes de mission et suites RH, 2025-10-31 → 2025-11-17 -->

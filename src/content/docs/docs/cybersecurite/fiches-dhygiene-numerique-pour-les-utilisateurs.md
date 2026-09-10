---
title: "Des fiches d'hygiène numérique que les utilisateurs lisent vraiment"
description: "Un gabarit de fiche courte, trois modèles complets à recopier tels quels, et la méthode de diffusion : une fiche, un geste, publiée au moment précis où l'incident vient d'arriver."
published: 2025-11-06
category: cybersecurite
tags: [sensibilisation, hygiene-numerique, phishing, mots-de-passe, communication]
level: débutant
status: à jour
featured: false
sidebar:
  label: "Des fiches d'hygiène numérique que les…"
---

En deux mois, j'ai écrit à peu près quinze fois les mêmes réponses. Pourquoi il ne faut plus enregistrer en
`.doc`. Pourquoi un mot de passe ne s'envoie pas par mail. Pourquoi un fichier partagé « en modification pour
tout le monde » est une faille et pas un service rendu. Pourquoi on ne transfère pas un mail suspect.

Chaque réponse était juste. Chaque réponse est morte dans une boîte de réception, lue par une personne, jamais
retrouvée. Une **fiche**, c'est exactement la même réponse, mais réutilisable — et surtout diffusable au bon
moment, c'est-à-dire juste après l'incident, quand tout le monde comprend enfin de quoi on parle.

## Ce qui fait qu'une fiche est lue

Les grandes campagnes de sensibilisation échouent pour des raisons très prosaïques. Elles arrivent hors
contexte, elles listent dix règles à la fois, et elles expliquent le comment sans jamais dire le pourquoi.

Quatre contraintes règlent le problème :

- **Une fiche, un geste.** Pas « les 10 règles de la sécurité ». Un comportement, une page. Si vous avez dix
  choses à dire, vous avez dix fiches et dix occasions de les diffuser.
- **Le pourquoi avant le comment.** Un utilisateur qui comprend le risque applique la consigne même dans un cas
  que vous n'aviez pas prévu. Un utilisateur qui a juste appris une consigne la contourne dès que la situation
  change d'un millimètre.
- **Née d'un incident réel.** La meilleure fiche est celle qu'on écrit le lendemain de l'événement, avec le cas
  vécu en ouverture. Un catalogue théorique ne parle à personne.
- **Une page maximum.** Elle doit tenir sur un écran de téléphone. Si elle déborde, c'est qu'elle traite deux
  sujets.

## Le gabarit

Cinq blocs, toujours dans le même ordre. Cette régularité fait qu'au bout de trois fiches, les gens savent où
regarder.

```text title="Gabarit d'une fiche d'hygiène numérique"
TITRE          Un verbe à l'impératif, jamais un nom abstrait.
LE CAS         Deux lignes. Une situation réelle, anonymisée, arrivée chez nous.
POURQUOI       Le risque en une phrase, avec une comparaison du quotidien.
CE QU'ON FAIT  Trois gestes maximum, numérotés, à l'impératif.
SI C'EST DÉJÀ  Que faire maintenant, et qui prévenir. Sans culpabiliser.
ARRIVÉ
```

## Fiche 1 — Ne jamais envoyer un mot de passe par mail

```text title="Fiche 1"
NE JAMAIS ENVOYER UN MOT DE PASSE PAR MAIL

LE CAS
Un mot de passe d'accès à un outil a circulé en clair dans un fil de mail,
transféré trois fois, avec quatre personnes en copie.

POURQUOI
Un mail n'est pas une conversation, c'est un document. Il est archivé, il est
sauvegardé, il part en copie à des gens que vous n'avez pas choisis, et il
reste lisible dix ans plus tard. Si une seule de ces boîtes est un jour
compromise, le mot de passe l'est aussi — même si vous l'avez changé depuis,
parce que la plupart des gens changent un chiffre et pas le mot.

CE QU'ON FAIT
1. Ouvrez le gestionnaire de mots de passe de l'entreprise.
2. Créez un envoi sécurisé (fonction « Send ») : lien à usage unique, avec
   expiration. Le destinataire l'ouvre une fois, puis le lien meurt.
3. Envoyez le lien par mail, et le mot de passe du lien par un autre canal
   (message, téléphone) si l'information est sensible.

SI C'EST DÉJÀ ARRIVÉ
Changez le mot de passe concerné maintenant, puis prévenez le service
informatique. Personne n'est puni : on a juste besoin de savoir quel compte
regarder.
```

## Fiche 2 — Vérifier le domaine, pas le logo

```text title="Fiche 2"
VÉRIFIER LE DOMAINE, PAS LE LOGO

LE CAS
Un mail annonce un péage impayé, avec le bon logo, la bonne mise en page et
un bouton de paiement. L'adresse d'envoi est « regler-example.com ».
Le vrai site est « example.com ».

POURQUOI
Un logo se copie en trois secondes avec un clic droit. Un nom de domaine,
non : il faut l'acheter. C'est la seule partie du message que l'expéditeur
ne peut pas imiter à l'identique — il ne peut que s'en approcher, en
ajoutant un mot, un tiret ou une lettre.

C'est comme votre banque : ce n'est pas la couleur de la carte qui prouve
qu'elle est à vous, c'est le numéro.

CE QU'ON FAIT
1. Regardez l'adresse complète de l'expéditeur, pas le nom affiché.
2. Lisez le domaine à droite du « @ », en partant de la fin :
   « paiement.example.com » appartient à example.com ;
   « example.com.paiement.example.net » n'y appartient pas.
3. Dans le doute, n'utilisez pas le lien du mail : tapez vous-même l'adresse
   du site que vous connaissez.

SI C'EST DÉJÀ ARRIVÉ
Si vous avez cliqué : ne saisissez rien, fermez l'onglet, prévenez le
service informatique. Si vous avez saisi vos identifiants : changez-les
immédiatement et prévenez tout de suite, même un dimanche.
```

## Fiche 3 — Un mail suspect ne se transfère pas, il se capture

```text title="Fiche 3"
UN MAIL SUSPECT NE SE TRANSFÈRE PAS, IL SE CAPTURE

LE CAS
Pour signaler un message douteux, un collègue l'a transféré au service
informatique. Le transfert contenait toujours le lien piégé, cliquable, et
il est reparti dans une deuxième boîte.

POURQUOI
Transférer un mail malveillant, c'est le faire voyager. Le lien reste actif,
les pièces jointes suivent, et le message franchit une deuxième fois les
filtres. On multiplie le nombre de personnes qui peuvent cliquer, au lieu de
le réduire.

CE QU'ON FAIT
1. Faites une capture d'écran du message, en veillant à ce que l'adresse
   complète de l'expéditeur et l'objet soient visibles.
2. Envoyez la capture au service informatique, avec une phrase de contexte :
   « reçu ce matin, je n'ai pas cliqué ».
3. Ne supprimez pas le message tout de suite : il peut être utile pour
   l'analyse. Laissez-le où il est.

SI C'EST DÉJÀ ARRIVÉ
Prévenez les personnes à qui vous l'avez transféré, en leur demandant de ne
pas cliquer, et signalez-le au service informatique.
```

:::caution
La fiche 2 apprend à repérer un domaine imité. Elle ne protège pas contre le cas inverse, plus difficile : un
mail parfaitement légitime, envoyé depuis le vrai domaine d'un fournisseur dont la boîte a été compromise. Là,
le domaine est bon, l'historique de la conversation est bon, et seule une anomalie de fond — un changement de
coordonnées bancaires, une urgence inhabituelle — met la puce à l'oreille. Dites-le dans la fiche, sinon vous
créez une fausse sécurité.
:::

## Le stock de départ

Les autres gestes qui reviennent le plus souvent, chacun bon pour une fiche du même format. Le tableau sert de
file d'attente éditoriale : on en publie une quand l'occasion se présente, pas dix d'un coup.

| Geste | Le pourquoi, en une phrase |
| --- | --- |
| Enregistrer en `.docx`, plus jamais en `.doc` | Le format `.doc` date de 1997 et traîne des failles connues que le format moderne a fermées |
| Envoyer les pièces jointes en PDF | Le PDF s'ouvre partout, ne modifie rien et ne transporte pas de macro |
| Ne jamais partager un fichier « en modification pour tout le monde » | Tout le monde, c'est aussi celui qui supprimera le contenu par erreur — ou volontairement |
| Ne pas créer de compte pour signer un document | Un vrai lien de signature s'ouvre directement, avec un code par SMS ou par mail ; une demande de création de compte est un signal d'alerte |
| Un câble USB-C n'est pas l'autre | Le connecteur est un standard, le protocole ne l'est pas : certains câbles ne font que charger |
| Débrancher un dock qui ne répond plus, attendre 10 secondes, rebrancher | Le dock garde son alimentation : il faut couper le courant pour qu'il réinitialise |
| Chiffrer un disque dur externe avec BitLocker | Un disque perdu sans chiffrement, c'est une fuite de données ; avec, c'est un disque perdu |

## Diffuser sans lasser

Trois principes de diffusion, appris à mes dépens.

**Publiez au moment de l'incident**, pas au calendrier. Une fiche envoyée le lendemain d'un test de phishing
interne est lue ; la même fiche dans une newsletter mensuelle ne l'est pas.

**Produisez systématiquement la version anglaise** si votre entreprise a des collègues ou des filiales à
l'étranger. Une consigne de sécurité qui n'existe que dans une langue ne s'applique que dans un pays.

**Ne visez jamais quelqu'un.** Le cas d'ouverture est anonymisé, la fiche parle du geste, jamais de la
personne, et le bloc « si c'est déjà arrivé » existe précisément pour que signaler soit plus facile que se
taire. Et quand la fiche ne suffit pas, faites la manipulation avec la personne : une capture d'écran
commentée vaut souvent moins qu'une minute passée à côté d'elle.

## Pour aller plus loin

- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/),
  pour le format des annonces qui accompagnent la diffusion des fiches.
- [Phishing depuis un compte fournisseur compromis](/docs/cybersecurite/phishing-depuis-un-compte-fournisseur-compromis/),
  le cas réel qui alimente la fiche 2 quand le domaine, lui, est parfaitement légitime.
- [Sécuriser un déplacement professionnel en zone à risque](/docs/cybersecurite/securiser-un-deplacement-en-zone-a-risque/),
  la version longue pour les collaborateurs en mobilité.

<!-- source : mails « Fiches d'hygiène numérique », consignes diffusées aux utilisateurs, 2025-10-02 → 2025-11-06 -->

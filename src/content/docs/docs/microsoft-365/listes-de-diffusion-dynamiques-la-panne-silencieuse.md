---
title: "Listes de diffusion dynamiques : la panne silencieuse"
description: "Une liste dynamique ne tombe jamais en panne bruyamment : elle oublie les comptes dont l'attribut de filtre est vide. Comment la détecter, la surveiller, et ne pas la confondre avec une règle de transport."
published: 2026-04-10
category: microsoft-365
tags: [exchange-online, listes-dynamiques, powershell, annuaire, supervision]
level: intermédiaire
status: à jour
featured: false
tested_on: ["Exchange Online"]
---

Début avril, j'ai remplacé trois habitudes par trois listes. Jusque-là, quand quelqu'un devait écrire « à toute la France », il ouvrait un vieux mail, recopiait les destinataires, en ajoutait deux et en oubliait trois. Même chose pour l'Espagne, même chose pour les États-Unis. J'ai donc créé une liste de diffusion dynamique par pays : un filtre sur l'annuaire, et plus rien à maintenir à la main.

Deux semaines plus tard, une personne d'un site étranger m'explique qu'elle n'a jamais reçu l'information dont tout le monde parle. La liste fonctionnait très bien. Elle n'était juste pas dedans : son attribut « pays » était vide dans l'annuaire, donc le filtre ne la voyait pas, donc elle n'existait pas pour la liste.

C'est ça, la panne silencieuse. Une liste statique qui casse, ça se voit : le message revient. Une liste dynamique qui oublie quelqu'un ne produit aucune erreur, aucun rapport de non-remise, aucune ligne de journal. L'expéditeur croit avoir écrit à tout le monde, le destinataire ne sait pas qu'il aurait dû recevoir, et le problème ne remonte que le jour où la personne concernée s'étonne à voix haute. Cette fiche explique pourquoi, et comment installer le contrôle qui manque par défaut.

## Prérequis

- Le module Exchange Online PowerShell, connecté avec un rôle Recipient Management ou Organization Management.
- Savoir **quel attribut d'annuaire fait foi** pour le pays ou le site. Ce n'est pas toujours celui qu'on croit, et il y en a souvent trois candidats sur le même compte.
- Savoir **qui alimente cet attribut** : le service RH, le service informatique, ou personne. La troisième réponse est la plus fréquente, et c'est celle qui produit la panne.

## Comprendre pourquoi une liste dynamique ment sans mentir

Une liste de distribution classique stocke des membres. Vous ajoutez une personne, elle est dedans jusqu'à ce que vous la retiriez.

Une liste dynamique ne stocke rien du tout. Elle stocke une **question**, et cette question est reposée à chaque envoi. « Donne-moi toutes les boîtes aux lettres dont le pays vaut France. » C'est une requête, pas un carnet d'adresses. Si le pays n'est pas renseigné sur un compte, la réponse à la question est simplement « non », et personne ne considère qu'il s'agit d'une anomalie : le filtre a fait exactement ce qu'on lui a demandé.

D'où la règle à écrire au marqueur au-dessus de l'écran : **la qualité d'une liste dynamique est exactement la qualité de l'attribut sur lequel elle filtre**. Rien de plus. Un filtre parfait sur un annuaire approximatif donne une liste approximative, et elle ne vous préviendra pas.

## Ne pas confondre les trois mécanismes qui « font suivre » un message

Avant même de parler de filtre, il faut lever une confusion qui revient à chaque demande utilisateur : « je veux que le mail parte aussi à… ». Trois mécanismes différents répondent à cette phrase, et ils n'ont ni la même visibilité ni la même traçabilité.

| Mécanisme | Où il se configure | Visible par qui ? | À utiliser quand |
| --- | --- | --- | --- |
| Règle de flux (transport) | Au niveau de l'organisation | L'administrateur, dans la configuration du flux | La règle vaut pour tout le monde et doit survivre au départ de la personne |
| Transfert de boîte | Sur la boîte elle-même | Presque personne : c'est un paramètre discret d'un objet parmi des centaines | Cas individuel, temporaire, documenté |
| Boîte partagée | Objet dédié, accès délégué | Tous les délégataires, qui répondent au nom de la boîte | Il faut un historique commun et une réponse au nom du service |

:::caution[Le transfert de boîte est le plus dangereux des trois]
Il fonctionne parfaitement, ne se voit nulle part dans l'organisation, et survit à un changement de poste, à une réorganisation, parfois à un départ. Si vous en posez un, mettez-le dans votre procédure de sortie de collaborateur le jour même, pas « plus tard ».
:::

## Lire ce que la liste contient vraiment

C'est la manipulation à connaître, et la seule qui vous dira la vérité. Récupérez la liste, affichez son filtre, puis demandez à l'organisation de résoudre ce filtre.

```powershell title="Prévisualiser les membres réels d'une liste dynamique"
Connect-ExchangeOnline

$liste = Get-DynamicDistributionGroup -Identity "Tous-France"
$liste.RecipientFilter

Get-Recipient -RecipientPreviewFilter $liste.RecipientFilter `
  -OrganizationalUnit $liste.RecipientContainer `
  -ResultSize Unlimited |
  Select-Object DisplayName, PrimarySmtpAddress, CountryOrRegion |
  Sort-Object DisplayName
```

Le paramètre `-RecipientPreviewFilter` existe exactement pour ça : rejouer le filtre hors envoi. Comptez le résultat, puis comparez ce nombre à l'effectif réel du pays. Si l'écart est de zéro, tant mieux. S'il est de trois, vous venez de trouver trois personnes qui ne reçoivent rien depuis la création de la liste.

## Trouver les comptes qu'aucune liste ne couvre

Prévisualiser une liste, c'est bien. Le vrai contrôle est ailleurs : il consiste à chercher les boîtes qui **ne sont dans aucune** des listes. C'est là que se cachent les oubliés.

```powershell title="Détecter les boîtes orphelines de toute liste pays"
$listes = "Tous-France", "Tous-Espagne", "Tous-USA"

$couverts = foreach ($nom in $listes) {
    $l = Get-DynamicDistributionGroup -Identity $nom
    Get-Recipient -RecipientPreviewFilter $l.RecipientFilter `
      -OrganizationalUnit $l.RecipientContainer -ResultSize Unlimited |
      Select-Object -ExpandProperty PrimarySmtpAddress
}

Get-Mailbox -RecipientTypeDetails UserMailbox -ResultSize Unlimited |
  Where-Object { $couverts -notcontains $_.PrimarySmtpAddress } |
  Select-Object DisplayName, PrimarySmtpAddress
```

La sortie de ce script est la liste des gens qui, la prochaine fois que la direction écrira « à tous les collaborateurs », ne recevront rien. Chez moi, la première exécution a donné un résultat non vide. C'est normal : personne n'avait jamais posé la question.

:::note[Boîtes de service, salles, partagées]
Le script ci-dessus se limite volontairement aux boîtes utilisateurs (`UserMailbox`). Salles, équipements et boîtes partagées n'ont pas vocation à être dans une liste de diffusion pays, et les inclure noierait le résultat sous du faux positif.
:::

## Corriger à la source, jamais dans le filtre

La tentation, quand on trouve trois oubliés, est d'ajouter une exception au filtre ou de repasser en liste manuelle. C'est le mauvais réflexe : vous déplacez le problème dans un endroit encore moins visible.

L'attribut se corrige sur le compte, et surtout : on décide **qui le renseigne à la création**. Pour un compte géré dans le cloud, la valeur se pose directement.

```powershell title="Renseigner le pays sur un compte"
Set-User -Identity "prenom.nom@example.com" -CountryOrRegion "FR"
```

Si vos comptes viennent d'un annuaire sur site synchronisé, la correction se fait côté annuaire, puis attend le cycle de synchronisation.

```powershell title="Côté annuaire sur site"
Set-ADUser -Identity "prenom.nom" -Replace @{ c = "FR"; co = "France"; countryCode = 250 }
```

:::caution[Trois attributs, un seul filtre]
Un annuaire porte le pays sur `c` (code à deux lettres), `co` (libellé) et `countryCode` (valeur numérique). Un filtre écrit sur l'un ne voit pas les deux autres. Choisissez-en un, écrivez-le dans la procédure, et remplissez les trois de manière cohérente pour ne pas piéger le prochain qui écrira un filtre.
:::

Le vrai correctif, lui, n'est pas technique : il consiste à ce qu'un compte ne naisse plus d'un mail au service informatique, mais d'un flux venu du référentiel du personnel, avec ses attributs déjà remplis. Tant que la création se fait « au fil de l'eau », vous recommencerez ce contrôle tous les trimestres.

## Surveiller, parce que la panne reviendra

Un contrôle manuel qu'on ne refait pas est un contrôle qu'on n'a pas fait. Planifiez l'exécution du script d'orphelins une fois par semaine et faites-la vous écrire, y compris quand tout va bien : un rapport qui n'arrive jamais est indiscernable d'un rapport vide.

Les deux seuils qui méritent une alerte :

- **Nombre d'orphelins supérieur à zéro** : quelqu'un a été créé sans attribut, ou l'a perdu lors d'une mutation.
- **Variation brutale de l'effectif d'une liste** d'une semaine sur l'autre. Une liste qui perd huit personnes d'un coup n'a pas connu huit départs : elle a rencontré une modification d'annuaire de masse.

Gardez l'historique des effectifs dans un fichier à côté du script. Trois lignes de CSV valent tous les tableaux de bord, et surtout elles répondent à la seule question qui compte le jour de l'incident : depuis quand ?

## Pour aller plus loin

- [Aligner l'annuaire d'entreprise sur l'ERP](/docs/architecture/aligner-lannuaire-dentreprise-sur-lerp/) : la cause racine, et la trame du chantier de référentiel maître.
- [Checklist d'intégration d'un nouveau collaborateur](/docs/dsi/checklist-dintegration-dun-nouveau-collaborateur/) : où faire figurer le remplissage des attributs pour qu'il ne dépende plus de la mémoire de personne.
- [Transfert vers un alias « plus-adressé » avec une règle de flux](/docs/microsoft-365/regle-de-flux-transfert-vers-alias-plus-adresse/) : quand c'est bien une règle de transport qu'il vous faut, et pas une liste.

<!-- source : mails « listes de diffusion par pays », début avril 2026 ; thread « alignement référentiel salariés et annuaire », 2026-04-15 -->

---
title: "Copieur : location ou achat ? Faire le calcul de coût total sur 24 trimestres"
description: "Un loyer et un prix d'achat ne se comparent pas. Six ans de pages, si. La méthode, le tableau et la formule pour trancher entre location et achat d'un copieur sans se faire piéger par la page couleur."
published: 2024-12-04
category: dsi
tags: [copieur, tco, budget, achats, impression, fournisseurs]
level: débutant
status: à jour
featured: false
sidebar:
  label: "Copieur : location ou achat ? Faire…"
---

Novembre 2024. Le contrat du copieur de ma boîte arrive à échéance et le prestataire propose un renouvellement en location. La direction pose la question qui revient à chaque fois : « et si on l'achetait ? ». Deux devis arrivent, et ils ne se ressemblent pas. D'un côté un loyer trimestriel et un coût à la page. De l'autre un prix d'achat, un contrat de maintenance et un autre coût à la page. Comparer les deux en regardant le loyer, c'est comparer une voiture en location longue durée et une voiture achetée en ne regardant que la mensualité : ce qui compte, c'est le carburant sur six ans.

Pour un copieur, le carburant, c'est la page. Et surtout la page couleur : dans nos contrats, elle coûte grosso modo neuf fois la page noir et blanc. J'ai donc fait le calcul sur 24 trimestres, six ans, l'horizon sur lequel j'ai comparé les deux offres, dans un tableur de dix lignes. Chez nous, la location est ressortie moins chère, et pas de peu, alors qu'elle n'avait aucun prix d'achat à amortir en face. Ce n'est pas une règle générale : c'est le résultat de nos volumes et de nos devis. Cette fiche vous donne la méthode pour obtenir le vôtre.

## Prérequis

- Les deux devis, avec pour chacun : les frais fixes par période (loyer ou maintenance), le coût à la page noir et blanc, le coût à la page couleur, et ce qui est inclus (toner, pièces, déplacements).
- Les compteurs réels du copieur sur plusieurs mois. Chez nous, quatre mois de relevés.
- Un tableur. N'importe lequel.

## Relever les volumes réels avant de poser les hypothèses

Le calcul repose sur deux chiffres : le nombre de pages noir et blanc et le nombre de pages couleur par trimestre. Si vous les estimez au doigt mouillé, le reste du tableau est du doigt mouillé multiplié par 24.

Tout copieur imprime une page d'état avec ses compteurs, séparés en noir et blanc et couleur. Relevez-les à deux dates espacées de plusieurs mois, faites la différence, ramenez au trimestre. Le portail en ligne du prestataire donne la même chose, quand il fonctionne : le nôtre est tombé pile au changement d'heure d'hiver. La page imprimée sur la machine, elle, ne dépend de personne.

:::tip
Ne prenez pas un seul mois, et surtout pas un mois atypique (clôture, inventaire, catalogue annuel). Quatre mois lissent l'essentiel. Si vous avez un an de compteurs, c'est encore mieux.
:::

## Poser la formule

Pour chaque option, le coût total sur la durée est la somme des frais fixes et des pages, multipliés par le nombre de trimestres, plus le prix d'achat s'il y en a un.

```text title="Coût total sur 24 trimestres"
Location = (loyer trimestriel × 24)
         + (coût page N&B × pages N&B par trimestre × 24)
         + (coût page couleur × pages couleur par trimestre × 24)

Achat    = prix d'achat
         + (maintenance trimestrielle × 24)
         + (coût page N&B × pages N&B par trimestre × 24)
         + (coût page couleur × pages couleur par trimestre × 24)
```

Les coûts à la page sont rarement identiques entre les deux devis : en location ils sont intégrés à l'offre, en achat ils viennent du contrat de maintenance. Prenez chaque valeur sur son devis, pas sur l'autre.

## Remplir le tableau

:::note
Les chiffres ci-dessous sont inventés, ronds, et servent uniquement à montrer la mécanique. Ne les réutilisez pas : les vôtres sont sur vos devis et sur vos compteurs.
:::

D'abord les hypothèses de volume, communes aux deux options.

| Hypothèse | Valeur d'exemple |
| --- | --- |
| Pages noir et blanc par trimestre | 7 000 |
| Pages couleur par trimestre | 5 000 |
| Durée | 24 trimestres |

Ensuite les paramètres de chaque devis, en euros fictifs.

| Paramètre | Location | Achat |
| --- | --- | --- |
| Prix d'achat | 0 | 5 000 |
| Frais fixes par trimestre (loyer ou maintenance) | 250 | 120 |
| Coût d'une page noir et blanc | 0,010 | 0,012 |
| Coût d'une page couleur | 0,090 | 0,100 |

Enfin le résultat, ligne par ligne, pour voir d'où vient l'argent.

| Poste sur 24 trimestres | Location | Achat |
| --- | --- | --- |
| Prix d'achat | 0 | 5 000 |
| Frais fixes | 6 000 | 2 880 |
| Pages noir et blanc | 1 680 | 2 016 |
| Pages couleur | 10 800 | 12 000 |
| **Total** | **18 480** | **21 896** |

Regardez la ligne des pages couleur : dans les deux colonnes, elle pèse plus que le loyer et plus que le prix d'achat. C'est la leçon de ce tableau. Le loyer est la partie visible du devis ; la couleur est la facture.

Dans un tableur, si les paramètres d'une option sont en colonne B (B2 prix d'achat, B3 frais fixes, B4 coût N&B, B5 coût couleur) et les volumes en B7 et B8, la cellule de total s'écrit :

```text title="Formule de la cellule Total"
=B2 + B3*24 + B4*B7*24 + B5*B8*24
```

Copiez la colonne pour la seconde option. Dix lignes, deux colonnes, c'est tout.

## Tester la sensibilité

Un tableau qui donne un vainqueur n'a pas fini son travail. Refaites le calcul avec des volumes à moins 20 % et à plus 20 %, puis avec une part de couleur qui monte. Deux cas :

- Le vainqueur ne change pas : la décision est solide, vous pouvez la présenter.
- Le vainqueur change : la décision est fragile, et c'est le coût à la page couleur qu'il faut négocier, pas le loyer.

Regardez aussi ce qui se passe à 12 trimestres. Une option qui gagne sur six ans peut perdre si vous sortez au bout de trois, et les clauses de sortie anticipée ne sont jamais dans le tableau.

## Lire les petites lignes

Le calcul compare des chiffres ; le contrat contient le reste. Avant de signer, posez au prestataire les questions dont la réponse ne figure sur aucun devis :

- Le toner, les pièces et les déplacements sont-ils inclus dans le coût à la page ?
- Le coût à la page est-il révisable en cours de contrat, et selon quelle règle ?
- Que se passe-t-il à la fin : restitution, rachat, reconduction tacite ?
- Y a-t-il un volume minimum facturé, même si vous imprimez moins ?
- Le papier n'est jamais inclus. Vérifiez quand même.

:::caution
Le calcul de coût total ne dit rien de la trésorerie. L'achat est une sortie immédiate ; la location est une charge lissée. C'est un argument pour la direction financière, pas pour le tableau. Présentez les deux séparément, sinon on vous reprochera de mélanger.
:::

Chez nous, le contrat retenu a été signé électroniquement début décembre. Quand la direction demande « pourquoi celui-là ? », la réponse tient sur une page, et c'est le tableau.

## Réduire la facture, quelle que soit l'option

Puisque la couleur est le poste principal, le levier le plus efficace ne se trouve pas dans le devis mais sur les postes de travail : l'impression noir et blanc par défaut, la couleur à la demande. C'est ce que j'ai imposé en septembre, par un mail à tous, avant même de recevoir les devis. Un réglage par défaut, zéro négociation, et la ligne « pages couleur » du tableau baisse dès le trimestre suivant.

## Pour aller plus loin

- [Construire le dossier de décision d'un projet réseau](/docs/dsi/construire-le-dossier-de-decision-dun-projet-reseau/) : la même logique, options chiffrées puis recommandation, appliquée à un projet plus gros.
- [Broadcom, VMware et la facture qui a doublé](/blog/broadcom-vmware-facture-pme/) : le coût récurrent se paie au renouvellement, jamais à l'achat.
- [Inventorier et verrouiller les imprimantes partagées en PowerShell](/docs/windows-server/imprimantes-partagees-powershell/) : pour savoir ce qui imprime, et depuis où.

<!-- source : mail « test renouvellement contrat copieur », 2024-11-05 et 2024-12-03 ; mail à tous « impression noir et blanc par défaut », 2024-09-10 -->

---
title: "Écrire des communications IT que les gens lisent : charte IA, fin d'un outil, rappel de bonnes pratiques"
description: "Constat en une phrase, règle en gras, alternatives prêtes à l'emploi, canal de demande, version anglaise : la trame de mes communications internes, et trois modèles de messages à reprendre tels quels."
published: 2026-07-30
category: dsi
tags: [communication, gouvernance, charte-ia, adressage-ip, it-solo, wetransfer]
level: débutant
status: à jour
featured: false
---

En un an, j'ai envoyé trois communications de gouvernance, en français et en anglais : la fin de WeTransfer à toute ma boîte en juillet 2025, un rappel sur l'adressage IP privé aux techniciens en juillet 2026, et le lendemain, à l'ensemble des sites, une charte d'encadrement des outils d'intelligence artificielle. Trois sujets différents, trois publics différents, une seule trame. Elle n'a rien d'original ; elle a l'avantage d'avoir été lue, et d'avoir produit des réponses plutôt que du silence.

Voici la trame, les erreurs qui la cassent, et trois modèles à copier : ils sont là pour ça.

## Dix secondes, pas plus

Un mail de l'informatique obtient dix secondes d'attention. Pas parce que les gens sont hostiles, mais parce qu'ils ont un atelier à faire tourner, un client au téléphone ou un devis à finir. Si la règle n'est pas visible en dix secondes, elle n'existe pas.

Dans mes notes à la direction, j'écris systématiquement une **version courte** et une **version longue**. La courte tient en cinq lignes et dit ce qu'il faut savoir ou décider ; la longue vient en dessous, pour ceux qui veulent comprendre pourquoi. Personne ne se plaint de la longue, parce que personne n'est obligé de la lire. Les communications à tout le monde suivent la même logique : la règle d'abord, l'explication ensuite, jamais l'inverse.

## La trame en cinq blocs

1. **Le constat, en une phrase.** Le risque concret, pas le paragraphe juridique. « Des documents internes partent vers des plateformes externes » se lit ; « dans le cadre de notre politique de conformité » ne se lit pas.
2. **La règle, en gras.** Ce qui est interdit, ce qui est autorisé. Une règle qu'il faut chercher dans le texte n'est pas une règle.
3. **Les alternatives, prêtes à l'emploi.** Avec les liens internes, le jour même. Interdire sans alternative, c'est organiser le contournement.
4. **Le canal de demande.** Les besoins particuliers remontent par le responsable de service, consolidés, pas en direct. Sinon vous recevez trente mails identiques et vous répondez trente fois.
5. **La version anglaise en dessous, la date d'application, un contact.** Les sites distants lisent en anglais, et une règle sans date est une règle « bientôt ».

C'est un panneau routier : le pictogramme d'abord, le code de la route en annexe.

## Les trois erreurs qui tuent un message

- **Le jargon.** Dites « adresse privée » et expliquez en une image ; ne citez pas une RFC sans dire à quoi elle sert. Mes analogies sont domestiques et assumées : l'antispam est le portier, la sauvegarde est le coffre à la banque.
- **La morale.** Personne n'a envoyé un plan de machine sur WeTransfer pour nuire à l'entreprise. Les gens ont des habitudes, et une habitude ne se supprime pas par mail : elle se remplace.
- **L'absence de blocage technique.** Une règle sans blocage est une suggestion. WeTransfer a été bloqué le jour du mail ; un an plus tard, il a quand même fallu un rappel, ce qui vous donne la durée de vie d'une consigne non répétée.

:::note
Une communication n'est pas une procédure. La procédure détaillée, avec captures d'écran, vit sur l'intranet ou dans la base de connaissances du helpdesk ; le mail y renvoie. Mélanger les deux, c'est garantir que ni l'un ni l'autre ne sera lu.
:::

## Modèle 1 : annoncer la fin d'un outil

Le cas type : un service pratique, adopté par tout le monde, dont les conditions d'utilisation ou l'hébergement ne conviennent plus. Le message doit tenir sur un écran.

```text title="Objet : Fin de l'utilisation de [Outil] à compter du [date]"
Bonjour à tous,

[Outil] est pratique, et c'est précisément le problème : les fichiers déposés
(plans, devis, données de production) partent chez un tiers dont nous ne
maîtrisons ni l'usage ni la localisation.

À compter du [date], l'utilisation de [Outil] est interdite pour tout envoi
de fichiers professionnels. Le site sera bloqué depuis le réseau de l'entreprise.

À la place, dans cet ordre :
1. [Instance interne de transfert] : même usage (un lien, un glisser-déposer),
   chiffré, suppression automatique après [N] jours, hébergé en France.
   -> [lien]
2. [Service de secours] pour les cas où l'outil interne ne convient pas.
3. SharePoint / OneDrive, avec un partage à durée limitée, pour les échanges
   internes ou avec des partenaires réguliers.

Si un besoin particulier n'est couvert par aucune de ces options, merci de le
signaler à votre responsable de service, qui consolidera les demandes.

Contact : [service informatique].

--- English version below ---
[même structure]
```

## Modèle 2 : une charte d'usage des outils d'IA

En juillet 2026, le constat était simple : des documents internes étaient collés dans des assistants IA publics. La charte ne dit pas « l'IA c'est mal ». Elle dit qui a le droit d'utiliser quoi, et comment obtenir un accès.

```text title="Objet : Encadrement de l'utilisation des outils d'intelligence artificielle"
Bonjour à tous,

Nous constatons que des documents internes sont envoyés vers des plateformes
d'IA publiques (ChatGPT, Gemini, Claude, Copilot, Perplexity...). Ces outils
sont utiles ; ce sont les données qui posent problème.

À compter du [date], l'usage des outils d'IA publics avec des données de
l'entreprise est réservé aux collaborateurs disposant d'une licence ou d'une
solution validée par le service informatique.

Pourquoi : souveraineté des données, stockage conforme (hébergement en France
ou sur une infrastructure que nous contrôlons), confidentialité de nos clients.

Comment obtenir un accès : pas de demande individuelle. Chaque responsable de
service recense les besoins de son équipe (usages, fréquence, type de données)
et transmet une demande globale au service informatique, qui proposera l'outil
adapté.

Contact : [service informatique].

--- English version below ---
[même structure]
```

Ce que ce mail a produit, et que je n'attendais pas si vite : un responsable de service a répondu avec la liste réelle des usages de son équipe, de la recherche de fournisseurs aux matrices de calcul dans Excel, en passant par les notices internes et les fonctions de CAO. C'est exactement ce que le canal de demande doit faire remonter, et un inventaire que je n'aurais jamais obtenu par un sondage.

## Modèle 3 : un rappel de bonnes pratiques

Le cas type : une pratique technique qui dérive, ici des techniciens qui configuraient des machines chez des clients avec des adresses IP publiques. Le public est technique, mais pas informaticien ; il faut l'image avant la plage d'adresses.

```text title="Objet : Rappel : adressage IP privé sur les machines"
Bonjour à tous,

Plusieurs machines livrées récemment ont été configurées avec des adresses IP
publiques. Une adresse publique appartient à quelqu'un d'autre sur Internet :
c'est comme donner à l'atelier le numéro de téléphone d'une entreprise à
l'autre bout du monde. Les communications partent au mauvais endroit, et le
client passe des heures à comprendre pourquoi.

Sur une machine ou un automate, utilisez uniquement une adresse privée,
dans l'une de ces plages :
- 10.0.0.0 à 10.255.255.255
- 172.16.0.0 à 172.31.255.255
- 192.168.0.0 à 192.168.255.255

Si le client impose une autre adresse, c'est lui qui la fournit par écrit ;
en cas de doute, demandez au service informatique avant la mise en service.

Applicable immédiatement. Contact : [service informatique].

--- English version below ---
[même structure]
```

## Annoncer un changement sans provoquer de tickets

La trame vaut aussi pour les nouveautés. Quand j'ai déployé une synchronisation nocturne de l'annuaire dans les contacts Outlook de chacun, le mail disait trois choses : ce qui apparaît (une catégorie dédiée, avec mail, téléphone, service, fonction), ce que le robot fait seul (arrivées, changements, départs), et ce qu'il écrase (toute modification manuelle dans cette catégorie ; les contacts personnels ne sont pas touchés). Un peu d'humour sur le robot « qui carbure au café virtuel », et une signature qui résume ma doctrine : le meilleur ticket informatique est celui que vous n'avez jamais besoin d'ouvrir.

Même chose pour une mise à jour d'application qui risque de casser un raccourci : on prévient avant, avec la manipulation en trois lignes (menu Démarrer, chercher l'application, la réépingler). Ça n'évite pas tous les tickets ; ça évite les dix premiers.

:::tip
Relisez chaque message en vous demandant : si je ne lis que les mots en gras, est-ce que je sais quoi faire ? Si la réponse est non, ce n'est pas encore une communication, c'est un brouillon.
:::

## Pour aller plus loin

- [J'ai interdit WeTransfer, et voici ce qui s'est passé](/blog/wetransfer-interdit-et-alors/) : le récit complet du modèle 1, un an après.
- [Mettre à jour sa charte informatique pour NIS2](/docs/dsi/mettre-a-jour-sa-charte-informatique-pour-nis2/) : la charte IA finit par y entrer.
- [Quand l'informaticien est absent : la procédure de remplacement](/docs/dsi/procedure-de-remplacement-it-pendant-une-absence/) : la même exigence de clarté, pour un lecteur qui découvre vCenter un dimanche soir.

<!-- source : mails « Fin de l'utilisation de WeTransfer », 2025-07-15 ; « Rappel concernant l'utilisation des adresses IP publiques », 2026-07-21 ; « Encadrement de l'utilisation des outils d'intelligence artificielle », 2026-07-22 ; « Mise à jour Outlook : vos collègues arrivent dans vos contacts », 2026-07-28 -->

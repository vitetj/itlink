---
title: "Mesurer un accès Internet avant de l'acheter"
description: "Un opérateur propose toujours plus gros. Avant de signer, mesurez l'existant, trouvez le vrai goulot d'étranglement et posez cinq questions. Méthode appliquée au déménagement d'un site."
published: 2026-09-02
category: reseau
tags: [internet, fibre, debit, vpn, achats, operateur]
level: débutant
status: à jour
featured: false
sidebar:
  label: "Mesurer un accès Internet avant de l'acheter"
---

Un site de ma boîte devait déménager, et l'opérateur en a profité pour proposer une montée en gamme
spectaculaire. C'est le réflexe commercial normal : plus de débit se vend mieux qu'un accès adapté. Le réflexe
symétrique côté informatique consiste à dire oui, parce que personne ne s'est jamais fait reprocher d'avoir
acheté trop de bande passante.

Sauf que si. Un accès surdimensionné coûte tous les mois, sur trois ou cinq ans, pour un gain nul si le vrai
point de blocage est ailleurs. Voici la méthode que j'ai appliquée, dans l'ordre, avant de répondre à l'offre.

## Prérequis

- Un accès en lecture aux compteurs de votre routeur ou de votre pare-feu.
- La facture ou le contrat en cours, avec la date d'échéance et les clauses de résiliation.
- Une heure de tranquillité. C'est le seul investissement réel de la démarche.

## Étape 1 — Mesurer l'existant, pas l'impression

L'impression des utilisateurs — « c'est lent » — n'est pas une mesure. Il en faut deux : le débit maximal
atteignable, et la charge réelle dans le temps.

Pour le débit maximal, un test depuis un poste filaire, hors heures de pointe, répété trois fois. Les outils en
ligne suffisent ; si vous avez un serveur à l'autre bout, `iperf3` donne un résultat plus honnête parce qu'il ne
dépend pas d'un serveur de test mutualisé.

```bash title="Mesurer entre deux points que vous maîtrisez"
# Côté serveur, dans le site distant ou chez votre hébergeur
iperf3 -s

# Côté client, dans le site à mesurer
iperf3 -c 198.51.100.10 -t 30          # sens montant
iperf3 -c 198.51.100.10 -t 30 -R       # sens descendant
```

Sur le site que j'analysais, la mesure a donné environ **626 Mbps en descendant pour 38 Mbps en montant**. Ce
seul chiffre oriente déjà toute la décision : le point faible n'est pas le débit descendant, c'est l'upload,
et il est presque vingt fois plus petit.

Pour la charge réelle, ne vous fiez pas au pic instantané. Relevez l'occupation de l'interface WAN sur trente
jours dans votre supervision et regardez le percentile 95 : c'est ce qui décrit votre usage, pas la pointe d'une
sauvegarde du dimanche soir.

:::note
Un accès asymétrique est un piège classique dans les offres grand public reconditionnées en pro. Tout ce que
votre site **envoie** — sauvegardes externalisées, visioconférences, transferts vers les clients, VPN
site-à-site — passe par le petit tuyau. C'est presque toujours l'upload qui décide.
:::

## Étape 2 — Trouver le vrai goulot d'étranglement

C'est l'étape que personne ne fait, et c'est celle qui économise le plus.

Dans mon cas, l'essentiel du trafic du site part vers les autres sites du groupe, à travers un VPN
site-à-site. Or ce VPN plafonne à **200 Mbps**, pour des raisons de chiffrement et de dimensionnement des
équipements aux deux extrémités. Au-delà de 200 Mbps, un accès Internet plus rapide n'apporte strictement rien
aux échanges inter-sites. Il n'améliore que ce qui va directement sur Internet.

La question à se poser est donc toujours la même : **quel équipement, sur le chemin réel du trafic, sera saturé
en premier ?** Les candidats habituels :

| Candidat | Comment le vérifier |
| --- | --- |
| Le VPN site-à-site | Débit maximal du tunnel testé entre deux serveurs des deux sites |
| Le pare-feu avec inspection activée | Fiche produit : le débit « IPS activé » est très inférieur au débit brut |
| Le lien vers la plateforme SASE ou le cloud | Contrat : le débit souscrit sur le PoP, pas celui de l'accès |
| Le Wi-Fi | Un site en 300 Mbps Wi-Fi ne profite pas d'un Gbps filaire |
| Le serveur de fichiers ou la sauvegarde | Débit disque, pas débit réseau |

Tant que ces points ne sont pas connus, acheter du débit revient à élargir une autoroute qui débouche sur un
péage à deux guichets.

## Étape 3 — Écrire la spécification avant de lire l'offre

Une fois les deux étapes précédentes faites, le besoin s'écrit en quatre lignes, et ces quatre lignes ne
mentionnent pas de marque :

1. **Un débit symétrique**, parce que c'est l'upload qui manque. Passer de 38 Mbps à 150 Mbps en montant
   multiplie le point faible par quatre ; passer le descendant de 626 Mbps à plus ne change rien.
2. **Une adresse IP publique fixe**, indispensable pour le VPN site-à-site et pour toute publication.
3. **Un engagement de rétablissement** compatible avec l'activité du site.
4. **Un débit garanti**, et non « jusqu'à », si le site ne peut pas s'arrêter.

Sur ce dossier, l'offre retenue a été une offre symétrique 150/150 avec adresse publique, pour une mensualité
inférieure à celle de l'accès en place. L'offre haut de gamme a été écartée par écrit, avec quatre arguments :
coût, débit supérieur au besoin réel, limitation par le VPN, gain opérationnel faible. Écrire ce refus est
important : c'est la trace qui vous protège si quelqu'un demande six mois plus tard pourquoi on n'a pas pris
« le meilleur ».

## Étape 4 — Poser les cinq questions qui font la différence

« FTTx » veut tout dire et rien dire. Avant de signer, demandez par écrit :

- **FTTO, FTTE ou FTTH ?** Ce n'est ni la même architecture, ni le même partage, ni le même délai de
  rétablissement.
- **L'ONT est-il fourni ?** Sinon, c'est une ligne de budget et un délai supplémentaires.
- **Le routeur est-il fourni ?** Et si oui, puis-je le mettre en mode bridge derrière mon propre pare-feu ?
- **Le débit est-il garanti ou mutualisé ?**
- **Combien d'adresses IP publiques, et sont-elles fixes ?**

Les réponses tiennent en cinq lignes et déplacent parfois la décision d'une offre à l'autre.

## Étape 5 — Chiffrer le coût de sortie de l'existant

Un nouvel accès ne remplace pas immédiatement l'ancien : il faut les faire coexister le temps des tests, et
solder le contrat en cours. Le calcul de base est simple — mois restants multipliés par la mensualité — mais il
doit être présenté comme une estimation haute, à confirmer selon les clauses. Trois cas changent souvent le
montant : fermeture de site, déménagement imposé, et pénalités plafonnées.

Sur un dossier équivalent que j'ai clos quelques jours plus tard, la résiliation anticipée a finalement été
négociée à un montant très inférieur à la fourchette annoncée au lancement du projet. Budgétez le pire, mais
négociez : ce n'est jamais une somme figée.

## Garder deux plans B

Deux solutions à avoir en tête dès la phase d'étude, parce qu'un raccordement filaire tient rarement les délais :

- **Un routeur 4G ou 5G professionnel** pour ouvrir le site en attendant le filaire. Ce n'est pas confortable,
  mais ça permet de déménager à la date prévue.
- **Un accès satellite** si la zone est réellement mal desservie. La latence interdit certains usages, elle
  n'interdit pas la messagerie ni la bureautique en ligne.

## Pour aller plus loin

- [Lire un devis télécom : UCC, SWA et packs manager](/docs/dsi/lire-un-devis-telecom-ucc-swa-et-packs-manager/)
- [Construire le dossier de décision d'un projet réseau](/docs/dsi/construire-le-dossier-de-decision-dun-projet-reseau/)
- [UniFi UDM : WAN de secours et bascule 4G vers fibre](/docs/reseau/unifi-udm-wan-de-secours-et-bascule-4g-vers-fibre/)

<!-- source : mail « Analyse des offres Internet et impact financier du déménagement », 2026-09-01, et clôture du dossier équivalent 2026-09-08 -->

---
title: "Activer, vérifier et dépanner une licence Windows avec slmgr"
description: "La page Activation de Windows ne dit ni le type de licence, ni sa date d'expiration. slmgr le dit : lire une licence OEM, détail, KMS ou MAK, activer en ligne ou par téléphone, et lire les codes d'erreur."
published: 2024-11-14
category: microsoft
tags: [windows, slmgr, licence, kms, activation, poste-de-travail]
level: intermédiaire
status: à jour
featured: false
tested_on: [Windows 10, Windows Server 2022]
sidebar:
  label: "Activer Windows avec slmgr"
---

La page **Paramètres > Système > Activation** a un défaut : elle répond par oui ou par non. Windows est activé,
ou il ne l'est pas, avec parfois un code d'erreur à huit chiffres en guise d'explication. Elle ne vous dira
jamais de quel type de licence il s'agit, si elle expire, combien de réarmements il reste, ni vers quel serveur
d'activation le poste essaie de parler.

`slmgr` répond à toutes ces questions. C'est un script fourni avec Windows depuis quinze ans, il n'y a rien à
installer, et il reste l'outil que j'ouvre en premier dès qu'un poste réinstallé, une machine virtuelle clonée
ou un PC récupéré affiche un filigrane « Activer Windows » en bas à droite.

## Prérequis

Une invite de commandes **en tant qu'administrateur**. Sans élévation, la plupart des paramètres échouent en
silence ou affichent un refus d'accès. Toutes les commandes qui suivent s'écrivent indifféremment `slmgr` ou
`slmgr.vbs` ; sur les versions récentes de Windows, préfixez par `cscript //nologo` si vous voulez la sortie
dans la console plutôt que dans une boîte de dialogue :

```cmd title="Sortie en console plutôt qu'en fenêtre"
cscript //nologo C:\Windows\System32\slmgr.vbs /dlv
```

## Savoir ce que vous avez avant de changer quoi que ce soit

C'est l'étape que tout le monde saute, et c'est la seule qui compte. Trois commandes :

```cmd title="Diagnostic de licence"
slmgr /dli
slmgr /dlv
slmgr /xpr
```

`/dli` donne l'essentiel : édition, les cinq derniers caractères de la clé installée, état d'activation.
`/dlv` ajoute l'identifiant d'activation, le canal de licence, le nombre de réarmements restants et, pour un
client KMS, le nom du serveur d'activation contacté. `/xpr` répond à une seule question, mais la plus utile en
production : cette licence expire-t-elle, et quand.

:::caution
La sortie de `/dli` et `/dlv` contient une partie de la clé produit. Ne la collez pas telle quelle dans un
ticket, un mail ou une capture d'écran partagée. Reformulez : « canal OEM, activé, sans expiration ».
:::

### Reconnaître le canal de licence

Le champ *Description* de `/dlv` contient un mot-clé qui décide de tout ce que vous pouvez faire ensuite.

| Ce que contient la description | Type | Ce que ça implique |
|---|---|---|
| `OEM_DM`, `OEM_SLP` | OEM | Licence liée à la carte mère de la machine, préinstallée par le constructeur. Non transférable, se réactive seule après réinstallation. |
| `RETAIL` | Détail | Achetée à l'unité. Transférable d'un poste à l'autre, à condition de la retirer du premier. |
| `VOLUME_KMSCLIENT` | Volume KMS | Le poste s'active auprès d'un serveur KMS interne et doit le revoir régulièrement. |
| `VOLUME_MAK` | Volume MAK | Une clé unique avec un quota d'activations, chaque poste s'active directement chez Microsoft. |

Retenez l'essentiel : un poste OEM n'a pas besoin qu'on lui saisisse une clé, sa licence est dans le
micrologiciel. Un poste en volume mal configuré, lui, se désactivera tout seul dans six mois.

## Activer en ligne

Deux commandes, dans cet ordre : installer la clé, puis demander l'activation.

```cmd title="Installation de la clé puis activation"
slmgr /ipk <CLE-PRODUIT>
slmgr /ato
```

`/ipk` remplace la clé actuelle. `/ato` contacte les serveurs Microsoft (ou le KMS, si le poste est un client
KMS) et demande l'activation. Si tout va bien, une fenêtre confirme que le produit a été activé ; vérifiez
avec `slmgr /dli`.

Sur une machine dont la licence est dans le micrologiciel, vous n'avez pas besoin de connaître la clé du
tout, et vous ne devez surtout pas en saisir une autre : Windows lit la sienne dans la table ACPI MSDM du
BIOS et s'active seul dès qu'il a une connexion. Pour vérifier qu'une licence firmware est bien présente
avant de réinstaller un poste :

```powershell title="Le poste a-t-il une licence inscrite dans son BIOS ?"
(Get-CimInstance -ClassName SoftwareLicensingService).OA3xOriginalProductKeyDescription
```

Une réponse vide signifie qu'il n'y a rien dans le micrologiciel, et donc qu'il faudra fournir une clé.

## Activer hors ligne, par téléphone

Sur un poste isolé, en salle blanche ou sur un réseau industriel sans accès Internet, l'activation passe par
le service téléphonique de Microsoft. Le principe : le poste produit un identifiant d'installation, vous le
dictez, on vous rend un identifiant de confirmation.

```cmd title="Activation téléphonique"
slmgr /dti
slmgr /atp <IDENTIFIANT-DE-CONFIRMATION>
slmgr /dlv
```

`/dti` affiche l'identifiant d'installation, une longue suite de chiffres. Le numéro de téléphone du centre
d'activation dépend du pays : il s'affiche dans l'assistant graphique quand vous choisissez une autre méthode
que l'activation par Internet.

## Le cas des licences en volume : KMS et MAK

C'est là que les entreprises se prennent les pieds dans le tapis, parce que les deux mécanismes n'ont
strictement rien à voir.

**MAK** (*Multiple Activation Key*) fonctionne comme une licence détail avec un compteur : une clé, un quota
d'activations, chaque poste s'active une fois directement auprès de Microsoft et n'y revient plus. Simple,
adapté aux postes nomades ou isolés. Le quota se consomme, y compris quand vous réinstallez le même PC.

**KMS** (*Key Management Service*) fonctionne comme un abonnement : un serveur interne délivre une activation
valable 180 jours, que le client renouvelle automatiquement tous les 7 jours. Un poste qui ne revoit pas son
KMS pendant six mois repasse en état non activé. Le serveur ne commence à répondre qu'à partir d'un seuil
minimal de clients distincts — 25 pour les postes de travail, 5 pour les serveurs — ce qui surprend toujours
au démarrage d'un déploiement.

Côté client, la configuration se fait avec deux paramètres :

```cmd title="Pointer un client vers un serveur KMS interne"
slmgr /skms kms.example.com:1688
slmgr /ato
slmgr /dlv
```

Pour revenir à la découverte automatique, qui s'appuie sur un enregistrement DNS SRV `_vlmcs._tcp` :

```cmd title="Revenir à la découverte automatique par DNS"
slmgr /ckms
slmgr /ato
```

:::note
Un client KMS a besoin d'une clé cliente générique (GVLK), spécifique à l'édition installée. Ces clés sont
publiées par Microsoft dans la documentation d'activation en volume ; elles ne sont pas secrètes, mais elles
changent à chaque édition et il faut prendre celle de votre version exacte, sinon l'activation échoue sans
raison apparente.
:::

## Retirer une clé avant de céder ou de recycler un poste

Deux commandes complémentaires, et il faut les deux :

```cmd title="Désinstaller la clé et l'effacer du registre"
slmgr /upk
slmgr /cpky
```

`/upk` désinstalle la clé produit et désactive Windows. `/cpky` efface la clé stockée dans le registre, où des
utilitaires — légitimes ou non — savent très bien aller la lire. Sur un poste qui sort de l'entreprise, en
don, en revente ou en reprise, faites les deux. C'est aussi la manipulation à faire sur le poste source avant
de déplacer une licence détail vers une autre machine.

## Lire les erreurs d'activation

Les codes se ressemblent tous. Les quatre que vous rencontrerez :

| Code | Ce qu'il veut dire | Quoi faire |
|---|---|---|
| `0xC004F050` | La clé saisie n'est pas valide pour cette édition | Vérifier la frappe, et surtout que la clé correspond à l'édition installée |
| `0xC004C003` | Le serveur d'activation a bloqué la clé | Clé déjà trop utilisée, révoquée, ou d'origine douteuse. Il n'y a rien à dépanner côté poste |
| `0xC004F074` | Aucun serveur KMS n'a pu être contacté | Vérifier le nom du KMS, le port 1688/TCP et le pare-feu |
| `0x8007232B` | Le nom DNS n'existe pas | L'enregistrement SRV `_vlmcs._tcp` est absent : pointer le KMS explicitement avec `/skms` |

## Réarmer la période d'essai, et pourquoi j'évite

`slmgr /rearm` réinitialise le compteur de la période de grâce, généralement 30 jours, et le nombre de
réarmements possibles est limité. C'est prévu pour la préparation d'images système, pas pour faire durer un
Windows non licencié.

:::caution
Réarmer ne crée pas de droit d'usage. Si un poste tourne sans licence en production, le problème n'est pas
technique, il est budgétaire ou contractuel : faites-le remonter plutôt que de repousser l'échéance de trente
jours en trente jours. Je le dis d'expérience, le poste oublié finit toujours par se rappeler à vous un
vendredi soir.
:::

## Pour aller plus loin

- [DISM : sauvegarder et réinjecter les pilotes Windows](/docs/automatisation/dism-sauvegarder-et-reinjecter-les-pilotes-windows/),
  l'autre outil du kit de réinstallation.
- [PC modulaire en entreprise : la grille de décision](/docs/dsi/pc-modulaire-en-entreprise-la-grille-de-decision/),
  où la question OEM contre licence en volume se pose vraiment.
- [Licences flottantes CAO : Sentinel RMS et FlexNet](/docs/architecture/licences-flottantes-cao-sentinel-rms-et-flexnet/),
  pour la même logique appliquée aux logiciels métier.
- Documentation Microsoft : [Activation en volume de Windows](https://learn.microsoft.com/windows/deployment/volume-activation/volume-activation-windows).

<!-- source : procédure interne « Windows Activation », export du centre de documentation -->

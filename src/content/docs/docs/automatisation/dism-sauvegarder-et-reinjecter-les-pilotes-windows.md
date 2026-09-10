---
title: "Sauvegarder et réinjecter tous les pilotes Windows avec DISM"
description: "Avant de réinstaller Windows ou de changer une carte mère, exportez les pilotes constructeur avec DISM et réinjectez-les d'un bloc après l'installation. Trois commandes, aucun téléchargement douteux."
published: 2024-10-25
category: automatisation
tags: [dism, pilotes, windows, dell, reinstallation, pnputil]
level: débutant
status: à jour
featured: false
tested_on: [Windows 10, Windows 11]
sidebar:
  label: "Sauvegarder et réinjecter tous les pilotes…"
---

Un portable Dell qui revient d'un remplacement de carte mère, ou qu'on décide de réinstaller à neuf parce qu'il traîne
trois ans de logiciels d'automaticien : dans les deux cas, la même question revient au moment de remettre Windows.
Où sont les pilotes ? Le site du constructeur en liste une trentaine, l'outil de mise à jour en réclame d'autres, et
il y a toujours ce périphérique inconnu avec un point d'exclamation qui résiste. Pendant ce temps, la machine qui
tourne encore à côté a déjà tout : les bons pilotes, dans les bonnes versions, installés et fonctionnels.

Autant lui demander une copie. C'est comme prendre une photo du câblage avant de démonter un meuble : dix secondes,
et vous évitez une heure de devinettes au remontage. DISM, l'outil de maintenance d'images intégré à Windows, sait
exporter tous les pilotes tiers d'une installation en une commande, puis les réinjecter en une autre.

## Prérequis

- Un Windows 10 ou 11 qui démarre encore, avec une session administrateur. Si la machine ne démarre plus, la méthode
  hors ligne en fin d'article s'applique.
- Un support **en dehors du disque système** : clé USB ou partage réseau. Une réinstallation efface `C:\`, et un
  dossier de sauvegarde qui disparaît avec le système n'a jamais sauvé personne.
- Le même modèle de machine à l'arrivée. Les pilotes d'un Latitude ne vont pas sur un autre modèle, on y revient
  dans les pièges.

## Exporter les pilotes tiers

Ouvrez une invite de commandes ou PowerShell **en tant qu'administrateur**. Sans élévation, DISM refuse de parler au
magasin de pilotes et s'arrête sur une erreur d'accès.

```cmd title="Exporter tous les pilotes tiers vers un dossier"
mkdir C:\drivers_backup
dism /online /export-driver /destination:C:\drivers_backup
```

Deux mots sur la syntaxe. `/online` désigne le Windows en cours d'exécution, par opposition à une image montée sur le
disque. `/export-driver` parcourt le magasin de pilotes et copie chaque paquet tiers dans son propre sous-dossier :
le fichier `.inf`, les `.sys`, les `.dll` et le catalogue de signature `.cat`. Vous obtenez une arborescence du
type `oem12.inf_amd64_…`, un dossier par pilote.

Si vous voulez voir ce qui va partir avant de lancer l'export :

```cmd title="Lister les pilotes tiers présents dans le magasin"
dism /online /get-drivers /format:table
```

:::note
`export-driver` n'exporte **que les pilotes tiers**, ceux que le constructeur ou vous avez ajoutés. Les pilotes
fournis par Windows lui-même (« inbox ») ne sont pas copiés, et c'est normal : la réinstallation les ramènera.
Le dossier contient donc le chipset, le réseau, le son, le lecteur d'empreintes, le pavé tactile, la carte
graphique. Bref, exactement ce que vous auriez passé l'après-midi à chercher.
:::

Copiez ensuite le dossier hors de la machine. `robocopy` conserve l'arborescence et reprend en cas de coupure :

```cmd title="Mettre la sauvegarde à l'abri sur une clé ou un partage"
robocopy C:\drivers_backup E:\drivers_backup /E
```

Comptez large sur le support : les pilotes graphiques pèsent lourd.

## Réinstaller Windows

Rien de particulier ici, si ce n'est deux réflexes avant de lancer l'installation :

- si le disque est chiffré par BitLocker, vérifiez que vous avez la clé de récupération ailleurs que sur ce disque ;
- gardez la machine hors ligne, ou mettez Windows Update en pause, le temps de réinjecter vos pilotes. Sinon vous
  vous retrouvez avec un mélange de versions constructeur et de versions Windows Update, et c'est rarement le
  mélange qui marche le mieux.

## Réinjecter les pilotes d'un bloc

Une fois sur le bureau du Windows fraîchement installé, recopiez le dossier sur le disque puis, toujours dans une
invite administrateur :

```cmd title="Injecter tout le dossier, sous-dossiers compris"
dism /online /Add-Driver /Driver:C:\drivers_backup /Recurse
```

`/Recurse` demande à DISM de descendre dans tous les sous-dossiers à la recherche de fichiers `.inf`. Chaque paquet
trouvé est ajouté au magasin de pilotes ; ceux qui correspondent à un matériel présent sont appliqués immédiatement,
les autres restent en réserve, prêts à servir si on branche le périphérique plus tard. Un redémarrage termine
l'installation de certains pilotes (chipset, graphique).

Vérifiez dans le Gestionnaire de périphériques qu'il ne reste plus de point d'exclamation, ou listez ce qui a été
chargé :

```cmd title="Contrôler les pilotes installés"
pnputil /enum-drivers
```

:::caution
DISM propose une option `/ForceUnsigned` pour forcer l'ajout de pilotes non signés. Ne l'utilisez pas sur un poste
de production. Un pilote constructeur exporté depuis une machine saine est signé ; s'il ne l'est plus, c'est qu'il
y a un problème ailleurs.
:::

## Variantes utiles

### Avec pnputil plutôt que DISM

Depuis Windows 10, `pnputil` sait faire la même chose, avec une syntaxe un peu plus lisible :

```cmd title="Équivalent avec pnputil"
pnputil /export-driver * C:\drivers_backup
pnputil /add-driver C:\drivers_backup\*.inf /subdirs /install
```

Le résultat est identique, choisissez celui que vous retenez.

### Sur une machine qui ne démarre plus

Si Windows est mort mais que le disque est lisible, DISM peut travailler sur l'installation hors ligne depuis un
environnement de récupération (WinRE, clé d'installation, ou le disque monté sur une autre machine) :

```cmd title="Exporter depuis une installation hors ligne"
dism /Image:D:\ /export-driver /destination:E:\drivers_backup
```

`D:\` est ici la racine du Windows à récupérer. Même principe pour injecter dans une image de déploiement montée :
remplacez `/online` par `/Image:<chemin>`.

## Les pièges

| Piège | Ce qui se passe | Parade |
| --- | --- | --- |
| Invite non élevée | DISM échoue sur une erreur d'accès | Clic droit, « Exécuter en tant qu'administrateur » |
| Sauvegarde laissée sur `C:\` | Elle part avec la réinstallation | Copier sur une clé ou un partage avant |
| Pilotes de modèles différents dans le même dossier | Un pilote proche mais pas identique peut être retenu pour un matériel voisin, avec des comportements bizarres | Un dossier par modèle, nommé explicitement |
| Export après un changement de carte mère | Les pilotes exportés sont ceux de l'ancienne carte | Exporter **avant** l'intervention, ou depuis un poste identique |
| BIOS et firmwares | DISM ne s'en occupe pas | Passer l'outil constructeur après la réinstallation |

Le troisième point mérite une insistance. On est tenté de faire un « dossier de pilotes Dell » commun à tout le
parc. Ne le faites pas : `/Recurse` prend tout ce qu'il trouve, et Windows choisit ensuite le pilote qu'il juge le
plus adapté à chaque matériel. Sur deux modèles voisins, ce n'est pas toujours le bon.

## Pour aller plus loin

- Une fois le système propre, les applications se poussent sans clic avec un outil de déploiement :
  [Déployer Microsoft 365 Apps avec WAPT](/docs/automatisation/deployer-microsoft-365-apps-avec-wapt/).
- Avant d'effacer un disque chiffré, lisez ce qui arrive quand la clé BitLocker n'est plus là où on la croit :
  [Clé BitLocker d'un device Entra supprimé](/docs/microsoft-365/cle-bitlocker-device-entra-supprime/).
- La référence complète des options de maintenance de pilotes est sur Microsoft Learn (« DISM Driver Servicing
  Command-Line Options »).

<!-- source : mail « rhrhrr » à un automaticien, 2024-10-25 -->

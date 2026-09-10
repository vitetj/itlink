---
title: "Licences flottantes de CAO : renouveler un fichier Sentinel RMS et inventorier des licences FlexNet sans casser la production"
description: "Renouveler un fichier de licence flottante avec WlmAdmin, éviter le piège du « Remove all features » quand plusieurs éditeurs partagent le serveur, et inventorier les jetons PTC via la console FlexNet."
published: 2025-10-09
updated: 2026-06-25
category: architecture
tags: [licences, topsolid, sentinel-rms, flexnet, cao, ptc]
level: avancé
status: à jour
featured: false
tested_on: [TopSolid 7, Sentinel RMS License Manager, Creo Elements/Direct V19 M070, Windows Server]
---

Une licence flottante, c'est un trousseau de clés posé sur une table au milieu de l'atelier. Chacun prend une clé quand il ouvre son logiciel, la repose quand il le ferme. Tant que la table est là, personne ne se pose de question. Le jour où elle disparaît — serveur de licences mal redémarré, fichier annuel non injecté, mauvaises entrées effacées — c'est le bureau d'études et la programmation d'usinage qui s'arrêtent en même temps. Et vous l'apprenez par téléphone, pas par une supervision.

Dans une PME industrielle, deux mondes de licences flottantes cohabitent souvent sans rien savoir l'un de l'autre. Chez moi, c'est TopSolid, la CAO/FAO, qui s'appuie sur **Sentinel RMS**, et Creo Elements/Direct, qui s'appuie sur **FlexNet**. Deux mécaniques, deux outils, deux façons de se planter. Cette fiche rassemble les trois opérations que je fais réellement dessus : le renouvellement annuel du fichier Sentinel, l'inventaire des jetons PTC avant un devis de mise à jour, et la remise en service après une coupure de courant.

## Prérequis

- Un accès administrateur sur la VM qui héberge le gestionnaire de licences.
- Le média d'installation de l'éditeur : l'outil d'administration Sentinel y est livré, on ne le télécharge pas ailleurs.
- Le nouveau fichier `.lic` envoyé par l'éditeur, posé sur le serveur — pas sur votre poste, vous allez le parcourir depuis le serveur.
- Un créneau annoncé aux utilisateurs, même court. Une opération de licence n'est jamais transparente.
- **Et surtout** : la liste des produits qui partagent ce serveur de licences. C'est le prérequis que tout le monde saute.

## Comprendre pourquoi une licence flottante tombe si facilement

Trois mécanismes expliquent l'essentiel des incidents.

**Le jeton non libéré.** Un poste qui garde l'application ouverte garde le jeton. L'utilisateur est parti déjeuner, son collègue ne peut pas ouvrir sa pièce. Ce n'est pas une panne, c'est de l'occupation — d'où le rappel périodique aux équipes.

**La licence dite « antivol ».** Certains éditeurs lient l'activation à l'état de la machine. Un arrêt brutal — coupure de courant, VM tuée, hôte qui redémarre sans grâce — et l'activation se désactive d'elle-même, par précaution anti-copie. Le service repart, la licence non.

**Le fichier repris.** Un serveur de licences peut, au redémarrage, recharger l'ancien fichier resté sur disque au lieu de celui que vous venez d'injecter. Vu deux jours après un renouvellement : le serveur PDM refusait de démarrer parce que le serveur de licences avait « repris » le fichier de l'année précédente.

:::note
Conséquence pratique : **une opération de licence n'est finie que lorsque vous avez redémarré le serveur et revérifié**. Sans un cycle d'arrêt/relance de test, vous ne savez pas ce qui sera chargé au prochain démarrage.
:::

## Renouveler le fichier de licence flottante Sentinel RMS

L'éditeur envoie chaque année un nouveau fichier code flottant. L'opération prend dix minutes, à condition de les prendre dans le bon ordre.

### Faire fermer l'application sur tous les postes

Un message à tous les utilisateurs concernés : fermez le logiciel. Un jeton encore pris pendant que vous retirez les features, c'est un client dans un état incohérent et un appel de plus dans l'heure. Expliquez le pourquoi, sinon la moitié des postes reste ouverte.

### Lancer l'outil d'administration depuis le média d'installation

Sur le serveur de licences, l'outil est fourni avec le produit :

```text title="Emplacement de l'outil d'administration Sentinel RMS"
<média d'installation>\Setup\Redist\Sentinel RMS License Manager\Tools\WlmAdmin.exe
```

Vérifiez au passage que le service tourne. Le gestionnaire Sentinel RMS écoute par défaut en UDP sur le port 5093 :

```powershell title="Contrôles rapides côté serveur"
Get-Service -Name "*Sentinel*" | Format-Table Name, Status, StartType
Get-NetUDPEndpoint -LocalPort 5093 -ErrorAction SilentlyContinue
```

### Retirer les anciennes features — et seulement les vôtres

Dans **Subnet Servers**, dépliez le serveur pour voir les features déclarées. Le réflexe documenté par les éditeurs est un clic droit sur le serveur puis **Remove all features**. Sur un serveur qui n'héberge qu'un seul produit, c'est parfait.

:::danger
**« Remove all features » enlève tout, y compris les licences des autres éditeurs.** Si votre serveur Sentinel héberge aussi les licences de la GPAO, de l'ERP ou d'un logiciel de métrologie, vous venez d'arrêter trois services au lieu d'en renouveler un — et vous n'aurez pas forcément sous la main les fichiers `.lic` des autres produits pour les réinjecter. Dans ce cas, supprimez les features **une par une**, en ne cochant que celles du produit que vous renouvelez.
:::

Avant de cliquer, faites une capture d'écran de la liste : c'est votre état de référence.

### Injecter le nouveau fichier

Clic droit sur le serveur → **Add Feature** → **From a File** → **To Server and its File**, puis sélectionnez le nouveau `.lic`.

Le sous-menu compte : **To Server and its File** écrit la licence en mémoire *et* dans le fichier de service. Ajoutée au seul serveur, elle disparaît au premier redémarrage — c'est le symptôme du « fichier repris » décrit plus haut.

### Repointer un poste client et vérifier

Sur un poste de CAO, menu **Aide > Licences > Licences flottantes** : saisissez le nom du serveur, **Appliquer**, puis **Ajouter la licence**. Préférez le nom DNS à l'adresse IP, comme `srv-licences.example.com` : le jour où la VM change d'adresse, vous ne repasserez pas sur chaque poste.

Retournez dans l'outil d'administration et contrôlez que chaque feature affiche la **nouvelle date d'expiration**. C'est la seule preuve qui vaut. Puis redémarrez le service — ou la VM si vous voulez dormir tranquille — et revérifiez.

## Inventorier les jetons PTC avec la console FlexNet

Deuxième monde, autre logique. Avant de demander un devis de mise à jour ou de formation, il faut savoir ce qu'on possède et ce qui sert vraiment. La console web du serveur FlexNet donne l'information sans rien installer :

```text title="Console web du serveur de licences FlexNet"
http://srv-licences.example.com:17171
```

Relevez pour chaque feature le nombre total de jetons et le nombre en cours d'utilisation. L'utilitaire standard FlexNet donne le même état en ligne de commande, pratique pour archiver un relevé daté :

```powershell title="Relevé des jetons en ligne de commande"
lmutil lmstat -a -c "C:\ProgramData\PTC\licensing\licence.txt"
```

Construisez ensuite le tableau des modules. Sur mon parc, il ressemble à ceci :

| Module | Nature | Remarque |
| --- | --- | --- |
| Modeling Design Productivity | Modeleur | Dimensionné sur le nombre de postes BE |
| Sheet Metal Productivity | Tôlerie | Usage ponctuel, peu de jetons |
| Machine Design Productivity | Conception machine | Idem |
| Part Library | Bibliothèque | Souvent oublié dans les devis |
| BOM Editor | Nomenclature | Consommé par les méthodes, pas par le BE |
| 3D PDF Converter | Publication | Pics d'usage en fin d'affaire |
| Model Manager | Gestion de données | **Beaucoup moins de jetons que de modeleurs** |
| Task Agent | Traitements automatiques | Compté à part |
| Web Client | Accès léger | Compté à part |

:::caution
Deux pièges de comptage font déraper un devis : le **Web Client** et le **Task Agent** consomment des jetons distincts, non inclus dans le modeleur ; et les jetons **Model Manager** sont en général bien moins nombreux que les personnes qui modélisent. Dimensionner la gestion de données sur le nombre de licences de modelage, c'est acheter trop.
:::

Documentez enfin la version exacte dans votre demande — dans mon cas, « V19 M070, base Oracle 11gR2 ». Un revendeur ne peut pas chiffrer une montée de version sans ça.

## Remettre les licences en service après une coupure de courant

Le scénario qui vous réveille : série de coupures un matin, l'onduleur a tenu ce qu'il a pu, les serveurs sont revenus — sauf deux VM, dont celle qui porte la CAO. Le téléphone sonne depuis 4 h. L'ordre des opérations n'est pas négociable.

1. **Constater avant d'agir.** État des hôtes et des VM dans la console de virtualisation, alarmes de la sauvegarde. Redémarrez les VM absentes une par une, en vérifiant leurs services.
2. **Réactiver la licence d'abord.** Sur la VM de CAO, réactivez la licence **avant** de relancer le service applicatif. Un serveur PDM relancé sur une licence désactivée démarre dans un état bancal, et il faut tout recommencer.
3. **Relancer les services applicatifs ensuite** : serveur de licences → serveur de données → services métier.

```powershell title="Relance ordonnée des services, une fois la licence réactivée"
Restart-Service -Name "<service-licences>" -Force
Start-Sleep -Seconds 20
Restart-Service -Name "<service-pdm>" -Force
Get-Service -Name "<service-licences>", "<service-pdm>" | Format-Table Name, Status
```

4. **Redémarrer la GPAO par précaution**, même si elle semble répondre : une base relancée après un arrêt sale mérite une vérification volontaire, pas un « ça a l'air de marcher ».
5. **Communiquer, et exiger un ticket.** Quand quinze personnes appellent en direct, personne ne peut prioriser. Un ticket, même bâclé, donne une file d'attente et un historique.

:::tip
Écrivez cette séquence dans un runbook rangé **hors** du système d'information. Une procédure stockée sur le serveur qui vient de tomber ne sert à rien : papier dans l'armoire, ou copie sur le téléphone.
:::

## Pour aller plus loin

- [Redémarrer une infrastructure virtualisée après une coupure](/docs/windows-server/runbook-redemarrer-une-infrastructure-virtualisee-apres-coupure/), pour l'ordre de démarrage global dans lequel s'insère la réactivation.
- [Dimensionner les onduleurs d'une petite salle serveur](/docs/architecture/dimensionner-les-onduleurs-dune-petite-salle-serveur/), parce que la meilleure remise en service est celle qu'on n'a pas à dérouler.
- [Le coffre à programmes de commande numérique](/docs/architecture/coffre-a-programmes-cn-source-unique-en-lecture-seule/), l'autre chantier de fiabilisation côté atelier.

<!-- source : mails « Renouvellement fichier code flottant » 2025-10-07, « PDM bloqué » 2025-10-09, « Demande devis mise à jour CAO » 2025-06 → 2026-03-03, fil « coupures électriques » 2026-06-24 -->

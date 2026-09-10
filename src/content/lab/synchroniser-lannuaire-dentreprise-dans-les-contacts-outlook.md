---
title: "Synchroniser l'annuaire d'entreprise dans les contacts Outlook des mobiles"
description: "Un job nocturne qui pousse l'annuaire dans les contacts de chaque boîte via Microsoft Graph, avec une catégorie dédiée pour tout retirer d'une commande. Le principe, le code, et ce que ça change sur un mobile."
published: 2026-07-29
category: serveurs
status: en production
stack: [Microsoft Graph, PowerShell, Entra ID, Exchange Online, Windows Server, Tâche planifiée]
tags: [microsoft-graph, powershell, outlook, annuaire, automatisation]
featured: false
---

La demande revenait tous les deux mois, formulée de dix façons différentes : « je ne sais pas qui m'appelle ». Sur un
téléphone professionnel, un appel interne s'affiche comme une suite de chiffres. La personne rappelle, tombe sur un
collègue, et me demande ensuite pourquoi son téléphone ne connaît pas l'entreprise dans laquelle elle travaille.

La liste d'adresses globale existe pourtant, et elle est à jour. Le problème est qu'elle vit dans Exchange, consultable
depuis l'application de messagerie, et que le composeur d'appels du téléphone, lui, ne la voit pas. Il ne regarde que
les **contacts** du compte. D'où l'idée, pas neuve mais efficace : puisque l'annuaire ne descend pas tout seul dans les
contacts, un robot l'y descendra toutes les nuits.

Objectif : chaque collaborateur retrouve dans ses contacts personnels une fiche par collègue, avec l'adresse de
messagerie, le poste fixe, le mobile, le service et la fonction. Les contacts qu'il a créés lui-même ne bougent pas.
Et je dois pouvoir tout retirer en une commande le jour où l'idée se révèle mauvaise.

## Matériel / stack

- **Microsoft Graph**, pour lire l'annuaire (`/users`) et écrire dans les contacts de chaque boîte
  (`/users/{id}/contacts`). C'est la seule interface qui permette d'écrire chez tout le monde sans se connecter à
  chaque boîte.
- **Une inscription d'application** dans Entra ID, avec les autorisations **d'application** `User.Read.All` et
  `Contacts.ReadWrite`, consentement administrateur accordé, et une authentification par **certificat** plutôt que par
  secret client.
- **PowerShell** et le module Microsoft Graph, sur un serveur Windows déjà utilisé pour les tâches planifiées.
- **Une tâche planifiée nocturne**, un journal par exécution, et un compte de service sans boîte aux lettres.
- **Une catégorie Outlook dédiée**, ici `ANNUAIRE-SOCIETE`, apposée sur chaque fiche créée par le robot. C'est la
  pièce maîtresse de tout le montage.

## Mise en place

### Restreindre la portée de l'application

Une application autorisée à écrire dans les contacts de toutes les boîtes est un objet sensible. Avant même d'écrire
la première ligne de code, je la limite à un groupe de sécurité contenant les boîtes réellement concernées, ce qui
exclut d'office les boîtes partagées, les comptes de service et les salles de réunion :

```powershell title="Limiter l'application aux boîtes concernées"
New-ApplicationAccessPolicy -AppId "00000000-0000-0000-0000-000000000000" `
    -PolicyScopeGroupId "sync-annuaire@example.com" `
    -AccessRight RestrictAccess `
    -Description "Robot de synchronisation de l'annuaire vers les contacts"
```

Si le robot part en vrille, il ne peut se tromper que dans un périmètre connu.

### Construire la source

Rien n'est pire qu'un annuaire propagé partout avec des services vides et des fonctions fantaisistes : l'erreur, elle
aussi, se synchronise. Je filtre donc les comptes actifs disposant d'une boîte, et je ne retiens que les attributs que
je m'engage à tenir à jour.

```powershell title="Lire l'annuaire"
Connect-MgGraph -ClientId $AppId -TenantId $TenantId -CertificateThumbprint $Thumb -NoWelcome

$props = 'id','displayName','givenName','surname','mail','jobTitle','department',
         'mobilePhone','businessPhones','accountEnabled'

$annuaire = Get-MgUser -All -Property $props -Filter "accountEnabled eq true" |
    Where-Object { $_.Mail -and $_.Department }
```

Le `Where-Object` sur le service n'est pas cosmétique : c'est mon garde-fou. Une fiche sans service est presque
toujours un compte technique déguisé en humain.

### Écrire, mettre à jour, supprimer

Le robot doit être **idempotent** : lancé deux fois de suite, il produit le même résultat. Pour chaque boîte, je lis
les contacts qui portent la catégorie, je les compare à l'annuaire, puis je crée, je mets à jour ou je supprime. La
catégorie sert de clé de propriété : tout ce qui la porte appartient au robot, tout le reste ne le regarde pas.

```powershell title="Synchroniser une boîte"
$categorie = 'ANNUAIRE-SOCIETE'
$existants = Get-MgUserContact -UserId $boite -All |
    Where-Object { $_.Categories -contains $categorie }

foreach ($p in $annuaire) {
    if ($p.Mail -eq $boite) { continue }   # on ne se met pas dans ses propres contacts

    $fiche = @{
        GivenName     = $p.GivenName
        Surname       = $p.Surname
        DisplayName   = $p.DisplayName
        JobTitle      = $p.JobTitle
        Department    = $p.Department
        MobilePhone   = $p.MobilePhone
        BusinessPhones= $p.BusinessPhones
        EmailAddresses= @(@{ Address = $p.Mail; Name = $p.DisplayName })
        Categories    = @($categorie)
    }

    $cible = $existants | Where-Object { $_.EmailAddresses.Address -eq $p.Mail }
    if ($cible) {
        Update-MgUserContact -UserId $boite -ContactId $cible.Id -BodyParameter $fiche
    } else {
        New-MgUserContact -UserId $boite -BodyParameter $fiche
    }
}

# départs : ce qui porte la catégorie mais n'est plus dans l'annuaire
$existants |
    Where-Object { $_.EmailAddresses.Address -notin $annuaire.Mail } |
    ForEach-Object { Remove-MgUserContact -UserId $boite -ContactId $_.Id }
```

:::caution
Graph limite le débit. Sur une centaine de boîtes multipliées par une centaine de fiches, vous rencontrerez des
réponses `429`. Ne les ignorez pas et ne bouclez pas plus vite : lisez l'en-tête `Retry-After` et attendez le délai
demandé. C'est aussi la raison pour laquelle ce travail tourne la nuit et pas à 9 h 30.
:::

### Communiquer avant, pas après

Le seul risque réel de ce projet n'est pas technique : c'est le mardi matin où cent personnes découvrent cent
nouvelles fiches dans leur téléphone sans avoir rien demandé. J'ai donc envoyé un message la veille, court, qui disait
ce qui allait apparaître, quand, et surtout les deux règles qui produisent des tickets :

- les **modifications manuelles** d'une fiche du robot seront écrasées à la synchronisation suivante ;
- les **contacts personnels** ne sont pas touchés, et ne le seront jamais.

Le message expliquait aussi que les arrivées, changements de service et départs se propagent tout seuls dans la nuit,
et que notre petit robot carbure au café virtuel. L'humour n'est pas décoratif : un message lu produit deux fois moins
d'appels qu'un message ignoré.

## Ce que ça donne

Sur les mobiles, un appel interne affiche désormais un nom, un service et une fonction. La recherche fonctionne dans
le composeur, dans l'application de messagerie et dans les SMS, sans ouvrir Outlook. Les arrivées apparaissent le
lendemain de la création du compte, les départs disparaissent la nuit suivant la désactivation — sans que personne
n'ait à me le demander.

Effet secondaire inattendu, et le plus utile de tous : la qualité de l'annuaire est devenue visible. Une fonction mal
renseignée dans Entra ID ne dort plus dans une console d'administration, elle s'affiche sur le téléphone de tout le
monde. Les corrections sont arrivées d'elles-mêmes, remontées par les intéressés, ce que trois relances aux RH
n'avaient jamais obtenu.

## Limites et suite

- **La synchronisation est à sens unique**, et c'est assumé. Une fiche modifiée à la main revient à l'état de
  l'annuaire la nuit suivante. C'est la première question posée par les utilisateurs, elle doit être dans le message
  d'annonce et dans la réponse type du support.
- **Tout repose sur la catégorie.** Si quelqu'un la retire d'une fiche, le robot perd la propriété de ce contact : il
  en recrée un et laisse l'orphelin derrière lui. En contrepartie, elle rend le retrait total trivial — supprimer tous
  les contacts qui la portent, et il ne reste rien de mon passage.
- **Les fiches n'ont pas de photo.** Graph sait aller la chercher, mais le volume et le débit m'ont fait remettre ce
  point à plus tard.
- **La source doit être tenue.** Ce robot ne crée aucune donnée : il diffuse celle d'Entra ID, défauts compris.
- **La suite** : étendre proprement aux autres sites, avec une catégorie par site pour que chacun puisse choisir ce
  qu'il reçoit, et un mode « simulation » qui écrit le différentiel dans le journal sans rien modifier. Cette dernière
  option aurait dû être la première écrite.

## Pour aller plus loin

- [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/),
  parce que la moitié de ce projet est un message d'annonce.
- [GitLab CI : synchroniser un partage SMB vers un dépôt Git](/docs/automatisation/gitlab-ci-synchroniser-un-partage-smb-vers-un-depot-git/),
  autre robot nocturne, même principe d'idempotence.
- [La check-list IT d'arrivée d'un nouveau collaborateur](/docs/dsi/checklist-dintegration-dun-nouveau-collaborateur/),
  puisque c'est elle qui alimente l'annuaire en amont.

<!-- source : communication interne « Vos collègues arrivent dans vos contacts Outlook », 2026-07-28 -->

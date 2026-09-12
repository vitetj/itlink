---
title: "Jeton Entra ID corrompu : réinitialiser proprement le cache d'authentification d'un poste"
description: "Outlook qui redemande le mot de passe en boucle, Teams bloqué au démarrage : purger dans le bon ordre le cache du broker Entra, IdentityCache et OneAuth, puis vérifier que le jeton revient."
published: 2025-11-18
category: microsoft-365
tags: [entra-id, authentification, outlook, teams, windows, depannage]
level: intermédiaire
status: à jour
featured: true
sidebar:
  label: "Réinitialiser le cache d'authentification…"
---

Outlook qui redemande le mot de passe toutes les dix minutes, Teams qui tourne indéfiniment sur son écran de
démarrage, une fenêtre de connexion Microsoft qui se rouvre dès qu'on la ferme. Trois symptômes différents,
une seule cause dans la grande majorité des cas : le poste détient un jeton d'authentification Entra ID en
mauvais état, et il s'obstine à le réutiliser.

Le réflexe habituel — réinitialiser le mot de passe, refaire le profil Outlook, réinstaller Office — ne sert
à rien ici, parce que Windows ne stocke pas le mot de passe de l'utilisateur. Il stocke des jetons. Un jeton,
c'est le bracelet qu'on vous pose au poignet à l'entrée d'un festival : tant qu'il est valide, personne ne
vous redemande votre billet. S'il est déchiré, le vigile ne vous laisse pas entrer, et il ne vous propose pas
non plus d'en racheter un. Il faut retourner à la billetterie. La procédure ci-dessous, c'est le passage par
la billetterie.

## Ce que Windows stocke à la place du mot de passe

Trois caches locaux, plus un vestige, se partagent le travail. Les connaître évite de supprimer au hasard.

| Emplacement | Ce qu'il contient | Qui s'en sert |
|---|---|---|
| `%LOCALAPPDATA%\Packages\Microsoft.AAD.BrokerPlugin_cw5n1h2txyewy` | le cache du broker d'authentification Windows (WAM) et la partie utilisateur du jeton principal | Windows, Edge, tout ce qui passe par « Comptes professionnels » |
| `%LOCALAPPDATA%\Microsoft\IdentityCache` | la liste des identités connues du poste et leurs métadonnées | Office, OneDrive, Teams |
| `%LOCALAPPDATA%\Microsoft\OneAuth` | la pile d'authentification commune aux applications Microsoft récentes, un fichier par compte | Outlook, Teams, applications Office |
| Gestionnaire d'identification Windows | des entrées héritées, souvent nommées `MicrosoftOffice16_Data:*` | Outlook classique |

Ces emplacements sont censés se tenir à jour seuls. Ils divergent quand quelque chose se passe pendant que le
poste ne regardait pas : mot de passe changé alors que la machine était éteinte, jeton révoqué côté tenant,
compte invité ajouté par erreur, licence déplacée, migration de boîte. À partir de là, les applications lisent
une identité qui n'existe plus côté Entra et bouclent poliment.

## Prérequis

- Un compte administrateur local sur le poste.
- **La session de l'utilisateur concerné.** Tous ces caches sont dans son profil : les purger depuis un autre
  compte ne corrige rien.
- Une dizaine de minutes sans travail en cours, parce que toutes les applications Microsoft vont se refermer
  et redemander une connexion.
- Le mot de passe et le second facteur de l'utilisateur sous la main. C'est le point sur lequel une
  intervention capote une fois sur trois : on purge, et personne ne connaît le mot de passe.

:::caution
Dans **Paramètres > Comptes > Accès professionnel ou scolaire**, ne confondez pas deux choses très
différentes. Une ligne « Connecté à … » ajoutée par l'utilisateur pour accéder à Microsoft 365 se déconnecte
sans conséquence. Une ligne qui correspond à la **jonction Entra de l'appareil** (poste joint ou en jonction
hybride) ne doit pas être retirée : vous sortiriez le poste du tenant, avec la gestion Intune et,
potentiellement, la clé BitLocker séquestrée qui va avec. En cas de doute, exécutez `dsregcmd /status` avant
de toucher à quoi que ce soit.
:::

## Étape 1 : fermer réellement les applications Microsoft

Ce n'est pas une formalité, c'est ce qui fait échouer la procédure quand on la saute. Un processus encore
vivant verrouille les dossiers, et surtout il réécrit le cache dans la seconde qui suit sa suppression. Vous
croyez avoir purgé, vous n'avez rien purgé.

Fermez Outlook, Teams, OneDrive, Word, Excel, PowerPoint, puis vérifiez dans le Gestionnaire des tâches qu'il
ne reste rien. Plus rapide en PowerShell :

```powershell title="Vérifier qu'aucun client Microsoft ne tourne encore"
Get-Process |
  Where-Object { $_.Name -match 'OUTLOOK|ms-teams|Teams|OneDrive|WINWORD|EXCEL|POWERPNT|msedgewebview2' } |
  Select-Object Name, Id, StartTime
```

S'il reste des lignes, arrêtez les processus concernés. La console WebView2 (`msedgewebview2`) est celle qu'on
oublie le plus souvent : c'est elle qui affiche les fenêtres de connexion Microsoft dans les applications.

## Étape 2 : déconnecter le compte professionnel

**Paramètres > Comptes > Accès professionnel ou scolaire**, sélectionnez la ligne du compte de l'utilisateur,
puis **Déconnecter**. Le compte Windows local n'est pas touché : vous retirez uniquement le lien entre la
session et le tenant.

## Étape 3 : mettre les caches de côté

Renommez plutôt que supprimer. Ça coûte le même temps et ça vous laisse une marche arrière si le poste se met
à mal se comporter pour une raison sans rapport.

```powershell title="Renommer les trois caches d'authentification"
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$chemins = @(
  "$env:LOCALAPPDATA\Packages\Microsoft.AAD.BrokerPlugin_cw5n1h2txyewy",
  "$env:LOCALAPPDATA\Microsoft\IdentityCache",
  "$env:LOCALAPPDATA\Microsoft\OneAuth"
)
foreach ($chemin in $chemins) {
  if (Test-Path $chemin) {
    Rename-Item -Path $chemin -NewName ((Split-Path $chemin -Leaf) + ".old-$stamp") -Force
    Write-Host "Mis de côté : $chemin"
  }
}
```

Si un renommage échoue avec « accès refusé », c'est qu'un processus tient encore le dossier : retournez à
l'étape 1. Le dossier `Microsoft.AAD.BrokerPlugin_cw5n1h2txyewy` appartient à un paquet système ; Windows le
recrée au prochain besoin d'authentification, vous n'avez rien à réinstaller.

## Étape 4 : le cas des comptes fantômes dans OneAuth

Quand le problème ne touche qu'Office — Word et Excel affichent un compte qui n'est plus le bon, ou refusent
d'activer la licence alors que Teams fonctionne — il reste souvent une association résiduelle dans OneAuth.
Le dossier `%LOCALAPPDATA%\Microsoft\OneAuth\accounts` contient un fichier par compte, nommé avec un GUID.

Ouvrez-les dans un éditeur de texte et cherchez `account_hints` : c'est là que vous lirez l'adresse à laquelle
le fichier correspond. Sur les fichiers qui ne sont **pas** le compte de connexion attendu, trouvez l'entrée
`association_status` et passez l'application concernée de `associated` à `disassociated` :

```json title="Avant / après, sur un fichier de compte qui n'est pas le bon"
"association_status": "{\"com.microsoft.Office\":\"associated\",\"com.microsoft.Outlook\":\"associated\"}"
"association_status": "{\"com.microsoft.Office\":\"disassociated\",\"com.microsoft.Outlook\":\"associated\"}"
```

Enregistrez, relancez une application Office, reconnectez-vous. Si ça ne suffit pas, le dossier `OneAuth`
entier part avec les autres à l'étape 3 : c'est moins chirurgical, mais c'est efficace.

## Étape 5 : redémarrer, reconnecter, vérifier

Redémarrez le poste. Ce n'est pas une superstition : les jetons résident aussi en mémoire, dans des processus
que vous n'arrêterez pas proprement à la main.

Après redémarrage, retournez dans **Paramètres > Comptes > Accès professionnel ou scolaire**, cliquez sur
**Connecter**, saisissez l'adresse professionnelle, le mot de passe, le second facteur. Ouvrez ensuite Outlook,
puis Teams, et laissez-les finir leur première synchronisation avant de conclure.

La vérification objective se fait en ligne de commande, dans la session de l'utilisateur :

```cmd title="Le poste a-t-il retrouvé un jeton ?"
dsregcmd /status
```

Deux lignes vous intéressent. `AzureAdPrt : YES` dans le bloc *SSO State* signifie que le poste a obtenu un
jeton principal : c'est lui qui évite de ressaisir le mot de passe dans chaque application. Et, plus haut,
`AzureAdJoined` / `DomainJoined` vous rappellent dans quel état de jonction se trouve la machine.

:::note
Juste après une ouverture de session, `AzureAdPrt` peut encore être à `NO` le temps que le jeton soit émis.
Verrouillez et déverrouillez la session, puis relancez la commande avant de vous alarmer.
:::

## Quand ce n'est pas le cache

La purge ne répare que ce qui est local. Si les symptômes reviennent dans l'heure, cherchez ailleurs :

- **Le poste est dans un mauvais état de jonction**, ou présent deux fois dans le tenant. Le cache sera
  corrompu de nouveau à chaque cycle. C'est le vrai problème, pas le symptôme.
- **Une stratégie d'accès conditionnel refuse l'appareil** (non conforme, non géré, hors zone autorisée).
  Dans ce cas les journaux de connexion Entra sont beaucoup plus bavards que le poste.
- **Le trafic vers les points de terminaison d'authentification Microsoft est intercepté** par un proxy, un
  agent SASE ou une inspection TLS. Le broker WAM supporte très mal qu'on lui change son certificat en route.
- **Le compte est invité dans un autre tenant** et les deux se disputent la session.

## Pour aller plus loin

- [Diagnostiquer l'état de jonction Entra d'un poste Windows](/docs/microsoft-365/diagnostiquer-jonction-entra-dsregcmd/),
  à faire avant cette procédure si le poste est censé être en jonction hybride.
- [Accès invité Entra : erreur 53003 et conflit de tenants](/docs/microsoft-365/acces-invite-entra-erreur-53003-et-conflit-de-tenants/).
- [DNS interne cassé par un client VPN ou un agent SASE](/docs/reseau/dns-interne-casse-par-un-client-vpn-ou-un-agent-sase/),
  pour la piste réseau quand la purge ne tient pas.
- Documentation Microsoft : [Résoudre les problèmes d'authentification des applications Microsoft 365](https://learn.microsoft.com/microsoft-365/troubleshoot/authentication/automatic-authentication-fails).

<!-- source : procédures internes « Bug compte Microsoft » et « Office bug compte », export du centre de documentation -->

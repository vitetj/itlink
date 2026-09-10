---
title: "Rendre la double authentification Microsoft obligatoire avec les codes TOTP dans Vaultwarden"
description: "Imposer le MFA Microsoft 365 à deux cents utilisateurs sans smartphone professionnel : le secret TOTP dans le coffre Vaultwarden, la remise à zéro côté admin, le portail de secours et Vaultwarden Send."
published: 2025-01-24
category: cybersecurite
tags: [mfa, totp, vaultwarden, bitwarden, microsoft-365, entra-id]
level: intermédiaire
status: à jour
featured: false
tested_on: [Microsoft 365 Business, Vaultwarden, Cloudron]
sidebar:
  label: "Rendre la double authentification…"
---

Janvier 2025, le tenant Microsoft 365 vient d'être créé et les boîtes aux lettres n'ont pas encore quitté le
serveur Exchange interne. C'est le bon moment pour imposer la double authentification : avant que la messagerie
ne soit accessible depuis n'importe quel navigateur du monde, pas après. Le problème, c'est le facteur humain.
Environ deux cents comptes, dont une bonne partie sans smartphone professionnel, et une règle maison que je ne
négocie pas : on n'utilise pas son téléphone perso au boulot. Microsoft Authenticator sur le téléphone personnel
de chacun n'était donc pas une option.

Ce qui existait déjà, en revanche, c'était un gestionnaire de mots de passe : Vaultwarden, auto-hébergé sur ma
plateforme Cloudron, avec les clients Bitwarden sur tous les postes. Or un client Bitwarden sait générer des
codes TOTP. La décision a tenu en une phrase pour les utilisateurs : « c'est comme votre banque, un mot de passe
et un code qui change ; nous ne sommes plus dans les années 90 ».

## Pourquoi le coffre, et ce que ça vaut vraiment

Le code à six chiffres que Microsoft attend n'a rien de propriétaire : c'est du TOTP standard, le même mécanisme
que n'importe quelle application d'authentification. Microsoft l'expose derrière l'option « je veux utiliser une
autre application d'authentification ». Bitwarden stocke la clé secrète dans la fiche du compte et calcule le
code à la demande ; sur Vaultwarden, cette fonction est disponible sans abonnement.

Soyons honnêtes sur la limite : mot de passe et second facteur dans le même coffre, c'est un seul endroit à
compromettre. C'est un compromis assumé, pas une solution parfaite. Il tient à trois conditions : un mot de passe
maître du coffre solide et **différent** du mot de passe Windows, une double authentification sur le coffre
lui-même, et un verrouillage automatique court sur les postes. Face à l'alternative réelle, qui était de ne pas
avoir de MFA du tout parce que personne n'a de téléphone pro, le choix était vite fait.

## Prérequis

- Vaultwarden joignable depuis tous les postes, chaque utilisateur disposant déjà d'un compte et de l'extension
  navigateur ou du client de bureau.
- Un compte administrateur Entra ID, et de quoi imposer le MFA : les **paramètres de sécurité par défaut**
  suffisent avec Business Standard ; l'**accès conditionnel** demande Entra ID P1, inclus dans Business Premium.
- Un compte d'urgence (« break glass ») exclu de la règle, avec un mot de passe long rangé hors du tenant.
- Un tutoriel PDF, pas à pas avec captures, et une date butoir. Sans les deux, ça ne marche pas.

## Imposer le MFA côté administrateur

Avec les paramètres de sécurité par défaut, tout se règle en un clic dans le centre d'administration Entra :
*Identité → Vue d'ensemble → Propriétés → Gérer les paramètres de sécurité par défaut*. Chaque utilisateur est
alors invité à enregistrer une méthode ; il peut reporter pendant quatorze jours, après quoi la connexion est
bloquée tant que ce n'est pas fait.

Avec l'accès conditionnel, créez une stratégie à partir du modèle « Exiger l'authentification multifacteur pour
tous les utilisateurs », excluez le compte d'urgence, et passez-la en **mode rapport seul** sur un groupe pilote
avant de l'activer pour tout le monde. L'avantage sur les paramètres par défaut : vous choisissez la date, les
groupes, et vous pouvez exempter temporairement un service qui est en plein déplacement.

Dans les deux cas, la communication fait le gros du travail. Mon mail, en français et en anglais pour la
filiale, disait en substance : voici le tutoriel, voici la date, passé cette date votre compte sera bloqué.
C'est sec, mais c'est ce qui a fait bouger les gens qui « n'avaient pas eu le temps ».

## Enregistrer le secret TOTP dans le coffre, côté utilisateur

C'est la procédure du tutoriel, telle qu'elle a été distribuée.

1. Ouvrir `https://mysignins.microsoft.com/security-info` et se connecter avec son **adresse e-mail** et son
   **mot de passe Windows**.
2. Cliquer sur **Ajouter une méthode de connexion**, choisir **Application d'authentification**.
3. Sur l'écran qui propose Microsoft Authenticator, cliquer sur **« Je veux utiliser une autre application
   d'authentification »**, puis sur **« Impossible de scanner l'image ? »** pour afficher la **clé secrète**.
4. Dans Bitwarden, ouvrir (ou créer) la fiche « Microsoft », coller la clé dans le champ **Clé
   d'authentification (TOTP)**, enregistrer. Un code à six chiffres apparaît dans la fiche et change toutes les
   trente secondes.
5. Saisir ce code sur la page Microsoft pour terminer l'enregistrement.

À chaque connexion ensuite : ouvrir la fiche dans Bitwarden, copier le code, le coller. Avec le remplissage
automatique, l'extension copie même le code dans le presse-papiers toute seule.

Les confusions qui reviennent à chaque fois, à traiter dans le tutoriel avant qu'elles n'arrivent au support :

| L'utilisateur mélange… | …avec | La phrase qui règle le problème |
| --- | --- | --- |
| son identifiant | son adresse e-mail | « depuis la migration, votre identifiant **est** votre adresse e-mail » |
| son mot de passe Windows | le mot de passe maître Bitwarden | « Windows ouvre le PC, Bitwarden ouvre le coffre : deux mots de passe différents » |
| le code Bitwarden | le code PIN Windows | « le code à six chiffres change toutes les 30 secondes, le PIN jamais » |

:::tip
Certains cliquent sur « Ignorer pour l'instant » à l'écran « Protéger votre compte » et pensent avoir terminé.
Le lien direct vers la page `security-info` dans un mail de rappel individuel les remet sur les rails sans
appel téléphonique.
:::

## Réinitialiser le MFA d'un utilisateur

Coffre perdu, secret effacé, poste réinstallé sans sauvegarde du coffre : l'utilisateur ne peut plus produire
de code. Côté administrateur, dans le centre Entra, *Utilisateurs → l'utilisateur → Méthodes d'authentification*
: supprimer la méthode « Jeton OATH logiciel » puis cliquer sur **Exiger une réinscription à l'authentification
multifacteur**. À sa prochaine connexion, l'utilisateur refait la procédure ci-dessus et enregistre le nouveau
secret dans sa fiche Bitwarden, en écrasant l'ancien.

La même chose en PowerShell, utile quand il faut le faire pour plusieurs personnes :

```powershell title="Lister puis supprimer la méthode TOTP d'un utilisateur"
Connect-MgGraph -Scopes "UserAuthenticationMethod.ReadWrite.All"
$upn = "prenom.nom@example.com"
Get-MgUserAuthenticationMethod -UserId $upn | Format-Table Id, AdditionalProperties
$oath = Get-MgUserAuthenticationSoftwareOathMethod -UserId $upn
Remove-MgUserAuthenticationSoftwareOathMethod -UserId $upn -SoftwareOathAuthenticationMethodId $oath.Id
```

:::caution
Vérifiez l'identité de la personne qui demande la remise à zéro, par un canal que vous maîtrisez (appel sur son
poste, passage au bureau). Une réinitialisation MFA accordée sur un simple mail, c'est exactement ce qu'un
attaquant vient chercher.
:::

## Le portail TOTP de secours

Il reste les cas sans PC : un commercial en déplacement qui veut lire son webmail depuis un poste d'hôtel, ou un
utilisateur dont le poste est en réparation. Pour eux, un petit portail OTP interne, hébergé sur la même
plateforme Cloudron et accessible en SSO (OpenID) depuis l'intranet, affiche le code Microsoft. La procédure
tient en deux lignes : ouvrir `outlook.office.com/mail` avec son adresse e-mail et son mot de passe Windows,
puis aller chercher le code sur le portail interne. Si la session intranet est déjà ouverte, le portail se
connecte tout seul ; sinon il demande l'identifiant court.

C'est un secours, pas la voie normale : ce portail est joignable depuis Internet, ce qui impose de le protéger
au moins aussi sérieusement que le coffre.

## Partager un secret sans le mettre dans un mail : Vaultwarden Send

Le MFA ne sert à rien si les mots de passe continuent de circuler en clair. Les clés de licence d'un logiciel
d'automatisme envoyées dans un mail « pour que tout le monde les ait », un compte prestataire dont le mot de
passe suit dans le corps du message : ce sont des habitudes à casser en même temps que l'on impose le MFA. Je
le dis d'autant plus facilement que j'ai moi-même envoyé un mot de passe Wi-Fi en clair par mail un jour ;
c'est l'erreur à ne pas reproduire.

Bitwarden Send fait le travail. Dans le coffre : **Send → Nouveau Send → Texte**, coller le secret, fixer une
**date d'expiration** et un **nombre maximal d'ouvertures**, éventuellement un mot de passe d'accès, puis
envoyer uniquement le lien. Le destinataire l'ouvre, le lien meurt. Rien à retrouver dans un dossier « Éléments
envoyés » deux ans plus tard.

```bash title="La même chose depuis la ligne de commande Bitwarden"
bw send -n "Compte VPN prestataire" -d 1 -a 2 --hidden "identifiant : vpn-presta / mot de passe : ..."
```

Pour les secrets qu'une équipe partage durablement (licences, comptes techniques), un Send n'est pas adapté : il
faut une **collection** dans l'organisation Bitwarden, avec un groupe qui y a accès. Le secret vit dans le
coffre, les gens y accèdent depuis leur propre compte, et quand quelqu'un part, on retire le droit au lieu de
changer tous les mots de passe.

## Pour aller plus loin

- Le mail qui fait vraiment enregistrer le MFA :
  [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/).
- Pourquoi l'activation d'Office échoue tant que le MFA n'est pas enregistré :
  [Déployer Microsoft 365 Apps avec WAPT](/docs/automatisation/deployer-microsoft-365-apps-avec-wapt/).
- La plateforme qui héberge Vaultwarden et le portail OTP :
  [GLPI 11 packagé pour Cloudron](/lab/glpi-sur-cloudron/).

<!-- source : mails « URGENT Activation double authentification obligatoire » (2025-01-22), « Mise en place 2FA vérification Microsoft » (2025-01-24) et « Compte vault » (2025-02-24) -->

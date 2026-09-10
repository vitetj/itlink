---
title: "Diagnostiquer l'état de jonction Entra d'un poste Windows : inscrit, joint ou hybride"
description: "Inscrit, joint ou hybride : lire dsregcmd /status, repérer les doublons dans Entra et corriger la case Office qui enregistre un poste au lieu de le laisser en jonction hybride."
published: 2025-02-03
updated: 2025-06-16
category: microsoft-365
tags: [entra-id, intune, dsregcmd, jonction-hybride, windows-11]
level: intermédiaire
status: à jour
featured: true
tested_on: [Windows 11 Business 24H2, Microsoft 365 Business Premium, Entra Connect, ADFS + Web Application Proxy]
---

Janvier 2025. Je viens de basculer une partie des licences vers Microsoft 365 Business Premium pour enfin
obtenir Intune. Les postes apparaissent bien dans Entra, la licence est affectée, et pourtant Intune ne voit
rien. Après quelques échanges avec le TAM Microsoft 365 de mon CSP, le diagnostic tombe : mes PC sont
« Inscrits à Microsoft Entra » alors qu'ils devraient être en « Jonction hybride ». Deux mots qui se
ressemblent, deux réalités très différentes. Tant que vous ne savez pas dans quel état est un poste, tout
dépannage d'enrôlement Intune revient à tirer au sort.

## Les trois états, et pourquoi Intune s'en soucie

Entra connaît trois façons pour un appareil Windows d'exister dans le tenant. L'analogie qui m'a aidé : le
badge d'accès à l'usine.

| État dans Entra | Ce que voit `dsregcmd` | Ce que ça veut dire | Géré par Intune ? |
|---|---|---|---|
| Inscrit (*registered*) | `AzureAdJoined : NO`, `WorkplaceJoined : YES` | Badge visiteur : le poste est connu, un compte pro y est ajouté, mais l'ordinateur n'appartient pas au tenant | Non |
| Joint (*Entra joined*) | `AzureAdJoined : YES`, `DomainJoined : NO` | Badge salarié cloud : le poste appartient au tenant, sans domaine Active Directory | Oui, si l'enrôlement automatique est configuré |
| Jonction hybride (*hybrid joined*) | `AzureAdJoined : YES`, `DomainJoined : YES` | Double badge : le poste est dans l'AD local **et** dans Entra, via Entra Connect | Oui, si l'enrôlement automatique est configuré |

Le piège est là : un poste « Inscrit » possède une licence, apparaît dans la console, et n'est pourtant pas
géré. Intune n'en fera rien. Dans une PME avec un Active Directory, un serveur ADFS et Entra Connect, l'état
cible est presque toujours la jonction hybride.

## Prérequis

- Un tenant hybride fonctionnel : Entra Connect synchronise les objets ordinateur, et la stratégie de jonction
  hybride (GPO ou point de connexion de service) est en place.
- Un compte administrateur local sur le poste à diagnostiquer.
- Un accès au centre d'administration Microsoft Entra.
- Pour la partie Intune : une licence qui l'inclut. Microsoft 365 Business **Standard** ne suffit pas, il faut
  Business **Premium**. Je l'ai appris en comptant onze postes à corriger, donc onze utilisateurs à passer en
  Premium.

## Lire la sortie de dsregcmd /status

L'outil est fourni avec Windows, aucune installation. Ouvrez une invite de commandes avec le compte de
l'utilisateur (pas un compte administrateur différent, sinon la partie « utilisateur » de la sortie ne
correspond pas à la bonne session) :

```cmd title="État de jonction du poste"
dsregcmd /status
```

La sortie est longue. Trois blocs comptent.

### Le bloc « Device State »

C'est lui qui donne l'état réel du poste. Comparez les trois lignes avec le tableau ci-dessus :

```text title="Extrait attendu pour une jonction hybride"
+----------------------------------------------------------------------+
| Device State                                                         |
+----------------------------------------------------------------------+
             AzureAdJoined : YES
          EnterpriseJoined : NO
              DomainJoined : YES
                DomainName : EXAMPLE
```

Si vous lisez `AzureAdJoined : NO` sur un poste qui est pourtant dans le domaine, vous avez votre réponse :
la jonction hybride n'a pas eu lieu. Descendez ensuite jusqu'au bloc « User State » : une ligne
`WorkplaceJoined : YES` confirme que le poste est seulement « Inscrit » par le compte de l'utilisateur.

### Le bloc « Device Details »

Vérifiez `TpmProtected : YES`. La clé de l'appareil doit être protégée par le TPM ; sinon, la jonction reste
possible mais la posture de sécurité en pâtit, et certaines stratégies d'accès conditionnel le refuseront.

### Le bloc « SSO State »

La ligne `AzureAdPrt : YES` indique que le poste détient un *Primary Refresh Token*. C'est ce jeton qui permet
aux applications de bureau (Outlook, Teams, OneDrive) de s'authentifier sans redemander le mot de passe.
Sans PRT, vous aurez le symptôme classique : le SSO fonctionne dans le navigateur, mais Outlook redemande
les identifiants à chaque ouverture.

:::note
Un poste peut être en jonction hybride correcte et pourtant afficher `AzureAdPrt : NO` juste après une
ouverture de session. Le PRT est obtenu à la connexion de l'utilisateur ; verrouillez et déverrouillez la
session, ou fermez-la et rouvrez-la, avant de conclure.
:::

## Comparer avec le centre d'administration Entra

Le poste vous a dit ce qu'il croit être. Vérifiez maintenant ce que le tenant en pense. Dans le centre
d'administration Microsoft Entra : **Appareils > Tous les appareils**, puis cherchez le nom du poste et
regardez la colonne **Type de jointure**.

Le cas qui m'a coûté le plus de temps : un même PC présent **deux fois**. Une ligne « Inscrit à Microsoft
Entra » et une ligne « Jonction hybride Microsoft Entra ». Ce n'est pas cosmétique. L'objet enregistré a été
créé par l'utilisateur, l'objet hybride par Entra Connect, et les deux se marchent dessus : Intune ne sait
pas lequel enrôler, et le comportement devient « aléatoire », comme je l'ai écrit à l'époque au TAM. C'est le
conflit à résoudre avant toute autre chose.

## Corriger un poste enregistré par erreur

D'où vient l'enregistrement parasite ? De la case la plus mal nommée de Microsoft. À la première activation
d'Office, Windows affiche une fenêtre « Rester connecté à toutes vos applications » avec la case **« Autoriser
mon organisation à gérer mon appareil »** cochée par défaut. L'utilisateur clique sur OK, comme tout le monde.
Résultat : le poste est enregistré dans Entra sous son compte, alors qu'il est déjà dans le domaine et attend
sa jonction hybride. L'objet « Inscrit » prend la place.

Voici la procédure que j'ai appliquée, poste par poste.

### Déconnecter le compte professionnel sur le poste

Sur le PC : **Paramètres > Comptes > Accès professionnel ou scolaire**. Sélectionnez le compte professionnel
listé (celui qui a créé l'enregistrement), puis **Déconnecter**. Le compte Windows de l'utilisateur, lui,
reste intact : on retire uniquement le lien « appareil enregistré ».

### Supprimer le doublon dans Entra

Dans **Appareils > Tous les appareils**, supprimez l'objet dont le type de jointure est « Inscrit à Microsoft
Entra ». Gardez l'objet « Jonction hybride ». Si seul l'objet inscrit existe, supprimez-le quand même : la
jonction hybride va le recréer proprement.

:::caution
Avant de supprimer un objet appareil, vérifiez qu'aucune clé de récupération BitLocker n'y est séquestrée
sans copie ailleurs. J'ai perdu une clé de cette façon quelques mois plus tard ; la procédure complète est
dans [BitLocker : ne jamais perdre une clé de récupération](/docs/microsoft-365/cle-bitlocker-device-entra-supprime/).
:::

### Se reconnecter à Office sans cocher la case

Rouvrez une application Office et connectez-vous. Quand la fenêtre « Rester connecté à toutes vos
applications » réapparaît, **décochez « Autoriser mon organisation à gérer mon appareil »**, ou cliquez sur
**« Non, se connecter à cette application uniquement »**. Le SSO fonctionnera quand même : sur un poste en
jonction hybride, c'est le PRT du poste qui le fournit, pas cet enregistrement.

### Forcer la synchronisation et vérifier

Sur le serveur Entra Connect, lancez un cycle delta pour que l'objet ordinateur remonte sans attendre les
trente minutes du planificateur :

```powershell title="Sur le serveur Entra Connect"
Start-ADSyncSyncCycle -PolicyType Delta
```

Puis, sur le poste, relancez `dsregcmd /status` et attendez `AzureAdJoined : YES` et `DomainJoined : YES`.

### Laisser la jonction hybride refaire son travail

La jonction hybride est déclenchée par une tâche planifiée que Windows crée à partir de la GPO :
`\Microsoft\Windows\Workplace Join\Automatic-Device-Join`. Elle s'exécute à l'ouverture de session. Pour ne
pas attendre, lancez-la à la main depuis une invite administrateur :

```cmd title="Forcer la tentative de jonction hybride"
schtasks /run /tn "\Microsoft\Windows\Workplace Join\Automatic-Device-Join"
```

En cas d'échec, le journal `Applications and Services Logs > Microsoft > Windows > User Device Registration >
Admin` donne le code d'erreur exact. Chez moi, une fois les doublons nettoyés, la jonction s'est refaite seule
au cycle suivant.

## Les pièges rencontrés en chemin

- **SSO navigateur OK, applications de bureau KO.** Si Edge se connecte tout seul mais qu'Outlook redemande
  le mot de passe, suspectez d'abord un conflit d'état (poste inscrit et hybride en même temps) ou l'absence
  de PRT, avant d'accuser le MFA.
- **Licence affectée, poste invisible dans Intune.** Vérifiez le type de jointure avant d'ouvrir un ticket. Un
  poste « Inscrit » ne sera jamais géré, quelle que soit la licence.
- **Comportement « aléatoire ».** Ce mot dans un ticket est presque toujours le signe d'objets en double.
  Nettoyez d'abord, diagnostiquez ensuite.
- **Une jonction hybride ne fait pas un enrôlement Intune.** Ce sont deux étapes. Une fois l'état corrigé, il
  reste à faire fonctionner l'enrôlement automatique, avec son lot d'erreurs (le code 80192EE7 m'a occupé
  plusieurs semaines).

## Pour aller plus loin

- [Intune : erreur d'enrôlement 80192EE7 et Microsoft Store bloqué](/docs/microsoft-365/intune-erreur-80192ee7-et-microsoft-store-bloque/),
  la suite logique une fois l'état du poste corrigé.
- [BitLocker : ne jamais perdre une clé de récupération, même après la suppression du device Entra](/docs/microsoft-365/cle-bitlocker-device-entra-supprime/).
- [Tier 0 : contrôleurs de domaine et VM IAM](/docs/architecture/tier-0-controleurs-de-domaine-et-vm-iam/),
  pour situer Entra Connect et ADFS dans l'architecture.
- Documentation Microsoft : [Troubleshoot Microsoft Entra hybrid joined devices](https://learn.microsoft.com/entra/identity/devices/troubleshoot-hybrid-join-windows-current).

<!-- source : mails « Offre Working Together - TAM », 2025-01-28/30 et « Problème Intune Windows store bloqué », 2025-06-13 -->

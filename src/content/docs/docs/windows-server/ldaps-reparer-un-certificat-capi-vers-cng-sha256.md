---
title: "Réparer l'authentification LDAPS d'un contrôleur de domaine : du certificat CAPI legacy au CNG SHA-256"
description: "Un IPBX Linux refuse le LDAPS d'un DC : certificat auto-enrôlé en CAPI/SHA-1. Modèle Kerberos Authentication en CNG, purge des anciens certificats, puis reconstruction de la CA qui signait encore en SHA-1."
published: 2026-02-18
category: windows-server
tags: [active-directory, ldaps, ad-cs, certificats, schannel, mitel]
level: avancé
status: à jour
featured: true
tested_on: [Windows Server 2022, Windows Server 2025, AD CS, Mitel MiCollab, Rocky Linux]
---

Un IPBX Mitel MiCollab, hébergé sur Rocky Linux, synchronise ses utilisateurs depuis l'Active Directory en LDAPS.
Un matin, après un renouvellement de certificat côté contrôleur de domaine, la synchronisation tombe en « échec
d'authentification ». Rien n'a changé sur l'IPBX, le compte de service est valide, le port 636 répond. Le coupable
est ailleurs : le DC avait plusieurs certificats dans son magasin ordinateur, dont un émis avec le fournisseur
cryptographique historique « Microsoft RSA SChannel Cryptographic Provider », autrement dit CAPI, signé en SHA-1.
Windows choisit tout seul le certificat qu'il présente en LDAPS, et il avait pris celui-là. Le client Linux, lui,
exige du SHA-256, une clé d'au moins 2048 bits, un fournisseur CNG et l'EKU *Server Authentication*. Il a donc
raccroché.

C'est un point aveugle classique. Un contrôleur de domaine auto-enrôle ses certificats en silence, personne ne les
regarde tant que les postes Windows fonctionnent, et ce sont les équipements tiers qui révèlent le problème. Cette fiche décrit la réparation en deux temps : remettre un certificat
propre sur le DC, puis traiter la vraie cause, une autorité de certification qui signait encore en SHA-1.

## Prérequis

- Un accès administrateur sur le contrôleur de domaine et sur l'autorité de certification AD CS.
- Le droit de dupliquer et de publier des modèles de certificats (Enterprise Admins ou délégation équivalente).
- Un client externe pour tester le port 636 : un poste Linux avec `openssl`, ou un poste Windows avec
  `Test-NetConnection`.
- Une courte fenêtre : le redémarrage des services KDC et Netlogon coupe l'authentification Kerberos quelques
  secondes.

## Comprendre comment Schannel choisit son certificat

Un contrôleur de domaine n'a pas de réglage « certificat pour LDAPS ». Quand un client se connecte sur le 636,
Schannel parcourt le magasin `LocalMachine\My`, retient les certificats qui portent l'EKU *Server Authentication*,
dont le nom correspond au DC et dont la clé privée est accessible, et en présente un. S'il y a plusieurs
candidats, vous ne maîtrisez pas lequel. Tant qu'un certificat legacy traîne dans le magasin, il peut être servi.

Deuxième subtilité : le fournisseur de clé (CAPI ou CNG) est fixé par le modèle de certificat au moment de
l'enrôlement. On ne « convertit » pas un certificat existant, on le remplace par un certificat émis depuis un
modèle correct. Et l'algorithme de signature (SHA-1 ou SHA-256) n'est pas décidé par le modèle mais par la CA qui
signe. Ces deux règles expliquent tout ce qui suit.

## Identifier le certificat fautif sur le contrôleur de domaine

```powershell title="Inventaire du magasin ordinateur"
Get-ChildItem Cert:\LocalMachine\My |
  Format-List Subject, Thumbprint, NotAfter, EnhancedKeyUsageList,
    @{ n = 'Signature'; e = { $_.SignatureAlgorithm.FriendlyName } }
```

Pour voir le fournisseur de clé et le modèle d'origine, `certutil` est plus bavard :

```cmd
certutil -store My
```

Repérez, pour chaque certificat, les lignes `Template`, `Provider` et l'algorithme de signature. Ce qu'il faut
en tirer :

| Ce que vous lisez | Verdict |
| --- | --- |
| `Provider = Microsoft RSA SChannel Cryptographic Provider` | clé CAPI legacy, à remplacer |
| Signature `sha1RSA` | signé en SHA-1, à remplacer (et la CA est suspecte) |
| Clé publique inférieure à 2048 bits | à remplacer |
| `Provider = Microsoft Software Key Storage Provider`, `sha256RSA`, 2048 bits ou plus | correct |

Notez les empreintes des certificats à supprimer.

## Créer un modèle Kerberos Authentication en version CNG

Sur la CA, ouvrez la console des modèles (`certtmpl.msc`), faites un clic droit sur **Kerberos Authentication**
puis **Dupliquer le modèle**. Les réglages qui comptent :

1. **Compatibilité** : montez les deux niveaux (autorité de certification et destinataire) ; en dessous de
   Windows Server 2008 / Windows Vista, l'onglet Chiffrement ne propose pas les fournisseurs de stockage de clés.
2. **Général** : nom `KerberosAuthentication-CNG`, durée de validité identique à l'ancien modèle.
3. **Chiffrement** : catégorie de fournisseur *Fournisseur de stockage de clés* (Key Storage Provider),
   algorithme RSA, taille minimale 2048 (ou 4096), hachage de la demande SHA256.
4. **Extensions → Stratégies d'application** : vérifiez la présence de *Client Authentication*, *Server
   Authentication*, *KDC Authentication* et *Smart Card Logon*, héritées du modèle source.
5. **Modèles remplacés** : ajoutez *Domain Controller*, *Domain Controller Authentication* et *Kerberos
   Authentication*. Les DC remplaceront alors leurs anciens certificats au prochain cycle d'auto-enrôlement.
6. **Sécurité** : *Domain Controllers* et *Enterprise Domain Controllers* avec Lecture, Inscrire et Inscription
   automatique.

Publiez ensuite le modèle sur la CA (`certsrv.msc` → **Modèles de certificats** → **Nouveau** → **Modèle de
certificat à délivrer**) et, surtout, retirez de cette liste les anciens modèles de contrôleur de domaine.

:::caution
Tant que l'ancien modèle reste publié, l'auto-enrôlement continue de produire des certificats legacy en parallèle
du nouveau, et vous retrouvez deux candidats dans le magasin. Retirer le modèle de la liste des modèles délivrés
n'affecte pas les certificats déjà émis, c'est sans risque immédiat.
:::

## Enrôler le DC et purger les anciens certificats

Sur le contrôleur de domaine, forcez un cycle d'auto-enrôlement, puis vérifiez qu'un nouveau certificat est
apparu avant de toucher aux anciens :

```powershell title="Sur le contrôleur de domaine"
certutil -pulse
Start-Sleep -Seconds 30
Get-ChildItem Cert:\LocalMachine\My | Format-Table Subject, Thumbprint, NotAfter -AutoSize
```

Supprimez ensuite chaque certificat legacy, clé privée comprise, pour qu'il ne reste qu'un seul candidat valide :

```powershell
Remove-Item -Path Cert:\LocalMachine\My\EMPREINTE-DU-CERTIFICAT-LEGACY -DeleteKey
```

Enfin, relancez les deux services qui ont mis le certificat en cache (un redémarrage complet du DC fait le même
travail) :

```powershell
Restart-Service kdc, netlogon
```

## Vérifier LDAPS depuis un client externe

Ne vous fiez pas à la console du DC : c'est le point de vue du client qui compte. Depuis un poste Linux :

```bash
openssl s_client -connect srv-dc01.example.local:636 -showcerts </dev/null \
  | openssl x509 -noout -text \
  | grep -E "Signature Algorithm|Public-Key|Issuer"
```

Vous devez lire `sha256WithRSAEncryption`, une clé de 2048 bits ou plus, et votre CA en émetteur. Depuis Windows,
`Test-NetConnection -ComputerName srv-dc01 -Port 636` confirme au moins que le port répond. Relancez ensuite la
synchronisation sur l'IPBX.

## Quand la CA signe encore en SHA-1 : reconstruire plutôt que migrer

Le lendemain, surprise : le DC avait auto-enrôlé un certificat tout neuf, sur le bon modèle CNG... encore signé
en SHA-1. Rappelez-vous la deuxième règle : la signature dépend de la CA. La CA historique reposait sur un
fournisseur legacy et signait en SHA-1 depuis toujours. Microsoft documente une conversion de la clé de CA d'un
CSP vers un KSP, mais c'est une opération lourde sur un serveur vieillissant : sauvegarde complète, export puis
réimport de la clé, reconfiguration du registre. Autant de travail qu'une CA neuve, avec plus de risques. Le choix a donc été de monter une
nouvelle CA sur une VM PKI dédiée en Windows Server 2025.

1. Créez une VM PKI Windows Server 2025 (UEFI, Secure Boot, vTPM), jointe au domaine, qui n'est **pas** un DC.
   Principe Tier 0 : un contrôleur de domaine ne porte que AD DS et DNS.
2. Installez le rôle en CA racine d'entreprise, clé CNG, SHA-256, RSA 4096 :

```powershell title="Sur la VM PKI"
Install-WindowsFeature ADCS-Cert-Authority -IncludeManagementTools
Install-AdcsCertificationAuthority -CAType EnterpriseRootCA `
  -CryptoProviderName "RSA#Microsoft Software Key Storage Provider" `
  -KeyLength 4096 -HashAlgorithmName SHA256 -CACommonName "EXAMPLE-CA01"
certutil -config - -ping
certutil -ca.cert C:\Temp\EXAMPLE-CA01.crt
```

3. Publiez les modèles nécessaires (`KerberosAuthentication-CNG`, Web Server, etc.) et activez l'auto-enrôlement
   par GPO : *Configuration ordinateur → Stratégies → Paramètres Windows → Paramètres de sécurité → Stratégies de
   clé publique → Client des services de certificats – Inscription automatique*, avec le renouvellement des
   certificats expirés et la mise à jour des modèles.
4. Vérifiez que chaque DC présente un certificat de la nouvelle CA (même contrôle `openssl` que plus haut), puis
   retirez l'ancienne CA : désinstallation propre du rôle, contrôle des objets résiduels dans la partition de
   configuration (`pkiview.msc` → **Gérer les conteneurs AD**, conteneurs *Enrollment Services* et
   *Certification Authorities*), suppression des anciens certificats des DC.
5. Distribuez le fichier `EXAMPLE-CA01.crt` aux clients qui ne sont pas membres du domaine. Les machines Windows
   jointes récupèrent la racine par l'AD ; l'IPBX et les serveurs Linux, non.

:::danger
Les équipements tiers épinglent la racine : IPBX, serveurs Linux, applications qui ont importé l'ancien
certificat à la main. Ne retirez pas l'ancienne CA tant que la nouvelle racine n'est pas installée partout et que
chaque DC ne présente pas un certificat neuf. Sinon vous remplacez une panne de synchronisation par une panne
générale.
:::

## Rédiger le compte-rendu

Ce type d'incident fait intervenir plusieurs interlocuteurs : l'éditeur de l'IPBX, l'opérateur, la direction. Un
mail structuré en quatre blocs, **Cause du problème / Ce que j'ai
corrigé / Vérifications effectuées / État actuel**, évite dix relances et sert de trace pour le prochain
renouvellement. Copiez-y la sortie `openssl`, preuve que le certificat présenté est le bon.

## Pour aller plus loin

- Côté client, importer la racine et prouver le LDAPS indépendamment de l'application :
  [Rocky Linux : faire confiance à une CA interne et valider LDAPS](/docs/linux/rocky-linux-faire-confiance-a-une-ca-interne-et-valider-ldaps/).
- Pourquoi la PKI ne doit pas vivre sur un DC :
  [Tier 0 : contrôleurs de domaine et VM IAM](/docs/architecture/tier-0-controleurs-de-domaine-et-vm-iam/).
- Les exigences officielles d'un certificat LDAPS pour un DC :
  [Enable LDAP over SSL with a third-party certification authority](https://learn.microsoft.com/fr-fr/troubleshoot/windows-server/active-directory/enable-ldap-over-ssl-3rd-certification-authority)
  (Microsoft Learn).

<!-- source : mail « RE: Échec authentification », 2026-02-16 et 2026-02-17 ; rapport de maintenance serveurs 2025 v2, 2026-05-29 -->

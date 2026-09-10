---
title: "SPF, DKIM, DMARC : préparer une passerelle de filtrage mail sur un tenant Microsoft 365 hybride"
description: "Avant de placer une passerelle antispam devant Exchange Online : l'include SPF, les deux CNAME DKIM, la politique DMARC à conserver, et le piège des alias et nouveaux domaines rejetés en « Relay access denied »."
published: 2025-10-23
updated: 2026-07-10
category: cybersecurite
tags: [spf, dkim, dmarc, hornetsecurity, microsoft-365, exchange-online]
level: intermédiaire
status: à jour
featured: false
tested_on: [Microsoft 365 hybride, Hornetsecurity]
---

À l'automne 2025, j'ai placé une passerelle de filtrage (Hornetsecurity) devant Exchange Online. Le tenant est
hybride : les boîtes sont dans le cloud, un dernier serveur Exchange tourne encore sur site, et Entra Connect
synchronise l'annuaire. L'intégrateur m'a envoyé ses prérequis DNS : trois enregistrements. La liste tient sur
un ticket de métro, les conséquences non. Une passerelle qui relaie vos mails sortants sans que vos DNS publics
le déclarent, ce sont des messages qui finissent en spam chez vos clients, ou refusés net. Et neuf mois plus
tard, ces mêmes enregistrements me sont revenus en pleine figure avec un domaine supplémentaire.

Une analogie pour cadrer. SPF, c'est la liste des personnes qui ont procuration sur votre compte en banque : le
destinataire vérifie que le serveur qui lui parle en a le droit. DKIM, c'est le spécimen de signature déposé à
l'agence : le message est signé, le destinataire compare. DMARC, c'est la consigne que vous laissez au guichet
quand la signature ne correspond pas : accepter, mettre de côté, refuser, et m'envoyer un rapport.

## Prérequis

- La main sur la zone DNS publique de chaque domaine expéditeur (registrar ou hébergeur DNS).
- Un rôle d'administrateur Exchange sur le tenant Microsoft 365, et les droits sur l'AD si vous êtes en hybride.
- La liste réelle de vos domaines et alias d'envoi, pas seulement le domaine principal.
- Les valeurs cibles fournies par l'éditeur de la passerelle : l'include SPF et les deux cibles CNAME DKIM.
- La réponse à une question simple : après bascule, le flux sortant part-il uniquement par la passerelle, ou
  encore par Microsoft 365 pour certains flux ?

## Inventorier ce que vos DNS déclarent aujourd'hui

Avant d'ajouter quoi que ce soit, lisez l'existant. Il y a souvent des surprises : un include d'un ancien
prestataire, un sélecteur DKIM mort, une politique DMARC en `none` depuis trois ans.

```powershell title="État des lieux depuis n'importe quel poste"
Resolve-DnsName example.com -Type TXT | Where-Object Strings -like "v=spf1*"
Resolve-DnsName selector1._domainkey.example.com -Type CNAME
Resolve-DnsName _dmarc.example.com -Type TXT
```

Listez en face tout ce qui envoie « en tant que » votre domaine : Exchange Online, le serveur Exchange sur site
s'il émet encore directement vers Internet, les copieurs et applications qui envoient par SMTP, les SaaS qui
expédient en votre nom. La passerelle va s'ajouter à cette liste ; elle ne remplace pas ceux qui restent.

## SPF : ajouter l'include de la passerelle sans casser l'existant

L'enregistrement SPF est un TXT unique à la racine du domaine. Vous le modifiez, vous n'en créez pas un second :
deux enregistrements `v=spf1` sur le même nom, et les destinataires ignorent les deux.

```text title="TXT sur example.com"
v=spf1 include:spf.protection.outlook.com include:spf.hornetsecurity.com -all
```

Gardez l'include Microsoft tant qu'une partie du flux sortant passe encore par Microsoft 365. Le retirer trop
tôt, c'est faire échouer SPF sur les messages qui n'empruntent pas la passerelle. Conservez aussi le
qualificateur final que vous aviez (`-all` ou `~all`) ; ce n'est pas le moment de durcir.

:::caution
SPF autorise dix résolutions DNS au total, includes imbriqués compris. Chaque include en consomme au moins
une, souvent plusieurs. Au-delà, le résultat est `permerror` et les destinataires traitent votre SPF comme
absent. Avant d'ajouter la passerelle, comptez ; si vous êtes juste, c'est l'occasion de retirer les includes
d'outils que vous n'utilisez plus.
:::

## DKIM : deux CNAME vers la passerelle

La passerelle signe vos messages avec sa clé ; votre DNS doit publier la clé publique correspondante. Elle ne
vous demande pas de copier la clé, mais de déléguer deux noms par CNAME vers ses propres enregistrements.
Deux sélecteurs, pour qu'elle puisse faire tourner ses clés sans que vous ayez à retoucher votre zone.

```text title="CNAME sur example.com"
hse1._domainkey.example.com.  CNAME  <cible fournie par l'éditeur>
hse2._domainkey.example.com.  CNAME  <cible fournie par l'éditeur>
```

Vérifiez la propagation avant d'activer la signature dans la console de la passerelle :

```powershell
Resolve-DnsName hse1._domainkey.example.com -Type CNAME
Resolve-DnsName hse2._domainkey.example.com -Type CNAME
```

Ne supprimez pas les sélecteurs DKIM de Microsoft 365 (`selector1`, `selector2`) tant qu'Exchange Online signe
encore des messages qui ne transitent pas par la passerelle. Les deux jeux cohabitent sans conflit : chaque
message porte le sélecteur de celui qui l'a signé.

## DMARC : ne pas toucher à la politique pendant la bascule

Chez moi, DMARC était déjà en `p=quarantine` avec un rapport agrégé. C'est exactement l'état à conserver
pendant une migration de passerelle. Ni assouplir vers `none`, ce qui vous priverait de protection, ni durcir
vers `reject`, ce qui transformerait la moindre erreur d'alignement en mails perdus.

```text title="TXT sur _dmarc.example.com"
v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com
```

Ce sont les rapports `rua` qui vous diront, dans les semaines qui suivent, si une source légitime échoue encore :
un copieur oublié, un SaaS qui envoie sans DKIM, le serveur sur site qui émet en direct. Lisez-les, ils sont
pénibles mais ils ne mentent pas.

## Ajouter un domaine ou un alias : le piège de la synchronisation

Neuf mois après la bascule, il a fallu donner à quelques utilisateurs une adresse sur un nouveau domaine en
`.us`. Le domaine a été vérifié dans Microsoft 365, l'alias ajouté dans l'AD (attribut `proxyAddresses`) et
propagé par Entra Connect jusqu'à Exchange Online. Tout était propre côté Microsoft. Et le premier mail entrant
vers cet alias a été rejeté par la passerelle : `554 5.7.1 Relay access denied`.

La passerelle ne connaissait pas le domaine. La synchronisation des domaines et des alias vers la passerelle ne
suit pas automatiquement leur ajout dans Microsoft 365 ; il faut la déclencher ou déclarer le domaine côté
passerelle. Dans l'ordre :

1. Vérifier le nouveau domaine dans le centre d'administration Microsoft 365. Ne le passez pas en domaine par
   défaut : le domaine principal ne change pas.
2. Ajouter l'alias sur l'objet AD sur site (en hybride, c'est l'AD qui fait autorité), forcer un cycle Entra
   Connect, puis contrôler dans Exchange Online.
3. Déclarer le domaine sur la passerelle et vérifier que les utilisateurs et alias y sont synchronisés.
4. Publier SPF, DKIM et DMARC pour ce nouveau domaine aussi : un domaine sans SPF est un domaine que n'importe
   qui peut usurper.
5. Tester dans les deux sens depuis une boîte externe.

```powershell title="Contrôles côté annuaire et Exchange Online"
Get-ADUser utilisateur.test -Properties proxyAddresses | Select-Object -ExpandProperty proxyAddresses
Start-ADSyncSyncCycle -PolicyType Delta      # sur le serveur Entra Connect
Get-AcceptedDomain | Format-Table DomainName, DomainType   # Exchange Online PowerShell
Get-Mailbox utilisateur.test | Select-Object -ExpandProperty EmailAddresses
```

## Récapituler les enregistrements

| Enregistrement | Nom | Valeur | Rôle |
| --- | --- | --- | --- |
| TXT | `example.com` | `v=spf1 include:… include:spf.hornetsecurity.com -all` | Autoriser la passerelle à émettre |
| CNAME | `hse1._domainkey` | cible éditeur | Clé DKIM n° 1 |
| CNAME | `hse2._domainkey` | cible éditeur | Clé DKIM n° 2 |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=…` | Politique et rapports |

À refaire pour chaque domaine sur lequel vous émettez, alias compris.

## Pour aller plus loin

- La migration complète vers la passerelle, côté flux et quarantaine :
  [Migrer un antispam Vade vers Hornetsecurity](/docs/cybersecurite/migrer-un-antispam-vade-vers-hornetsecurity/).
- Quand un alias doit aussi être transféré vers une autre adresse :
  [Règle de flux : transfert vers un alias plus une adresse](/docs/microsoft-365/regle-de-flux-transfert-vers-alias-plus-adresse/).
- Les exigences SPF de Microsoft pour Exchange Online :
  [Configurer SPF pour éviter l'usurpation](https://learn.microsoft.com/fr-fr/defender-office-365/email-authentication-spf-configure) (Microsoft Learn).

<!-- source : mail « Prérequis HornetSecurity », 2025-10-22 ; mail « Problème de synchronisation des alias », 2026-07-09 -->

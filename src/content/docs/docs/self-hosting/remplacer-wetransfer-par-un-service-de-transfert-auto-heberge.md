---
title: "Remplacer WeTransfer par un service de transfert de fichiers auto-hébergé"
description: "Sortir des services de transfert grand public sans bloquer les utilisateurs : architecture d'un service de transfert maison adossé à du stockage objet en France, et les quatre questions à trancher avant de déployer."
published: 2026-04-20
category: self-hosting
tags: [transfert-de-fichiers, wetransfer, s3, cloudron, rgpd, reverse-proxy]
level: intermédiaire
status: à jour
featured: false
tested_on: [Cloudron, OVH Object Storage]
sidebar:
  label: "Remplacer WeTransfer par un service de…"
---

Interdire WeTransfer est facile : une règle sur la passerelle, une ligne dans la charte, et le tour est
joué. Le problème apparaît la semaine suivante, quand le bureau d'études doit envoyer un plan de trois
gigaoctets à un sous-traitant. Si vous n'avez rien mis à la place, les gens trouveront eux-mêmes, et ce
sera pire : compte personnel sur un service inconnu, clé USB qui circule, partage public sans
expiration.

En avril 2026, nous avons remplacé les services de transfert grand public par un service de transfert
maison, hébergé sur notre plateforme d'auto-hébergement, avec le stockage des fichiers dans un bucket
objet en France. Les envois internes se font avec le compte d'entreprise, et les partenaires disposent
d'un dépôt anonyme pour nous envoyer des fichiers sans créer de compte.

Cette fiche décrit l'architecture retenue, puis les quatre questions qu'il faut trancher **avant** de
déployer : rétention, quotas, chiffrement et localisation du stockage. Elles paraissent secondaires ;
ce sont elles qui décident si le service tient dans le temps.

## Le besoin réel derrière « envoyer un gros fichier »

Trois usages se cachent sous la même demande, et ils n'appellent pas la même réponse.

| Usage | Exemple | Réponse adaptée |
|---|---|---|
| Sortant, ponctuel, volumineux | Un plan ou un programme machine envoyé à un sous-traitant | Service de transfert avec lien expirable |
| Entrant, depuis l'extérieur | Un fournisseur qui doit nous déposer un fichier trop gros pour la messagerie | Dépôt anonyme sur le même service |
| Petit et secret | Un mot de passe, une clé d'API, un identifiant temporaire | **Pas** un service de transfert : la fonction d'envoi sécurisé du coffre de mots de passe |

Cette distinction évite une dérive classique : le service de transfert qui devient un espace de partage
permanent, puis un problème de conformité. Un transfert a une fin ; un partage durable relève d'un autre
outil.

## Prérequis

- Une plateforme capable d'héberger l'application et de gérer certificat et reverse proxy — dans notre
  cas la même que le reste des applications internes.
- Un nom DNS public dédié, par exemple `transfert.example.com`, et un certificat valide.
- Un bucket de stockage objet compatible S3, avec un utilisateur dédié et ses clés.
- Un annuaire ou un fournisseur d'identité pour authentifier les envois internes.

## L'architecture retenue

Le principe tient en une phrase : l'application ne stocke rien en propre, elle orchestre des objets dans
un bucket.

```text title="Chemin d'un fichier"
Navigateur --HTTPS--> reverse proxy --> application de transfert --> bucket S3 (région France)
                                              |
                                              +-- annuaire / SSO (envois internes)
                                              +-- lien expirable envoyé par mail
```

Deux conséquences pratiques :

- **La volumétrie n'est plus un problème de serveur.** Le disque de la machine ne se remplit pas ; c'est
  le bucket qui grossit, et il grossit sans qu'on redimensionne quoi que ce soit.
- **La sauvegarde est celle du bucket**, avec les mêmes règles que le reste du stockage objet, et
  l'application peut être redéployée sans toucher aux données.

Deux modes d'accès cohabitent : les salariés s'authentifient avec leur compte d'entreprise pour envoyer,
les partenaires accèdent à un formulaire de dépôt anonyme. Un dépôt anonyme n'est pas un dépôt public :
il ne permet **que** l'écriture, jamais la lecture ou la liste des fichiers déposés.

## Question 1 : la rétention

La question la plus importante et la plus négligée. Sans rétention, un service de transfert devient un
entrepôt, et un entrepôt dont personne ne connaît le contenu est une dette.

Trois décisions à prendre :

- **Une durée par défaut**, courte. Sept jours couvrent l'essentiel des besoins ; quatorze ou trente
  jours en option pour un partenaire lent. Le lien expire, le fichier est supprimé.
- **Une suppression manuelle possible** par l'émetteur, sans passer par vous.
- **Un filet côté stockage.** C'est le piège technique de l'histoire : si l'application ne supprime
  l'objet que dans sa base et pas dans le bucket, ou si un envoi échoue en cours de route, des objets
  orphelins s'accumulent silencieusement. Une règle de cycle de vie sur le bucket règle le problème.

```json title="Règle de cycle de vie (expiration automatique des objets)"
{
  "Rules": [
    {
      "ID": "expiration-transferts",
      "Status": "Enabled",
      "Filter": { "Prefix": "transferts/" },
      "Expiration": { "Days": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 3 }
    }
  ]
}
```

```bash title="Application de la règle"
aws s3api put-bucket-lifecycle-configuration \
  --endpoint-url https://s3.<region>.io.cloud.ovh.net \
  --bucket transfert-fichiers \
  --lifecycle-configuration file://lifecycle.json
```

Réglez cette expiration **plus longue** que celle de l'application, jamais plus courte : sinon le
stockage effacera des fichiers que l'application croit encore disponibles, et vos utilisateurs
récupéreront un lien mort.

:::tip
La clause `AbortIncompleteMultipartUpload` mérite le détour. Un envoi de plusieurs gigaoctets interrompu
laisse des fragments facturés et invisibles dans la liste des objets. Sans cette règle, ils restent là
pour toujours.
:::

## Question 2 : les quotas

Deux plafonds à poser, et un troisième qui vous attend au tournant.

**Par fichier.** Fixez une taille maximale cohérente avec l'usage, et annoncez-la : un utilisateur qui
connaît la limite s'adapte, celui qui découvre un échec après quarante minutes de téléversement ouvre un
ticket.

**Par utilisateur ou par envoi.** Utile pour éviter qu'un seul projet ne remplisse le bucket.

**Et le plafond caché : le reverse proxy.** C'est la panne numéro un de ce type de service. Nginx limite
par défaut la taille du corps des requêtes, et renvoie un `413 Request Entity Too Large` bien avant
votre limite applicative.

```nginx title="Autoriser les gros envois côté proxy"
client_max_body_size 5G;
proxy_request_buffering off;
proxy_read_timeout 600s;
send_timeout 600s;
```

`proxy_request_buffering off` évite que le proxy n'écrive tout le fichier sur son disque avant de le
transmettre. Si l'application téléverse directement vers le bucket avec une URL pré-signée, cette limite
compte moins, mais vérifiez-la quand même.

## Question 3 : le chiffrement

Trois couches distinctes, qu'on confond souvent :

- **En transit** : HTTPS de bout en bout, certificat valide, redirection systématique du HTTP.
  Non négociable, y compris pour le formulaire de dépôt anonyme.
- **Au repos** : le chiffrement côté serveur du stockage objet protège contre un accès physique aux
  disques du fournisseur. Activez-le, c'est une case à cocher.
- **De bout en bout** : le fichier est chiffré par le navigateur avant l'envoi, la clé ne quitte jamais
  le poste. Le niveau le plus fort, mais toutes les applications ne le proposent pas.

À défaut de chiffrement de bout en bout, la protection utile est **le mot de passe sur le lien**, à
communiquer par un autre canal que le mail contenant le lien. Parce qu'il faut se le dire clairement :

:::caution
Un lien de téléchargement est un identifiant. Quiconque l'obtient — mail transféré, capture d'écran,
journal d'un intermédiaire — accède au fichier. Pour un document réellement sensible, mot de passe
distinct, durée courte, et une seule personne destinataire.
:::

## Question 4 : le stockage objet en France

C'est l'argument qui a emporté la décision côté direction. Un fournisseur dont les serveurs sont en
France ne vous met pas magiquement en conformité, mais il supprime une classe entière de questions
difficiles : où sont les données, quel droit s'applique, que répondre au client qui pose la question
dans son questionnaire fournisseur.

Trois réglages à ne pas rater sur le bucket :

- **La région**, choisie proche du site pour la latence autant que pour la localisation légale.
- **Des clés S3 dédiées à ce service**, limitées à ce seul bucket. Pas les clés qui servent aussi aux
  sauvegardes : un service exposé sur Internet ne doit jamais porter une clé capable de toucher aux
  archives.
- **Aucun accès public** sur le bucket. Les fichiers sortent par l'application, via des liens signés et
  temporaires, jamais par une URL de bucket ouverte.

## Vérifier avant d'annoncer

Une demi-journée de tests évite trois semaines de tickets :

1. Envoyer un fichier proche de la limite haute, depuis le réseau de l'entreprise **et** depuis une
   connexion extérieure.
2. Vérifier qu'un lien expiré est bien mort, et que l'objet a disparu du bucket.
3. Faire déposer un fichier par un partenaire réel, et confirmer qu'il ne peut ni lister ni relire ce
   qui a été déposé.
4. Tester le dépôt depuis un téléphone, pas seulement depuis un poste de travail.
5. Regarder les journaux : qui a envoyé quoi, quand. C'est ce qui vous sera demandé le jour d'un doute.

## Accompagner le changement

Le service technique ne suffit pas. Ce qui a fonctionné : annoncer la nouvelle adresse dans le mail qui
rappelle l'interdiction, expliquer le pourquoi en une phrase (nos plans ne partent plus sur un service
dont nous ne maîtrisons rien), et donner l'adresse de dépôt anonyme aux partenaires réguliers avant
qu'ils ne la demandent. Certains garderont l'ancien réflexe quelques semaines : c'est normal, un outil
rapide et sans compte à créer finit par gagner.

## Pour aller plus loin

- Le billet qui raconte la décision côté organisation :
  [WeTransfer interdit, et alors ?](/blog/wetransfer-interdit-et-alors/).
- Le même stockage objet, côté sauvegardes :
  [Migrer ses sauvegardes vers OVH Object Storage](/docs/cloud-web/migrer-ses-sauvegardes-de-backblaze-b2-vers-ovh-object-storage/).
- Pour authentifier les envois internes sans créer de comptes :
  [SSO pour une appli maison : LDAP, OIDC ou SAML](/docs/self-hosting/sso-pour-une-appli-maison-ldap-oidc-ou-saml/).

<!-- source : annonce interne « Remplacement du service de transfert de fichiers », 2026-04 -->

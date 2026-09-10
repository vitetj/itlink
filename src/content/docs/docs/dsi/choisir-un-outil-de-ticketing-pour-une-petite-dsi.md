---
title: "Choisir un outil de ticketing pour une petite DSI : GLPI, osTicket, Zammad ou Power Automate"
description: "Comment j'ai comparé quatre approches du support interne pour une PME industrielle à DSI d'une personne : les critères qui ont pesé, ce qui a été retenu, et pourquoi ce choix ne serait pas le vôtre."
published: 2025-08-25
category: dsi
tags: [ticketing, helpdesk, glpi, zammad, osticket, power-automate]
level: intermédiaire
status: à jour
featured: false
tested_on: [Zammad, Cloudron]
---

En août 2025, la direction arrive avec une idée raisonnable : formaliser les demandes informatiques.
Aujourd'hui elles arrivent par mail, par téléphone, dans le couloir et par messagerie instantanée, ce qui
donne un suivi approximatif et aucune vision de la charge réelle. La proposition sur la table : un flux
Power Automate branché sur une liste SharePoint, puisque les licences Microsoft 365 sont déjà payées.

J'ai demandé une semaine pour comparer. Voici le raisonnement, pas un classement absolu : le bon outil
dépend d'un contexte, et le mien est très particulier — une PME industrielle, un service informatique
d'une personne, et une plateforme d'auto-hébergement déjà en place avec un annuaire et un SSO.

Si votre contexte diffère, la grille reste valable ; la conclusion, non.

## Poser le besoin avant de regarder les outils

L'erreur classique consiste à comparer des fonctionnalités avant d'avoir écrit ce qu'on veut obtenir.
J'ai commencé par trois questions.

**D'où viennent les demandes aujourd'hui ?** Très majoritairement d'une adresse e-mail générique. Une
conclusion en découle immédiatement : l'outil doit ingérer le mail nativement et répondre depuis le
ticket, sinon les utilisateurs continueront d'écrire à l'adresse et rien ne sera tracé. Un outil qui
impose un formulaire web, c'est un outil qu'on contourne.

**Qui va l'administrer ?** Moi. Chaque heure passée à maintenir l'outil est une heure qui ne va pas au
reste. Un logiciel « gratuit » qui demande une journée par trimestre coûte plus cher qu'un outil
maintenu en deux clics.

**Que veut-on en tirer ?** Trois choses : ne plus perdre de demande, pouvoir dire en fin d'année où est
passé le temps, et donner de la visibilité aux utilisateurs sur l'avancement. Pas de gestion de
changements, pas de catalogue de services à quarante entrées, pas de contrats de niveau de service
contractuels. Le périmètre volontairement modeste est un critère de choix à lui seul.

## Les critères qui ont réellement pesé

| Critère | Pourquoi il compte ici |
|---|---|
| Canal e-mail bidirectionnel | Les demandes arrivent déjà par mail ; le reste est théorique |
| Coût d'exploitation | Mise à jour, sauvegarde, supervision : tout retombe sur une personne |
| Intégration à l'annuaire existant | Un compte de plus par utilisateur, c'est un mot de passe de plus à réinitialiser |
| Localisation et maîtrise des données | Tickets = informations sur l'organisation, les incidents, parfois la sécurité |
| Adoption par les utilisateurs | Un outil que personne n'ouvre ne remplace pas le couloir |
| Réversibilité | Pouvoir exporter l'historique et partir sans négociation |
| Périmètre fonctionnel | Assez pour le besoin, pas au-delà : chaque module en trop est à configurer |

Le critère absent est volontaire : le prix de la licence. Il ne discrimine pas grand-chose entre ces
quatre candidats. Ce qui discrimine, c'est le temps que l'outil me prendra.

## Les quatre candidats

### GLPI

Le vétéran francophone, à la fois gestion de parc et gestion des tickets. Installation simple sur une
pile web classique, communauté importante, écosystème de plugins, agent d'inventaire qui remonte
automatiquement le matériel et les logiciels.

Son point fort ne se discute pas : si vous cherchez d'abord à savoir **ce que vous possédez**, c'est
l'outil. Son point faible, pour un usage purement support, est le revers du même argument : c'est un
ITSM complet, avec des entités, des habilitations et des modules qu'il faut configurer même quand on ne
s'en servira pas. L'interface est dense, ce qui n'aide pas l'adoption par des utilisateurs occasionnels.

### osTicket

À l'opposé : léger, en PHP, centré sur une seule chose — recevoir des tickets par mail et par
formulaire, les affecter, y répondre. On l'installe en une soirée et il fait le travail.

C'est sa limite aussi. L'interface a vieilli, les fonctions de recherche et de reporting sont sommaires,
et les intégrations d'authentification demandent du bricolage. Excellent candidat pour démarrer vite,
moins convaincant si l'outil doit tenir plusieurs années et servir de vitrine du service informatique.

### Zammad

Interface moderne, pensée pour les agents qui passent la journée dedans : recherche plein texte, vue
unifiée des échanges, fusion de tickets, macros. Le canal e-mail est de première classe — c'est même son
histoire — et il sait s'appuyer sur un annuaire existant en LDAP, OpenID Connect ou SAML.

En contrepartie, la pile technique est plus lourde qu'un simple PHP/MySQL. C'est précisément là que mon
contexte a fait pencher la balance : la plateforme d'auto-hébergement que j'exploite déjà installe,
met à jour et sauvegarde l'application comme les autres. La complexité technique existe, mais je ne la
porte pas.

### Power Automate et une liste SharePoint

L'option proposée par la direction, et elle mérite mieux qu'un rejet de principe : aucune infrastructure
supplémentaire, aucune licence supplémentaire, authentification déjà en place, données dans le même
tenant que le reste.

Le problème est ailleurs. Un outil de ticketing, ce n'est pas une liste avec un statut : c'est
l'agrégation d'un fil de discussion par mail, la gestion des réponses des utilisateurs qui répondent
douze fois d'affilée, les notifications, la fusion des doublons, l'historique, les vues par état. Tout
cela, il faudrait le construire dans le flux — et surtout le maintenir, seul, avec un débogage
laborieux dès que le flux dépasse une dizaine d'actions. J'ai résumé mon avis en réunion : ce n'est pas
un mauvais produit, c'est une usine à gaz pour ce besoin précis. On rebâtirait à la main ce que d'autres
donnent en standard.

## Ce qui a été retenu, et pourquoi

**Zammad**, auto-hébergé sur la plateforme interne, branché sur le SSO existant et sur la boîte aux
lettres générique que les utilisateurs connaissent déjà. Il a été rebaptisé avec un nom maison, dans la
même famille que les autres portails internes : ça paraît anecdotique, mais un outil qui porte un nom
que les gens reconnaissent s'adopte mieux qu'un produit dont le nom ne leur évoque rien.

Les trois raisons du choix, dans l'ordre :

1. **Le canal e-mail marche sans rien changer pour les utilisateurs.** Ils écrivent à la même adresse
   qu'avant ; un ticket se crée ; ils reçoivent un accusé et un suivi. Zéro formation.
2. **L'exploitation est absorbée par une plateforme déjà en place.** Mise à jour, sauvegarde,
   certificat : rien de spécifique à ce logiciel.
3. **L'authentification est celle de tous les autres services internes.** Pas de compte
   supplémentaire.

Et les limites, dites franchement : c'est l'application la plus gourmande en ressources du lot, elle
mérite qu'on surveille sa mémoire ; et elle ne fait pas d'inventaire de parc. GLPI reste donc pertinent
sur ce terrain-là, en complément et pas en concurrent — c'est un sujet que je garde ouvert côté labo.

## Les erreurs à ne pas commettre

:::caution
Un outil ne crée pas un processus. Si les demandes urgentes continuent d'arriver par téléphone et sont
traitées immédiatement, l'outil ne contiendra que les demandes non urgentes et vos statistiques seront
fausses. Le vrai travail est d'obtenir que tout passe par le même canal, y compris quand c'est vous qui
prenez l'appel : vous ouvrez le ticket derrière.
:::

Trois autres pièges classiques :

- **Trop de catégories au démarrage.** Commencez avec quatre ou cinq. Vous affinerez avec les données
  réelles, pas avec ce que vous imaginez.
- **Des délais de traitement annoncés qu'on ne tient pas.** Mieux vaut ne rien promettre que promettre
  une réponse en deux heures et ne pas être là.
- **Oublier la sortie.** Vérifiez dès l'installation comment exporter les tickets et les pièces jointes.
  Le jour où vous changerez d'outil, ce sera trop tard pour poser la question.

## Pour aller plus loin

- Brancher l'outil sur l'annuaire existant plutôt que de créer des comptes :
  [SSO pour une appli maison : LDAP, OIDC ou SAML](/docs/self-hosting/sso-pour-une-appli-maison-ldap-oidc-ou-saml/).
- Le versant inventaire de la question : [Lab : GLPI sur Cloudron](/lab/glpi-sur-cloudron/).
- Parce qu'un outil de ticketing ne dispense pas de savoir écrire :
  [Écrire des communications IT que les gens lisent](/docs/dsi/ecrire-des-communications-it-que-les-gens-lisent/).

<!-- source : mail « Ticketing : GLPI / osTicket / Power Automate », 2025-08-19 -->

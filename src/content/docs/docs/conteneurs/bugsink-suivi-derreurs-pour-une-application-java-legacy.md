---
title: "Bugsink : suivre les erreurs d'une application Java legacy avec un Sentry auto-hébergé"
description: "Donner un suivi d'erreurs à une application Java 8 qui n'en a jamais eu : installer Bugsink en conteneur, brancher le SDK Sentry compatible Java 8, capturer les exceptions non gérées sans fuite de données."
published: 2026-03-17
category: conteneurs
tags: [bugsink, sentry, java, docker, cloudron, supervision]
level: intermédiaire
status: à jour
featured: false
tested_on: [Bugsink, Cloudron, Java 8, Maven]
---

Le logiciel métier maison de ma boîte est écrit en Java 8. Il tourne sur des centaines de postes, il pilote une
partie de la production, et pendant des années son système de remontée d'erreurs a été le suivant : quelqu'un
passe la tête par la porte du service informatique et dit « ça a planté ». Question suivante : quoi
exactement ? Réponse : « ben, ça a planté ».

Un développeur qui ne voit pas les erreurs de son application développe à l'aveugle. Il corrige ce qu'on lui
raconte, pas ce qui arrive vraiment, et il ne saura jamais qu'une exception se déclenche cinquante fois par
jour sur un poste où personne ne se plaint. La solution s'appelle un collecteur d'erreurs : l'application
envoie chaque exception à un serveur, avec la pile d'appels, la version, le contexte technique. Le plus connu
est Sentry. Pour une PME qui veut garder ses données chez elle, il existe une version légère et compatible :
**Bugsink**.

## Pourquoi Bugsink plutôt que Sentry

Sentry auto-hébergé, c'est une vingtaine de conteneurs, un Kafka, un ClickHouse et une machine dédiée. Pour un
service informatique d'une personne, c'est disproportionné : on installe une infrastructure entière pour
regarder des piles d'appels.

Bugsink fait le même travail avec une application unique et une base de données classique. Surtout, il parle
le **même protocole que Sentry** : les SDK officiels Sentry fonctionnent sans modification, il suffit de leur
donner une autre adresse. Vous n'êtes donc enfermé nulle part — si le volume explose un jour, la bascule vers
un Sentry complet ne demande que de changer une variable d'environnement.

Chez moi il tourne comme une application de ma plateforme d'auto-hébergement, qui s'occupe du certificat, des
sauvegardes et de l'envoi des e-mails d'alerte. En Docker nu, c'est une image, un volume et une base de
données.

## Prérequis

- Un hôte de conteneurs et un nom DNS avec certificat pour publier l'interface.
- Un accès SMTP pour les notifications. Sur une plateforme intégrée, c'est déjà là.
- Côté application : Java 8, un projet Maven ou Gradle, et la possibilité de déployer une nouvelle version aux
  utilisateurs. Ce dernier point est souvent le vrai obstacle sur du logiciel ancien.

## Installer et créer le projet

Sur une plateforme d'applications, l'installation tient en un clic. Ensuite, dans l'ordre :

1. **Changez le mot de passe du compte d'administration** avant toute autre chose. Une application de
   supervision installée avec ses identifiants d'usine et publiée sur Internet, c'est une base de données de
   traces techniques offerte au premier venu.
2. Créez un projet, par exemple `client-metier`. Un projet par application, et si possible un projet par
   environnement : les erreurs de la préproduction n'ont rien à faire mélangées à celles de la production.
3. Récupérez le **DSN** du projet. C'est l'URL, contenant une clé, vers laquelle le SDK enverra les
   événements.

:::danger
Le DSN est un secret d'écriture : quiconque le possède peut injecter des faux événements dans votre outil.
Il ne va pas dans le dépôt Git, ni en dur dans le code. Variable d'environnement, ou fichier de configuration
déployé à part et non versionné.
:::

## Brancher le SDK sur une application Java 8

C'est le point qui fait hésiter tout le monde : les SDK Sentry récents exigent Java 11 au minimum. La branche
`1.x` est la dernière compatible Java 8, et elle fonctionne parfaitement avec un serveur compatible.

```xml title="pom.xml — dépendance compatible Java 8"
<dependency>
  <groupId>io.sentry</groupId>
  <artifactId>sentry</artifactId>
  <version>1.7.30</version>
</dependency>
```

L'initialisation se fait une seule fois, au démarrage de l'application, avant tout le reste :

```java title="Initialisation au démarrage"
public static void main(String[] args) {
    // Le DSN vient de l'environnement, jamais du code source
    String dsn = System.getenv("SENTRY_DSN");
    if (dsn != null && !dsn.isEmpty()) {
        Sentry.init(dsn);
    }
    // ... démarrage de l'application
}
```

Le test `if` n'est pas de la coquetterie : sans lui, un poste sur lequel la variable n'a pas été déployée
plante au démarrage à cause de l'outil censé surveiller les plantages. Ce serait dommage.

## Capturer les exceptions

Deux cas, et il faut les deux.

**Les exceptions que le code attrape déjà.** Partout où un `catch` avale une erreur en écrivant trois mots
dans un fichier de log que personne ne lit, ajoutez la capture :

```java title="Exception gérée"
try {
    traiterCommande(commande);
} catch (Exception e) {
    Sentry.capture(e);
    afficherMessageUtilisateur("Le traitement a échoué, l'incident a été signalé.");
}
```

**Les exceptions que personne n'attrape.** Celles-là sont les plus intéressantes, parce que ce sont elles qui
font tomber l'application sous les yeux de l'utilisateur. Une seule ligne les récupère toutes :

```java title="Filet de sécurité global"
Thread.setDefaultUncaughtExceptionHandler(
    (thread, throwable) -> Sentry.capture(throwable));
```

Placez-la juste après l'initialisation. À partir de là, tout ce qui remonte jusqu'à la sortie du programme
laisse une trace complète dans l'outil, avec la pile d'appels et le nom du thread fautif.

## Vérifier, puis brancher les alertes

Ne considérez jamais l'intégration comme faite avant d'avoir vu un événement arriver. Provoquez-en un
volontairement, dans une version de test :

```java title="Événement de vérification"
Sentry.capture(new RuntimeException("Vérification de la remontée d'erreurs"));
```

Si rien n'apparaît dans l'interface au bout de quelques secondes, la cause est presque toujours l'une des
trois suivantes : un DSN mal recopié, un proxy d'entreprise qui bloque la sortie HTTPS depuis les postes, ou
un certificat que l'ancienne machine virtuelle Java ne sait pas valider. Java 8 a une réserve de certificats
racine qui date, et un certificat récent peut très bien être refusé par un poste qui n'a pas vu de mise à jour
depuis longtemps.

Configurez ensuite les notifications par e-mail, mais avec discernement : une alerte pour chaque nouvel
**type** d'erreur, pas pour chaque occurrence. Le regroupement automatique est justement ce qui rend l'outil
supportable — mille plantages identiques deviennent une ligne avec un compteur.

## Ce qu'il ne faut surtout pas envoyer

Un collecteur d'erreurs voit passer des messages d'exception, et les messages d'exception contiennent souvent
ce que le développeur y a mis. Une requête SQL entière, un numéro de commande, un nom de client, parfois un
mot de passe passé en paramètre.

Trois règles simples :

- Pas de données personnelles ni de données clients dans les messages d'exception. Un identifiant technique
  suffit à retrouver le dossier concerné dans la base métier.
- Pas de pièce jointe de contexte automatique tant que vous n'avez pas relu ce qu'elle contient.
- Un cycle de rétention court sur le serveur. Ces traces servent à corriger des bugs des dernières semaines,
  pas à constituer une archive.

:::note
L'outil s'auto-héberge, donc ces données restent chez vous : c'est justement l'argument qui a permis de le
déployer sans discussion sur le volet conformité. Ça ne dispense pas de faire attention à ce qu'on y met.
:::

## Et le jour où vous quitterez Java 8

La branche `1.x` du SDK n'évolue plus. Elle fait le travail, mais elle ne recevra ni nouveautés ni correctifs.
Le jour où l'application passera en Java 11 ou 17 — et ce jour arrivera —, remplacez la dépendance par une
version `6.x` ou `7.x`. L'API change : `Sentry.capture()` devient `Sentry.captureException()`,
l'initialisation prend un bloc de configuration, et le gestionnaire global d'exceptions est installé
automatiquement. C'est une demi-journée de travail, pas une réécriture, et c'est un bon prétexte à glisser dans
le dossier de modernisation.

## Pour aller plus loin

- Une autre application de la même plateforme, et ce qui se passe quand elle manque de mémoire :
  [GitLab en conteneur : mémoire et OOM](/docs/conteneurs/gitlab-en-conteneur-memoire-et-oom/).
- Lire les journaux de la plateforme qui héberge tout ça, sans paniquer pour rien :
  [Lire les logs « box » de Cloudron](/docs/self-hosting/lire-les-logs-box-de-cloudron/).
- Empaqueter soi-même une application pour cette plateforme, quand elle n'est pas au catalogue :
  [GLPI 11 packagé pour Cloudron](/lab/glpi-sur-cloudron/).

<!-- source : mail « Bugsink / Sentry Java », 2026-03-17 ; « découverte du jour après robocopy », 2026-03-17 -->

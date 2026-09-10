---
title: "NIS2 quand le service informatique, c'est vous"
description: "Un grand client m'envoie une charte de sécurité NIS2 à signer. Je suis seul au service informatique. Ce que j'ai répondu, ce que l'assureur cyber en a dit, et pourquoi la conformité est un sport d'équipe."
published: 2024-12-12
category: dsi
tags: [nis2, conformite, it-solo, assurance-cyber, ewon, gouvernance]
featured: false
---

Mi-octobre 2024, un grand client m'envoie sa charte de sécurité informatique. Objet du mail : NIS2. Il faut la signer et la renvoyer. Le document dit, en substance, que nous respectons la directive et que nous garantissons un certain nombre de choses sur nos systèmes et sur la façon dont nous nous connectons aux siens.

Je l'ai lue deux fois. Puis j'ai écrit à ma direction une phrase que je ne trouvais dans aucun modèle de réponse : nous ne respectons pas NIS2, donc nous ne pouvons pas la signer.

## Ce que j'ai répondu au client

La réponse officielle, celle qui est partie avec l'en-tête de la boîte, tenait en trois points.

Un : nous ne signons pas une conformité que nous n'avons pas. Signer une charte pour faire plaisir à un client, c'est arranger la vérité, et je ne me plierai jamais à cette mentalité. Le jour où il y a un incident, la signature devient une pièce du dossier, et pas en notre faveur.

Deux : nous ne divulguons pas d'informations sensibles sur notre sécurité. Un questionnaire de sécurité est aussi un document de reconnaissance. C'est comme votre banque : elle ne vous montre pas le plan de l'agence pour vous prouver que le coffre est solide. On répond sur le périmètre réellement partagé avec le client, pas sur l'intérieur de la maison.

Trois, et c'est le point qui débloque tout : ce client n'est pas connecté à nous. Les machines qu'il nous a achetées sont accessibles à distance par la solution Ewon de HMS, un fournisseur certifié ISO 27001 et IEC 62443. C'est exactement ce que NIS2 attend d'une chaîne d'approvisionnement : que chaque maillon soit qualifié. Nous avons donc recommandé ce chemin plutôt qu'un VPN entre nos deux réseaux, qui aurait précisément créé la connexion que sa charte cherchait à encadrer.

Une semaine plus tard, en rappelant à un éditeur que les identifiants ne voyagent pas en clair dans un mail, j'ai signé « #NIS2, merci l'Europe ». C'est mon niveau de diplomatie interne.

## Ce que l'assureur en a dit

Le lendemain de la charte, autre exercice : le rapport pour l'assurance cyber. Sauvegardes, correct. Sécurité, correct. RGPD et NIS2 : pas dans les clous. Et ce n'est pas la technique qui manque. Les sauvegardes tournent, l'EDR est déployé, les mots de passe sont dans un coffre, les correctifs suivent. Ce qui manque, c'est le registre, la procédure écrite, l'analyse de risque, le responsable désigné. Des outils ou des services à payer pour de la paperasse, ai-je écrit, un peu vite, et un peu vrai.

J'ai proposé une piste : un délégué à la protection des données en prestation externe, parce que ce rôle demande une compétence que je n'ai pas et un temps que je n'ai pas non plus. Ce n'est pas un aveu de faiblesse, c'est de la comptabilité : un service informatique d'une personne a exactement une personne de temps.

## Plusieurs dans ma tête

C'est là que la directive et moi avons un désaccord de fond. NIS2 suppose une organisation : quelqu'un qui décide de la politique de sécurité, quelqu'un qui l'applique, quelqu'un qui contrôle que c'est appliqué. Trois rôles, et de préférence trois personnes, parce que celui qui configure ne devrait pas être le seul à vérifier, et celui qui écrit la règle ne devrait pas être le seul à l'appliquer.

Chez nous, ces trois personnes s'appellent moi. Un service informatique ne peut pas être une seule personne, même si je suis plusieurs dans ma tête. Je l'ai écrit tel quel à la direction, avec la suite : il faut élire un vrai responsable de la sécurité, un DSI en titre, une politique de sécurité signée. Seul, c'est compliqué. Pas impossible techniquement ; compliqué au sens où un contrôle fait par celui qui a configuré n'est pas un contrôle.

Il y a un détail qui résume le problème. Je ne mets jamais de message d'absence vers l'extérieur. Pour une boîte avec un service informatique réduit, « je suis absent jusqu'au 20 » est une information pour un attaquant, pas une politesse. Une organisation conforme n'a pas ce problème : quand une personne part, une autre reçoit les alertes.

## Ce que j'ai fait quand même

Attendre un renfort n'est pas une stratégie. Pendant que la question de l'organisation remonte, ce qui dépend de moi avance.

- La charte informatique a été révisée fin novembre : PRA, journaux, BYOD, obligation de signalement, sensibilisation obligatoire. [Les neuf ajouts sont détaillés ici](/docs/dsi/mettre-a-jour-sa-charte-informatique-pour-nis2/).
- La sensibilisation au phishing se met en place, et le triage des mails douteux est quotidien.
- Les identifiants ne circulent plus en clair. Coffre de mots de passe, liens à durée limitée, [MFA compris](/docs/cybersecurite/mfa-obligatoire-avec-totp-dans-vaultwarden/).
- Les correctifs critiques sont annoncés à tous, en français et en anglais, avec la durée de coupure et la version déployée. Un zero-day sur la téléphonie a été patché en décembre, un quart d'heure d'interruption.
- Et je prends mon bâton de pèlerin pour aller voir la direction avec une demande simple : un nom en face du rôle de responsable sécurité, et un budget en face du délégué à la protection des données.

## Ce que je retiens

- Ne signez jamais une conformité que vous n'avez pas. La signature survit à la relation commerciale.
- Un questionnaire de sécurité se remplit sur le périmètre partagé, pas sur l'infrastructure entière.
- La certification de votre fournisseur d'accès distant est aussi votre réponse. Choisissez-le pour ça.
- La conformité n'est pas un outil à acheter, c'est du temps de quelqu'un. Si la direction veut le papier, elle finance le temps.
- Un service informatique d'une personne est un point de défaillance unique. La directive le dit avec d'autres mots ; l'assureur le dit avec les siens ; je le dis avec les miens.

Je suis plusieurs dans ma tête. Mais l'ANSSI ne compte qu'un badge par personne.

<!-- source : réponse à une charte de sécurité informatique d'un client, 2024-10-14 ; rapport pour l'assurance cyber, 2024-10-15 ; « charte informatique à jour », 2024-11-21 ; maintenance téléphonie CVE-2024-41713, 2024-12-09 -->

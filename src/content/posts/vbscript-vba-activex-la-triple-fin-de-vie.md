---
title: "VBScript, VBA, ActiveX : la triple fin de vie qui menace vos outils métier"
description: "Une feuille Excel du bureau d'études en panne un vendredi matin, un installateur d'automate qui refuse Windows 11 25H2 : deux ans après ma première alerte, VBScript, ActiveX et VBA sont devenus un chantier."
published: 2026-08-06
category: veille
tags: [vbscript, vba, activex, excel, python, legacy, industrie]
featured: true
---

Le 26 juin 2024, j'ai envoyé à la direction un mail intitulé, en substance, « la fin de VBA : incidence importante pour nous en 2027 ». Personne n'a paniqué, et c'était normal : rien n'était cassé. Le 10 juillet 2026, un vendredi, une feuille Excel du bureau d'études a cessé de fonctionner au moment où les gens arrivaient. Trois semaines plus tard, début août, l'installateur de l'environnement de programmation de nos automates refusait de s'installer sur un poste en Windows 11 25H2. Entre les deux, deux ans de veille que je vais essayer de résumer sans vous faire peur pour rien, et sans vous rassurer à tort.

## Trois technologies, un seul mouvement

**VBScript** est le plus avancé dans la sortie. Microsoft a annoncé sa dépréciation en 2023 ; depuis Windows 11 24H2, c'est une fonctionnalité à la demande, et sur une installation neuve de 25H2 elle n'est plus là. La suite annoncée est un retrait complet. Le moteur ne manque à personne au quotidien, sauf qu'une bonne partie des installateurs industriels écrits il y a dix ou quinze ans l'appellent sans le dire. Chez moi, c'est l'installateur de Studio 5000, l'outil de programmation des automates Rockwell, qui l'a révélé.

**ActiveX**, c'est le morceau qui a cassé la feuille du bureau d'études. Microsoft durcit progressivement les contrôles ActiveX dans Office, jusqu'à les désactiver par défaut dans les versions récentes des applications Microsoft 365. Une feuille qui embarque un contrôle ActiveX pour un bouton, une liste ou un calendrier se retrouve avec un bouton mort, et l'utilisateur avec un message qu'il ne comprend pas. Il m'a fallu deux heures pour trouver un contournement ce matin-là.

**VBA** n'a pas de date de fin officielle, et je tiens à le dire clairement parce que mon propre mail de 2024 était plus catégorique. Mais tout se resserre autour : les macros des fichiers venus d'Internet sont bloquées par défaut, ActiveX s'éteint, VBScript s'en va, et Microsoft pousse Python dans Excel comme alternative. Excel ne disparaît pas ; les macros VBA ne sont plus l'avenir. Une fin de vie de fait, sans faire-part.

## Ce que ça touche vraiment

Chez moi, la liste des services qui vivent avec des scripts Excel tient en une ligne du mail de 2024 : la BI, le SAV, le bureau d'études projet, le bureau d'études usinage, la production. Des feuilles de chiffrage, surtout, construites sur quinze ans par des gens qui ne sont pas développeurs et qui ont fait un travail remarquable avec ce qu'ils avaient. Un collègue, non informaticien, a passé des années à rationaliser ces fichiers bricolés. Il mérite mieux qu'une mise à jour d'Office qui casse tout un vendredi matin.

Il y a aussi un outil de documentation technique, un produit d'éditeur, piloté par du VBA. En 2024, j'avais commencé à en migrer les macros vers PowerShell, parce que c'était la direction indiquée par Microsoft à l'époque. Et il y a les installateurs d'automatisme, qui ne sont pas à nous et sur lesquels je n'ai aucune prise.

L'image que j'utilise avec la direction : la norme électrique a changé. La maison tient toujours debout, mais chaque rénovation doit se faire aux nouvelles normes, et un jour l'assureur pose la question.

## Ce que deux ans m'ont appris

**Une alerte sans incident n'est pas entendue.** En 2024, le mail a été lu et rangé. En juillet 2026, après la panne, le même sujet a obtenu dans la journée une demande de cahier des charges pour la rentrée. Je n'en tire pas de leçon amère : c'est humain, et j'aurais fait pareil à leur place. J'en tire une méthode : garder l'alerte au chaud et la ressortir le jour de l'incident, avec la date d'origine en haut.

**La vraie question n'est pas technique.** Je l'ai écrite le matin de la panne : investir dans la modernisation, ou subir Microsoft. Ce n'est pas au service informatique d'y répondre seul. En avril 2026, la direction avait tranché la partie qui lui revenait : on va vers Python. Deux chemins possibles, réduire Excel au profit d'outils web internes, ou convertir progressivement les macros VBA en Python, avec Python dans Excel comme passerelle. Les deux demandent une ressource dédiée. Un développeur à plein temps, pas un support qui développe entre deux tickets.

**Les rustines sont des rustines.** Pour Studio 5000, la commande qui réinstalle VBScript est [documentée ici](/docs/microsoft/reactiver-vbscript-windows-11-25h2/). Sur le poste qui a déclenché le ticket, même avec le composant remis, l'installateur n'a pas voulu. Nous avons testé sur plusieurs postes ; la conclusion du mail du lendemain tenait en une ligne : attendre un correctif de l'éditeur, ou garder une version antérieure de Windows sur les postes d'automatisme. Ce n'est pas une solution, c'est un sursis.

**L'IA n'est pas la solution non plus.** Avec ChatGPT, on a parfois l'impression de se transformer en magicien : on sort un lapin du chapeau, une macro convertie en dix minutes. Ça reste de la magie d'assistance. Elle m'aide à remettre au propre ; elle ne remplace pas la personne qui sait pourquoi la feuille de chiffrage fait ce qu'elle fait. La remise au propre, oui. La refonte complète, non. J'y reviens dans [un autre billet](/blog/lia-au-service-informatique-un-binome-pas-un-remplacant/).

## Le plan, sans baguette

Ce que je pousse maintenant, et qui tient dans le cahier des charges demandé :

1. **Inventorier.** Chaque fichier Excel avec macro, chaque contrôle ActiveX, chaque installateur qui dépend de VBScript, avec son propriétaire et son usage réel. Sans inventaire, on découvre les dépendances le vendredi matin.
2. **Classer.** Ce qui bloque la production ou un devis en premier ; ce qui sert une fois par an en dernier.
3. **Décider par fichier.** Réécrire en Python, basculer vers un outil web interne, ou garder tel quel sur un poste isolé, en connaissance de cause. Les trois réponses sont légitimes ; ce qui ne l'est pas, c'est de ne pas choisir.
4. **Financer une personne.** Le chantier ne se fait pas entre deux tickets.

Et pour les postes d'automatisme, une version de Windows figée et un réseau segmenté, le temps que les éditeurs suivent.

En 2024, j'avais écrit 2027 dans l'objet du mail. Je me suis trompé. C'était 2026, un vendredi, à huit heures du matin, et c'est une feuille de calcul qui a eu le dernier mot.

<!-- source : fil « Alerte – Les feuilles de calcul VBA arrivent en fin de vie », 2024-06-26 → 2026-08-04 ; mail « conversion VBA vers powershell », 2024-09-10 ; mail « RE: Fin support Excel 2027 », 2026-04-15 ; ticket helpdesk d'installation Studio 5000, 2026-08-03 -->

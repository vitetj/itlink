---
title: "Débloquer une mise à niveau VxRail LCM qui tourne en boucle (nettoyage PostgreSQL et toolbox Dell)"
description: "Mise à niveau VxRail figée en IN_PROGRESS, plugin vCenter en « 502 Bad Gateway », relance refusée : comment clôturer l'opération fantôme dans la base PostgreSQL du VxRail Manager et finir le travail avec la toolbox Dell."
published: 2026-02-13
category: virtualisation
tags: [vxrail, dell, lcm, postgresql, vcenter, vsan]
level: expert
status: à jour
featured: true
tested_on: [VxRail E560F, VxRail Manager 8.0.370, vCenter 8.0.3]
sidebar:
  label: "Débloquer une mise à niveau VxRail LCM qui…"
---

Février 2026. Mon cluster VxRail, six nœuds E560F en configuration étendue sur deux salles, doit passer
de la version 8.0.361 à la 8.0.370. Rien d'exotique : le bundle est chargé dans le plugin vCenter, la
pré-vérification est verte, je lance. Et puis plus rien. L'opération reste en `IN_PROGRESS` pendant des
heures, le plugin VxRail finit par répondre « 502 Bad Gateway », et quand je tente une relance, le VxRail
Manager me renvoie « Max instances of VxRail_System_Upgrade operation reached ». Traduction : une mise à
niveau tourne déjà, impossible d'en démarrer une autre. Sauf qu'elle ne tourne plus. Elle est morte, mais
personne ne l'a prévenue.

Pour comprendre le blocage, il faut savoir comment le VxRail Manager tient ses comptes. C'est une VM Linux
qui embarque une base PostgreSQL. Chaque opération lancée (scan de composants, mise à niveau, ajout de
nœud) y laisse une ligne avec un état : `STARTED`, `IN_PROGRESS`, `FAILED`, `COMPLETED`. Le service
applicatif, `vmware-marvin`, consulte cette table avant d'accepter une nouvelle demande. Si le processus qui
portait la mise à niveau meurt sans mettre à jour sa ligne, celle-ci reste en `IN_PROGRESS` pour
l'éternité. C'est un ticket de caisse resté ouvert : tant qu'il n'est pas clôturé, la caisse refuse d'en
ouvrir un autre.

La sortie de secours consiste donc à clôturer ce ticket à la main, dans la base, puis à laisser la
toolbox Dell terminer le nettoyage. J'ai déroulé cette procédure avec un dossier ouvert chez Dell
ProSupport : l'ingénieur a validé la démarche et fourni la toolbox qui manquait. Je la documente parce
que je n'ai rien trouvé de public sur le sujet, pas pour que vous la fassiez seul un vendredi à 18 h.

:::danger
Vous allez modifier à la main la base interne d'un produit dont Dell assure le support. Faites-le avec un
dossier ouvert, un snapshot de la VM VxRail Manager, et rien d'autre en cours sur le cluster. Sans dossier
ouvert, une requête de travers peut vous coûter le support de l'incident.
:::

## Prérequis

- Un dossier Dell ProSupport ouvert, avec un bundle de logs déjà transmis
  (voir [Collecter un TSR VxRail et ouvrir un ticket Dell ProSupport](/docs/virtualisation/collecter-un-tsr-vxrail-et-ouvrir-un-ticket-dell-prosupport/)).
- L'accès SSH au VxRail Manager avec le compte `mystic`, puis le mot de passe `root`.
- Un snapshot de la VM VxRail Manager pris depuis vCenter juste avant de commencer.
- Le cluster vSAN au vert, aucun hôte en mode maintenance, le witness joignable.
- Une version de la VxRail ToolBox qui propose l'option « Manually cancel LCM ». Elle est fournie par le
  support, au cas par cas, via son FTP sécurisé (DEFT).
- Une nuit devant vous : sur six nœuds, la mise à niveau complète a duré jusqu'au petit matin.

## Sécuriser le VxRail Manager

Le snapshot est votre seule marche arrière. Prenez-le depuis vCenter sur la VM VxRail Manager, sans
mémoire, avec un nom explicite. Vous le supprimerez une fois la mise à niveau terminée et validée.

Connectez-vous ensuite en SSH. Le compte `mystic` est le compte de service standard du VxRail Manager ; le
passage en `root` est nécessaire pour les commandes qui suivent.

```bash title="Connexion au VxRail Manager"
ssh mystic@192.0.2.10
su -
```

## Inspecter les opérations bloquées

La table `system.operation_status` de la base `vxrail` contient l'état de toutes les opérations. Commencez
par regarder ce qu'elle contient avant de toucher à quoi que ce soit.

```bash title="Lister les opérations connues du VxRail Manager"
psql -U postgres vxrail -c "select id,state,owner from system.operation_status;"
```

Dans mon cas, deux types de lignes posaient problème : des opérations dont le propriétaire commence par
`Lcm` (Lifecycle Manager) figées en `IN_PROGRESS` ou en `FAILED`, et un scan de composants
(`CustomizeComponentScan`) resté en `STARTED`. C'est exactement ce qui déclenche le message « Max
instances ... reached » : le LCM compte les instances actives, et celles-ci ne se termineront jamais
d'elles-mêmes.

## Nettoyer la base et l'état du bundle

Deux requêtes suffisent : supprimer les opérations LCM mortes et forcer l'échec du scan de composants
resté ouvert.

```bash title="Clôturer les opérations fantômes"
psql -U postgres vxrail -c "delete from system.operation_status where (state='FAILED' or state='IN_PROGRESS') and owner like 'Lcm%';"
psql -U postgres vxrail -c "update system.operation_status set state='FAILED' where owner='CustomizeComponentScan' and state='STARTED';"
```

Relancez la requête `select` de l'étape précédente : il ne doit plus rester aucune ligne dont le
propriétaire commence par `Lcm`. Tant qu'il en reste une, ne relancez rien.

Le VxRail Manager garde aussi, en dehors de la base, l'état du bundle de mise à niveau chargé. Il faut le
remettre à zéro, sinon le plugin considérera qu'un bundle est toujours « déployé ».

```bash title="Réinitialiser l'état du bundle"
echo '{"state":"NONE","deployed_for_public_api":false}' > /var/lib/vmware-marvin/bundle_state.json
```

:::caution
L'ordre compte. Base d'abord, fichier d'état ensuite, puis seulement le redémarrage du service. Si vous
redémarrez `vmware-marvin` avant d'avoir purgé la table, il relit les lignes fantômes et vous revenez au
point de départ.
:::

## Vérifier le verrou interne et redémarrer le service

Le VxRail Manager dispose d'un service de verrouillage interne (« lockservice ») exposé sur un socket Unix
derrière nginx. Une mise à niveau en cours y pose un verrou ; s'il est resté posé, la relance échouera
même avec une base propre. On l'interroge avec `curl` directement sur le socket.

```bash title="Consulter l'état du lockservice"
curl -X GET --unix-socket /var/lib/vxrail/nginx/socket/nginx.sock "http://127.0.0.1:5000/rest/vxm/internal/lockservice/v1/lock"
```

Une fois la base et le verrou propres, redémarrez le service applicatif pour qu'il recharge son état.

```bash title="Redémarrer le service applicatif du VxRail Manager"
service vmware-marvin restart
```

## Terminer le nettoyage avec la toolbox Dell

À ce stade, le plugin vCenter répondait de nouveau chez moi, mais le LCM restait persuadé qu'une
opération était en cours. C'est là que la VxRail ToolBox intervient. C'est un script Python que le
support Dell dépose sur le VxRail Manager pour diagnostiquer et réparer sans passer par l'interface. Il
n'est pas public et il n'est pas question de le redistribuer ici ; je décris seulement ce qu'il fait.

Le support vous envoie l'archive via DEFT, son FTP sécurisé. Déposez-la dans `/home/mystic`, puis lancez
l'outil.

```bash title="Lancer la VxRail ToolBox"
cd /home/mystic
python tool_box.py
```

Un menu numéroté s'affiche. Sur la version que j'ai reçue en février 2026, l'option qui nous intéresse est
la 12, « Manually cancel LCM ». Voici les autres options rencontrées, pour vous donner une idée de ce que
l'outil couvre :

| Option | Rôle |
| --- | --- |
| 1 | LogAI (analyse de logs) |
| 2 | Node Healthcheck |
| 3 | DNS check |
| 4 | SCG check (passerelle Secure Connect, dial-home) |
| 5 | Management Accounts check |
| 6 | Debug vxrm-vc (liaison VxRail Manager / vCenter) |
| 7 | Cert check |
| 8 | EE tester |
| 9 | SupportAccount check |
| 10 | vSAN troubleshooting tool |
| 11 | Import vCenter Cert |
| 12 | Regenerate VxM self-signed cert ou « Manually cancel LCM » selon la version |
| 13 | Register VxRail plugin |
| 14 | Clean redis cache |
| 16 | Update account |
| 18 | Enable/Disable SSH on VC/ESXi |
| 19 | Manual collect log if UI unavailable |

:::note
La numérotation change d'une version à l'autre. La première toolbox que Dell m'a envoyée n'avait tout
simplement pas l'option « cancel LCM » : il a fallu demander une version plus récente. Lisez le menu,
ne tapez pas « 12 » par réflexe.
:::

## Relancer la mise à niveau

Redémarrez la VM VxRail Manager depuis vCenter, proprement. Au retour, ouvrez le plugin VxRail dans
vCenter : la page de mise à niveau doit être revenue à son état initial, sans opération en cours.
Rechargez le bundle 8.0.370, laissez la pré-vérification se dérouler, puis lancez.

Chez moi, la mise à niveau s'est terminée dans la nuit : VxRail Manager en 8.0.370, vCenter en 8.0.3, les
six nœuds au vert, vSAN sain au réveil. Il ne restait qu'à supprimer le snapshot et à remercier
l'ingénieur Dell, ce que j'ai fait avec un enthousiasme qui a dû le surprendre.

## Les pièges rencontrés

- **Une toolbox sans l'option qu'il vous faut.** Vérifiez le menu dès réception et redemandez une version
  récente si « Manually cancel LCM » n'y figure pas.
- **Relancer trop tôt.** Une seule ligne `Lcm%` restée dans `operation_status` et vous retombez sur « Max
  instances ... reached ». Contrôlez avec le `select` avant chaque tentative.
- **Sauter le snapshot.** Ces commandes sont irréversibles. Le snapshot coûte trente secondes.
- **Sous-estimer la durée.** Six nœuds en configuration étendue, avec évacuation vSAN à chaque hôte,
  c'est une nuit complète. Prévenez la production et coupez les sauvegardes qui tourneraient en parallèle.
- **Oublier de vérifier le witness.** Sur un cluster étendu, la mise à niveau redémarre les hôtes salle
  par salle ; si le witness est injoignable au mauvais moment, vous perdez le quorum.

## Pour aller plus loin

- [Collecter un TSR VxRail et ouvrir un ticket Dell ProSupport qui avance vite](/docs/virtualisation/collecter-un-tsr-vxrail-et-ouvrir-un-ticket-dell-prosupport/) :
  le dossier ouvert est le prérequis numéro un de cette procédure.
- [Restaurer une VM cassée par une mise à jour non supportée](/docs/virtualisation/restaurer-une-vm-cassee-par-une-mise-a-jour-non-supportee/) :
  ce qui se passe quand on n'a pas pris le snapshot.
- [VxRail 9, VCF obligatoire et Azure Local : ce que Dell m'a répondu](/blog/vxrail-9-vcf-obligatoire-et-azure-local-ce-que-dell-ma-repondu/) :
  pourquoi cette 8.0.370 sera peut-être ma dernière mise à niveau VxRail.

<!-- source : mails « RE: fail upgrade … 502 Bad Gateway », 2026-02-11 ; « toolbox » et « Upgrade done », 2026-02-11/12 ; « VxRailToolBox », 2026-07-29 -->

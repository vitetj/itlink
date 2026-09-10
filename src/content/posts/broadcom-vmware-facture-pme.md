---
title: Broadcom, VMware et la facture qui a doublé
description: Quand renouveler ses serveurs coûte moins cher que renouveler ses licences, il est temps de rouvrir le dossier hyperviseur. Récit d'une réunion avec Dell et de ce que j'en retiens.
published: 2026-06-20
category: dsi
tags: [vmware, broadcom, proxmox, xcp-ng, dell, budget]
featured: true
---

Il y a des réunions dont on sort avec une décision, et d'autres dont on sort avec une phrase. Celle-ci : « changer les
serveurs coûte moins cher que renouveler les licences ». Merci Broadcom.

## Le contexte

Une infrastructure hyperconvergée Dell VxRail qui fait le boulot depuis des années, un contrat VMware qui arrive à
échéance, et un éditeur racheté qui a réécrit sa grille tarifaire pour les grands comptes. Quand on est une PME
industrielle avec une équipe IT d'une personne, on n'est pas la cible. On est le dommage collatéral.

## Ce que Dell nous a montré

La réunion de lancement a mis trois options sur la table, avec des ordres de grandeur que je ne reprendrai pas ici
mais qui tenaient tous dans une seule diapositive.

- **Rester chez VMware** : le confort de l'existant, une facture qui n'a plus rien à voir avec celle de 2021.
- **Proxmox** : gratuit ou presque, solide, mais une charge d'administration que je n'ai pas envie de porter seul en
  production. Je l'adore dans le [lab](/lab), c'est différent.
- **XCP-ng (Vates)** : une base Xen éprouvée, un éditeur français, une console Xen Orchestra qui ne fait pas peur, un
  support qui répond. C'est l'option qui a retenu mon attention.
- Et l'invité surprise : **Azure Local** sur les mêmes VxRail, en tirant parti de la Software Assurance déjà payée.

## Ce que j'en retiens

1. **Le lock-in se paie au renouvellement, pas à l'achat.** On a signé VMware en connaissance de cause ; on découvre
   le prix de la sortie au moment où on n'a plus le choix du calendrier.
2. **Une équipe d'une personne dicte l'architecture.** Ce n'est pas la technologie la plus élégante qui gagne, c'est
   celle que je peux réparer un dimanche soir sans ouvrir un ticket.
3. **Les outils de dimensionnement sont gratuits, utilisez-les.** Un export RVTools et un Live Optics ont fait plus
   pour la discussion que n'importe quel argumentaire commercial.
4. **La Software Assurance est un actif.** Personne ne vous le rappellera, sauf le jour où on compare des devis.

La suite au prochain épisode, avec des tests dans le lab avant toute décision. C'est la règle de la maison.

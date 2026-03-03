/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

//clé de stockage dans le stockage local du navigateur
const storageKey = 'mainWorkspace';

/**
 * @brief Fonction pour sérialiser le workspace avec le cache personnalisé
 */
function serializeWorkspaceWithCache(workspace) {

  // Sérialisation standard de Blockly
  const workspaceJson = Blockly.serialization.workspaces.save(workspace);
  
  // Ajouter le cache personnalisé et le compteur
  workspaceJson.customNameCache = workspace.customNameCache || {};
  workspaceJson.compteur_etat = workspace.compteur_etat || 0;
  
  //retour du worspace serialisé et enrichi
  return workspaceJson;
}

/**
 * @brief Fonction pour désérialiser le workspace avec le cache personnalisé
 */
function deserializeWorkspaceWithCache(workspace, jsonData) {

  //avant toute chose on nettoie le workspace
			workspace.clear();
			//on nettoie également le cache
			workspace.customNameCache = {};
			workspace.compteur_etat = 0;
			
			console.log("Restauration du workspace");
			console.log("Cache après effacement du workspace =>");
			console.log(workspace.customNameCache);
			
			// Marquer le workspace comme en cours de chargement
    	workspace.isLoading = true;

			//on bloque les événements Blockly pour ne pas avoir d'actions parasites à la restauration de la sauvegarde
			Blockly.Events.disable();
			
			//Restaurer le cache des noms d'état avant de charger les blocs
			workspace.customNameCache = jsonData.customNameCache || {};
			workspace.compteur_etat = jsonData.compteur_etat || 0;
			
			console.log("Cache après restauration du cache provenant du json deserialisé =>");
			console.log(workspace.customNameCache);
			
			//Recharger les blocs
			Blockly.serialization.workspaces.load(jsonData, workspace);
			
			// Traitement post-chargement pour les blocs qui ont besoin de vérification
		  setTimeout(() => {
		    const allBlocks = workspace.getAllBlocks();
		    allBlocks.forEach(block => {
		      if (block.needsNameCheck) {
		        const nomRestaure = block.getFieldValue("NOM");
		        console.log("Vérification post-chargement - Bloc ID:", block.id, "Nom:", nomRestaure);
		        
		        if (nomRestaure && nomRestaure !== "") {
		          console.log("Nom restauré détecté, pas de nouveau nom créé");
		          // Le cache est déjà bon, juste marquer comme traité
		          block.needsNameCheck = false;
		        }
		      }
		    });
		    
		    // Marquer le workspace comme chargé
		    workspace.isLoading = false;
		    
		    console.log("Cache après chargement des blocs =>");
		    console.log(workspace.customNameCache);
		    
		    // Réactiver les événements Blockly
		    Blockly.Events.enable();
		    
		    alert('Espace de travail rechargé avec succès.');
		  }, 50);
}

/**
 * @brief Sauvegarde l'état courant du workspace dans le stockage local du navigateur
 */
export const save = function (workspace) {

  //Appel de la fonction qui enrichi le workspace avec le cache personnalisé et qui renoie un objet sérialisé
  const serializedData = serializeWorkspaceWithCache(workspace);
  
  //sauvegarde du workspace sérialisé en local
	window.localStorage?.setItem(storageKey, JSON.stringify(serializedData));
};

/**
 * @brief Restaure un workspace sauvegardé dans le stockage local du navigateur
 */
export const load = function (workspace) {

  //Récupération du workspace dans le stockage
  const data = JSON.parse(window.localStorage?.getItem(storageKey));

	//Si pas de données sauvegardées : on ne fait rien
  if (!data) return;

  //on bloque les événements Blockly pour ne pas avoir d'actions parasites à la restauration de la sauvegarde
  Blockly.Events.disable();
  
  //fonction "maison" pour désérialiser le cache ET le workspace
  deserializeWorkspaceWithCache(workspace, data);
  
  //fonction pour associer le nettoyage du workspace avec le nettoyage du cache
  //setupWorkspaceClearListener(workspace);
  
  //on réactive les événements
  //Blockly.Events.enable();
};

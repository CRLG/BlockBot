import * as Blockly from 'blockly/core';
import { labotboxContext } from './blocks/robot_expert.js';

// ================================================================
// SERIALIZER DU CONTEXTE LABOTBOX
// Sauvegarde et restaure les listes dynamiques avec le workspace.
// priority: 99 garantit que le contexte est restauré AVANT les blocs,
// ainsi les dropdowns dynamiques sont déjà alimentés à la désérialisation.
// ================================================================
Blockly.serialization.registry.register('labotbox_context', {
  priority: 99,

  save: (_workspace) => {
    // Sauvegarde une copie des listes courantes du contexte
    const snapshot = {};
    Object.keys(labotboxContext).forEach(key => {
      snapshot[key] = [...labotboxContext[key]];
    });
    return snapshot;
  },

  load: (state, _workspace) => {
    // Restaure chaque liste présente dans la sauvegarde.
    // La règle "liste nulle = pas d'écrasement" s'applique aussi ici :
    // si LaBotBox a déjà injecté une liste non-vide avant la restauration,
    // elle prime sur la sauvegarde.
    Object.keys(labotboxContext).forEach(key => {
      if (labotboxContext[key].length === 0 && state[key]?.length > 0) {
        labotboxContext[key] = state[key];
      }
    });
  },

  clear: (_workspace) => {
    Object.keys(labotboxContext).forEach(key => {
      labotboxContext[key] = [];
    });
  }
});

/*
// Fonction de téléchargement du fichier JSON
export const downloadWorkspace = function (workspace){

	//Sérialisation standard de Blockly	
	const state = Blockly.serialization.workspaces.save(workspace);
 
  //Ajoute à l'objet sérialisé le cache personnalisé et le compteur pour gérer les noms des états
  state.customNameCache = workspace.customNameCache || {};
  state.compteur_etat = workspace.compteur_etat || 0;

	//Formattage en JSON prêt à être lié à un lien pour être téléchargé au niveau navigateur
	const jsonString = JSON.stringify(state, null, 2);
	const blob = new Blob([jsonString], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	//création du lien
	const a = document.createElement('a');
	a.href = url;
	a.download = 'blockly_workspace.json';
	
	//association du lien à l'objet JSON et simulation d'un click
	document.body.appendChild(a);
	a.click();
	
	//Nettoyage
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};


//fonction conservée pour compatibilité de blockly avec firefox and co
export const uploadWorkspace = function(workspace, fic){
		//si le chemin de la sauvegarde n'a pas été choisi au préalable par l'utilisateur on ne fait rien
    if (!fic) return;
		//Création du lecteur de fichier
		const reader = new FileReader();
	
		//Association d'une fonction d'extraction au lancement du lecteur de fichier
    reader.onload = function(e) {
        try {
        		//Analyse du fichier de sauvegarde (qui est au format JSON)
            const json = JSON.parse(e.target.result);
            //fonction de chragement
            restoreWorkspaceFromJson(json);
        }
        catch(err){
            alert("Erreur JSON : " + err.message);
        }
    };

    reader.readAsText(fic);
};
// Fonction de chargement depuis un fichier JSON
export function restoreWorkspaceFromJson(workspace, json){

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
    workspace.customNameCache = json.customNameCache || {};
    workspace.compteur_etat = json.compteur_etat || 0;
    
    console.log("Cache après restauration du cache provenant du json deserialisé =>");
		console.log(workspace.customNameCache);

		//Recharger les blocs
    Blockly.serialization.workspaces.load(json, workspace);

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
*/

// Construit le nom de fichier par défaut pour la sauvegarde.
// Format : <annee>_<mois>_<jour>_<heure>h<minutes>_<NOM_SM>.json
// NOM_SM est extrait du premier bloc state_machine_expert trouvé dans le workspace.
// Si aucun bloc n'est trouvé, on utilise 'workspace' comme nom de repli.
const construireNomFichier = function (workspace) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const horodatage =
        now.getFullYear() + '_' +
        pad(now.getMonth() + 1) + '_' +
        pad(now.getDate()) + '_' +
        pad(now.getHours()) + 'h' +
        pad(now.getMinutes());

    // Recherche du premier bloc state_machine_expert dans le workspace
    const blocs = workspace.getAllBlocks(false);
    const blocSM = blocs.find(b => b.type === 'state_machine_expert');
    const nomSM = blocSM ? (blocSM.getFieldValue('NOM_SM') || 'workspace') : 'workspace';

    return horodatage + '_' + nomSM + '.json';
};

// Fonction de téléchargement du fichier JSON
export const downloadWorkspace = function (workspace) {
    // Sérialisation standard de Blockly (contient déjà tous les champs NOM des blocs)
    const state = Blockly.serialization.workspaces.save(workspace);

    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    // Nom de fichier horodaté avec le nom de la machine à états
    a.download = construireNomFichier(workspace);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


// Fonction de chargement depuis un fichier JSON
export function restoreWorkspaceFromJson(workspace, json) {
    workspace.clear();
    Blockly.serialization.workspaces.load(json, workspace);
    alert('Espace de travail rechargé avec succès.');
}


// Fonction conservée pour compatibilité navigateur (Firefox, etc.)
export const uploadWorkspace = function (workspace, fic) {
    if (!fic) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);
            restoreWorkspaceFromJson(workspace, json);
        } catch (err) {
            alert("Erreur JSON : " + err.message);
        }
    };
    reader.readAsText(fic);
};

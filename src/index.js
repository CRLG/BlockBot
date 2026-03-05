/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {blocks} from './blocks/text';
import {blocks_robot_position} from './blocks/robot_position';
import {blocks_match} from './blocks/match';
import {blocks_robot_debutant} from './blocks/robot_debutant';
import {blocks_robot_expert} from './blocks/robot_expert';
import {stm32Generator} from './generators/stm32';
import {arduinoGenerator} from './generators/arduino';
import {save, load} from './serialization';
import {downloadWorkspace, uploadWorkspace, restoreWorkspaceFromJson} from './save_ws';
import {toolbox} from './toolbox';
import './index.css';

// Register the blocks and generator with Blockly
Blockly.common.defineBlocks(blocks);
Blockly.common.defineBlocks(blocks_robot_position);
Blockly.common.defineBlocks(blocks_match);
Blockly.common.defineBlocks(blocks_robot_debutant);
Blockly.common.defineBlocks(blocks_robot_expert);

// Autorise l'ajout de commentaires par clic droit sur la page
Blockly.ContextMenuItems.registerCommentOptions();

var BlockBotLab = null;

// Set up UI elements and inject Blockly
const codeDiv = document.getElementById('generatedCode').firstChild;
const outputDiv = document.getElementById('output');
const blocklyDiv = document.getElementById('blocklyDiv');
/*
const buttonsDiv = document.getElementById('buttons');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const savedFile =document.getElementById('fileInput');
*/
const ws = Blockly.inject(blocklyDiv, 
        {toolbox,
            grid:				// Affiche la grille
                {spacing: 20,
                length: 3,
                colour: '#ccc',
                snap: true},        
            zoom:               // Affiche les boutons du zoom et le bouton de recentrage
                {controls: true,
                wheel: true,
                startScale: 1.0,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.2,
                pinch: true},
            trashcan: true      // Active la pouvelle
        });
        
const GeneratorType = {
  ARDUINO_GENERATOR: 'ARDUINO_GENERATOR',
  STM32_GENERATOR: 'STM32_GENERATOR'
};
var generator_type = GeneratorType.STM32_GENERATOR;

// --------------------------------------------------
// Gestion de l'affichage des catégories débutant / expert
// --------------------------------------------------
// La méthode hideItem/showItem n'existe pas dans toutes les versions de
// Blockly. La solution universelle est de reconstruire la toolbox en
// filtrant les catégories via ws.updateToolbox(), en s'appuyant sur le
// champ toolboxitemid présent dans toolbox.js.
// --------------------------------------------------

/**
 * Reconstruit la toolbox en incluant ou excluant les catégories
 * identifiées par leur toolboxitemid.
 *
 * mode : "débutant" → affiche 'cat_robot_debutant', masque 'cat_robot_expert'
 * mode : "expert"   → affiche 'cat_robot_expert',   masque 'cat_robot_debutant'
 */
function setModeAffichage(mode) {
  const estDebutant = (mode === 'débutant');

  // IDs à masquer selon le mode
  const idsAMasquer = estDebutant
    ? ['cat_robot_expert']
    : ['cat_robot_debutant'];

  // Copie profonde de la toolbox d'origine pour ne pas la muter
  const toolboxFiltree = JSON.parse(JSON.stringify(toolbox));

  toolboxFiltree.contents = toolboxFiltree.contents.filter(
    item => !idsAMasquer.includes(item.toolboxitemid)
  );

  ws.updateToolbox(toolboxFiltree);
}

// Initialisation au démarrage : mode débutant par défaut.
// updateToolbox() est disponible dès que ws existe, pas besoin
// d'attendre un événement particulier — on appelle directement
// après load(ws) + runCode() via un listener one-shot.
(function() {
  let modeInitialise = false;

  const initMode = () => {
    if (modeInitialise) return;
    modeInitialise = true;
    setModeAffichage('débutant');
  };

  // Cas 1 : workspace avec sauvegarde → FINISHED_LOADING garanti
  const onFinishedLoading = (e) => {
    if (e.type === Blockly.Events.FINISHED_LOADING) {
      ws.removeChangeListener(onFinishedLoading);
      initMode();
    }
  };
  ws.addChangeListener(onFinishedLoading);

  // Cas 2 : workspace vide (premier lancement) → pas de FINISHED_LOADING,
  // mais updateToolbox() est utilisable dès le prochain tick du navigateur.
  requestAnimationFrame(initMode);
})();


// This function resets the code and output divs, shows the
// generated code from the workspace, and evals the code.
// In a real application, you probably shouldn't use `eval`.
const runCode = () => {
  if (generator_type === GeneratorType.STM32_GENERATOR) {
      const code = stm32Generator.workspaceToCode(ws);
      codeDiv.innerText = code;
  }
  else {
      const code = arduinoGenerator.workspaceToCode(ws);
      codeDiv.innerText = code;
  }
};

//Charge l'état initial du workspace à partir du stockage par défaut s'il existe
// et regénère le code
load(ws);
runCode();

/**
 * FONCTION POUR LABOTBOX
 * Ajoute le canal de communication avec LaBotBox
 */
document.addEventListener('DOMContentLoaded', function() {
    // la connection avec le pont de communication se fait avec un petit délai pour 
    // laisser le temps à BlockBot d'intégrer toutes les fonctions du fichier qwebchannel.js (cf le fichier index.html)
    setTimeout(function() {
        if (typeof qt !== 'undefined' && qt.webChannelTransport) {
        		//création du pont de communication et récupération des injections de Qt
            new QWebChannel(qt.webChannelTransport, function(channel) {
            		//récupération de la classe Qt exposée (contenu dans l'injection Qt cf QwebChannelTransport)
                BlockBotLab = channel.objects.BlockBotLab;
								//redirection des différentes commandes reçues            
				        BlockBotLab.executeCommand.connect(function(command, params) {
										switch(command) {
												//commande de génération et d'envoi du code vers LaBotBox
												case 'upload_code':
														return sendGeneratedCode();

												// Basculement du mode débutant / expert
												// params doit valoir "débutant" ou "expert"
												case 'set_mode':
														return setModeAffichage(params);
														
												//gestion de la sauvegarde du projet
												case 'save_project':
													//qtLog('prise en compte demande sauvegarde');
													return downloadWorkspace(ws);
													
												//gestion de la restauration de projet
												case 'load_project':
													const json = JSON.parse(params);
													//qtLog(ws.compteur_etat);
            							return restoreWorkspaceFromJson(ws, json);
										}
								});
            });
        }
    }, 100); // Délai de 100ms
});

/**
 * FONCTION POUR LABOTBOX
 * Fonction de debug pour le log au format "chaîne de caractères" (vers la sortie standard de LaBotBox)
 */
function qtLog(message) {
    if (BlockBotLab && BlockBotLab.logJS) {
        BlockBotLab.logJS(message);
    }
}

/**
 * Listener: Auto-nommage des blocs etat_expert créés par l'utilisateur
 */
ws.addChangeListener((e) => {
	// Uniquement les créations réelles (pas les chargements depuis JSON)
  if (e.type !== Blockly.Events.BLOCK_CREATE) return;

  const bloc = ws.getBlockById(e.blockId);
  /*
  var msg='[auto-nom] BLOCK_CREATE reçu, blockId:'+ e.blockId;
      msg+=' bloc trouvé:', !!bloc;
      msg+=' type:', bloc?.type;
      msg+=' NOM:', bloc?.getFieldValue('NOM');
  qtLog(msg);
  */

  if (!bloc || bloc.type !== 'etat_expert') return;

  const nomActuel = bloc.getFieldValue('NOM');
  /*
  msg='[auto-nom] nomActuel:'+JSON.stringify(nomActuel);
  qtLog(msg);
  */

	// Si NOM déjà renseigné → restauration depuis JSON, on ne touche pas
  if (nomActuel && nomActuel !== '') return;

	// Compter les etat_expert présents (ce bloc inclus)
  const nbEtats = ws.getAllBlocks(false).filter(b => b.type === 'etat_expert').length;
  /*
  msg='[auto-nom] nbEtats:'+ nbEtats;
  qtLog(msg);
  */

	//Auto-nommage
  bloc.setFieldValue('Etat_' + nbEtats, 'NOM');
  /*
  msg='[auto-nom] nom appliqué:'+ bloc.getFieldValue('NOM');
  qtLog(msg);
  */
});

// --------------------------------------------------
// Choix du générateur de code par les boutons dédiés
/*
stm32generator.addEventListener('click', () => {
    generator_type = GeneratorType.STM32_GENERATOR
    runCode();  // met à jour le code généré avec la nouvelle cible
});

arduinogenerator.addEventListener('click', () => {
    generator_type = GeneratorType.ARDUINO_GENERATOR
    runCode();  // met à jour le code généré avec la nouvelle cible
});
*/

// --------------------------------------------------
// Every time the workspace changes state, save the changes to storage.
ws.addChangeListener((e) => {
  // UI events are things like scrolling, zooming, etc.
  // No need to save after one of these.
  if (e.isUiEvent) return;
  
  /*
  qtLog(workspace.compteur_etat);
  qtLog(workspace.customNameCache);
  */
  
  save(ws);
});

// Whenever the workspace changes meaningfully, run the code again.
ws.addChangeListener((e) => {
  // Don't run the code when the workspace finishes loading; we're
  // already running it once when the application starts.
  // Don't run the code during drags; we might have invalid state.
  if (
    e.isUiEvent ||
    e.type == Blockly.Events.FINISHED_LOADING ||
    ws.isDragging()
  ) {
    return;
  }
  runCode();
});


// --------------------------------------------------
// Envoi du code vers Qt
// --------------------------------------------------
////////////////////////////////////////////////////

/**
 * FONCTION POUR LABOTBOX
 * Envoie le code généré à LaBotBox qui se charge de créer les fichiers pour Modelia
 */
function sendGeneratedCode() {
    const code = stm32Generator.workspaceToCode(ws);
    
    // Récupérer le nom de la stratégie depuis le premier bloc
    let nomStrategie = "";
    const topBlocks = ws.getTopBlocks(true);
    
    if (topBlocks.length > 0) {
        const premierBloc = topBlocks[0];
        
        // Vérifier que c'est bien un bloc de type "strategie_expert"
        if (premierBloc.type === 'strategie_expert') {
            nomStrategie = premierBloc.getFieldValue('STRATEGIE_SM');
        }
    }
    
    // Récupérer tous les noms des blocs "etat_expert"
    let listeEtats = [];
    const allBlocks = ws.getAllBlocks(false); // false = inclut les blocs désactivés
    
    for (let i = 0; i < allBlocks.length; i++) {
        const bloc = allBlocks[i];
        if (bloc.type === 'etat_expert') {
            const nomEtat = bloc.getFieldValue('NOM');
            if (nomEtat && nomEtat !== "") {
                listeEtats.push(nomEtat);
            }
        }
    }
    
    // Convertir la liste en chaîne JSON pour l'envoi
    const listeEtatsJSON = JSON.stringify(listeEtats);
    
    if (BlockBotLab && BlockBotLab.processData) {
        // Envoyer le code, le nom de la stratégie ET la liste des états
        BlockBotLab.processData(code, nomStrategie, listeEtatsJSON);
    }
}


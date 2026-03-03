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

  //outputDiv.innerHTML = '';

  //eval(code);
};

// Load the initial state from storage and run the code.
load(ws);
runCode();


//Ajoute le canal de communication avec LaBotBox
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
													qtLog(ws.compteur_etat);
            							return restoreWorkspaceFromJson(ws, json);
										}
								});
            });
        }
    }, 100); // Délai de 100ms
});

//Fonction de debug pour le log au format "chaîne de caractères" (vers la sortie standard de LaBotBox)
function qtLog(message) {
    if (BlockBotLab && BlockBotLab.logJS) {
        BlockBotLab.logJS(message);
    }
}

/*
saveButton.addEventListener('click', () => {
  downloadWorkspace(ws);
});

loadButton.addEventListener('click', () => {
	const fic=savedFile.files[0];
  uploadWorkspace(ws,fic);
});
*/
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
// Callback du bouton "Export"
// Exporte le code généré dans un fichier
/*
exportgenerated.addEventListener('click', () => {
    saveTextFile("FichierCodeExport.cpp", codeDiv.innerText); // TODO : mettre le bon nom du fichier de sortie
});
*/

// --------------------------------------------------
// Every time the workspace changes state, save the changes to storage.
ws.addChangeListener((e) => {
  // UI events are things like scrolling, zooming, etc.
  // No need to save after one of these.
  if (e.isUiEvent) return;
  
  //qtLog(workspace.compteur_etat);
  //qtLog(workspace.customNameCache);
  
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

/*
// --------------------------------------------------
// Envoi du code vers Qt
// --------------------------------------------------
////////////////////////////////////////////////////
function sendGeneratedCode() {
    const code = stm32Generator.workspaceToCode(ws);
    if (BlockBotLab && BlockBotLab.processData) {
        BlockBotLab.processData(code);
    }
}
*/
// --------------------------------------------------
// Envoi du code vers Qt
// --------------------------------------------------
////////////////////////////////////////////////////
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

// --------------------------------------------------
// Sauvegarde du code généré dans un fichier texte
// --------------------------------------------------
////////////////////////////////////////////////////
/**
 * writeTextFile write data to file on hard drive
 * @param  string  filename   The name of the file to generate
 * @param  sring   data     Data to be written
 */
 /*
function saveTextFile(filename, data) {
    const blob = new Blob([data], {type: 'text/plain;charset=utf-8'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}
*/

function setupWorkspaceClearListener(workspace) {
  workspace.addChangeListener(function(event) {
    if (event.type === Blockly.Events.FINISHED_LOADING && 
        workspace.getAllBlocks().length === 0) {
      // Le workspace a été vidé
      workspace.compteur_etat = 0;
      workspace.customNameCache = {};
    }
  });
}


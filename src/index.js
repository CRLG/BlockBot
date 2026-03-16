/**
 * Original work Copyright Google LLC
 * Licensed under the Apache License, Version 2.0
 *
 * Modifications Copyright 2026 CRLG
 *
 * This file includes modifications made by CRLG.
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
import {initContextFromLaBotBox} from './blocks/robot_expert';

//########################################################################
//Enregistrement des blocks (avec leur générateur) dans BlockBot
Blockly.common.defineBlocks(blocks);
Blockly.common.defineBlocks(blocks_robot_position);
Blockly.common.defineBlocks(blocks_match);
Blockly.common.defineBlocks(blocks_robot_debutant);
Blockly.common.defineBlocks(blocks_robot_expert);

//Autorise l'ajout de commentaires par clic droit sur la page
Blockly.ContextMenuItems.registerCommentOptions();

//Variable qui va récupérer l'instanciation du QWebChannel
//un Objet QWebChannel est ce qui permet de faire le pont entre une appli C++ Qt, LaBotBox par exemple,
//et le monde Web comme ce javascript de BlockBot ;-)
var BlockBotLab = null;

//########################################################################
// Récupération des éléments d'affichage
const codeDiv = document.getElementById('generatedCode').firstChild;
const outputDiv = document.getElementById('output');
const blocklyDiv = document.getElementById('blocklyDiv');

//La toolbox contient 2 catégories de blocks respectivement accessibles par les débutants et les experts du club
//Selon un mode (choisi dans LaBotBox) une des 2 catégories sera masquée à l'affichage,
//ce qui impose certains mécanismes particuliers comme ce qui suit ==>
//
// Snapshot JSON de la toolbox pris avant Blockly.inject() :
// garantit une définition vierge de la toolbox pour tous les appels ultérieurs à setModeAffichage().
// Blockly transforme l'objet toolbox lors du traitement des shadow blocks (blocks numériques contenus par défaut lors de la création de certains blocks)
// en ajoutant leur identifiant ce qui, sans protection avec un Snapshot, rendrait les copies ultérieures incohérentes avec la toolbox d'origine.
const toolboxJson = JSON.stringify(toolbox);

//########################################################################
//Injection de Blockly et des fonctionnalités choisies (grille, poubelle et zoom)
//dans un workspace qui sera utilisé par la suite.
const ws = Blockly.inject(blocklyDiv,
        {toolbox,
            // Chemin local vers les assets Blockly (icônes, sprites, sons).
            // Sans cette option, Blockly les charge depuis blockly-demo.appspot.com
            // ce qui requiert une connexion internet.
            media: 'media/',
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

//########################################################################
//Choix du langage pour la génération du code
//pour l'instant seul le STM32 est en cours d'implémentation        
const GeneratorType = {
  ARDUINO_GENERATOR: 'ARDUINO_GENERATOR',
  STM32_GENERATOR: 'STM32_GENERATOR'
};
var generator_type = GeneratorType.STM32_GENERATOR;

//########################################################################
/**
 * Gestion de l'affichage des catégories débutant / expert
 *
 * Reconstruit la toolbox en incluant ou excluant les catégories
 * identifiées par leur toolboxitemid.
 *
 * Schématiquement:
 * mode : "débutant" → affiche 'cat_robot_debutant', masque 'cat_robot_expert'
 * mode : "expert"   → affiche 'cat_robot_expert',   masque 'cat_robot_debutant'
 *
 * Explication technique pour la suite:
 * La méthode hideItem/showItem n'existe pas dans toutes les versions de
 * Blockly. La solution universelle est de reconstruire la toolbox en
 * filtrant les catégories via ws.updateToolbox(), en s'appuyant sur le
 * champ toolboxitemid présent dans toolbox.js.
 */
function setModeAffichage(mode) {
  // LaBotBox envoie "debutant"/"expert" (sans accent) ; l'appel interne
  // utilise "débutant" (avec accent). Les deux formes sont acceptées.
  const estDebutant = (mode === 'débutant' || mode === 'debutant');

  // IDs à masquer selon le mode
  const idsAMasquer = estDebutant
    ? ['cat_robot_expert']
    : ['cat_robot_debutant'];

  // Copie vierge depuis le snapshot pris avant inject() — jamais transformée par Blockly
  const toolboxFiltree = JSON.parse(toolboxJson);

	//filtrage de la toolbox
  toolboxFiltree.contents = toolboxFiltree.contents.filter(
    item => !idsAMasquer.includes(item.toolboxitemid)
  );

	//mise à jour du workspace avec la toolbox filtrée
  ws.updateToolbox(toolboxFiltree);
}

//########################################################################
/**
 * Initialisation au démarrage : mode débutant par défaut.
 *
 * updateToolbox() est disponible dès que ws existe, pas besoin
 * d'attendre un événement particulier — on appelle directement
 * après load(ws) + runCode() via un listener one-shot.
 */
(function() {
  let modeInitialise = false;

	// Cas initial: on initialise en mode débutant
	//attention à conserver la cohérence de l'initialisation du combobox dans LaBotBox
  const initMode = () => {
    if (modeInitialise) return;
    modeInitialise = true;
    setModeAffichage('débutant');
  };

  // Cas 1 : workspace avec sauvegarde → le signal FINISHED_LOADING est garanti
  // on peut donc déclencher une action sur l'événement
  const onFinishedLoading = (e) => {
    if (e.type === Blockly.Events.FINISHED_LOADING) {
      ws.removeChangeListener(onFinishedLoading);
      initMode();
    }
  };
  ws.addChangeListener(onFinishedLoading);

  // Cas 2 : workspace vide (premier lancement) → pas de signal FINISHED_LOADING,
  // mais updateToolbox() est utilisable dès le prochain tick du navigateur.
  requestAnimationFrame(initMode);
})();

//########################################################################
/**
 * Génération du code
 *
 * Cette fonction efface le code généré et les affichages
 * montrant ce code dans le workspace et regénère le code dans la foulée.
 */
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

//########################################################################
//Charge l'état initial du workspace à partir du stockage par défaut s'il existe
// et regénère le code
load(ws);
runCode();

//########################################################################
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
														
												// Affichage / masquage du panneau de code genere
												// params vaut "true" (afficher) ou "false" (masquer)
												case 'show_code':
														document.getElementById('outputPane').style.display =
															(params === 'true') ? 'flex' : 'none';
														// Notifie Blockly du changement de taille du workspace
														Blockly.svgResize(ws);
														return;
														
												//gestion de la sauvegarde du projet
												case 'save_project':
													return downloadWorkspace(ws);
													
												//gestion de la restauration de projet
												case 'load_project':
													const json = JSON.parse(params);
            							return restoreWorkspaceFromJson(ws, json);
            						
            						//gestion de l'enrichissement de contexte (pour les listes défilantes des blocks)	
            						case 'servos':
												case 'moteurs':
												case 'state_machine':
												case 'values_servos':
												case 'servos_ax':
												case 'values_servos_ax':
												case 'set_bot_state':
														return initContextFromLaBotBox({ [command]: JSON.parse(params) });

										// Création d'un état XYTheta + convergence depuis un double-clic SimuBot
										case 'add_state_simu':
												return addStatePosFromSimu(JSON.parse(params));
										}
								});
            });
        }
    }, 100); // Délai de 100ms pour éviter l'écrasement des différents ordres
});

//########################################################################
/**
 * FONCTION POUR LABOTBOX
 * Affichage de debug
 *
 * Fonction de debug pour le log au format "chaîne de caractères" (vers la sortie standard de LaBotBox)
 */
function qtLog(message) {
    if (BlockBotLab && BlockBotLab.logJS) {
        BlockBotLab.logJS(message);
    }
}
//on rend la fonction accessible aux autres fichiers .js de blockly pour le debuguage
//à ajouter en tête de fichier pour en profiter ==>
//const log = (msg) => window.qtLog?.(String(msg));
//il faut ensuite juste utiliser log()
window.qtLog = qtLog;

//########################################################################
// TODO: pour l'instant LaBotBox nettoie le cache à son démarrage, à voir si on conserve ce qui suit
/**
 * Sauvegarde automatique du workspace
 *
 * À chaque changement d'état du workspace on enregistrez les modifications dans le stockage par défaut (cache).
 * Bref on appelle save() sur événement
 */
ws.addChangeListener((e) => {
  // UI events are things like scrolling, zooming, etc.
  // No need to save after one of these.
  if (e.isUiEvent) return;

  save(ws);
});

//########################################################################
/**
 * Regénération automatique du code
 *
 * A chaque fois que le workspace change de manière significative on regénère le code
 * Bref on appelle runCode() sur événement
 */
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

//########################################################################
/**
 * FONCTION POUR LABOTBOX
 * Envoi du code vers LaBotBox
 *
 * Envoie le code généré à LaBotBox qui se charge de créer les fichiers pour Modelia
 */
function sendGeneratedCode() {
    const code = stm32Generator.workspaceToCode(ws);
    
    // Récupérer le nom de la stratégie depuis le premier bloc
    let nomStrategie = "";
    const topBlocks = ws.getTopBlocks(true);
    
    // Identifier les débuts d'enchaînement d'états (pour récupérer les noms de tous les états)
    if (topBlocks.length > 0) {
        const premierBloc = topBlocks[0];
        
        // Vérifier que c'est bien un bloc de type "state_machine_expert"
        if (premierBloc.type === 'state_machine_expert') {
            nomStrategie = premierBloc.getFieldValue('NOM_SM');
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
    
    //envoi le code à LaBotBox grâce au pont
    if (BlockBotLab && BlockBotLab.processData) {
        // Envoyer le code, le nom de la stratégie ET la liste des états
        BlockBotLab.processData(code, nomStrategie, listeEtatsJSON);
    }
}

//########################################################################
/**
 * FONCTION POUR LABOTBOX — SimuBot
 * Retourne le dernier bloc du type donné dont nextConnection est libre.
 * Utilisé pour chaîner un nouveau bloc à la fin d'une séquence existante.
 *
 * @param  {string} blockType  Type Blockly du bloc cible (ex. 'etat_expert')
 * @returns {Blockly.Block|null}
 */
function findLastUnconnectedBlock(blockType) {
    var ws = Blockly.getMainWorkspace();
    var last = null;
    ws.getAllBlocks(false)
      .filter(function(b) { return b.type === blockType; })
      .forEach(function(b) {
          if (b.nextConnection && !b.nextConnection.targetBlock()) {
              last = b;
          }
      });
    return last;
}

//########################################################################
/**
 * FONCTION POUR LABOTBOX — SimuBot
 * Crée un triplet (etat_expert + set_pos XYTheta + convergence_expert) depuis
 * les coordonnées transmises par CSimuBot via la commande "add_state_simu",
 * et le connecte au dernier état libre de la chaîne de la machine à états.
 *
 * Ordre de câblage :
 *   set_pos(XYT, x, y, theta) → DESCR de l'état
 *   convergence_expert(timeout ms) → TRANS de l'état
 *   état → nextConnection du dernier etat_expert existant
 *
 * @param {Object} data  { x: number, y: number, theta: number, timeout: number }
 */
function addStatePosFromSimu(data) {
    var ws = Blockly.getMainWorkspace();

    // ── 0. Chercher le dernier état libre AVANT de créer les nouveaux blocs ─
    // IMPORTANT : doit être appelé ici, avant tout ws.newBlock() / initSvg().
    // Si appelé après, findLastUnconnectedBlock() trouverait le stateBlock
    // qu'on vient de créer et tenterait de le connecter à lui-même (Blockly
    // détecte le cycle et ignore silencieusement la connexion).
    var lastState = findLastUnconnectedBlock('etat_expert');

    // ── 1. Bloc état ──────────────────────────────────────────────────────
    var stateBlock = ws.newBlock('etat_expert');
    stateBlock.initSvg();
    stateBlock.render();

    // ── 2. Bloc action set_pos XYTheta ────────────────────────────────────
    var actionBlock = ws.newBlock('set_pos');
    actionBlock.initSvg();
    actionBlock.render();
    // Passage en mode XYT après initSvg() pour déclencher l'extension set_pos_mode
    // et rendre visible les 3 entrées VAL1 / VAL2 / VAL3
    actionBlock.setFieldValue('XYT', 'MODE');

    // Connexion des valeurs numériques X, Y, Theta sur les entrées VAL1/VAL2/VAL3
    [
        { input: 'VAL1', value: data.x     },
        { input: 'VAL2', value: data.y     },
        { input: 'VAL3', value: Math.round(data.theta * 100) / 100 }
    ].forEach(function(v) {
        var numBlock = ws.newBlock('math_number');
        numBlock.setFieldValue(String(v.value), 'NUM');
        numBlock.initSvg();
        numBlock.render();
        var inp = actionBlock.getInput(v.input);
        if (inp && inp.connection && numBlock.outputConnection) {
            inp.connection.connect(numBlock.outputConnection);
        }
    });

    // ── 3. Bloc transition convergence + timeout ───────────────────────────
    var transBlock = ws.newBlock('convergence_expert');
    transBlock.setFieldValue(String(data.timeout), 'VALEUR');
    transBlock.setFieldValue('MSEC', 'UNITES');
    transBlock.initSvg();
    transBlock.render();

    // ── 4. Câblage interne : action dans DESCR, transition dans TRANS ──────
    var descrInput = stateBlock.getInput('DESCR');
    if (descrInput && descrInput.connection && actionBlock.previousConnection) {
        descrInput.connection.connect(actionBlock.previousConnection);
    }
    var transInput = stateBlock.getInput('TRANS');
    if (transInput && transInput.connection && transBlock.previousConnection) {
        transInput.connection.connect(transBlock.previousConnection);
    }

    // ── 5. Connexion au dernier état libre de la chaîne ────────────────────
    if (lastState && lastState.nextConnection && stateBlock.previousConnection) {
        // Cas 1 : au moins un état existait avant cet appel → connecter en fin de chaîne
        lastState.nextConnection.connect(stateBlock.previousConnection);
    } else {
        // Cas 2 : workspace vide → créer un state_machine_expert enveloppant
        var smBlock = ws.newBlock('state_machine_expert');
        smBlock.initSvg();
        smBlock.render();
        smBlock.moveBy(50, 50);
        var smDescr = smBlock.getInput('DESCR');
        if (smDescr && smDescr.connection && stateBlock.previousConnection) {
            smDescr.connection.connect(stateBlock.previousConnection);
        } else {
            stateBlock.moveBy(50, 150);
        }
    }

    ws.render();
}


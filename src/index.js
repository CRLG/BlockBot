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
import {javascriptGenerator, Order as OrderJS} from 'blockly/javascript';
import {save, load} from './serialization';
import {downloadWorkspace, uploadWorkspace, restoreWorkspaceFromJson, mergeWorkspaceFromJson} from './save_ws';
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

            						// Fusion d'un fragment de projet dans le workspace courant (sans effacement)
            						case 'import_project':
            								const importJson = JSON.parse(params);
            								return mergeWorkspaceFromJson(ws, importJson);

            						//gestion de l'enrichissement de contexte (pour les listes défilantes des blocks)	
            						case 'servos':
												case 'moteurs':
												case 'state_machine':
												case 'values_servos':
												case 'servos_ax':
												case 'values_servos_ax':
											case 'set_bot_state':
											case 'switch':
														return initContextFromLaBotBox({ [command]: JSON.parse(params) });

										// Création d'un état XYTheta + convergence depuis un double-clic SimuBot (mode expert)
										case 'add_state_simu':
												return addStatePosFromSimu(JSON.parse(params));

										// Création d'un triplet set_angle/avancer/set_angle depuis un double-clic SimuBot (mode débutant)
										case 'add_pos_simu_debutant':
												return addPosSimuDebutant(JSON.parse(params));

										// ── Commandes HIL (Hardware In the Loop) ──────────────────
										// Demande l'état de départ pour le HIL (sélectionné ou premier de la chaîne)
										case 'get_hil_start_state':
												return sendHILStartState();

										// Demande la description (actions + transitions) d'un état précis
										case 'get_hil_state':
												return sendHILState(params);

										// Demande l'action unique sélectionnée dans le workspace
										case 'export_hil_single_action':
												return sendHILSingleAction();

										// Surligne le bloc etat_expert correspondant au nom donné
										case 'highlight_hil_state':
												return highlightHILState(params);

										// Efface tout surlignage HIL
										case 'clear_hil_highlight':
												return clearHILHighlight();

										// Init condition si_vrai_expert (blockId du bloc si_vrai_expert)
										case 'hil_logic_init':
												return sendHILLogicInit(params);

										// Tick d'evaluation : snapshot DM JSON -> resultat booleen
										case 'hil_logic_tick':
												return evalHILLogicTick(params);
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

//########################################################################
/**
 * FONCTION POUR LABOTBOX — SimuBot (mode débutant)
 * Crée un triplet (set_angle_robot angle + avancer distance + set_angle_robot teta_pos)
 * depuis les paramètres transmis par CSimuBot via la commande "add_pos_simu_debutant",
 * et le connecte au dernier bloc libre de la chaîne DESCR du bloc description_debutant.
 * Si aucun bloc description_debutant n'existe, il est créé et positionné en haut à gauche.
 *
 * Ordre des blocs créés :
 *   1. set_angle_robot(angle, DEGRES)   — orientation vers la cible
 *   2. avancer(distance)               — déplacement vers la cible
 *   3. set_angle_robot(teta, DEGRES)   — retour à l'orientation courante du robot
 *   4. info_debutant                   — commentaire récapitulatif angle/distance/teta
 *
 * Les deux valeurs d'angle sont toujours transmises en degrés par CBlockBotLab
 * (angle normalisé dans catchDoubleClick, teta converti depuis teta_pos DM).
 *
 * @param {Object} data  { angle: number (deg), distance: number, teta: number (deg) }
 */
function addPosSimuDebutant(data) {
    var ws = Blockly.getMainWorkspace();

    // ── 0. Trouver ou créer le bloc description_debutant ─────────────────────
    // IMPORTANT : avant toute création de nouveaux blocs pour que la recherche
    // du dernier bloc de la chaîne ne trouve pas les blocs que l'on va créer.
    var descBlock = null;
    ws.getAllBlocks(false).forEach(function(b) {
        if (b.type === 'description_debutant') { descBlock = b; }
    });

    if (!descBlock) {
        descBlock = ws.newBlock('description_debutant');
        // Ajouter le shadow block nom_tache_sm sur NOM_SM, comme dans la toolbox
        var nomBlock = ws.newBlock('nom_tache_sm');
        nomBlock.setShadow(true);
        nomBlock.initSvg();
        nomBlock.render();
        var nomSmInput = descBlock.getInput('NOM_SM');
        if (nomSmInput && nomSmInput.connection && nomBlock.outputConnection) {
            nomSmInput.connection.connect(nomBlock.outputConnection);
        }
        descBlock.initSvg();
        descBlock.render();
        descBlock.moveBy(50, 50);
    }

    // ── 1. Trouver le dernier bloc de la chaîne dans DESCR ────────────────────
    var lastInChain = null;
    var descrInput = descBlock.getInput('DESCR');
    if (descrInput && descrInput.connection) {
        var cursor = descrInput.connection.targetBlock();
        while (cursor) {
            lastInChain = cursor;
            cursor = cursor.nextConnection ? cursor.nextConnection.targetBlock() : null;
        }
    }

    // ── 2. Bloc set_angle_robot (angle objectif de déplacement) ─────────────
    var angleBlock = ws.newBlock('set_angle_robot');
    var numAngle = ws.newBlock('math_number');
    numAngle.setFieldValue(String(Math.round(data.angle * 100) / 100), 'NUM');
    numAngle.initSvg();
    numAngle.render();
    var angleValInput = angleBlock.getInput('VALEUR');
    if (angleValInput && angleValInput.connection && numAngle.outputConnection) {
        angleValInput.connection.connect(numAngle.outputConnection);
    }
    angleBlock.setFieldValue('DEGRES', 'UNITES');
    angleBlock.initSvg();
    angleBlock.render();

    // ── 3. Bloc avancer (distance objectif de déplacement) ────────────────
    var avancerBlock = ws.newBlock('avancer');
    var numDist = ws.newBlock('math_number');
    numDist.setFieldValue(String(Math.round(data.distance * 100) / 100), 'NUM');
    numDist.initSvg();
    numDist.render();
    var distValInput = avancerBlock.getInput('VALEUR');
    if (distValInput && distValInput.connection && numDist.outputConnection) {
        distValInput.connection.connect(numDist.outputConnection);
    }
    avancerBlock.initSvg();
    avancerBlock.render();

    // ── 4. Bloc set_angle_robot (retour à l'orientation courante teta_pos) ──────────
    var retourBlock = ws.newBlock('set_angle_robot');
    var numTeta = ws.newBlock('math_number');
    numTeta.setFieldValue(String(Math.round(data.teta * 100) / 100), 'NUM');
    numTeta.initSvg();
    numTeta.render();
    var tetaValInput = retourBlock.getInput('VALEUR');
    if (tetaValInput && tetaValInput.connection && numTeta.outputConnection) {
        tetaValInput.connection.connect(numTeta.outputConnection);
    }
    retourBlock.setFieldValue('DEGRES', 'UNITES');
    retourBlock.initSvg();
    retourBlock.render();

    // ── 5. Bloc info_debutant (commentaire récapitulatif du déplacement) ─────────────
    var infoBlock = ws.newBlock('info_debutant');
    infoBlock.setFieldValue(
        'On s\'est déplacé!\n' +
        '(' + String(Math.round(data.angle * 100) / 100) + ' deg' +
        ' puis ' + String(Math.round(data.distance * 100) / 100) + ' cm' +
        ' et enfin ' + String(Math.round(data.teta * 100) / 100) + ' deg)',
        'TEXTE'
    );
    infoBlock.initSvg();
    infoBlock.render();

    // ── 6. Chaîner les 4 blocs entre eux ────────────────────────────────────────────────
    if (angleBlock.nextConnection && avancerBlock.previousConnection) {
        angleBlock.nextConnection.connect(avancerBlock.previousConnection);
    }
    if (avancerBlock.nextConnection && retourBlock.previousConnection) {
        avancerBlock.nextConnection.connect(retourBlock.previousConnection);
    }
    if (retourBlock.nextConnection && infoBlock.previousConnection) {
        retourBlock.nextConnection.connect(infoBlock.previousConnection);
    }

    // ── 7. Connecter au dernier bloc de la chaîne DESCR ou à DESCR directement ─────────
    if (lastInChain && lastInChain.nextConnection && angleBlock.previousConnection) {
        // Cas 1 : des blocs existent déjà dans DESCR — connecter en fin de chaîne
        lastInChain.nextConnection.connect(angleBlock.previousConnection);
    } else if (descrInput && descrInput.connection && angleBlock.previousConnection) {
        // Cas 2 : DESCR est vide — connecter directement à l'entrée DESCR
        descrInput.connection.connect(angleBlock.previousConnection);
    }

    ws.render();
}

//########################################################################
//                     FONCTIONS HIL (Hardware In the Loop)
//########################################################################

// ================================================================
// GENERATEURS JAVASCRIPT pour l'évaluation HIL des conditions
// du bloc si_vrai_expert. Coexistent sans conflit avec les générateurs
// STM32 — chacun est appelé explicitement selon le contexte.
//
// Les valeurs des dropdowns sont les clés DataManager directement :
//   valeur_data  → DM['Etor1'], DM['Eana3'], DM['Vbat'], etc.
//   robot_position → DM['x_pos'], DM['y_pos'], DM['teta_pos']
//   x_robot / y_robot / teta_robot → idem (blocs legacy à output Number)
// ================================================================
javascriptGenerator.forBlock['valeur_data'] = function(block) {
    var key = block.getFieldValue('DATA_VAR');
    return ['DM[\'' + key + '\']', OrderJS.MEMBER];
};
javascriptGenerator.forBlock['robot_position'] = function(block) {
    var key = block.getFieldValue('POSITION');
    return ['DM[\'' + key + '\']', OrderJS.MEMBER];
};
javascriptGenerator.forBlock['x_robot'] = function(block) {
    return ['DM[\'x_pos\']', OrderJS.MEMBER];
};
javascriptGenerator.forBlock['y_robot'] = function(block) {
    return ['DM[\'y_pos\']', OrderJS.MEMBER];
};
javascriptGenerator.forBlock['teta_robot'] = function(block) {
    return ['DM[\'teta_pos\']', OrderJS.MEMBER];
};

// ================================================================
// LOGIQUE HIL — évaluation de la condition booléenne de si_vrai_expert
//
// m_logicFn   : fonction compilée une seule fois à l'init de l'état
// m_logicResult : dernier résultat d'évaluation (non utilisé côté JS,
//                 la valeur est renvoyée directement via processHILExport)
// ================================================================
var m_logicFn = null;
var m_logicResult = false;

//########################################################################
/**
 * FONCTION POUR LABOTBOX — HIL si_vrai_expert
 * Appelée par la commande WebChannel 'hil_logic_init'.
 * Compile la condition booléenne du bloc si_vrai_expert dont l'id est
 * fourni, extrait les clés DataManager nécessaires et les renvoie à
 * CHILEngine via processHILExport("logic_keys", ...).
 *
 * @param {string} blockId  Id Blockly du bloc si_vrai_expert
 */
function sendHILLogicInit(blockId) {
    m_logicFn = null;
    m_logicResult = false;

    var block = ws.getBlockById(blockId);
    if (!block || block.type !== 'si_vrai_expert') {
        qtLog('[HIL] sendHILLogicInit : bloc introuvable ou type incorrect : ' + blockId);
        if (BlockBotLab && BlockBotLab.processHILExport) {
            BlockBotLab.processHILExport('logic_keys', '[]');
        }
        return;
    }

    // Extraction des clés DataManager nécessaires à l'évaluation
    var conditionBlock = block.getInputTargetBlock('CONDITION');
    var keys = extractDMKeys(conditionBlock);

    // Initialisation obligatoire du générateur JS avant tout appel direct à valueToCode
    // (workspaceToCode() l'appelle en interne, mais ici on appelle valueToCode directement)
    javascriptGenerator.init(ws);

    // Génération de l'expression JS via le générateur natif Blockly JS
    var expr = javascriptGenerator.valueToCode(block, 'CONDITION', OrderJS.NONE) || 'false';

    // Compilation unique — new Function('DM', 'return (expr)')
    try {
        m_logicFn = new Function('DM', 'return (' + expr + ');');
    } catch(e) {
        qtLog('[HIL] Erreur compilation condition si_vrai_expert : ' + e.message);
        m_logicFn = function() { return false; };
    }

    if (BlockBotLab && BlockBotLab.processHILExport) {
        BlockBotLab.processHILExport('logic_keys', JSON.stringify(keys));
    }
}

//########################################################################
/**
 * FONCTION POUR LABOTBOX — HIL si_vrai_expert
 * Appelée par la commande WebChannel 'hil_logic_tick'.
 * Évalue la condition compilée avec le snapshot DataManager fourni,
 * renvoie le résultat booléen via processHILExport("logic_result", ...).
 *
 * @param {string} kvMapJson  JSON {"cle": valeur_numerique, ...}
 */
function evalHILLogicTick(kvMapJson) {
    if (!m_logicFn) {
        if (BlockBotLab && BlockBotLab.processHILExport) {
            BlockBotLab.processHILExport('logic_result', 'false');
        }
        return;
    }
    var dm = {};
    try { dm = JSON.parse(kvMapJson); } catch(e) {}
    m_logicResult = !!m_logicFn(dm);
    if (BlockBotLab && BlockBotLab.processHILExport) {
        BlockBotLab.processHILExport('logic_result', m_logicResult ? 'true' : 'false');
    }
}

//########################################################################
/**
 * Helper HIL — extrait récursivement les clés DataManager requises
 * par l'arbre de blocs connecté à l'input CONDITION de si_vrai_expert.
 * Seuls les blocs custom sont traités explicitement ; les blocs natifs
 * Blockly (logic_compare, logic_operation, math_number…) n'ont pas de
 * clé DM propre mais leurs sous-arbres sont parcourus.
 *
 * @param {Blockly.Block|null} block
 * @returns {string[]}  Liste de clés DM dédupliquées
 */
function extractDMKeys(block) {
    var keys = [];
    if (!block) return keys;

    if (block.type === 'valeur_data') {
        // Valeur du dropdown = clé DM directe (Etor1, Eana3, Vbat…)
        keys.push(block.getFieldValue('DATA_VAR'));
    } else if (block.type === 'robot_position') {
        // Valeur du dropdown = clé DM directe (x_pos, y_pos, teta_pos)
        keys.push(block.getFieldValue('POSITION'));
    } else if (block.type === 'x_robot') {
        keys.push('x_pos');
    } else if (block.type === 'y_robot') {
        keys.push('y_pos');
    } else if (block.type === 'teta_robot') {
        keys.push('teta_pos');
    }

    // Parcours récursif de tous les inputs du bloc
    for (var i = 0; i < block.inputList.length; i++) {
        var conn = block.inputList[i].connection;
        if (conn && conn.targetBlock()) {
            var subKeys = extractDMKeys(conn.targetBlock());
            for (var j = 0; j < subKeys.length; j++) {
                keys.push(subKeys[j]);
            }
        }
    }

    // Dédoublonnage
    return keys.filter(function(k, idx, arr) { return arr.indexOf(k) === idx; });
}

//########################################################################
/**
 * FONCTION POUR LABOTBOX — HIL
 * Envoie le nom de l'état de départ au C++ via processHILExport.
 *
 * Priorité :
 *   1. Si un bloc etat_expert est sélectionné dans le workspace → son NOM
 *   2. Sinon → le premier etat_expert de la chaîne (connecté au state_machine_expert)
 *
 * Envoie une chaîne vide si aucun état n'est trouvé.
 */
function sendHILStartState() {
    var startState = '';

    // Priorité 1 : bloc sélectionné de type etat_expert
    // Blockly.getSelected() retourne un ISelectable (pas forcément un block).
    // Vérifier que c'est bien un block avec un champ 'type'.
    var selected = Blockly.getSelected ? Blockly.getSelected() : null;
    if (selected && selected.type === 'etat_expert' && selected.getFieldValue) {
        startState = selected.getFieldValue('NOM') || '';
    }

    // Priorité 2 : premier état de la chaîne
    if (!startState) {
        var allBlocks = ws.getAllBlocks(false);
        for (var i = 0; i < allBlocks.length; i++) {
            var bloc = allBlocks[i];
            if (bloc.type !== 'etat_expert') continue;
            // Tête de chaîne = previousConnection connectée à un state_machine_expert ou non connectée
            var prev = bloc.previousConnection ? bloc.previousConnection.targetBlock() : null;
            if (!prev || prev.type !== 'etat_expert') {
                startState = bloc.getFieldValue('NOM') || '';
                break;
            }
        }
    }

    if (BlockBotLab && BlockBotLab.processHILExport) {
        BlockBotLab.processHILExport('start_state', startState);
    }
}

//########################################################################
/**
 * FONCTION POUR LABOTBOX — HIL
 * Sérialise un état précis (actions + transitions) en JSON et l'envoie au C++.
 *
 * Le JSON produit contient :
 *   - nom : nom de l'état
 *   - actions : tableau d'objets décrivant chaque bloc action
 *   - transitions : tableau d'objets décrivant chaque bloc transition
 *
 * Les blocs action_perso et transition_perso sont inclus avec ignored:true.
 *
 * @param {string} nomEtat  Nom de l'état recherché (champ NOM du bloc etat_expert)
 */
function sendHILState(nomEtat) {
    var result = { nom: nomEtat, actions: [], transitions: [] };

    // Trouver le bloc etat_expert correspondant
    var stateBlock = null;
    var allBlocks = ws.getAllBlocks(false);
    for (var i = 0; i < allBlocks.length; i++) {
        if (allBlocks[i].type === 'etat_expert' && allBlocks[i].getFieldValue('NOM') === nomEtat) {
            stateBlock = allBlocks[i];
            break;
        }
    }

    if (!stateBlock) {
        qtLog('[HIL] Etat introuvable : ' + nomEtat);
        if (BlockBotLab && BlockBotLab.processHILExport) {
            BlockBotLab.processHILExport('state', '');
        }
        return;
    }

    // ── Extraction des actions (chaîne DESCR) ────────────────────────────
    var descrInput = stateBlock.getInput('DESCR');
    if (descrInput && descrInput.connection) {
        var cursor = descrInput.connection.targetBlock();
        while (cursor) {
            result.actions.push(extractActionHIL(cursor));
            cursor = cursor.nextConnection ? cursor.nextConnection.targetBlock() : null;
        }
    }

    // ── Extraction des transitions (chaîne TRANS) ────────────────────────
    var transInput = stateBlock.getInput('TRANS');
    if (transInput && transInput.connection) {
        var cursor = transInput.connection.targetBlock();
        while (cursor) {
            result.transitions.push(extractTransitionHIL(cursor));
            cursor = cursor.nextConnection ? cursor.nextConnection.targetBlock() : null;
        }
    }

    if (BlockBotLab && BlockBotLab.processHILExport) {
        BlockBotLab.processHILExport('state', JSON.stringify(result));
    }
}

//########################################################################
/**
 * Extrait les paramètres HIL d'un bloc action.
 * Retourne un objet JSON décrivant l'action pour CHILEngine.
 *
 * @param {Blockly.Block} block  Bloc action (TYPE_ACTION)
 * @returns {Object}
 */
function extractActionHIL(block) {
    switch (block.type) {
        case 'set_servo_expert':
            return {
                type: 'set_servo_expert',
                id:    Number(block.getFieldValue('SERVO_VAL')),
                pos:   Number(block.getFieldValue('SERVO_POS_VAL')),
                speed: Number(block.getFieldValue('SERVO_VIT'))
            };

        case 'set_ax_expert':
            return {
                type: 'set_ax_expert',
                id:  Number(block.getFieldValue('SERVO_AX_VAL')),
                pos: Number(block.getFieldValue('AX_POS_VAL'))
            };

        case 'set_motor':
            return {
                type: 'set_motor',
                id:  Number(block.getFieldValue('MOTOR_VAL')),
                pwm: Number(block.getFieldValue('MOTOR_PWM'))
            };

        case 'set_switch':
            return {
                type: 'set_switch',
                id:   Number(block.getFieldValue('SWITCH_VAL')),
                etat: Number(block.getFieldValue('SWITCH_ETAT'))
            };

        case 'set_pos': {
            // VAL1/VAL2/VAL3 sont des input_value — extraire la valeur du shadow math_number connecté
            var val1 = getInputNumberValue(block, 'VAL1');
            var val2 = getInputNumberValue(block, 'VAL2');
            var val3 = getInputNumberValue(block, 'VAL3');
            return {
                type: 'set_pos',
                mode: block.getFieldValue('MODE'),
                val1: val1,
                val2: val2,
                val3: val3
            };
        }

        case 'set_pos_static': {
            var val1 = getInputNumberValue(block, 'VAL1');
            var val2 = getInputNumberValue(block, 'VAL2');
            var val3 = getInputNumberValue(block, 'VAL3');
            return {
                type: 'set_pos_static',
                val1: val1,
                val2: val2,
                val3: val3
            };
        }

        case 'action_perso':
            return { type: 'action_perso', ignored: true };

        default:
            return { type: block.type, ignored: true };
    }
}

//########################################################################
/**
 * Extrait les paramètres HIL d'un bloc transition.
 * Retourne un objet JSON décrivant la transition pour CHILEngine.
 *
 * @param {Blockly.Block} block  Bloc transition (TYPE_TRANSITION)
 * @returns {Object}
 */
function extractTransitionHIL(block) {
    switch (block.type) {
        case 'attendre_expert':
        case 'convergence_expert':
        case 'convergence_rapide_expert': {
            var unites = block.getFieldValue('UNITES');
            var valeur = Number(block.getFieldValue('VALEUR'));
            var timeoutMs = (unites === 'SEC') ? valeur * 1000 : valeur;
            return {
                type:       block.type,
                timeout_ms: timeoutMs,
                etat_cible: block.getFieldValue('NEXT_STATE') || 'FIN_MISSION'
            };
        }

        case 'si_vrai_expert': {
            var unitesSV = block.getFieldValue('UNITES');
            var valeurSV = Number(block.getFieldValue('VALEUR'));
            var timeoutMsSV = (unitesSV === 'SEC') ? valeurSV * 1000 : valeurSV;
            return {
                type:       'si_vrai_expert',
                blockId:    block.id,
                etat_cible: block.getFieldValue('NEXT_STATE') || 'FIN_MISSION',
                timeout_ms: timeoutMsSV
            };
        }

        case 'transition_perso':
            return { type: 'transition_perso', ignored: true };

        default:
            return { type: block.type, ignored: true };
    }
}

//########################################################################
/**
 * Helper : récupère la valeur numérique d'un input_value connecté à un math_number.
 * Retourne 0 si l'input est vide ou non numérique.
 *
 * @param {Blockly.Block} block      Bloc parent
 * @param {string}        inputName  Nom de l'input_value
 * @returns {number}
 */
function getInputNumberValue(block, inputName) {
    var input = block.getInput(inputName);
    if (!input || !input.connection) return 0;
    var target = input.connection.targetBlock();
    if (!target) return 0;
    // Shadow ou bloc math_number
    if (target.type === 'math_number') {
        return Number(target.getFieldValue('NUM')) || 0;
    }
    // Autre type de bloc connecté — on ne peut pas évaluer en HIL
    return 0;
}

//########################################################################
/**
 * FONCTION POUR LABOTBOX — HIL
 * Envoie la description de l'action sélectionnée dans le workspace.
 * Si le bloc sélectionné n'est pas un bloc action (TYPE_ACTION), envoie une chaîne vide.
 */
function sendHILSingleAction() {
    // Blockly.getSelected() retourne un ISelectable (pas forcément un block).
    var selected = Blockly.getSelected ? Blockly.getSelected() : null;

    if (!selected || !selected.type) {
        if (BlockBotLab && BlockBotLab.processHILExport) {
            BlockBotLab.processHILExport('single_action', '');
        }
        return;
    }

    // Vérifier que le bloc est un bloc action (TYPE_ACTION)
    var actionTypes = [
        'set_servo_expert', 'set_ax_expert', 'set_motor',
        'set_switch', 'set_pos', 'set_pos_static', 'action_perso'
    ];
    if (actionTypes.indexOf(selected.type) === -1) {
        if (BlockBotLab && BlockBotLab.processHILExport) {
            BlockBotLab.processHILExport('single_action', '');
        }
        return;
    }

    var actionJson = JSON.stringify(extractActionHIL(selected));
    if (BlockBotLab && BlockBotLab.processHILExport) {
        BlockBotLab.processHILExport('single_action', actionJson);
    }
}

//########################################################################
/**
 * FONCTION POUR LABOTBOX — HIL
 * Surligne le bloc etat_expert dont le champ NOM vaut nomEtat.
 * Utilise l'API Blockly highlightBlock() pour le feedback visuel.
 *
 * @param {string} nomEtat  Nom de l'état à surligner
 */
function highlightHILState(nomEtat) {
    var allBlocks = ws.getAllBlocks(false);
    for (var i = 0; i < allBlocks.length; i++) {
        if (allBlocks[i].type === 'etat_expert' && allBlocks[i].getFieldValue('NOM') === nomEtat) {
            ws.highlightBlock(allBlocks[i].id);
            return;
        }
    }
}

//########################################################################
/**
 * FONCTION POUR LABOTBOX — HIL
 * Efface tout surlignage HIL dans le workspace.
 */
function clearHILHighlight() {
    // highlightBlock avec id vide efface tous les surlignages
    ws.highlightBlock('');
    // Nettoyage de la condition si_vrai_expert éventuellement compilée
    m_logicFn = null;
    m_logicResult = false;
}


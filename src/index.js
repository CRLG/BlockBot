/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {blocks} from './blocks/text';
import {blocks_robot_position} from './blocks/robot_position';
import {stm32Generator} from './generators/stm32';
import {arduinoGenerator} from './generators/arduino';
import {save, load} from './serialization';
import {downloadWorkspace, uploadWorkspace} from './save_ws';
import {toolbox} from './toolbox';
import './index.css';

// Register the blocks and generator with Blockly
Blockly.common.defineBlocks(blocks);
Blockly.common.defineBlocks(blocks_robot_position);

// Autorise l'ajout de commentaires par clic droit sur la page
Blockly.ContextMenuItems.registerCommentOptions();

// Set up UI elements and inject Blockly
const codeDiv = document.getElementById('generatedCode').firstChild;
const outputDiv = document.getElementById('output');
const blocklyDiv = document.getElementById('blocklyDiv');
const buttonsDiv = document.getElementById('buttons');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const savedFile =document.getElementById('fileInput');
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

saveButton.addEventListener('click', () => {
  downloadWorkspace(ws);
});

loadButton.addEventListener('click', () => {
	const fic=savedFile.files[0];
  uploadWorkspace(ws,fic);
});

// --------------------------------------------------
// Choix du générateur de code par les boutons dédiés
stm32generator.addEventListener('click', () => {
    generator_type = GeneratorType.STM32_GENERATOR
    runCode();  // met à jour le code généré avec la nouvelle cible
});

arduinogenerator.addEventListener('click', () => {
    generator_type = GeneratorType.ARDUINO_GENERATOR
    runCode();  // met à jour le code généré avec la nouvelle cible
});

// --------------------------------------------------
// Callback du bouton "Export"
// Exporte le code généré dans un fichier
exportgenerated.addEventListener('click', () => {
    saveTextFile("FichierCodeExport.cpp", codeDiv.innerText); // TODO : mettre le bon nom du fichier de sortie
});


// --------------------------------------------------
// Every time the workspace changes state, save the changes to storage.
ws.addChangeListener((e) => {
  // UI events are things like scrolling, zooming, etc.
  // No need to save after one of these.
  if (e.isUiEvent) return;
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
// Sauvegarde du code généré dans un fichier texte
// --------------------------------------------------
////////////////////////////////////////////////////
/**
 * writeTextFile write data to file on hard drive
 * @param  string  filename   The name of the file to generate
 * @param  sring   data     Data to be written
 */
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


/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {blocks} from './blocks/text';
import {stm32Generator} from './generators/stm32';
import {arduinoGenerator} from './generators/arduino';
import {save, load} from './serialization';
import {downloadWorkspace, uploadWorkspace} from './save_ws';
import {toolbox} from './toolbox';
import './index.css';

// Register the blocks and generator with Blockly
Blockly.common.defineBlocks(blocks);

// Set up UI elements and inject Blockly
const codeDiv = document.getElementById('generatedCode').firstChild;
const outputDiv = document.getElementById('output');
const blocklyDiv = document.getElementById('blocklyDiv');
const buttonsDiv = document.getElementById('buttons');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const savedFile =document.getElementById('fileInput');
const ws = Blockly.inject(blocklyDiv, {toolbox});

const GeneratorType = {
  ARDUINO_GENERATOR: 'ARDUINO_GENERATOR',
  STM32_GENERATOR: 'STM32_GENERATOR'
};
const generator_type = GeneratorType.STM32_GENERATOR;

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

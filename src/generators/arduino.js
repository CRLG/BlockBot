/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';

export const arduinoGenerator = new Blockly.CodeGenerator('Arduino');


arduinoGenerator.forBlock['controls_if'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  return 'arduino my code string for controls_if';
};


arduinoGenerator.forBlock['logic_compare'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  return 'arduino my code string for logic_compare';
};

arduinoGenerator.forBlock['variables_set'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  return 'arduino unsigned int Toto=0;';
};

// ... faire tous les autres blocs que l'on veut mettre à disposition


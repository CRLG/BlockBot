/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';

export const cGenerator = new Blockly.CodeGenerator('C');


cGenerator.forBlock['controls_if'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  return 'my code string for controls_if';
};


cGenerator.forBlock['logic_compare'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  return 'my code string for logic_compare';
};

cGenerator.forBlock['variables_set'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  return 'unsigned int Toto=0;';
};

// ... faire tous les autres blocs que l'on veut mettre à disposition


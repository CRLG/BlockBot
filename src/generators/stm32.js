/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';

export const stm32Generator = new Blockly.CodeGenerator('STM32');


stm32Generator.forBlock['controls_if'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  return 'my code string for controls_if';
};


stm32Generator.forBlock['logic_compare'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  return 'my code string for logic_compare';
};

stm32Generator.forBlock['variables_set'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  return 'unsigned int Toto=0;';
};

// ... faire tous les autres blocs que l'on veut mettre à disposition


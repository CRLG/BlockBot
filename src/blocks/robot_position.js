/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

// Compteur global pour les noms automatiques
let compteur_etat = 0;

// Create a custom block called 'add_text' that adds
// text to the output div on the sample app.
// This is just an example and you should replace this with your
// own custom blocks.

const x_robot = {
  "type": "x_robot",
  "message0": "x_robot",
  "output": "Number",
  "colour": 230,
  "tooltip": "Position X du robot [cm]",
  "helpUrl": ""
};

const y_robot = {
  "type": "y_robot",
  "message0": "y_robot",
  "output": "Number",
  "colour": 230,
  "tooltip": "Position Y du robot [cm]",
  "helpUrl": ""
};

const teta_robot = {
  "type": "teta_robot",
  "message0": "teta_robot",
  "output": "Number",
  "colour": 230,
  "tooltip": "Position Teta du robot [rad]",
  "helpUrl": ""
};

const robot_position = {
    "type": "robot_position",
    "message0": "Position %1",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "POSITION",
        "options": [
          ["x_robot", "X_ROBOT"],
          ["y_robot", "Y_ROBOT"],
          ["teta_robot", "TETA_ROBOT"],
        ]
      }
    ],
    "output": "Number",
    "colour": 230,
    "tooltip": "Position du robot",
    "helpUrl": ""
};


// Votre déclaration JSON originale avec l'extension
const deplacement_x_y_teta = {
  "type": "deplacement_x_y_teta",
  "tooltip": "",
  "helpUrl": "",
  "message0": "DEPLACEMENT X %1 Y %2 ANGLE %3 %4",
  "args0": [
    {
      "type": "input_value",
      "name": "X",
      "check": "Number"
    },
    {
      "type": "input_value",
      "name": "Y",
      "check": "Number"
    },
    {
      "type": "input_value",
      "name": "ANGLE",
      "check": "Number"
    },
    {
      "type": "field_input",
      "name": "NOM",
      "text": "",
      "visible": false
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 330,
  "inputsInline": true,
  "extensions": ["auto_name_state"]
};

// Enregistrer l'extension AVANT de créer le bloc
Blockly.Extensions.register('auto_name_state', function() {
  compteur_etat++;
  this.setFieldValue("Etat_" + compteur_etat, "NOM");
});

// Créer le bloc à partir du JSON
Blockly.defineBlocksWithJsonArray([deplacement_x_y_teta]);

// Create the block definitions for the JSON-only blocks.
// This does not register their definitions with Blockly.
// This file has no side effects!
export const blocks_robot_position = Blockly.common.createBlockDefinitionsFromJsonArray([
  x_robot,
  y_robot,
  teta_robot,
  robot_position,
  deplacement_x_y_teta
 ]);

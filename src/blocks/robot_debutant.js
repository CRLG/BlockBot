/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

// Create a custom block called 'add_text' that adds
// text to the output div on the sample app.
// This is just an example and you should replace this with your
// own custom blocks.

const robot_debutant = {
  "type": "description_debutant",
  "message0": "%1 %2 %3",
  "args0": [
    {
      "type": "field_label_serializable",
      "name": "NAME",
      "text": "Comportement Robot (débutant)"
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "input_statement",
      "name": "DESCR"
    }
  ],
  "colour": 230,
  "tooltip": "",
  "helpUrl": ""
};


const deplacement_robot_lineaire = {
  "type": "deplacement_robot_lineaire",
  "message0": "Déplacement %1 de %2 [cm]",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "MOUVEMENT",
      "options": [
        [
          "avant",
          "AVANT"
        ],
        [
          "arrière",
          "ARRIERE"
        ]
      ]
    },
    {
      "type": "input_value",
      "name": "VALEUR"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 230,
  "tooltip": "Commande de déplacement du robot",
  "helpUrl": ""
};

const set_angle_robot = {
  "type": "set_angle_robot",
  "message0": "Angle de %1 %2",
  "args0": [
    {
      "type": "input_value",
      "name": "VALEUR"
    },
    {
      "type": "field_dropdown",
      "name": "UNITES",
      "options": [
        [
          "deg",
          "DEGRES"
        ],
        [
          "rad",
          "RADIANS"
        ]
      ]
    },        
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 230,
  "tooltip": "Commande de position angulaire du robot",
  "helpUrl": ""
};


const attendre = {
  "type": "attendre",
  "message0": "Attendre %1 %2",
  "args0": [
    {
      "type": "input_value",
      "name": "VALEUR"
    },
    {
      "type": "field_dropdown",
      "name": "UNITES",
      "options": [
        [
          "msec",
          "MSEC"
        ],
        [
          "sec",
          "SEC"
        ]
      ]
    },        
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 100,
  "tooltip": "Attendre",
  "helpUrl": ""
};

const attendre_tirette = {
  "type": "attendre_tirette",
  "message0": "Attendre Tirette %1",
  "args0": [
    {
      "type": "input_end_row"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 100,
  "tooltip": "Attendre la tirette",
  "helpUrl": ""
};


const attendre_condition = {
  "type": "attendre_condition",
  "message0": "Attendre condition %1 %2",
  "args0": [
    {
      "type": "input_value",
      "name": "CONDITION"
    },
    {
      "type": "field_dropdown",
      "name": "VRAI_FAUX",
      "options": [
        [
          "vrai",
          "VRAI"
        ],
        [
          "faux",
          "FAUX"
        ]
      ]
    },        
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 100,
  "tooltip": "Attendre",
  "helpUrl": ""
};


const robot_object = {
  "type": "object",
  "message0": "{ %1 %2 }",
  "args0": [
    {
      "type": "input_dummy"
    },
    {
      "type": "input_statement",
      "name": "MEMBERS"
    }
  ],
  "output": null,
  "colour": 230,
};



// Create the block definitions for the JSON-only blocks.
// This does not register their definitions with Blockly.
// This file has no side effects!
export const blocks_robot_debutant = Blockly.common.createBlockDefinitionsFromJsonArray([
  robot_debutant,
  deplacement_robot_lineaire,
  set_angle_robot,
  attendre,
  attendre_tirette,
  attendre_condition,
  robot_object
 ]);

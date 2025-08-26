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

const tirette = {
  "type": "tirette",
  "message0": "tirette",
  "output": "Boolean",
  "colour": 230,
  "tooltip": "Tirette début match",
  "helpUrl": ""
};

const temps_match = {
  "type": "temps_match",
  "message0": "temps_match",
  "output": "Number",
  "colour": 230,
  "tooltip": "Durée du match [msec]",
  "helpUrl": ""
};

const couleur_equipe = {
  "type": "couleur_equipe",
  "message0": "couleur_equipe",
  "output": "Number",
  "colour": 230,
  "tooltip": "Couleur d'équipe (0 ou 1)",
  "helpUrl": ""
};

const active_inhibe_detection_obstacle = {
  "type": "active_inhibe_detection_obstacle",
  "message0": "%1 détection d'obstacle",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "ACTIVE_INHIBE_DETECTION",
      "options": [
          ["active", "ACTIVE"],
          ["inhibe", "INHIBE"],
      ]
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 230,
  "tooltip": "Active ou inhibe la détectin d'obstacle",
  "helpUrl": ""
};


// Create the block definitions for the JSON-only blocks.
// This does not register their definitions with Blockly.
// This file has no side effects!
export const blocks_match = Blockly.common.createBlockDefinitionsFromJsonArray([
  tirette,
  temps_match,
  couleur_equipe,
  active_inhibe_detection_obstacle
 ]);

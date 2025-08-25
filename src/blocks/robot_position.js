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

// Create the block definitions for the JSON-only blocks.
// This does not register their definitions with Blockly.
// This file has no side effects!
export const blocks_robot_position = Blockly.common.createBlockDefinitionsFromJsonArray([
  x_robot,
  y_robot,
  teta_robot,
  robot_position
 ]);

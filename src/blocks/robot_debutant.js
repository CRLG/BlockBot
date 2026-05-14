/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

// ___________________________________________
const nom_tache_sm = {
  "type": "nom_tache_sm",
  "message0": "Tache %1 %2",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "NOM_TACHE_SM",
      "options": [
        [
          "SM_Tache1",
          "SM_TACHE1"
        ],
        [
          "SM_Tache2",
          "SM_TACHE2"
        ],
        [
          "SM_Tache3",
          "SM_TACHE3"
        ],
        [
          "SM_Tache4",
          "SM_TACHE4"
        ],
        [
          "SM_Tache5",
          "SM_TACHE5"
        ],
        [
          "SM_Tache6",
          "SM_TACHE6"
        ],
        [
          "SM_Tache7",
          "SM_TACHE7"
        ],
        [
          "SM_Tache8",
          "SM_TACHE8"
        ],
        [
          "SM_Tache9",
          "SM_TACHE9"
        ],
        [
          "SM_Tache10",
          "SM_TACHE10"
        ],
        [
          "SM_TacheAvantMatch",
          "SM_TACHE_AVANT_MATCH"
        ],
        [
          "SM_TachePostMatch",
          "SM_TACHE_POST_MATCH"
        ]
      ]
    },
    {
      "type": "input_end_row"
    }
  ],
  "output": null,
  "colour": 285,
  "tooltip": "Choix de la tâche",
  "helpUrl": ""
};

// ___________________________________________
const robot_debutant = {
  "type": "description_debutant",
  "message0": "Tâche Robot (débutant) %1 %2 %3",
  "args0": [
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "NOM_SM",
      "check": "nom_tache_sm",
    },
    {
      "type": "input_statement",
      "name": "DESCR"
    }
  ],
  "inputsInline": true,
  "colour": 230,
  "tooltip": "",
  "helpUrl": ""
};

// ___________________________________________
const activer_tache = {
  "type": "activer_tache",
  "message0": "Activer tâche %1 %2",
  "args0": [
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "NOM_SM",
      "check": "nom_tache_sm",
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 285,
  "tooltip": "Active une tâche",
  "helpUrl": ""
};

// ___________________________________________
const arreter_tache = {
  "type": "arreter_tache",
  "message0": "Arrêter tâche %1 %2",
  "args0": [
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "NOM_SM",
      "check": "nom_tache_sm",
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 285,
  "tooltip": "Arrête une tâche",
  "helpUrl": ""
};

const reboucler_vers_etape = {
  "type": "reboucler_vers_etape",
  "message0": "Reboucler à l'étape %1",
  "args0": [
    {
      "type": "input_value",
      "name": "ETAPE"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 285,
  "tooltip": "Reboucler à une étape",
  "helpUrl": ""
};

const aller_vers_etape_si_condition = {
  "type": "aller_vers_etape_si_condition",
  "message0": "Aller à l'étape %1 si la condition %2 est %3",
  "args0": [
    {
      "type": "input_value",
      "name": "ETAPE"
    },
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
  "colour": 285,
  "tooltip": "Aller à une étape si condition, passer à la suite sinon",
  "helpUrl": ""
};

// ___________________________________________
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
  "colour": 1,
  "tooltip": "Commande de déplacement du robot",
  "helpUrl": ""
};

// ___________________________________________
const avancer = {
  "type": "avancer",
  "message0": "Avancer de %1 [cm]",
  "args0": [
    {
      "type": "input_value",
      "name": "VALEUR"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 1,
  "tooltip": "Commande de déplacement en avant",
  "helpUrl": ""
};

const reculer = {
  "type": "reculer",
  "message0": "Reculer de %1 [cm]",
  "args0": [
    {
      "type": "input_value",
      "name": "VALEUR"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 1,
  "tooltip": "Commande de déplacement en arrière",
  "helpUrl": ""
};

// ___________________________________________
const se_deplacer_en_position = {
  "type": "se_deplacer_en_position",
  "message0": "Aller en X=%1 / Y=%2 avec l'angle Teta=%3 %4",
  "args0": [
    {
      "type": "input_value",
      "name": "X"
    },
    {
      "type": "input_value",
      "name": "Y"
    },
    {
      "type": "input_value",
      "name": "TETA"
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
    }  
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 1,
  "tooltip": "Se rendre à la position X, Y avec l'angle Teta",
  "helpUrl": ""
};
// ___________________________________________
const set_angle_robot = {
  "type": "set_angle_robot",
  "message0": "S'orienter à %1 %2",
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
  "colour": 1,
  "tooltip": "Commande de position angulaire du robot",
  "helpUrl": ""
};

// ___________________________________________
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

// ___________________________________________
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

// ___________________________________________
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

// ___________________________________________
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

// ___________________________________________
const valeur_si_couleur_equipe = {
  "type": "valeur_si_couleur_equipe",
  "message0": "Valeur si équipe couleur1: %1 / si couleur2: %2",
  "args0": [
    {
      "type": "input_value",
      "name": "VAL_COULEUR1",
      "align": "RIGHT"
    },
    {
      "type": "input_value",
      "name": "VAL_COULEUR2",
      "align": "RIGHT"
    }
  ],
  "inputsInline": true,
  "output": null,
  "colour": 230,
  "tooltip": "Choix de la valeur en fonction de la couleur d'équipe",
  "helpUrl": ""
};

// ___________________________________________
const commande_moteur_manuelle_duree = {
  "type": "commande_moteur_manuelle_duree",
  "message0": "Commande moteur Gauche %1 %% %2 / moteur Droit %3 %% %4 Pendant %5 [msec]",
  "args0": [
    {
      "type": "input_value",
      "name": "MOT_GAUCHE"
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "MOT_DROIT"
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "DUREE_MSEC"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 40,
  "tooltip": "Commande manuelle des moteurs gauche et droit pendant une durée",
  "helpUrl": ""
};


// ___________________________________________
const commande_servo_position_vitesse = {
  "type": "commande_servo_position_vitesse",
  "message0": "Commande Servo %1 / Position: %2 / Vitesse: %3",
  "args0": [
    {
      "type": "input_value",
      "name": "INDEX_SERVO",
      "align": "RIGHT"
    },
    {
      "type": "input_value",
      "name": "POSITION",
      "align": "RIGHT"
    },
    {
      "type": "input_value",
      "name": "VITESSE",
      "align": "RIGHT"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 145,
  "tooltip": "Commande un servo à une position donnée",
  "helpUrl": ""
};

// ___________________________________________
// bras_gauche — violet (145)
// Commande le bras gauche du robot (sortir ou rentrer).
// Genere CommandePositionVitesse avec les constantes INDEX/POS_BRAS_GAUCHE_*/VITESSE_BRAS_GAUCHE.
const bras_gauche = {
  "type": "bras_gauche",
  "message0": "Bras gauche : %1",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "ACTION",
      "options": [
        ["Sortir", "SORTIR"],
        ["Rentrer", "RENTRER"]
      ]
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 145,
  "tooltip": "Commande le bras gauche du robot",
  "helpUrl": ""
};

// ___________________________________________
// bras_droit — violet (145)
// Commande le bras droit du robot (sortir ou rentrer).
// Genere CommandePositionVitesse avec les constantes INDEX/POS_BRAS_DROIT_*/VITESSE_BRAS_DROIT.
const bras_droit = {
  "type": "bras_droit",
  "message0": "Bras droit : %1",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "ACTION",
      "options": [
        ["Sortir", "SORTIR"],
        ["Rentrer", "RENTRER"]
      ]
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 145,
  "tooltip": "Commande le bras droit du robot",
  "helpUrl": ""
};

// ___________________________________________
// pince — violet (145)
// Commande la pince avant du robot (ouvrir ou fermer).
// Genere CommandePositionVitesse avec les constantes INDEX_PINCE/POS_PINCE_*/VITESSE_PINCE.
const pince = {
  "type": "pince",
  "message0": "Pince : %1",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "ACTION",
      "options": [
        ["Ouvrir", "OUVRIR"],
        ["Saisir", "SAISIR"],
        ["Fermer", "FERMER"]
      ]
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 145,
  "tooltip": "Commande la pince avant du robot (2 bras articules)",
  "helpUrl": ""
};

// ___________________________________________
// info_debutant — jaune (60)
// Bloc de commentaire multiligne en mode débutant.
// Génère uniquement un commentaire C++ dans le code produit,
// sans incrémenter le compteur d'états de la machine à états.
const info_debutant = {
  "type": "info_debutant",
  "message0": "Info %1",
  "args0": [
    {
      "type": "field_multilinetext",
      "name": "TEXTE",
      "text": "Vos commentaires ici",
      "spellcheck": false
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 60,
  "tooltip": "Bloc de commentaire — ne génère pas d'état, uniquement un commentaire C++",
  "helpUrl": ""
};

// ================================================================
// Create the block definitions for the JSON-only blocks.
// This does not register their definitions with Blockly.
// This file has no side effects!
export const blocks_robot_debutant = Blockly.common.createBlockDefinitionsFromJsonArray([
  robot_debutant,
  nom_tache_sm,
  activer_tache,
  arreter_tache,
  reboucler_vers_etape,
  aller_vers_etape_si_condition,
  deplacement_robot_lineaire,
  avancer,
  reculer,
  se_deplacer_en_position,
  set_angle_robot,
  attendre,
  attendre_tirette,
  attendre_condition,
  valeur_si_couleur_equipe,
  commande_moteur_manuelle_duree,
  commande_servo_position_vitesse,
  bras_gauche,
  bras_droit,
  pince,
  robot_object,
  info_debutant
 ]);

/*
 * Copyright (C) 2026 CRLG
 *
 * This file is part of BlockBot.
 *
 * BlockBot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * BlockBot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with BlockBot. If not, see <https://www.gnu.org/licenses/>.
 */

import * as Blockly from 'blockly/core';
import { registerFieldMultilineInput } from '@blockly/field-multilineinput';

// Enregistre le type 'field_multilinetext' dans le registre Blockly,
// nécessaire pour que les blocs action_perso et transition_perso
// affichent leur champ de saisie multiligne.
registerFieldMultilineInput();

// Pont de log vers LaBotBox (qtLog() exposé sur window par index.js)
const log = (msg) => window.qtLog?.(String(msg));

// ================================================================
// TYPES pour la séparation actions / transitions dans etat_expert,
// et pour la contrainte de connexion entre états.
// ================================================================
export const TYPE_ACTION     = 'ACTION_EXPERT';
export const TYPE_TRANSITION = 'TRANSITION_EXPERT';
export const TYPE_ETAT       = 'ETAT_EXPERT';

// ================================================================
// HELPER VISUEL
// Retourne une version éclaircie (pastel) d'une couleur Blockly
// exprimée en teinte HSV (0-360), en conservant la teinte mais en
// poussant saturation et luminosité vers des valeurs pastels.
// Utilise l'API publique Blockly.utils.colour.hsvToHex.
// ================================================================
function couleurEclaircie(hue) {
  return Blockly.utils.colour.hsvToHex(hue, 0.25, 0.95);
}

// ================================================================
// CONTEXTE DYNAMIQUE
// Stocke les listes (nom, valeur numérique) injectées par LaBotBox.
// Chaque liste est un tableau de paires [string, number].
// Exemple : [ ['SERVO_PINCE', 3], ['SERVO_BRAS', 5] ]
// ================================================================
export const labotboxContext = {
  state_machine:    [],   // liste de noms de machines à états (strings)
  moteurs:          [],
  servos:           [],
  values_servos:    [],
  servos_ax:        [],
  values_servos_ax: [],
  set_bot_state:    [],
  switch:           []
};

/**
 * Enrichissement du contexte par LaBotBox 
 *
 * Injecte les listes envoyées par LaBotBox via QWebChannel.
 * Si une liste envoyée est nulle ou vide, la liste existante
 * dans le contexte n'est PAS écrasée (workspace autoporteur).
 *
 * Deux formats d'items sont acceptés de manière générique :
 *   - { nom: string, valeur: number }  → stocké comme [nom, valeur]
 *   - string                           → stocké comme [nom, nom]
 *     (utilisé pour state_machine où seul le nom a du sens)
 *
 * @param {Object} data  Objet dont les clés correspondent aux noms
 *                       des listes du contexte.
 */
export function initContextFromLaBotBox(data) {
	//récupération de chaque liste de clés
  Object.keys(labotboxContext).forEach(key => {
  	//on n'écrase que si les données LaBotBox ne sont pas vides
    if (data[key] && data[key].length > 0) {
    	//enregistrement au format [nom, valeur] ou [nom, nom] si data est un tableau de chaînes de caractères
      labotboxContext[key] = data[key].map(item =>
        typeof item === 'string' ? [item, item] : [item.nom, item.valeur]
      );
    }
  });
}

/**
 * Retourne les options pour un field_dropdown dynamique.
 * Toujours au moins une option pour éviter une erreur Blockly.
 */
function getOptions(listeName, avecUserDefined = false) {
  const liste = labotboxContext[listeName];
  if (!liste || liste.length === 0) return [['user_defined', '0']];
  const options = liste.map(([nom, val]) => [nom, String(val)]);
  // Si demandé, l'option 'user_defined' reste en tête même quand le contexte est rempli
  if (avecUserDefined) options.unshift(['user_defined', '0']);
  return options;
}

// ================================================================
// HELPER : crée une extension qui gère la paire dropdown + numérique
// avec les 3 états visuels :
//   - normal        : couleur d'origine
//   - orphelin      : orange  (nom disparu du contexte à la restauration)
//   - user_defined  : couleur assombrie (valeur saisie sans correspondance)
// ================================================================
function registerDynamicPairExtension(extName, dropFieldName, numFieldName, listeName, couleurOrigine, avecUserDefined = false) {
  if (Blockly.Extensions.isRegistered(extName)) return;

  const COULEUR_ORPHELIN  = '#FF8C00';
  const COULEUR_USER_DEF  = couleurOrigine - 40;

  Blockly.Extensions.register(extName, function () {
    const bloc = this;

    /** Alimente le dropdown avec les options courantes du contexte */
    const alimenterDropdown = () => {
      const field = bloc.getField(dropFieldName);
      if (!field) return;
      field.menuGenerator_ = () => getOptions(listeName, avecUserDefined);
    };

    /**
     * Évalue la cohérence entre le dropdown et le champ numérique, et ajuste la couleur.
     * Appelée à la création (restauration) et au changement du dropdown.
     *
     * IMPORTANT : getFieldValue sur un field_dropdown retourne la VALEUR de l'option
     * (ici la chaîne numérique "1", "2"...), pas le label affiché (le nom).
     * La recherche dans le contexte doit donc se faire par valeur numérique.
     */
    const evaluerEtat = () => {
      const liste = labotboxContext[listeName];
      if (!liste || liste.length === 0) return;

      // user_defined (valeur '0') intentionnel → couleur sombre, pas d'orphelin
      if (avecUserDefined && bloc.getFieldValue(dropFieldName) === '0') {
        bloc.setColour(COULEUR_USER_DEF);
        return;
      }

      // La valeur du dropdown est le numérique sous forme de chaîne (ex : "3")
      const valDropNum = parseFloat(bloc.getFieldValue(dropFieldName));
      const valNumField = parseFloat(bloc.getFieldValue(numFieldName));
      const entree = liste.find(([, v]) => v === valDropNum);

      if (entree) {
        // Entrée reconnue → synchronise le champ numérique si nécessaire
        if (entree[1] !== valNumField) {
          bloc.setFieldValue(String(entree[1]), numFieldName);
        }
        bloc.setColour(couleurOrigine);
      } else {
        // Valeur inconnue dans le contexte : orphelin à la restauration
        bloc.setColour(COULEUR_ORPHELIN);
      }
    };

    /**
     * Réaction au changement de la valeur numérique par l'utilisateur.
     * - Valeur reconnue dans le contexte  → met à jour le dropdown, couleur normale
     * - Valeur inconnue                   → couleur sombre (saisie libre)
     *
     * IMPORTANT : setFieldValue sur un field_dropdown attend la VALEUR de l'option
     * (chaîne numérique), pas le label. On passe donc String(entree[1]).
     */
    const onValeurChange = (newVal) => {
      // user_defined (valeur '0') → l'utilisateur saisit librement le numérique,
      // ne pas tenter de syncer le dropdown vers un nom de contexte.
      if (avecUserDefined && bloc.getFieldValue(dropFieldName) === '0') return;

      const val = parseFloat(newVal);
      const liste = labotboxContext[listeName];
      if (!liste || liste.length === 0) return;

      const entree = liste.find(([, v]) => v === val);
      if (entree) {
        // Sélectionne l'option dont la valeur correspond au numérique saisi
        bloc.setFieldValue(String(entree[1]), dropFieldName);
        bloc.setColour(couleurOrigine);
      } else {
        // Valeur absente du contexte : saisie libre, couleur sombre
        bloc.setColour(COULEUR_USER_DEF);
      }
    };

    alimenterDropdown();

    // Chaînage : préserve un éventuel handler déjà installé par une extension
    // précédente sur ce même bloc (setOnChange remplace, il ne cumule pas).
    const handlerPrecedent = this.onchange;

    this.setOnChange(function (event) {
      if (handlerPrecedent) handlerPrecedent.call(this, event);
      if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId === bloc.id) {
        alimenterDropdown();
        setTimeout(evaluerEtat, 0);
      } else if (event.type === Blockly.Events.BLOCK_CHANGE && event.blockId === bloc.id) {
        if (event.name === numFieldName) {
          onValeurChange(event.newValue);
        } else if (event.name === dropFieldName) {
          setTimeout(evaluerEtat, 0);
        }
      }
    });
  });
}

// Enregistrement des extensions pour chaque paire dynamique
registerDynamicPairExtension('dynamic_servo',     'SERVO_NOM',     'SERVO_VAL',    'servos',           260);
registerDynamicPairExtension('dynamic_servo_pos', 'SERVO_POS_NOM', 'SERVO_POS_VAL','values_servos',    260, true);
registerDynamicPairExtension('dynamic_servo_ax',  'SERVO_AX_NOM',  'SERVO_AX_VAL', 'servos_ax',        300);
registerDynamicPairExtension('dynamic_ax_pos',    'AX_POS_NOM',    'AX_POS_VAL',   'values_servos_ax', 300, true);
registerDynamicPairExtension('dynamic_motor',     'MOTOR_NOM',     'MOTOR_VAL',    'moteurs',          185);
registerDynamicPairExtension('dynamic_switch',    'SWITCH_NOM',    'SWITCH_VAL',   'switch',           20);



// ================================================================
// DÉFINITIONS JSON DES BLOCS
// ================================================================

// ___________________________________________
// Bloc racine : state_machine_expert
// NOM_SM : source de vérité du nom (field_input, toujours visible).
// STRAT_NOM : palette de suggestions issues du contexte ; la sélection
//             d'un nom le copie dans NOM_SM puis remet le dropdown sur
//             "--- choisir ---". N'est pas sérialisé comme identifiant.
const state_machine_expert = {
  "type": "state_machine_expert",
  "message0": "Machine a etats %1",
  "args0": [{ "type": "input_dummy" }],
  "message1": "%1 %2",
  "args1": [
    {
      "type": "field_dropdown",
      "name": "STRAT_NOM",
      "options": [["--- choisir ---", "0"]]
    },
    { "type": "input_dummy" }
  ],
  "message2": "%1 %2",
  "args2": [
    {
      "type": "field_input",
      "name": "NOM_SM",
      "text": "MachineEtat"
    },
    {
      "type": "input_statement",
      "name": "DESCR",
      "check": TYPE_ETAT
    }
  ],
  "colour": 230,
  "tooltip": "",
  "helpUrl": "",
  "extensions": ["state_machine_behavior"]
};

// ___________________________________________
// Bloc état : etat_expert
// DESCR n'accepte que TYPE_ACTION, TRANS que TYPE_TRANSITION
// LOCK_NOM : si coché, le NOM saisi par l'utilisateur est préservé
//            et ne sera jamais écrasé par la renumérotation automatique.
// IS_DUMMY : si coché, le bloc devient un noeud (fond jaune, DESCR masqué)
const etat_expert = {
  "type": "etat_expert",
  "message0": "Etat %1 %2🔒 noeud%3 %4 %5 %6",
  "args0": [
    { "type": "field_input",    "name": "NOM",      "text": "",    "visible": true },
    { "type": "field_checkbox", "name": "LOCK_NOM", "checked": false },
    { "type": "field_checkbox", "name": "IS_DUMMY", "checked": false },
    { "type": "input_dummy",    "name": "HEADER" },
    { "type": "input_statement","name": "DESCR",    "check": TYPE_ACTION },
    { "type": "input_statement","name": "TRANS",    "check": TYPE_TRANSITION }
  ],
  "previousStatement": TYPE_ETAT,
  "nextStatement":     TYPE_ETAT,
  "tooltip": "",
  "helpUrl": "",
  "colour": 330,
  "inputsInline": true,
  "extensions": ["etat_expert_behavior"]
};

// ================================================================
// BLOCS ACTION
// ================================================================

// ___________________________________________
// set_servo_expert  — violet clair (260)
const set_servo_expert = {
  "type": "set_servo_expert",
  "message0": "Mettre servo %1 %2 à %3 %4 vitesse %5",
  "args0": [
    { "type": "field_dropdown", "name": "SERVO_NOM",     "options": [["(aucun)", "0"]] },
    { "type": "field_number",   "name": "SERVO_VAL",     "value": 0, "precision": 1 },
    { "type": "field_dropdown", "name": "SERVO_POS_NOM", "options": [["user_defined", "0"]] },
    { "type": "field_number",   "name": "SERVO_POS_VAL", "value": 0, "precision": 1 },
    { "type": "field_number",   "name": "SERVO_VIT",     "value": 255, "min": 1, "max": 255, "precision": 1 }
  ],
  "inputsInline": true,
  "previousStatement": TYPE_ACTION,
  "nextStatement":     TYPE_ACTION,
  "colour": 260,
  "tooltip": "Positionner un servo",
  "helpUrl": "",
  "extensions": ["dynamic_servo", "dynamic_servo_pos"]
};

// ___________________________________________
// set_ax_expert  — rose/magenta (300)
const set_ax_expert = {
  "type": "set_ax_expert",
  "message0": "Mettre ax %1 %2 à %3 %4",
  "args0": [
    { "type": "field_dropdown", "name": "SERVO_AX_NOM", "options": [["(aucun)", "0"]] },
    { "type": "field_number",   "name": "SERVO_AX_VAL", "value": 0, "precision": 1 },
    { "type": "field_dropdown", "name": "AX_POS_NOM",   "options": [["user_defined", "0"]] },
    { "type": "field_number",   "name": "AX_POS_VAL",   "value": 0, "precision": 1 }
  ],
  "inputsInline": true,
  "previousStatement": TYPE_ACTION,
  "nextStatement":     TYPE_ACTION,
  "colour": 300,
  "tooltip": "Positionner un servo AX",
  "helpUrl": "",
  "extensions": ["dynamic_servo_ax", "dynamic_ax_pos"]
};

// ___________________________________________
// set_motor  — cyan (185)
const set_motor = {
  "type": "set_motor",
  "message0": "Mettre moteur %1 %2 à %3",
  "args0": [
    { "type": "field_dropdown", "name": "MOTOR_NOM", "options": [["(aucun)", "0"]] },
    { "type": "field_number",   "name": "MOTOR_VAL", "value": 0, "precision": 1 },
    {
      "type": "field_number",
      "name": "MOTOR_PWM",
      "value": 0,
      "min": -100,
      "max": 100,
      "precision": 1
    }
  ],
  "inputsInline": true,
  "previousStatement": TYPE_ACTION,
  "nextStatement":     TYPE_ACTION,
  "colour": 185,
  "tooltip": "Commande moteur (-100 à +100)",
  "helpUrl": "",
  "extensions": ["dynamic_motor"]
};

// ___________________________________________
// set_switch  — orange-rouge (20)
// Commande un power switch (sortie 0 ou 1) identifié par son index eATTRIBUTION_POWER_ELECTROBOT.
const set_switch = {
  "type": "set_switch",
  "message0": "Mettre switch %1 %2 à %3",
  "args0": [
    { "type": "field_dropdown", "name": "SWITCH_NOM", "options": [["(aucun)", "0"]] },
    { "type": "field_number",   "name": "SWITCH_VAL", "value": 0, "precision": 1 },
    { "type": "field_number",   "name": "SWITCH_ETAT", "value": 0, "min": 0, "max": 1, "precision": 1 }
  ],
  "inputsInline": true,
  "previousStatement": TYPE_ACTION,
  "nextStatement":     TYPE_ACTION,
  "colour": 20,
  "tooltip": "Commande un power switch (0 = éteint, 1 = allumé)",
  "helpUrl": "",
  "extensions": ["dynamic_switch"]
};

// ___________________________________________
// set_pos  — jaune-vert (150)
// VAL1 = X ou Distance, VAL2 = Y (masqué si DA), VAL3 = Téta ou Angle (masqué si XY)
// Les entrées VAL1/VAL2/VAL3 sont des input_value : l'utilisateur peut y brancher
// n'importe quel bloc numérique (constante, formule, lecture d'une donnée robot...).
const set_pos = {
  "type": "set_pos",
  "message0": "Déplacement %1 %2 %3 %4 (sym %5) %6",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "MODE",
      "options": [
        ["X/Y",            "XY"],
        ["X/Y/Téta",       "XYT"],
        ["Distance/Angle", "DA"]
      ]
    },
    { "type": "input_value", "name": "VAL1", "check": "Number" },
    { "type": "input_value", "name": "VAL2", "check": "Number" },
    { "type": "input_value", "name": "VAL3", "check": "Number" },
    { "type": "field_checkbox", "name": "SYM", "checked": false },
    { "type": "input_dummy" }
  ],
  "inputsInline": true,
  "previousStatement": TYPE_ACTION,
  "nextStatement":     TYPE_ACTION,
  "colour": 150,
  "tooltip": "Commande de déplacement",
  "helpUrl": "",
  "extensions": ["set_pos_mode"]
};

// Extension set_pos : masquage conditionnel des inputs VAL2 et VAL3 selon le mode
if (!Blockly.Extensions.isRegistered('set_pos_mode')) {
  Blockly.Extensions.register('set_pos_mode', function () {
    const bloc = this;

    const updateVisibilite = () => {
      const mode = bloc.getFieldValue('MODE');
      const i2 = bloc.getInput('VAL2');
      const i3 = bloc.getInput('VAL3');
      if (!i2 || !i3) return;

      switch (mode) {
        case 'XY':
          i2.setVisible(true);
          i3.setVisible(false);
          break;
        case 'XYT':
          i2.setVisible(true);
          i3.setVisible(true);
          break;
        case 'DA':
          i2.setVisible(false);
          i3.setVisible(true);
          break;
      }
      if (bloc.rendered) bloc.render();
    };

    this.setOnChange(function (event) {
      if (
        (event.type === Blockly.Events.BLOCK_CREATE && event.blockId === bloc.id) ||
        (event.type === Blockly.Events.BLOCK_CHANGE &&
          event.blockId === bloc.id && event.name === 'MODE')
      ) {
        setTimeout(updateVisibilite, 0);
      }
    });
  });
}

// ___________________________________________
// set_pos_static  — jaune-vert (150)
// Variante simplifiée de set_pos fixée en mode X/Y/Téta (pas de dropdown).
// VAL1 = X, VAL2 = Y, VAL3 = Téta — toujours affichés (pas de masquage dynamique).
// Case à cocher SYM pour appliquer la symétrie (même logique que set_pos mode XYT).
const set_pos_static = {
  "type": "set_pos_static",
  "message0": "Position X/Y/Téta %1 %2 %3 (sym %4) %5",
  "args0": [
    { "type": "input_value", "name": "VAL1", "check": "Number" },
    { "type": "input_value", "name": "VAL2", "check": "Number" },
    { "type": "input_value", "name": "VAL3", "check": "Number" },
    { "type": "field_checkbox", "name": "SYM", "checked": false },
    { "type": "input_dummy" }
  ],
  "inputsInline": true,
  "previousStatement": TYPE_ACTION,
  "nextStatement":     TYPE_ACTION,
  "colour": 150,
  "tooltip": "Commande de déplacement X/Y/Téta (mode fixe)",
  "helpUrl": ""
};

// ================================================================
// BLOCS TRANSITION  (tous en vert 120)
// ================================================================
const COULEUR_TRANSITION = 120;

// Arguments partagés par les 3 blocs de transition.
//
// Un seul champ NEXT_STATE pour affichage ET génération de code.
// La renumérotation automatique de etat_expert_behavior garantit que
// NOM est toujours un identifiant C++ valide (ETAT_X ou valeur
// verrouillée par l'utilisateur) → plus besoin de séparer label/code.
//
//   NEXT_STATE :
//     - verrou décoché + état suivant → NOM de l'état suivant
//     - verrou décoché + bout de chaîne → "FIN_MISSION"
//     - verrou coché → valeur saisie par l'utilisateur (vérité absolue)
const ARGS_TRANSITION = [
  { "type": "field_input",    "name": "NEXT_STATE",      "text": "FIN_MISSION" },
  { "type": "field_checkbox", "name": "LOCK_NEXT_STATE", "checked": false },
  { "type": "field_number",   "name": "VALEUR",          "value": 500, "min": 0, "precision": 1 },
  {
    "type": "field_dropdown",
    "name": "UNITES",
    "options": [["msec", "MSEC"], ["sec", "SEC"]]
  },
  { "type": "input_dummy" }
];

// ___________________________________________
const attendre_expert = {
  "type": "attendre_expert",
  "message0": "Aller vers %1 %2🔒 après %3 %4 %5",
  "args0": ARGS_TRANSITION,
  "inputsInline": true,
  "previousStatement": TYPE_TRANSITION,
  "nextStatement":     TYPE_TRANSITION,
  "colour": COULEUR_TRANSITION,
  "tooltip": "Attendre une durée puis changer d'état",
  "helpUrl": "",
  "extensions": ["auto_next_state"]
};

// ___________________________________________
const convergence_expert = {
  "type": "convergence_expert",
  "message0": "Aller vers %1 %2🔒 après convergence ou %3 %4 %5",
  "args0": ARGS_TRANSITION,
  "inputsInline": true,
  "previousStatement": TYPE_TRANSITION,
  "nextStatement":     TYPE_TRANSITION,
  "colour": COULEUR_TRANSITION,
  "tooltip": "Attendre la convergence ou un timeout puis changer d'état",
  "helpUrl": "",
  "extensions": ["auto_next_state"]
};

// ___________________________________________
const convergence_rapide_expert = {
  "type": "convergence_rapide_expert",
  "message0": "Aller vers %1 %2🔒 après convergence rapide ou %3 %4 %5",
  "args0": ARGS_TRANSITION,
  "inputsInline": true,
  "previousStatement": TYPE_TRANSITION,
  "nextStatement":     TYPE_TRANSITION,
  "colour": COULEUR_TRANSITION,
  "tooltip": "Attendre la convergence rapide ou un timeout puis changer d'état",
  "helpUrl": "",
  "extensions": ["auto_next_state"]
};

// ___________________________________________
// si_vrai_expert — vert (COULEUR_TRANSITION)
// Bloc de transition conditionnel : passe à l'état cible dès que la condition
// booléenne est vraie, ou après le timeout. Wraps gotoStateIfTrue() de
// SM_StateMachineBase. L'entrée CONDITION accepte tout bloc à output Boolean
// (comparaisons, opérateurs logiques, valeur_data, robot_position, etc.).
// Le timeout (champ VALEUR/UNITES) sert de garde-fou ; il peut être mis à une
// valeur élevée si la condition est censée toujours se réaliser.
const si_vrai_expert = {
  "type": "si_vrai_expert",
  "message0": "Aller vers %1 %2🔒 si %3 ou après %4 %5 %6",
  "args0": [
    { "type": "field_input",    "name": "NEXT_STATE",      "text": "FIN_MISSION" },
    { "type": "field_checkbox", "name": "LOCK_NEXT_STATE", "checked": false },
    { "type": "input_value",    "name": "CONDITION",       "check": "Boolean" },
    { "type": "field_number",   "name": "VALEUR",          "value": 5000, "min": 0, "precision": 1 },
    { "type": "field_dropdown", "name": "UNITES",          "options": [["msec", "MSEC"], ["sec", "SEC"]] },
    { "type": "input_dummy" }
  ],
  "inputsInline": true,
  "previousStatement": TYPE_TRANSITION,
  "nextStatement":     TYPE_TRANSITION,
  "colour": COULEUR_TRANSITION,
  "tooltip": "Aller à l'état cible dès que la condition est vraie, ou après le timeout",
  "helpUrl": "",
  "extensions": ["auto_next_state"]
};

// ================================================================
// Extension auto_next_state
// ================================================================
if (!Blockly.Extensions.isRegistered('auto_next_state')) {
  Blockly.Extensions.register('auto_next_state', function () {

    function trouverEtatParent(bloc) {
      let courant = bloc.getSurroundParent();
      while (courant) {
        if (courant.type === 'etat_expert') return courant;
        courant = courant.getSurroundParent();
      }
      return null;
    }

    /**
     * Met à jour NEXT_STATE à partir de la topologie courante.
     * Appelé à chaque changement de topologie (MOVE, CREATE) et au
     * changement du champ NOM d'un etat_expert voisin (CHANGE).
     *
     * Grâce à la renumérotation automatique de etat_expert_behavior,
     * NOM est toujours un identifiant C++ valide (ETAT_X ou valeur
     * verrouillée par l'utilisateur) → NEXT_STATE est directement
     * utilisable par le générateur stm32.js sans traitement supplémentaire.
     */
    const updateNextState = () => {
      if (this.getFieldValue('LOCK_NEXT_STATE') === 'TRUE') return;

      const etatParent = trouverEtatParent(this);
      if (!etatParent) return;

      const blocSuivant = etatParent.nextConnection?.targetBlock();

      if (blocSuivant && blocSuivant.type === 'etat_expert') {
        // NOM garanti non vide par la renumérotation automatique
        this.setFieldValue(blocSuivant.getFieldValue('NOM'), 'NEXT_STATE');
      } else {
        // Bout de chaîne → FIN_MISSION
        this.setFieldValue('FIN_MISSION', 'NEXT_STATE');
      }
    };

    /**
     * Gestion du verrou :
     *  - coché   → NEXT_STATE éditable par l'utilisateur, couleur rouge
     *  - décoché → NEXT_STATE recalculé depuis la topologie, couleur verte
     */
    const updateVerrou = () => {
      if (this.getFieldValue('LOCK_NEXT_STATE') === 'TRUE') {
        this.setColour('#CC0000');
        // En mode verrouillé, NEXT_STATE est éditable.
        // field_input est toujours éditable par défaut dans Blockly,
        // pas de changement nécessaire.
      } else {
        this.setColour(COULEUR_TRANSITION);
        // Recalcule immédiatement depuis la topologie
        setTimeout(updateNextState, 0);
      }
    };

    this.setOnChange(function (event) {
      // Topologie modifiée → recalcul de NEXT_STATE
      if (
        event.type === Blockly.Events.BLOCK_MOVE   ||
        event.type === Blockly.Events.BLOCK_CREATE
      ) {
        setTimeout(updateNextState, 0);

        // Restauration couleur au CREATE (cas de la sérialisation)
        if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId === this.id) {
          setTimeout(updateVerrou, 0);
        }
        return;
      }

      if (event.type === Blockly.Events.BLOCK_CHANGE) {
        // Le verrou a changé sur CE bloc
        if (event.blockId === this.id && event.name === 'LOCK_NEXT_STATE') {
          updateVerrou();
          return;
        }

        // Le NOM d'un etat_expert voisin a changé → recalcul
        if (event.name === 'NOM') {
          setTimeout(updateNextState, 0);
        }
      }
    });
  });
}

// ================================================================
// Extension state_machine_behavior
// Responsabilités :
//   - Alimente STRAT_NOM avec les noms de machines à états du contexte.
//   - Quand l'utilisateur sélectionne un nom dans la palette :
//       → copie ce nom dans NOM_SM (source de vérité)
//       → remet le dropdown sur "--- choisir ---" (via setTimeout pour
//         éviter la récursion dans le handler BLOCK_CHANGE)
// ================================================================
if (!Blockly.Extensions.isRegistered('state_machine_behavior')) {
  Blockly.Extensions.register('state_machine_behavior', function () {
    const bloc = this;

    /** Alimente STRAT_NOM avec les noms issus du contexte */
    const alimenterDropdown = () => {
      const field = bloc.getField('STRAT_NOM');
      if (!field) return;
      field.menuGenerator_ = () => {
        const liste = labotboxContext['state_machine'];
        const options = [['--- choisir ---', '0']];
        if (liste && liste.length > 0) {
          // La valeur = le nom lui-même (chaîne), pour une copie directe dans NOM_SM
          liste.forEach(([nom]) => options.push([nom, nom]));
        }
        return options;
      };
    };

    alimenterDropdown();

    this.setOnChange(function (event) {
      if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId === bloc.id) {
        alimenterDropdown();
        return;
      }
      if (
        event.type === Blockly.Events.BLOCK_CHANGE &&
        event.blockId === bloc.id &&
        event.name === 'STRAT_NOM'
      ) {
        const val = bloc.getFieldValue('STRAT_NOM');
        if (val !== '0') {
          // Copie le nom sélectionné dans NOM_SM
          bloc.setFieldValue(val, 'NOM_SM');
          // Remet le dropdown sur "--- choisir ---" après le traitement en cours
          setTimeout(() => bloc.setFieldValue('0', 'STRAT_NOM'), 0);
        }
      }
    });
  });
}

// ================================================================
// Extension etat_expert_behavior
// Remplace l'ancien auto_name_state.
// Responsabilités :
//   - Gestion du mode noeud (IS_DUMMY) : couleur + masquage DESCR
//   - Renumérotation automatique de tous les etat_expert dont LOCK_NOM
//     est décoché, à chaque changement de topologie du workspace.
//     Le NOM prend la forme ETAT_X où X est la position topologique
//     (ordre dans la chaîne via nextConnection), garantissant des
//     identifiants C++ toujours valides et sans doublon.
//   - Les blocs avec LOCK_NOM coché conservent leur NOM intact.
//   - Notification aux transitions voisines quand NOM change,
//     via un BLOCK_CHANGE sur NOM qu'elles écoutent déjà.
// ================================================================
if (!Blockly.Extensions.isRegistered('etat_expert_behavior')) {
  Blockly.Extensions.register('etat_expert_behavior', function () {
    const COULEUR_ORIGINE_ETAT = 330;
    const COULEUR_DUMMY = '#FFD700';

    /**
     * Renumérotation globale de tous les etat_expert du workspace.
     * Parcourt la chaîne topologique de chaque bloc racine via
     * nextConnection pour garantir un ordre visuel cohérent.
     * Seuls les blocs dont LOCK_NOM est décoché sont renommés.
     */
    const renumeroterTousLesEtats = (workspace) => {
      var msg = '';
      //msg ='début traitement renumeroterTousLesEtats, workspace => '+ this.workspace;
      //log(msg);
      if (!workspace) return;

      // Collecte tous les etat_expert dans l'ordre topologique :
      // on part des blocs "racines" de chaîne (pas de previousConnection
      // connectée) et on suit nextConnection.
      const etatsOrdonnes = [];
      const tousLesBlocs = workspace.getAllBlocks(false);

      // Trouver les têtes de chaîne contenant des etat_expert
      tousLesBlocs.forEach(bloc => {
        if (bloc.type !== 'etat_expert') return;
        // Est-ce une tête de chaîne ? previousConnection non connectée
        const prev = bloc.previousConnection;
				const blocPrecedent = prev?.targetBlock();
				// Tête de chaîne = previousConnection connectée à autre chose qu'un etat_expert
				// (connectée au state_machine_expert) OU non connectée
				if (!blocPrecedent || blocPrecedent.type !== 'etat_expert') {
					// Parcourir la chaîne depuis ce bloc
					let courant = bloc;
					while (courant && courant.type === 'etat_expert') {
						etatsOrdonnes.push(courant);
						courant = courant.nextConnection?.targetBlock() || null;
					}
				}
			});

      // Renumérotation : ETAT_1, ETAT_2, ... (base 1 pour la lisibilité)
      let compteur = 1;
      /*
      let compteur_test = 1;
      msg= 'liste ordonnée de taille ' + etatsOrdonnes.length + ' :';
      log(msg);
      etatsOrdonnes.forEach(bloc => {
      	msg = compteur_test + ' => ' + bloc.id;
      	log(msg);
      	compteur_test++;
      });
      */
      
      etatsOrdonnes.forEach(bloc => {
        if (bloc.getFieldValue('LOCK_NOM') !== 'TRUE') {
          const nouveauNom = 'ETAT_' + compteur;
          if (bloc.getFieldValue('NOM') !== nouveauNom) {
            bloc.setFieldValue(nouveauNom, 'NOM');
          }
        }
        compteur++;
      });
    };

    /**
     * Met à jour l'apparence selon IS_DUMMY.
     * En mode noeud : fond jaune, DESCR masqué et vidé.
     * En mode normal : couleur d'origine, DESCR visible.
     */
    const updateDummyMode = () => {
      const isDummy = this.getFieldValue('IS_DUMMY') === 'TRUE';
      // La couleur est gérée par updateCouleur() qui tient compte
      // à la fois de IS_DUMMY et de LOCK_NOM.

      const inputHeader = this.getInput('HEADER');
      if (inputHeader) inputHeader.setVisible(true);

      const inputDescr = this.getInput('DESCR');
      if (inputDescr) {
        if (isDummy) {
          const connexion = inputDescr.connection;
          if (connexion?.targetBlock()) connexion.targetBlock().dispose(false);
        }
        inputDescr.setVisible(!isDummy);
      }
      if (this.rendered) this.render();
    };

    /**
     * Met à jour la couleur du bloc selon l'état de LOCK_NOM et IS_DUMMY :
     * - IS_DUMMY coché        → jaune vif  (mode noeud, prioritaire)
     * - LOCK_NOM coché        → teinte d'origine éclaircie (pastel)
     * - ni l'un ni l'autre   → couleur d'origine
     */
    const updateCouleur = () => {
      const isDummy = this.getFieldValue('IS_DUMMY') === 'TRUE';
      const isLocked = this.getFieldValue('LOCK_NOM') === 'TRUE';
      if (isDummy) {
        this.setColour(COULEUR_DUMMY);
      } else if (isLocked) {
        this.setColour(couleurEclaircie(COULEUR_ORIGINE_ETAT));
      } else {
        this.setColour(COULEUR_ORIGINE_ETAT);
      }
    };

    this.setOnChange(function (event) {
      // Renumérotation globale à chaque changement de topologie
      // (création, suppression, déplacement) ou changement de LOCK_NOM.
      // Le setTimeout laisse Blockly finaliser les connexions avant
      // qu'on parcoure la chaîne.
      if (
        event.type === Blockly.Events.BLOCK_CREATE  ||
        event.type === Blockly.Events.BLOCK_DELETE  ||
        event.type === Blockly.Events.BLOCK_MOVE    ||
        (event.type === Blockly.Events.BLOCK_CHANGE &&
         event.name === 'LOCK_NOM')
      ) {
        setTimeout(() => renumeroterTousLesEtats(this.workspace), 0);
      }

      // Mise à jour visuelle IS_DUMMY et LOCK_NOM sur CE bloc uniquement
      if (
        event.type === Blockly.Events.BLOCK_CREATE ||
        (event.type === Blockly.Events.BLOCK_CHANGE &&
         event.blockId === this.id &&
         (event.name === 'IS_DUMMY' || event.name === 'LOCK_NOM'))
      ) {
        updateDummyMode();
        updateCouleur();
      }

      // Les transitions écoutent les BLOCK_CHANGE avec event.name === 'NOM'
      // pour recalculer leur NEXT_STATE → pas de logique
      // supplémentaire nécessaire ici.
    });
  });
}

// ================================================================
// BLOCS CODE PERSONNALISE
// Permettent à l'utilisateur d'écrire du code C directement dans
// le bloc, via un champ multiligne. Le bloc entier peut être replié
// via clic droit → "Replier le bloc" pour gagner de la place.
// ================================================================

// ___________________________________________
// valeur_data — bleu (230, comme robot_position)
// Bloc valeur (output Number) : lit la valeur d'un capteur physique du robot.
// Les valeurs du dropdown sont les clés DataManager LaBotBox (Etor1..4,
// Eana1..13, Vbat) — directement utilisables pour interroger le DataManager
// en HIL. Le générateur STM32 effectue le mapping vers les membres de
// CElectrobot (m_b_Etor1, m_b_Eana1, m_b_Mes_Vbat, etc.).
const valeur_data = {
  "type": "valeur_data",
  "message0": "Capteur %1",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "DATA_VAR",
      "options": [
        ["Etor1",  "Etor1"],
        ["Etor2",  "Etor2"],
        ["Etor3",  "Etor3"],
        ["Etor4",  "Etor4"],
        ["Eana1",  "Eana1"],
        ["Eana2",  "Eana2"],
        ["Eana3",  "Eana3"],
        ["Eana4",  "Eana4"],
        ["Eana5",  "Eana5"],
        ["Eana6",  "Eana6"],
        ["Eana7",  "Eana7"],
        ["Eana8",  "Eana8"],
        ["Eana9",  "Eana9"],
        ["Eana10", "Eana10"],
        ["Eana11", "Eana11"],
        ["Eana12", "Eana12"],
        ["Eana13", "Eana13"],
        ["Vbat",   "Vbat"]
      ]
    }
  ],
  "output": "Number",
  "colour": 230,
  "tooltip": "Valeur d'un capteur du robot (CElectrobot)",
  "helpUrl": ""
};

// ___________________________________________
// action_perso — orange (30)
// S'insère dans la section DESCR (actions) d'un etat_expert.
const action_perso = {
  "type": "action_perso",
  "message0": "Action perso %1",
  "args0": [
    {
      "type": "field_multilinetext",
      "name": "CODE",
      "text": "// votre code ici",
      "spellcheck": false
    }
  ],
  "previousStatement": TYPE_ACTION,
  "nextStatement":     TYPE_ACTION,
  "colour": 30,
  "tooltip": "Bloc d'action avec code C personnalise",
  "helpUrl": ""
};

// ___________________________________________
// transition_perso — vert (120, comme les autres transitions)
// S'insère dans la section TRANS (transitions) d'un etat_expert.
const transition_perso = {
  "type": "transition_perso",
  "message0": "Transition perso %1",
  "args0": [
    {
      "type": "field_multilinetext",
      "name": "CODE",
      "text": "// votre code ici",
      "spellcheck": false
    }
  ],
  "previousStatement": TYPE_TRANSITION,
  "nextStatement":     TYPE_TRANSITION,
  "colour": COULEUR_TRANSITION,
  "tooltip": "Bloc de transition avec code C personnalise",
  "helpUrl": ""
};

// ================================================================
// Export des définitions de blocs
// ================================================================
export const blocks_robot_expert = Blockly.common.createBlockDefinitionsFromJsonArray([
  state_machine_expert,
  etat_expert,
  set_servo_expert,
  set_ax_expert,
  set_motor,
  set_switch,
  set_pos,
  set_pos_static,
  attendre_expert,
  convergence_expert,
  convergence_rapide_expert,
  si_vrai_expert,
  action_perso,
  transition_perso,
  valeur_data,
]);

import * as Blockly from 'blockly/core';

// ___________________________________________
const strategie_expert = {
  "type": "strategie_expert",
  "message0": "Strategie %1 %2 %3",
  "args0": [
      {
      "type": "input_dummy"
    },
    {
      "type": "field_input",
      "name": "STRATEGIE_SM",
      "text": "ma_strategie",
      "visible": true
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

//Bloc basique d'un etat
const etat_expert = {
  "type": "etat_expert",
  "message0": "Etat %1 %2 noeud%3 %4 %5",
  "args0": [
    {
      "type": "field_input",
      "name": "NOM",
      "text": "",
      "visible": true
    },
    {
      "type": "field_checkbox",
      "name": "IS_DUMMY",
      "checked": false
    },
    {
      "type": "input_dummy",
      "name": "HEADER"
    },
    {
      "type": "input_statement",
      "name": "DESCR"
    },
    {
      "type": "input_statement",
      "name": "TRANS"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "tooltip": "",
  "helpUrl": "",
  "colour": 330,
  "inputsInline": true,
  "extensions": ["auto_name_state"]
};

// ___________________________________________
const attendre_expert = {
  "type": "attendre_expert",
  "message0": "Aller vers %1 %2🔒 après %3 %4",
  "args0": [
    {
      "type": "field_input",
      "name": "NEXT_STATE",
      "text": "FIN_MISSION"
    },
    {
      "type": "field_checkbox",
      "name": "LOCK_NEXT_STATE",
      "checked": false
    },
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
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 100,
  "tooltip": "Attendre",
  "helpUrl": "",
  "extensions": ["auto_next_state", "default_valeur"]
};


// ================================================================
// Extension pour le bloc attendre_expert :
// Injecte un bloc shadow "math_number" avec la valeur 500 dans l'input
// VALEUR, ce qui sert de valeur par défaut non-détachable tant que
// l'utilisateur ne connecte pas un autre bloc.
Blockly.Extensions.register('default_valeur', function() {
  // On utilise Blockly.utils.xml.textToDom pour construire le shadow DOM.
  // Le bloc shadow math_number affiche un champ NUM éditable.
  const shadowDom = Blockly.utils.xml.textToDom(
    '<shadow type="math_number"><field name="NUM">500</field></shadow>'
  );
  this.getInput('VALEUR').connection.setShadowDom(shadowDom);
});

// ================================================================
// Extension pour le bloc attendre_expert :
// Met à jour automatiquement NEXT_STATE en fonction du bloc etat_expert
// qui suit le bloc etat_expert parent dans lequel attendre_expert est imbriqué.
//
// Arborescence attendue :
//   etat_expert (parent via input_statement "TRANS")
//     └─ attendre_expert  <── ce bloc
//   etat_expert suivant (nextConnection du parent)  ← source du nom
//
Blockly.Extensions.register('auto_next_state', function() {

  /**
   * Remonte la chaîne de blocs pour trouver le bloc etat_expert
   * dans lequel ce bloc est directement imbriqué (via n'importe quelle
   * input_statement, typiquement "TRANS").
   */
  function trouverEtatParent(bloc) {
    let courant = bloc.getSurroundParent();
    while (courant) {
      if (courant.type === 'etat_expert') {
        return courant;
      }
      courant = courant.getSurroundParent();
    }
    return null;
  }

  /**
   * Recalcule et applique la valeur de NEXT_STATE.
   * - Si l'etat_expert parent a un bloc etat_expert connecté en "next",
   *   utilise le NOM de cet état suivant.
   * - Sinon, utilise "FIN_MISSION".
   */
  const updateNextState = () => {
    // Si le verrou est activé, l'utilisateur gère NEXT_STATE manuellement
    if (this.getFieldValue('LOCK_NEXT_STATE') === 'TRUE') return;

    const etatParent = trouverEtatParent(this);

    if (!etatParent) {
      // Pas encore imbriqué dans un etat_expert, on laisse la valeur actuelle
      return;
    }

    const blocSuivant = etatParent.nextConnection &&
                        etatParent.nextConnection.targetBlock();

    if (blocSuivant && blocSuivant.type === 'etat_expert') {
      const nomSuivant = blocSuivant.getFieldValue('NOM') || 'FIN_MISSION';
      this.setFieldValue(nomSuivant, 'NEXT_STATE');
    } else {
      this.setFieldValue('FIN_MISSION', 'NEXT_STATE');
    }
  };

  // Couleur d'origine du bloc (définie dans le JSON)
  const COULEUR_ORIGINE = 100;
  const COULEUR_VERROUILLE = '#CC0000';

  /**
   * Met à jour la couleur du bloc selon l'état du verrou.
   */
  const updateCouleur = () => {
    if (this.getFieldValue('LOCK_NEXT_STATE') === 'TRUE') {
      this.setColour(COULEUR_VERROUILLE);
    } else {
      this.setColour(COULEUR_ORIGINE);
    }
  };

  // Écoute tous les événements susceptibles de modifier la topologie :
  //  - connexion / déconnexion de blocs (BLOCK_MOVE)
  //  - changement de valeur d'un champ (ex. renommage de NOM dans etat_expert)
  //  - création d'un bloc (cas du chargement depuis XML/JSON)
  this.setOnChange(function(event) {
    if (
      event.type === Blockly.Events.BLOCK_MOVE   ||
      event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_CHANGE
    ) {
      // Légère mise à jour différée pour laisser Blockly terminer
      // de reconstruire les connexions avant qu'on les interroge.
      setTimeout(updateNextState, 0);

      // Mise à jour de la couleur si c'est le champ verrou qui a changé,
      // ou au chargement (BLOCK_CREATE) pour restaurer l'état sauvegardé.
      if (
        event.type === Blockly.Events.BLOCK_CREATE ||
        (event.type === Blockly.Events.BLOCK_CHANGE &&
         event.blockId === this.id &&
         event.name === 'LOCK_NEXT_STATE')
      ) {
        updateCouleur();
      }
    }
  });
});


// ================================================================
Blockly.Extensions.register('auto_name_state', function() {
  const nomExistant = this.getFieldValue("NOM");
  console.log("Extension exécutée - Nom existant:", nomExistant, "ID du bloc:", this.id);
  
  // Marquer temporairement ce bloc comme "en attente de vérification"
  this.needsNameCheck = true;
  
  // Si c'est clairement un nouveau bloc (pas de restauration en cours)
  if (!this.workspace.isLoading && (!nomExistant || nomExistant === "")) {
    console.log("BRANCHE NOUVEAU BLOC");
    
    // Initialiser le compteur dans le workspace s'il n'existe pas
    if (!this.workspace.compteur_etat) {
      this.workspace.compteur_etat = 0;
    }
    
    // Initialiser le cache personnalisé s'il n'existe pas
    if (!this.workspace.customNameCache) {
      this.workspace.customNameCache = {};
    }
    
    this.workspace.compteur_etat++;
    
    // Définir la valeur du champ caché stockant le nom d'état
    const nomAutomatique = "Etat_" + this.workspace.compteur_etat;
    this.setFieldValue(nomAutomatique, "NOM");
    
    let msg = "nom automatique créé: " + nomAutomatique;
    console.log(msg);
    
    // Ajouter l'entrée dans le cache
    this.workspace.customNameCache[this.workspace.compteur_etat] = {
      nom: nomAutomatique,
      blockId: this.id
    };
    
    // Marquer comme traité
    this.needsNameCheck = false;
  }
  
  const COULEUR_ORIGINE_ETAT = 330;
  const COULEUR_DUMMY = '#FFD700';

  /**
   * Met à jour l'apparence du bloc selon l'état de la case "noeud" (IS_DUMMY) :
   * - Jaune vif + input DESCR masqué et vidé si coché
   * - Couleur d'origine + input DESCR visible si décoché
   */
  const updateDummyMode = () => {
    const isDummy = this.getFieldValue('IS_DUMMY') === 'TRUE';

    // Couleur de fond
    this.setColour(isDummy ? COULEUR_DUMMY : COULEUR_ORIGINE_ETAT);

    // Le header (NOM + case à cocher) reste toujours visible
    const inputHeader = this.getInput('HEADER');
    if (inputHeader) inputHeader.setVisible(true);

    // Visibilité de l'input DESCR uniquement
    const inputDescr = this.getInput('DESCR');
    if (inputDescr) {
      if (isDummy) {
        // Supprimer tous les blocs enfants dans DESCR avant de masquer
        const connexion = inputDescr.connection;
        if (connexion && connexion.targetBlock()) {
          connexion.targetBlock().dispose(false);
        }
      }
      inputDescr.setVisible(!isDummy);
    }

    // Forcer le re-rendu du bloc
    if (this.rendered) {
      this.render();
    }
  };

  // Gérer la suppression du bloc pour nettoyer le cache
  this.setOnChange(function(event) {
    if (event.type === Blockly.Events.BLOCK_DELETE && event.blockId === this.id) {
      for (let key in this.workspace.customNameCache) {
        if (this.workspace.customNameCache[key].blockId === this.id) {
          delete this.workspace.customNameCache[key];
          break;
        }
      }
    }

    // Réagir au changement de la case IS_DUMMY ou au chargement du bloc
    if (
      event.type === Blockly.Events.BLOCK_CREATE ||
      (event.type === Blockly.Events.BLOCK_CHANGE &&
       event.blockId === this.id &&
       event.name === 'IS_DUMMY')
    ) {
      updateDummyMode();
    }
  });
});

// ================================================================
// Create the block definitions for the JSON-only blocks.
// This does not register their definitions with Blockly.
// This file has no side effects!
export const blocks_robot_expert = Blockly.common.createBlockDefinitionsFromJsonArray([
  strategie_expert,
  etat_expert,
  attendre_expert
 ]);

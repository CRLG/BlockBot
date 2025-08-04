import * as Blockly from 'blockly/core';

// Fonction de téléchargement du fichier JSON
export const downloadWorkspace = function (workspace){
const state = Blockly.serialization.workspaces.save(workspace);
const jsonString = JSON.stringify(state, null, 2);
const blob = new Blob([jsonString], { type: 'application/json' });
const url = URL.createObjectURL(blob);

const a = document.createElement('a');
a.href = url;
a.download = 'blockly_workspace.json';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
};

// Fonction de chargement depuis un fichier JSON
export const uploadWorkspace = function (workspace,fic){

if (!fic) return;
//console.log(filename);
const reader = new FileReader();
reader.onload = function(e) {
try {
  const json = JSON.parse(e.target.result);
  workspace.clear();
  Blockly.serialization.workspaces.load(json, workspace);
  alert('Espace de travail rechargé avec succès.');
} catch (err) {
  alert('Erreur lors du chargement du fichier JSON : ' + err.message);
}
};
reader.readAsText(fic);
};


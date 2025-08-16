/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import {Order} from 'blockly/javascript';

export const stm32Generator = new Blockly.CodeGenerator('STM32');

stm32Generator.addReservedWords(
    // import keyword
    // print(','.join(sorted(keyword.kwlist)))
    // https://docs.C.org/3/reference/lexical_analysis.html#keywords
    // https://docs.C.org/2/reference/lexical_analysis.html#keywords
    'False,None,True,and,as,assert,break,class,continue,def,del,elif,else,' +
    'except,exec,finally,for,from,global,if,import,in,is,lambda,nonlocal,not,' +
    'or,pass,print,raise,return,try,while,with,yield,' +
    // https://docs.C.org/3/library/constants.html
    // https://docs.C.org/2/library/constants.html
    'NotImplemented,Ellipsis,__debug__,quit,exit,copyright,license,credits,' +
    // >>> print(','.join(sorted(dir(__builtins__))))
    // https://docs.C.org/3/library/functions.html
    // https://docs.C.org/2/library/functions.html
    'ArithmeticError,AssertionError,AttributeError,BaseException,' +
    'BlockingIOError,BrokenPipeError,BufferError,BytesWarning,' +
    'ChildProcessError,ConnectionAbortedError,ConnectionError,' +
    'ConnectionRefusedError,ConnectionResetError,DeprecationWarning,EOFError,' +
    'Ellipsis,EnvironmentError,Exception,FileExistsError,FileNotFoundError,' +
    'FloatingPointError,FutureWarning,GeneratorExit,IOError,ImportError,' +
    'ImportWarning,IndentationError,IndexError,InterruptedError,' +
    'IsADirectoryError,KeyError,KeyboardInterrupt,LookupError,MemoryError,' +
    'ModuleNotFoundError,NameError,NotADirectoryError,NotImplemented,' +
    'NotImplementedError,OSError,OverflowError,PendingDeprecationWarning,' +
    'PermissionError,ProcessLookupError,RecursionError,ReferenceError,' +
    'ResourceWarning,RuntimeError,RuntimeWarning,StandardError,' +
    'StopAsyncIteration,StopIteration,SyntaxError,SyntaxWarning,SystemError,' +
    'SystemExit,TabError,TimeoutError,TypeError,UnboundLocalError,' +
    'UnicodeDecodeError,UnicodeEncodeError,UnicodeError,' +
    'UnicodeTranslateError,UnicodeWarning,UserWarning,ValueError,Warning,' +
    'ZeroDivisionError,_,__build_class__,__debug__,__doc__,__import__,' +
    '__loader__,__name__,__package__,__spec__,abs,all,any,apply,ascii,' +
    'basestring,bin,bool,buffer,bytearray,bytes,callable,chr,classmethod,cmp,' +
    'coerce,compile,complex,copyright,credits,delattr,dict,dir,divmod,' +
    'enumerate,eval,exec,execfile,exit,file,filter,float,format,frozenset,' +
    'getattr,globals,hasattr,hash,help,hex,id,input,int,intern,isinstance,' +
    'issubclass,iter,len,license,list,locals,long,map,max,memoryview,min,' +
    'next,object,oct,open,ord,pow,print,property,quit,range,raw_input,reduce,' +
    'reload,repr,reversed,round,set,setattr,slice,sorted,staticmethod,str,' +
    'sum,super,tuple,type,unichr,unicode,vars,xrange,zip'
);

// ----------------------------------------------------------------
/**
 * Initialise the database of variable names.
 * @param {!Blockly.Workspace} workspace Workspace to generate code from.
 */
stm32Generator.init = function(workspace) {
  /**
   * Empty loops or conditionals are not allowed in C.
   */
   console.log('[init]: HELLO');
  this.PASS = this.INDENT + 'pass\n';
  // Create a dictionary of definitions to be printed before the code.
  this.definitions_ = Object.create(null);
  // Create a dictionary mapping desired function names in definitions_
  // to actual function names (to avoid collisions with user functions).
  this.functionNames_ = Object.create(null);

  if (!this.variableDB_) {
    this.variableDB_ =
        new Blockly.Names(this.RESERVED_WORDS_);
  } else {
    this.variableDB_.reset();
  }

  this.variableDB_.setVariableMap(workspace.getVariableMap());

  var defvars = [];
  // Add developer variables (not created or named by the user).
  var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
  for (var i = 0; i < devVarList.length; i++) {
    defvars.push(this.variableDB_.getName(devVarList[i],
        Blockly.Names.DEVELOPER_VARIABLE_TYPE) + ' = None');
  }

  // Add user variables, but only ones that are being used.
  var variables = Blockly.Variables.allUsedVarModels(workspace);
  for (var i = 0; i < variables.length; i++) {
    defvars.push(this.variableDB_.getName(variables[i].getId(),
        Blockly.Variables.NAME_TYPE) + ' = None');
  }

  this.definitions_['variables'] = defvars.join('\n');
};


// ----------------------------------------------------------------
stm32Generator.scrub_ = function(block, code, opt_thisOnly) {
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      comment = Blockly.utils.string.wrap(comment,
          this.COMMENT_WRAP - 3);
      commentCode += this.prefixLines(comment + '\n', '# ');
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var i = 0; i < block.inputList.length; i++) {
      if (block.inputList[i].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[i].connection.targetBlock();
        if (childBlock) {
          var comment = this.allNestedComments(childBlock);
          if (comment) {
            commentCode += this.prefixLines(comment, '# ');
          }
        }
      }
    }
  }
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = opt_thisOnly ? '' : this.blockToCode(nextBlock);
  return commentCode + code + nextCode;
};

// ----------------------------------------------------------------
/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
stm32Generator.scrubNakedValue = function(line) {
  return line + '\n';
};

// ----------------------------------------------------------------
/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
stm32Generator.finish = function(code) {
  // Convert the definitions dictionary into a list.
  var imports = [];
  var definitions = [];
  for (var name in this.definitions_) {
    var def = this.definitions_[name];
    if (def.match(/^(from\s+\S+\s+)?import\s+\S+/)) {
      imports.push(def);
    } else {
      definitions.push(def);
    }
  }
  // Clean up temporary data.
  delete this.definitions_;
  delete this.functionNames_;
  this.variableDB_.reset();
  var allDefs = imports.join('\n') + '\n\n' + definitions.join('\n\n');
  return allDefs.replace(/\n\n+/g, '\n\n').replace(/\n*$/, '\n\n\n') + code;
};

// ================================================================================
//                          LES BLOCS
// ================================================================================

// _____________________________________________________________________
stm32Generator.forBlock['math_number'] = function(block, generator) {
  // Numeric value.
  const number = Number(block.getFieldValue('NUM'));
  const order = number >= 0 ? Order.ATOMIC : Order.UNARY_NEGATION;
  return [String(number), order];
};

// _____________________________________________________________________
stm32Generator.forBlock['controls_if'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  console.log('HELLO');
  return 'my code string for controls_if';
};


// _____________________________________________________________________
stm32Generator.forBlock['logic_compare'] = function(block, generator) {
  // TODO : faire ce qu'il faut
  return 'my code string for logic_compare';
};


// _____________________________________________________________________
// Voir https://groups.google.com/g/blockly/c/JzVgbKEcyaw
stm32Generator.forBlock['variables_set'] = function(block, generator) {
  // Variable setter.
  console.log('[variables_set]: HELLO');
  // Variable setter.
  var argument0 = generator.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0';
  var varName = generator.variableDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
  return varName + ' = ' + argument0 + ';\n';

};

// _____________________________________________________________________
stm32Generator.forBlock['variables_get'] = function(block, generator) {
  var varName = generator.variableDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
  return [varName, Order.ATOMIC];
};


// ... faire tous les autres blocs que l'on veut mettre à disposition




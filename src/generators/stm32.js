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
stm32Generator.forBlock['math_arithmetic'] = function(block, generator) {
  // Basic arithmetic operators, and power.
  var OPERATORS = {
    'ADD': [' + ', Order.ADDITION],
    'MINUS': [' - ', Order.SUBTRACTION],
    'MULTIPLY': [' * ', Order.MULTIPLICATION],
    'DIVIDE': [' / ', Order.DIVISION],
    'POWER': [null, Order.NONE]  // Handle power separately.
  };
  var tuple = OPERATORS[block.getFieldValue('OP')];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = generator.valueToCode(block, 'A', order) || '0';
  var argument1 = generator.valueToCode(block, 'B', order) || '0';
  var code;
  // Power in C requires a special case since it has no operator.
  if (!operator) {
    generator.definitions_['import_dart_math'] = "#include \"math.h\"";
    code = 'pow(' + argument0 + ', ' + argument1 + ')';
    return [code, Order.ATOMIC];
  }
  code = argument0 + operator + argument1;
  return [code, order];
};

// _____________________________________________________________________
stm32Generator.forBlock['math_constant'] = function(block, generator) {
  // Constants: PI, E, the Golden Ratio, sqrt(2), 1/sqrt(2), INFINITY.
  var CONSTANTS = {
    'PI': ['M_PI', Order.ATOMIC],
    'E': ['M_E', Order.ATOMIC],
    'GOLDEN_RATIO': ['(1 + sqrt(5)) / 2', Order.MULTIPLICATION],
    'SQRT2': ['M_SQRT2', Order.ATOMIC],
    'SQRT1_2': ['M_SQRT1_2', Order.ATOMIC],
    'INFINITY': ['INFINITY', Order.ATOMIC]
  };
  var constant = block.getFieldValue('CONSTANT');
  generator.definitions_['import_dart_math'] = "#include \"math.h\"";
  return CONSTANTS[constant];
};

// _____________________________________________________________________
stm32Generator.forBlock['math_single'] = function(block, generator) {
  // Math operators with single operand.
  var operator = block.getFieldValue('OP');
  var code;
  var arg;
  if (operator == 'NEG') {
    // Negation is a special case given its different operator precedence.
    arg = generator.valueToCode(block, 'NUM', Order.UNARY_PLUS) || '0';
    if (arg[0] == '-') {
      // --3 is not legal in C.
      arg = ' ' + arg;
    }
    code = '-' + arg;
    return [code, Order.UNARY_NEGATION];
  }
  if (operator == 'ABS' || operator.substring(0, 5) == 'ROUND') {
    arg = generator.valueToCode(block, 'NUM',
        Order.UNARY_PLUS) || '0';
  } else if (operator == 'SIN' || operator == 'COS' || operator == 'TAN') {
    arg = generator.valueToCode(block, 'NUM',
        Order.MULTIPLICATION) || '0';
  } else {
    arg = generator.valueToCode(block, 'NUM',
        Order.NONE) || '0';
  }

  switch (operator) {
    case 'ABS':
      code = 'fabs(' + arg + ')';
      break;
    case 'ROOT':
      code = 'sqrt(' + arg + ')';
      break;
    case 'LN':
      code = 'log(' + arg + ')';
      break;
    case 'EXP':
      code = 'exp(' + arg + ')';
      break;
    case 'POW10':
      code = 'pow(10,' + arg + ')';
      break;
    case 'ROUND':
      code = 'round(' + arg + ')';
      break;
    case 'ROUNDUP':
       code = 'ceil(' + arg + ')';
      break;
    case 'ROUNDDOWN':
      code = 'floor(' + arg + ')';
      break;
    case 'SIN':
      code = 'sin(' + arg + ')';
      break;
    case 'COS':
      code = 'cos(' + arg + ')';
      break;
    case 'TAN':
      code = 'tan(' + arg + ')';
      break;
    case 'LOG10':
      code = 'Math.log(' + arg + ') / Math.log(10)';
      break;
    case 'ASIN':
      code = 'asin(' + arg + ')';
      break;
    case 'ACOS':
      code = 'acos(' + arg + ')';
      break;
    case 'ATAN':
      code = 'atan(' + arg + ')';
      break;
    default:
      throw Error('Unknown math operator: ' + operator);
  }
  return [code, Order.MULTIPLICATION];
};

// _____________________________________________________________________
// Rounding functions have a single operand.
stm32Generator.forBlock['math_round'] = stm32Generator.forBlock['math_single'];

// _____________________________________________________________________
// Trigonometry functions have a single operand.
stm32Generator.forBlock['math_trig'] = stm32Generator.forBlock['math_single'];


// _____________________________________________________________________
stm32Generator.forBlock['controls_if'] = function(block, generator) {
  // If/elseif/else condition.
  var n = 0;
  var argument = generator.valueToCode(this, 'IF' + n, Order.NONE) || 'false';
  var branch = generator.statementToCode(this, 'DO' + n);
  var code = 'if (' + argument + ') {\n' + branch + '}';
  for (n = 1; n <= this.elseifCount_; n++) {
    argument = generator.valueToCode(this, 'IF' + n, Order.NONE) || 'false';
    branch = generator.statementToCode(this, 'DO' + n);
    code += ' else if (' + argument + ') {\n' + branch + '}';
  }
  if (this.elseCount_) {
    branch = generator.statementToCode(this, 'ELSE');
    code += ' else {\n' + branch + '}';
  }
  return code + '\n';
};


// _____________________________________________________________________
stm32Generator.forBlock['logic_compare'] = function(block, generator) {
    // Comparison operator.
  var OPERATORS = {
    'EQ': '==',
    'NEQ': '!=',
    'LT': '<',
    'LTE': '<=',
    'GT': '>',
    'GTE': '>='
  };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ?
      Order.EQUALITY : Order.RELATIONAL;
  var argument0 = generator.valueToCode(block, 'A', order) || '0';
  var argument1 = generator.valueToCode(block, 'B', order) || '0';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

// _____________________________________________________________________
stm32Generator.forBlock['logic_operation'] = function(block, generator) {
  // Operations 'and', 'or'.
  var operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||';
  var order = (operator == '&&') ? Order.LOGICAL_AND :
      Order.LOGICAL_OR;
  var argument0 = generator.valueToCode(block, 'A', order);
  var argument1 = generator.valueToCode(block, 'B', order);
  if (!argument0 && !argument1) {
    // If there are no arguments, then the return value is false.
    argument0 = 'false';
    argument1 = 'false';
  } else {
    // Single missing arguments have no effect on the return value.
    var defaultArgument = (operator == '&&') ? 'true' : 'false';
    if (!argument0) {
      argument0 = defaultArgument;
    }
    if (!argument1) {
      argument1 = defaultArgument;
    }
  }
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

// _____________________________________________________________________
stm32Generator.forBlock['logic_negate'] = function(block, generator) {
  // Negation.
  var order = Order.LOGICAL_NOT;
  var argument0 = generator.valueToCode(block, 'BOOL', order) || 'true';
  var code = '!' + argument0;
  return [code, order];
};

// _____________________________________________________________________
stm32Generator.forBlock['logic_boolean'] = function(block, generator) {
  // Boolean values true and false.
  var code = (block.getFieldValue('BOOL') == 'TRUE') ? 'true' : 'false';
  return [code, Order.ATOMIC];
};

// _____________________________________________________________________
stm32Generator.forBlock['logic_null'] = function(block, generator) {
  // Null data type.
  return ['null', Order.ATOMIC];
};

// _____________________________________________________________________
stm32Generator.forBlock['logic_ternary'] = function(block, generator) {
  // Ternary operator.
  var value_if = generator.valueToCode(block, 'IF',
      Order.CONDITIONAL) || 'false';
  var value_then = generator.valueToCode(block, 'THEN',
      Order.CONDITIONAL) || 'null';
  var value_else = generator.valueToCode(block, 'ELSE',
      Order.CONDITIONAL) || 'null';
  var code = value_if + ' ? ' + value_then + ' : ' + value_else;
  return [code, Order.CONDITIONAL];
};


// _____________________________________________________________________

stm32Generator.forBlock['controls_for'] = function(block, generator) {
  // For loop.
  var variable0 = generator.variableDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
  var argument0 = stm32Generator.valueToCode(block, 'FROM',
      Order.ASSIGNMENT) || '0';
  var argument1 = stm32Generator.valueToCode(block, 'TO',
      Order.ASSIGNMENT) || '0';
  var increment = stm32Generator.valueToCode(block, 'BY',
      Order.ASSIGNMENT) || '1';
  var branch = stm32Generator.statementToCode(block, 'DO');
  branch = stm32Generator.addLoopTrap(branch, block);
  var code;
  if (Blockly.utils.string.isNumber(argument0) && Blockly.utils.string.isNumber(argument1) &&
      Blockly.utils.string.isNumber(increment)) {
    // All arguments are simple numbers.
    var up = Number(argument0) <= Number(argument1);
    code = 'for (int ' + variable0 + ' = ' + argument0 + '; ' +
        variable0 + (up ? ' <= ' : ' >= ') + argument1 + '; ' +
        variable0;
    var step = Math.abs(Number(increment));
    if (step == 1) {
      code += up ? '++' : '--';
    } else {
      code += (up ? ' += ' : ' -= ') + step;
    }
    code += ') {\n' + branch + '}\n';
  } else {
    code = '';
    // Cache non-trivial values to variables to prevent repeated look-ups.
    var startVar = argument0;
    if (!argument0.match(/^\w+$/) && !Blockly.utils.string.isNumber(argument0)) {
      var startVar = stm32Generator.variableDB_.getDistinctName(
          variable0 + '_start', Blockly.Variables.NAME_TYPE);
      code += 'var ' + startVar + ' = ' + argument0 + ';\n';
    }
    var endVar = argument1;
    if (!argument1.match(/^\w+$/) && !Blockly.utils.string.isNumber(argument1)) {
      var endVar = stm32Generator.variableDB_.getDistinctName(
          variable0 + '_end', Blockly.Variables.NAME_TYPE);
      code += 'var ' + endVar + ' = ' + argument1 + ';\n';
    }
    // Determine loop direction at start, in case one of the bounds
    // changes during loop execution.
    var incVar = stm32Generator.variableDB_.getDistinctName(
        variable0 + '_inc', Blockly.Variables.NAME_TYPE);
    code += 'num ' + incVar + ' = ';
    if (Blockly.utils.string.isNumber(increment)) {
      code += Math.abs(increment) + ';\n';
    } else {
      code += '(' + increment + ').abs();\n';
    }
    code += 'if (' + startVar + ' > ' + endVar + ') {\n';
    code += stm32Generator.INDENT + incVar + ' = -' + incVar + ';\n';
    code += '}\n';
    code += 'for (' + variable0 + ' = ' + startVar + '; ' +
        incVar + ' >= 0 ? ' +
        variable0 + ' <= ' + endVar + ' : ' +
        variable0 + ' >= ' + endVar + '; ' +
        variable0 + ' += ' + incVar + ') {\n' +
        branch + '}\n';
  }
  return code;
}


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




(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":3}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
var editMode;
var step;

enterEditMode = module.exports.enterEditMode = function(){
    editMode = true;
    step = 0;
}

enterVisualMode = module.exports.enterVisualMode = function(){
    editMode = false;
    step = 0;
}

incrementStep = module.exports.incrementStep = function(){
    step++;
}

decrementStep = module.exports.decementStep = function(){
    step--;
}

isOnEditMode = module.exports.isOnEditMode = function(){
    return editMode;
}

getCurrentStep = module.exports.getCurrentStep = function(){
    return step;
}
},{}],5:[function(require,module,exports){
var paper = {};
var temporalSymbolTable = {};

module.exports.init = function(){
    paper = Raphael(document.getElementById("paper"), 0,0);
}

updateSymbolTable = module.exports.updateSymbolTable = function(updatedSymbolTable){
    temporalSymbolTable = updateSymbolTable;
    draw();
}

draw = module.exports.draw = function(){
    // get temporal symbol table and draw it
    //var rect1 = paper.rect(20,20,100,100).attr({fill: "blue"});
}

                
},{}],6:[function(require,module,exports){
var ansic = require('./parser/ansic.js');
var raphael = require('./graphics/graphics.js');
var symbolTable = require('./parser/symbolTable.js');
var execution = require('./execution.js');

/* Graphic elements */
var editor;
var externalConsole;


window.onload = function init(){
    
    /* Graphic library init */
    raphael.init();
    
    /* Codemirror autocomplete init */
    
    function passAndHint(cm) {
        setTimeout(function() {cm.execCommand("autocomplete");}, 100);
      	return CodeMirror.Pass;
    }
      
    function myHint(cm) {
     	return CodeMirror.showHint(cm, CodeMirror.ternHint, {async: true}); 
    }
     
    CodeMirror.commands.autocomplete = function(cm) {
        CodeMirror.showHint(cm, myHint);
    }
    
    /* Code mirror init */
    editor = CodeMirror.fromTextArea(document.getElementById("code"), {
        lineNumbers: true,
        styleActiveLine: true,
        theme: 'eclipse',
        mode: 'text/x-csrc',
        matchBrackets: true,
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "Ctrl-Enter": "evaluate"
        }
    });
    
    externalConsole = CodeMirror.fromTextArea(document.getElementById("console"), {
        readOnly: true,
        theme: '3024-night',
        mode: 'none'
    });
    
    
    /* Buttons init */
    document.getElementById("visualize").onclick = visualizeExecution;
    document.getElementById("back").onclick = stepBack;
    document.getElementById("forward").onclick = stepForward;
    document.getElementById("edit").onclick = editCode;
    
    /* Execution init, enter edit mode and clean canvas */
    editCode();
    
}

visualizeExecution = function(){
    var execSuccesful = evaluateText(externalConsole, editor.getValue());
    if(execSuccesful) {
        execution.enterVisualMode();
        
        /* Change buttons state */
        document.getElementById("visualize").disabled = true;
        document.getElementById("back").disabled = true;
        document.getElementById("forward").disabled = false;
        document.getElementById("edit").disabled = false;
        
        /* Disable editor */
        editor.setOption("readOnly", "nocursor");
        
        
        
    }   
}

stepBack = function(){
    if(!execution.isOnEditMode())
        execution.decrementStep();
    
    /* TODO */
    /* Draw current step */
    /* Move line in editor */
}

stepForward = function(){
    if(!execution.isOnEditMode()){
        var symTableHist = symbolTable.getSymbolTableHistory();
        
        
        if(execution.getCurrentStep() >= symTableHist.length){
            document.getElementById("forward").disabled = true;
            return;
        }
        
        var currentStep = execution.getCurrentStep();
        var symTableSnapshot = symTableHist[currentStep];
        
        console.log(symTableSnapshot);
        externalConsole.setValue(symbolTable.hello(symTableSnapshot.table));
        editor.setCursor(symTableSnapshot.line); 
        /* Draw */
        
        execution.incrementStep();
    }
}

editCode = function(){
    /* Erase canvas */
    execution.enterEditMode();
    document.getElementById("visualize").disabled = false;
    document.getElementById("back").disabled = true;
    document.getElementById("forward").disabled = true;
    document.getElementById("edit").disabled = true;
    
    /* Enable editor */
    editor.setOption("readOnly", false);
}


function evaluateText(consoleWindow, text) {
    
    var ast;
    try{
        symbolTable.free();
        ast = ansic.parse(text);
        console.log(symbolTable.getSymbolTableHistory());
        consoleWindow.setValue("Compilation success.");
    } catch (exception) {
        consoleWindow.setValue("Parse Error: " + exception.message);
        return false;
    }
    
    return true;
}

},{"./execution.js":4,"./graphics/graphics.js":5,"./parser/ansic.js":7,"./parser/symbolTable.js":12}],7:[function(require,module,exports){
(function (process){
/* parser generated by jison 0.4.17 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var ansic = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,19],$V1=[1,20],$V2=[1,18],$V3=[1,17],$V4=[1,12],$V5=[1,13],$V6=[1,14],$V7=[1,15],$V8=[1,22],$V9=[5,7,10,30,74,75,76,77,78,84],$Va=[1,26],$Vb=[1,32],$Vc=[7,10,12,14,22,30,67],$Vd=[12,22,63,67,74,75,76,77,78,81,84],$Ve=[1,38],$Vf=[1,37],$Vg=[7,10,12,14,22,30,67,74,75,76,77,78,84],$Vh=[7,10,12,14,22],$Vi=[10,12,14,22,63,67,74,75,76,77,78,81,84],$Vj=[1,44],$Vk=[2,73],$Vl=[5,7,8,9,10,19,24,27,29,30,31,32,33,34,67,74,75,76,77,78,81,83,84,110,111,114,116,117,118,119,120,121,122],$Vm=[7,8,9,10,19,24,27,29,30,31,32,33,34,67,74,75,76,77,78,81,83,84,110,111,114,116,117,118,119,120,121,122],$Vn=[1,58],$Vo=[1,89],$Vp=[1,90],$Vq=[1,91],$Vr=[1,76],$Vs=[1,77],$Vt=[1,79],$Vu=[1,82],$Vv=[1,83],$Vw=[1,84],$Vx=[1,85],$Vy=[1,86],$Vz=[1,87],$VA=[1,61],$VB=[1,59],$VC=[1,60],$VD=[1,63],$VE=[1,64],$VF=[1,65],$VG=[1,66],$VH=[1,67],$VI=[1,68],$VJ=[1,69],$VK=[1,70],$VL=[1,105],$VM=[1,118],$VN=[5,7,8,9,10,19,24,27,29,30,31,32,33,34,67,74,75,76,77,78,81,83,84,110,111,114,115,116,117,118,119,120,121,122],$VO=[7,8,9,10,19,24,27,29,30,31,32,33,34,67,81,83,110,111,114,116,117,118,119,120,121,122],$VP=[7,8,9,10,19,24,27,29,30,31,32,33,34,67,81,83,110,111,114,115,116,117,118,119,120,121,122],$VQ=[2,2],$VR=[7,8,9,10,12,19,24,27,29,30,31,32,33,34,67,81,83,110,111,114,115,116,117,118,119,120,121,122],$VS=[1,127],$VT=[12,15,22,61,67],$VU=[12,15,22,61,67,83],$VV=[12,15,22,29,30,31,32,36,37,40,41,43,44,45,46,48,49,52,54,56,58,60,61,67,83],$VW=[2,28],$VX=[12,15,22,29,30,31,32,36,37,40,41,43,44,45,46,48,49,52,54,56,58,60,61,63,67,83],$VY=[1,148],$VZ=[12,15,22,58,60,61,67,83],$V_=[1,153],$V$=[10,12,14,15,17,18,19,20,22,29,30,31,32,36,37,40,41,43,44,45,46,48,49,52,54,56,58,60,61,63,67,83],$V01=[7,8,9,10,19,24,27,29,30,31,32,33,34],$V11=[12,15,22,56,58,60,61,67,83],$V21=[1,154],$V31=[12,15,22,54,56,58,60,61,67,83],$V41=[1,159],$V51=[12,15,22,52,54,56,58,60,61,67,83],$V61=[1,160],$V71=[12,15,22,29,52,54,56,58,60,61,67,83],$V81=[1,161],$V91=[1,162],$Va1=[12,15,22,29,48,49,52,54,56,58,60,61,67,83],$Vb1=[1,163],$Vc1=[1,164],$Vd1=[1,165],$Ve1=[1,166],$Vf1=[12,15,22,29,43,44,45,46,48,49,52,54,56,58,60,61,67,83],$Vg1=[1,167],$Vh1=[1,168],$Vi1=[12,15,22,29,40,41,43,44,45,46,48,49,52,54,56,58,60,61,67,83],$Vj1=[1,169],$Vk1=[1,170],$Vl1=[12,15,22,29,31,32,40,41,43,44,45,46,48,49,52,54,56,58,60,61,67,83],$Vm1=[1,171],$Vn1=[1,172],$Vo1=[1,173],$Vp1=[12,22],$Vq1=[1,183],$Vr1=[1,184],$Vs1=[22,67,83],$Vt1=[1,217],$Vu1=[2,119],$Vv1=[1,238],$Vw1=[1,237],$Vx1=[1,240],$Vy1=[75,76,77,78,83,84],$Vz1=[22,83],$VA1=[10,12,14,22];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"start":3,"translation_unit":4,"EOF":5,"primary_expression":6,"IDENTIFIER":7,"CONSTANT":8,"STRING_LITERAL":9,"(":10,"expression":11,")":12,"postfix_expression":13,"[":14,"]":15,"argument_expression_list":16,".":17,"PTR_OP":18,"INC_OP":19,"DEC_OP-":20,"assignment_expression":21,",":22,"unary_expression":23,"DEC_OP":24,"unary_operator":25,"cast_expression":26,"SIZEOF":27,"type_name":28,"&":29,"*":30,"+":31,"-":32,"~":33,"!":34,"multiplicative_expression":35,"/":36,"%":37,"additive_expression":38,"shift_expression":39,"LEFT_OP":40,"RIGHT_OP":41,"relational_expression":42,"<":43,">":44,"LE_OP":45,"GE_OP":46,"equality_expression":47,"EQ_OP":48,"NE_OP":49,"and_expression":50,"exclusive_or_expression":51,"^":52,"inclusive_or_expression":53,"|":54,"logical_and_expression":55,"AND_OP":56,"logical_or_expression":57,"OR_OP":58,"conditional_expression":59,"?":60,":":61,"assignment_operator":62,"=":63,"constant_expression":64,"declaration":65,"declaration_specifiers":66,";":67,"init_declarator_list":68,"type_specifier":69,"storage_class_specifier":70,"init_declarator":71,"declarator":72,"initializer":73,"TYPEDEF":74,"TYPE_NAME":75,"CHAR":76,"INT":77,"DOUBLE":78,"struct_or_union_specifier":79,"struct_or_union":80,"{":81,"struct_declaration_list":82,"}":83,"STRUCT":84,"struct_declaration":85,"specifier_qualifier_list":86,"struct_declarator_list":87,"struct_declarator":88,"enum_specifier":89,"ENUM":90,"enumerator_list":91,"enumerator":92,"pointer":93,"direct_declarator":94,"parameter_type_list":95,"identifier_list":96,"parameter_list":97,"ELLIPSIS":98,"parameter_declaration":99,"abstract_declarator":100,"direct_abstract_declarator":101,"initializer_list":102,"statement":103,"labeled_statement":104,"compound_statement":105,"expression_statement":106,"selection_statement":107,"iteration_statement":108,"jump_statement":109,"CASE":110,"DEFAULT":111,"statement_list":112,"declaration_list":113,"IF":114,"ELSE":115,"SWITCH":116,"WHILE":117,"DO":118,"FOR":119,"CONTINUE":120,"BREAK":121,"RETURN":122,"external_declaration":123,"function_definition":124,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",7:"IDENTIFIER",8:"CONSTANT",9:"STRING_LITERAL",10:"(",12:")",14:"[",15:"]",17:".",18:"PTR_OP",19:"INC_OP",20:"DEC_OP-",22:",",24:"DEC_OP",27:"SIZEOF",29:"&",30:"*",31:"+",32:"-",33:"~",34:"!",36:"/",37:"%",40:"LEFT_OP",41:"RIGHT_OP",43:"<",44:">",45:"LE_OP",46:"GE_OP",48:"EQ_OP",49:"NE_OP",52:"^",54:"|",56:"AND_OP",58:"OR_OP",60:"?",61:":",63:"=",67:";",74:"TYPEDEF",75:"TYPE_NAME",76:"CHAR",77:"INT",78:"DOUBLE",81:"{",83:"}",84:"STRUCT",90:"ENUM",98:"ELLIPSIS",110:"CASE",111:"DEFAULT",114:"IF",115:"ELSE",116:"SWITCH",117:"WHILE",118:"DO",119:"FOR",120:"CONTINUE",121:"BREAK",122:"RETURN"},
productions_: [0,[3,2],[6,1],[6,1],[6,1],[6,3],[13,1],[13,4],[13,3],[13,4],[13,3],[13,3],[13,2],[13,2],[16,1],[16,3],[23,1],[23,2],[23,2],[23,2],[23,2],[23,4],[25,1],[25,1],[25,1],[25,1],[25,1],[25,1],[26,1],[26,4],[35,1],[35,3],[35,3],[35,3],[38,1],[38,3],[38,3],[39,1],[39,3],[39,3],[42,1],[42,3],[42,3],[42,3],[42,3],[47,1],[47,3],[47,3],[50,1],[50,3],[51,1],[51,3],[53,1],[53,3],[55,1],[55,3],[57,1],[57,3],[59,1],[59,5],[21,1],[21,3],[62,1],[11,1],[11,3],[64,1],[65,2],[65,3],[66,1],[66,2],[66,1],[66,2],[68,1],[71,1],[71,3],[70,1],[69,1],[69,1],[69,1],[69,1],[69,1],[79,5],[79,2],[80,1],[82,1],[82,2],[85,3],[86,1],[87,1],[88,1],[89,4],[89,5],[89,2],[91,1],[91,3],[92,1],[92,3],[72,2],[72,1],[94,1],[94,3],[94,4],[94,3],[94,4],[94,4],[94,3],[93,1],[93,2],[95,1],[95,3],[97,1],[97,3],[99,2],[99,2],[99,1],[96,1],[96,3],[28,1],[28,2],[100,1],[100,1],[100,2],[101,3],[101,2],[101,3],[101,3],[101,4],[101,2],[101,3],[101,3],[101,4],[73,1],[73,3],[73,4],[102,1],[102,3],[103,1],[103,1],[103,1],[103,1],[103,1],[103,1],[104,3],[104,4],[104,3],[105,2],[105,3],[105,3],[105,4],[113,1],[113,2],[112,1],[112,2],[106,1],[106,2],[107,5],[107,7],[107,5],[108,5],[108,7],[108,6],[108,7],[109,2],[109,2],[109,2],[109,3],[4,1],[4,2],[123,1],[123,1],[124,4],[124,3],[124,3],[124,2]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
 
        return this.$; 
    
break;
case 2: case 99:

        this.$ = parserUtils.generateTuple($$[$0], parserUtils.typeEnum.ID);
    
break;
case 3:

        number = Number($$[$0]);
        // Return pair of value with its type
        // Only int and double are supported
        // TODO Support more types
        if(number % 1 === 0){
            this.$ = parserUtils.generateTuple(number, parserUtils.typeEnum.INT);
        } else {
            this.$ = parserUtils.generateTuple(number, parserUtils.typeEnum.DOUBLE);
        } 
    
break;
case 4: case 10: case 63: case 65: case 119: case 120: case 134: case 136: case 137: case 138: case 139: case 140: case 141: case 151: case 166: case 168: case 169:
this.$ = [$$[$0]];
break;
case 5: case 132: case 146: case 147: case 162: case 163: case 164:
this.$ = [$$[$0-1]];
break;
case 6: case 14: case 16: case 22: case 23: case 24: case 25: case 26: case 27: case 28: case 30: case 34: case 37: case 40: case 45: case 50: case 54: case 56: case 58: case 60: case 68: case 70: case 72: case 75: case 76: case 77: case 78: case 80: case 83: case 87: case 88: case 89: case 131:
this.$ = $$[$0];
break;
case 7: case 9:
this.$ = [$$[$0-3], $$[$0-1]];
break;
case 8: case 133:
this.$ = [$$[$0-2]];
break;
case 11: case 171: case 172:
this.$ = [$$[$0-2], $$[$0-1], $$[$0]];
break;
case 12: case 121: case 152: case 167: case 173:
this.$ = [$$[$0-1], $$[$0]];
break;
case 15: case 64: case 148: case 165:
this.$ = [$$[$0-2], $$[$0-1]];
break;
case 31:

        this.$ = arithmetic.multiply($$[$0-2], $$[$0]);
    
break;
case 32:

        this.$ = arithmetic.divide($$[$0-2], $$[$0]);
    
break;
case 33:

        this.$ = arithmetic.mod($$[$0-2], $$[$0]);
    
break;
case 35:

        //console.log("Addition found at line " + _$[$0-2].first_line + ", col" + _$[$0-2].first_column);
        this.$ = arithmetic.add($$[$0-2], $$[$0]);
    
break;
case 36:

        this.$ = arithmetic.subtract($$[$0-2], $$[$0]);
    
break;
case 48: case 52: case 79:
this.$ = $$[$0] ;
break;
case 61:

        this.$ = assignment.compoundAssign($$[$0-2], $$[$0-1], $$[$0]);
    
break;
case 66:
this.$ = [$$[$0-1]] // Ignore;
break;
case 67:

        declaration.declareType($$[$0-1], $$[$0-2]);
        symbolTable.saveCurrentState(_$[$0-2].first_line);
		this.$ = [$$[$0-2], $$[$0-1]]
    
break;
case 69:
this.$ = [$$[$0-1], $$[$0]] // Not supported;
break;
case 71:
this.$ = [$$[$0-1], $$[$0]] //Not supported;
break;
case 73:

        declaration.simpleDeclare($$[$0]);
        this.$ = $$[$0];
    
break;
case 74:

        declaration.complexDeclare($$[$0-2], $$[$0]);
        this.$ = $$[$0-2];
    
break;
case 81:

		symbolTable.insert($$[$0-3]);
		symbolTable.setType($$[$0-3], parserUtils.typeEnum.STRUCT_TYPE);
		symbolTable.setObject($$[$0-3], $$[$0-1]);

		symbolTable.saveCurrentState(_$[$0-4].first_line);
		this.$ = [$$[$0-4], $$[$0-3], $$[$0-2]]; 
	
break;
case 82:

		console.log("Struct " + $$[$0]);
		this.$ = parserUtils.generateTuple($$[$0], parserUtils.typeEnum.STRUCT_TYPE);
	
break;
case 84:

		this.$ = [$$[$0]];
	
break;
case 85:
 
		$$[$0-1].push( $$[$0] );
		this.$ = $$[$0-1];	
	
break;
case 86:

		if(typeof $$[$0-2] === "string"){
			var normType = parserUtils.typeEnum[$$[$0-2].toUpperCase()];
			this.$ = parserUtils.generateTuple($$[$0-1].value, normType);
		} else if( typeof $$[$0-2] === object) {
			this.$ = parserUtils.generateTuple($$[$0-1].value, $$[$0-2]);
		} else {
			throw new Error("Unknown type " + $$[$0-2] + " in struct declaration");
		}
			
	
break;
case 97: case 107:
this.$ = [$$[$0-1], $$[$0]] //TODO;
break;
case 98:
this.$ = $$[$0] //Directly sends tuple of identifier;
break;
case 106:
this.$ = [$$[$0]]//TODO;
break;
case 135: case 142: case 144:
this.$ = [$$[$0-2], $$[$0]];
break;
case 143:
this.$ = [$$[$0-3], $$[$0-2], $$[$0]];
break;
case 149:
this.$ =[$$[$0]];
break;
case 150:
this.$ =[$$[$0-1], $$[$0]];
break;
case 153:
this.$ = [$$[$0]] //no use;
break;
case 154:

        symbolTable.saveCurrentState(_$[$0-1].first_line);
    
break;
case 170:
this.$ = [$$[$0-3], $$[$0-2], $$[$0-1], $$[$0]];
break;
}
},
table: [{3:1,4:2,7:$V0,10:$V1,30:$V2,65:5,66:6,69:8,70:9,72:7,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,84:$V8,93:10,94:11,123:3,124:4},{1:[3]},{5:[1,23],7:$V0,10:$V1,30:$V2,65:5,66:6,69:8,70:9,72:7,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,84:$V8,93:10,94:11,123:24,124:4},o($V9,[2,166]),o($V9,[2,168]),o($V9,[2,169]),{7:$V0,10:$V1,30:$V2,67:$Va,68:27,71:28,72:25,93:10,94:11},{65:31,66:33,69:8,70:9,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,81:$Vb,84:$V8,105:30,113:29},o($Vc,[2,68],{69:8,70:9,79:16,80:21,66:34,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,84:$V8}),o($Vc,[2,70],{69:8,70:9,79:16,80:21,66:35,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,84:$V8}),{7:$V0,10:$V1,94:36},o($Vd,[2,98],{10:$Ve,14:$Vf}),o($Vg,[2,76]),o($Vg,[2,77]),o($Vg,[2,78]),o($Vg,[2,79]),o($Vg,[2,80]),o($Vg,[2,75]),o($Vh,[2,106],{93:39,30:$V2}),o($Vi,[2,99]),{7:$V0,10:$V1,30:$V2,72:40,93:10,94:11},{7:[1,41]},{7:[2,83]},{1:[2,1]},o($V9,[2,167]),{63:$Vj,65:31,66:33,67:$Vk,69:8,70:9,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,81:$Vb,84:$V8,105:43,113:42},o($Vl,[2,66]),{67:[1,45]},{67:[2,72]},{65:47,66:33,69:8,70:9,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,81:$Vb,84:$V8,105:46},o($V9,[2,173]),o($Vm,[2,149]),{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,65:31,66:33,67:$VA,69:8,70:9,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,81:$Vb,83:[1,48],84:$V8,103:51,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,112:49,113:50,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},{7:$V0,10:$V1,30:$V2,67:$Va,68:27,71:28,72:100,93:10,94:11},o($Vc,[2,69]),o($Vc,[2,71]),o($Vd,[2,97],{10:$Ve,14:$Vf}),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,15:[1,102],19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:103,64:101},{7:[1,110],12:[1,108],66:112,69:8,70:9,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,84:$V8,95:106,96:107,97:109,99:111},o($Vh,[2,107]),{12:[1,113]},o($Vg,[2,82],{81:[1,114]}),{65:47,66:33,69:8,70:9,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,81:$Vb,84:$V8,105:115},o($V9,[2,171]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,21:117,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,73:116,81:$VM},o($Vl,[2,67]),o($V9,[2,172]),o($Vm,[2,150]),o($VN,[2,145]),{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,83:[1,119],103:120,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,65:47,66:33,67:$VA,69:8,70:9,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,81:$Vb,83:[1,121],84:$V8,103:51,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,112:122,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},o($VO,[2,151]),o($VP,[2,136]),o($VP,[2,137]),o($VP,[2,138]),o($VP,[2,139]),o($VP,[2,140]),o($VP,[2,141]),o([10,14,17,18,19,20,22,29,30,31,32,36,37,40,41,43,44,45,46,48,49,52,54,56,58,60,63,67],$VQ,{61:[1,123]}),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:103,64:124},{61:[1,125]},o($VR,[2,153]),{22:$VS,67:[1,126]},{10:[1,128]},{10:[1,129]},{10:[1,130]},{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,103:131,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},{10:[1,132]},{67:[1,133]},{67:[1,134]},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:136,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:[1,135]},o($VT,[2,63]),o($VU,[2,60]),o($VV,$VW,{62:137,63:[1,138]}),o($VU,[2,58],{58:[1,140],60:[1,139]}),o($VX,[2,16],{10:[1,142],14:[1,141],17:[1,143],18:[1,144],19:[1,145],20:[1,146]}),{6:81,7:$VL,8:$Vo,9:$Vp,10:$VY,13:75,19:$Vr,23:147,24:$Vs,25:78,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz},{6:81,7:$VL,8:$Vo,9:$Vp,10:$VY,13:75,19:$Vr,23:149,24:$Vs,25:78,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:150,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz},{6:81,7:$VL,8:$Vo,9:$Vp,10:[1,152],13:75,19:$Vr,23:151,24:$Vs,25:78,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz},o($VZ,[2,56],{56:$V_}),o($V$,[2,6]),o($V01,[2,22]),o($V01,[2,23]),o($V01,[2,24]),o($V01,[2,25]),o($V01,[2,26]),o($V01,[2,27]),o($V11,[2,54],{54:$V21}),o($V$,[2,3]),o($V$,[2,4]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:155,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,28:156,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,69:158,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,84:$V8,86:157},o($V31,[2,52],{52:$V41}),o($V51,[2,50],{29:$V61}),o($V71,[2,48],{48:$V81,49:$V91}),o($Va1,[2,45],{43:$Vb1,44:$Vc1,45:$Vd1,46:$Ve1}),o($Vf1,[2,40],{40:$Vg1,41:$Vh1}),o($Vi1,[2,37],{31:$Vj1,32:$Vk1}),o($Vl1,[2,34],{30:$Vm1,36:$Vn1,37:$Vo1}),o($VV,[2,30]),{63:$Vj,67:$Vk},{15:[1,174]},o($Vi,[2,102]),o([15,61],[2,65]),o($VX,$VW),o($V$,$VQ),{12:[1,175]},{12:[1,176],22:[1,177]},o($Vi,[2,105]),{12:[2,108],22:[1,178]},o($Vp1,[2,115]),o($Vp1,[2,110]),o($Vp1,[2,114],{94:11,72:179,100:180,93:181,101:182,7:$V0,10:$Vq1,14:$Vr1,30:$V2}),o($Vi,[2,100]),{69:158,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,82:185,84:$V8,85:186,86:187},o($V9,[2,170]),{67:[2,74]},o($Vs1,[2,131]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,21:117,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,73:189,81:$VM,102:188},o($VN,[2,146]),o($VO,[2,152]),o($VN,[2,147]),{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,83:[1,190],103:120,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,103:191,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},{61:[1,192]},{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,103:193,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},o($VR,[2,154]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,21:194,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:195,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:196,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:197,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},{117:[1,198]},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,106:199},o($VP,[2,162]),o($VP,[2,163]),o($VP,[2,164]),{22:$VS,67:[1,200]},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,21:201,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},o($V01,[2,62]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:202,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:203},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:204,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,12:[1,205],13:75,16:206,19:$Vr,21:207,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},{7:[1,208]},{7:[1,209]},o($V$,[2,12]),o($V$,[2,13]),o($VX,[2,17]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:155,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},o($VX,[2,18]),o($VX,[2,19]),o($VX,[2,20]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:155,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,28:210,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,69:158,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,84:$V8,86:157},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:211},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:212},{12:[1,213],22:$VS},{12:[1,214]},{10:$Vt1,12:[2,117],14:$Vr1,30:$V2,93:216,100:215,101:182},o([7,10,12,14,30],[2,87]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:218},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:219},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:220},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:221},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:222},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:223},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:224},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:225},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:226},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:227},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:228},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:229},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:230,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:231,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:232,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz},o($Vi,[2,101]),o($Vi,[2,103]),o($Vi,[2,104]),{7:[1,233]},{66:112,69:8,70:9,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,84:$V8,98:[1,234],99:235},o($Vp1,[2,112]),o($Vp1,[2,113]),o($Vp1,$Vu1,{94:36,101:236,7:$V0,10:$Vq1,14:$Vr1}),o($Vp1,[2,120],{10:$Vv1,14:$Vw1}),{7:$V0,10:$Vq1,12:$Vx1,14:$Vr1,30:$V2,66:112,69:8,70:9,72:40,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,84:$V8,93:181,94:11,95:241,97:109,99:111,100:239,101:182},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,15:[1,242],19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:103,64:243},{69:158,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,83:[1,244],84:$V8,85:245,86:187},o($Vy1,[2,84]),{7:$V0,10:$V1,30:$V2,72:248,87:246,88:247,93:10,94:11},{22:[1,250],83:[1,249]},o($Vz1,[2,134]),o($VN,[2,148]),o($VP,[2,142]),{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,103:251,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},o($VP,[2,144]),o($VT,[2,64]),{12:[1,252],22:$VS},{12:[1,253],22:$VS},{12:[1,254],22:$VS},{10:[1,255]},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,106:256},o($VP,[2,165]),o($VU,[2,61]),{22:$VS,61:[1,257]},o($VZ,[2,57],{56:$V_}),{15:[1,258],22:$VS},o($V$,[2,8]),{12:[1,259],22:[1,260]},o($Vp1,[2,14]),o($V$,[2,10]),o($V$,[2,11]),{12:[1,261]},o($V11,[2,55],{54:$V21}),o($V31,[2,53],{52:$V41}),o($V$,[2,5]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:262,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz},{12:[2,118]},{10:$Vt1,12:$Vu1,14:$Vr1,101:236},{10:$Vt1,12:$Vx1,14:$Vr1,30:$V2,66:112,69:8,70:9,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,84:$V8,93:216,95:241,97:109,99:111,100:239,101:182},o($V51,[2,51],{29:$V61}),o($V71,[2,49],{48:$V81,49:$V91}),o($Va1,[2,46],{43:$Vb1,44:$Vc1,45:$Vd1,46:$Ve1}),o($Va1,[2,47],{43:$Vb1,44:$Vc1,45:$Vd1,46:$Ve1}),o($Vf1,[2,41],{40:$Vg1,41:$Vh1}),o($Vf1,[2,42],{40:$Vg1,41:$Vh1}),o($Vf1,[2,43],{40:$Vg1,41:$Vh1}),o($Vf1,[2,44],{40:$Vg1,41:$Vh1}),o($Vi1,[2,38],{31:$Vj1,32:$Vk1}),o($Vi1,[2,39],{31:$Vj1,32:$Vk1}),o($Vl1,[2,35],{30:$Vm1,36:$Vn1,37:$Vo1}),o($Vl1,[2,36],{30:$Vm1,36:$Vn1,37:$Vo1}),o($VV,[2,31]),o($VV,[2,32]),o($VV,[2,33]),o($Vp1,[2,116]),{12:[2,109]},o($Vp1,[2,111]),o($Vp1,[2,121],{10:$Vv1,14:$Vw1}),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,15:[1,263],19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:103,64:264},{12:[1,265],66:112,69:8,70:9,74:$V3,75:$V4,76:$V5,77:$V6,78:$V7,79:16,80:21,84:$V8,95:266,97:109,99:111},{12:[1,267]},o($VA1,[2,127]),{12:[1,268]},o($VA1,[2,123]),{15:[1,269]},o($Vg,[2,81]),o($Vy1,[2,85]),{67:[1,270]},{67:[2,88]},{67:[2,89]},o($Vs1,[2,132]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,21:117,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,73:272,81:$VM,83:[1,271]},o($VP,[2,143]),{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,103:273,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,103:274,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,103:275,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:276,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,11:278,12:[1,277],13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,23:104,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:279},o($V$,[2,7]),o($V$,[2,9]),{6:81,7:$VL,8:$Vo,9:$Vp,10:$Vq,13:75,19:$Vr,21:280,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72},o($VX,[2,21]),o($VX,[2,29]),o($VA1,[2,125]),{15:[1,281]},o($VA1,[2,129]),{12:[1,282]},o($VA1,[2,122]),o($VA1,[2,128]),o($VA1,[2,124]),o($Vy1,[2,86]),o($Vs1,[2,133]),o($Vz1,[2,135]),o($VO,[2,155],{115:[1,283]}),o($VP,[2,157]),o($VP,[2,158]),{12:[1,284],22:$VS},{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,103:285,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},{12:[1,286],22:$VS},o($VU,[2,59]),o($Vp1,[2,15]),o($VA1,[2,126]),o($VA1,[2,130]),{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,103:287,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},{67:[1,288]},o($VP,[2,160]),{6:81,7:$Vn,8:$Vo,9:$Vp,10:$Vq,11:62,13:75,19:$Vr,21:71,23:73,24:$Vs,25:78,26:99,27:$Vt,29:$Vu,30:$Vv,31:$Vw,32:$Vx,33:$Vy,34:$Vz,35:98,38:97,39:96,42:95,47:94,50:93,51:92,53:88,55:80,57:74,59:72,67:$VA,81:$Vb,103:289,104:52,105:53,106:54,107:55,108:56,109:57,110:$VB,111:$VC,114:$VD,116:$VE,117:$VF,118:$VG,119:$VH,120:$VI,121:$VJ,122:$VK},o($VP,[2,156]),o($VP,[2,159]),o($VP,[2,161])],
defaultActions: {22:[2,83],23:[2,1],28:[2,72],116:[2,74],215:[2,118],234:[2,109],247:[2,88],248:[2,89]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        function _parseError (msg, hash) {
            this.message = msg;
            this.hash = hash;
        }
        _parseError.prototype = Error;

        throw new _parseError(str, hash);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};

    var symbolTable;
 
var symbolTable = require('./symbolTable.js');
var parserUtils = require('./parserUtils.js');
var arithmetic = require('./arithmetic.js');
var assignment = require('./assignment.js');
var declaration = require('./declaration.js');/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* IGNORE */                                 
break;
case 1:/* IGNORE */
break;
case 2:/* IGNORE */
break;
case 3:return 8
break;
case 4:return 'RIGHT_ASSIGN'
break;
case 5:return 'LEFT_ASSIGN'
break;
case 6:return 'ADD_ASSIGN'
break;
case 7:return 'SUB_ASSIGN'
break;
case 8:return 'MUL_ASSIGN'
break;
case 9:return 'DIV_ASSIGN'
break;
case 10:return 'MOD_ASSIGN'
break;
case 11:return 'AND_ASSIGN'
break;
case 12:return 'XOR_ASSIGN'
break;
case 13:return 'OR_ASSIGN'
break;
case 14:return 41
break;
case 15:return 40
break;
case 16:return 19
break;
case 17:return 24
break;
case 18:return 18
break;
case 19:return 56
break;
case 20:return 58
break;
case 21:return 45
break;
case 22:return 46
break;
case 23:return 48
break;
case 24:return 49
break;
case 25:return 67
break;
case 26:return 81
break;
case 27:return 83
break;
case 28:return 22
break;
case 29:return 61
break;
case 30:return 63
break;
case 31:return 10
break;
case 32:return 12
break;
case 33:return 14
break;
case 34:return 15
break;
case 35:return 17
break;
case 36:return 29
break;
case 37:return 34
break;
case 38:return 33
break;
case 39:return 32
break;
case 40:return 31
break;
case 41:return 30
break;
case 42:return 36
break;
case 43:return 37
break;
case 44:return 43
break;
case 45:return 44
break;
case 46:return 52
break;
case 47:return 54
break;
case 48:return 60
break;
case 49:return 121
break;
case 50:return 110
break;
case 51:return 76
break;
case 52:return 120
break;
case 53:return 111
break;
case 54:return 118
break;
case 55:return 78
break;
case 56:return 115
break;
case 57:return 'FLOAT'
break;
case 58:return 119
break;
case 59:return 114
break;
case 60:return 77
break;
case 61:return 'LONG'
break;
case 62:return 122
break;
case 63:return 'SHORT'
break;
case 64:return 'SIGNED'
break;
case 65:return 27
break;
case 66:return 84
break;
case 67:return 116
break;
case 68:return 74
break;
case 69:return 'UNION'
break;
case 70:return 'UNSIGNED'
break;
case 71:return 'VOID'
break;
case 72:return 117
break;
case 73:return 7 
break;
case 74:return 9
break;
case 75:return 5
break;
case 76:return 'INVALID'
break;
}
},
rules: [/^(?:[\t\v\n\f\s]+)/,/^(?:\/\/.*)/,/^(?:[\/][*][^*]*[*]+([^\/*][^*]*[*]+)*[\/])/,/^(?:[0-9]+(\.[0-9]+)?\b)/,/^(?:>>=)/,/^(?:<<=)/,/^(?:\+=)/,/^(?:-=)/,/^(?:\*=)/,/^(?:\/=)/,/^(?:%=)/,/^(?:&=)/,/^(?:\^=)/,/^(?:\|=)/,/^(?:>>)/,/^(?:<<)/,/^(?:\+\+)/,/^(?:--)/,/^(?:->)/,/^(?:&&)/,/^(?:\|\|)/,/^(?:<=)/,/^(?:>=)/,/^(?:==)/,/^(?:!=)/,/^(?:;)/,/^(?:\{)/,/^(?:\})/,/^(?:,)/,/^(?::)/,/^(?:=)/,/^(?:\()/,/^(?:\))/,/^(?:\[)/,/^(?:\])/,/^(?:\.)/,/^(?:&)/,/^(?:!)/,/^(?:~)/,/^(?:-)/,/^(?:\+)/,/^(?:\*)/,/^(?:\/)/,/^(?:%)/,/^(?:<)/,/^(?:>)/,/^(?:\^)/,/^(?:\|)/,/^(?:\?)/,/^(?:break\b)/,/^(?:case\b)/,/^(?:char\b)/,/^(?:continue\b)/,/^(?:default\b)/,/^(?:do\b)/,/^(?:double\b)/,/^(?:else\b)/,/^(?:float\b)/,/^(?:for\b)/,/^(?:if\b)/,/^(?:int\b)/,/^(?:long\b)/,/^(?:return\b)/,/^(?:short\b)/,/^(?:signed\b)/,/^(?:sizeof\b)/,/^(?:struct\b)/,/^(?:switch\b)/,/^(?:typedef\b)/,/^(?:union\b)/,/^(?:unsigned\b)/,/^(?:void\b)/,/^(?:while\b)/,/^(?:[_a-zA-Z][_a-zA-Z0-9]*)/,/^(?:"[^"]+")/,/^(?:$)/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = ansic;
exports.Parser = ansic.Parser;
exports.parse = function () { return ansic.parse.apply(ansic, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require('_process'))
},{"./arithmetic.js":8,"./assignment.js":9,"./declaration.js":10,"./parserUtils.js":11,"./symbolTable.js":12,"_process":3,"fs":1,"path":2}],8:[function(require,module,exports){
var parserUtils = require('./parserUtils.js');
var symbolTable = require('./symbolTable.js');

var add = module.exports.add = function(operand1, operand2){
    
    // Convert identifiers to its value
    if(operand1.type === parserUtils.typeEnum.ID)
        operand1 = symbolTable.getObject(operand1.value);
    
    if(operand2.type === parserUtils.typeEnum.ID)
        operand2 = symbolTable.getObject(operand2.value);
    
    // Assure correct type of arguments
    if(operand1.type !== parserUtils.typeEnum.INT
        && operand1.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of addition must be numbers");
    
    if(operand2.type !== parserUtils.typeEnum.INT
        && operand2.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of addition must be numbers");
    
    var op1Val = operand1.value;
    var op2Val = operand2.value;
    
    
    if(isNaN(op1Val) || isNaN(op2Val)){
        throw new TypeError("Invalid arguments of addition");
    }
    
    // Calculate return type
    var resultType;
    if(operand1.type === parserUtils.typeEnum.INT && operand2.type ===  parserUtils.typeEnum.INT)
        resultType = parserUtils.typeEnum.INT;
    else
        resultType = parserUtils.typeEnum.DOUBLE;
    
    return parserUtils.generateTuple(op1Val + op2Val, resultType);
    
}

var subtract = module.exports.subtract = function(operand1, operand2){
    
    if(operand1.type === parserUtils.typeEnum.ID)
        operand1 = symbolTable.getObject(operand1.value);
    
    if(operand2.type === parserUtils.typeEnum.ID)
        operand2 = symbolTable.getObject(operand2.value);
    
    // Assure correct type of arguments
    if(operand1.type !== parserUtils.typeEnum.INT
        && operand1.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of addition must be numbers");
    
    if(operand2.type !== parserUtils.typeEnum.INT
        && operand2.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of addition must be numbers");
    
    var op1Val = operand1.value;
    var op2Val = operand2.value;
    
    
    if(isNaN(op1Val) || isNaN(op2Val)){
        throw new TypeError("Invalid arguments of addition");
    }
    
    // Calculate return type
    var resultType;
    if(operand1.type === parserUtils.typeEnum.INT && operand2.type ===  parserUtils.typeEnum.INT)
        resultType = parserUtils.typeEnum.INT;
    else
        resultType = parserUtils.typeEnum.DOUBLE;
    
    return parserUtils.generateTuple(op1Val - op2Val, resultType);
    
}

var multiply = module.exports.multiply = function(operand1, operand2){
    
    // Convert identifiers to its value
    if(operand1.type === parserUtils.typeEnum.ID)
        operand1 = symbolTable.getObject(operand1.value);
    
    if(operand2.type === parserUtils.typeEnum.ID)
        operand2 = symbolTable.getObject(operand2.value);
    
    // Assure correct type of arguments
    if(operand1.type !== parserUtils.typeEnum.INT
        && operand1.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of multiplication must be numbers");
    
    if(operand2.type !== parserUtils.typeEnum.INT
        && operand2.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of multiplication must be numbers");
    
    var op1Val = operand1.value;
    var op2Val = operand2.value;
    
    
    if(isNaN(op1Val) || isNaN(op2Val)){
        throw new TypeError("Invalid arguments of multiplication");
    }
    
    // Calculate return type
    var resultType;
    if(operand1.type === parserUtils.typeEnum.INT && operand2.type ===  parserUtils.typeEnum.INT)
        resultType = parserUtils.typeEnum.INT;
    else
        resultType = parserUtils.typeEnum.DOUBLE;
    
    return parserUtils.generateTuple(op1Val * op2Val, resultType);
}

// TODO: Division by 0
var divide = module.exports.divide = function(operand1, operand2){
    
    // Convert identifiers to its value
    if(operand1.type === parserUtils.typeEnum.ID)
        operand1 = symbolTable.getObject(operand1.value);
    
    if(operand2.type === parserUtils.typeEnum.ID)
        operand2 = symbolTable.getObject(operand2.value);
    
    // Assure correct type of arguments
    if(operand1.type !== parserUtils.typeEnum.INT
        && operand1.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of division must be numbers");
    
    if(operand2.type !== parserUtils.typeEnum.INT
        && operand2.type !== parserUtils.typeEnum.DOUBLE)
        throw new TypeError("Arguments of division must be numbers");
    
    var op1Val = operand1.value;
    var op2Val = operand2.value;
    
    
    if(isNaN(op1Val) || isNaN(op2Val)){
        throw new TypeError("Invalid arguments of division");
    }
    
    // Calculate return type
    var resultDivision;
    var resultType;
    if(operand1.type === parserUtils.typeEnum.INT && operand2.type ===  parserUtils.typeEnum.INT){
        resultDivision = ~~(op1Val / op2Val);
        resultType = parserUtils.typeEnum.INT;
    } else {
        resultDivision = op1Val / op2Val;
        resultType = parserUtils.typeEnum.DOUBLE;
    }
    
    return parserUtils.generateTuple(resultDivision, resultType);
}

var mod = module.exports.mod = function(operand1, operand2){
    // Convert identifiers to its value
    if(operand1.type === parserUtils.typeEnum.ID)
        operand1 = symbolTable.getObject(operand1.value);
    
    if(operand2.type === parserUtils.typeEnum.ID)
        operand2 = symbolTable.getObject(operand2.value);
    
    if(operand1.type !== parserUtils.typeEnum.INT)
            throw new TypeError("Arguments of remainder must be integer numbers.");
        
    if(operand2.type !== parserUtils.typeEnum.INT)
            throw new TypeError("Arguments of remainder must be integer numbers.");
    
    var op1Val = operand1.value;
    var op2Val = operand2.value;
    var modulus = op1Val % op2Val;
        
    if(isNaN(op1Val) || isNaN(op2Val) || isNaN(modulus)){
        throw new TypeError("Value of remainder is invalid.");
    }
    
    return parserUtils.generateTuple(modulus, parserUtils.typeEnum.INT);
}
},{"./parserUtils.js":11,"./symbolTable.js":12}],9:[function(require,module,exports){
var parserUtils = require('./parserUtils.js');
var symbolTable = require('./symbolTable');

var compoundAssign = module.exports.compoundAssign = function(identifier, operator, tuple){
    if(operator === '=')
        return assign(identifier, tuple);
    else
        throw new TypeError('Assignment operator ' + operator + ' not supported');
    
    
}

var assign = function(identifier, tuple){
    // Check if identifier has already been defined in symbol table
    if(!symbolTable.lookUp(identifier.value))
        throw new Error('Identifier ' + identifier.value + ' is not defined.');
    
    // If it is an identifier, convert to its value
    if(tuple.type === parserUtils.typeEnum.ID)
        tuple = symbolTable.getObject(tuple.value);
    
    // Compare types
    var idType = symbolTable.getType(identifier.value);
    console.log(idType);
    var tupleType = tuple.type;
    
    if(!isAssignable(idType, tupleType))
        throw new Error('Type ' + parserUtils.getReversedTypeEnum(tupleType) + ' can not be assigned to type ' + parserUtils.getReversedTypeEnum(idType));
    
    // Cast according to type
    var objectToAssign = cast(symbolTable.getType(identifier.value), tuple);
    
    // Apply assignment operator
    symbolTable.setObject(identifier.value, tuple);
    return symbolTable.getObject(identifier.value);
}

// TODO: With more types the cast is more complex
var cast = module.exports.cast = function(objectiveType, object){
    return parserUtils.generateTuple(object.value, objectiveType);
}

var isAssignable = module.exports.isAssignable = function(objectiveType , receivedType){
    if(objectiveType === receivedType)
        return true;
    
    if(objectiveType === parserUtils.typeEnum.DOUBLE){
        if(receivedType === parserUtils.typeEnum.INT)
            return true;
    }
    
    return false;
}
},{"./parserUtils.js":11,"./symbolTable":12}],10:[function(require,module,exports){
symbolTable = require('./symbolTable.js');
assignment = require('./assignment.js');

simpleDeclare = module.exports.simpleDeclare = function(declarator){
    if(symbolTable.lookUp(declarator.value)){
        symbolTable.free();
        throw new Error('Multiple definition of ' + declarator.value);
    }
    
    symbolTable.insert(declarator.value);
}

complexDeclare = module.exports.complexDeclare = function(declarator, initializer){
    
    simpleDeclare(declarator);
    
    // Convert identifiers to its value
    if(initializer.type === parserUtils.typeEnum.ID)
        initializer = symbolTable.getObject(initializer.value);
    
    symbolTable.setObject(declarator.value, initializer);
}

// TODO: Convert inside object to declarator type
declareType = module.exports.declareType = function(declarator, type){
    if(typeof type === "string")
        var normType = parserUtils.typeEnum[type.toUpperCase()];
    else
        var normType = type;
    
    // Declarator has no object assigned
    var objectAssigned = symbolTable.getObject(declarator.value);
    
    if(objectAssigned === undefined){
        symbolTable.setType(declarator.value, normType);
        return;
    }
    
    // Check if type can be assigned
    if(!assignment.isAssignable(normType, objectAssigned.type)){
        symbolTable.free();
        throw new TypeError('Type ' + parserUtils.getReversedTypeEnum(objectAssigned.type) + 
                           ' can not be assigned to type ' + parserUtils.getReversedTypeEnum(normType));
    }
        
    symbolTable.setType(declarator.value, normType);
}
},{"./assignment.js":9,"./symbolTable.js":12}],11:[function(require,module,exports){
var typeEnum = module.exports.typeEnum = {
    INT: 1,
    DOUBLE: 2,
    ID: 3,
    STRUCT_TYPE : 4,
    STRUCT_DECLARATION_LIST : 5
};

var getReversedTypeEnum = module.exports.getReversedTypeEnum = function(typeNumber){
    for(var key in typeEnum){
        if(typeEnum[key] === typeNumber)
            return key;
    }
    
    throw new Error("Type number not found.");
}

var generateTuple = module.exports.generateTuple = function(val, typ){
    return Object.freeze({value: val, type: typ });
}
},{}],12:[function(require,module,exports){
parserUtils = require('./parserUtils.js');

// List of symbol tables with row number associated.
var symbolTableHistory = [];
var symbolTable = {};

var free = module.exports.free = function(){
    symbolTable = {};
    symbolTableHistory = [];
}

var insert = module.exports.insert = function(key){
    symbolTable[key] = {type: undefined, object: undefined};
}

var setObject = module.exports.setObject = function(key, object){
    symbolTable[key].object = object;
}

var getObject = module.exports.getObject = function(key){
    return symbolTable[key].object;
}

var setType = module.exports.setType = function(key, type){
    symbolTable[key].type = type;
}

var getType = module.exports.getType = function(key){
    return symbolTable[key].type;
}

var lookUpSymbolTable = module.exports.lookUp = function(key){
    return symbolTable.hasOwnProperty(key);
}

var getSymbolTableHistory = module.exports.getSymbolTableHistory = function(){
    return symbolTableHistory;
}

var saveCurrentState = module.exports.saveCurrentState = function(currentRow){
    symbolTableHistory.push( {table:JSON.parse(JSON.stringify(symbolTable)), line:currentRow - 1} );
}


var print =  module.exports.print  = function(){
    console.log("Print symbol table.");
    for(key in symbolTable){
        if(symbolTable[key].object === undefined)
            console.log("Key: " + key + ", Object value: undefined, Type: " + symbolTable[key].type);
        else
            console.log("Key: " + key + " Object value: " + symbolTable[key].object.value + " Type: " + symbolTable[key].type);
    }
}

var hello = module.exports.hello = function(snap){
        var toReturn = "Symbol table: \n";
    for(key in snap){
        if(snap[key].object === undefined){
            toReturn += ("\tKey: " + key + " Object value: undefined, Type: " + snap[key].type + "\n");
        } else if ( Array.isArray(snap[key].object)){
            var arryValue = "\n\t Object value:";
            for(var i = 0; i < snap[key].object.length; i++)
                arryValue += ("\n\t\t " + snap[key].object[i].value);
            toReturn += ("\tKey: " + key + ", " + arryValue + ",\n\t\t Type: " + snap[key].type + "\n");
        } else {
            toReturn += ("\tKey: " + key + " Object value: " + snap[key].object.value + " Type: " + snap[key].type + "\n");
        }
            
    }
    return toReturn;
}
},{"./parserUtils.js":11}]},{},[6]);

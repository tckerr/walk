(function(window) {
    'use strict';

    function defineWalk() {
        var Walk;
        Walk = {
            __exceptions: {
                classNotFound: function(key) {
                    throw "No associated class found for key: '" + key + "'.";
                },
                traversalFault: function(type) {
                    throw "This function is not available when running in " + type + " mode! See the documentation for details.";
                },
                notImplemented: function(fn) {
                    throw fn + " not implemented yet but will be soon!";
                },
                structureFault: function() {
                    throw "The object violates the defined structure. Override 'dataStructure' in the config to allow parsing different object structures.";
                },
                stopProcess: function(){
                    throw "walk:stopProcess";
                },
                validationError: function(err){
                    throw err;
                }
            },
            break: function(){
                Walk.__exceptions.stopProcess();
            },
            defaultCallbackPosition: 'postWalk',
            configDefaults: {
                classMap: {},
                logger: console,
                traversalMode: 'depth',
                enforceRootClass: false,
                strictClasses: false,
                rootObjectCallbacks: true,
                runCallbacks: true,
                monitorPerformance: false,
                dataStructure: 'finiteTree', //tree, graph, infinite
                pathFormat: function(key, isArr) {
                    return isArr ? '[' + key + ']' : '["' + key + '"]';
                },
                callbacks: []
            },
            __data: {
                reports: []
            },
            __classes: {
                node: function(uuid, key, val, type, className, isRoot, path, container, executedCallbacks, parent){
                    this._meta = {
                        children: [],
                        parents: []
                    };
                    this.uuid = uuid;
                    this.key = key;
                    this.val = val;
                    this.type = type;
                    this.className = className;
                    this.isRoot = isRoot;
                    this.path = path;
                    this.container = container;
                    this.executedCallbacks = executedCallbacks;
                    this.parent = parent;
                    if (this.parent){
                        this.parent._meta.children.push(this);
                    }
                }
            },
            __nodeFactory: function(uuid, key, val, type, className, isRoot, path, container, executedCallbacks, parent){
                return new Walk.__classes.node(uuid, key, val, type, className, isRoot, path, container, executedCallbacks, parent);
            },
            __callbackPrioritySort: function(a, b) {
                var x = a.priority;
                var y = b.priority;
                return ((x < y) ? 1 : ((x > y) ? -1 : 0));
            },
            __partial: function(fn) {
                var args = Array.prototype.slice.call(arguments, 1);
                return function() {
                    var allArgs = args.concat(Array.prototype.slice.call(arguments));
                    return fn.apply(this, allArgs);
                };
            },
            __buildNode: function(key, val, className, parent, isRoot, path, container) {
                var uuid = ++Walk.__runtime.uuidCounter;
                var node = Walk.__nodeFactory(
                    uuid,
                    key,
                    val,
                    typeof(val),
                    className,
                    isRoot,
                    path,
                    container,
                    [],
                    parent
                    );
                return node;
            },
            __matchedCallbacks: function(node, position) {

                var runCallbacks = Walk.__runtime.config.runCallbacks;
                var matched = [];
                if (runCallbacks) {
                    if (node.isRoot && !Walk.__runtime.config.rootObjectCallbacks) {
                        return matched;
                    }
                    var callbacks = Walk.__runtime.positionCallbacks[position];
                    if (typeof callbacks == 'undefined') {
                        return [];
                    }
                    for (var i = 0; i < callbacks.length; ++i) {
                        var callback = callbacks[i];

                        // exit if containers are defined and not in list
                        if (typeof(callback.containers) !== 'undefined' && callback.containers.indexOf(node.container) === -1) {
                            continue;
                        }

                        // exit if classNames are defined and not in list
                        if (typeof(callback.classNames) !== 'undefined' && callback.classNames.indexOf(node.className) === -1) {
                            continue;
                        }                      

                        // exit if keys are defined and not in list
                        var keysDef = typeof(callback.keys) !== 'undefined';
                        var classKeysDef = typeof(callback.classKeys) !== 'undefined';
                        if (keysDef || classKeysDef) {
                            if (typeof(node.key) === 'undefined') {
                                continue;
                            }
                            if (!keysDef) {
                                if (typeof(node.parent.className) === 'undefined' || typeof(callback.classKeys[node.parent.className]) === 'undefined' || callback.classKeys[node.parent.className].indexOf(node.key) === -1) {
                                    continue;
                                }
                            } else if (callback.keys.indexOf(node.key) === -1) {
                                continue;
                            }
                        }

                        matched.push(callback);
                    }
                }
                return matched;
            },
            __execCallbacks: function(callbacks, node) {
                for (var p = 0; p < callbacks.length; ++p) {
                    callbacks[p].__walk$_has_run = false; // only in case users want this, not used internally
                }
                for (var i = 0; i < callbacks.length; ++i) {
                    if (Walk.__runtime.config.monitorPerformance) {
                        var cbStackStart = new Date();
                        callbacks[i].callback(node);
                        Walk.__data.reports[Walk.__runtime.reportId].callbackProcessingTime += new Date() - cbStackStart;
                    } else {
                        callbacks[i].callback(node);
                    }
                    callbacks[i].__walk$_has_run = true;
                    node.executedCallbacks.push(callbacks[i]);
                }
                for (var k = 0; k < callbacks.length; ++k) {
                    delete callbacks[k].__walk$_has_run;
                }
            },
            __log: function(args, type) {
                if (Walk.__runtime.config.log !== true) {
                    return;
                }
                if (typeof(type) === 'undefined') {
                    type = 1;
                }
                if (type === 1) {
                    Walk.__runtime.config.logger.log.apply(console, args);
                } else if (type === 2) {
                    if (typeof(console.group) !== 'undefined') {
                        Walk.__runtime.config.logger.group.apply(console, args);
                    }
                } else if (type === 3) {
                    if (typeof(console.groupEnd) !== 'undefined') {
                        Walk.__runtime.config.logger.groupEnd.apply(console, args);
                    }
                }
            },            
            __getContainerType: function(val){
                // check to make sure the value is set before checking constructor
                var containerType;
                var canCheckConstructor = !(typeof(val) === 'undefined' || val === null);
                if (canCheckConstructor && val.constructor == Array) {
                    containerType = 'array';
                } else if (canCheckConstructor && val.constructor == Object) {
                    containerType = 'object';
                } else {
                    // TODO: better type evaluation (dates, etc)
                    containerType = 'value';
                }
                return containerType;
            },
            __getClassName: function(className, key, container, isRoot){
                // set class by looking up my key in the classMap
                if (typeof(className) === 'undefined') {
                    var classMap = Walk.__runtime.config.classMap;
                    var noClassDefinition = !classMap || !Walk.__runtime.config.classMap[key];
                    var notRootExempt = !isRoot || (isRoot && Walk.__runtime.config.enforceRootClass);
                    if (Walk.__runtime.config.strictClasses && noClassDefinition && notRootExempt && container == 'object') {
                        // throw exception if necessary definitions aren't set
                        Walk.__exceptions.classNotFound(key);
                    } else if (!noClassDefinition) {
                        //class definition exists, so set class
                        className = Walk.__runtime.config.classMap[key];
                    }
                } else {
                    // class pre-set, so inheret (this should only happen for items in arrays)
                }

                // for reports, process class names now
                if (Walk.__runtime.config.monitorPerformance) {
                    Walk.__data.reports[Walk.__runtime.reportId].processed[container] += 1;
                    if (typeof(className) !== 'undefined' && container != 'array') {
                        if (typeof(Walk.__data.reports[Walk.__runtime.reportId].processed.classInstances[className]) === 'undefined') {
                            Walk.__data.reports[Walk.__runtime.reportId].processed.classInstances[className] = 1;
                        } else {
                            Walk.__data.reports[Walk.__runtime.reportId].processed.classInstances[className] += 1;
                        }
                    }
                }
                return className;
            },
            __process: function(data, mode, queue){

                var key = data.key;
                var val = data.val;
                var className = data.className;
                var isRoot = data.isRoot;
                var path = data.path;
                var parent = data.parent;

                if (typeof(isRoot) == 'undefined') { isRoot = false; }
                if (typeof(path) == 'undefined') { path = ''; }

                var container = Walk.__getContainerType(val);
                if (container === 'object' || container === 'array'){
                    if (!Walk.__checkStructure(val)){
                        return;
                    }
                }
                className = Walk.__getClassName(className, key, container, isRoot);
                var node = Walk.__buildNode(key, val, className, parent, isRoot, path, container);
                var matchedPreCallbacks = Walk.__matchedCallbacks(node, 'preWalk');
                Walk.__execCallbacks(matchedPreCallbacks, node);               

                var childData;
                // add children to queue
                if (container === 'array'){
                    for (var i = 0; i < val.length; ++i) {
                        childData = {
                            key: undefined,
                            val: val[i],
                            className: className,
                            isRoot: false,
                            path: path + Walk.__runtime.config.pathFormat(i, true),
                            parent: node
                        };
                        if (mode === 'breadth') {
                            queue.push(childData);
                        } else if (mode === 'depth') {
                            Walk.__process(childData, 'depth');
                        }                        
                    } 
                } else if (container === 'object'){                    
                    for (var xkey in val) {
                        if (val.hasOwnProperty(xkey)) {                                
                            childData = {
                                key: xkey,
                                val: val[xkey],
                                className: undefined, // className
                                isRoot: false, //isRoot
                                path: path + Walk.__runtime.config.pathFormat(xkey, false), // path
                                parent: node
                            };
                            if (mode === 'breadth') {
                                queue.push(childData);
                            } else if (mode === 'depth') {
                                Walk.__process(childData, 'depth');
                            }
                        }
                    }
                }
                // match and run post-traverse callbacks
                var matchedPostCallbacks = Walk.__matchedCallbacks(node, 'postWalk');
                Walk.__execCallbacks(matchedPostCallbacks, node);

            },
            // does a traversal to build the map AND runs callbacks (inline, so only parent is accessible)
            __breadthTraverse: function(inputData) {
                var queue = []; 
                var current;
                Walk.__process(inputData, 'breadth', queue);
                while( queue.length > 0 ){
                    current = queue.shift();
                    Walk.__process(current, 'breadth', queue);
                }
            },            
            // does a traversal to build the map AND runs callbacks (inline, so only parent is accessible)
            __depthTraverse: function(inputData) {
                Walk.__process(inputData, 'depth');
            },
            __validateConfig: function(config) {
                for (var key in config){
                    var allowed = false;
                    for (var xkey in Walk.configDefaults){
                        if (key === xkey){
                            allowed = true;
                            break;
                        }
                    }
                    if (!allowed){
                        Walk.__exceptions.validationError("'" + key + "' is not a valid configuration entry.");
                    }
                }
            },
            __initializeWalk: function(config) {
                Walk.__runtime = {};
                Walk.__runtime.config = {};
                Walk.__runtime.nodes = {};
                Walk.__runtime.uuidCounter = 0;
                Walk.__runtime.seenObjects = [];
                Object.assign(Walk.__runtime.config, Walk.configDefaults);
                Object.assign(Walk.__runtime.config, config);

                Walk.__validateConfig(Walk.__runtime.config);

                if (Walk.__runtime.config.traversalMode !== 'depth' && Walk.__runtime.config.traversalMode !== 'breadth') {
                    Walk.__exceptions.notImplemented("Traversal modes other than 'depth' and 'breadth' are");
                }

                Walk.__runtime.positionCallbacks = {};
                    // set callbacks initial properties and assign to lists
                for (var i = 0; i < Walk.__runtime.config.callbacks.length; ++i) {
                    if (typeof Walk.__runtime.config.callbacks[i].priority == 'undefined') {
                        Walk.__runtime.config.callbacks[i].priority = 0;
                    }
                    if (typeof Walk.__runtime.config.callbacks[i].positions == 'undefined' || Walk.__runtime.config.callbacks[i].positions.length < 1) {
                        Walk.__runtime.config.callbacks[i].positions = [Walk.defaultCallbackPosition];
                    }
                    for (var p = 0; p < Walk.__runtime.config.callbacks[i].positions.length; ++p) {
                        var position = Walk.__runtime.config.callbacks[i].positions[p];
                        if (typeof Walk.__runtime.positionCallbacks[position] == 'undefined') {
                            Walk.__runtime.positionCallbacks[position] = [];
                        }
                        Walk.__runtime.positionCallbacks[position].push(Walk.__runtime.config.callbacks[i]);
                    }
                }

                // sort the position lists
                for (var key in Walk.__runtime.positionCallbacks) {
                    Walk.__runtime.positionCallbacks[key] = Walk.__runtime.positionCallbacks[key].sort(Walk.__callbackPrioritySort);
                }

            },
            __initializeReport: function() {
                var id = Walk.__data.reports.length;
                Walk.__data.reports.push({});
                Walk.__data.reports[id].id = id;
                Walk.__data.reports[id].startTime = new Date();
                Walk.__data.reports[id].callbackProcessingTime = 0;
                Walk.__data.reports[id].processed = {};
                Walk.__data.reports[id].processed.array = 0;
                Walk.__data.reports[id].processed.object = 0;
                Walk.__data.reports[id].processed.value = 0;
                Walk.__data.reports[id].processed.classInstances = {};
                return id;
            },
            __deconstructReport: function(id) {
                if (!Walk.__data.reports[id]) {
                    return;
                }
                Walk.__data.reports[id].endTime = new Date();
                Walk.__data.reports[id].executionTime = Walk.__data.reports[id].endTime - Walk.__data.reports[id].startTime;
            },
            __deconstruct: function() {
                if (Walk.__runtime.config.monitorPerformance && Walk.__data.reports[Walk.__runtime.reportId]) {
                    Walk.__deconstructReport(Walk.__runtime.reportId);
                    Walk.__runtime.config.logger.log("Finished execution. Performance report below.");
                    Walk.__runtime.config.logger.log(Walk.__data.reports[Walk.__runtime.reportId]);
                }
                delete Walk.__runtime;
            },
            __checkStructure: function(val){
                var mode = Walk.__runtime.config.dataStructure;
                var parseObject = true;
                if (Walk.__runtime.seenObjects.indexOf(val) !== -1){
                    if (mode === 'finiteTree'){
                        Walk.__exceptions.structureFault();
                    } else if (mode === 'graph'){

                        parseObject = false;
                    } // otherwise, infinites are allowed                       
                } else {
                    Walk.__runtime.seenObjects.push(val);
                }                                
                return parseObject;
            },
            // execute traversal of object using config from above
            walk: function(obj, className, config) {
                try {
                    Walk.__initializeWalk(config);

                    if (Walk.__runtime.config.monitorPerformance) {
                        var reportId = Walk.__initializeReport();
                        Walk.__runtime.reportId = reportId;
                    }

                    var data = {
                        key: undefined,
                        val: obj,
                        className: className,
                        isRoot: true,
                        path: undefined,
                        parent: undefined
                    };

                    if (Walk.__runtime.config.traversalMode === 'depth'){
                        Walk.__depthTraverse(data);
                    } else if (Walk.__runtime.config.traversalMode === 'breadth'){
                        Walk.__breadthTraverse(data);
                    }

                } catch(err) {
                    if (err !== "walk:stopProcess"){
                        if (typeof console.error !== 'undefined'){
                            console.error("Error during walk(): " + err);
                        } else {
                            console.log("Error during walk(): " + err);
                        }                        
                    }
                } finally {
                    Walk.__deconstruct();
                    return Walk.__runtime;
                }
            },
            flatten: function(object, key, unique) {
                //return array of values that match the key
                var arr = [];
                Walk.walk(object, undefined, {
                    callbacks: [{
                        keys: [key],
                        callback: function(node) {
                            arr.push(node.val);
                        }
                    }]
                });
                return unique ? Walk.unique(arr) : arr;
            },
            unique: function(arr) {
                var inarr = {};
                return arr.filter(function(x) {
                    if (inarr[x]) {
                        return;
                    } 
                    inarr[x] = true;
                    return x;
                });
            },
            updateObjectViaPathString: function(obj, val, path, delimiter) {
                var block = path.split(delimiter).slice(1);
                while (block.length > 1) {
                    obj = obj[block.shift()];
                }
                obj[block.shift()] = val;
            },
            deepCopy: function(obj) {
                var newObj = {};
                var uuid = '7f:&*_a6a'; // for minimal chance of key colision
                
                Walk.walk(obj, undefined, {
                    pathFormat: function(key, isArr) {
                        return uuid + key;
                    },
                    rootObjectCallbacks: false,
                    callbacks: [{
                        positions: ['preWalk'],
                        callback: function(node) {
                            switch (node.container) {
                                case 'array':
                                    Walk.updateObjectViaPathString(newObj, [], node.path, uuid);
                                    break;
                                case 'object':
                                    Walk.updateObjectViaPathString(newObj, {}, node.path, uuid);
                                    break;
                                case 'value':
                                    Walk.updateObjectViaPathString(newObj, node.val, node.path, uuid);
                                    break;
                            }
                        }
                    }]
                });
                return newObj;
            },
            // walk shorthand, applys callback to everything
            apply: function(object, callback){
                Walk.walk(object, undefined, {
                    callbacks: [
                        {
                            callback:callback
                        }
                    ]
                });
            },
            find: function(object, value, typeConversion){
                if (typeof typeConversion === 'undefined'){
                    typeConversion = false;
                }
                var compareConvert = function(a,b){return a == b;};
                var compareNoConvert = function(a,b){return a === b;};
                var comparison =  typeConversion ? compareConvert : compareNoConvert;
                var matches = [];
                Walk.apply(object, function(node){
                    if (comparison(node.val, value)){
                        matches.push(node.val);
                    }
                });
                return matches;
            },
            convert: function(object, className, key){                
                var root;
                Walk.walk(object, className, {
                    rootObjectCallbacks: true,
                    callbacks: [
                        {
                            positions: ['postWalk'],
                            callback:function(node){
                                if (!node.isRoot){
                                    if (node.key){
                                        node.parent.val[node.key] = node;
                                    } else {
                                        for (var i = 0; i < node.parent.val.length; i++) {
                                            if ( node.parent.val[i] === node.val ){
                                                node.parent.val[i] = node;
                                            }
                                        }
                                    }                                    
                                } else {
                                    root = node;
                                    object = root;
                                }
                            }
                        }
                    ]
                });
               return root;
            },
            nodeMap: function(object, className, key){
                var map = {};
                Walk.walk(object, className, {
                    rootObjectCallbacks: true,
                    callbacks: [
                        {
                            positions: ['postWalk'],
                            callback:function(node){
                                map[node.uuid] = node;
                            }
                        }
                    ]
                });
                return map;
            },

        };
        Walk.__classes.node.prototype.siblings = function(){
            var parent = this.parent;
            if (parent) {
                var siblings = [];
                if (parent.container === 'array'){
                    var arr = parent.val;                    
                    for (var i = 0; i < arr.length; i++) {
                        if (arr[i] !== this){
                            siblings.push(arr[i]);
                        }
                    }                   
                } else {
                    for (var key in parent.val) {
                        if (parent.val.hasOwnProperty(key) && parent.val[key] !== this) { 
                            siblings.push(parent.val[key]);
                        }
                    }
                }
                return siblings;
            }            
        };
        Walk.__classes.node.prototype.parents = function(){
            var parents = [];
            var parent = this.parent;
            while(parent){
                parents.push(parent);
                parent = parent.parent;
            }
            return parents;
        };
        Walk.__classes.node.prototype.root = function(){
            var parent = this.parent;
            var oldParent;
            while(parent){
                oldParent = parent;
                parent = parent.parent;
            }
            return oldParent;
        };
        Walk.__classes.node.prototype.children = function(config){            
            if (typeof config !== 'undefined'){
                var children = [];
                for (var i = 0; i < this._meta.children.length; ++i){
                    var matchedKey = true;
                    for (var key in config){
                        if (this._meta.children[i][key] !== config[key]){
                            matchedKey = false;
                            break;
                        }
                    }
                    if (matchedKey){
                        children.push(this._meta.children[i]);
                    }
                }
                return children;
            } else {
                return this._meta.children;
            }
            
        };    

        return Walk;
    }
    if (typeof(Walk) === 'undefined') {
        window.Walk = defineWalk();
    } else {
        console.log("Error defining 'Walk': already defined.");
    }
}(this));
(function(window){
    'use strict';
    function define_walk(){
        var walk;
        walk = {
            exceptions:{
                classNotFound: function(key){
                    throw "Exception thrown during object traversal. No associated class found for key: '" + key + "'.";
                }
            },
            defaultCallbackPosition: 'postWalk',
            configDefaults: {
                log: false,
                classMap: {},
                logger: console,
                enforceRootClass: false,
                strictClasses: false,
                rootObjectCallbacks: true,
                runCallbacks: true,
                monitorPerformance: false,
                pathFormat: function(key, isArr){
                    return isArr ? '['+key+']' : '["'+key+'"]';
                },
                callbacks: [                    
                ]
            },
            // execute traversal of object using config from above
            walk: function(obj, className, config){
                var self = this;
                self.config = self.configDefaults;   
                Object.assign(self.config, config);

                if (self.config.monitorPerformance){
                    self.__walk_performanceReport = {};
                    self.__walk_performanceReport.startTime = new Date();
                    self.__walk_performanceReport.callbackProcessingTime = 0;
                    self.__walk_performanceReport.processed = {};
                    self.__walk_performanceReport.processed.array = 0;
                    self.__walk_performanceReport.processed.object = 0;
                    self.__walk_performanceReport.processed.value = 0;
                    self.__walk_performanceReport.processed.classInstances = {};
                }

                self.execute = function(){
                    self.traverse(undefined, obj, undefined, undefined, undefined, className, undefined, true);
                    if (self.config.monitorPerformance){
                        self.__walk_performanceReport.endTime = new Date();
                        self.__walk_performanceReport.executionTime = self.__walk_performanceReport.endTime - self.__walk_performanceReport.startTime;
                        self.config.logger.log("Finished execution. Performance report below.")
                        self.config.logger.log(self.__walk_performanceReport);
                    }
                }

                self.log = function(args, type){
                    if (self.config['log'] != true){
                        return;
                    }
                    if (typeof(type) === 'undefined'){
                        type = 1;
                    }    
                    if (type === 1){
                        self.config.logger.log.apply(console, args);
                    }                
                    else if (type === 2){
                        if (typeof(console.group) !== 'undefined'){
                            self.config.logger.group.apply(console, args);
                        }
                    } else if (type === 3){
                        if (typeof(console.groupEnd) !== 'undefined'){
                            self.config.logger.groupEnd.apply(console, args);
                        }
                    } 
                }

                self.execCallbacks = function(callbacks, 
                                              key, 
                                              val, 
                                              className, 
                                              owner, 
                                              arrayAssignment, 
                                              arrayAssignmentKey, 
                                              isRoot,
                                              path,
                                              previousCallbacks, 
                                              container,
                                              parentClassName){

                    var kwargs = {
                        'callbacks': callbacks,
                        'key': key,
                        'val': val,
                        'container': container,
                        'className': className,
                        'owner': owner,
                        'arrayAssignment': arrayAssignment, 
                        'arrayAssignmentKey': arrayAssignmentKey, 
                        'isRoot': isRoot,
                        'path': path,
                        'previousCallbacks': previousCallbacks,
                        'parentClassName':parentClassName
                    }
                    for (var i = 0; i < callbacks.length; ++i){                        
                        callbacks[i].__walk_has_run = false;
                    }    
                    for (var i = 0; i < callbacks.length; ++i){
                        if (self.config.monitorPerformance){
                            var cbStackStart = new Date();
                            callbacks[i].callback(kwargs);
                            self.__walk_performanceReport.callbackProcessingTime += new Date() - cbStackStart;
                        } else {
                            callbacks[i].callback(kwargs);
                        }                        
                        callbacks[i].__walk_has_run = true;
                    }
                    for (var i = 0; i < callbacks.length; ++i){
                        delete callbacks[i].__walk_has_run;
                    }
                }

                self.matchedCallbacks = function(containerType, // obj, array, value
                                                 className,
                                                 key,
                                                 position, // pre traverse, post traverse, meaningless for value ones
                                                 parentClassName,
                                                 isRoot
                                                 ){

                    var runCallbacks = self.config.runCallbacks;
                    var matched = [];                    
                    if (runCallbacks){        
                        if (isRoot && !self.config.rootObjectCallbacks){
                            return matched;
                        }                
                        var callbacks = self.config.callbacks;
                        for (var i = 0; i < callbacks.length; ++i) {                            
                            var callback = callbacks[i];

                            // exit if positions are defined and not in list
                            if (typeof(callback.positions) !== 'undefined') {
                                if (callback.positions.indexOf(position) === -1 ){
                                    continue;
                                }
                            // if undefined, exit if not the default
                            } else {
                                if (position !== walk.defaultCallbackPosition ){
                                    continue;
                                }
                            }

                            // exit if containers are defined and not in list
                            if (typeof(callback.containers) !== 'undefined'
                                && callback.containers.indexOf(containerType) === -1 ){                                
                                continue;
                            }

                            // exit if classNames are defined and not in list
                            if (typeof(callback.classNames) !== 'undefined'
                                && callback.classNames.indexOf(className) === -1 ){                                    
                                continue;
                            }

                            // exit if keys are defined and not in list
                            var keysDef = typeof(callback.keys) !== 'undefined';
                            var classKeysDef = typeof(callback.classKeys) !== 'undefined';
                            if (keysDef || classKeysDef){
                                if (typeof(key) === 'undefined'){
                                    continue;
                                }
                                if (!keysDef){
                                    if (    typeof(parentClassName) === 'undefined'
                                        ||  typeof(callback.classKeys[parentClassName]) === 'undefined'
                                        || callback.classKeys[parentClassName].indexOf(key) === -1){
                                        continue;
                                    }
                                } else if (callback.keys.indexOf(key) === -1) {
                                    continue;
                                }
                            }

                            matched.push(callback);
                        }
                    }
                    return matched;
                }

                self.traverse = function(inKey, // key of prop on its parent (note this will be the array's key if its an array
                                         inVal, // value of prop
                                         owner, // parent
                                         arrayAssignment, // the array property it is part of (undef if not arr)
                                         arrayAssignmentKey, // the key of the array on its parent (undef if not array)
                                         className, // set on arrays since we now null keys
                                         inParentClassName,
                                         isRoot,
                                         path){

                    // prevent assignment messiness
                    var key = inKey;
                    var val = inVal;
                    var container;
                    var parentClassName = inParentClassName;

                    // default to NOT root
                    if (typeof(isRoot) == 'undefined'){
                        isRoot = false;
                    }

                    // default path to empty string
                    if (typeof(path) == 'undefined'){
                        path = '';
                    }

                    // check container type
                    // check to make sure the value is set before checking constructor
                    var canCheckConstructor = !(typeof(val) === 'undefined' || val == null);
                    if (canCheckConstructor && val.constructor == Array){
                        container = 'array';
                    } else if (canCheckConstructor && val.constructor == Object){
                        container = 'object';
                    } else {
                        container = 'value'; // TODO: better type evaluation (dates, etc)
                    }

                    // set class by looking up my key in the classMap
                    if (typeof(className) === 'undefined'){
                        var classMap = config.classMap;
                        var noClassDefinition = !classMap || !self.config.classMap[key];
                        var notRootExempt = !isRoot || (isRoot && self.config.enforceRootClass);                    
                        if (self.config.strictClasses && noClassDefinition && notRootExempt && container == 'object'){
                            // throw exception if necessary definitions aren't set
                            walk.exceptions.classNotFound(key);
                        } else if (!noClassDefinition){
                            //class definition exists, so set class
                            className = config.classMap[key];
                        } 
                    } else {
                        // class pre-set, so inheret (this should only happen for items in arrays)
                    }

                    if (self.config.monitorPerformance){
                        self.__walk_performanceReport.processed[container] += 1;
                        if (typeof(className) !== 'undefined' && container != 'array') {
                            if (typeof(self.__walk_performanceReport.processed.classInstances[className]) === 'undefined'){
                                self.__walk_performanceReport.processed.classInstances[className] = 1;
                            } else {
                                self.__walk_performanceReport.processed.classInstances[className] += 1;
                            }
                        }
                    }

                    //self.config.logger.log("Key", key, ",if in an array, the array is", arrayAssignment, "which can be found on parent via key",arrayAssignmentKey, "The inhereted className is", className, "And parent's className is", parentClassName, "Root?", isRoot);   

                    // match and run callbacks
                    var matchedPreCallbacks = self.matchedCallbacks(container, className, key, 'preWalk', parentClassName, isRoot);
                    self.execCallbacks(matchedPreCallbacks, key, val, className, owner, arrayAssignment, 
                                       arrayAssignmentKey, isRoot, path, [], container, parentClassName);
                    
                    // prettiness
                    var printKey = key ?  key + " -->" : "";

                    // if the property is a list
                    if (container == 'array'){
                        // traverse the array
                        self.log([printKey, "Array  ( Class:", className, ')', "Path:", path, "Root:", isRoot], 2);
                        for ( var i = 0; i < val.length; ++i ){                        
                            self.traverse(undefined, val[i], owner, val, key, className, className, false, path+self.config.pathFormat(i, true));
                        }
                        self.log(undefined, 3);
                    } 

                    // if the propery is a object
                    else if (container == 'object') {
                        // traverse the object
                        
                        self.log([printKey, "Object ( Class:", className, ')', "Path:", path, "Root:", isRoot], 2);   
                        for (var xkey in val) {if (val.hasOwnProperty(xkey)) {
                            self.traverse(xkey, val[xkey], val, undefined, undefined, undefined, className, false, path+self.config.pathFormat(xkey, false));
                        }}                        
                        self.log(undefined, 3);
                    } 

                    // otherwise, eval the prop
                    else {
                        self.log([printKey, val, " ( Class:", className, ")", "Path:", path, "Root:", isRoot], 1);         
                    }

                    // match and run post-traverse callbacks
                    var matchedPostCallbacks = self.matchedCallbacks(container, className, key, 'postWalk', parentClassName, isRoot);
                    self.execCallbacks(matchedPostCallbacks, key, val, className, owner, arrayAssignment, 
                                       arrayAssignmentKey, isRoot, path, matchedPreCallbacks, container,
                                       parentClassName);

                }

                return this.execute();

            },
            flatten: function( object, key, unique ){
                //return array of values that match the key
                var arr = [];
                walk.walk(object, undefined, {
                    callbacks: [
                        {
                            keys: [key],
                            callback: function(kwargs){
                                arr.push(kwargs['val']);
                            }
                        }
                    ]
                });
                return unique ? walk.unique(arr) : arr;
            },
            unique: function(arr){
                var inarr = {};
                return arr.filter(function(x) {
                    if (inarr[x]){return}
                    inarr[x] = true;
                    return x;
                });
            },
            deepCopy: function(obj){
                var newObj = {};
                var uuid = '7f:&*_a6a'; // for minimal chance of key colision
                function updateObject(nobj, val, path){                
                    var block = path.split(uuid).slice(1);
                    while(block.length > 1){
                        nobj = nobj[block.shift()];
                    }
                    nobj[block.shift()] = val;
                }
                walk.walk(obj, undefined, {
                    pathFormat: function(key, isArr){
                        return uuid+key;
                    },
                    rootObjectCallbacks: false,
                    callbacks: [
                        {
                            positions: ['preWalk'],                            
                            callback: function(kwargs){
                                switch(kwargs['container']){                                    
                                    case 'array':
                                        updateObject(newObj, [], kwargs['path']);
                                        break;
                                    case 'object':
                                        updateObject(newObj, {}, kwargs['path']);
                                        break;
                                    case 'value':
                                        updateObject(newObj, kwargs['val'], kwargs['path']);
                                        break;
                                }
                            }
                        }
                    ]
                });
                return newObj;
            }
        }
        return walk;
    };
    if (typeof(walk) === 'undefined'){
        window.walk = define_walk();
    } else {
        console.log("Error defining 'walk': already defined.")
    }
}(this));
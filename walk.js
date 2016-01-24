(function(window){
    'use strict';
    /*
        property: attribute on an object
        value: non list/obj property

    */
    function define_walk(){
        var walk;
        walk = {
            exceptions:{
                classNotFound: function(key){
                    throw "Exception thrown during object traversal. No associated class found for key: '" + key + "'.";
                }
            },
            // config class (should be instanciated)
            configDefaults: {
                log: false,
                classMap: {},
                classDefinitions: {},
                enforceRootClass: false,
                strictClasses: false,
                rootObjectCallbacks: true,
                runCallbacks: true,
                callbacks: [                    
                ]
            },
            // execute traversal of object using config from above
            walk: function(obj, className, config){
                var self = this;
                self.config = self.configDefaults;   
                // TODO: write function to have inserted config inheret defaults             
                Object.assign(self.config, config);

                self.execute = function(){
                    self.traverse(undefined, obj, undefined, undefined, undefined, className, undefined, true);
                }

                self.log = function(args, type){
                    if (self.config['log'] != true){
                        return;
                    }
                    if (typeof(type) === 'undefined'){
                        type = 'log';
                    }                    
                    if (type === 'group'){
                        if (typeof(console.group) !== 'undefined'){
                            console.group.apply(console, args);
                        }
                    } else if (type === 'groupEnd'){
                        if (typeof(console.groupEnd) !== 'undefined'){
                            console.groupEnd.apply(console, args);
                        }
                    } else if (type === 'log'){
                        console.log.apply(console, args);
                    }
                }

                self.execCallbacks = function(callbacks, key, val, className, owner, arrayAssignment, arrayAssignmentKey, isRoot){
                    for (var i = 0; i < callbacks.length; ++i){
                        callbacks[i].callback(key, val, className, owner, arrayAssignment, arrayAssignmentKey, isRoot);
                    }                   
                }

                self.matchedCallbacks = function(containerType, // obj, array, value
                                                 className,
                                                 key,
                                                 position, // pre traverse, post traverse, meaningless for value ones
                                                 parentClassName
                                                 ){

                    var runCallbacks = self.config.runCallbacks;
                    var matched = [];                    
                    if (runCallbacks){                        
                        var callbacks = self.config.callbacks;
                        for (var i = 0; i < callbacks.length; ++i) {                            
                            var callback = callbacks[i];

                            // exit if positions are defined and not in list
                            if (typeof(callback.positions) !== 'undefined'
                                && callback.positions.indexOf(position) === -1 ){                                
                                continue;
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
                                         isRoot){
                    // prevent assignment messiness
                    var key = inKey;
                    var val = inVal;
                    var container;
                    var parentClassName = inParentClassName;

                    // default to NOT root
                    if (typeof(isRoot) == 'undefined'){
                        isRoot = false;
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

                    // match and run callbacks
                    var matchedCallbacks = self.matchedCallbacks(container, className, key, 'preWalk', parentClassName);
                    self.execCallbacks(matchedCallbacks, key, val, className, owner, arrayAssignment, arrayAssignmentKey, isRoot);
                    
                    // prettiness
                    var printKey = key ?  key + " -->" : "";

                    // if the property is a list
                    if (container == 'array'){
                        // traverse the array
                        var arrayAssignment = val;
                        self.log([printKey, "Array  ( Class:", className, ')'], 'group');
                        val.forEach(function(item){                            
                            self.traverse(undefined, item, owner, arrayAssignment, key, className, className, false);
                        })
                        self.log(undefined, 'groupEnd');
                    } 

                    // if the propery is a object
                    else if (container == 'object') {
                        // traverse the object
                        
                        self.log([printKey, "Object ( Class:", className, ')'], 'group');   
                        for (var xkey in val) {if (val.hasOwnProperty(xkey)) {
                            self.traverse(xkey, val[xkey], val, undefined, undefined, undefined, className, false);
                        }}                        
                        self.log(undefined, 'groupEnd');
                    } 

                    // otherwise, eval the prop
                    else {
                        self.log([printKey, val, " ( Class:", className, ")"]);         
                    }

                    // match and run post-traverse callbacks
                    var matchedCallbacks = self.matchedCallbacks(container, className, key, 'postWalk', parentClassName);
                    self.execCallbacks(matchedCallbacks, key, val, className, owner, arrayAssignment, arrayAssignmentKey, isRoot);

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
                            callback: function(key, val){
                                arr.push(val);
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
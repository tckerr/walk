(function(window) {
    'use strict';

    function defineWalk() {
        var Walk;
        Walk = {
            exceptions: {
                classNotFound: function(key) {
                    Walk.__deconstruct();
                    throw "fatal exception: No associated class found for key: '" + key + "'.";
                },
                traversalFault: function(type) {
                    Walk.__deconstruct();
                    throw "fatal exception: This function is not available when running in " + type + " mode! See the documentation for details.";
                },
                notImplemented: function(fn) {
                    Walk.__deconstruct();
                    throw "fatal exception: " + fn + " not implemented yet but will be soon!";
                }
            },
            defaultCallbackPosition: 'postWalk',
            configDefaults: {
                log: false,
                classMap: {},
                logger: console,
                traversalMode: 'integrated',
                enforceRootClass: false,
                strictClasses: false,
                rootObjectCallbacks: true,
                runCallbacks: true,
                monitorPerformance: false,
                pathFormat: function(key, isArr) {
                    return isArr ? '[' + key + ']' : '["' + key + '"]';
                },
                callbacks: []
            },
            __data: {
                reports: []
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
            __nodeFunctions: {
                parent: function(parentUuid) {
                    return Walk.__runtime.uuidMap[parentUuid];
                },
                siblings: function(parentUuid) {
                    if (Walk.__runtime.config.traversalMode === 'integrated') {
                        Walk.exceptions.traversalFault('integrated');
                    }
                    return Walk.__runtime.uuidMap[parentUuid];
                }
            },
            __set_uuid: function(parentUuid, key, val, className, parent, isRoot, path, container) {
                var uuid = ++Walk.__runtime.uuid;
                var map = {
                    _meta: {
                        uuid: uuid,
                        parentUuid: parentUuid
                    },
                    key: key,
                    val: val,
                    type: typeof(val),
                    className: className,
                    isRoot: isRoot,
                    path: path,
                    container: container,
                    executedCallbacks: [],
                    parent: Walk.__partial(Walk.__nodeFunctions.parent, parentUuid)
                };
                Walk.__runtime.uuidMap[uuid] = map;
                return uuid;
            },
            __matchedCallbacks: function(uuid, position) {

                var data = Walk.__runtime.uuidMap[uuid];
                var runCallbacks = Walk.__runtime.config.runCallbacks;
                var matched = [];
                if (runCallbacks) {
                    if (data.isRoot && !Walk.__runtime.config.rootObjectCallbacks) {
                        return matched;
                    }
                    var callbacks = Walk.__runtime.positionCallbacks[position];
                    if (typeof callbacks == 'undefined') {

                        //console.log(Walk.__runtime.positionCallbacks, position)
                        return [];
                    }
                    for (var i = 0; i < callbacks.length; ++i) {
                        var callback = callbacks[i];

                        // exit if containers are defined and not in list
                        if (typeof(callback.containers) !== 'undefined' && callback.containers.indexOf(data.container) === -1) {
                            continue;
                        }

                        // exit if classNames are defined and not in list
                        if (typeof(callback.classNames) !== 'undefined' && callback.classNames.indexOf(data.className) === -1) {
                            continue;
                        }

                        // exit if keys are defined and not in list
                        var keysDef = typeof(callback.keys) !== 'undefined';
                        var classKeysDef = typeof(callback.classKeys) !== 'undefined';
                        if (keysDef || classKeysDef) {
                            if (typeof(data.key) === 'undefined') {
                                continue;
                            }
                            if (!keysDef) {
                                if (typeof(data.parent().className) === 'undefined' || typeof(callback.classKeys[data.parent().className]) === 'undefined' || callback.classKeys[data.parent().className].indexOf(data.key) === -1) {
                                    continue;
                                }
                            } else if (callback.keys.indexOf(data.key) === -1) {
                                continue;
                            }
                        }
                        matched.push(callback);
                    }
                }
                return matched;
            },
            __execCallbacks: function(callbacks, uuid) {
                for (var i = 0; i < callbacks.length; ++i) {
                    callbacks[i].__walk$_has_run = false; // only in case users want this, not used internally
                }
                for (var i = 0; i < callbacks.length; ++i) {
                    if (Walk.__runtime.config.monitorPerformance) {
                        var cbStackStart = new Date();
                        callbacks[i].callback(Walk.__runtime.uuidMap[uuid]);
                        Walk.__data.reports[Walk.__runtime.reportId].callbackProcessingTime += new Date() - cbStackStart;
                    } else {
                        callbacks[i].callback(Walk.__runtime.uuidMap[uuid]);
                    }
                    callbacks[i].__walk$_has_run = true;
                    Walk.__runtime.uuidMap[uuid].executedCallbacks.push(callbacks[i]);
                }
                for (var i = 0; i < callbacks.length; ++i) {
                    delete callbacks[i].__walk$_has_run;
                }
            },
            __log: function(args, type) {
                if (Walk.__runtime.config['log'] != true) {
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
            // does a traversal to build the map AND runs callbacks (inline, so only parent is accessible)
            __integratedTraverse: function(inKey, // key of prop on its parent (note this will be the array's key if its an array
                inVal, // value of prop
                className, // set on arrays since we now null keys
                isRoot,
                path,
                parentUuid) {

                // prevent assignment messiness
                var key = inKey;
                var val = inVal;
                var container;

                // default to NOT root
                if (typeof(isRoot) == 'undefined') {
                    isRoot = false;
                }

                // default path to empty string
                if (typeof(path) == 'undefined') {
                    path = '';
                }

                // check container type
                // check to make sure the value is set before checking constructor
                var canCheckConstructor = !(typeof(val) === 'undefined' || val == null);
                if (canCheckConstructor && val.constructor == Array) {
                    container = 'array';
                } else if (canCheckConstructor && val.constructor == Object) {
                    container = 'object';
                } else {
                    // TODO: better type evaluation (dates, etc)
                    container = 'value';
                }

                // set class by looking up my key in the classMap
                if (typeof(className) === 'undefined') {
                    var classMap = Walk.__runtime.config.classMap;
                    var noClassDefinition = !classMap || !Walk.__runtime.config.classMap[key];
                    var notRootExempt = !isRoot || (isRoot && Walk.__runtime.config.enforceRootClass);
                    if (Walk.__runtime.config.strictClasses && noClassDefinition && notRootExempt && container == 'object') {
                        // throw exception if necessary definitions aren't set
                        walk.exceptions.classNotFound(key);
                    } else if (!noClassDefinition) {
                        //class definition exists, so set class
                        className = Walk.__runtime.config.classMap[key];
                    }
                } else {
                    // class pre-set, so inheret (this should only happen for items in arrays)
                }

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

                // set UUIDs so we can link to parent
                var uuid = Walk.__set_uuid(parentUuid, key, val, className, parent, isRoot, path, container)

                // match and run callbacks
                var matchedPreCallbacks = Walk.__matchedCallbacks(uuid, 'preWalk');
                Walk.__execCallbacks(matchedPreCallbacks, uuid);

                // prettiness
                var printKey = key ? key + " -->" : "";

                // if the property is a list
                if (container == 'array') {
                    // traverse the array
                    Walk.__log([printKey, "Array  ( Class:", className, ')', "Path:", path, "Root:", isRoot], 2);
                    for (var i = 0; i < val.length; ++i) {
                        Walk.__integratedTraverse(undefined, //key
                            val[i], // val
                            className, // className
                            false, //isRoot
                            path + Walk.__runtime.config.pathFormat(i, true), // path
                            uuid); // uuid
                    }
                    Walk.__log(undefined, 3);
                }
                // if the propery is a object
                else if (container == 'object') {
                    // traverse the object                    
                    Walk.__log([printKey, "Object ( Class:", className, ')', "Path:", path, "Root:", isRoot], 2);
                    for (var xkey in val) {
                        if (val.hasOwnProperty(xkey)) {
                            Walk.__integratedTraverse(xkey, //key
                                val[xkey], // val
                                undefined, // className
                                false, //isRoot
                                path + Walk.__runtime.config.pathFormat(xkey, false), // path
                                uuid); // uuid
                        }
                    }
                    Walk.__log(undefined, 3);
                }

                // otherwise, eval the prop
                else {
                    Walk.__log([printKey, val, " ( Class:", className, ")", "Path:", path, "Root:", isRoot], 1);
                }

                // match and run post-traverse callbacks
                var matchedPostCallbacks = Walk.__matchedCallbacks(uuid, 'postWalk');
                Walk.__execCallbacks(matchedPostCallbacks, uuid);

            },
            __initializeWalk: function(config) {
                Walk.__runtime = {};
                Walk.__runtime.config = {};
                Walk.__runtime.uuidMap = {};
                Walk.__runtime.uuid = 0;
                Object.assign(Walk.__runtime.config, Walk.configDefaults);
                Object.assign(Walk.__runtime.config, config);
                if (Walk.__runtime.config.traversalMode !== 'integrated') {
                    Walk.exceptions.notImplemented("Traversal modes other than 'integrated' are");
                }

                Walk.__runtime.positionCallbacks = {}
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
                    Walk.__runtime.config.logger.log("Finished execution. Performance report below.")
                    Walk.__runtime.config.logger.log(Walk.__data.reports[Walk.__runtime.reportId]);
                }
                delete Walk.__runtime;
            },
            // execute traversal of object using config from above
            walk: function(obj, className, config) {
                Walk.__initializeWalk(config);

                if (Walk.__runtime.config.monitorPerformance) {
                    var reportId = Walk.__initializeReport();
                    Walk.__runtime.reportId = reportId;
                }

                var uuid = Walk.__set_uuid(undefined, undefined, obj, className)
                Walk.__integratedTraverse(undefined,//key 
                    obj, //val
                    className, //className
                    true, //isRoot
                    undefined, // path
                    uuid); //uuid

                Walk.__deconstruct();

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
                        return
                    }
                    inarr[x] = true;
                    return x;
                });
            },
            deepCopy: function(obj) {
                var newObj = {};
                var uuid = '7f:&*_a6a'; // for minimal chance of key colision
                function updateObject(nobj, val, path) {
                    var block = path.split(uuid).slice(1);
                    while (block.length > 1) {
                        nobj = nobj[block.shift()];
                    }
                    nobj[block.shift()] = val;
                }
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
                                    updateObject(newObj, [], node.path);
                                    break;
                                case 'object':
                                    updateObject(newObj, {}, node.path);
                                    break;
                                case 'value':
                                    updateObject(newObj, node.val, node.path);
                                    break;
                            }
                        }
                    }]
                });
                return newObj;
            }
        }
        return Walk;
    };
    if (typeof(Walk) === 'undefined') {
        window.Walk = defineWalk();
    } else {
        console.log("Error defining 'Walk': already defined.")
    }
}(this));
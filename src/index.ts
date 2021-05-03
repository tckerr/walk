const defaultCallbackPosition = 'postWalk'

class node {
    private _meta: { children: any[]; parents: any[] };
    private uuid: any;
    private key: any;
    private val: any;
    private type: any;
    private className: any;
    private isRoot: any;
    private path: any;
    private container: any;
    private executedCallbacks: any;
    private readonly parent: any;

    constructor(uuid: any, key: any, val: any, type: any, className: any, isRoot: any, path: any, container: any, executedCallbacks: any, parent: any) {
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
        if (this.parent) {
            this.parent._meta.children.push(this);
        }
    }
}

function __nodeFactory(uuid: any, key: any, val: any, type: any, className: any, isRoot: any, path: any, container: any, executedCallbacks: any, parent: any) {
    return new node(uuid, key, val, type, className, isRoot, path, container, executedCallbacks, parent);
}

function __matchedCallbacks(node: any, position: any, __runtime: any) {

    var runCallbacks = __runtime.config.runCallbacks;
    let matched: any[] = [];
    if (runCallbacks) {
        if (node.isRoot && !__runtime.config.rootObjectCallbacks) {
            return matched;
        }
        var callbacks = __runtime.positionCallbacks[position];
        if (typeof callbacks == 'undefined') {
            return [];
        }
        for (var i = 0; i < callbacks.length; ++i) {
            var callback = callbacks[i];

            // exit if containers are defined and not in list
            if (typeof (callback.containers) !== 'undefined' && callback.containers.indexOf(node.container) === -1) {
                continue;
            }

            // exit if classNames are defined and not in list
            if (typeof (callback.classNames) !== 'undefined' && callback.classNames.indexOf(node.className) === -1) {
                continue;
            }

            // exit if keys are defined and not in list
            var keysDef = typeof (callback.keys) !== 'undefined';
            var classKeysDef = typeof (callback.classKeys) !== 'undefined';
            if (keysDef || classKeysDef) {
                if (typeof (node.key) === 'undefined') {
                    continue;
                }
                if (!keysDef) {
                    if (typeof (node.parent.className) === 'undefined' || typeof (callback.classKeys[node.parent.className]) === 'undefined' || callback.classKeys[node.parent.className].indexOf(node.key) === -1) {
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
}

function __buildNode(key: any, val: any, className: any, parent: any, isRoot: any, path: any, container: any, __runtime: any) {
    var uuid = ++__runtime.uuidCounter;
    var node = __nodeFactory(
        uuid,
        key,
        val,
        typeof (val),
        className,
        isRoot,
        path,
        container,
        [],
        parent
    );
    return node;
}

function __checkStructure(val: any, __runtime: any) {
    var mode = __runtime.config.dataStructure;
    var parseObject = true;
    if (__runtime.seenObjects.indexOf(val) !== -1) {
        if (mode === 'finiteTree') {
            __exceptions.structureFault();
        } else if (mode === 'graph') {

            parseObject = false;
        } // otherwise, infinites are allowed
    } else {
        __runtime.seenObjects.push(val);
    }
    return parseObject;
}

function __execCallbacks(callbacks: any, node: any, __runtime: any) {
    for (var p = 0; p < callbacks.length; ++p) {
        callbacks[p].__walk$_has_run = false; // only in case users want this, not used internally
    }
    for (var i = 0; i < callbacks.length; ++i) {
        if (__runtime.config.monitorPerformance) {
            var cbStackStart = new Date();
            callbacks[i].callback(node);
            // @ts-ignore
            __runtime.report.callbackProcessingTime += (new Date() - cbStackStart);
        } else {
            callbacks[i].callback(node);
        }
        callbacks[i].__walk$_has_run = true;
        node.executedCallbacks.push(callbacks[i]);
    }
    for (var k = 0; k < callbacks.length; ++k) {
        delete callbacks[k].__walk$_has_run;
    }
}

function __getClassName(className: string, key: string, container: any, isRoot: boolean, __runtime: any) {
    // set class by looking up my key in the classMap
    if (typeof (className) === 'undefined') {
        var classMap = __runtime.config.classMap;
        var noClassDefinition = !classMap || !__runtime.config.classMap[key];
        var notRootExempt = !isRoot || (isRoot && __runtime.config.enforceRootClass);
        if (__runtime.config.strictClasses && noClassDefinition && notRootExempt && container == 'object') {
            // throw exception if necessary definitions aren't set
            __exceptions.classNotFound(key);
        } else if (!noClassDefinition) {
            //class definition exists, so set class
            className = __runtime.config.classMap[key];
        }
    } else {
        // class pre-set, so inheret (this should only happen for items in arrays)
    }

    // for reports, process class names now
    if (__runtime.config.monitorPerformance) {
        __runtime.report.processed[container] += 1;
        if (typeof (className) !== 'undefined' && container != 'array') {
            if (typeof (__runtime.report.processed.classInstances[className]) === 'undefined') {
                __runtime.report.processed.classInstances[className] = 1;
            } else {
                __runtime.report.processed.classInstances[className] += 1;
            }
        }
    }
    return className;
}

function __getContainerType(val: any) {
    if(Array.isArray(val))
        return 'array'
    else if (typeof val === 'object')
        return 'object'
    else
        return 'value'
}

function __process(data: any, mode: any, queue: any[] | undefined, __runtime: any) {

    var key = data.key;
    var val = data.val;
    var className = data.className;
    var isRoot = data.isRoot;
    var path = data.path;
    var parent = data.parent;

    if (typeof (isRoot) == 'undefined') {
        isRoot = false;
    }
    if (typeof (path) == 'undefined') {
        path = '';
    }

    var container = __getContainerType(val);
    if (container === 'object' || container === 'array') {
        if (!__checkStructure(val, __runtime)) {
            return;
        }
    }
    className = __getClassName(className, key, container, isRoot, __runtime);
    var node = __buildNode(key, val, className, parent, isRoot, path, container, __runtime);
    var matchedPreCallbacks = __matchedCallbacks(node, 'preWalk', __runtime);
    __execCallbacks(matchedPreCallbacks, node, __runtime);

    var childData;
    // add children to queue
    if (container === 'array') {
        for (var i = 0; i < val.length; ++i) {
            childData = {
                key: undefined,
                val: val[i],
                className: className,
                isRoot: false,
                path: path + __runtime.config.pathFormat(i, true),
                parent: node
            };
            if (mode === 'breadth') {
                queue!.push(childData);
            } else if (mode === 'depth') {
                __process(childData, 'depth', undefined, __runtime);
            }
        }
    } else if (container === 'object') {
        for (var xkey in val) {
            if (val.hasOwnProperty(xkey)) {
                childData = {
                    key: xkey,
                    val: val[xkey],
                    className: undefined, // className
                    isRoot: false, //isRoot
                    path: path + __runtime.config.pathFormat(xkey, false), // path
                    parent: node
                };
                if (mode === 'breadth') {
                    queue!.push(childData);
                } else if (mode === 'depth') {
                    __process(childData, 'depth', undefined, __runtime);
                }
            }
        }
    }
    // match and run post-traverse callbacks
    var matchedPostCallbacks = __matchedCallbacks(node, 'postWalk', __runtime);
    __execCallbacks(matchedPostCallbacks, node, __runtime);
}

function __depthTraverse(inputData: any, __runtime: any) {
    __process(inputData, 'depth', undefined, __runtime);
}

function __breadthTraverse(inputData: any, __runtime: any) {
    const queue: any = [];
    let current;
    __process(inputData, 'breadth', queue, __runtime);
    while (queue.length > 0) {
        current = queue.shift();
        __process(current, 'breadth', queue, __runtime);
    }
}

function __callbackPrioritySort(a: any, b: any) {
    const x = a.priority;
    const y = b.priority;
    return ((x < y) ? 1 : ((x > y) ? -1 : 0));
}

let __id = 0;

function __initializeReport() {
    const report: any = {}
    report.id = __id++;
    report.startTime = new Date();
    report.callbackProcessingTime = 0;
    report.processed = {};
    report.processed.array = 0;
    report.processed.object = 0;
    report.processed.value = 0;
    report.processed.classInstances = {};
    return report;
}

const __exceptions: any = {
    classNotFound: function (key: string) {
        throw "No associated class found for key: '" + key + "'.";
    },
    traversalFault: function (type: string) {
        throw "This function is not available when running in " + type + " mode! See the documentation for details.";
    },
    notImplemented: function (fn: any) {
        throw fn + " not implemented yet but will be soon!";
    },
    structureFault: function () {
        throw "The object violates the defined structure. Override 'dataStructure' in the config to allow parsing different object structures.";
    },
    stopProcess: function () {
        throw "walk:stopProcess";
    },
    validationError: function (err: any) {
        throw err;
    }
}

const configDefaults: any = {
    classMap: {},
    logger: console,
    traversalMode: 'depth',
    enforceRootClass: false,
    strictClasses: false,
    rootObjectCallbacks: true,
    runCallbacks: true,
    monitorPerformance: false,
    dataStructure: 'finiteTree', //tree, graph, infinite
    pathFormat: function (key: string, isArr: boolean) {
        return isArr ? '[' + key + ']' : '["' + key + '"]';
    },
    callbacks: []
}

function __validateConfig(config: any) {
    for (var key in config) {
        var allowed = false;
        for (var xkey in configDefaults) {
            if (key === xkey) {
                allowed = true;
                break;
            }
        }
        if (!allowed) {
            __exceptions.validationError("'" + key + "' is not a valid configuration entry.");
        }
    }
}

function __initializeWalk(config: any): any {
    const runtime: any = {};
    runtime.config = {};
    runtime.nodes = {};
    runtime.uuidCounter = 0;
    runtime.seenObjects = [];
    Object.assign(runtime.config, configDefaults);
    Object.assign(runtime.config, config);

    __validateConfig(runtime.config);

    if (runtime.config.traversalMode !== 'depth' && runtime.config.traversalMode !== 'breadth') {
        __exceptions.notImplemented("Traversal modes other than 'depth' and 'breadth' are");
    }

    runtime.positionCallbacks = {};
    // set callbacks initial properties and assign to lists
    for (var i = 0; i < runtime.config.callbacks.length; ++i) {
        if (typeof runtime.config.callbacks[i].priority == 'undefined') {
            runtime.config.callbacks[i].priority = 0;
        }
        if (typeof runtime.config.callbacks[i].positions == 'undefined' || runtime.config.callbacks[i].positions.length < 1) {
            runtime.config.callbacks[i].positions = [defaultCallbackPosition];
        }
        for (var p = 0; p < runtime.config.callbacks[i].positions.length; ++p) {
            var position = runtime.config.callbacks[i].positions[p];
            if (typeof runtime.positionCallbacks[position] == 'undefined') {
                runtime.positionCallbacks[position] = [];
            }
            runtime.positionCallbacks[position].push(runtime.config.callbacks[i]);
        }
    }

    // sort the position lists
    for (var key in runtime.positionCallbacks) {
        runtime.positionCallbacks[key] = runtime.positionCallbacks[key].sort(__callbackPrioritySort);
    }

    return runtime;
}

const walk = (obj: any, className: any, config: any) => {
    let runtime: any = {}
    try {
        runtime = __initializeWalk(config);

        runtime.report = {};
        if (runtime.config.monitorPerformance) {
            runtime.report = __initializeReport();
        }

        const data = {
            key: undefined,
            val: obj,
            className: className,
            isRoot: true,
            path: undefined,
            parent: undefined
        };

        if (runtime.config.traversalMode === 'depth') {
            __depthTraverse(data, runtime);
        } else if (runtime.config.traversalMode === 'breadth') {
            __breadthTraverse(data, runtime);
        }

    } catch (err) {
        if (err !== "walk:stopProcess") {
            if (typeof console.error !== 'undefined') {
                console.error("Error during walk(): " + err);
            } else {
                console.log("Error during walk(): " + err);
            }
        }
    } finally {
        return runtime;
    }
}

export default walk;

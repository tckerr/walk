# Contents

1. [Description](#description)
2. [Usage](#usage)
3. [Documentation](#documentation)
    - [Classes](#classes)
    - [Callbacks](#callbacks)
    - [Nodes](#nodes)
4. [Examples](#examples)
5. [Upcoming features](#upcoming-features)


# Description
```walk.js``` is a Javascript library for traversing object trees. The library allows for:

- Recursive decension into nested objects
- Type-specific (array/obj/value) preprocess and postprocess callback hooks that get executed during the walk
- A key-->class map for properties to avoid redundant key-specific definitions
- Node parent/child/sibling accessors

It also provides some convenience functions, such as deep copying, flattening nested arrays/objects into a value list, and much more.

# Usage

Download and include the library:
```
<script src="/path/to/walk.js"></script>
```

You will then be able to access the library through the ```Walk``` object. 

Traverse an object with the following syntax:

```
var exampleObject = {
    'a': 1,
    'b': [2, 3, 4],
    'c': {'d': 5}
}

var walkConfig = {}

Walk.walk(exampleObject, 'example', walkConfig);
```

Where the arguments are:

1. The object to traverse.
2. The "className" for the root object (set to ```undefined``` if not needed)
3. A configuration for the walk

See the documentation for more details!

# Documentation

#### ```Walk.walk(object, className, config)```
The primary method for traversing an object and injecting callbacks into the traversal. Since root objects cannot inherit class names from their keys, it must be passed in as the second argument, (set to ```undefined``` if not needed).

**Config options**:

- ```logger```: A custom logging object. The object must have the following methods: ```log(arg1, ...)```, ```group(arg1, ...)```, and ```groupEnd(arg1, ...)```.
- ```classMap```: A mapping of object keys to classes, such that when an object key is encountered in the data, it will resolve to its matching class name.
- ```strictClasses``` *(true|false)*: Throw an exception if an object is encountered without a class in the classMap.
- ```enforceRootClass``` *(true|false)*: Exempt root object from class checks (only applies if ```strictClasses == true```).
- ```rootObjectCallbacks``` *(true|false)*: Ignore global callbacks for root objects.
- ```runCallbacks``` *(true|false)*: Set this to false to skip callbacks completely.
- ```monitorPerformance``` *(true|false)*: Set this to true to print a performance report to console after the walk is complete.
- ```pathFormat```: a function that returns a path segment from a key (object key string or array index). The first argument is the key and the second argument is a boolean that is ```true``` when the key is an array index, ```false``` when it is a object key.
- ```callbacks```: an array of callback objects. See the Callback section for more information.
- ```traversalMode```: the mode for traversing the tree. Options are ```depth``` for *depth-first* processing and ```breadth``` for *breadth-first* processing.
- ```dataStructure```: if the object that gets passed in doesn't comply with this configuration setting, an error will occur. Options are ```finiteTree``` (default), ```graph```, and ```infinite```. Finite trees will error if an object/array reference is encountered more than once. Graphs will only process object/array references one time. Finite trees will always continue to process - use ```walk.break()``` to end the processing manually. *Warning: ininite trees will never complete processing if a callback doesn't call ```Walk.break()```.*


The configuration defaults to the following. Note that you can edit this by overwriting ```Walk.configDefaults```:

```
configDefaults: {    
    logger: console,
    classMap: {},
    traversalMode: 'depth',
    enforceRootClass: false,
    strictClasses: false,
    rootObjectCallbacks: true,
    runCallbacks: true,
    monitorPerformance: false,
    dataStructure: 'finiteTree',
    pathFormat: function(key, isArr) {
        return isArr ? '[' + key + ']' : '["' + key + '"]';
    },
    callbacks: []
},
```

#### ```Walk.apply(object, callback)```:
A shorthand version of ```walk()``` that runs the callback for all nodes, in ```postWalk``` mode.

#### ```Walk.break()```:
Calling this method within a callback will halt processing completely. This allows for early access, and limited processing of infinite trees.

#### ```Walk.flatten(object, key[, unique])```:
Returns an array of values from an input key. For example, ```Walk.flatten(object, 'friends')``` will return all values in the tree who exist in objects and have a key of ```friends```. Set the optional ```unique``` parameter to ```true``` to only return unique values.

#### ```Walk.unique(array)```:
Returns the array with all duplicate values removed.

#### ```Walk.deepCopy(object)```:
Returns a deep copy of an object, with all array and object references replaced with new objects/arrays.

#### ```Walk.find(object, value[, typeConversion])```: 
Similar to ```Walk.flatten()```, this method returns all *values* who match within the ```object```'s tree. Set the optional parameter ```typeConversion``` to ```true``` to do a ``==`` comparison (instead of the default ```===```.) 

#### ```Walk.convert(object)```: 
Convert and return the object with all values replaced by thier nodes. This structure means the object hierarchy will convert from something like ```data.house.rooms[0].squareFeet``` to ```data.val.house.val.rooms.val[0].val.squareFeet.val``` because it interjects a node in place of the value. Warning: this mangles the original object -- do a ```Walk.deepCopy()``` first to preserve it.

#### ```Walk.nodeMap(object)```: 
Returns an object map of **uuid**:**node**. Each node has a UUID -- accessing the nodeMap via ```nodeMap[uuid]``` will return the node. This allows for more direct access into the tree.

#### ```Walk.updateObjectViaPathString(object, value, path, delimiter)```: 
Sets the property on the ```object``` that is accessed via ```path``` to ```value```. The ```delimiter``` parameter is a string value that is used to seperate path nesting. For example, ```house-->rooms-->0-->squareFeet``` would have a delimiter of ```'-->'```. It should always match the ```pathFormat``` used when contructing nodes (see below) to ensure the path can be accessed.


### Classes

Classes allow for multiple object fields to map to the same functionality. For example, we may want to run an operation for all objects of type ```person```. However, a ```person``` may be identified in several ways, such as ```passengers``` in under a ```car``` object, or ```friends``` under another ```person``` object. By adding an entry in the config's ```classMap```, we can ensure these properties all map to the same class. This will come in use later. Here is an example:

```
config = {
    classMap: {
        "person": "person",
        "friends": "person",
        "passengers": "person"
    }
}
```

### Callbacks

We want to be able to execute custom functionality on certain properties within our object tree. For example, if we wanted to print the count of all friends for any ```person``` object we encounter, we could write a callback object for the ```friends``` property. The general form of a callback object is:

```
{   
    name: 'optional name',
    priority: 1,
    containers: ['array'],
    classNames: ['person'],
    keys: ['friends'],
    positions: ['postWalk'],
    classKeys:{
        'person': ['friends'] //redundant, but just an example
    },
    callback: function(node){
        // do things here
    }
}
```

Here are the properties you can define in a calback configuration, most of which act as filters:

- ```containers```: an array of containers to run on. Options are ```'array'```, ```'object'```, and ```'value'```. If unspecifed, the callback will run on any container.
- ```classNames```: an array of classNames to run on. The callback will check the class name of the property as it has been resolved in the config's ```classMap```. If unspecifed, the callback will run on any class.
- ```keys```: an array of keys to run on. The callback will check the key of the property against this list. If unspecifed, the callback will run on any key.
- ```classKeys```: an object of "className": [keyArray] pairs. The callback will check the key of the property against this list, but will only match on keys from the given class. If unspecified, no keys will be filtered out (assuming the ```keys``` property is unset, otherwise it'll default to that.) Also note that if the ```classNames``` array is defined, any classKeys for classes not in that array will never be processed.
- ```positions```: an array of positions in the traversal to run on -- think of this as when it should execute. Options are ```'preWalk'``` (before any list/object is traversed), and ```'postWalk'``` (after any list/object is traversed). For properties of container-type ```'value'```, these two run in immediate succession. If unspecifed, the callback will run ```'postWalk'``` (this can be overidden in ```Walk.defaultCallbackPosition```).
- ```callback```: the actual function to run. See below for the arguments (associated values we'll have access to at the time the callback runs.)
- ```priority```: an integer value for controlling order of callback operations. Higher priorities run earlier. If unspecified, the priority will default to 0. Remember that callback stacks are grouped by position and property, so the sort will only apply to callbacks in the same grouping.

Your callback function will be passed a single argument: a node object. 

### Nodes

Node objects represent a single node in the tree, providing metadata about the value, its parents, siblings, and children. Nodes have the following properties:

- ```key```: The key of this property as defined on it's parent. For example, if this callback is running on the ```'weight'``` property of a ```person```, the ```key``` would be ```'weight'```. Note that this will be ```undefined``` for properties in arrays.
- ```value```: The value of the property. To use the above example, the value would be something like ```'183'```.
- ```className```: The className that the property matched on in the config's ```classMap```.
- ```container```: The type of container the property is.
- ```isRoot```: A boolean that is set to ```true``` if the property is a root object, otherwise ```false```.
- ```uuid```: A unique id for the node (within the context of Walk);
- ```callbacks```: An array of all the callback functions in the stack. Callback stacks are grouped by property and position. The current function *will* be included. A property is made available on each function via ```callbacks[index].__walk$_has_run``` which will be true if the function has run in the current stack. This property is only available during the callback stack execution, and is deleted immediately afterwards.
- ```executedCallbacks```: An array of all callback functions that have already run on this property.
- ```path``` The path to the value. For example, if the variable you're walking is named ```myObject```, the path will look something like ```["friends"][10]["friends"][2]["name"]```, such that calling ```myObject["friends"][10]["friends"][2]["name"]``` will return the ```val```. You can set the path format in the config (see ```pathFormat```).
- ```parent```: The node under which the property exists. ```node.parent``` is another instance of node, and will have all the same properties. 
- ```parents()```: A method that returns a list of all ancestor nodes, going back to the root.
- ```children()```: A method that returns are direct children of a node (i.e. all nodes whose parent is this node.) An optional search parameters object can be passed in to filter the list to all who have matching key-values. For example, ```node.children({key: 'name', val: 'Tom'})``` will return all children where ```key === 'name'``` and ```val === 'Tom'```.
- ```siblings()```: A method that returns all nodes that exist alongside the current node within the parent. For parents of container ```'object'```, this includes all other properties of the parent object. For parents of type ```'array'```, this includes all other nodes in that array. 
- ```root()```: A method that returns the root node (defined by the first node without a parent).

# Examples

Walk.js provides some convenience functions which are really just implementations of the library. These demonstrate some of the power of the library. Let's take a look at two examples:

**1. Flattening values via ```Walk.flatten()```:**
*This function traverses an object tree and adds any values that match a specified key to an array. Return an array of optionally unique values.*

```
flatten: function( object, key ){
    //return array of values that match the key
    var arr = [];
    Walk.walk(object, undefined, {
        callbacks: [
            {
                keys: [key],
                callback: function(node){
                    arr.push(node.val);
                }
            }
        ]
    });
    //Walk.unique just returns an array of unique items
    return unique ? Walk.unique(arr) : arr;
}
```

**2. Deep copying values via ```Walk.deepCopy()```:**
*This function makes a deep copy of an object, preserving the original.*

```
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
}
```

# Upcoming features

- ```Walk.print(object)```: Prints a nested represented of the object.
- Multiple parents support for graphs.
- Search functionality for parent and sibling nodes.
- Removing the isRoot property, since this can be signaled via the absence of a parent.
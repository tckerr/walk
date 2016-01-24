#Contents

1. [Description](#Description)
2. [Usage](#Usage)
3. [Documentation](#Documentation)
  1. [Config options](#Config)
  2. [Classes](#Classes)
  3. [Callbacks](#Callbacks)
4. [Examples](#Examples)


# Description
```walk.js``` is a Javascript library for traversing object trees. The library allows for:

- Recursive decension into nested objects
- Type-specific (array/obj/value) preprocess and postprocess callback hooks that get executed during the walk
- A key-->class map for properties to avoid redundant key-specific definitions

It also provides some convenience functions, such as deepy copying and flattening nested arrays/objects into a value list.

# Usage

Download and include the library:
```
<script src="/path/to/walk.js"></script>
```

You will then be able to access the library through the ```walk``` object. 

Traverse an object with the following syntax:

```
var exampleObject = {
    'a': 1,
    'b': [2, 3, 4],
    'c': {'d': 5}
}

var walkConfig = {
    log: true
}

walk.walk(exampleObject, 'example', walkConfig);
```

Where the arguments are:

1. The object to traverse.
2. The "className" for the root object (set to ```undefined``` if not needed)
3. A configuration for the walk

See the documentation for more details!

# Documentation

### Config options:

- ```log``` *(true|false)*: Outputs formatted object tree to console.
- ```logger```: A custom logging object. The object must have the following methods: ```log(arg1, ...)```, ```group(arg1, ...)```, and ```groupEnd(arg1, ...)```.
- ```classMap```: A mapping of object keys to classes, such that when an object key is encountered in the data, it will resolve to its matching class name.
- ```strictClasses``` *(true|false)*: Throw an exception if an object is encountered without a class in the classMap.
- ```enforceRootClass``` *(true|false)*: Exempt root object from class checks (only applies if ```strictClasses == true```).
- ```rootObjectCallbacks``` *(true|false)*: Ignore global callbacks for root objects.
- ```runCallbacks``` *(true|false)*: Set this to false to skip callbacks completely.
- ```monitorPerformance``` *(true|false)*: Set this to true to print a performance report to console after the walk is complete.
- ```pathFormat```: a function that returns a path segment from a key (object key string or array index). The first argument is the key and the second argument is a boolean that is ```true``` when the key is an array index, ```false``` when it is a object key.
- ```callbacks```: an array of callback objects. See the Callback section for more information.

The configuration defaults to the following. Note that you can edit this by overwriting ```walk.configDefaults```:

```
configDefaults: {
    log: false,
    logger: console,
    classMap: {},
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
}
```

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
    containers: ['array'],
    classNames: ['person'],
    keys: ['friends'],
    positions: ['postWalk'],
    classKeys:{
        'person': ['friends'] //redundant, but just an example
    },
    callback: function(kwargs){
        // do things here
    }
}
```

Here are the properties you can define, which act as filters:

- ```containers```: an array of containers to run on. Options are ```'array'```, ```'object'```, and ```'value'```. If unspecifed, the callback will run on any container.
- ```classNames```: an array of classNames to run on. The callback will check the class name of the property as it has been resolved in the config's ```classMap```. If unspecifed, the callback will run on any class.
- ```keys```: an array of keys to run on. The callback will check the key of the property against this list. If unspecifed, the callback will run on any key.
- ```classKeys```: an object of "className": [keyArray] pairs. The callback will check the key of the property against this list, but will only match on keys from the given class. If unspecified, no keys will be filtered out (assuming the ```keys``` property is unset, otherwise it'll default to that.) Also note that if the ```classNames``` array is defined, any classKeys for classes not in that array will never be processed.
- ```positions```: an array of positions in the traversal to run on -- think of this as when it should execute. Options are ```'preWalk'``` (before any list/object is traversed), and ```'postWalk'``` (after any list/object is traversed). For properties of container-type ```'value'```, these two run in immediate succession. If unspecifed, the callback will run ```'postWalk'``` (this can be overidden in ```walk.defaultCallbackPosition```).
- ```callback```: the actual function to run. See below for the arguments (associated values we'll have access to at the time the callback runs.)

**Callback kwargs**: The callback will be passed a single argument, which is an object with the following properties:

- ```key```: The key of this property as defined on it's parent. For example, if this callback is running on the ```'weight'``` property of a ```person```, the ```key``` would be ```'weight'```. Note that this will be ```undefined``` for properties in arrays.
- ```value```: The value of the property. To use the above example, the value would be something like ```'183'```.
- ```className```: The className that the property matched on in the config's ```classMap```.
- ```owner```: The object under which the property exists.
- ```container```: The type of container the property is.
- ```arrayAssignment```: The array in which the property exists. This will be ```undefined``` for properties that do not belong to an array.
- ```arrayAssignmentKey```: The key to the array in which the property exists on the parent. This will be ```undefined``` for properties that do not belong to an array and ```undefined``` for nested arrays.
- ```isRoot```: A boolean that is set to ```true``` if the property is a root object, otherwise ```false```.
- ```callbacks```: An array of all the callback functions in the stack. Callback stacks are grouped by property and position. The current function *will* be included. A property is made available on each function via ```callbacks[index].__walk_has_run``` which will be true if the function has run in the current stack. This property is only available during the callback stack execution, and is deleted immediately afterwards.
- ```previousCallbacks```: An array of all callback functions that matched in previous positions. All of the functions in this list will have run on the property at the time of access.
- ```path``` The path to the value. For example, if the variable you're walking is named ```myObject```, the path will look something like ```["friends"][10]["friends"][2]["name"]```, such that calling ```myObject["friends"][10]["friends"][2]["name"]``` will return the ```val```. You can set the path format in the config (see ```pathFormat```).

The root has been omitted since it is a primary argument to the walk function, so it is assumed the caller has access to it at runtime. 

# Examples

Walk.js provides some convenience functions which are really just implementations of the library. These demonstrate some of the power of the library. Let's take a look at two examples:

**1. Flattening values via ```walk.flatten()```:**
*This function traverses an object tree and adds any values that match a specified key to an array. Return an array of optionally unique values.*

```
flatten: function( object, key ){
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
    //walk.unique just returns an array of unique items
    return unique ? walk.unique(arr) : arr;
}
```

**2. Deep copying values via ```walk.deepCopy()```:**
*This function makes a deep copy of an object, preserving the original.*

```
deepCopy: function(obj){

    //initialize our new object
    var newObj = {};

    // for minimal chance of key colision
    var uuid = '7f:&*_a6a'; 

    // helper function to update object via a nested key string    
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
            // add a callback to grab values as we traverse
            // and add them to our copied object
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
```
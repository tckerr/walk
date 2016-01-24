Description
---
```walk.js``` is a Javascript library for traversing object trees. The library allows for:

- Recursive decension into nested objects
- Type-specific (array/obj/value) preprocess and postprocess callback hooks that get executed during the walk
- A key-->"class" map for object keys to avoid redundant key-specific definitions

It also provides some convenience functions, such as flattening nested arrays/objects into a value list.

Usage
---

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
2. The "className" for the root object
3. A configuration for the walk

See the documentation for more details!

Documentation
---

###Config options:

- ```log``` *(true|false)*: Outputs formatted object tree to console.
- ```classMap```: A mapping of object keys to classes, such that when an object key is encountered in the data, it will resolve to its matching class name.
- ```classDefinitions```: An object of key-definition pairs that define fields and their behavior. See the 'classes' section below for more info.
- ```strictClasses``` *(true|false)*: Throw an exception if an object is encountered without a class in the classMap.
- ```enforceRootLabel``` *(true|false)*: Exempt root object from label checks (only applies if ```strictClasses == true```).
- ```rootObjectCallbacks``` *(true|false)*: Ignore global callbacks for root objects.
- ```runCallbacks``` *(true|false)*: Set this to false to skip callbacks completely.

###Classes

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

Now that we've mapped the three fields in the config, we create a ```classDefinitions``` in the config for ```person```:

```
config = {
    classDefinitions: {
        "person":{
            //options here
        },
    }
}
```

###Callbacks

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
    callback: function(key, val, className, owner, arrayAssignment, arrayAssignmentKey, isRoot){
        // do things here
    }
}
```

Here are the properties you can define, which act as filters:

- ```name```: optional name for the object
- ```containers```: an array of containers to run on. Options are ```'array'```, ```'object'```, and ```'value'```. If unspecifed, the callback will run on any container.
- ```classNames```: an array of classNames to run on. The callback will check the class name of the property as it has been resolved in the config's ```classMap```. If unspecifed, the callback will run on any class.
- ```keys```: an array of keys to run on. The callback will check the key of the property against this list. If unspecifed, the callback will run on any key.
- ```classKeys```: an object of "className": [keyArray] pairs. The callback will check the key of the property against this list, but will only match on keys from the given class. If unspecified, no keys will be filtered out (assuming the ```keys``` property is unset, otherwise it'll default to that.) Also note that if the ```classNames``` array is defined, any classKeys for classes not in that array will never be processed.
- ```positions```: an array of positions in the traversal to run on -- think of this as when it should execute. Options are ```'preWalk'``` (before any list/object is traversed), and ```'postWalk'``` (after any list/object is traversed). For properties of container-type ```'value'```, these two run in immediate succession. If unspecifed, the callback will run at both times.
- ```callback```: the actual function to run. See below for the arguments (associated values we'll have access to at the time the callback runs.)

####Callback Arguments:

- ```key```: The key of this property as defined on it's parent. For example, if this callback is running on the ```'weight'``` property of a ```person```, the ```key``` would be ```'weight'```. Note that this will be ```undefined``` for properties in arrays.
- ```value```: The value of the property. To use the above example, the value would be something like ```'183'```.
- ```className```: The className that the property matched on in the config's ```classMap```.
- ```owner```: The object under which the property exists.
- ```arrayAssignment```: The array in which the property exists. This will be ```undefined``` for properties that do not belong to an array.
- ```arrayAssignmentKey```: The key to the array in which the property exists on the parent. This will be ```undefined``` for properties that do not belong to an array and ```undefined``` for nested arrays.
- ```isRoot```: A boolean that is set to ```true``` if the property is a root object, otherwise ```false```.


Configuration Defaults
---

The configuration defaults to the following. Note that you can edit this by overwriting ```walk.configDefaults```:

```
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
}
```
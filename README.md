# Contents

1. [Description](#description)
2. [Installation](#installation)
3. [Usage](#usage)
    - [Synchronous](#synchronous)
    - [Async](#async)
4. [Reference](#reference)
    - [Configuration](#configuration)
        - [Defaults](#config-defaults)
        - [Builder](#using-the-builder)
    - [Callbacks](#callbacks)
    - [Nodes](#nodes)

# Description

Walk is a Javascript library for traversing object trees. The library allows for:

- Recursive descent into nested objects
- Type-specific (array/obj/value) preprocess and postprocess callback hooks that get executed during the walk

It also provides some convenience functions, such as deep copying objects.

# Installation

`npm install walkjs --save`

# Usage

## Synchronous

```typescript
import {apply} from 'walkjs';

const exampleObject = {
    'a': 1,
    'b': [2, 3, 4],
    'c': {'d': 5}
}

apply(exampleObject, (node) => console.log(node.path, "-->", node.val))
```

yields:
```text
--> { a: 1, b: [ 2, 3, 4 ], c: { d: 5 } }
["a"] --> 1
["b"] --> [ 2, 3, 4 ]
["b"][0] --> 2
["b"][1] -->  3
["b"][2] -->  4
["c"] --> { d: 5 }
["c"] --> ["d"]
```

`apply` is a shorthand version of the full `walk` API. The verbose way to do this is:

```javascript
import {walk} from 'walkjs';

const exampleObject = {
    'a': 1,
    'b': [2, 3, 4],
    'c': {'d': 5}
}

const config = {
    callbacks: [{
        callback: (node) => console.log(node.path, "-->", node.val)
    }]
}

walk(exampleObject, config);
```

## Async

Works almost exactly the same as the sync version, but has an async signature. Note that all callbacks will be awaited, and therefore still run in sequence. For the async versions below, callback functions may either return `Promise<void>` or `void`;

```typescript
import {applyAsync, walkAsync} from 'walkjs';

const exampleObject = {
    'a': 1,
    'b': [2, 3, 4],
    'c': {'d': 5}
}

await apply(exampleObject, async (node) => await someAsyncOperation())
```

See the reference for more details!

# Reference

#### `walk(obj: object, config: Config<Callback>): void`

The primary method for traversing an object and injecting callbacks into the traversal.

#### `walkAsync(obj: object, config: Config<AsyncCallback>): Promise<void>`

Async version of `walk` which returns a promise.

#### `apply(obj: object, ...callbacks: ((node: NodeType) => void)[]): void`:

A shorthand version of `walk()` that runs the supplied callbacks for all nodes.

#### `applyAsync(obj: object, ...callbacks: (((node: NodeType) => void) | ((node: NodeType) => Promise<void>))[]): Promise<void>`:

Async version of `apply` which returns a promise.

#### `Break`:

Throwing an instance of this class within a callback will halt processing completely. This allows for early access, and
limited processing of infinite trees.

#### `deepCopy(obj: object)`:

Returns a deep copy of an object, with all array and object references replaced with new objects/arrays.

#### `find(obj: object, value: any[, typeConversion: boolean])`:

This method returns all *values* who match within the `object`'s tree. Set the optional parameter `typeConversion`
to `true` to do a `==` comparison (instead of the default `===`.)

### Configuration:

- `rootObjectCallbacks: boolean`: Ignore callbacks for root objects.
- `parallelizeAsyncCallbacks: boolean`: (Only applies to async variations). Ignore `executionOrder` and run all async callbacks in parallel. Note that callbacks will still be grouped by position, so this will only apply to callbacks in the same position group.
- `runCallbacks: boolean`: Set this to `false` to skip callbacks completely.
- `callbacks: Callback[]`: an array of callback objects. See the Callback section for more information.
- `traversalMode: 'depth'|'breadth'`: the mode for traversing the tree. Options are ```depth``` for *depth-first*
  processing and ```breadth``` for *breadth-first* processing.
- `graphMode: 'finiteTree'|'graph'|'infinite'`: if the object that gets passed in doesn't comply with this configuration
  setting, an error will occur. Finite trees will error if an object/array reference is encountered more than once.
  Graphs will only process object/array references one time. Infinite trees will always continue to process -
  use ```throw new Break()``` to end the processing manually. *Warning:
  infinite trees will never complete processing if a callback doesn't ```throw new Break()```.*

#### Config Defaults

```typescript
const defaultConfig = {
    traversalMode: 'depth',
    rootObjectCallbacks: true,
    runCallbacks: true,
    graphMode: 'finiteTree',
    parallelizeAsyncCallbacks: false,
    callbacks: []
}
```

#### Using the builder

An alternative way to configure a walk is to use either the `WalkBuilder` or `AsyncWalkBuilder`.

Call `WalkBuilder.walk(obj: object)` to execute the walk with the builder's configuration. 


Example:
```typescript
import { WalkBuilder } from 'walkjs';

const logCallback = (node: WalkNode) => console.log(node);
const myObject = {}

const result = new WalkBuilder()
    // runs for every node
    .withSimpleCallback(logCallback)
    // configured callback
    .withCallback({
        keyFilters: ['myKey'],
        positionFilters: ['postWalk'],
        nodeTypeFilters: ['object'],
        executionOrder: 0,
        callback: logCallback
    })
    // alternative way to configure callbacks
    .withConfiguredCallback(logCallback)
        .filteredByKeys('key1', 'key2')
        .filteredByNodeTypes('object', 'array')
        .filteredByPositions('postWalk', 'preWalk')
        .withExecutionOrder(1)
        .done()
    .withGraphMode('graph')
    .withTraversalMode('breadth')
    .withRunningCallbacks(true)
    .withRootObjectCallbacks(true)
    // execute the walk
    .walk(myObject)
```

### Callbacks

We want to be able to execute custom functionality on certain properties within our object tree. For example, if we
wanted to print the count of all friends for any `person` object we encounter, we could write a callback object for
the `friends` property. The general form of a callback object is:

```
{   
    executionOrder: 0,
    nodeTypeFilters: ['array'],
    keyFilters: ['friends'],
    positionFilters: ['preWalk'],
    callback: function(node: NodeType){
        // do things here
    }
}
```

Here are the properties you can define in a callback configuration, most of which act as filters:

- `callback`: the actual function to run. Your callback function will be passed a single argument: a `WalkNode` object (
  see the Nodes section for more detail). succession. If unspecified, the callback will run `'preWalk'`. For async functions, `callback` may alternatively return a `Promise<void>`, in which case it will be awaited.
- `executionOrder`: an integer value for controlling order of callback operations. Lower values run earlier. If
  unspecified, the order will default to 0. Callback stacks are grouped by position and property, so the
  sort will only apply to callbacks in the same grouping.
- `nodeTypeFilters`: an array of node types to run on. Options are `'array'`, `'object'`, and `'value'`. If unspecified,
  the callback will run on any node type.
- `keyFilters`: an array of key names to run on. The callback will check the key of the property against this list. If unspecified, the callback will run on any key.
- `positionFilters`: an array of positions in the traversal to run on -- think of this as when it should execute.
  Options are `'preWalk'` (before any list/object is traversed), and `'postWalk'` (after any list/object is traversed).
  For properties of container-type `'value'`, these two run in immediate succession.

### Nodes

`WalkNode` objects represent a single node in the tree, providing metadata about the value, its parents, siblings, and children. Nodes have the following properties:

- `key: string|number`: The key of this property as defined on it's parent. For example, if this callback is running on
  the `'weight'` property of a `person`, the `key` would be `'weight'`. This will
  be the numerical index for members in arrays.
- `val: any`: The value of the property. To use the above example, the value would be something like `183`.
- `nodeType: NodeType`: The type of node the property is. Possible `NodeType` are `'array' | 'object' | 'value'`.
- `isRoot: boolean`: A boolean that is set to ```true``` if the property is a root object, otherwise ```false```.
- `executedCallbacks: Callback[]`: An array of all callback functions that have already run on this property. The current function wil *not* be in the list.
- `getPath(pathFormat?: (key: string, isArray: boolean) => string)` The path to the value, formatted with the optional formatter passed in. For example, if the variable you're walking is named `myObject`, the path will
  look something like `["friends"][10]["friends"][2]["name"]`, such that
  calling `myObject["friends"][10]["friends"][2]["name"]` will return the `val`.
- `parent: WalkNode`: The node under which the property exists. `node.parent` is another instance of node, and will have all the same properties.
- `children: WalkNode[]`: A list of all child nodes.
- `siblings: WalkNode[]`: A list of all sibling nodes (nodes which share a parent).

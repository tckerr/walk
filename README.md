# Contents

1. [Description](#description)
2. [Installation](#installation)
3. [Quickstart](#quickstart)
    - [Async](#async)
4. [Reference](#reference)
    - [Halting the walk](#halting-the-walk)
    - [Extra functions](#extra-functions)
        - [Apply](#apply)
        - [Deep copy](#deep-copy)
        - [Compare](#compare)
        - [Find](#find)
    - [Configuration](#configuration)
        - [Defaults](#config-defaults)
        - [Builder](#using-the-builder)
    - [Callbacks](#callbacks)
    - [Nodes](#nodes)
5. [Running walk as a generator](#running-walk-as-a-generator)

# Description

Walk is a Javascript library for traversing object trees. The library includes:

- Functions for recursive processing of nested object trees and directed graphs
- User defined, type-specific (array/obj/value) callback hooks that get executed during the traversal
- Support for asynchronous callbacks, run either in sequence or in parallel
- Incremental graph traversal through generators, with full async support
- A variety of convenience functions, which double as implementation examples for the library

# Installation

`npm install walkjs --save`

# Quickstart

Below is a simple example of usage, in which we execute a single callback for each node in the object graph. The 
callback simply prints metadata about the node. We also add a global filter to exclude any nodes whose value is equal
to `1`.

```typescript
import { WalkBuilder } from 'walkjs';

const obj = {
    'a': 1,
    'b': [2, 3],
    'c': {'d': 5}
}

function printNode(node: WalkNode){
    console.log("obj" + node.getPath(), "=", node.val)
}

new WalkBuilder()
    .withSimpleCallback(printNode)
    .withGlobalFilter(node => node.val !== 1)
    .walk(obj)
```

outputs:
```javascript
obj = { a: 1, b: [ 2, 3 ], c: { d: 4 } }
obj["b"] = [ 2, 3 ]
obj["b"][0] = 2
obj["b"][1] = 3
obj["c"] = { d: 4 }
obj["c"]["d"] = 4
```
## Async

Async walks work almost exactly the same as the sync ones, but have an async signature. Note that all callbacks will be awaited, and therefore still run in sequence. For the async versions below, callback functions may either return `Promise<void>` or `void`;

```typescript
import {AsyncWalkBuilder} from 'walkjs';

const obj = {
    //...
}

async function callApi(node: WalkNode): Promise<void> {
    // do some async work here
}

await new AsyncWalkBuilder()
    .withSimpleCallback(callApi)
    .walk(exampleObject)
```

See the reference for more details!

# Reference

#### `walk(obj: object, config: Config<Callback>): void`

The primary method for traversing an object and injecting callbacks into the traversal. 

#### `walkAsync(obj: object, config: Config<AsyncCallback>): Promise<void>`

Async version of `walk` which returns a promise.

### Halting the walk

```typescript
import {apply, Break} from "walkjs";

// the walk will not process for any nodes after this
apply({}, () => throw new Break())

```

Throwing an instance of this class within a callback will halt processing completely. This allows for early exit, usually for circular graphs or in cases when you no longer need to continue.

### Extra functions

Walk has some extra utility functions built-in that you may find useful.

#### Apply


```typescript
apply(
    obj: object, 
    ...callbacks: ((node: NodeType) => void)[]
): void
    
applyAsync(
    obj: object, 
    ...callbacks: (((node: NodeType) => void) | ((node: NodeType) => Promise<void>))[]
): Promise<void>
```

A shorthand version of `walk()` that runs the supplied callbacks for all nodes.

#### Deep copy

```typescript
deepCopy(obj: object) : object
```

Returns a deep copy of an object, with all array and object references replaced with new objects/arrays.

#### Compare

```typescript
compare(
    a: object, 
    b: object, 
    leavesOnly=false, 
    formatter: NodePathFormatter=defaultFormatter
): NodeComparison
```

This method does a deep comparison between objects `a` and `b` based on the keys of each node. It returns an array of the following type:

```typescript
type NodeComparison = {
    path: string,
    a?: any
    b?: any
    hasDifference: boolean,
    difference?: 'added' | 'removed' | {before: any, after: any}
}
```

#### Find

```typescript
find(obj: object, value: any, typeConversion: boolean=false)
```

This method returns all *values* who match within the `object`'s tree. Set the optional parameter `typeConversion`
to `true` to do a `==` comparison (instead of the default `===`.)

### Configuration:

- `rootObjectCallbacks: boolean`: Ignore callbacks for root objects.
- `parallelizeAsyncCallbacks: boolean`: (Only applies to async variations). Ignore `executionOrder` and run all async callbacks in parallel. Note that callbacks will still be grouped by position, so this will only apply to callbacks in the same position group.
- `runCallbacks: boolean`: Set this to `false` to skip callbacks completely.
- `callbacks: Callback<T>[]`: an array of callback objects. See the [Callback](#callbacks) section for more information.
- `traversalMode: 'depth'|'breadth'`: the mode for traversing the tree. Options are `depth` for *depth-first*
  processing and `breadth` for *breadth-first* processing.
- `graphMode: 'finiteTree'|'graph'|'infinite'`: if the object that gets passed in doesn't comply with this configuration
  setting, an error will occur. Finite trees will error if an object/array reference is encountered more than once, determined by set membership of the WalkNode's `val`. Graphs will only process object/array references one time. Infinite trees will always process nodes -- use `throw new Break()` to end the processing manually. *Warning:
  infinite trees will never complete processing if a callback doesn't `throw new Break()`.*

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
        positionFilter: 'postWalk',
        nodeTypeFilters: ['object'],
        executionOrder: 0,
        callback: logCallback
    })
    // alternative way to configure callbacks
    .withConfiguredCallback(logCallback)
        .filteredByKeys('key1', 'key2')
        .filteredByNodeTypes('object', 'array')
        .filteredByPosition('postWalk')
        .withFilter(node => !!node.parent)
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
    positionFilter: 'preWalk',
    callback: function(node: NodeType){
        // do things here
    }
}
```

Here are the properties you can define in a callback configuration, most of which act as filters:

- `callback: (node: WalkNode) => void`: the actual function to run. Your callback function will be passed a single argument: a `WalkNode` object (
  see the Nodes section for more detail). succession. If unspecified, the callback will run `'preWalk'`. For async functions, `callback` may alternatively return a `Promise<void>`, in which case it will be awaited.
- `executionOrder: number`: an integer value for controlling order of callback operations. Lower values run earlier. If
  unspecified, the order will default to 0. Callback stacks are grouped by position and property, so the
  sort will only apply to callbacks in the same grouping.
- `filters: ((node: WalkNode) => boolean)[]`: A list of functions which will exclude nodes when the result of the function for that node is `false`.
- `nodeTypeFilters: NodeType[]`: an array of node types to run on. Options are `'array'`, `'object'`, and `'value'`. If unspecified,
  the callback will run on any node type.
- `keyFilters: string[]`: an array of key names to run on. The callback will check the key of the property against this list. If unspecified, the callback will run on any key.
- `positionFilter: PositionType`: The position the traversal to run on -- think of this as when it should execute.
  Options are `'preWalk'` (before any list/object is traversed), and `'postWalk'` (after any list/object is traversed). You may also supply `'both'`.
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

# Running walk as a generator

Behind the scenes, `walk` and `walkAsync` run as generators (`Generator<WalkNode>` and `AsyncGenerator<WalkNode>`, respectively). As they step through the object graph, nodes are yielded. 

The default `walk`/`walkAsync` functions coerce the generator to a list before returning. However you can access the generator directly, simple use the following imports instead:

```typescript
import {walkStep, walkAsyncStep} from "walkjs";

// sync
for (const node of walkStep(obj, config))
    console.log(node);

// async
for await (const node of walkAsyncStep(obj, config))
    console.log(node)

```

Note that `preWalk` callbacks are invoked prior to yielding a node, and `postWalk` callbacks after.

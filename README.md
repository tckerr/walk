# Contents

1. [Description](#description)
2. [Installation](#installation)
3. [Quickstart](#quickstart)
    - [Async](#async)
4. [Reference](#reference)
    - [Halting the walk](#halting-the-walk)
    - [Configuration](#configuration)
        - [Defaults](#config-defaults)
        - [Builder](#using-the-builder)
    - [Callbacks](#callbacks)
    - [Nodes](#nodes)
5. [Extra utilities](#extra-functions)
    - [Apply](#apply)
    - [Deep copy](#deep-copy)
    - [Compare](#compare)
    - [Reduce](#reduce)
6. [Running walk as a generator](#running-walk-as-a-generator)

# Description

Walk is a 0 dependency Javascript/Typescript library for traversing object trees. The library includes:

- Functions for recursive processing of nested object trees and directed graphs
- User defined callback hooks that get executed during the traversal
- Incremental graph traversal through generators
- A variety of convenience functions, which double as implementation examples for the library

# Installation

`npm install walkjs`

# Quickstart

Below is a simple example of usage, in which we execute a single callback for each node in the object graph. The  callback simply prints metadata about the node. We also add a global filter to exclude any nodes whose value is equal to `1`.

```typescript
import {walk} from 'walkjs';

const obj = {
    'a': 1,
    'b': [2, 3],
    'c': {'d': 4}
}

walk(obj, {
    onVisit: {
        callback: node => console.log("obj" + node.getPath(), "=", node.val),
        filters: node => node.val !== 1,
    }
})
```

outputs:
```text
obj = { a: 1, b: [ 2, 3 ], c: { d: 4 } }
obj["b"] = [ 2, 3 ]
obj["b"][0] = 2
obj["b"][1] = 3
obj["c"] = { d: 4 }
obj["c"]["d"] = 4
```

## Async

Async walks work almost exactly the same as the sync ones, but have an async signature. All callbacks will be awaited, and therefore still run in sequence. For the async versions below, callback functions may either return `Promise<void>` or `void`;

```typescript
import {walkAsync} from 'walkjs';

const obj = {
    //...
}

await walkAsync(exampleObject, {
    onVisit: {
        callback: async function callApi(node: WalkNode): Promise<void> {
            // do some async work here
        }
    }
})
```

See the reference for more details!

# Reference

```typescript
// The primary method for traversing an object and injecting callbacks into the traversal. 
function walk(target: any, config: Config<Callback>): void {/*...*/}

// Async version of `walk` which returns a promise.
function walkAsync(target: any, config: Config<AsyncCallback>): Promise<void>  {/*...*/}
```

## Configuration:

```typescript
type Config<T> = {
    // (Only applies to async variations). If set to true, the walk will ignore `Callback.executionOrder` and instead 
    // run all async callbacks in parallel. However callbacks will still be grouped by `preVisit` or `postVisit`.
    parallelizeAsyncCallbacks: boolean;

    // One or many callback objects. See the Callbacks section for more information.
    onVisit: OneOrMany<Callback<T>>;

    // the mode for traversing the tree. Options are `depth` for *depth-first* processing and `breadth` for 
    // *breadth-first* processing.
    traversalMode: 'depth' | 'breadth';

    // if the object that gets passed in doesn't comply with this configuration setting, an error will occur. 
    // Finite trees will error if an object/array reference is encountered more than once, determined by set membership 
    // of the WalkNode's `val`. Graphs will only process object/array references one time. Infinite trees will always 
    // process nodes -- use `throw new Break()` to end the processing manually. *Warning: infinite trees will never 
    // complete processing if a callback doesn't `throw new Break()`.*
    graphMode: 'finiteTree' | 'graph' | 'infinite';

    // As mentioned in the `graphMode` config option, walk uses a set membership on the node's `val` to determine 
    // whether a node has been visited (for arrays and objects only). This setting can be overridden to change that 
    // behavior.
    visitationRegister: NodeVisitationRegister;

    // set to `false` to prevent tracking which callbacks have been invoked on a node. `WalkNode.executedCallbacks` 
    // will always be empty if this is set to `false`. This may help with memory management for larger objects.
    trackExecutedCallbacks: boolean;
}
```


### Config Defaults

```typescript
const defaultConfig: Config<T> = {
   traversalMode: 'depth',
   graphMode: 'finiteTree',
   parallelizeAsyncCallbacks: false,
   onVisit: [],
   trackExecutedCallbacks: true,
   visitationRegister: SetVisitationRegister
}
```

### Using the builder

An alternative way to configure a walk is to use either the `WalkBuilder` or `AsyncWalkBuilder`.

Call `WalkBuilder.walk(target: any)` to execute the walk with the builder's configuration.

Example:
```typescript
import {WalkBuilder} from 'walkjs';

const logCallback = (node: WalkNode) => console.log(node);
const myObject = {}

const result = new WalkBuilder()
        // runs for every node
        .withSimpleCallback(logCallback)
        // configured callback
        .withCallback({
           timing: 'postVisit',
           executionOrder: 0,
           callback: logCallback
        })
        // alternative way to configure callbacks
        .withConfiguredCallback(logCallback)
           .withTiming('postVisit')
           .withFilter(node => !!node.parent)
           .withExecutionOrder(1)
           .done()
        .withGraphMode('graph')
        .withTraversalMode('breadth')
        // execute the walk
        .walk(myObject)
```

## Callbacks

Callbacks are a way to execute custom functionality on certain nodes within our object tree.

```typescript
type Callback<T extends (node: WalkNode) => void> = {
    // The function to run when the node is visited. The callback function will be passed a single argument: a 
    // `WalkNode` object (see the Nodes section for more detail). For async functions, `callback` may alternatively 
    // return a `Promise<void>`, in which case it will be awaited.
    callback: T;

    // When the callback will execute. Options are `'preVisit'` (before any list/object is traversed), and `'postVisit'`
    // (after any list/object is traversed). You may also supply `'both'`. When the walk is run in `'breadth'` mode, the 
    // only difference here is whether the callback is invoked prior to yielding the node. However when running in 
    // `'depth'` mode, `'postVisit'` callbacks for a node will run *after all the callbacks of its children*. 
    //
    // For example, if our object is `{ a: b: { c: 1, d: 2 } }`, we would expect `'postVisit'` callbacks to run in the 
    // following order: `c`, `d`, `b`, `a`.
    timing?: CallbackTiming;

    // an integer value for controlling order of callback operations. Lower values run earlier. Callback stacks are 
    // grouped by timing and property, so the sort will only apply to callbacks in the same grouping.
    executionOrder?: number;

    // A function or list of functions which will exclude nodes when the result of the function for that 
    // node is `false`.
    filters?: ((node: WalkNode) => boolean) | ((node: WalkNode) => boolean)[];
}

```

### Callback Defaults

```typescript
const defaultCallback: Callback = {
    timing: 'preVisit',
    executionOrder: 0,
    filters: []
}
```

## Nodes

`WalkNode` objects represent a single node in the tree, providing metadata about the value, its parents, siblings, and children. Nodes have the following properties:

```typescript
type WalkNode = {
   // The key of this property as defined on its parent. For example, if this callback is running on the `'weight'` 
   // property of a `person`, the `key` would be `'weight'`. This will be the numerical index for members in arrays.
   key: string | number;

   // The value of the property. To use the above example, the value would be something like `183`.
   val: any;

   //Possible `NodeType` are `'array' | 'object' | 'value'`. Objects and arrays will be traversed, while values are 
   // leaf nodes.
   nodeType: NodeType;

   // Will be set to `true` if the property is a root object, otherwise `false`.
   isRoot: boolean;

   // An array of all callback functions that have already run on this property. The current function will *not* be 
   // in the list. Tracking this can be disabled in the config.
   executedCallbacks: Callback[];

   // The fully qualified path to the value, formatted with the optional formatter passed in. For example, if the 
   // variable being walked is named `myObject`, the path will look something like 
   // `["friends"][10]["friends"][2]["name"]`, such that calling `myObject["friends"][10]["friends"][2]["name"]` 
   // will return the `val`. The `pathFormat` parameter should take a node and return the path segment for only that 
   // node since `getPath` will automatically prepend the path of the node's parent as well.
   getPath(pathFormat?: (node: WalkNode) => string);

   // The node under which the property exists. `node.parent` is another instance of node, and will have all the same 
   // properties.
   parent: WalkNode;

   // A list of all child nodes.
   children: WalkNode[];

   // A list of all sibling nodes (nodes which share a parent).
   siblings: WalkNode[];

   // A list of all descendant nodes (recursively traversing children).
   descendants: WalkNode[];

   // A list of nodes formed by recursively traversing parents back to the root.
   ancestors: WalkNode[];
}

```

## Halting the walk

Throwing an instance of "Break" within a callback will halt processing completely. This allows for early exit, usually in cases such as processing circular graphs or when you simply no longer need to continue.

Example:

```typescript
import {apply, Break} from "walkjs";

apply([1, 2, 3], ({val}) => {
    if(val === 2)
       throw new Break()
})
```

# Extra utilities

Walk has some extra utility functions built-in that you may find useful.

## Apply

A shorthand version of `walk()` that runs the supplied callbacks for all nodes.

```typescript
function apply(
    target: any, 
    ...onVisit: ((node: NodeType) => void)[]
): void {/*...*/}
    
function applyAsync(
    target: any, 
    ...onVisit: (((node: NodeType) => void) | ((node: NodeType) => Promise<void>))[]
): Promise<void> {/*...*/}
```


## Deep copy

Returns a deep copy of an object, with all array and object references replaced with new objects/arrays.

```typescript
function deepCopy(target: object) : object { /*...*/ }
```

## Compare

Computes a deep comparison between objects `a` and `b` based on the keys of each node:

```typescript
type NodeComparison = {
   path: string,
   a?: any
   b?: any
   hasDifference: boolean,
   difference?: 'added' | 'removed' | {before: any, after: any}
}

function compare(
    a: any, 
    b: any, 
    leavesOnly=false, 
    formatter: NodePathSegmentFormatter=defaultFormatter,
    nodeComparison: NodeComparisonFn = (a, b) => Object.is(a.val, b.val)
): NodeComparison  {/*...*/}
```

## Reduce

Accumulates a value of type T, starting with `initialValue`, by invoking `fn` on each node in `source` and adding the result to the accumulated value T.

```typescript
function reduce(
    source: object, 
    initialValue: T, 
    fn: (accumulator: T, node: WalkNode) => T
): T  {/*...*/}
```

# Running walk as a generator

Behind the scenes, `walk` and `walkAsync` run as generators (`Generator<WalkNode>` and `AsyncGenerator<WalkNode>`, respectively). As they step through the object graph, nodes are yielded. 

The default `walk`/`walkAsync` functions coerce the generator to a list before returning. However, you can access the generator directly; simply use the following imports instead:

```typescript
import {walkStep, walkAsyncStep} from "walkjs";

// sync
for (const node of walkStep(obj, config))
    console.log(node);

// async
for await (const node of walkAsyncStep(obj, config))
    console.log(node)

```

Note: `preVisit` callbacks are invoked prior to yielding a node, and `postVisit` callbacks after.

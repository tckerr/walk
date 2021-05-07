import {unique, updateObjectViaPathString} from "./helpers";
import {walk, walkAsync} from "./walk";
import {WalkNode} from "./node";
import {AsyncCallbackFn, CallbackFn, NodePathFormatter} from "./types";

export function flatten(obj: object, key: string, onlyUnique: boolean) {
    //return array of values that match the key
    const arr: any[] = [];
    walk(obj, {
        callbacks: [{
            keyFilters: [key],
            callback: function (node) {
                arr.push(node.val);
            }
        }]
    });
    return onlyUnique ? unique(arr) : arr;
}

export function apply(obj: object, ...callbacks: CallbackFn[]) {
    walk(obj, {callbacks: callbacks.map(c => ({callback: c}))})
}

export async function applyAsync(obj: object, ...callbacks: AsyncCallbackFn[]) {
    await walkAsync(obj, {callbacks: callbacks.map(c => ({callback: c}))})
}

export function findAll<T>(obj: object, value: T, typeConversion: boolean = false): T[] {
    const comparison = typeConversion
        ? (a: any, b: any) => a == b
        : (a: any, b: any) => a === b;
    const matches: T[] = [];
    apply(obj, function (node) {
        if (comparison(node.val, value)) {
            matches.push(node.val);
        }
    });
    return matches;
}

export function deepCopy(obj: object) {
    const newObj = {};
    const uuid = 'WALK:DEEP-COPY:DELIMITER';
    const format = (key: string) => uuid + key;

    walk(obj, {
        rootObjectCallbacks: false,
        callbacks: [{
            positionFilter: 'preWalk',
            callback: function (node: WalkNode) {
                switch (node.nodeType) {
                    case 'array':
                        updateObjectViaPathString(newObj, [], node.getPath(format), uuid);
                        break;
                    case 'object':
                        updateObjectViaPathString(newObj, {}, node.getPath(format), uuid);
                        break;
                    case 'value':
                        updateObjectViaPathString(newObj, node.val, node.getPath(format), uuid);
                        break;
                }
            }
        }]
    });
    return newObj;
}

export class Break extends Error {
  constructor(message: string = '') {
    super(message);
    this.name = "Break";
  }
}


export function forceEvalGenerator<T>(gen: Generator<T>){
    for (const _ of gen) {}
}

export async function forceEvalAsyncGenerator<T>(gen: AsyncGenerator<T>){
    for await (const _ of gen) {}
}

type NodeComparison = {
    path: string,
    a?: any
    b?: any
    hasDifference: boolean,
    difference?: 'added' | 'removed' | {before: any, after: any}
}

const defaultFormatter: NodePathFormatter = (key: string, isArr: boolean) => isArr ? `[${key}]` : `.${key}`

export function compare(a: object, b: object, leavesOnly=false, formatter: NodePathFormatter=defaultFormatter): NodeComparison[] {

    const aNodes: {[key: string]: WalkNode} = {}
    const bNodes: {[key: string]: WalkNode} = {}

    apply(a,n => aNodes[n.getPath(formatter)] = n)
    apply(b, n => bNodes[n.getPath(formatter)] = n)

    return [...new Set<string>([
        ...Object.keys(aNodes),
        ...Object.keys(bNodes)
    ])]
        .filter(key => !leavesOnly || (aNodes[key] || bNodes[key])!.nodeType === 'value')
        .map(key => {
        const aNode = aNodes[key];
        const bNode = bNodes[key];
        const removed = aNode && !bNode;
        const added = bNode && !aNode;
        const changed = aNode && bNode && !Object.is(aNode.val, bNode.val)
        let delta: NodeComparison = {
            path: key,
            hasDifference: removed || added || changed
        };
        if(added){
            delta.difference = 'added'
            delta.b = bNode?.val
        }
        else if(removed){
            delta.difference = 'removed'
            delta.a = aNode?.val
        }
        else if (changed){
            delta.difference = {
                before: aNode?.val,
                after: bNode?.val
            }
            delta.a = aNode?.val
            delta.b = bNode?.val
        }
        return delta;
    })
}

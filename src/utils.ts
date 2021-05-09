import {walk, walkAsync} from "./walk";
import {WalkNode} from "./node";
import {AsyncCallbackFn, CallbackFn, NodePathSegmentFormatter} from "./types";

function updateObjectViaPathString(obj: any, val: any, path: string, delimiter: string) {
    const block = path.split(delimiter).slice(1);
    while (block.length > 1)
        obj = obj[block.shift()!];
    obj[block.shift()!] = val;
}

export function apply(target: any, ...callbacks: CallbackFn[]) {
    walk(target, {callbacks: callbacks.map(c => ({callback: c}))})
}

export async function applyAsync(target: any, ...callbacks: AsyncCallbackFn[]) {
    await walkAsync(target, {callbacks: callbacks.map(c => ({callback: c}))})
}

export function deepCopy(target: object, delimiter: string='$walk:dc$') {
    if (target === null)
        return null

    const newObj = Array.isArray(target) ? [] : {};
    const format: NodePathSegmentFormatter = ({key}) => delimiter + key;

    walk(target, {
        rootObjectCallbacks: false,
        callbacks: [{
            positionFilter: 'preWalk',
            callback: function (node: WalkNode) {
                switch (node.nodeType) {
                    case 'array':
                        updateObjectViaPathString(newObj, [], node.getPath(format), delimiter);
                        break;
                    case 'object':
                        updateObjectViaPathString(newObj, node.val === null ? null : {}, node.getPath(format), delimiter);
                        break;
                    case 'value':
                        updateObjectViaPathString(newObj, node.val, node.getPath(format), delimiter);
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

type NodeComparison = {
    path: string,
    a?: any
    b?: any
    hasDifference: boolean,
    difference?: 'added' | 'removed' | {before: any, after: any}
}

const defaultFormatter: NodePathSegmentFormatter = ({key, isArrayMember: isArr}) => isArr ? `[${key}]` : `.${key}`

export function compare(a: object, b: object, leavesOnly=false, formatter: NodePathSegmentFormatter=defaultFormatter): NodeComparison[] {

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

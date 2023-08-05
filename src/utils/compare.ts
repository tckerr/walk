import {NodePathSegmentFormatter} from "../types";
import {WalkNode} from "../node";
import {apply} from "./apply";

type NodeComparison = {
    path: string,
    a?: any
    b?: any
    hasDifference: boolean,
    difference?: 'added' | 'removed' | { before: any, after: any }
}

const defaultFormatter: NodePathSegmentFormatter = ({key, isArrayMember: isArr}) => isArr ? `[${key}]` : `.${key}`

export type NodeComparisonFn = (a: WalkNode, b: WalkNode) => boolean;

export function compare(
    a: object,
    b: object,
    leavesOnly = false,
    formatter: NodePathSegmentFormatter = defaultFormatter,
    nodeComparison: NodeComparisonFn = (a, b) => Object.is(a.val, b.val)
): NodeComparison[]
{
    const aNodes: { [key: string]: WalkNode } = {}
    const bNodes: { [key: string]: WalkNode } = {}

    apply(a, n => aNodes[n.getPath(formatter)] = n)
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
            const changed = aNode && bNode && !nodeComparison(aNode, bNode)
            let delta: NodeComparison = {
                path: key,
                hasDifference: removed || added || changed
            };
            if (added) {
                delta.difference = 'added'
                delta.b = bNode?.val
            } else if (removed) {
                delta.difference = 'removed'
                delta.a = aNode?.val
            } else if (changed) {
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

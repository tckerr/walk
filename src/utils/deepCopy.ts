import {NodePathSegmentFormatter} from "../types";
import {walk} from "../walk";
import {WalkNode} from "../node";

function updateObjectViaPathString(obj: any, path: string, delimiter: string, val: any) {
    const block = path.split(delimiter).slice(1);
    while (block.length > 1)
        obj = obj[block.shift()!];
    obj[block.shift()!] = val;
}


export function deepCopy(target: object, delimiter: string = '$walk:dc$') {
    if (target === null)
        return null

    const newObj = Array.isArray(target) ? [] : {};
    const format: NodePathSegmentFormatter = ({key}) => delimiter + key;

    walk(target, {
        rootObjectCallbacks: false,
        callbacks: [{
            positionFilter: 'preWalk',
            callback: (node) => updateObjectViaPathString(
                newObj,
                node.getPath(format),
                delimiter,
                node.nodeType === 'array'
                    ? []
                    : (node.nodeType === 'value'
                        ? node.val
                        : (node.val === null
                            ? null
                            : {}
                        )
                    )
            )
        }]
    });
    return newObj;
}

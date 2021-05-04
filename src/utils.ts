import {unique, updateObjectViaPathString} from "./helpers";
import {walk, walkAsync} from "./walk";
import {WalkNode} from "./node";

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

export function apply(obj: object, callback: (node: WalkNode) => void) {
    walk(obj, {callbacks: [{callback}]});
}

export async function applyAsync(obj: object, callback: (node: WalkNode) => Promise<void>) {
    await walkAsync(obj, {callbacks: [{callback}]});
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
            positionFilters: ['preWalk'],
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

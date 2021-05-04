import {unique, updateObjectViaPathString} from "./helpers";
import {WalkNode} from "./types";
import walk from "./walk";

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

    walk(obj, {
        pathFormat: key => uuid + key,
        rootObjectCallbacks: false,
        callbacks: [{
            positionFilters: ['preWalk'],
            callback: function (node) {
                switch (node.nodeType) {
                    case 'array':
                        updateObjectViaPathString(newObj, [], node.path, uuid);
                        break;
                    case 'object':
                        updateObjectViaPathString(newObj, {}, node.path, uuid);
                        break;
                    case 'value':
                        updateObjectViaPathString(newObj, node.val, node.path, uuid);
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

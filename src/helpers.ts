import {IOrderable} from "./types";

export function executionOrderSort<T extends IOrderable>(a: T, b: T) {
    const _a = a.executionOrder || 0;
    const _b = b.executionOrder || 0;
    return _a < _b ? -1 : _a > _b ? 1 : 0;
}

export function unique(arr: any[]) {
    const seen = new Set<any>();
    return arr.filter((val: any) => {
        if (seen.has(val)) return;
        seen.add(val)
        return val;
    });
}

export function updateObjectViaPathString(obj: any, val: any, path: string, delimiter: string) {
    const block = path.split(delimiter).slice(1);
    while (block.length > 1)
        obj = obj[block.shift()!];
    obj[block.shift()!] = val;
}

import {_Callback, CallbackFn, IOrderable} from "./types";
import {WalkNode} from "./node";

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

export class CallbackStacker<T extends CallbackFn, Rt> {

    constructor(private executor: (callbacks: _Callback<T>[], node: WalkNode) => Rt) {
    }

    private lookup: {
        [key: number]: {
            trigger: number,
            fn: () => Rt
        }
    } = {}

    public push(key: number, node: WalkNode, callbacks: _Callback<T>[]) {
        this.lookup[key] = {
            trigger: node.id,
            fn: () => this.executor(callbacks, node)
        }
    }

    public executeOne(node: WalkNode, callbacks: _Callback<T>[]): Rt {
        return this.executor(callbacks, node)
    }

    public* execute(nodeId: number): Generator<Rt> {
        let next = this.lookup[nodeId]
        delete this.lookup[nodeId]
        while (next) {
            yield next.fn()
            const trigger = next.trigger;
            next = this.lookup[trigger]
            delete this.lookup[trigger]
        }
    }
}

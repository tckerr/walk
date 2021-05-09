import {_Callback, AsyncCallbackFn, CallbackFn, Context, PositionType} from "./types";
import {WalkNode} from "./node";

function filterByFilters<T extends CallbackFn>(cb: _Callback<T>, node: WalkNode) {
    return cb.filters.every(f => f(node))
}

function filterByNodeType<T extends CallbackFn>(cb: _Callback<T>, node: WalkNode) {
    return !cb.nodeTypeFilters.length
        || cb.nodeTypeFilters.indexOf(node.nodeType) !== -1;
}

function filterByKey<T extends CallbackFn>(cb: _Callback<T>, node: WalkNode) {
    return cb.keyFilters.length === 0
        || (
            typeof node.key === 'string'
            && cb.keyFilters.indexOf(node.key) !== -1
        );
}

function execCallbacks(callbacks: _Callback<CallbackFn>[], node: WalkNode): void {
    for (let cb of callbacks) {
        cb.callback(node)
        node.executedCallbacks.push(cb);
    }
}

type AsyncExecutor = (callbacks: _Callback<AsyncCallbackFn>[], node: WalkNode) => Promise<void>;

async function execCallbacksAsync(callbacks: _Callback<AsyncCallbackFn>[], node: WalkNode): Promise<void> {
    for (let cb of callbacks) {
        await cb.callback(node)
        node.executedCallbacks.push(cb);
    }
}

const execCallbacksAsyncInParallel = async (callbacks: _Callback<AsyncCallbackFn>[], node: WalkNode): Promise<void> => {
    await Promise.all(
        callbacks.map(cb =>
            Promise.resolve(cb.callback(node))
                .then(() => {
                    node.executedCallbacks.push(cb)
                })
        )
    );
}

export class _CallbackStacker<T extends CallbackFn, Rt> {

    constructor(private ctx: Context<T>, private executor: (callbacks: _Callback<T>[], node: WalkNode) => Rt) {
    }

    public static ForSync<T extends CallbackFn>(ctx: Context<T>): _CallbackStacker<CallbackFn, void> {
        return new _CallbackStacker<CallbackFn, void>(ctx, execCallbacks)
    }

    public static ForAsync<T extends CallbackFn>(ctx: Context<T>): _CallbackStacker<AsyncCallbackFn, void | Promise<void>> {
        return new _CallbackStacker<CallbackFn, void>(ctx, ctx.config.parallelizeAsyncCallbacks
            ? execCallbacksAsyncInParallel
            : execCallbacksAsync)
    }

    private _matchCallbacks(node: WalkNode, position: PositionType): _Callback<T>[] {

        if (!this.ctx.config.runCallbacks)
            return []

        if (node.isRoot && !this.ctx.config.rootObjectCallbacks)
            return [];

        let callbacks = this.ctx.callbacksByPosition[position];

        return (callbacks || [])
            .map(cb => cb as _Callback<T>)
            .filter(cb => filterByFilters(cb, node))
            .filter(cb => filterByNodeType(cb, node))
            .filter(cb => filterByKey(cb, node))
    }

    private lookup: {
        [key: number]: {
            trigger: number,
            fn: () => Rt
        }
    } = {}

    public push(key: number, node: WalkNode, position: PositionType) {
        const callbacks = this._matchCallbacks(node, position)
        this.lookup[key] = {
            trigger: node.id,
            fn: () => this.executor(callbacks, node)
        }
    }

    public executeOne(node: WalkNode, position: PositionType): Rt {
        const callbacks = this._matchCallbacks(node, position)
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

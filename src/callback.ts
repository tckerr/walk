import {AsyncCallbackFn, _Callback, CallbackFn, Config, Context, PositionType} from "./types";
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

export function matchCallbacks<T extends CallbackFn>(node: WalkNode, position: PositionType, ctx: Context<T>): _Callback<T>[] {

    if (!ctx.config.runCallbacks)
        return []

    if (node.isRoot && !ctx.config.rootObjectCallbacks)
        return [];

    let callbacks = ctx.callbacksByPosition[position];

    return (callbacks || [])
        .map(cb => cb as _Callback<T>)
        .filter(cb => filterByFilters(cb, node))
        .filter(cb => filterByNodeType(cb, node))
        .filter(cb => filterByKey(cb, node))
}

export function execCallbacks(callbacks: _Callback<CallbackFn>[], node: WalkNode): void {
    for (let cb of callbacks) {
        cb.callback(node)
        node.executedCallbacks.push(cb);
    }
}

type AsyncExecutor = (callbacks: _Callback<AsyncCallbackFn>[], node: WalkNode) => Promise<void>;

export async function execCallbacksAsync(callbacks: _Callback<AsyncCallbackFn>[], node: WalkNode): Promise<void> {
    for (let cb of callbacks) {
        await cb.callback(node)
        node.executedCallbacks.push(cb);
    }
}

export const execCallbacksAsyncInParallel = async (callbacks: _Callback<AsyncCallbackFn>[], node: WalkNode): Promise<void> => {
    await Promise.all(
        callbacks.map(cb =>
            Promise.resolve(cb.callback(node))
                .then(() => {
                    node.executedCallbacks.push(cb)
                })
        )
    );
}

export function getAsyncExecutor<T extends CallbackFn>(config: Config<T>): AsyncExecutor {
    return config.parallelizeAsyncCallbacks
        ? execCallbacksAsyncInParallel
        : execCallbacksAsync;
}

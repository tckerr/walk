import {AsyncCallback, BaseCallback, Callback, Config, Context, PositionType} from "./types";
import {WalkNode} from "./node";

function filterByFilters<T extends BaseCallback>(cb: T, node: WalkNode) {
    if (typeof cb.filters === 'undefined' || (Array.isArray(cb.filters) && cb.filters.length === 0))
        return true

    return Array.isArray(cb.filters)
        ? cb.filters.every(f => f(node))
        : cb.filters(node)
}

function filterByNodeType<T extends BaseCallback>(cb: T, node: WalkNode) {
    if (!cb.nodeTypeFilters || (Array.isArray(cb.nodeTypeFilters) && cb.nodeTypeFilters.length === 0))
        return true

    return Array.isArray(cb.nodeTypeFilters)
        ? cb.nodeTypeFilters.indexOf(node.nodeType) !== -1
        : cb.nodeTypeFilters === node.nodeType;
}

function filterByKey<T extends BaseCallback>(cb: T, node: WalkNode) {
    if (typeof cb.keyFilters === 'undefined' || (Array.isArray(cb.keyFilters) && cb.keyFilters.length === 0))
        return true;

    if (typeof node.keyInParent !== 'string')
        return false;

    return Array.isArray(cb.keyFilters)
        ? cb.keyFilters.indexOf(node.keyInParent) !== -1
        : cb.keyFilters === node.keyInParent;
}

export function matchCallbacks<T extends BaseCallback>(node: WalkNode, position: PositionType, ctx: Context<T>): T[] {

    if (!ctx.config.runCallbacks)
        return []

    if (node.isRoot && !ctx.config.rootObjectCallbacks)
        return [];

    let callbacks = ctx.callbacksByPosition[position];

    return (callbacks || [])
        .map(cb => cb as T)
        .filter(cb => filterByFilters(cb, node))
        .filter(cb => filterByNodeType(cb, node))
        .filter(cb => filterByKey(cb, node))
}

export function execCallbacks(callbacks: Callback[], node: WalkNode): void {
    callbacks.forEach(cb => {
        cb.callback(node)
        node.executedCallbacks.push(cb);
    })
}

type AsyncExecutor = (callbacks: AsyncCallback[], node: WalkNode) => Promise<void>;

export async function execCallbacksAsync(callbacks: AsyncCallback[], node: WalkNode): Promise<void> {
    for (let cb of callbacks) {
        await cb.callback(node)
        node.executedCallbacks.push(cb);
    }
}

export const execCallbacksAsyncInParallel = async (callbacks: AsyncCallback[], node: WalkNode): Promise<void> =>
{
    await Promise.all(
        callbacks.map(cb =>
            Promise.resolve(cb.callback(node))
                .then(() => {
                    node.executedCallbacks.push(cb)
                })
        )
    );
}

export function getAsyncExecutor<T>(config: Config<T>): AsyncExecutor {
    return config.parallelizeAsyncCallbacks
        ? execCallbacksAsyncInParallel
        : execCallbacksAsync;
}

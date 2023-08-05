import {_Callback, CallbackFn, Context, IOrderable, PartialConfig} from "./types";

function executionOrderSort<T extends IOrderable>(a: T, b: T) {
    const _a = a.executionOrder || 0;
    const _b = b.executionOrder || 0;
    return _a - _b;
}

function buildDefaultContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    return {
        seenObjects: new Set<any>(),
        callbacksByPosition: {
            "preWalk": [],
            "postWalk": []
        },
        config: {
            traversalMode: typeof config.traversalMode !== 'undefined' ? config.traversalMode : 'depth',
            graphMode: typeof config.graphMode !== 'undefined' ? config.graphMode : 'finiteTree',
            parallelizeAsyncCallbacks: typeof config.parallelizeAsyncCallbacks !== 'undefined' ? config.parallelizeAsyncCallbacks : false,
            callbacks: typeof config.callbacks !== 'undefined' ? config.callbacks
                .filter(cb => typeof cb.callback !== 'undefined')
                .map(cb =>
                ({
                    callback: cb.callback!,
                    executionOrder: typeof cb.executionOrder === 'undefined' ? 0 : cb.executionOrder,
                    filters: typeof cb.filters === 'undefined' ? [] : (Array.isArray(cb.filters) ? cb.filters : [cb.filters]),
                    positionFilter: typeof cb.positionFilter === 'undefined' ? 'preWalk' : cb.positionFilter
                })) : []
        },
    }
}

export function _buildContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    const ctx = buildDefaultContext<T>(config)
    ctx.config.callbacks.forEach((cb: _Callback<T>) => {
        if (cb.positionFilter === "both") {
            ctx.callbacksByPosition["preWalk"].push(cb)
            ctx.callbacksByPosition["postWalk"].push(cb)
        } else
            ctx.callbacksByPosition[cb.positionFilter].push(cb)

    })

    for (const key in ctx.callbacksByPosition)
        ctx.callbacksByPosition[key] = ctx.callbacksByPosition[key].sort(executionOrderSort);

    return ctx;
}

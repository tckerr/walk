import {
    Callback,
    _Callback,
    CallbackFn,
    Config,
    Context,
    PartialConfig,
    IOrderable
} from "./types";

function executionOrderSort<T extends IOrderable>(a: T, b: T) {
    const _a = a.executionOrder || 0;
    const _b = b.executionOrder || 0;
    return _a < _b ? -1 : _a > _b ? 1 : 0;
}

function buildDefaultCallbacks<T extends CallbackFn>(sources: Callback<T>[]): _Callback<T>[] {
    return sources.map(cb => {
        return {
            callback: cb.callback,
            keyFilters: typeof cb.keyFilters === 'undefined' ? [] : (Array.isArray(cb.keyFilters) ? cb.keyFilters : [cb.keyFilters]),
            nodeTypeFilters: typeof cb.nodeTypeFilters === 'undefined' ? [] : (Array.isArray(cb.nodeTypeFilters) ? cb.nodeTypeFilters : [cb.nodeTypeFilters]),
            executionOrder: typeof cb.executionOrder === 'undefined' ? 0 : cb.executionOrder,
            filters: typeof cb.filters === 'undefined' ? [] : (Array.isArray(cb.filters) ? cb.filters : [cb.filters]),
            positionFilter: typeof cb.positionFilter === 'undefined' ? 'preWalk' : cb.positionFilter
        }
    })
}

function buildDefaultConfig<T extends CallbackFn>(config: PartialConfig<T>): Config<T> {
    return {
        traversalMode: typeof config.traversalMode !== 'undefined' ? config.traversalMode : 'depth',
        rootObjectCallbacks: typeof config.rootObjectCallbacks !== 'undefined' ? config.rootObjectCallbacks : true,
        runCallbacks: typeof config.runCallbacks !== 'undefined' ? config.runCallbacks : true,
        graphMode: typeof config.graphMode !== 'undefined' ? config.graphMode : 'finiteTree',
        parallelizeAsyncCallbacks: typeof config.parallelizeAsyncCallbacks !== 'undefined' ? config.parallelizeAsyncCallbacks : false,
        callbacks: typeof config.callbacks !== 'undefined' ? buildDefaultCallbacks(config.callbacks) : []
    }
}

function buildDefaultContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    return {
        config: buildDefaultConfig<T>(config),
        seenObjects: new Set<any>(),
        callbacksByPosition: {
            "preWalk": [],
            "postWalk": []
        },
    }
}

export function _buildContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    const ctx = buildDefaultContext<T>(config)
    ctx.config.callbacks.forEach((callback: _Callback<T>) => {
        if (callback.positionFilter === "both") {
            ctx.callbacksByPosition["preWalk"].push(callback)
            ctx.callbacksByPosition["postWalk"].push(callback)
        } else {
            ctx.callbacksByPosition[callback.positionFilter].push(callback)
        }
    })

    for (const key in ctx.callbacksByPosition)
        ctx.callbacksByPosition[key] = ctx.callbacksByPosition[key].sort(executionOrderSort);

    return ctx;
}

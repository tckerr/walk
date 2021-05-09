import {
    Callback,
    _Callback,
    CallbackFn,
    Config,
    Context, NodeFilterFn,
    NodePathSegmentFormatter,
    NodeType,
    PartialConfig, PositionType
} from "./types";
import {executionOrderSort} from "./helpers";

export const defaultPathFormatter: NodePathSegmentFormatter = ({
                                                                   key,
                                                                   isArrayMember
                                                               }) => isArrayMember ? `[${key}]` : `["${key}"]`;


function buildDefaultCallbacks<T extends CallbackFn>(sources: Callback<T>[]): _Callback<T>[] {
    return sources.map(source => {
        let keyFilters: string[] = [];
        let nodeTypeFilters: NodeType[] = []
        let executionOrder = 0;
        let filters: NodeFilterFn[] = []
        let positionFilter: PositionType = 'preWalk';

        if (typeof source.keyFilters !== 'undefined') {
            if (Array.isArray(source.keyFilters))
                keyFilters = source.keyFilters
            else
                keyFilters = [source.keyFilters]
        }
        if (typeof source.nodeTypeFilters !== 'undefined') {
            if (Array.isArray(source.nodeTypeFilters))
                nodeTypeFilters = source.nodeTypeFilters
            else
                nodeTypeFilters = [source.nodeTypeFilters]
        }
        if (typeof source.filters !== 'undefined') {
            if (Array.isArray(source.filters))
                filters = source.filters
            else
                filters = [source.filters]
        }
        if (typeof source.executionOrder !== 'undefined')
            executionOrder = source.executionOrder
        if (typeof source.positionFilter !== 'undefined')
            positionFilter = source.positionFilter

        return {
            callback: source.callback,
            keyFilters,
            nodeTypeFilters,
            executionOrder,
            filters,
            positionFilter
        }
    })
}

export function buildDefaultConfig<T extends CallbackFn>(config: PartialConfig<T>): Config<T> {
    return {
        traversalMode: typeof config.traversalMode !== 'undefined' ? config.traversalMode : 'depth',
        rootObjectCallbacks: typeof config.rootObjectCallbacks !== 'undefined' ? config.rootObjectCallbacks : true,
        runCallbacks: typeof config.runCallbacks !== 'undefined' ? config.runCallbacks : true,
        graphMode: typeof config.graphMode !== 'undefined' ? config.graphMode : 'finiteTree',
        parallelizeAsyncCallbacks: typeof config.parallelizeAsyncCallbacks !== 'undefined' ? config.parallelizeAsyncCallbacks : false,
        callbacks: typeof config.callbacks !== 'undefined' ? buildDefaultCallbacks(config.callbacks) : []
    }
}

export function buildDefaultContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    return {
        config: buildDefaultConfig<T>(config),
        seenObjects: new Set<any>(),
        callbacksByPosition: {
            "preWalk": [],
            "postWalk": []
        },
    }
}

export function buildContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
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

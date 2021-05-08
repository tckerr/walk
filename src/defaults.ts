import {Callback, CallbackFn, Config, Context, NodePathFormatter, PartialConfig} from "./types";
import {executionOrderSort} from "./helpers";

export const defaultPathFormatter: NodePathFormatter = (key: string, isArr: boolean) => isArr ? `[${key}]` : `["${key}"]`;

export function buildDefaultConfig<T extends CallbackFn>() : Config<T> {
    return {
        traversalMode: 'depth',
        rootObjectCallbacks: true,
        runCallbacks: true,
        graphMode: 'finiteTree',
        parallelizeAsyncCallbacks: false,
        callbacks: []
    }
}

export function buildDefaultContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    return {
        config: {
            ...buildDefaultConfig<T>(),
            ...config,
        },
        seenObjects: new Set<any>(),
        callbacksByPosition: {
            "preWalk": [],
            "postWalk": []
        },
    }
}

export function buildContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    const ctx = buildDefaultContext<T>(config)
    ctx.config.callbacks.forEach((cb: Callback<T>) => {
        const callback: Callback<T> = {
            ...cb,
            executionOrder: typeof cb.executionOrder == 'undefined' ? 0 : cb.executionOrder,
            positionFilter: cb.positionFilter || "preWalk"
        }

        if (callback.positionFilter === "both") {
            ctx.callbacksByPosition["preWalk"].push(callback)
            ctx.callbacksByPosition["postWalk"].push(callback)
        } else if (typeof callback.positionFilter !== 'undefined') {
            ctx.callbacksByPosition[callback.positionFilter!].push(callback)
        }
    })

    for (const key in ctx.callbacksByPosition)
        ctx.callbacksByPosition[key] = ctx.callbacksByPosition[key].sort(executionOrderSort);

    return ctx;
}

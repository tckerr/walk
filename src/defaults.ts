import {Callback, asMany, CallbackFn, Context, PartialConfig} from "./types";

function executionOrderSort<T extends {executionOrder?: number}>(a: T, b: T) {
    const _a = a.executionOrder || 0;
    const _b = b.executionOrder || 0;
    return _a - _b;
}

function buildDefaultContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    const seenObjects = new Set<any>();
    return {
        seenObjects,
        callbacksByPosition: {
            preVisit: [],
            postVisit: []
        },
        config: {
            trackExecutedCallbacks: true,
            visitationRegister: config.visitationRegister ?? {
                objectHasBeenSeen: n => seenObjects.has(n.val),
                registerObjectVisit: n => seenObjects.add(n.val)
            },
            traversalMode: config.traversalMode ?? 'depth',
            graphMode: config.graphMode ?? 'finiteTree',
            parallelizeAsyncCallbacks: config.parallelizeAsyncCallbacks ?? false,
            onVisit: asMany(config.onVisit ?? [])
                ?.filter(cb => !!cb.callback)
                .map(cb =>
                ({
                    callback: cb.callback!,
                    executionOrder: cb.executionOrder ?? 0,
                    filters: typeof cb.filters === 'undefined' ? [] : asMany(cb.filters),
                    timing: cb.timing ?? 'preVisit'
                })) ?? []
        },
    }
}

export function _buildContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    const ctx = buildDefaultContext<T>(config)
    asMany(ctx.config.onVisit).forEach((cb: Callback<T>) => {
        if (cb.timing === "both") {
            ctx.callbacksByPosition.preVisit.push(cb)
            ctx.callbacksByPosition.postVisit.push(cb)
        } else
            ctx.callbacksByPosition[cb.timing].push(cb)
    })

    for (const key in ctx.callbacksByPosition)
        ctx.callbacksByPosition[key] = ctx.callbacksByPosition[key].sort(executionOrderSort);

    return ctx;
}

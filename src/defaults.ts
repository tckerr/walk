import {Callback, asMany, CallbackFn, Context, PartialConfig, NodeVisitationRegister} from "./types";
import {WalkNode} from "./node";

function executionOrderSort<T extends {executionOrder?: number}>(a: T, b: T) {
    const _a = a.executionOrder || 0;
    const _b = b.executionOrder || 0;
    return _a - _b;
}

export class SetVisitationRegister implements NodeVisitationRegister{
    public readonly seenObjects: Set<any> = new Set<any>();

    public objectHasBeenSeen(node: WalkNode): boolean {
        return this.seenObjects.has(node.val);
    }

    public registerObjectVisit(node: WalkNode): void {
        this.seenObjects.add(node.val);
    }
}

function buildDefaultContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    return {
        callbacksByPosition: {
            preVisit: [],
            postVisit: []
        },
        config: {
            trackExecutedCallbacks: true,
            visitationRegister: config.visitationRegister || new SetVisitationRegister(),
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

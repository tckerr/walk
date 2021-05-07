import {AsyncCallbackFn, Callback, CallbackFn, Context, PartialConfig} from "./types";
import {buildDefaultContext} from "./defaults";
import {executionOrderSort} from "./helpers";
import {Break, forceEvalAsyncGenerator, forceEvalGenerator} from "./utils";
import {WalkNode} from "./node";
import {execCallbacks, getAsyncExecutor, matchCallbacks} from "./callback";


function shouldSkipVisitation(node: WalkNode, ctx: Context<any>): boolean {
    if (node.nodeType === 'value')
        return false;

    if (!ctx.seenObjects.has(node.val))
        ctx.seenObjects.add(node.val)
    else if (ctx.config.graphMode === 'graph')
        return true
    else if (ctx.config.graphMode === 'finiteTree')
        throw "The object violates the defined structure. Override 'graphMode' in the config to allow parsing different object structures.";

    return false;
}

function* processNode(node: WalkNode, ctx: Context<CallbackFn>, processChildren: boolean): Generator<WalkNode> {
    if (shouldSkipVisitation(node, ctx))
        return

    execCallbacks(matchCallbacks<CallbackFn>(node, 'preWalk', ctx), node);

    yield node;

    if (processChildren)
        for (let child of node.getChildren())
            yield* processNode(child, ctx, true)

    execCallbacks(matchCallbacks<CallbackFn>(node, 'postWalk', ctx), node);
}

async function* processAsync(node: WalkNode, ctx: Context<AsyncCallbackFn>, processChildren: boolean): AsyncGenerator<WalkNode> {
    if (shouldSkipVisitation(node, ctx))
        return

    const executor = getAsyncExecutor(ctx.config);
    await executor(matchCallbacks<AsyncCallbackFn>(node, 'preWalk', ctx), node);

    yield node;

    if (processChildren)
        for (let child of node.getChildren())
            yield* await processAsync(child, ctx, true)

    await executor(matchCallbacks<AsyncCallbackFn>(node, 'postWalk', ctx), node);
}

function buildContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    const ctx: Context<T> = buildDefaultContext<T>(config)
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

export function* walkStep(obj: object, config: PartialConfig<CallbackFn>): Generator<WalkNode> {
    const context = buildContext(config);
    const rootNode = WalkNode.fromRoot(obj)

    try {
        if (context.config.traversalMode === 'depth')
            yield* processNode(rootNode, context, true)
        else {
            let queue: WalkNode[] = [rootNode];
            do {
                const next = queue.shift()!;
                yield* processNode(next, context, false);
                queue.push(...next.children)
            }
            while (queue.length > 0)
        }
    } catch (err) {
        if (!(err instanceof Break))
            throw err;
    }
}

export async function* walkAsyncStep(obj: object, config: PartialConfig<AsyncCallbackFn>): AsyncGenerator<WalkNode> {
    const context = buildContext(config);
    const rootNode = WalkNode.fromRoot(obj)

    try {
        if (context.config.traversalMode === 'depth') {
            yield* await processAsync(rootNode, context, true);
        } else {
            let queue: WalkNode[] = [rootNode];
            do {
                const next = queue.shift()!;
                yield* await processAsync(next, context, false);
                queue.push(...next.children)
            }
            while (queue.length > 0)
        }
    } catch (err) {
        if (!(err instanceof Break))
            throw err;
    }
}

export const walk = (obj: object, config: PartialConfig<CallbackFn>): void => {
    forceEvalGenerator(walkStep(obj, config))
}

export const walkAsync = async (obj: object, config: PartialConfig<AsyncCallbackFn>): Promise<void> => {
    await forceEvalAsyncGenerator(walkAsyncStep(obj, config))
}

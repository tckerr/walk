import {AsyncCallbackFn, Callback, CallbackFn, Context, PartialConfig} from "./types";
import {buildDefaultContext} from "./defaults";
import {CallbackStacker, executionOrderSort} from "./helpers";
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

function buildContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
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


export function* walkStep(obj: object, config: PartialConfig<CallbackFn>): Generator<WalkNode> {
    const ctx = buildContext(config);
    const depth = ctx.config.traversalMode === 'depth';
    const queue: WalkNode[] = [WalkNode.fromRoot(obj)];
    const pusher = depth
        ? (nodes: WalkNode[]) => queue.unshift(...nodes)
        : (nodes: WalkNode[]) => queue.push(...nodes)

    const stacker = new CallbackStacker<CallbackFn, void>(execCallbacks)

    try {
        do {
            const node = queue.shift()!
            if (shouldSkipVisitation(node, ctx))
                continue

            const children = node.children;
            pusher(children)

            const beforeCbs = matchCallbacks<CallbackFn>(node, 'preWalk', ctx);
            stacker.executeOne(node, beforeCbs);

            yield node;

            const afterCbs = matchCallbacks<CallbackFn>(node, 'postWalk', ctx);

            if(depth && children.length){
                const lastChild = children[children.length - 1];
                stacker.push(lastChild.id, node, afterCbs)
            } else {
                stacker.executeOne(node, afterCbs);
                forceEvalGenerator(stacker.execute(node.id))
            }

        } while (queue.length > 0)
    } catch (err) {
        if (!(err instanceof Break))
            throw err;
    }
}

export async function* walkAsyncStep(obj: object, config: PartialConfig<AsyncCallbackFn>): AsyncGenerator<WalkNode> {
    const ctx = buildContext(config);
    const depth = ctx.config.traversalMode === 'depth';
    const queue: WalkNode[] = [WalkNode.fromRoot(obj)];
    const pusher = depth
        ? (nodes: WalkNode[]) => queue.unshift(...nodes)
        : (nodes: WalkNode[]) => queue.push(...nodes)
    const executor = getAsyncExecutor(ctx.config);
    const stacker = new CallbackStacker<AsyncCallbackFn, Promise<void> | void>(executor)

    try {
        do {
            const node = queue.shift()!
            if (shouldSkipVisitation(node, ctx))
                continue

            const children = node.children;
            pusher(children)

            const beforeCbs = matchCallbacks<AsyncCallbackFn>(node, 'preWalk', ctx);
            await stacker.executeOne(node, beforeCbs);

            yield node;

            const afterCbs = matchCallbacks<AsyncCallbackFn>(node, 'postWalk', ctx);

            if(depth && children.length){
                const lastChild = children[children.length - 1];
                stacker.push(lastChild.id, node, afterCbs)
            } else {
                await stacker.executeOne(node, afterCbs)
                for (const promise of stacker.execute(node.id))
                    await promise
            }

        } while (queue.length > 0)
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

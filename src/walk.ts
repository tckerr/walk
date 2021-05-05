import {AsyncCallback, BaseCallback, Callback, Context, PartialConfig, PositionType} from "./types";
import {buildDefaultContext, defaultCallbackPosition} from "./defaults";
import {executionOrderSort} from "./helpers";
import {Break} from "./utils";
import {WalkNode} from "./node";

function matchCallbacks<T extends BaseCallback>(node: WalkNode, position: PositionType, ctx: Context<T>): T[] {

    if (!ctx.config.runCallbacks)
        return []

    if (node.isRoot && !ctx.config.rootObjectCallbacks)
        return [];

    const callbacks = ctx.callbacksByPosition[position];
    if (typeof callbacks == 'undefined') {
        return [];
    }

    return callbacks
        .map(cb => cb as T)
        .filter(cb => (cb.nodeTypeFilters?.indexOf(node.nodeType!) ?? 1) !== -1)
        .filter(cb =>
            typeof cb.keyFilters === 'undefined'
            || (typeof node.keyInParent !== 'number' && cb.keyFilters.indexOf(node.keyInParent!) !== -1))
}

function validateVisitation<T>(node: WalkNode, ctx: Context<T>): boolean {
    const seen = ctx.seenObjects.indexOf(node.val) !== -1;
    if (seen && ctx.config.graphMode === 'graph')
        return false;

    if (seen && ctx.config.graphMode === 'finiteTree')
        throw "The object violates the defined structure. Override 'graphMode' in the config to allow parsing different object structures.";

    ctx.seenObjects.push(node.val)
    return true;
}

function execCallbacks(callbacks: Callback[], node: WalkNode): void {
    callbacks.forEach(cb => {
        cb.callback(node)
        node.executedCallbacks.push(cb);
    })
}

async function execCallbacksAsync(callbacks: AsyncCallback[], node: WalkNode): Promise<void> {
    for (let i = 0; i < callbacks.length; i++) {
        const cb = callbacks[i];
        await cb.callback(node)
        node.executedCallbacks.push(cb);
    }
}


async function execCallbacksAsyncInParallel(callbacks: AsyncCallback[], node: WalkNode): Promise<void> {
    const promises: Promise<any>[] = []
    for (let i = 0; i < callbacks.length; i++) {
        const cb = callbacks[i];
        const promise = Promise
            .resolve(cb.callback(node))
            .then(() => node.executedCallbacks.push(cb));
        promises.push(promise)
    }
    await Promise.all(promises);
}

function process(node: WalkNode, mode: 'breadth' | 'depth', ctx: Context<Callback>): WalkNode[] {

    if ((node.nodeType !== 'value') && !validateVisitation(node, ctx))
        return []

    execCallbacks(matchCallbacks<Callback>(node, 'preWalk', ctx), node);

    const queue: WalkNode[] = []
    const traverse = mode === 'breadth'
        ? (child: WalkNode) => queue.push(child)
        : (child: WalkNode) => process(child, 'depth', ctx)

    node.children.forEach(traverse)

    execCallbacks(matchCallbacks<Callback>(node, 'postWalk', ctx), node);

    return queue;
}

async function processAsync(node: WalkNode, mode: 'breadth' | 'depth', ctx: Context<AsyncCallback>): Promise<WalkNode[]> {

    if ((node.nodeType !== 'value') && !validateVisitation(node, ctx))
        return []

    const asyncExecutor = ctx.config.parallelizeAsyncCallbacks
        ? execCallbacksAsyncInParallel
        : execCallbacksAsync;

    await asyncExecutor(matchCallbacks<AsyncCallback>(node, 'preWalk', ctx), node);

    const queue: WalkNode[] = []
    const traverse = mode === 'breadth'
        ? async (child: WalkNode) => Promise.resolve(queue.push(child))
        : async (child: WalkNode) => await processAsync(child, 'depth', ctx)

    const children = node.children;
    for (let i = 0; i < children.length; i++)
        await traverse(children[i])

    await asyncExecutor(matchCallbacks<AsyncCallback>(node, 'postWalk', ctx), node);

    return queue;
}

function buildContext<T extends BaseCallback>(config: PartialConfig<T>): Context<T> {
    const ctx: Context<T> = buildDefaultContext<T>(config)
    ctx.config.callbacks.forEach(cb => {
        const callback: T = {
            ...cb,
            executionOrder: typeof cb.executionOrder == 'undefined' ? 0 : cb.executionOrder,
            positionFilters: typeof cb.positionFilters == 'undefined' || cb.positionFilters.length < 1 ? [defaultCallbackPosition] :
                cb.positionFilters

        }
        callback.positionFilters!.forEach(position => {
            if (!(position in ctx.callbacksByPosition))
                ctx.callbacksByPosition[position] = []
            ctx.callbacksByPosition[position].push(callback);
        })
    })

    for (const key in ctx.callbacksByPosition) {
        ctx.callbacksByPosition[key] = ctx.callbacksByPosition[key].sort(executionOrderSort);
    }

    return ctx;
}

export const walkAsync = async (obj: object, config: PartialConfig<AsyncCallback>): Promise<Context<AsyncCallback>> => {
    const context = buildContext(config);
    const rootNode = WalkNode.fromRoot(obj)

    try {
        if(context.config.traversalMode === 'depth'){
            await processAsync(rootNode, 'depth', context);
        } else {
            let queue: WalkNode[] = [rootNode];
            do queue = queue.concat(await processAsync(queue.shift()!, 'breadth', context));
            while (queue.length > 0)
        }
    } catch (err) {
        if (!(err instanceof Break))
            throw err;
    }

    return context;
}

export const walk = (obj: object, config: PartialConfig<Callback>): Context<Callback> => {
    const context = buildContext(config);
    const rootNode = WalkNode.fromRoot(obj)

    try {
        if(context.config.traversalMode === 'depth'){
            process(rootNode, 'depth', context);
        } else {
            let queue: WalkNode[] = [rootNode];
            do queue = queue.concat(process(queue.shift()!, 'breadth', context));
            while (queue.length > 0)
        }
    } catch (err) {
        if (!(err instanceof Break))
            throw err;
    }

    return context;
}

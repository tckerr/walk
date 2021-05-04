import {Callback, Context, PartialConfig, PositionType} from "./types";
import {buildDefaultContext, defaultCallbackPosition} from "./defaults";
import {executionOrderSort} from "./helpers";
import {Break} from "./utils";
import {WalkNode} from "./node";

function matchCallbacks(node: WalkNode, position: PositionType, ctx: Context) {

    if (!ctx.config.runCallbacks)
        return []

    if (node.isRoot && !ctx.config.rootObjectCallbacks)
        return [];

    const callbacks = ctx.callbacksByPosition[position];
    if (typeof callbacks == 'undefined') {
        return [];
    }

    return callbacks
        .filter(cb => (cb.nodeTypeFilters?.indexOf(node.nodeType!) ?? 1) !== -1)
        .filter(cb =>
            typeof cb.keyFilters === 'undefined'
            || (typeof node.keyInParent !== 'number' && cb.keyFilters.indexOf(node.keyInParent!) !== -1))
}

function validateVisitation(node: WalkNode, ctx: Context): boolean {
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

function process(node: WalkNode, mode: 'breadth' | 'depth', ctx: Context): WalkNode[] {

    if ((node.nodeType !== 'value') && !validateVisitation(node, ctx))
        return []

    execCallbacks(matchCallbacks(node, 'preWalk', ctx), node);

    const queue: WalkNode[] = []
    const traverse = mode === 'breadth'
        ? (child: WalkNode) => queue.push(child)
        : (child: WalkNode) => process(child, 'depth', ctx)

    node.children(ctx).forEach(traverse)

    execCallbacks(matchCallbacks(node, 'postWalk', ctx), node);

    return queue;
}

function depthTraverse(root: WalkNode, ctx: Context) {
    process(root, 'depth', ctx);
}

function breadthTraverse(root: WalkNode, ctx: Context) {
    let queue: WalkNode[] = [root];
    do queue = queue.concat(process(queue.shift()!, 'breadth', ctx));
    while (queue.length > 0)
}

function buildContext(config: PartialConfig): Context {
    const ctx: Context = buildDefaultContext(config)
    ctx.config.callbacks.forEach(cb => {
        const callback: Callback = {
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

const walk = (obj: object, config: PartialConfig): Context => {
    const context = buildContext(config);
    const rootNode = WalkNode.fromRoot(obj)

    const fn = context.config.traversalMode === 'depth'
        ? depthTraverse
        : breadthTraverse

    try {
        fn(rootNode, context)
    } catch (err) {
        if (!(err instanceof Break))
            throw err;
    }

    return context;
}

export default walk;

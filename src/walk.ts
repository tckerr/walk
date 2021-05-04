import {Callback, NodeType, Context, PartialConfig, PositionType, WalkNode} from "./types";
import {buildDefaultContext, defaultCallbackPosition} from "./defaults";
import {executionOrderSort} from "./helpers";
import {Break} from "./utils";

function matchCallbacks(node: WalkNode, position: PositionType, ctx: Context) {

    const runCallbacks = ctx.config.runCallbacks;
    let matched: any[] = [];
    if (runCallbacks) {
        if (node.isRoot && !ctx.config.rootObjectCallbacks) {
            return matched;
        }
        const callbacks = ctx.callbacksByPosition[position];
        if (typeof callbacks == 'undefined') {
            return [];
        }
        for (let i = 0; i < callbacks.length; ++i) {
            const callback = callbacks[i];

            // exit if nodeTypeFilters are defined and not in list
            if (typeof callback.nodeTypeFilters !== 'undefined' && callback.nodeTypeFilters.indexOf(node.nodeType!) === -1) {
                continue;
            }

            // exit if keyFilters are defined and not in list
            if (typeof callback.keyFilters !== 'undefined'
                && (typeof node.keyInParent === 'number' || callback.keyFilters.indexOf(node.keyInParent!) === -1)) {
                continue;
            }

            matched.push(callback);
        }
    }
    return matched;
}

function validateVisitation(val: any, ctx: Context): boolean {
    const mode = ctx.config.graphMode;
    let parseObject = true;
    if (ctx.seenObjects.indexOf(val) !== -1) {
        if (mode === 'finiteTree') {
            throw "The object violates the defined structure. Override 'graphMode' in the config to allow parsing different object structures.";
        } else if (mode === 'graph') {
            parseObject = false;
        } // otherwise, infinites are allowed
    } else {
        ctx.seenObjects.push(val);
    }
    return parseObject;
}

function execCallbacks(callbacks: Callback[], node: WalkNode, ctx: Context): void {
    for (let i = 0; i < callbacks.length; ++i) {
        if (ctx.config.monitorPerformance) {
            const cbStackStart = new Date();
            callbacks[i].callback(node);
            node.executedCallbacks.push(callbacks[i]);
            // @ts-ignore
            ctx.report.callbackProcessingTime += (new Date() - cbStackStart);
        } else {
            callbacks[i].callback(node);
            node.executedCallbacks.push(callbacks[i]);
        }
    }
}

function getNormalizedType(val: any): NodeType {
    if (Array.isArray(val))
        return 'array'
    else if (typeof val === 'object')
        return 'object'
    return 'value'
}

function process(node: WalkNode, mode: 'breadth' | 'depth', ctx: Context, queue?: any[]) {

    let {val, path, nodeType} = node;

    const isNotValue = nodeType === 'object' || nodeType === 'array';
    if (isNotValue && !validateVisitation(val, ctx))
        return

    const matchedPreCallbacks = matchCallbacks(node, 'preWalk', ctx);
    execCallbacks(matchedPreCallbacks, node, ctx);

    // add children to queue
    if (nodeType === 'array') {
        for (let i = 0; i < val.length; ++i) {
            const childData: WalkNode = {
                isArrayMember: true,
                keyInParent: i,
                rawType: typeof val[i],
                val: val[i],
                isRoot: false,
                path: path + ctx.config.pathFormat(i.toString(), true),
                parent: node,
                executedCallbacks: [],
                nodeType: getNormalizedType(val[i])
            };
            if (mode === 'breadth') {
                queue!.push(childData);
            } else if (mode === 'depth') {
                process(childData, 'depth', ctx);
            }
        }
    } else if (nodeType === 'object') {
        for (const subKey in val) {
            if (val.hasOwnProperty(subKey)) {
                const childData: WalkNode = {
                    isArrayMember: false,
                    keyInParent: subKey,
                    val: val[subKey],
                    rawType: typeof val[subKey],
                    isRoot: false,
                    path: path + ctx.config.pathFormat(subKey, false),
                    parent: node,
                    executedCallbacks: [],
                    nodeType: getNormalizedType(val[subKey]),
                };
                if (mode === 'breadth') {
                    queue!.push(childData);
                } else if (mode === 'depth') {
                    process(childData, 'depth', ctx);
                }
            }
        }
    }
    // match and run post-traverse callbacks
    const matchedPostCallbacks = matchCallbacks(node, 'postWalk', ctx);
    execCallbacks(matchedPostCallbacks, node, ctx);
}

function __depthTraverse(inputData: any, ctx: Context) {
    process(inputData, 'depth', ctx, undefined);
}

function __breadthTraverse(inputData: any, ctx: Context) {
    const queue: any = [];
    process(inputData, 'breadth', ctx, queue);
    while (queue.length > 0)
        process(queue.shift(), 'breadth', ctx, queue);
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
    const rootNode: WalkNode = ({
        keyInParent: undefined,
        val: obj,
        rawType: typeof obj,
        isArrayMember: false,
        isRoot: true,
        path: '',
        nodeType: 'object',
        parent: undefined,
        executedCallbacks: []
    })

    const fn = context.config.traversalMode === 'depth'
        ? __depthTraverse
        : __breadthTraverse

    try {
        fn(rootNode, context)
    } catch (err) {
        if (!(err instanceof Break)) throw err;
    }
    return context;
}
export default walk;

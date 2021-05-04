import {Callback, Config, ContainerType, Context, PositionType, WalkNode} from "./types";
import {buildDefaultContext, defaultCallbackPosition} from "./defaults";
import {prioritySort} from "./utils";

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

            // exit if containerFilters are defined and not in list
            if (typeof callback.containerFilters !== 'undefined' && callback.containerFilters.indexOf(node.container!) === -1) {
                continue;
            }

            // exit if keyFilters are defined and not in list
            if (typeof callback.keyFilters !== 'undefined' && callback.keyFilters.indexOf(node.keyInParent!) === -1) {
                continue;
            }

            matched.push(callback);
        }
    }
    return matched;
}

function validateVisitation(val: any, ctx: Context): boolean {
    const mode = ctx.config.dataStructure;
    let parseObject = true;
    if (ctx.seenObjects.indexOf(val) !== -1) {
        if (mode === 'finiteTree') {
            throw "The object violates the defined structure. Override 'dataStructure' in the config to allow parsing different object structures.";
        } else if (mode === 'graph') {
            parseObject = false;
        } // otherwise, infinites are allowed
    } else {
        ctx.seenObjects.push(val);
    }
    return parseObject;
}

function execCallbacks(callbacks: Callback[], node: WalkNode, ctx: Context): void {
    for (let p = 0; p < callbacks.length; ++p) {
        callbacks[p].hasRun = false; // only in case users want this, not used internally
    }
    for (let i = 0; i < callbacks.length; ++i) {
        if (ctx.config.monitorPerformance) {
            const cbStackStart = new Date();
            callbacks[i].callback(node);
            // @ts-ignore
            ctx.report.callbackProcessingTime += (new Date() - cbStackStart);
        } else {
            callbacks[i].callback(node);
        }
        callbacks[i].hasRun = true;
        node.executedCallbacks.push(callbacks[i]);
    }
    for (let k = 0; k < callbacks.length; ++k) {
        delete callbacks[k].hasRun;
    }
}

function getContainerType(val: any): ContainerType {
    if (Array.isArray(val))
        return 'array'
    else if (typeof val === 'object')
        return 'object'
    return 'value'
}

function process(node: WalkNode, mode: 'breadth' | 'depth', ctx: Context, queue?: any[]) {

    let {val, path, container} = node;

    const isNotValue = container === 'object' || container === 'array';
    if (isNotValue && !validateVisitation(val, ctx))
        return

    const matchedPreCallbacks = matchCallbacks(node, 'preWalk', ctx);
    execCallbacks(matchedPreCallbacks, node, ctx);

    // add children to queue
    if (container === 'array') {
        for (let i = 0; i < val.length; ++i) {
            const childData: WalkNode = {
                meta: {children: [], parents: []},
                keyInParent: undefined,
                type: typeof val[i],
                val: val[i],
                isRoot: false,
                path: path + ctx.config.pathFormat(i.toString(), true),
                parent: node,
                executedCallbacks: [],
                container: getContainerType(val[i])
            };
            if (mode === 'breadth') {
                queue!.push(childData);
            } else if (mode === 'depth') {
                process(childData, 'depth', ctx);
            }
        }
    } else if (container === 'object') {
        for (const subKey in val) {
            if (val.hasOwnProperty(subKey)) {
                console.log(subKey);
                const childData: WalkNode = {
                    meta: {children: [], parents: []},
                    keyInParent: subKey,
                    val: val[subKey],
                    type: typeof val[subKey],
                    isRoot: false,
                    path: path + ctx.config.pathFormat(subKey, false),
                    parent: node,
                    executedCallbacks: [],
                    container: getContainerType(val[subKey]),
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

function buildContext(config: Config): Context {
    const ctx: Context = buildDefaultContext(config)
    ctx.config.callbacks.forEach(cb => {
        const callback: Callback = {
            ...cb,
            priority: typeof cb.priority == 'undefined' ? 0 : cb.priority,
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
        ctx.callbacksByPosition[key] = ctx.callbacksByPosition[key].sort(prioritySort);
    }

    return ctx;
}

const walk = (obj: object, config: Config): Context => {
    const context = buildContext(config);
    const rootNode: WalkNode = ({
        meta: {children: [], parents: []},
        keyInParent: undefined,
        val: obj,
        type: typeof obj,
        isRoot: true,
        path: '',
        container: 'object',
        parent: undefined,
        executedCallbacks: []
    })

    const fn = context.config.traversalMode === 'depth'
        ? __depthTraverse
        : __breadthTraverse

    try {
        fn(rootNode, context)
    } catch (err) {
        if (err !== "walk:stopProcess") {
            if (typeof console.error !== 'undefined') {
                console.error("Error during walk(): " + err);

            } else {
                console.log("Error during walk(): " + err);
            }
            throw err;
        }
    }
    return context;
}

export default walk;

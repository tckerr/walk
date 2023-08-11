import {Callback, asMany, AsyncCallbackFn, CallbackFn, Context, CallbackTiming} from "./types";
import {WalkNode} from "./node";

function filterByFilters<T extends CallbackFn>(cb: Callback<T>, node: WalkNode) {
    return asMany(cb.filters).every(f => f(node));
}

function execCallbacks(callbacks: Callback<CallbackFn>[], node: WalkNode, enableExecutedCallbacks: boolean): void {
    for (let cb of callbacks) {
        cb.callback(node)
        if (enableExecutedCallbacks)
            node.executedCallbacks.push(cb);
    }
}

async function execCallbacksAsync(callbacks: Callback<AsyncCallbackFn>[], node: WalkNode, enableExecutedCallbacks: boolean): Promise<void> {
    for (let cb of callbacks) {
        await cb.callback(node)
        if (enableExecutedCallbacks)
            node.executedCallbacks.push(cb);
    }
}

const execCallbacksAsyncInParallel = async (callbacks: Callback<AsyncCallbackFn>[], node: WalkNode): Promise<void> => {
    await Promise.all(
        callbacks.map(cb =>
            Promise.resolve(cb.callback(node))
                .then(() => {
                    node.executedCallbacks.push(cb)
                })
        )
    );
}

export class _CallbackStacker<T extends CallbackFn, Rt> {

    constructor(private ctx: Context<T>, private executor: (callbacks: Callback<T>[], node: WalkNode, enableExecutedCallbacks: boolean) => Rt) {
    }

    public static forSync<T extends CallbackFn>(ctx: Context<T>): _CallbackStacker<CallbackFn, void> {
        return new _CallbackStacker<CallbackFn, void>(ctx, execCallbacks)
    }

    public static forAsync<T extends CallbackFn>(ctx: Context<T>): _CallbackStacker<AsyncCallbackFn, void | Promise<void>> {
        return new _CallbackStacker<CallbackFn, void>(ctx, ctx.config.parallelizeAsyncCallbacks
            ? execCallbacksAsyncInParallel
            : execCallbacksAsync)
    }

    private _matchCallbacks(node: WalkNode, position: CallbackTiming): Callback<T>[] {
        let callbacks = this.ctx.callbacksByPosition[position];

        return (callbacks || [])
            .map(cb => cb as Callback<T>)
            .filter(cb => filterByFilters(cb, node))
    }

    private lookup: {
        [key: number]: {
            trigger: number,
            fn: () => Rt
        }
    } = {}

    public pushToStack(node: WalkNode, position: CallbackTiming) {
        const lastChild = node.children[node.children.length - 1];
        const callbacks = this._matchCallbacks(node, position)
        this.lookup[lastChild.id] = {
            trigger: node.id,
            fn: () => this.executor(callbacks, node, this.ctx.config.trackExecutedCallbacks)
        }
    }

    public executeOne(node: WalkNode, position: CallbackTiming): Rt {
        const callbacks = this._matchCallbacks(node, position)
        return this.executor(callbacks, node, this.ctx.config.trackExecutedCallbacks)
    }

    public* execute(nodeId: number): Generator<Rt> {
        let next = this.lookup[nodeId]
        delete this.lookup[nodeId]
        while (next) {
            yield next.fn()
            const trigger = next.trigger;
            next = this.lookup[trigger]
            delete this.lookup[trigger]
        }
    }
}

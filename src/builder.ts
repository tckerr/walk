import {
    AsyncCallback,
    AsyncCb,
    BaseCallback,
    Callback,
    Cb,
    Context,
    GraphMode,
    NodeType,
    PartialConfig,
    PositionType,
    TraversalMode
} from "./types";
import {walk} from "./walk";
import {WalkNode} from "./node";


class CallbacksBuilder<
    T extends BaseCallback,
    CbType extends Cb,
    TUpper extends BaseWalkBuilder<T, CbType>
> {
    private readonly callback: T;

    constructor(
        private cbs: CbType[],
        private source: TUpper
    ) {
        this.callback = {callback: () => {}} as unknown as T
    }

    withExecutionOrder(order: number): CallbacksBuilder<T, CbType, TUpper> {
        this.callback.executionOrder = order;
        return this;
    }

    filteredByNodeTypes(...types: NodeType[]): CallbacksBuilder<T, CbType, TUpper> {
        this.callback.nodeTypeFilters = types;
        return this;
    }

    filteredByKeys(...keys: string[]): CallbacksBuilder<T, CbType, TUpper> {
        this.callback.keyFilters = keys;
        return this;
    }

    filteredByPositions(...positions: PositionType[]): CallbacksBuilder<T, CbType, TUpper> {
        this.callback.positionFilters = positions;
        return this;
    }

    done(): TUpper {
        return this.source.withCallbacks(
            ...this.cbs.map(cb => ({...this.callback, callback: cb}))
        )
    }
}

abstract class BaseWalkBuilder<T extends BaseCallback, CbType extends Cb> {
    protected config: PartialConfig<T> = {};

    withConfig(config: PartialConfig<T>): this {
        this.config = config;
        return this;
    }

    withTraversalMode(traversalMode: TraversalMode): this {
        this.config.traversalMode = traversalMode;
        return this;
    }

    withGraphMode(graphMode: GraphMode): this {
        this.config.graphMode = graphMode;
        return this;
    }

    withRootObjectCallbacks(val: boolean): this {
        this.config.rootObjectCallbacks = val;
        return this;
    }

    withRunningCallbacks(val: boolean): this {
        this.config.runCallbacks = val;
        return this;
    }

    withConfiguredCallbacks(...callbacks: CbType[]): CallbacksBuilder<T, CbType, this> {
        return new CallbacksBuilder(callbacks, this)
    }

    withConfiguredCallback(callback: CbType): CallbacksBuilder<T, CbType, this> {
        return this.withConfiguredCallbacks(callback)
    }

    withCallback(callback: T): this {
        return this.withCallbacks(callback)
    }

    withCallbacks(...callbacks: T[]): this {
        if (!this.config.callbacks)
            this.config.callbacks = []
        this.config.callbacks.push(...callbacks)
        return this;
    }
}

export class WalkBuilder extends BaseWalkBuilder<Callback, Cb> {
    walk(obj: object): Context<Callback> {
        return walk(obj, this.config)
    }

    withSimpleCallback(callback: Cb): this {
        return this.withSimpleCallbacks(callback)
    }

    withSimpleCallbacks(...callbacks: Cb[]): this {
        return this.withCallbacks(...(callbacks.map(c => ({callback: c}))))
    }
}

export class AsyncWalkBuilder extends BaseWalkBuilder<AsyncCallback, AsyncCb> {

    withParallelizeAsyncCallbacks(val: boolean): this {
        this.config.parallelizeAsyncCallbacks = val;
        return this;
    }

    withSimpleCallback(callback: AsyncCb): this {
        return this.withSimpleCallbacks(callback)
    }

    withSimpleCallbacks(...callbacks: AsyncCb[]): this {
        return this.withCallbacks(...(callbacks.map(c => ({callback: c}))))
    }

    async walk(obj: object): Promise<Context<AsyncCallback>> {
        return walk(obj, this.config)
    }
}

const logCallback = (node: WalkNode) => console.log(node);
const myObject = {}

new WalkBuilder()
    .withSimpleCallback(logCallback)
    .withCallback({
        keyFilters: ['myKey'],
        positionFilters: ['postWalk'],
        nodeTypeFilters: ['object'],
        executionOrder: 0,
        callback: logCallback
    })
    .withGraphMode('graph')
    .withTraversalMode('breadth')
    .withRunningCallbacks(true)
    .withRootObjectCallbacks(true)
    .withConfiguredCallback(logCallback)
        .filteredByKeys('key1', 'key2')
        .filteredByNodeTypes('object', 'array')
        .filteredByPositions('postWalk', 'preWalk')
        .withExecutionOrder(1)
        .done()
    .walk(myObject)

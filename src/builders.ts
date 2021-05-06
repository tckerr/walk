import {
    AsyncCallback,
    AsyncCb,
    BaseCallback,
    Callback,
    Cb,
    Context,
    GraphMode, NodeFilterFn,
    NodeType,
    PartialConfig,
    PositionType,
    TraversalMode
} from "./types";
import {walk, walkAsync, walkAsyncStep, walkStep} from "./walk";
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

    withFilter(fn: NodeFilterFn): this {
        return this.withFilters(fn)
    }

    withFilters(...fn: NodeFilterFn[]): this {
        this.callback.filters = fn;
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

    filteredByPosition(position: PositionType): CallbacksBuilder<T, CbType, TUpper> {
        this.callback.positionFilter = position;
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

    resetConfig(): this {
        this.config = {}
        return this;
    }

    withConfig(config: PartialConfig<T>): this {
        this.config = {...this.config, ...config};
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

    getConfig(): PartialConfig<T>{
        return this.config;
    }
}

export class WalkBuilder extends BaseWalkBuilder<Callback, Cb> {
    walk(obj: object) {
        walk(obj, this.config)
    }

    withSimpleCallback(callback: Cb): this {
        return this.withSimpleCallbacks(callback)
    }

    withSimpleCallbacks(...callbacks: Cb[]): this {
        return this.withCallbacks(...(callbacks.map(c => ({callback: c}))))
    }

    * walkStep(obj: object): Generator<WalkNode> {
        return walkStep(obj, this.config)
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

    async walk(obj: object): Promise<void> {
        return walkAsync(obj, this.config)
    }

    async * walkStep(obj: object): AsyncGenerator<WalkNode> {
        return walkAsyncStep(obj, this.config)
    }
}

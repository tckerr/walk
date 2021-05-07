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


class CallbacksBuilder<T extends BaseCallback,
    CbType extends Cb,
    TUpper extends BaseWalkBuilder<T, CbType>> {
    private readonly callback: T;

    constructor(
        private cbs: CbType[],
        private source: TUpper
    ) {
        this.callback = {
            callback: () => {
            }
        } as unknown as T
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
    protected _config: PartialConfig<T> = {};
    private globalFilters: NodeFilterFn[] = []

    resetConfig(): this {
        this._config = {}
        return this;
    }

    withConfig(config: PartialConfig<T>): this {
        this._config = {...this._config, ...config};
        return this;
    }

    withTraversalMode(traversalMode: TraversalMode): this {
        this._config.traversalMode = traversalMode;
        return this;
    }

    withGraphMode(graphMode: GraphMode): this {
        this._config.graphMode = graphMode;
        return this;
    }

    withRootObjectCallbacks(val: boolean): this {
        this._config.rootObjectCallbacks = val;
        return this;
    }

    withRunningCallbacks(val: boolean): this {
        this._config.runCallbacks = val;
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

    withGlobalFilter(fn: NodeFilterFn): this {
        this.globalFilters.push(fn)
        return this;
    }

    withCallbacks(...callbacks: T[]): this {
        if (!this._config.callbacks)
            this._config.callbacks = []
        this._config.callbacks.push(...callbacks)
        return this;
    }

    getCurrentConfig(): PartialConfig<T> {
        return {
            ...this._config,
            callbacks: this._config.callbacks?.map(cb => ({
                ...cb,
                filters: [
                    ...(!cb.filters ? []
                        : Array.isArray(cb.filters)
                            ? cb.filters
                            : [cb.filters]),
                    ...this.globalFilters
                ]
            }))
        }
    }
}

export class WalkBuilder extends BaseWalkBuilder<Callback, Cb> {
    walk(obj: object) {
        walk(obj, this.getCurrentConfig())
    }

    * walkStep(obj: object): Generator<WalkNode> {
        return walkStep(obj, this.getCurrentConfig())
    }

    withSimpleCallback(callback: Cb): this {
        return this.withSimpleCallbacks(callback)
    }

    withSimpleCallbacks(...callbacks: Cb[]): this {
        return this.withCallbacks(...(callbacks.map(c => ({callback: c}))))
    }
}

export class AsyncWalkBuilder extends BaseWalkBuilder<AsyncCallback, AsyncCb> {

    async walk(obj: object): Promise<void> {
        return walkAsync(obj, this.getCurrentConfig())
    }

    async* walkStep(obj: object): AsyncGenerator<WalkNode> {
        return walkAsyncStep(obj, this.getCurrentConfig())
    }

    withParallelizeAsyncCallbacks(val: boolean): this {
        this._config.parallelizeAsyncCallbacks = val;
        return this;
    }

    withSimpleCallback(callback: AsyncCb): this {
        return this.withSimpleCallbacks(callback)
    }

    withSimpleCallbacks(...callbacks: AsyncCb[]): this {
        return this.withCallbacks(...(callbacks.map(c => ({callback: c}))))
    }
}

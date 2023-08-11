import {
    Callback,
    asMany,
    AsyncCallbackFn,
    CallbackFn,
    GraphMode,
    isMany,
    NodeFilterFn,
    PartialConfig,
    CallbackTiming,
    TraversalMode
} from "./types";
import {walk, walkAsync, walkAsyncStep, walkStep} from "./walk";
import {WalkNode} from "./node";


class CallbacksBuilder<T extends CallbackFn, TUpper extends BaseWalkBuilder<T>> {
    private readonly callback: Partial<Callback<T>>;

    constructor(
        private cbs: T[],
        private source: TUpper
    ) {
        this.callback = {
            callback: ((() => {
            }) as unknown as T)
        }
    }

    withExecutionOrder(order: number): this {
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

    withTiming(timing: CallbackTiming): this {
        this.callback.timing = timing;
        return this;
    }

    done(): TUpper {
        return this.source.withCallbacks(
            ...this.cbs.map(cb => ({
                ...this.callback,
                callback: cb
            }))
        )
    }
}

abstract class BaseWalkBuilder<T extends CallbackFn> {
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

    withConfiguredCallbacks(...callbacks: T[]): CallbacksBuilder<T, this> {
        return new CallbacksBuilder(callbacks, this)
    }

    withConfiguredCallback(callback: T): CallbacksBuilder<T, this> {
        return this.withConfiguredCallbacks(callback)
    }

    withCallback(callback: Partial<Callback<T>>): this {
        return this.withCallbacks(callback)
    }

    withGlobalFilter(fn: NodeFilterFn): this {
        this.globalFilters.push(fn)
        return this;
    }

    withCallbacks(...callbacks: Partial<Callback<T>>[]): this {
        if (!this._config.onVisit)
            this._config.onVisit = []
        if(!isMany(this._config.onVisit))
            this._config.onVisit = [this._config.onVisit];
        this._config.onVisit.push(...callbacks)
        return this;
    }

    getCurrentConfig(): PartialConfig<T> {
        return {
            ...this._config,
            onVisit: asMany(this._config.onVisit ?? []).map(cb => ({
                ...cb,
                filters: [
                    ...(!cb.filters ? [] : asMany(cb.filters)),
                    ...this.globalFilters
                ]
            }))
        }
    }
}

export class WalkBuilder extends BaseWalkBuilder<CallbackFn> {
    walk(target: any) {
        walk(target, this.getCurrentConfig())
    }

    * walkStep(target: any): Generator<WalkNode> {
        return walkStep(target, this.getCurrentConfig())
    }

    withSimpleCallback(callback: CallbackFn): this {
        return this.withSimpleCallbacks(callback)
    }

    withSimpleCallbacks(...callbacks: CallbackFn[]): this {
        return this.withCallbacks(...(callbacks.map(c => ({callback: c}))))
    }
}

export class AsyncWalkBuilder extends BaseWalkBuilder<AsyncCallbackFn> {

    async walk(target: any): Promise<void> {
        return walkAsync(target, this.getCurrentConfig())
    }

    async* walkStep(target: any) {
        return walkAsyncStep(target, this.getCurrentConfig())
    }

    withParallelizeAsyncCallbacks(val: boolean): this {
        this._config.parallelizeAsyncCallbacks = val;
        return this;
    }

    withSimpleCallback(callback: AsyncCallbackFn): this {
        return this.withSimpleCallbacks(callback)
    }

    withSimpleCallbacks(...callbacks: AsyncCallbackFn[]): this {
        return this.withCallbacks(...(callbacks.map(c => ({callback: c}))))
    }
}

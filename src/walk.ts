import {AsyncCallbackFn, CallbackFn, Context, PartialConfig} from "./types";
import {buildContext} from "./defaults";
import {CallbackStacker} from "./helpers";
import {Break, forceEvalAsyncGenerator, forceEvalGenerator} from "./utils";
import {WalkNode} from "./node";
import {execCallbacks, getAsyncExecutor, matchCallbacks} from "./callback";

class Walker<T extends CallbackFn> {

    constructor(private ctx: Context<T>) {
    }

    shouldSkipVisitation(node: WalkNode): boolean {
        if (node.nodeType === 'value' || node.val === null || Object.is(NaN, node.val))
            return false;

        if (!this.ctx.seenObjects.has(node.val))
            this.ctx.seenObjects.add(node.val)
        else if (this.ctx.config.graphMode === 'graph')
            return true
        else if (this.ctx.config.graphMode === 'finiteTree')
            throw "The object violates the defined structure. Override 'graphMode' in the config to allow parsing different object structures.";

        return false;
    }

    get depthFirst(): boolean {
        return this.ctx.config.traversalMode === 'depth'
    }

    getPreWalkCallbacks<T extends CallbackFn>(node: WalkNode) {
        return matchCallbacks<CallbackFn>(node, 'preWalk', this.ctx)
    }

    getPostWalkCallbacks<T extends CallbackFn>(node: WalkNode) {
        return matchCallbacks<CallbackFn>(node, 'postWalk', this.ctx)
    }

    * walk(target: any): Generator<WalkNode> {
        const queue: WalkNode[] = [WalkNode.fromRoot(target)];
        const pusher = this.depthFirst
            ? (nodes: WalkNode[]) => queue.unshift(...nodes)
            : (nodes: WalkNode[]) => queue.push(...nodes)
        const stacker = new CallbackStacker<CallbackFn, void>(execCallbacks)
        try {
            do {
                const node = queue.shift()!
                if (this.shouldSkipVisitation(node))
                    continue

                const children = node.children;
                pusher(children)

                stacker.executeOne(node, this.getPreWalkCallbacks(node));

                yield node;

                const afterCbs = this.getPostWalkCallbacks(node);

                if (this.depthFirst && children.length) {
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

    async* walkAsync(target: any): AsyncGenerator<WalkNode> {
        const queue: WalkNode[] = [WalkNode.fromRoot(target)];
        const pusher = this.depthFirst
            ? (nodes: WalkNode[]) => queue.unshift(...nodes)
            : (nodes: WalkNode[]) => queue.push(...nodes)
        const executor = getAsyncExecutor(this.ctx.config);
        const stacker = new CallbackStacker<AsyncCallbackFn, Promise<void> | void>(executor)

        try {
            do {
                const node = queue.shift()!
                if (this.shouldSkipVisitation(node))
                    continue

                const children = node.children;
                pusher(children)

                await stacker.executeOne(node, this.getPreWalkCallbacks(node));

                yield node;

                const afterCbs = this.getPostWalkCallbacks(node);

                if (this.depthFirst && children.length) {
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
}

export function* walkStep(target: any, config: PartialConfig<CallbackFn> = {}): Generator<WalkNode> {
    const ctx = buildContext(config);
    const walker = new Walker<CallbackFn>(ctx)
    yield* walker.walk(target)
}

export async function* walkAsyncStep(target: any, config: PartialConfig<AsyncCallbackFn> = {}): AsyncGenerator<WalkNode> {
    const ctx = buildContext(config);
    const walker = new Walker<AsyncCallbackFn>(ctx)
    yield* walker.walkAsync(target)
}

export function walk(target: any, config: PartialConfig<CallbackFn> = {}): void {
    forceEvalGenerator(walkStep(target, config))
}

export async function walkAsync(target: any, config: PartialConfig<AsyncCallbackFn> = {}): Promise<void> {
    await forceEvalAsyncGenerator(walkAsyncStep(target, config))
}

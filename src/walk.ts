import {AsyncCallbackFn, CallbackFn, Context, PartialConfig} from "./types";
import {_buildContext} from "./defaults";
import {WalkNode} from "./node";
import {_CallbackStacker} from "./callback";
import {Break} from "./break";

class Walker<T extends CallbackFn> {

    constructor(private ctx: Context<T>) {
    }

    shouldSkipVisitation(node: WalkNode): boolean {
        if (!node.canBeCompared())
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

    * walk(target: any): Generator<WalkNode> {
        const queue: WalkNode[] = [WalkNode.fromRoot(target)];
        const pusher = this.depthFirst
            ? (nodes: WalkNode[]) => queue.unshift(...nodes)
            : (nodes: WalkNode[]) => queue.push(...nodes)
        const stacker = _CallbackStacker.ForSync(this.ctx)
        try {
            do {
                const node = queue.shift()!
                if (this.shouldSkipVisitation(node))
                    continue

                const children = node.children;
                pusher(children)

                stacker.executeOne(node, 'preWalk');

                yield node;

                if (this.depthFirst && children.length) {
                    const lastChild = children[children.length - 1];
                    stacker.push(lastChild.id, node, 'postWalk')
                } else {
                    stacker.executeOne(node, 'postWalk');
                    for (let _ of stacker.execute(node.id)) {
                    }
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
        const stacker = _CallbackStacker.ForAsync(this.ctx)

        try {
            do {
                const node = queue.shift()!
                if (this.shouldSkipVisitation(node))
                    continue

                const children = node.children;
                pusher(children)

                await stacker.executeOne(node, 'preWalk');

                yield node;

                if (this.depthFirst && children.length) {
                    const lastChild = children[children.length - 1];
                    stacker.push(lastChild.id, node, 'postWalk')
                } else {
                    await stacker.executeOne(node, 'postWalk')
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
    const ctx = _buildContext(config);
    const walker = new Walker<CallbackFn>(ctx)
    yield* walker.walk(target)
}

export async function* walkAsyncStep(target: any, config: PartialConfig<AsyncCallbackFn> = {}): AsyncGenerator<WalkNode> {
    const ctx = _buildContext(config);
    const walker = new Walker<AsyncCallbackFn>(ctx)
    yield* walker.walkAsync(target)
}

export function walk(target: any, config: PartialConfig<CallbackFn> = {}): void {
    for (let _ of walkStep(target, config)) {

    }
}

export async function walkAsync(target: any, config: PartialConfig<AsyncCallbackFn> = {}): Promise<void> {
    for await (let _ of walkAsyncStep(target, config)) {
    }
}

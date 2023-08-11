import {AsyncCallbackFn, CallbackFn, Context, PartialConfig} from "./types";
import {_buildContext} from "./defaults";
import {WalkNode} from "./node";
import {_CallbackStacker} from "./callback";
import {Break} from "./break";

class NodeQueue {

    private queue: WalkNode[] = []
    public add: (nodes: WalkNode[]) => void;

    constructor(private depthFirst: boolean) {
        this.add = depthFirst
            ? (nodes: WalkNode[]) => this.queue.unshift(...nodes)
            : (nodes: WalkNode[]) => this.queue.push(...nodes)
    }

    public shift(): WalkNode | undefined {
        return this.queue.shift()
    }

    public get more(): boolean{
        return this.queue.length > 0;
    }
}

class Walker<T extends CallbackFn> {
    private readonly depthFirst: boolean;

    constructor(private ctx: Context<T>) {
        this.depthFirst = ctx.config.traversalMode === 'depth';
    }

    shouldSkipVisitation(node: WalkNode): boolean {
        if (!node.canBeCompared())
            return false;
        const {objectHasBeenSeen, registerObjectVisit} = this.ctx.config.visitationRegister;
        if(!objectHasBeenSeen(node))
            registerObjectVisit(node)
        else if (this.ctx.config.graphMode === 'graph')
            return true
        else if (this.ctx.config.graphMode === 'finiteTree')
            throw "The object violates the defined structure. Override 'graphMode' in the config to allow parsing different object structures.";

        return false;
    }

    * walk(target: any): Generator<WalkNode> {
        const queue = new NodeQueue(this.depthFirst);
        const stacker = _CallbackStacker.forSync(this.ctx)

        try {
            queue.add([WalkNode.fromRoot(target)])
            do {
                const node = queue.shift()!
                if (this.shouldSkipVisitation(node))
                    continue

                const children = node.children;
                queue.add(children)

                stacker.executeOne(node, 'preVisit');

                yield node;

                if (this.depthFirst && children.length)
                    stacker.pushToStack(node, 'postVisit')
                else {
                    stacker.executeOne(node, 'postVisit');
                    for (let _ of stacker.execute(node.id)) {
                    }
                }
            } while (queue.more)
        } catch (err) {
            if (!(err instanceof Break))
                throw err;
        }
    }

    async* walkAsync(target: any){
        const queue = new NodeQueue(this.depthFirst);
        const stacker = _CallbackStacker.forAsync(this.ctx)

        try {
            queue.add([WalkNode.fromRoot(target)])
            do {
                const node = queue.shift()!
                if (this.shouldSkipVisitation(node))
                    continue

                const children = node.children;
                queue.add(children)

                await stacker.executeOne(node, 'preVisit');

                yield node;

                if (this.depthFirst && children.length)
                    stacker.pushToStack(node, 'postVisit')
                else {
                    await stacker.executeOne(node, 'postVisit')
                    for await (const _ of stacker.execute(node.id)){
                    }
                }
            } while (queue.more)
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

export async function* walkAsyncStep(target: any, config: PartialConfig<AsyncCallbackFn> = {}){
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

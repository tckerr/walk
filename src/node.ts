import {_Callback, NodePathSegmentFormatter, NodeType} from "./types";

const getNormalizedType = (val: any): NodeType => {
    return Array.isArray(val)
        ? 'array'
        : typeof val === 'object'
            ? 'object'
            : 'value';
}

function defaultPathFormatter(node: WalkNode) {
    return node.isArrayMember ? `[${node.key}]` : `["${node.key}"]`
}

export class WalkNode {
    private _children?: WalkNode[] = undefined
    private static _idx: number = 0;
    public readonly id: number;

    constructor(
        public val: any,
        public isRoot: boolean = false,
        public isArrayMember: boolean = false,
        public nodeType: NodeType = 'value',
        public rawType: string = 'undefined',
        public executedCallbacks: _Callback<any>[] = [],
        public key?: string | number,
        public parent?: WalkNode,) {
        this.id = WalkNode._idx++;
    }

    public static fromRoot(obj: any): WalkNode {
        return new WalkNode(
            obj, true, false, getNormalizedType(obj), typeof obj,
            [], undefined, undefined
        )
    }

    public static fromObjectKey(parent: WalkNode, key: string): WalkNode {
        return new WalkNode(
            parent.val[key], false, false, getNormalizedType(parent.val[key]), typeof parent.val[key],
            [], key, parent
        )
    }

    public static fromArrayIndex(parent: WalkNode, index: number): WalkNode {
        return new WalkNode(
            parent.val[index], false, true, getNormalizedType(parent.val[index]), typeof parent.val[index],
            [], index, parent
        )
    }

    public canBeCompared(): boolean {
        return this.nodeType !== 'value' && this.val !== null && !Object.is(NaN, this.val);
    }

    public sameAs(other: WalkNode): boolean {
        if (!this.canBeCompared() || this.nodeType !== other.nodeType)
            return false;

        if (this.val === null || Object.is(NaN, this.val))
            return false;

        return Object.is(this.val, other.val)
    }

    public getPath(pathFormat?: NodePathSegmentFormatter): string {
        if (this.isRoot)
            return ""

        pathFormat = pathFormat || defaultPathFormatter
        return this.parent!.getPath(pathFormat) + pathFormat(this)
    }

    public get children(): WalkNode[] {
        if (typeof this._children === 'undefined')
            this._children = [...this.getChildren()];

        return this._children;
    }

    public* getChildren(): Generator<WalkNode> {
        if (this.nodeType === 'array') {
            for (let i = 0; i < this.val.length; i++)
                yield WalkNode.fromArrayIndex(this, i)
        } else if (this.nodeType === 'object') {
            if (this.val === null)
                return
            for (let key of Object.keys(this.val))
                yield WalkNode.fromObjectKey(this, key)
        }
    }

    public get siblings(): WalkNode[] {
        return [...this.getSiblings()]
    }

    public* getSiblings(): Generator<WalkNode> {
        if (!this.parent)
            return

        for (let child of this.parent.children)
            if (this.key !== child.key)
                yield child;
    }

    public get ancestors(): WalkNode[] {
        return [...this.getAncestors()]
    }
    public* getAncestors(): Generator<WalkNode> {
        let next = this.parent
        while (next){
            yield next
            next = next.parent
        }
    }

    public get descendants(): WalkNode[] {
        return [...this.getDescendants()]
    }
    public* getDescendants(): Generator<WalkNode> {
        for (const child of this.getChildren())
        {
            yield child
            yield * child.getDescendants()
        }
    }
}

import {Callback, NodePathFormatter, NodeType} from "./types";
import {defaultPathFormatter} from "./defaults";

const getNormalizedType = (val: any): NodeType =>
    Array.isArray(val)
        ? 'array'
    : typeof val === 'object'
        ? 'object'
        : 'value';

export class WalkNode {
    private _children?: WalkNode[]
    private static _idx: number = 0;
    public readonly id: number;

    constructor(
        public val: any,
        public isRoot: boolean = false,
        public isArrayMember: boolean = false,
        public nodeType: NodeType = 'value',
        public rawType: string = 'undefined',
        public executedCallbacks: Callback<any>[] = [],
        public key?: string | number,
        public parent?: WalkNode,) {
        this.id = WalkNode._idx++;
    }

    public static fromRoot(obj: object): WalkNode {
        return new WalkNode(
            obj, true, false, 'object', typeof obj,
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

    public getPath(pathFormat?: NodePathFormatter): string {
        if (this.isRoot)
            return ""

        pathFormat = pathFormat || defaultPathFormatter
        return this.parent!.getPath(pathFormat) + pathFormat(this.key!.toString(), this.isArrayMember)
    }

    public get children(): WalkNode[] {
        if (typeof this._children === 'undefined')
            this._children = [...this.getChildren()];

        return this._children ?? (this._children = [...this.getChildren()]);
    }

    public * getChildren(): Generator<WalkNode> {
        if (this.nodeType === 'array')
            for (let i = 0; i < this.val.length; i++)
                yield WalkNode.fromArrayIndex(this, i)

        if (this.nodeType === 'object')
            for (let key of Object.keys(this.val))
                yield WalkNode.fromObjectKey(this, key)
    }

    public get siblings(): WalkNode[] {
        return this.parent?.children.filter((c) => c.id !== this.id) ?? []
    }
}

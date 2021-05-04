import {Callback, Context, NodeType} from "./types";
import {defaultPathFormat} from "./defaults";

function getNormalizedType(val: any): NodeType {
    if (Array.isArray(val))
        return 'array'
    else if (typeof val === 'object')
        return 'object'
    return 'value'
}


export class WalkNode {
    private _children?: WalkNode[]
    private static _idx: number;
    public readonly id: number;

    constructor(
        public val: any,
        public isRoot: boolean = false,
        public isArrayMember: boolean = false,
        public nodeType: NodeType = 'value',
        public rawType: string = 'undefined',
        public executedCallbacks: Callback[] = [],
        public keyInParent?: string | number,
        public parent?: WalkNode,) {
        this.id = ++WalkNode._idx;
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

    public getPath(pathFormat?: (key: string, isArr: boolean) => string): string {
        if (this.isRoot)
            return ""

        pathFormat = pathFormat || defaultPathFormat
        return this.parent!.getPath(pathFormat) + pathFormat(this.keyInParent!.toString(), this.isArrayMember)
    }

    public get children(): WalkNode[] {
        if (typeof this._children !== 'undefined')
            return this._children;

        if (this.nodeType === 'array')
            this._children = this.val.map((_: any, idx: number) => WalkNode.fromArrayIndex(this, idx))

        else if (this.nodeType === 'object')
            this._children = Object.keys(this.val).map(key => WalkNode.fromObjectKey(this, key))

        else
            this._children = []

        return this._children!;
    }

    public get siblings(): WalkNode[] {
        if (!this.parent)
            return []
        return this.parent.children.filter((c) => c.id !== this.id)
    }
}

import {walkStep} from "../walk";
import {WalkNode} from "../node";

export function reduce<T>(source: object, initialValue: T, fn: (accumulator: T, node: WalkNode) => T): T {
    let val = initialValue;
    for (const node of walkStep(source))
        val = fn(val, node);
    return val;
}

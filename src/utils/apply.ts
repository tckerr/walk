import {AsyncCallbackFn, CallbackFn} from "../types";
import {walk, walkAsync} from "../walk";

export function apply(target: any, ...onVisit: CallbackFn[]) {
    walk(target, {onVisit: onVisit.map(c => ({callback: c}))})
}

export async function applyAsync(target: any, ...onVisit: AsyncCallbackFn[]) {
    await walkAsync(target, {onVisit: onVisit.map(c => ({callback: c}))})
}

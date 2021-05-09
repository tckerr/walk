import {AsyncCallbackFn, CallbackFn} from "../types";
import {walk, walkAsync} from "../walk";

export function apply(target: any, ...callbacks: CallbackFn[]) {
    walk(target, {callbacks: callbacks.map(c => ({callback: c}))})
}

export async function applyAsync(target: any, ...callbacks: AsyncCallbackFn[]) {
    await walkAsync(target, {callbacks: callbacks.map(c => ({callback: c}))})
}

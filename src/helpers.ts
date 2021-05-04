export function prioritySort(a: any, b: any) {
    const x = a.priority;
    const y = b.priority;
    return ((x < y) ? 1 : ((x > y) ? -1 : 0));
}

export function unique(arr: any[]) {
    const within: { [key: string]: any } = {};
    return arr.filter((x: any) => {
        if (within[x])
            return;
        within[x] = true;
        return x;
    });
}

export function updateObjectViaPathString(obj: any, val: any, path: string, delimiter: string) {
    const block = path.split(delimiter).slice(1);
    while (block.length > 1)
        obj = obj[block.shift()!];
    obj[block.shift()!] = val;
}

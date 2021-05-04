export function prioritySort(a: any, b: any) {
    const x = a.priority;
    const y = b.priority;
    return ((x < y) ? 1 : ((x > y) ? -1 : 0));
}

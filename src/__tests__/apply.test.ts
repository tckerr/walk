import {WalkNode} from "../types";
import {apply} from "../index";

test("it finds objects by class name", () => {
    const data = {
        person: {
            name: 'Bob'
        }
    }
    const names: string[] = []

    apply(data, (node: WalkNode) => {
        if(node.keyInParent === 'person')
            names.push(node.val.name)
    })

    expect(names).toEqual(['Bob']);
});
